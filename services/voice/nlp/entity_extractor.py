"""
Entity extraction from voice transcripts.
Extracts: amount, contact_name, upi_id, bill_type, category, count, period.
"""

import re
from typing import Dict, Any


# Hindi number words
HINDI_NUMBERS = {
    "ek": 1, "do": 2, "teen": 3, "char": 4, "paanch": 5,
    "chhe": 6, "saat": 7, "aath": 8, "nau": 9, "das": 10,
    "bees": 20, "tees": 30, "chalees": 40, "pachaas": 50,
    "saath": 60, "sattar": 70, "assi": 80, "nabbe": 90,
    "sau": 100, "hazaar": 1000, "hazar": 1000, "lakh": 100000,
    "hundred": 100, "thousand": 1000,
}

# Bill type keywords
BILL_KEYWORDS = {
    "electricity": ["bijli", "electricity", "power", "tata power", "bses", "கரண்ட்", "కరెంటు"],
    "water": ["paani", "water", "jal", "நீர்", "నీరు"],
    "gas": ["gas", "gail", "hp gas", "గ్యాస్"],
    "internet": ["wifi", "internet", "broadband", "airtel", "jio fiber"],
    "mobile": ["recharge", "mobile", "prepaid", "postpaid", "jio", "airtel", "vi"],
    "dth": ["dth", "tata sky", "dish tv", "d2h"],
    "insurance": ["insurance", "bima", "lic", "இன்சூரன்ஸ்"],
}

# Contact alias patterns
CONTACT_ALIASES = {
    "maa": ["maa", "mom", "mother", "mummy", "அம்மா", "అమ్మ", "माँ", "माम"],
    "papa": ["papa", "dad", "father", "daddy", "அப்பா", "నాన్న", "पापा"],
    "bhai": ["bhai", "brother", "bhaiya", "அண்ணா", "అన్న", "भाई"],
    "didi": ["didi", "sister", "behen", "அக்கா", "అక్క", "दीदी"],
}

# Period keywords
PERIOD_KEYWORDS = {
    "today": ["aaj", "today", "இன்று", "ఈరోజు"],
    "week": ["hafte", "week", "saptah", "வாரம்", "వారం"],
    "month": ["mahine", "month", "maheena", "மாதம்", "నెల"],
}

# Confirmation words in all supported languages
CONFIRMATION_WORDS = {
    "haan", "han", "ha", "yes", "ok", "okay", "karo", "confirm", "bilkul",
    "sahi", "theek", "theek hai", "zaroor", "sure", "absolutely",
    "हां", "हाँ", "हा", "हान", "कंफर्म", "ठीक", "ठीक है", "बिल्कुल",
    "ज़रूर", "करो", "सही", "हो जाए", "कर दो", "भेज दो",
    "ஆமா", "சரி", "ஓகே", "అవును", "సరే", "ఓకే",
}

# Rejection words in all supported languages
REJECTION_WORDS = {
    "nahi", "na", "cancel", "band", "rok", "chodo", "no", "nope", "stop",
    "नहीं", "ना", "कैंसल", "रुको", "छोड़ो", "मत", "नहीं करना",
    "இல்லை", "வேண்டாம்", "కాదు", "వద్దు",
}


def is_confirmation(text: str) -> bool:
    """Returns True if the text is a confirmation word/phrase."""
    t = text.lower().strip()
    # Direct match in set
    if t in CONFIRMATION_WORDS:
        return True
    # Partial match for short phrases
    for word in CONFIRMATION_WORDS:
        if word in t and len(t) < 20:
            return True
    return False


def is_rejection(text: str) -> bool:
    """Returns True if the text is a rejection word/phrase."""
    t = text.lower().strip()
    if t in REJECTION_WORDS:
        return True
    for word in REJECTION_WORDS:
        if word in t and len(t) < 20:
            return True
    return False


def extract_entities(transcript: str, intent: str, language: str = "hi") -> Dict[str, Any]:
    """
    Extract structured entities from a transcript based on the detected intent.
    """
    text = transcript.lower().strip()
    entities: Dict[str, Any] = {}

    # Extract amount
    amount = _extract_amount(text)
    if amount is not None:
        entities["amount"] = amount

    # Extract contact/recipient name
    contact = _extract_contact(transcript)  # pass original (not lowercased) for Devanagari
    if contact:
        entities["contact_name"] = contact

    # Extract UPI ID
    upi_match = re.search(r'[\w.]+@[\w]+', text)
    if upi_match:
        entities["upi_id"] = upi_match.group()

    # Intent-specific extraction
    if intent == "pay_bill":
        bill_type = _extract_bill_type(text)
        if bill_type:
            entities["bill_type"] = bill_type

    if intent == "set_budget":
        category = _extract_category(text)
        if category:
            entities["category"] = category

    if intent in ("spending_summary", "transaction_history"):
        period = _extract_period(text)
        if period:
            entities["period"] = period
        count = _extract_count(text)
        if count:
            entities["count"] = count

    return entities


def _extract_amount(text: str) -> float | None:
    """Extract monetary amount from text."""
    # Match digits with optional comma formatting: 1,500 or 1500
    digit_match = re.search(r'(?:₹|rs\.?|rupees?|rupaye?|रुपी|रुपीस|रुपए|rupi|rupis)?\s*(\d[\d,]*\.?\d*)', text, re.IGNORECASE)
    if digit_match:
        amount_str = digit_match.group(1).replace(',', '')
        try:
            return float(amount_str)
        except ValueError:
            pass

    # Match Hindi number words
    for word, value in sorted(HINDI_NUMBERS.items(), key=lambda x: -x[1]):
        if word in text.split():
            # Check for multiplier: "paanch sau" = 500, "do hazaar" = 2000
            idx = text.split().index(word)
            words = text.split()
            if idx > 0 and words[idx - 1] in HINDI_NUMBERS:
                return HINDI_NUMBERS[words[idx - 1]] * value
            return float(value)

    return None


def _extract_contact(transcript: str) -> str | None:
    """Extract contact name or alias from original-case transcript."""
    text_lower = transcript.lower().strip()

    # Check known aliases first (case-insensitive)
    for alias, keywords in CONTACT_ALIASES.items():
        for kw in keywords:
            if kw in text_lower.split() or kw in text_lower:
                return alias

    # ── Romanised Hindi patterns ────────────────────────────────────────────────

    # "Rahul ko 500 bhej do" — name before romanised "ko"
    ko_match = re.search(r'(\w+)\s+ko\s+', transcript, re.IGNORECASE)
    if ko_match:
        name = ko_match.group(1)
        if name.lower() not in {"kitna", "kya", "kaise", "kab", "mujhe", "mujhko", "use"}:
            return name

    # "send 500 to Rahul" / "transfer money to Rahul"
    to_match = re.search(r'(?:send|transfer|pay)\s+(?:\w+\s+)*?to\s+(\w+)', transcript, re.IGNORECASE)
    if to_match:
        name = to_match.group(1)
        if name.lower() not in {"the", "my", "a", "an", "for"}:
            return name

    # "Rahul se maango"
    se_match = re.search(r'(\w+)\s+se\s+', transcript, re.IGNORECASE)
    if se_match:
        name = se_match.group(1)
        if name.lower() not in {"is", "us", "ek", "kisi"}:
            return name

    # ── Devanagari / Sarvam ASR patterns ───────────────────────────────────────

    # "मार्क को 500" — Devanagari "को"
    deva_ko = re.search(r'(\S+)\s+को\s+', transcript)
    if deva_ko:
        name = deva_ko.group(1)
        if name not in {"मुझे", "उसे", "इसे", "कितना", "क्या"}:
            return name

    # "मार्क ऑफ़ 500" — Sarvam often transcribes "को" as "ऑफ़" or "of"
    deva_of = re.search(r'(\S+)\s+(?:ऑफ़?|ऑफ)\s+', transcript)
    if deva_of:
        name = deva_of.group(1)
        return name

    # "मार्क के लिए 500"
    deva_ke = re.search(r'(\S+)\s+के\s+लिए\s+', transcript)
    if deva_ke:
        return deva_ke.group(1)

    # "send to मार्क" (mixed script)
    mixed_to = re.search(r'(?:send|bhej|transfer)\s+(?:\S+\s+)?(?:to\s+)?(\S+)', transcript, re.IGNORECASE)
    if mixed_to:
        candidate = mixed_to.group(1)
        # Must not be a number or common word
        if not re.match(r'^\d', candidate) and candidate.lower() not in {
            "ko", "को", "do", "dena", "de", "₹", "rs", "rupee", "rupees",
            "money", "paisa", "500", "100", "bhej"
        }:
            return candidate

    # Last resort: first word of the utterance if it looks like a name
    # (starts with uppercase in romanised, or is a Devanagari word before a number)
    first_word_before_num = re.match(r'^(\S+)\s+(?:\S+\s+)?(?:₹|\d)', transcript)
    if first_word_before_num:
        candidate = first_word_before_num.group(1)
        # Avoid picking up verbs or common Hindi words
        if candidate.lower() not in {
            "mujhe", "aap", "us", "ek", "do", "teen", "aaj", "kal",
            "kitna", "kya", "kab", "kaise", "please", "zara",
        }:
            return candidate

    return None


def _extract_bill_type(text: str) -> str | None:
    """Extract bill type from text."""
    for bill_type, keywords in BILL_KEYWORDS.items():
        for kw in keywords:
            if kw in text:
                return bill_type
    return None


def _extract_category(text: str) -> str | None:
    """Extract spending category from text."""
    category_keywords = {
        "food": ["khana", "food", "restaurant", "swiggy", "zomato", "உணவு", "ఆహారం"],
        "transport": ["transport", "uber", "ola", "auto", "petrol", "போக்குவரத்து", "రవాణా"],
        "groceries": ["kirana", "groceries", "bigbasket", "மளிகை", "కిరాణా"],
        "shopping": ["shopping", "amazon", "flipkart", "ஷாப்பிங்", "షాపింగ్"],
        "entertainment": ["movie", "netflix", "entertainment", "பொழுதுபோக்கு", "వినోదం"],
        "health": ["health", "medical", "dawai", "pharmacy", "உடல்நலம்", "ఆరోగ్యం"],
        "education": ["education", "school", "tuition", "கல்வி", "విద్య"],
    }

    for category, keywords in category_keywords.items():
        for kw in keywords:
            if kw in text:
                return category
    return None


def _extract_period(text: str) -> str | None:
    """Extract time period from text."""
    for period, keywords in PERIOD_KEYWORDS.items():
        for kw in keywords:
            if kw in text:
                return period
    return None


def _extract_count(text: str) -> int | None:
    """Extract count (e.g., 'last 5 transactions')."""
    count_match = re.search(r'(?:last|pichle|recent)\s+(\d+)', text, re.IGNORECASE)
    if count_match:
        return int(count_match.group(1))
    return None
