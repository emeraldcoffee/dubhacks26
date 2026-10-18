from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Dish:
    __tablename__ = "dishes"

    id = Column(Integer, primary_key = True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable = False)
    name = Column(String, nullable = False)
    category = Column(String, nullable = False)
    price = Column(Float, nullable = True)
    image_url = Column(String, default = "")

    location = relationship("Location", back_populates = "dishes")

    def __repr__(self):
        return f"<Dish {self.name} @ {self.location_id}>"

