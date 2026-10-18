from sqlmodel import SQLModel, Session, create_engine, select
from models import Location, Quest, QuestStop

engine = create_engine("sqlite:///app.db")
SQLModel.metadata.create_all(engine)

MATCHA = [
    ("Taz Matcha", 47.6107, -122.3367),
    ("Vale Matcha & Coffee", 47.6174, -122.3349),
    ("Junbi Matcha & Tea", 47.6143, -122.3224),
]

with Session(engine) as s:
    if s.exec(select(Quest)).first():
        print("Already seeded, skipping")
    else:
        quest = Quest(name="Matcha crawl", category="matcha")
        s.add(quest)
        locs = [Location(name=n, category="matcha", lat=la, lng=ln)
                for n, la, ln in MATCHA]
        s.add_all(locs)
        s.commit()
        for i, loc in enumerate(locs, start=1):
            s.add(QuestStop(quest_id=quest.id, location_id=loc.id, position=i))
        s.commit()
        print("Seeded quest with", len(locs), "stops")