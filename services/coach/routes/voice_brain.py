
"""
Voice Brain — unified Claude endpoint for all voice/text input.
Claude is the brain: intent detection, entity extraction, conversation, confirmation.
One endpoint to rule them all.
"""

import os
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import anthropic
from prompts import build_voice_brain_prompt

router = APIRouter()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise RuntimeError("FATAL: ANTHROPIC_API_KEY must be set")

claude = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# Per-user conversation history
_history: dict[str, list] = {}
MAX_HISTORY = 20
MAX_MESSAGES_PER_DAY = 50
_rate: dict[str, dict] = {}


class VoiceBrainRequest(BaseModel):
    transcript: str
    language: Optional[str] = "hi"
    user_id: Optional[str] = "default"


class VoiceBrainResponse(BaseModel):
    intent: str
    entities: dict
    action: str
    response_text: str
    requires_pin: bool


@router.post("/voice", response_model=VoiceBrainResponse)
async def voice_brain(body: VoiceBrainRequest):
    """
    Unified voice brain — Claude processes everything.
    Handles: payments, confirmations, greetings, general chat, guardrails.
    """
    user_id = body.user_id or "default"
    today = datetime.now().strftime("%Y-%m-%d")

    # Rate limit
    if user_id not in _rate or _rate[user_id].get("date") != today:
        _rate[user_id] = {"date": today, "count": 0}
    if _rate[user_id]["count"] >= MAX_MESSAGES_PER_DAY:
        return VoiceBrainResponse(
            intent="rate_limit",
            entities={},
            action="respond",
            response_text="Aaj ke liye limit ho gayi. Kal try karo.",
            requires_pin=False,
        )

    # Build conversation history for Claude
    if user_id not in _history:
        _history[user_id] = []

    # Add user message
    _history[user_id].append({
        "role": "user",
        "content": body.transcript,
    })

    # Keep last N messages
    messages = _history[user_id][-MAX_HISTORY:]

    system_prompt = build_voice_brain_prompt(body.language or "hi")

    try:
        response = claude.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=200,
            system=system_prompt,
            messages=messages,
        )

        raw = response.content[0].text.strip()

        # Parse JSON from Claude's response
        # Handle cases where Claude wraps JSON in markdown code blocks
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        parsed = json.loads(raw)

        result = VoiceBrainResponse(
            intent=parsed.get("intent", "general_chat"),
            entities=parsed.get("entities", {}),
            action=parsed.get("action", "respond"),
            response_text=parsed.get("response_text", "Samajh nahi aaya."),
            requires_pin=parsed.get("requires_pin", False),
        )

        # Store assistant response in history
        _history[user_id].append({
            "role": "assistant",
            "content": raw,
        })

        _rate[user_id]["count"] += 1

        return result

    except json.JSONDecodeError:
        # Claude didn't return valid JSON — use raw text as response
        _history[user_id].append({
            "role": "assistant",
            "content": raw if 'raw' in dir() else "error",
        })
        return VoiceBrainResponse(
            intent="general_chat",
            entities={},
            action="respond",
            response_text=raw if 'raw' in dir() else "Kuch gadbad ho gayi.",
            requires_pin=False,
        )
    except anthropic.AuthenticationError:
        raise HTTPException(status_code=500, detail="Invalid Anthropic API key")
    except anthropic.RateLimitError:
        raise HTTPException(status_code=429, detail="Claude rate limit. Try shortly.")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Claude error: {str(e)}")


@router.post("/voice/reset")
async def reset_history(user_id: str = "default"):
    """Clear conversation history for a user."""
    _history.pop(user_id, None)
    return {"success": True}
