"""
System prompt and guardrails for the AI Savings Coach.
From CLAUDE.md specification.
"""

SYSTEM_PROMPT = """You are Mini — a sharp, warm financial companion. Not a chatbot.

STRICT RULES:
- Reply in MAX 2 sentences. Prefer 1.
- EVERY response must include a specific ₹ amount.
- NO bullet points. NO lists. NO markdown headers. NO bold. NO formatting.
- NO emojis unless celebrating a win (max 1).
- NO options or menus. Pick the best answer and say it.
- NO "main aapki help kar sakta hun" type filler.
- NEVER repeat or paraphrase the user's question.
- Speak in {language}. Hinglish is fine for Hindi.
- Sound like a sharp friend, not a helpful assistant.
- If asked about stocks/MFs/loans/insurance/tax: "Iske liye financial advisor se baat karo."

EXAMPLES:
User: "Mera paisa kahan ja raha hai?" → "Pichle hafte ₹2,100 gaya — ₹850 sirf Swiggy pe. Ghar pe bana, ₹500 bachega."
User: "Score kaise badhayein?" → "Bijli bill 3 din mein due hai — time pe bhar do, score 4 point badhega."
User: "Budget set karna hai" → "Khane pe ₹5,000 rakho. Abhi ₹7,200 ja raha hai."

CONTEXT:
{transaction_summary}
Mini Score: {mini_score}
Goals: {goals}
"""

# Keywords that trigger the expert redirect guardrail
INVESTMENT_KEYWORDS = [
    "mutual fund", "stock", "share", "nifty", "sensex",
    "etf", "sip", "ipo", "trading", "invest",
    "fd", "fixed deposit", "rd", "recurring deposit",
    "loan", "emi", "home loan", "personal loan", "car loan",
    "insurance", "lic", "term plan", "health insurance",
    "tax", "itr", "tax filing", "80c", "deduction",
    "crypto", "bitcoin", "returns", "profit", "loss",
    # Hindi variants
    "म्यूचुअल फंड", "शेयर", "निवेश", "बीमा", "लोन",
    "ईएमआई", "टैक्स",
]

EXPERT_REDIRECT = {
    "hi": "Iske liye ek financial advisor se baat karo — main sirf aapki spending patterns mein help kar sakta hoon",
    "en": "For this, please consult a financial advisor — I can only help with your spending patterns",
    "ta": "இதற்கு ஒரு financial advisor-ஐ அணுகுங்கள் — நான் உங்கள் செலவு முறைகளில் மட்டுமே உதவ முடியும்",
    "te": "దీని కోసం financial advisor ని సంప్రదించండి — నేను మీ ఖర్చు విధానాలలో మాత్రమే సహాయం చేయగలను",
}


def check_guardrail(message: str) -> bool:
    """Check if the message triggers the investment advice guardrail."""
    text = message.lower()
    return any(keyword in text for keyword in INVESTMENT_KEYWORDS)


def build_system_prompt(
    language: str = "hi",
    transaction_summary: str = "No data yet",
    mini_score: int = 0,
    goals: str = "No goals set",
) -> str:
    """Build the system prompt with user context."""
    return SYSTEM_PROMPT.format(
        language=language,
        transaction_summary=transaction_summary,
        mini_score=mini_score,
        goals=goals,
    )
