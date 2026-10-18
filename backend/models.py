from datetime import date, datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field

def now():
    return datetime.now(timezone.utc)

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    handle: str = Field(index=True, unique=True)
    display_name: str
    created_at: datetime = Field(default_factory=now)

class Location(SQLModel, table=True):          # shared by everyone
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    address: Optional[str] = None
    category: str = Field(index=True)          # "matcha", "boba", ...
    lat: float
    lng: float

class Visit(SQLModel, table=True):             # one user visiting one location
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    location_id: int = Field(foreign_key="location.id", index=True)
    visited_on: date = Field(default_factory=date.today)

class Dish(SQLModel, table=True):              # a dish tried during a visit
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    visit_id: int = Field(foreign_key="visit.id")
    name: str
    image_path: Optional[str] = None
    rating: Optional[float] = None             # 0.0 to 5.0

class Quest(SQLModel, table=True):             # e.g. "Matcha crawl"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    category: str

class QuestStop(SQLModel, table=True):         # the static list for each quest
    id: Optional[int] = Field(default=None, primary_key=True)
    quest_id: int = Field(foreign_key="quest.id", index=True)
    location_id: int = Field(foreign_key="location.id")
    position: int