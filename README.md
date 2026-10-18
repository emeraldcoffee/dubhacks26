# Whisked

*Let us whisk you away to your next favorite bite.*

Whisked is a food discovery app that learns what you like and plans around you. Apps like Beli work after the fact: you visit a place, then rank and review it. Whisked works at the moment you're deciding, when you're hungry, or already full and wanting dessert, and don't want to scroll through reviews.

Built at **DubHacks 26** (Seattle).

## What it does

- **Personalized restaurant search:** finds places that fit your preferences instead of showing everyone the same list.
- **What's next nearby:** finds other spots close to where you are, such as a dessert place right after a meal.
- **Digital punch cards:** unlocked once you've visited 4 different spots.

## How we built it

Two of us designed Whisked in Figma and built it as the frontend in JavaScript and CSS. The other two built the backend, a Python API (FastAPI) with a SQLite database that tracks users, businesses, visits, and drinks.

For recommendations, we use the Gemini API. The backend sends Gemini the user's request and a list of nearby candidates, and Gemini picks the spot that matches their cravings and gives a short reason. The server checks that the pick is a real business in our database before returning it. If Gemini is busy, the request retries and falls back to a second model.

We deployed the backend on Render and audited our AI endpoint with VEYZL.

| Part | Tools |
| --- | --- |
| Design | Figma |
| Frontend | JavaScript, CSS |
| Backend | Python, FastAPI, SQLModel, SQLite |
| AI | Google Gemini API |
| Hosting | Render |
| AI audit | VEYZL |

## Safeguards on the AI

- Free-text input is capped at 300 characters.
- Requests are rate limited per caller.
- Gemini's pick is validated server-side, so it can't invent a place.
- We audited the live `POST /discover` endpoint with VEYZL, which checks against frameworks like the EU AI Act, NIST AI RMF, and ISO/IEC 42001. Audit results show on our pull requests.

Latest audit: 8 of 9 tests passed, 0 failed, 1 inconclusive. The inconclusive probe was an off-topic question that our app declined as out of scope. Early audits couldn't reach our server because it ran only on a laptop, so deploying publicly came first, and open issues then went from 9 to 7 to 1.

## Run the backend locally

Requires Python 3.12 or 3.13.

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.8-flash
GEMINI_FALLBACK_MODEL=gemini-3.7-flash
DEMO_MODE=true
```

Start the server:

```bash
uvicorn main:app --reload
```

Open http://127.0.0.1:8000/docs to try the endpoints. `DEMO_MODE=true` skips the distance check on check-ins, so you don't have to be at the business.

## Known limitations

- The free Render instance sleeps when idle, so the first request can be slow.
- Data is in SQLite on an ephemeral disk and resets on restart. A seed script rebuilds the demo data.
- No authentication yet.
- The business list is static for the demo.

## What's next

- **Tracking and navigation:** guiding users to their next stop. Navigation apps already cover directions, so ours would tie navigation to personalization.
- **Transportation options:** letting users pick walking, driving, or transit, and adjusting routes and nearby suggestions to match.

## Team

- Gakenia Njeri Kimani ([@g-nk6](https://github.com/g-nk6))
- Amanda Lee ([@handle](https://github.com/handle))
- Mila Stanko ([@handle](https://github.com/handle))
- Selena Xu ([@handle](https://github.com/handle))
