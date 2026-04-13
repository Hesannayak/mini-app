import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import router as rides_router

app = FastAPI(title="Mini Ride Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rides_router, prefix="/api/v1/rides")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "rides"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3007, reload=True)
