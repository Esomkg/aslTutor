"""
Session manager: tracks active sessions keyed by session_id.
Manages start / pause / resume / stop lifecycle.
"""

import time
import logging
from backend.models import SessionState, SessionStatus
from backend.label_accumulator import LabelAccumulator
from backend.nlp_layer import NLPLayer

logger = logging.getLogger(__name__)

# How long (seconds) a stopped session is kept for reconnect
RECONNECT_WINDOW = 30


class InvalidTransitionError(Exception):
    """Raised when an illegal session state transition is attempted."""


class SessionManager:
    """Manages the lifecycle of translation sessions."""

    def __init__(self) -> None:
        # session_id → (SessionState, LabelAccumulator, NLPLayer, stopped_at)
        self._sessions: dict[str, dict] = {}

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def start(self, session_id: str) -> SessionState:
        """Start a new session or reconnect within the reconnect window."""
        existing = self._sessions.get(session_id)
        if existing:
            state: SessionState = existing["state"]
            stopped_at: float | None = existing.get("stopped_at")
            # Allow reconnect within window
            if state.status == SessionStatus.STOPPED and stopped_at:
                if time.time() - stopped_at <= RECONNECT_WINDOW:
                    logger.info("Reconnecting session %s", session_id)
                    state.status = SessionStatus.ACTIVE
                    existing["stopped_at"] = None
                    return state
            if state.status == SessionStatus.IDLE:
                state.status = SessionStatus.ACTIVE
                return state
            raise InvalidTransitionError(
                f"Cannot start session in status {state.status.value}"
            )

        state = SessionState(session_id=session_id, status=SessionStatus.ACTIVE)
        self._sessions[session_id] = {
            "state":       state,
            "accumulator": LabelAccumulator(),
            "nlp":         NLPLayer(),
            "stopped_at":  None,
        }
        logger.info("Started session %s", session_id)
        return state

    def pause(self, session_id: str) -> SessionState:
        state = self._get_active(session_id, SessionStatus.ACTIVE)
        state.status = SessionStatus.PAUSED
        return state

    def resume(self, session_id: str) -> SessionState:
        state = self._get_active(session_id, SessionStatus.PAUSED)
        state.status = SessionStatus.ACTIVE
        return state

    def stop(self, session_id: str) -> SessionState:
        entry = self._sessions.get(session_id)
        if not entry:
            raise KeyError(f"Session {session_id} not found")
        state: SessionState = entry["state"]
        if state.status == SessionStatus.STOPPED:
            return state
        state.status = SessionStatus.STOPPED
        entry["stopped_at"] = time.time()
        logger.info("Stopped session %s", session_id)
        return state

    def clear(self, session_id: str) -> SessionState:
        """Clear the label sequence and english text for a session."""
        entry = self._sessions.get(session_id)
        if not entry:
            raise KeyError(f"Session {session_id} not found")
        entry["accumulator"].clear()
        state: SessionState = entry["state"]
        state.label_sequence = []
        state.english_text = ""
        return state

    # ------------------------------------------------------------------
    # Frame processing
    # ------------------------------------------------------------------

    def process_prediction(self, session_id: str, prediction) -> SessionState:
        """
        Feed a SignPrediction into the session's accumulator and NLP layer.
        Updates and returns the SessionState.
        """
        entry = self._sessions.get(session_id)
        if not entry:
            raise KeyError(f"Session {session_id} not found")

        state: SessionState = entry["state"]
        if state.status != SessionStatus.ACTIVE:
            return state

        acc: LabelAccumulator = entry["accumulator"]
        nlp: NLPLayer         = entry["nlp"]

        modified = acc.add(prediction)
        if modified:
            state.label_sequence = acc.labels
            state.english_text   = nlp.assemble(acc.labels)

        state.last_confidence = prediction.confidence
        return state

    # ------------------------------------------------------------------
    # Accessors
    # ------------------------------------------------------------------

    def get_state(self, session_id: str) -> SessionState | None:
        entry = self._sessions.get(session_id)
        return entry["state"] if entry else None

    def cleanup_expired(self) -> None:
        """Remove sessions that are past the reconnect window."""
        now = time.time()
        expired = [
            sid for sid, entry in self._sessions.items()
            if entry["state"].status == SessionStatus.STOPPED
            and entry.get("stopped_at")
            and now - entry["stopped_at"] > RECONNECT_WINDOW
        ]
        for sid in expired:
            del self._sessions[sid]
            logger.info("Cleaned up expired session %s", sid)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _get_active(self, session_id: str, expected: SessionStatus) -> SessionState:
        entry = self._sessions.get(session_id)
        if not entry:
            raise KeyError(f"Session {session_id} not found")
        state: SessionState = entry["state"]
        if state.status != expected:
            raise InvalidTransitionError(
                f"Expected status {expected.value}, got {state.status.value}"
            )
        return state
