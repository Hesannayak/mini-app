import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.coach import router as coach_router
from routes.voice_brain import router as voice_brain_router

app = FastAPI(title="Mini Coach Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(coach_router, prefix="/api/v1/coach")
app.include_router(voice_brain_router, prefix="/api/v1/coach")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "coach"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)
