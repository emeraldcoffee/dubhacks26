import os
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Session, create_engine, select
from models import User, Location, Visit, Dish, QuestStop
from utils import meters_between
from ai import router as ai_router

engine = create_engine("sqlite:///app.db")
DEMO_MODE = os.getenv("DEMO_MODE") == "1"   # skips the distance check

@asynccontextmanager
async def lifespan(app: FastAPI):
    SQLModel.metadata.create_all(engine)
    yield

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(ai_router)

class UserCreate(SQLModel):
    handle: str
    display_name: str

class VisitCreate(SQLModel):
    user_id: int
    location_id: int
    lat: float
    lng: float

class DishCreate(SQLModel):
    user_id: int
    visit_id: int
    name: str
    rating: Optional[float] = None
    image_path: Optional[str] = None

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/users", response_model=User)
def create_user(data: UserCreate):
    with Session(engine) as s:
        if s.exec(select(User).where(User.handle == data.handle)).first():
            raise HTTPException(409, "Handle already taken")
        user = User(**data.model_dump())
        s.add(user); s.commit(); s.refresh(user)
        return user

@app.get("/users/{user_id}", response_model=User)
def get_user(user_id: int):
    with Session(engine) as s:
        user = s.get(User, user_id)
        if not user:
            raise HTTPException(404, "User not found")
        return user

@app.get("/locations", response_model=list[Location])
def list_locations(category: Optional[str] = None):
    with Session(engine) as s:
        q = select(Location)
        if category:
            q = q.where(Location.category == category)
        return s.exec(q).all()

@app.post("/visits", response_model=Visit)
def create_visit(data: VisitCreate):
    with Session(engine) as s:
        loc = s.get(Location, data.location_id)
        if not loc:
            raise HTTPException(404, "Location not found")
        if not DEMO_MODE and meters_between(
                data.lat, data.lng, loc.lat, loc.lng) > 150:
            raise HTTPException(400, "Too far from this place to check in")
        visit = Visit(user_id=data.user_id, location_id=data.location_id)
        s.add(visit); s.commit(); s.refresh(visit)
        return visit

@app.post("/dishes", response_model=Dish)
def create_dish(data: DishCreate):
    if data.rating is not None and not 0.0 <= data.rating <= 5.0:
        raise HTTPException(400, "Rating must be between 0 and 5")
    with Session(engine) as s:
        dish = Dish(**data.model_dump())
        s.add(dish); s.commit(); s.refresh(dish)
        return dish

@app.get("/users/{user_id}/dishes", response_model=list[Dish])
def user_dishes(user_id: int):
    with Session(engine) as s:
        return s.exec(select(Dish).where(Dish.user_id == user_id)).all()

@app.get("/users/{user_id}/quests/{quest_id}")
def quest_progress(user_id: int, quest_id: int):
    with Session(engine) as s:
        stops = s.exec(
            select(Location)
            .join(QuestStop, QuestStop.location_id == Location.id)
            .where(QuestStop.quest_id == quest_id)
            .order_by(QuestStop.position)
        ).all()
        done = {v.location_id for v in s.exec(
            select(Visit).where(Visit.user_id == user_id)).all()}
        items = [{"location_id": l.id, "name": l.name,
                  "visited": l.id in done} for l in stops]
        return {"stops": items,
                "completed": bool(items) and all(i["visited"] for i in items)}

@app.get("/")
def health_check():
    return {"status": "ok"}
