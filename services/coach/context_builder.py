"""
Build compressed context for the AI Coach.
Target: <4,000 tokens per request.
"""

from typing import List, Dict


def build_transaction_summary(transactions: List[Dict]) -> str:
    """
    Compress last 90 days of transactions into a summary string.
    Keeps it under ~500 tokens.
    """
    if not transactions:
        return "No transaction data available yet."

    total_spent = 0
    total_received = 0
    by_category: Dict[str, float] = {}
    by_month: Dict[str, float] = {}

    for txn in transactions:
        amount = float(txn.get("amount", 0))
        if txn.get("type") == "debit":
            total_spent += amount
            cat = txn.get("category", "other")
            by_category[cat] = by_category.get(cat, 0) + amount
        else:
            total_received += amount

        # Group by month
        ts = txn.get("timestamp", "")
        month = ts[:7] if ts else "unknown"
        if txn.get("type") == "debit":
            by_month[month] = by_month.get(month, 0) + amount

    # Sort categories by spend
    sorted_cats = sorted(by_category.items(), key=lambda x: -x[1])
    top_categories = sorted_cats[:5]  # Top 5 only

    lines = [
        f"Last 90 days: ₹{total_spent:,.0f} spent, ₹{total_received:,.0f} received",
        f"Top categories: " + ", ".join(f"{cat}: ₹{amt:,.0f}" for cat, amt in top_categories),
    ]

    if by_month:
        lines.append(f"Monthly trend: " + ", ".join(
            f"{m}: ₹{a:,.0f}" for m, a in sorted(by_month.items())
        ))

    savings_rate = ((total_received - total_spent) / total_received * 100) if total_received > 0 else 0
    lines.append(f"Savings rate: {savings_rate:.0f}%")

    return "\n".join(lines)


def build_goals_summary(goals: List[Dict]) -> str:
    """Compress active savings goals into a summary string."""
    if not goals:
        return "No savings goals set."

    lines = []
    for goal in goals[:3]:  # Max 3 goals
        name = goal.get("name", "Goal")
        target = float(goal.get("target_amount", 0))
        saved = float(goal.get("saved_amount", 0))
        pct = (saved / target * 100) if target > 0 else 0
        lines.append(f"{name}: ₹{saved:,.0f}/₹{target:,.0f} ({pct:.0f}%)")

    return "\n".join(lines)
