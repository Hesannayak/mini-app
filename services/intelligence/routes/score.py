"""
Mini Score routes — current score, history, improvement tips.
"""

from fastapi import APIRouter
from datetime import datetime, timedelta

router = APIRouter()

SCORE_BUCKETS = {
    range(0, 41): ("seedling", "🌱"),
    range(41, 61): ("growing", "📈"),
    range(61, 76): ("good", "✅"),
    range(76, 91): ("star", "🌟"),
    range(91, 101): ("champion", "🏆"),
}

IMPROVEMENT_TIPS = {
    "hi": [
        "Bill time pe bharne se score 5 point tak badh sakta hai",
        "Khane pe budget set karein — spending control badhega",
        "Har hafte thoda bachane ki aadat banayein",
        "EMI hamesha due date se pehle bharein",
    ],
    "en": [
        "Paying bills on time can improve your score by up to 5 points",
        "Set a food budget to improve spending control",
        "Build a habit of saving a little every week",
        "Always pay EMIs before the due date",
    ],
    "ta": [
        "பில்களை சரியான நேரத்தில் செலுத்தினால் score 5 புள்ளிகள் அதிகரிக்கும்",
        "உணவுக்கான பட்ஜெட் அமையுங்கள்",
        "வாரந்தோறும் சிறிது சேமிக்கும் பழக்கம் வையுங்கள்",
    ],
    "te": [
        "బిల్లులు సకాలంలో చెల్లిస్తే score 5 పాయింట్లు పెరుగుతుంది",
        "ఆహారానికి బడ్జెట్ సెట్ చేయండి",
        "ప్రతి వారం కొంత ఆదా చేయడం అలవాటు చేసుకోండి",
    ],
}


def get_bucket(score: int):
    for r, (name, emoji) in SCORE_BUCKETS.items():
        if score in r:
            return name, emoji
    return "seedling", "🌱"


@router.get("/current")
async def current_score():
    """Get current Mini Score with component breakdown."""
    # Sandbox mock
    score = 67
    bucket, emoji = get_bucket(score)

    return {
        "success": True,
        "data": {
            "score": score,
            "bucket": bucket,
            "emoji": emoji,
            "components": {
                "bill_discipline": 72,
                "spending_control": 58,
                "savings_rate": 65,
                "income_stability": 75,
            },
            "explanation": "Score 3 point badha kyunki bijli bill time pe bhari",
            "computed_at": datetime.now().isoformat(),
        },
    }


@router.get("/history")
async def score_history():
    """Get weekly score history."""
    # Sandbox mock — 8 weeks
    history = []
    base_score = 60
    for week in range(8):
        week_start = datetime.now() - timedelta(weeks=week)
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        # Simulate gradual improvement
        s = base_score + week * 1 + (hash(str(week)) % 5)
        history.append({
            "score": min(s, 100),
            "week_start": week_start.isoformat(),
            "components": {
                "bill_discipline": 65 + week,
                "spending_control": 55 + week,
                "savings_rate": 50 + week * 2,
                "income_stability": 70,
            },
        })

    return {"success": True, "data": list(reversed(history))}


@router.get("/tips")
async def improvement_tips(language: str = "hi"):
    """Get score improvement tips in user's language."""
    tips = IMPROVEMENT_TIPS.get(language, IMPROVEMENT_TIPS["en"])
    return {"success": True, "data": {"tips": tips, "language": language}}
