"""
Voice REST API routes.
POST /process — process audio file
POST /text    — process text input (for testing / fallback)
"""

from fastapi import APIRouter, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from pipeline import process_audio, process_text

router = APIRouter()


class TextInput(BaseModel):
    text: str
    language: Optional[str] = None


class VoiceResponse(BaseModel):
    transcript: str
    intent: str
    confidence: float
    language: str
    entities: dict
    action: str  # "execute" | "confirm" | "retry"
    response_text: str
    latency_ms: int


@router.post("/process", response_model=VoiceResponse)
async def process_voice(
    audio: UploadFile = File(...),
    language: Optional[str] = Form(None),
):
    """Process audio input through the voice pipeline."""
    audio_bytes = await audio.read()
    content_type = audio.content_type or "audio/wav"
    filename = audio.filename or "audio.wav"
    result = await process_audio(
        audio_bytes,
        user_language=language,
        content_type=content_type,
        filename=filename,
    )
    return result


@router.post("/text", response_model=VoiceResponse)
async def process_text_input(body: TextInput):
    """Process text input through the voice pipeline (skip ASR)."""
    result = await process_text(body.text, user_language=body.language)
    return result
