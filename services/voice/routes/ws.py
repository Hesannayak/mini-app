"""
WebSocket endpoint for streaming voice commands.
"""

import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pipeline import process_text

router = APIRouter()


@router.websocket("/stream")
async def voice_stream(websocket: WebSocket):
    """
    WebSocket for real-time voice command processing.

    Client sends:
      {"type": "text", "text": "Maa ko 500 bhej do", "language": "hi"}
      {"type": "audio_chunk", "data": "<base64>", "language": "hi"}
      {"type": "end_audio"}

    Server responds:
      {"type": "listening"}
      {"type": "processing"}
      {"type": "result", ...pipeline result...}
      {"type": "error", "message": "..."}
    """
    await websocket.accept()

    try:
        while True:
            raw = await websocket.receive_text()
            message = json.loads(raw)
            msg_type = message.get("type", "")

            if msg_type == "text":
                # Process text input
                await websocket.send_json({"type": "processing"})

                text = message.get("text", "")
                language = message.get("language")

                result = await process_text(text, user_language=language)
                await websocket.send_json({"type": "result", **result})

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {msg_type}",
                })

    except WebSocketDisconnect:
        pass
    except json.JSONDecodeError:
        await websocket.send_json({"type": "error", "message": "Invalid JSON"})
    except Exception as e:
        await websocket.send_json({"type": "error", "message": str(e)})
