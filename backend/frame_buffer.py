from collections import deque
from typing import Optional

from backend.models import LandmarkFrame


class FrameBuffer:
    """Sliding window buffer of LandmarkFrame objects.

    Maintains the last N frames. When the buffer is full and the stride
    condition is met, returns the complete window; otherwise returns None.
    """

    def __init__(self, window_size: int = 30, stride: int = 1) -> None:
        if window_size < 1:
            raise ValueError("window_size must be >= 1")
        if stride < 1:
            raise ValueError("stride must be >= 1")
        self._window_size = window_size
        self._stride = stride
        self._buffer: deque[LandmarkFrame] = deque(maxlen=window_size)
        self._frames_since_last_emit = 0

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def add(self, frame: LandmarkFrame) -> Optional[list[LandmarkFrame]]:
        """Add a frame to the buffer.

        Returns the complete window (list of N LandmarkFrames) when the
        buffer is full and the stride condition is satisfied, otherwise
        returns None.
        """
        self._buffer.append(frame)
        if self.is_full:
            self._frames_since_last_emit += 1
            if self._frames_since_last_emit >= self._stride:
                self._frames_since_last_emit = 0
                return list(self._buffer)
        return None

    def clear(self) -> None:
        """Reset the buffer to an empty state."""
        self._buffer.clear()
        self._frames_since_last_emit = 0

    @property
    def is_full(self) -> bool:
        """True when the buffer contains exactly N frames."""
        return len(self._buffer) == self._window_size
