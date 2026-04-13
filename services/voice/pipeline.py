"""
Voice pipeline orchestrator.
7-step flow: audio → ASR → intent → entities → permission check → route → response
"""

import time
from typing import Optional
from nlp.intent_classifier import classify_intent
from nlp.entity_extractor import extract_entities, is_confirmation, is_rejection
from nlp.language_detector import detect_language
from asr.sarvam import asr_engine


# Confidence thresholds from CLAUDE.md
CONFIDENCE_AUTO_EXECUTE = 0.90
CONFIDENCE_CONFIRM = 0.70
CONFIDENCE_PAYMENT_MIN = 0.80
CONFIDENCE_RETRY = 0.70

# Response templates per language
RETRY_MESSAGES = {
    "hi": "Mujhe samajh nahi aaya, dobara boliye",
    "en": "I didn't understand, please try again",
    "ta": "புரியவில்லை, மீண்டும் சொல்லுங்கள்",
    "te": "అర్థం కాలేదు, మళ్ళీ చెప్పండి",
}

CONFIRM_TEMPLATES = {
    "send_money": {
        "hi": "{contact} ko ₹{amount} bhejne hain? Confirm karein.",
        "en": "Send ₹{amount} to {contact}? Please confirm.",
        "ta": "{contact}க்கு ₹{amount} அனுப்பவா? உறுதிப்படுத்தவும்.",
        "te": "{contact}కు ₹{amount} పంపాలా? నిర్ధారించండి.",
    },
    "pay_bill": {
        "hi": "{bill_type} bill ₹{amount} bharna hai? Confirm karein.",
        "en": "Pay {bill_type} bill of ₹{amount}? Please confirm.",
        "ta": "{bill_type} பில் ₹{amount} கட்டவா? உறுதிப்படுத்தவும்.",
        "te": "{bill_type} బిల్లు ₹{amount} చెల్లించాలా? నిర్ధారించండి.",
    },
    "request_money": {
        "hi": "{contact} se ₹{amount} maangne hain? Confirm karein.",
        "en": "Request ₹{amount} from {contact}? Please confirm.",
        "ta": "{contact}கிடம் ₹{amount} கேட்கவா? உறுதிப்படுத்தவும்.",
        "te": "{contact} నుండి ₹{amount} అడగాలా? నిర్ధారించండి.",
    },
}

SUCCESS_TEMPLATES = {
    "check_balance": {
        "hi": "Aapka balance ₹{balance} hai.",
        "en": "Your balance is ₹{balance}.",
        "ta": "உங்கள் இருப்பு ₹{balance}.",
        "te": "మీ బ్యాలెన్స్ ₹{balance}.",
    },
    "spending_summary": {
        "hi": "{period} mein ₹{total} kharch hua.",
        "en": "You spent ₹{total} {period}.",
        "ta": "{period} ₹{total} செலவு.",
        "te": "{period} ₹{total} ఖర్చు.",
    },
}

EXECUTE_TEMPLATES = {
    "send_money": {
        "hi": "₹{amount} {contact} ko bhej diya gaya! ✓",
        "en": "₹{amount} sent to {contact} successfully! ✓",
        "ta": "₹{amount} {contact}க்கு அனுப்பப்பட்டது! ✓",
        "te": "₹{amount} {contact}కు పంపబడింది! ✓",
    },
    "pay_bill": {
        "hi": "{bill_type} bill ₹{amount} bhar diya gaya! ✓",
        "en": "{bill_type} bill of ₹{amount} paid! ✓",
        "ta": "{bill_type} பில் ₹{amount} கட்டப்பட்டது! ✓",
        "te": "{bill_type} బిల్లు ₹{amount} చెల్లించబడింది! ✓",
    },
    "request_money": {
        "hi": "{contact} ko ₹{amount} ki request bhej di! ✓",
        "en": "₹{amount} requested from {contact}! ✓",
        "ta": "{contact}கிடம் ₹{amount} கேட்கப்பட்டது! ✓",
        "te": "{contact} నుండి ₹{amount} అడగబడింది! ✓",
    },
}

CANCEL_MESSAGES = {
    "hi": "Theek hai, payment cancel kar diya.",
    "en": "Okay, payment cancelled.",
    "ta": "சரி, பணம் அனுப்புவது ரத்து செய்யப்பட்டது.",
    "te": "సరే, చెల్లింపు రద్దు చేయబడింది.",
}


async def process_audio(
    audio_bytes: bytes,
    user_language: Optional[str] = None,
    content_type: str = "audio/wav",
    filename: str = "audio.wav",
    pending_context: Optional[dict] = None,
) -> dict:
    """Process audio through the full 7-step voice pipeline."""
    start_time = time.time()

    asr_result = await asr_engine.transcribe(
        audio_bytes,
        language_hint=user_language,
        content_type=content_type,
        filename=filename,
    )
    transcript = asr_result["transcript"]
    language = asr_result.get("language", user_language or "hi")

    return await _process_transcript(transcript, language, start_time, pending_context)


async def process_text(
    text: str,
    user_language: Optional[str] = None,
    pending_context: Optional[dict] = None,
) -> dict:
    """Process text input through the pipeline (skip ASR step)."""
    start_time = time.time()
    language = user_language or detect_language(text)
    return await _process_transcript(text, language, start_time, pending_context)


async def _process_transcript(
    transcript: str,
    language: str,
    start_time: float,
    pending_context: Optional[dict] = None,
) -> dict:
    """Core pipeline logic after transcription."""

    # ── Confirmation / rejection of a pending action ────────────────────────────
    if pending_context and pending_context.get("intent") and pending_context.get("entities"):
        pending_intent = pending_context["intent"]
        pending_entities = pending_context["entities"]

        if is_confirmation(transcript):
            response_text = _build_execute_text(pending_intent, pending_entities, language)
            return _build_response(
                transcript=transcript,
                intent=pending_intent,
                confidence=0.99,
                language=language,
                entities=pending_entities,
                action="execute",
                response_text=response_text,
                latency_ms=_elapsed(start_time),
            )

        if is_rejection(transcript):
            return _build_response(
                transcript=transcript,
                intent=pending_intent,
                confidence=0.99,
                language=language,
                entities=pending_entities,
                action="cancel",
                response_text=CANCEL_MESSAGES.get(language, CANCEL_MESSAGES["en"]),
                latency_ms=_elapsed(start_time),
            )

    # ── Normal pipeline ──────────────────────────────────────────────────────────

    # Step 3: Intent classification
    intent, confidence = classify_intent(transcript, language)

    # Step 4: Entity extraction
    entities = extract_entities(transcript, intent, language)

    # Step 5: Confidence check
    if confidence < CONFIDENCE_RETRY:
        return _build_response(
            transcript=transcript,
            intent=intent,
            confidence=confidence,
            language=language,
            entities=entities,
            action="retry",
            response_text=RETRY_MESSAGES.get(language, RETRY_MESSAGES["en"]),
            latency_ms=_elapsed(start_time),
        )

    # Payment-specific confidence check
    is_payment_intent = intent in ("send_money", "pay_bill", "request_money")
    if is_payment_intent and confidence < CONFIDENCE_PAYMENT_MIN:
        return _build_response(
            transcript=transcript,
            intent=intent,
            confidence=confidence,
            language=language,
            entities=entities,
            action="retry",
            response_text=RETRY_MESSAGES.get(language, RETRY_MESSAGES["en"]),
            latency_ms=_elapsed(start_time),
        )

    # Step 6: Determine action
    if is_payment_intent:
        # Payments always require confirmation
        action = "confirm"
        response_text = _build_confirm_message(intent, entities, language)
    elif confidence >= CONFIDENCE_AUTO_EXECUTE:
        action = "execute"
        response_text = _build_execute_response(intent, entities, language)
    elif confidence >= CONFIDENCE_CONFIRM:
        action = "confirm"
        response_text = _build_confirm_message(intent, entities, language)
    else:
        action = "retry"
        response_text = RETRY_MESSAGES.get(language, RETRY_MESSAGES["en"])

    # Step 7: Build response
    return _build_response(
        transcript=transcript,
        intent=intent,
        confidence=confidence,
        language=language,
        entities=entities,
        action=action,
        response_text=response_text,
        latency_ms=_elapsed(start_time),
    )


def _build_confirm_message(intent: str, entities: dict, language: str) -> str:
    """Build a confirmation message for the user."""
    templates = CONFIRM_TEMPLATES.get(intent, {})
    template = templates.get(language, templates.get("en", "Please confirm this action."))

    contact = entities.get("contact_name", "?")
    amount = entities.get("amount", "?")

    return template.format(
        contact=contact,
        amount=amount,
        bill_type=entities.get("bill_type", ""),
    )


def _build_execute_text(intent: str, entities: dict, language: str) -> str:
    """Build a success message for a confirmed action."""
    templates = EXECUTE_TEMPLATES.get(intent, {})
    template = templates.get(language, templates.get("en", "Done! ✓"))

    contact = entities.get("contact_name", "")
    amount = entities.get("amount", "")

    try:
        return template.format(
            contact=contact,
            amount=amount,
            bill_type=entities.get("bill_type", ""),
        )
    except KeyError:
        return template


def _build_execute_response(intent: str, entities: dict, language: str) -> str:
    """Build a response for auto-executed non-payment actions."""
    templates = SUCCESS_TEMPLATES.get(intent, {})
    template = templates.get(language, templates.get("en", "Done."))

    return template.format(
        balance=entities.get("balance", "N/A"),
        total=entities.get("total", "N/A"),
        period=entities.get("period", "today"),
    )


def _build_response(
    transcript: str,
    intent: str,
    confidence: float,
    language: str,
    entities: dict,
    action: str,
    response_text: str,
    latency_ms: int,
) -> dict:
    return {
        "transcript": transcript,
        "intent": intent,
        "confidence": round(confidence, 3),
        "language": language,
        "entities": entities,
        "action": action,
        "response_text": response_text,
        "latency_ms": latency_ms,
    }


def _elapsed(start: float) -> int:
    return int((time.time() - start) * 1000)
