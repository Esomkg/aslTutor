"""
Label accumulator: maintains the ordered sequence of recognised sign labels
for the current session. Handles SPACE (word boundary) and DELETE (backspace).
"""

from backend.models import SignPrediction

CONFIDENCE_THRESHOLD = 0.6


class LabelAccumulator:
    """Ordered list of emitted sign labels for one session."""

    def __init__(self) -> None:
        self._labels: list[str] = []
        self._english_text: str = ""

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def add(self, prediction: SignPrediction) -> bool:
        """
        Append a sign label if confidence >= threshold.

        Special labels:
          "space"  → insert a word boundary (space character)
          "delete" → remove the last appended label

        Returns True if the sequence was modified.
        """
        if prediction.confidence < CONFIDENCE_THRESHOLD:
            return False

        label = prediction.label.lower()

        if label == "delete":
            if self._labels:
                self._labels.pop()
                self._rebuild_text()
                return True
            return False

        if label == "space":
            self._labels.append(" ")
            self._rebuild_text()
            return True

        self._labels.append(prediction.label)
        self._rebuild_text()
        return True

    def clear(self) -> None:
        """Reset the accumulator (session clear / stop)."""
        self._labels.clear()
        self._english_text = ""

    @property
    def labels(self) -> list[str]:
        return list(self._labels)

    @property
    def english_text(self) -> str:
        return self._english_text

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _rebuild_text(self) -> None:
        """Rebuild the display string from the current label list."""
        self._english_text = " ".join(
            lbl for lbl in self._labels if lbl.strip()
        )
