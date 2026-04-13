"""
Transaction routes — list, summary, update category.
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

router = APIRouter()

CATEGORIES = [
    "food", "transport", "groceries", "bills", "emi",
    "entertainment", "shopping", "health", "education", "family", "other",
]


class TransactionSummary(BaseModel):
    total_spent: float
    total_received: float
    by_category: dict
    count: int
    period: str


@router.get("")
async def list_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
):
    """List user transactions with pagination."""
    # In production: query from TimescaleDB via user_id from JWT
    # Sandbox mock:
    mock_transactions = [
        {
            "id": f"txn_{i}",
            "amount": 150 + (i * 47) % 500,
            "type": "debit" if i % 3 != 0 else "credit",
            "category": CATEGORIES[i % len(CATEGORIES)],
            "merchant": ["Swiggy", "Uber", "BigBasket", "Jio", "Netflix", "Amazon"][i % 6],
            "timestamp": (datetime.now() - timedelta(days=i)).isoformat(),
        }
        for i in range((page - 1) * limit, page * limit)
    ]

    if category:
        mock_transactions = [t for t in mock_transactions if t["category"] == category]

    return {
        "success": True,
        "data": mock_transactions,
        "total": 100,
        "page": page,
        "limit": limit,
        "has_more": page * limit < 100,
    }


@router.get("/summary")
async def spending_summary(
    period: str = Query("today", regex="^(today|week|month)$"),
):
    """Get spending summary for a time period."""
    # Sandbox mock data
    multiplier = {"today": 1, "week": 7, "month": 30}[period]

    by_category = {}
    total = 0
    for cat in CATEGORIES:
        amount = round((hash(cat + period) % 500 + 100) * (multiplier / 5), 2)
        if amount > 0:
            by_category[cat] = amount
            total += amount

    return {
        "success": True,
        "data": {
            "total_spent": round(total, 2),
            "total_received": round(total * 0.3, 2),
            "by_category": by_category,
            "count": 5 * multiplier,
            "period": period,
        },
    }


class CategoryUpdate(BaseModel):
    category: str


@router.put("/{transaction_id}/category")
async def update_category(transaction_id: str, body: CategoryUpdate):
    """Update transaction category."""
    if body.category not in CATEGORIES:
        return {"success": False, "error": f"Invalid category. Must be one of: {CATEGORIES}"}

    return {
        "success": True,
        "data": {"id": transaction_id, "category": body.category},
    }
