import json
import os
from typing import Optional
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from google import genai
from google.genai import types
from sqlmodel import SQLModel, Session, create_engine, select
from models import Location, Dish
from utils import meters_between

load_dotenv()
engine = create_engine("sqlite:///app.db")
router = APIRouter()

SYSTEM = (
    "You help college students decide where to go next on a food and drink "
    "crawl. Choose only from the candidate places provided and copy their "
    "location_id values exactly. Write each reason as one friendly sentence."
)

class RecommendRequest(SQLModel):
    user_id: int
    category: str
    lat: float
    lng: float
    minutes: Optional[int] = None
    note: Optional[str] = None        # e.g. "something sweet, not too bitter"

class Pick(SQLModel):
    location_id: int
    reason: str

class Recommendation(SQLModel):
    pick: Pick
    backups: list[Pick]
    quest_blurb: str

@router.post("/recommend", response_model=Recommendation)
def recommend(req: RecommendRequest):
    key = os.getenv("GEMINI_API_KEY")
    model = os.getenv("GEMINI_MODEL")
    if not key or not model:
        raise HTTPException(500, "GEMINI_API_KEY or GEMINI_MODEL is not set")

    with Session(engine) as s:
        places = s.exec(
            select(Location).where(Location.category == req.category)).all()
        if not places:
            raise HTTPException(404, "No places in that category")
        dishes = s.exec(
            select(Dish).where(Dish.user_id == req.user_id)
            .order_by(Dish.id.desc()).limit(10)).all()

    candidates = [
        {"location_id": p.id, "name": p.name,
         "meters_away": round(meters_between(req.lat, req.lng, p.lat, p.lng))}
        for p in places
    ]
    taste = [{"dish": d.name, "rating": d.rating} for d in dishes]

    prompt = json.dumps({
        "candidates": candidates,
        "past_dishes": taste,
        "minutes_available": req.minutes,
        "request": req.note,
        "task": "Pick the best next stop, up to 2 backups, and a short "
                "fun blurb for the crawl.",
    })

    try:
        client = genai.Client(api_key=key)
        resp = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM,
                response_mime_type="application/json",
                response_schema=Recommendation,
            ),
        )
        result = Recommendation.model_validate_json(resp.text)
    except Exception as e:
        raise HTTPException(502, f"Gemini request failed: {e}")

    valid = {c["location_id"] for c in candidates}
    if result.pick.location_id not in valid:
        raise HTTPException(502, "Gemini returned a place that isn't a candidate")
    result.backups = [b for b in result.backups if b.location_id in valid]
    return result