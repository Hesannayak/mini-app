"""
Sarvam AI Saaras v2 — ASR for Indian languages.
Converts audio to text with language detection.
Target latency: <600ms
"""

import os
import httpx
from typing import Optional


SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SARVAM_API_URL = "https://api.sarvam.ai/speech-to-text-translate"

if not SARVAM_API_KEY:
    raise RuntimeError("FATAL: SARVAM_API_KEY must be set in .env")


class SarvamASR:
    def __init__(self):
        self.api_key = SARVAM_API_KEY
        self.client = httpx.AsyncClient(timeout=10.0)

    async def transcribe(
        self,
        audio_bytes: bytes,
        language_hint: Optional[str] = None,
    ) -> dict:
        """
        Transcribe audio using Sarvam AI Saaras v2.

        Returns:
            {
                "transcript": str,
                "language": str,  # detected language code
                "confidence": float,
                "latency_ms": int
            }
        """
        import time
        start = time.time()

        headers = {"api-subscription-key": self.api_key}
        files = {"file": ("audio.wav", audio_bytes, "audio/wav")}
        data = {}
        if language_hint:
            data["language_code"] = language_hint

        response = await self.client.post(
            SARVAM_API_URL,
            headers=headers,
            files=files,
            data=data,
        )
        response.raise_for_status()
        result = response.json()

        latency_ms = int((time.time() - start) * 1000)

        return {
            "transcript": result.get("transcript", ""),
            "language": result.get("language_code", language_hint or "hi"),
            "confidence": result.get("confidence", 0.9),
            "latency_ms": latency_ms,
        }

    async def close(self):
        await self.client.aclose()


# Singleton
asr_engine = SarvamASR()
