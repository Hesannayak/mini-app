"""
Transaction routes — list, summary, update category.
Queries real PostgreSQL via SQLAlchemy.
"""

import os
from fastapi import APIRouter, Query, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

router = APIRouter()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
else:
    engine = None
    SessionLocal = None

CATEGORIES = [
    "food", "transport", "groceries", "bills", "emi",
    "entertainment", "shopping", "health", "education", "family", "other",
]


def get_db():
    if not SessionLocal:
        return None
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("")
async def list_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
):
    """List user transactions with pagination from DB."""
    if not engine:
        return {"success": True, "data": [], "total": 0, "page": page, "limit": limit, "has_more": False}

    with SessionLocal() as db:
        # Build query
        where = ""
        params = {"offset": (page - 1) * limit, "limit": limit}
        if category:
            where = "WHERE category = :category"
            params["category"] = category

        rows = db.execute(text(f"""
            SELECT id, amount, type, category, merchant, description, upi_ref_id, timestamp
            FROM transactions {where}
            ORDER BY timestamp DESC
            LIMIT :limit OFFSET :offset
        """), params).fetchall()

        count_row = db.execute(text(f"SELECT COUNT(*) FROM transactions {where}"),
                               {"category": category} if category else {}).fetchone()
        total = count_row[0] if count_row else 0

        transactions = [{
            "id": str(r[0]),
            "amount": float(r[1]),
            "type": r[2],
            "category": r[3],
            "merchant": r[4],
            "description": r[5],
            "upi_ref_id": r[6],
            "timestamp": r[7].isoformat() if r[7] else None,
        } for r in rows]

    return {
        "success": True,
        "data": transactions,
        "total": total,
        "page": page,
        "limit": limit,
        "has_more": page * limit < total,
    }


@router.get("/summary")
async def spending_summary(
    period: str = Query("today", pattern="^(today|week|month)$"),
):
    """Get spending summary from DB."""
    if not engine:
        return {"success": True, "data": {"total_spent": 0, "total_received": 0, "by_category": {}, "count": 0, "period": period}}

    now = datetime.now()
    if period == "today":
        since = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        since = now - timedelta(days=7)
    else:
        since = now - timedelta(days=30)

    with SessionLocal() as db:
        # Total spent (debits)
        spent_row = db.execute(text("""
            SELECT COALESCE(SUM(amount), 0) FROM transactions
            WHERE type = 'debit' AND timestamp >= :since
        """), {"since": since}).fetchone()
        total_spent = float(spent_row[0]) if spent_row else 0

        # Total received (credits)
        recv_row = db.execute(text("""
            SELECT COALESCE(SUM(amount), 0) FROM transactions
            WHERE type = 'credit' AND timestamp >= :since
        """), {"since": since}).fetchone()
        total_received = float(recv_row[0]) if recv_row else 0

        # By category
        cat_rows = db.execute(text("""
            SELECT category, SUM(amount) FROM transactions
            WHERE type = 'debit' AND timestamp >= :since
            GROUP BY category ORDER BY SUM(amount) DESC
        """), {"since": since}).fetchall()

        by_category = {r[0]: float(r[1]) for r in cat_rows}

        # Count
        count_row = db.execute(text("""
            SELECT COUNT(*) FROM transactions WHERE timestamp >= :since
        """), {"since": since}).fetchone()
        count = count_row[0] if count_row else 0

    return {
        "success": True,
        "data": {
            "total_spent": round(total_spent, 2),
            "total_received": round(total_received, 2),
            "by_category": by_category,
            "count": count,
            "period": period,
        },
    }


class CategoryUpdate(BaseModel):
    category: str


@router.put("/{transaction_id}/category")
async def update_category(transaction_id: str, body: CategoryUpdate):
    """Update transaction category in DB."""
    if body.category not in CATEGORIES:
        return {"success": False, "error": f"Invalid category. Must be one of: {CATEGORIES}"}

    if engine:
        with SessionLocal() as db:
            db.execute(text("UPDATE transactions SET category = :cat WHERE id = :id"),
                       {"cat": body.category, "id": transaction_id})
            db.commit()

    return {"success": True, "data": {"id": transaction_id, "category": body.category}}
