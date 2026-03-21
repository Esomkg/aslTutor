from dataclasses import dataclass, field
from typing import Optional
from enum import Enum


class SessionStatus(Enum):
    IDLE = "idle"
    ACTIVE = "active"
    PAUSED = "paused"
    STOPPED = "stopped"


@dataclass
class LandmarkFrame:
    """63 floats: 21 landmarks × (x, y, z)"""
    coords: list[float]  # length == 63
    timestamp: float

    def is_valid(self) -> bool:
        return len(self.coords) == 63


@dataclass
class SignPrediction:
    label: str
    confidence: float  # 0.0 – 1.0


@dataclass
class SessionState:
    session_id: str
    status: SessionStatus = SessionStatus.IDLE
    frame_buffer: list[LandmarkFrame] = field(default_factory=list)
    label_sequence: list[str] = field(default_factory=list)
    english_text: str = ""
    last_confidence: float = 0.0


@dataclass
class TranslationResult:
    sign_label: Optional[str]
    confidence: float
    english_text: str
    status: str  # maps to SessionStatus or special values
