"""
ASL fingerspelling letter recognizer.

Uses MediaPipe HandLandmarker to extract 21 3D hand landmarks, then:
  - If backend/asl_classifier.pkl exists: uses the trained Random Forest (accurate)
  - Otherwise: falls back to rule-based geometric classifier (limited accuracy)

To train the model, run:
    python backend/train_letter_model.py
"""

import math
import pickle
import urllib.request
from pathlib import Path

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

_HAND_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
)
_HAND_MODEL_PATH = Path(__file__).parent / "hand_landmarker.task"
# Prefer the new combined letters+numbers classifier; fall back to old one
_CLASSIFIER_PATH = Path(__file__).parent / "asl_classifier(1).pkl"
_CLASSIFIER_PATH_LEGACY = Path(__file__).parent / "asl_classifier.pkl"


class LetterRecognizer:
    """Classifies ASL fingerspelling letters from JPEG frames."""

    def __init__(self):
        _ensure_model(_HAND_MODEL_PATH, _HAND_MODEL_URL)
        base_options = mp_python.BaseOptions(model_asset_path=str(_HAND_MODEL_PATH))
        options = mp_vision.HandLandmarkerOptions(
            base_options=base_options,
            num_hands=1,
            min_hand_detection_confidence=0.4,
            min_hand_presence_confidence=0.4,
            min_tracking_confidence=0.4,
        )
        self._landmarker = mp_vision.HandLandmarker.create_from_options(options)

        # Load trained classifier if available
        self._clf = None
        self._classes = None  # explicit class list (for new dict-format models)

        clf_path = _CLASSIFIER_PATH if _CLASSIFIER_PATH.exists() else (
            _CLASSIFIER_PATH_LEGACY if _CLASSIFIER_PATH_LEGACY.exists() else None
        )

        if clf_path:
            with open(clf_path, "rb") as f:
                obj = pickle.load(f)
            # New format: dict with 'clf' and 'classes' keys
            if isinstance(obj, dict) and "clf" in obj:
                self._clf = obj["clf"]
                self._classes = obj.get("classes")
                print(f"Loaded combined letters+numbers classifier ({len(self._classes)} classes).")
            else:
                # Legacy format: bare sklearn estimator
                self._clf = obj
                self._classes = list(self._clf.classes_)
                print("Loaded trained ASL classifier (legacy format).")
        else:
            print("No trained classifier found — using rule-based fallback.")
            print("Run: python backend/train_letter_model.py")

    def predict(self, jpeg_bytes: bytes) -> tuple[str | None, float]:
        """Returns (letter, confidence) or (None, 0.0) if no hand detected."""
        if not jpeg_bytes:
            return None, 0.0

        buf = np.frombuffer(jpeg_bytes, dtype=np.uint8)
        bgr = cv2.imdecode(buf, cv2.IMREAD_COLOR)
        if bgr is None:
            return None, 0.0
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)

        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = self._landmarker.detect(mp_image)

        if not result.hand_landmarks:
            return None, 0.0

        lm = result.hand_landmarks[0]

        if self._clf is not None:
            return self._predict_ml(lm)
        else:
            letter = classify_landmarks(lm)
            confidence = 0.75 if letter else 0.0
            return letter, confidence

    def _predict_ml(self, lm) -> tuple[str | None, float]:
        """Use trained Random Forest classifier."""
        wrist = lm[0]
        coords = []
        for point in lm:
            coords.extend([point.x - wrist.x, point.y - wrist.y, point.z - wrist.z])
        features = np.array(coords, dtype=np.float32).reshape(1, -1)

        proba = self._clf.predict_proba(features)[0]
        best_idx = int(np.argmax(proba))
        confidence = float(proba[best_idx])

        # Use explicit class list if available (new dict-format model)
        if self._classes is not None:
            label = str(self._classes[best_idx])
        else:
            label = str(self._clf.classes_[best_idx])

        if confidence < 0.35:
            return None, 0.0
        return label, confidence

    def close(self):
        self._landmarker.close()


# ---------------------------------------------------------------------------
# Rule-based fallback classifier
# ---------------------------------------------------------------------------

def _dist(a, b) -> float:
    return math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2)


def _finger_extended(lm, tip: int, pip: int, mcp: int) -> bool:
    wrist = lm[0]
    return _dist(lm[tip], wrist) > _dist(lm[pip], wrist)


def _tip_near_thumb(lm, tip: int, threshold: float = 0.07) -> bool:
    return _dist(lm[tip], lm[4]) < threshold


def _tip_near_tip(lm, a: int, b: int, threshold: float = 0.06) -> bool:
    return _dist(lm[a], lm[b]) < threshold


INDEX  = (8,  7,  6,  5)
MIDDLE = (12, 11, 10, 9)
RING   = (16, 15, 14, 13)
PINKY  = (20, 19, 18, 17)
THUMB_TIP = 4


def classify_landmarks(lm) -> str | None:
    i_ext = _finger_extended(lm, *INDEX)
    m_ext = _finger_extended(lm, *MIDDLE)
    r_ext = _finger_extended(lm, *RING)
    p_ext = _finger_extended(lm, *PINKY)
    thumb_ext = _dist(lm[THUMB_TIP], lm[5]) > 0.08

    i_curl = not i_ext
    m_curl = not m_ext
    r_curl = not r_ext
    p_curl = not p_ext

    if i_curl and m_curl and r_curl and p_curl and thumb_ext:
        if lm[THUMB_TIP].y < lm[5].y + 0.05:
            return "A"
    if i_ext and m_ext and r_ext and p_ext and not thumb_ext:
        if lm[8].y < lm[5].y:
            return "B"
    if not i_ext and not m_ext and not r_ext and not p_ext:
        gap = _dist(lm[THUMB_TIP], lm[8])
        if 0.06 < gap < 0.18:
            return "C"
    if i_ext and m_curl and r_curl and p_curl and not thumb_ext:
        if _tip_near_thumb(lm, 12) and _tip_near_thumb(lm, 16):
            return "D"
    if i_curl and m_curl and r_curl and p_curl and not thumb_ext:
        return "E"
    if m_ext and r_ext and p_ext and _tip_near_thumb(lm, 8, threshold=0.06):
        return "F"
    if i_ext and m_curl and r_curl and p_curl and thumb_ext:
        if abs(lm[8].y - lm[5].y) < 0.06:
            return "G"
    if i_ext and m_ext and r_curl and p_curl:
        if abs(lm[8].y - lm[5].y) < 0.06 and abs(lm[12].y - lm[9].y) < 0.06:
            return "H"
    if i_curl and m_curl and r_curl and p_ext:
        return "I"
    if i_ext and m_ext and r_curl and p_curl and thumb_ext:
        if lm[8].y < lm[5].y:
            return "K"
    if i_ext and m_curl and r_curl and p_curl and thumb_ext:
        if lm[8].y < lm[5].y:
            return "L"
    if i_curl and m_curl and r_curl and p_curl and not thumb_ext:
        if lm[8].y > lm[5].y and lm[12].y > lm[9].y and lm[16].y > lm[13].y:
            return "M"
    if i_curl and m_curl and r_curl and p_curl and not thumb_ext:
        if lm[8].y > lm[5].y and lm[12].y > lm[9].y:
            return "N"
    if _tip_near_thumb(lm, 8, 0.07) and _tip_near_thumb(lm, 12, 0.09):
        return "O"
    if i_ext and m_ext and r_curl and p_curl:
        if _tip_near_tip(lm, 8, 12, threshold=0.05):
            return "R"
    if i_curl and m_curl and r_curl and p_curl:
        if _dist(lm[THUMB_TIP], lm[6]) < 0.07:
            return "T"
    if i_ext and m_ext and r_curl and p_curl and not thumb_ext:
        if _tip_near_tip(lm, 8, 12, threshold=0.05) and lm[8].y < lm[5].y:
            return "U"
    if i_ext and m_ext and r_curl and p_curl and not thumb_ext:
        spread = _dist(lm[8], lm[12])
        if spread > 0.07 and lm[8].y < lm[5].y:
            return "V"
    if i_ext and m_ext and r_ext and p_curl:
        return "W"
    if not i_ext and m_curl and r_curl and p_curl:
        if lm[8].y > lm[6].y and lm[8].y < lm[5].y:
            return "X"
    if i_curl and m_curl and r_curl and p_ext and thumb_ext:
        return "Y"
    return None


def _ensure_model(path: Path, url: str) -> None:
    if path.exists():
        return
    print(f"Downloading hand landmarker model to {path} ...")
    urllib.request.urlretrieve(url, path)
    print("Hand landmarker model downloaded.")