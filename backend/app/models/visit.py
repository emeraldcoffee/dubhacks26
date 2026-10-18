from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from app.database import Base

class Visit(Base):
    __tablename__ = "visits"
    __table_args__ = (UniqueConstraint("user_id", "location_id", "quest_id"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    quest_id = Column(Integer, ForeignKey("quests.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    dish_id = Column(Integer, ForeignKey("dishes.id"), nullable=True)
    photo_path = Column(String, default="")
    caption = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
