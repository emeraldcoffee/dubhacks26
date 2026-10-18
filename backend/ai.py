import json
import os
import time
from collections import defaultdict, deque
from typing import Optional
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request
from google import genai
from google.genai import types
from sqlmodel import SQLModel, Field, Session, create_engine, select
from models import Location, Dish
from utils import meters_between

load_dotenv()
engine = create_engine("sqlite:///app.db")
router = APIRouter()

# Simple in-memory rate limit: 30 requests per minute per caller.
_hits = defaultdict(deque)

def check_rate_limit(request: Request, limit: int = 30, window: int = 60):
    ip = request.client.host if request.client else "unknown"
    now_ = time.time()
    q = _hits[ip]
    while q and now_ - q[0] > window:
        q.popleft()
    if len(q) >= limit:
        raise HTTPException(429, "Too many requests, please slow down")
    q.append(now_)

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
    note: Optional[str] = Field(default=None, max_length=300)  # e.g. "something sweet, not too bitter"

class Pick(SQLModel):
    location_id: int
    reason: str

class Recommendation(SQLModel):
    pick: Pick
    backups: list[Pick]
    quest_blurb: str

def is_temporary(error: Exception) -> bool:
    text = str(error)
    return any(code in text for code in ("503", "429", "UNAVAILABLE", "RESOURCE_EXHAUSTED"))

def call_gemini(client, prompt: str, models: list[str]) -> Recommendation:
    """Try each model in order. Retry briefly when Google reports a temporary problem."""
    last_error = None
    for model in models:
        for attempt in range(2):
            try:
                resp = client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM,
                        response_mime_type="application/json",
                        response_schema=Recommendation,
                    ),
                )
                return Recommendation.model_validate_json(resp.text)
            except Exception as e:
                last_error = e
                if is_temporary(e) and attempt == 0:
                    time.sleep(2)      # wait, then retry the same model once
                    continue
                break                  # otherwise move on to the next model
    raise last_error

@router.post("/recommend", response_model=Recommendation)
def recommend(req: RecommendRequest, request: Request):
    check_rate_limit(request)

    key = os.getenv("GEMINI_API_KEY")
    primary = os.getenv("GEMINI_MODEL")
    fallback = os.getenv("GEMINI_FALLBACK_MODEL")
    if not key or not primary:
        raise HTTPException(500, "GEMINI_API_KEY or GEMINI_MODEL is not set")
    models = [primary] + ([fallback] if fallback and fallback != primary else [])

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
        result = call_gemini(client, prompt, models)
    except Exception as e:
        raise HTTPException(502, f"Gemini request failed: {e}")

    valid = {c["location_id"] for c in candidates}
    if result.pick.location_id not in valid:
        raise HTTPException(502, "Gemini returned a place that isn't a candidate")
    result.backups = [b for b in result.backups if b.location_id in valid]
    return result