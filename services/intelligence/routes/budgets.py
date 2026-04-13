"""
Budget routes — CRUD budgets, current month status.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter()


class BudgetCreate(BaseModel):
    category: str
    amount: float


class BudgetUpdate(BaseModel):
    amount: Optional[float] = None


# In-memory store for sandbox
_budgets = {
    "food": {"category": "food", "amount": 5000, "spent": 2300, "month": "2026-04"},
    "transport": {"category": "transport", "amount": 2000, "spent": 850, "month": "2026-04"},
}


@router.get("")
async def list_budgets():
    """List all budgets for current month."""
    return {"success": True, "data": list(_budgets.values())}


@router.post("")
async def create_budget(body: BudgetCreate):
    """Create a new budget for a category."""
    month = datetime.now().strftime("%Y-%m")
    _budgets[body.category] = {
        "category": body.category,
        "amount": body.amount,
        "spent": 0,
        "month": month,
    }
    return {"success": True, "data": _budgets[body.category]}


@router.put("/{category}")
async def update_budget(category: str, body: BudgetUpdate):
    """Update a budget amount."""
    if category not in _budgets:
        return {"success": False, "error": "Budget not found"}

    if body.amount is not None:
        _budgets[category]["amount"] = body.amount

    return {"success": True, "data": _budgets[category]}


@router.delete("/{category}")
async def delete_budget(category: str):
    """Delete a budget."""
    if category in _budgets:
        del _budgets[category]
    return {"success": True, "data": {"deleted": category}}


@router.get("/status")
async def budget_status():
    """Get current month budget status with % used."""
    status = []
    for cat, budget in _budgets.items():
        pct = round((budget["spent"] / budget["amount"]) * 100, 1) if budget["amount"] > 0 else 0
        status.append({
            **budget,
            "percentage_used": pct,
            "remaining": budget["amount"] - budget["spent"],
            "is_over": budget["spent"] > budget["amount"],
        })
    return {"success": True, "data": status}
