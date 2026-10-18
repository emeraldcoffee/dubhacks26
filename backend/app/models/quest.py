from sqlalchemy import Column, Integer, String, Table, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

quest_locations = Table(
    "quest_locations", Base.metadata,
    Column("quest_id", ForeignKey("quests.id"), primary_key=True),
    Column("location_id", ForeignKey("locations.id"), primary_key=True),
)

class Quest(Base):
    __tablename__ = "quests"

    id = Column(Integer, primary_key = True)
    slug = Column(String, unique = True, nullable = False)
    name = Column(String, nullable = False)
    
    locations = relationship("Location", secondary = quest_locations, back_populates = "quests")

    def total_quests(self) -> int:
        return len(self.locations)

    def progress(self, visited_location_ids: set[int]) -> dict:
        done = sum(1 for loc in self.locations if loc.id in visited_location_ids)
        return {"visited": done, "total": self.total()}

    def is_complete(self, visited_location_ids: set[int]) -> bool:
        return self.total() > 0 and all(loc.id in visited_location_ids for loc in self.locations)

    def remaining(self, visited_location_ids: set[int]):
        return [loc for loc in self.locations if loc.id not in visited_location_ids]
