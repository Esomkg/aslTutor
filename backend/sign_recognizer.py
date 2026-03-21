"""
Sign recognizer: uses MediaPipe's built-in GestureRecognizer to detect ASL signs
from JPEG frames. No model training required — MediaPipe bundles the gesture model.

Gesture → ASL word mapping:
  Thumb_Up       → yes
  Thumb_Down     → no
  Open_Palm      → hello
  Pointing_Up    → stop
  Victory        → please
  ILoveYou       → i love you
  Closed_Fist    → more
"""

import urllib.request
from pathlib import Path
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

from backend.models import SignPrediction

# MediaPipe gesture recognizer model — downloaded once and cached locally
_MODEL_URL  = "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task"
_MODEL_PATH = Path(__file__).parent / "gesture_recognizer.task"

# Map MediaPipe gesture labels → ASL words shown to the user
GESTURE_TO_ASL: dict[str, str] = {
    "Thumb_Up":    "yes",
    "Thumb_Down":  "no",
    "Open_Palm":   "hello",
    "Pointing_Up": "stop",
    "Victory":     "please",
    "ILoveYou":    "i love you",
    "Closed_Fist": "more",
}

CONFIDENCE_THRESHOLD = 0.6


class ModelLoadError(Exception):
    """Raised when the gesture recognizer model cannot be loaded."""


class InvalidLandmarkError(Exception):
    """Raised when the input frame is malformed or cannot be decoded."""


class SignRecognizer:
    """
    Wraps MediaPipe GestureRecognizer.

    Downloads the .task model file on first use and caches it next to this module.
    Raises ModelLoadError on startup if the model cannot be loaded.
    """

    def __init__(self, model_path: Path = _MODEL_PATH):
        self._ensure_model(model_path)
        try:
            base_options = mp_python.BaseOptions(model_asset_path=str(model_path))
            options = mp_vision.GestureRecognizerOptions(
                base_options=base_options,
                num_hands=1,
            )
            self._recognizer = mp_vision.GestureRecognizer.create_from_options(options)
        except Exception as exc:
            raise ModelLoadError(f"Failed to load gesture model: {exc}") from exc

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def predict(self, jpeg_bytes: bytes) -> SignPrediction | None:
        """
        Run gesture recognition on a JPEG frame.

        Returns a SignPrediction if a known ASL gesture is detected with
        confidence >= CONFIDENCE_THRESHOLD, otherwise returns None.

        Raises InvalidLandmarkError for malformed / undecodable input.
        """
        image = self._decode_jpeg(jpeg_bytes)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image)

        result = self._recognizer.recognize(mp_image)

        if not result.gestures:
            return None  # no hand or no recognised gesture

        top_gesture   = result.gestures[0][0]
        gesture_label = top_gesture.category_name
        confidence    = top_gesture.score

        if confidence < CONFIDENCE_THRESHOLD:
            return None  # low confidence — discard

        asl_word = GESTURE_TO_ASL.get(gesture_label)
        if asl_word is None:
            return None  # gesture not in our ASL vocabulary

        return SignPrediction(label=asl_word, confidence=confidence)

    def close(self) -> None:
        self._recognizer.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _decode_jpeg(jpeg_bytes: bytes) -> np.ndarray:
        """Decode JPEG bytes to an RGB numpy array. Raises InvalidLandmarkError on failure."""
        if not jpeg_bytes:
            raise InvalidLandmarkError("Empty frame bytes received")
        buf = np.frombuffer(jpeg_bytes, dtype=np.uint8)
        bgr = cv2.imdecode(buf, cv2.IMREAD_COLOR)
        if bgr is None:
            raise InvalidLandmarkError("Could not decode JPEG frame")
        return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)

    @staticmethod
    def _ensure_model(model_path: Path) -> None:
        """Download the MediaPipe gesture model if not already cached."""
        if model_path.exists():
            return
        try:
            print(f"Downloading gesture model to {model_path} ...")
            urllib.request.urlretrieve(_MODEL_URL, model_path)
            print("Gesture model downloaded.")
        except Exception as exc:
            raise ModelLoadError(
                f"Could not download gesture model from {_MODEL_URL}: {exc}"
            ) from exc
