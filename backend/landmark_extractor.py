"""
Landmark extractor: wraps MediaPipe Hands to extract hand landmarks from JPEG frames.
"""

import time
import numpy as np
import cv2
import mediapipe as mp

from backend.models import LandmarkFrame


class LandmarkExtractor:
    """Wraps MediaPipe Hands; accepts raw JPEG bytes, returns LandmarkFrame or None."""

    def __init__(self, static_image_mode: bool = True, max_num_hands: int = 1):
        self._hands = mp.solutions.hands.Hands(
            static_image_mode=static_image_mode,
            max_num_hands=max_num_hands,
        )

    def extract(self, jpeg_bytes: bytes) -> LandmarkFrame | None:
        """
        Decode JPEG bytes, run MediaPipe Hands, and return a LandmarkFrame.

        Returns None if no hand is detected or the image cannot be decoded.
        """
        # Decode JPEG bytes to a numpy array
        buf = np.frombuffer(jpeg_bytes, dtype=np.uint8)
        image_bgr = cv2.imdecode(buf, cv2.IMREAD_COLOR)
        if image_bgr is None:
            return None

        # MediaPipe expects RGB
        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        results = self._hands.process(image_rgb)

        if not results.multi_hand_landmarks:
            return None

        # Use the first detected hand
        hand_landmarks = results.multi_hand_landmarks[0]
        coords: list[float] = []
        for lm in hand_landmarks.landmark:
            coords.extend([lm.x, lm.y, lm.z])

        return LandmarkFrame(coords=coords, timestamp=time.time())

    def close(self) -> None:
        self._hands.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()
