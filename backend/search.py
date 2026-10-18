"""POST /search  -  type anything ("ramen", "a croissant", "something sweet") and get nearby places.

1. Gemini turns the free text into a short search term and decides which kinds of
   place (cafe / bakery / restaurant) would serve it.
2. Google Places finds every nearby place that serves it (needs GOOGLE_PLACES_API_KEY).
   Without that key, it searches the places already saved in the database instead.
3. Every place is saved as a Location row, so check-ins and dishes keep working.
"""
import json
import os
import re
from typing import Optional

import requests
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from google import genai
from google.genai import types as gtypes
from sqlalchemy import func
from sqlmodel import SQLModel, Session, create_engine, select

from models import Location
from utils import meters_between

load_dotenv()
engine = create_engine("sqlite:///app.db")
router = APIRouter()

PLACE_TYPES = ["cafe", "bakery", "restaurant"]
PLACES_URL = "https://places.googleapis.com/v1/places:searchText"
PLACES_FIELDS = ",".join([
    "places.id", "places.displayName", "places.formattedAddress",
    "places.location", "places.rating",
])

INTENT_SYSTEM = (
    "You help college students find food and drink spots. Turn the request into a "
    "short search term (1 to 4 words, e.g. 'tonkatsu ramen', 'matcha latte', "
    "'croissant'). Only include a dietary need in the term if it changes what to "
    "search for (e.g. 'vegan ramen'). Choose which of cafe, bakery, restaurant "
    "would serve it. Write one friendly sentence about the crawl."
)

# only used when searching the saved database (Google results carry their own type)
CATEGORY_TYPE = {
    "matcha": "cafe", "boba": "cafe", "tea": "cafe", "coffee": "cafe", "cafe": "cafe",
    "bakery": "bakery", "pastry": "bakery", "dessert": "bakery",
}
STOP_WORDS = {"the", "and", "for", "with", "some", "any", "good", "best", "near",
              "place", "places", "food", "from", "that"}


class SearchRequest(SQLModel):
    query: str
    lat: float
    lng: float
    radius_m: int = 2400
    types: list[str] = []          # place types the user ticked; empty = let Gemini decide
    note: Optional[str] = None     # e.g. "Dietary needs: Nut-Free"
    user_id: Optional[int] = None


class Intent(SQLModel):
    term: str
    types: list[str]
    blurb: str


class Place(SQLModel):
    location_id: int
    name: str
    address: Optional[str] = None
    category: str
    type: str
    lat: float
    lng: float
    rating: Optional[float] = None
    meters_away: int


class SearchResult(SQLModel):
    term: str
    types: list[str]
    blurb: str
    source: str                    # "google_places" or "database"
    message: Optional[str] = None
    places: list[Place]


def understand(req: SearchRequest) -> Intent:
    """Gemini: free text -> search term + place types. Falls back to the raw text."""
    wanted = [t for t in req.types if t in PLACE_TYPES]
    fallback = Intent(term=req.query.strip()[:60], types=wanted or PLACE_TYPES, blurb="")
    key, model = os.getenv("GEMINI_API_KEY"), os.getenv("GEMINI_MODEL")
    if not key or not model:
        return fallback
    prompt = json.dumps({
        "request": req.query,
        "dietary_needs": req.note,
        "place_types_the_user_picked": wanted,
    })
    try:
        client = genai.Client(api_key=key)
        resp = client.models.generate_content(
            model=model,
            contents=prompt,
            config=gtypes.GenerateContentConfig(
                system_instruction=INTENT_SYSTEM,
                response_mime_type="application/json",
                response_schema=Intent,
            ),
        )
        intent = Intent.model_validate_json(resp.text)
    except Exception:
        return fallback
    kept = [t for t in intent.types if t in PLACE_TYPES]
    intent.types = wanted or kept or PLACE_TYPES
    intent.term = intent.term.strip()[:60] or fallback.term
    return intent


def search_google(term, place_types, lat, lng, radius_m, key):
    """Google Places (New) Text Search, one request per place type."""
    found = {}
    for ptype in place_types:
        body = {
            "textQuery": term,
            "includedType": ptype,
            "maxResultCount": 10,
            "locationBias": {"circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": float(min(radius_m, 50000)),
            }},
        }
        resp = requests.post(
            PLACES_URL, json=body, timeout=10,
            headers={"Content-Type": "application/json",
                     "X-Goog-Api-Key": key,
                     "X-Goog-FieldMask": PLACES_FIELDS},
        )
        resp.raise_for_status()
        for p in resp.json().get("places", []):
            loc = p.get("location") or {}
            if "latitude" not in loc or p["id"] in found:
                continue
            found[p["id"]] = {
                "name": (p.get("displayName") or {}).get("text", "Unnamed place"),
                "address": p.get("formattedAddress"),
                "lat": loc["latitude"], "lng": loc["longitude"],
                "rating": p.get("rating"), "type": ptype,
            }
    # the bias is a hint, not a limit, so drop anything outside the radius
    return [p for p in found.values()
            if meters_between(lat, lng, p["lat"], p["lng"]) <= radius_m]


def save_place(s: Session, name, address, category, lat, lng) -> Location:
    """Reuse a saved place with the same name nearby, otherwise create it."""
    lat, lng = round(lat, 6), round(lng, 6)
    for loc in s.exec(select(Location).where(func.lower(Location.name) == name.lower())).all():
        if meters_between(lat, lng, loc.lat, loc.lng) < 150:
            return loc
    loc = Location(name=name, address=address, category=category, lat=lat, lng=lng)
    s.add(loc)
    s.commit()
    s.refresh(loc)
    return loc


def search_database(s: Session, term, lat, lng, radius_m):
    """Fallback: saved places whose name or category matches a word in the term."""
    words = []
    for w in re.findall(r"[a-z0-9]+", term.lower()):
        if len(w) >= 3 and w not in STOP_WORDS:
            words.append(w[:-1] if len(w) > 4 and w.endswith("s") else w)
    if not words:
        return []
    hits = []
    for loc in s.exec(select(Location)).all():
        dist = meters_between(lat, lng, loc.lat, loc.lng)
        hay = f"{loc.name} {loc.category}".lower()
        if dist <= radius_m and any(re.search(rf"\b{re.escape(w)}", hay) for w in words):
            hits.append((dist, loc))
    hits.sort(key=lambda h: h[0])
    return [loc for _, loc in hits]


@router.post("/search", response_model=SearchResult)
def search(req: SearchRequest):
    if not req.query.strip():
        raise HTTPException(400, "Type what you're craving")
    intent = understand(req)
    category = intent.term.lower()[:40]
    key = os.getenv("GOOGLE_PLACES_API_KEY")
    source, message, places = "database", None, []

    with Session(engine) as s:
        if key:
            try:
                for p in search_google(intent.term, intent.types, req.lat, req.lng, req.radius_m, key):
                    loc = save_place(s, p["name"], p["address"], category, p["lat"], p["lng"])
                    places.append(Place(
                        location_id=loc.id, name=loc.name, address=loc.address,
                        category=category, type=p["type"], lat=loc.lat, lng=loc.lng,
                        rating=p["rating"],
                        meters_away=round(meters_between(req.lat, req.lng, loc.lat, loc.lng)),
                    ))
                source = "google_places"
            except Exception:
                message = "Couldn't reach Google Places, so we searched your saved places instead."

        if source != "google_places":
            only_type = intent.types[0] if len(intent.types) == 1 else None
            for loc in search_database(s, intent.term, req.lat, req.lng, req.radius_m):
                places.append(Place(
                    location_id=loc.id, name=loc.name, address=loc.address,
                    category=loc.category,
                    type=only_type or CATEGORY_TYPE.get(loc.category.lower(), "restaurant"),
                    lat=loc.lat, lng=loc.lng,
                    meters_away=round(meters_between(req.lat, req.lng, loc.lat, loc.lng)),
                ))
            if not places and not message:
                message = (f"No saved places match “{intent.term}”. Add GOOGLE_PLACES_API_KEY "
                           "to the backend to search every place nearby.")

    found_types = list(dict.fromkeys(p.type for p in places)) or intent.types
    return SearchResult(term=intent.term, types=found_types, blurb=intent.blurb,
                        source=source, message=message, places=places[:20])
