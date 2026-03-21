"""
FastAPI app with WebSocket endpoint /ws/{session_id}.

Pipeline per frame:
  JPEG bytes → SignRecognizer → SessionManager → TranslationResult → client
"""

import json
import logging
import base64
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from backend.models import TranslationResult
from backend.sign_recognizer import SignRecognizer, ModelLoadError, InvalidLandmarkError
from backend.session_manager import SessionManager
from backend.letter_recognizer import LetterRecognizer
from backend.ai_agent import stream_chat, load_chat_history, generate_greeting, get_gesture_feedback

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App startup / shutdown
# ---------------------------------------------------------------------------

recognizer: SignRecognizer | None = None
letter_recognizer: LetterRecognizer | None = None
session_mgr = SessionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global recognizer, letter_recognizer
    try:
        recognizer = SignRecognizer()
        logger.info("Gesture recognizer loaded successfully.")
    except ModelLoadError as exc:
        logger.error("Failed to load gesture model: %s", exc)
        recognizer = None
    try:
        letter_recognizer = LetterRecognizer()
        logger.info("Letter recognizer loaded successfully.")
    except Exception as exc:
        logger.error("Failed to load letter recognizer: %s", exc)
        letter_recognizer = None
    yield
    if recognizer:
        recognizer.close()
    if letter_recognizer:
        letter_recognizer.close()


app = FastAPI(title="ASL Translator", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": recognizer is not None}


# ---------------------------------------------------------------------------
# AI Chat endpoint
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    conversation: list[ChatMessage]
    practiced_letters: list[str] | None = None
    missed_letters: list[dict] | None = None
    user_jwt: str | None = None
    show_browsing: bool = False

@app.post("/api/chat")
def chat(req: ChatRequest):
    conversation = [{"role": m.role, "content": m.content} for m in req.conversation]

    def generate():
        try:
            for chunk in stream_chat(conversation, req.practiced_letters, req.user_jwt, req.missed_letters, req.show_browsing):
                yield chunk
        except Exception as exc:
            yield f"\n\n[Error: {exc}]"

    return StreamingResponse(generate(), media_type="text/plain")


class HistoryRequest(BaseModel):
    user_jwt: str

@app.post("/api/chat/history")
def get_history(req: HistoryRequest):
    messages = load_chat_history(req.user_jwt)
    return {"messages": messages}


class GreetingRequest(BaseModel):
    user_jwt: str | None = None
    practiced_letters: list[str] | None = None

@app.post("/api/chat/greeting")
def get_greeting(req: GreetingRequest):
    message = generate_greeting(req.user_jwt, req.practiced_letters)
    return {"message": message}


# ---------------------------------------------------------------------------
# Gesture feedback endpoint
# ---------------------------------------------------------------------------

class GestureFeedbackRequest(BaseModel):
    target_letter: str
    detected_letter: str | None = None
    confidence: float = 0.0

@app.post("/api/gesture-feedback")
def gesture_feedback(req: GestureFeedbackRequest):
    tip = get_gesture_feedback(req.target_letter, req.detected_letter or "", req.confidence)
    return {"tip": tip}


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    logger.info("WebSocket connected: %s", session_id)

    # Start or reconnect session
    try:
        session_mgr.start(session_id)
    except Exception as exc:
        await _send_error(websocket, str(exc), "", 0.0)
        await websocket.close()
        return

    try:
        while True:
            raw = await websocket.receive_text()
            result = _handle_message(session_id, raw)
            await websocket.send_text(result)

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected: %s", session_id)
        session_mgr.stop(session_id)
    except Exception as exc:
        logger.error("Unexpected error in session %s: %s", session_id, exc)
        await _send_error(websocket, str(exc), "", 0.0)
        session_mgr.stop(session_id)


# ---------------------------------------------------------------------------
# Message handler
# ---------------------------------------------------------------------------

def _handle_message(session_id: str, raw: str) -> str:
    """
    Parse an incoming WebSocket message and return a JSON TranslationResult.

    Expected message format:
      { "type": "frame",    "frameData": "<base64 JPEG>", ... }
      { "type": "pause"  }
      { "type": "resume" }
      { "type": "stop"   }
      { "type": "clear"  }
    """
    try:
        msg = json.loads(raw)
    except json.JSONDecodeError:
        return _error_result("Invalid JSON payload", "", 0.0)

    msg_type = msg.get("type", "")

    # Session control messages
    if msg_type == "pause":
        state = session_mgr.pause(session_id)
        return _state_result(state, None, "paused")

    if msg_type == "resume":
        state = session_mgr.resume(session_id)
        return _state_result(state, None, "active")

    if msg_type == "stop":
        state = session_mgr.stop(session_id)
        return _state_result(state, None, "stopped")

    if msg_type == "clear":
        state = session_mgr.clear(session_id)
        return _state_result(state, None, "active")

    # Frame message
    if msg_type != "frame":
        return _error_result(f"Unknown message type: {msg_type}", "", 0.0)

    if recognizer is None:
        return _error_result("Model not loaded", "", 0.0)

    frame_data = msg.get("frameData", "")
    if not frame_data:
        return _error_result("Missing frameData", "", 0.0)

    try:
        jpeg_bytes = base64.b64decode(frame_data)
    except Exception:
        return _error_result("Invalid base64 frameData", "", 0.0)

    try:
        prediction = recognizer.predict(jpeg_bytes)
    except InvalidLandmarkError as exc:
        logger.warning("Invalid frame in session %s: %s", session_id, exc)
        state = session_mgr.get_state(session_id)
        return _result(
            sign_label=None,
            confidence=0.0,
            english_text=state.english_text if state else "",
            status="no_hand",
        )

    if prediction is None:
        state = session_mgr.get_state(session_id)
        english = state.english_text if state else ""
        return _result(None, 0.0, english, "no_hand")

    state = session_mgr.process_prediction(session_id, prediction)
    status = "low_confidence" if prediction.confidence < 0.6 else "active"
    return _result(prediction.label, prediction.confidence, state.english_text, status)


# ---------------------------------------------------------------------------
# Response helpers
# ---------------------------------------------------------------------------

def _result(sign_label, confidence, english_text, status) -> str:
    return json.dumps({
        "type":        "result",
        "signLabel":   sign_label,
        "confidence":  confidence,
        "englishText": english_text,
        "status":      status,
    })


def _state_result(state, sign_label, status) -> str:
    return json.dumps({
        "type":        "result",
        "signLabel":   sign_label,
        "confidence":  state.last_confidence,
        "englishText": state.english_text,
        "status":      status,
    })


def _error_result(message: str, english_text: str, confidence: float) -> str:
    return json.dumps({
        "type":        "result",
        "signLabel":   None,
        "confidence":  confidence,
        "englishText": english_text,
        "status":      "error",
        "message":     message,
    })


async def _send_error(websocket: WebSocket, message: str, english_text: str, confidence: float):
    try:
        await websocket.send_text(_error_result(message, english_text, confidence))
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Practice WebSocket endpoint — letter-by-letter fingerspelling detection
# ---------------------------------------------------------------------------

@app.websocket("/ws/practice/{session_id}")
async def practice_websocket(websocket: WebSocket, session_id: str):
    await websocket.accept()
    logger.info("Practice WebSocket connected: %s", session_id)
    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            if msg.get("type") != "frame":
                continue

            frame_data = msg.get("frameData", "")
            if not frame_data:
                continue

            try:
                jpeg_bytes = base64.b64decode(frame_data)
            except Exception:
                continue

            if letter_recognizer is None:
                await websocket.send_text(json.dumps({"letter": None, "confidence": 0.0, "error": "model not loaded"}))
                continue

            letter, confidence = letter_recognizer.predict(jpeg_bytes)
            await websocket.send_text(json.dumps({
                "letter": letter,
                "confidence": round(confidence, 3),
            }))

    except WebSocketDisconnect:
        logger.info("Practice WebSocket disconnected: %s", session_id)
    except Exception as exc:
        logger.error("Practice WebSocket error %s: %s", session_id, exc)
