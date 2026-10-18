import datetime

import math
from sqlalchemy import Column, Integer, String, Float
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.quest import quest_locations

class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key = True)
    name = Column(String, nullable = False)
    lat = Column(Float, nullable = False)
    lng = Column(Float, nullable = False)
    address = Column(String, default = "")
    website = Column(String, default = "")
    hours = Column(String, default = "")
    image_url = Column(String, default = "")

    quests = relationship("Quest", secondary = quest_locations, back_populates = "locations")
    dishes = relationship("Dish", back_populates = "locations", cascade = "all, delete-orphan")

    def distance_to(self, lat: float, lng: float) -> float:
        return 0.0
