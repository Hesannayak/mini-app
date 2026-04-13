import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.transactions import router as txn_router
from routes.score import router as score_router
from routes.budgets import router as budget_router

app = FastAPI(title="Mini Intelligence Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(txn_router, prefix="/api/v1/transactions")
app.include_router(score_router, prefix="/api/v1/score")
app.include_router(budget_router, prefix="/api/v1/budgets")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "intelligence"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3003, reload=True)
