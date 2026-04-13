"""
Simple language detection from transcript text.
Detects Hindi, Tamil, Telugu, or English.
"""

import re


# Unicode script ranges
DEVANAGARI_RANGE = re.compile(r'[\u0900-\u097F]')  # Hindi
TAMIL_RANGE = re.compile(r'[\u0B80-\u0BFF]')
TELUGU_RANGE = re.compile(r'[\u0C00-\u0C7F]')


def detect_language(text: str) -> str:
    """
    Detect language from transcript text.
    Returns: 'hi', 'ta', 'te', or 'en'
    """
    if not text:
        return "hi"

    # Count script characters
    devanagari_count = len(DEVANAGARI_RANGE.findall(text))
    tamil_count = len(TAMIL_RANGE.findall(text))
    telugu_count = len(TELUGU_RANGE.findall(text))
    total_script = devanagari_count + tamil_count + telugu_count

    if total_script > 0:
        if devanagari_count >= tamil_count and devanagari_count >= telugu_count:
            return "hi"
        if tamil_count >= devanagari_count and tamil_count >= telugu_count:
            return "ta"
        return "te"

    # For romanized text, use keyword detection
    hindi_markers = [
        "hai", "ka", "ki", "ke", "ko", "se", "mein", "kya",
        "nahi", "haan", "aur", "yeh", "woh", "karo", "kaise",
        "kitna", "bhej", "dikhao", "batao", "bharo",
    ]
    tamil_markers = [
        "enna", "illa", "irukku", "sollu", "podu", "venum",
        "pannunga", "theriyum", "epdi",
    ]
    telugu_markers = [
        "enti", "ledu", "undi", "cheppu", "kavali",
        "chesthe", "ela", "enduku",
    ]

    words = text.lower().split()
    hi_count = sum(1 for w in words if w in hindi_markers)
    ta_count = sum(1 for w in words if w in tamil_markers)
    te_count = sum(1 for w in words if w in telugu_markers)

    if hi_count > ta_count and hi_count > te_count:
        return "hi"
    if ta_count > hi_count and ta_count > te_count:
        return "ta"
    if te_count > hi_count and te_count > ta_count:
        return "te"

    return "en"
