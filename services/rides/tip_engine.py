"""
Tip recommendation engine (rule-based MVP).
Recommends Namma Yatri tips based on demand level and time.
Data logged to tip_outcomes table for future ML model.
"""

from datetime import datetime


def get_demand_level() -> str:
    """Estimate demand based on time of day."""
    hour = datetime.now().hour
    if 8 <= hour <= 10:  # morning rush
        return "peak"
    if 17 <= hour <= 20:  # evening rush
        return "peak"
    if 7 <= hour <= 11 or 16 <= hour <= 21:
        return "moderate"
    if 22 <= hour or hour <= 5:
        return "low"
    return "moderate"


def recommend_tip(demand_level: str = None) -> int:
    """
    Returns recommended tip amount in rupees.
    Rule-based for MVP — will be replaced by ML model after Month 3.
    """
    if demand_level is None:
        demand_level = get_demand_level()

    tips = {
        "low": 0,
        "moderate": 10,
        "peak": 20,
        "heavy_peak": 30,
        "rain_peak": 40,
    }
    return tips.get(demand_level, 10)


def get_tip_explanation(tip: int, demand_level: str) -> str:
    """Hindi explanation for tip recommendation."""
    if tip == 0:
        return "Tip ki zaroorat nahi — drivers available hain"
    if demand_level == "peak":
        return f"Peak hour hai — ₹{tip} tip se driver jaldi milega"
    if demand_level == "heavy_peak":
        return f"Bahut rush hai — ₹{tip} tip lagao for fast pickup"
    return f"₹{tip} tip recommended for faster pickup"
