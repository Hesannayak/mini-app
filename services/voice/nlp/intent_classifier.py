"""
Intent classifier for Mini voice commands.
Uses keyword/pattern matching for MVP, upgradable to MuRIL fine-tune.

Supported intents:
  send_money, check_balance, request_money, pay_bill,
  spending_summary, transaction_history, set_budget, coach_query
"""

import re
from typing import Tuple

INTENT_PATTERNS = {
    "send_money": {
        "hi": [r"bhej", r"transfer", r"paisa\s+de", r"payment\s+kar", r"भेज", r"ट्रांसफर"],
        "en": [r"send", r"transfer", r"pay\s+to", r"give\s+money"],
        "ta": [r"அனுப்பு", r"பணம்\s+கொடு", r"anuppu"],
        "te": [r"పంపు", r"డబ్బు\s+ఇవ్వు", r"pampu"],
    },
    "check_balance": {
        "hi": [r"balance", r"bacha", r"kitna\s+hai", r"बैलेंस", r"बचा", r"कितना"],
        "en": [r"balance", r"how\s+much", r"account\s+balance"],
        "ta": [r"இருப்பு", r"எவ்வளவு", r"iruppu"],
        "te": [r"బ్యాలెన్స్", r"ఎంత", r"balance"],
    },
    "request_money": {
        "hi": [r"maang", r"request", r"मांग", r"माँग", r"bhej.*maang"],
        "en": [r"request", r"ask\s+for", r"collect"],
        "ta": [r"கேள்", r"கேளு"],
        "te": [r"అడుగు", r"adugu"],
    },
    "pay_bill": {
        "hi": [r"bill\s*(bhar|pay|kar)", r"bijli", r"recharge", r"बिल", r"बिजली", r"रिचार्ज"],
        "en": [r"pay\s+bill", r"electricity", r"recharge", r"mobile\s+bill"],
        "ta": [r"பில்\s+கட்டு", r"கரண்ட்", r"bil"],
        "te": [r"బిల్లు\s+కట్టు", r"కరెంటు", r"billu"],
    },
    "spending_summary": {
        "hi": [r"kitna\s+gaya", r"kharch", r"hisab", r"कितना\s+गया", r"खर्च", r"हिसाब"],
        "en": [r"how\s+much.*spend", r"spending", r"expense", r"summary"],
        "ta": [r"செலவு", r"எவ்வளவு\s+செலவு"],
        "te": [r"ఖర్చు", r"ఎంత\s+ఖర్చు"],
    },
    "transaction_history": {
        "hi": [r"transaction", r"dikhao", r"history", r"लेनदेन", r"दिखाओ"],
        "en": [r"transaction", r"history", r"show.*recent", r"last\s+\d+"],
        "ta": [r"பரிவர்த்தனை", r"காட்டு"],
        "te": [r"లావాదేవీలు", r"చూపించు"],
    },
    "set_budget": {
        "hi": [r"budget", r"set\s+kar", r"बजट", r"सेट"],
        "en": [r"set\s+budget", r"budget\s+for", r"limit"],
        "ta": [r"பட்ஜெட்", r"அமை"],
        "te": [r"బడ్జెట్", r"సెట్"],
    },
}

# Confidence boost for high-quality matches
EXACT_MATCH_BOOST = 0.05


def classify_intent(transcript: str, language: str = "hi") -> Tuple[str, float]:
    """
    Classify the intent of a voice transcript.

    Returns:
        (intent: str, confidence: float)
    """
    text = transcript.lower().strip()

    if not text:
        return ("coach_query", 0.3)

    best_intent = "coach_query"
    best_score = 0.0

    for intent, lang_patterns in INTENT_PATTERNS.items():
        score = 0.0

        # Check patterns for detected language first
        patterns = lang_patterns.get(language, [])
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                score = max(score, 0.85)
                # Boost for longer matches
                match = re.search(pattern, text, re.IGNORECASE)
                if match and len(match.group()) > 5:
                    score += EXACT_MATCH_BOOST

        # Also check all languages as fallback (transliteration is common)
        if score < 0.7:
            for lang, pats in lang_patterns.items():
                if lang == language:
                    continue
                for pattern in pats:
                    if re.search(pattern, text, re.IGNORECASE):
                        score = max(score, 0.75)

        if score > best_score:
            best_score = score
            best_intent = intent

    # If no pattern matched, route to coach
    if best_score < 0.5:
        return ("coach_query", 0.6)

    return (best_intent, min(best_score, 0.99))
