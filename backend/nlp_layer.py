"""
NLP layer: assembles a list of sign labels into a readable English string.

For the MediaPipe gesture-based MVP, the labels are already English words
so this layer just joins them with spaces. It can be swapped for an LLM
call later via the USE_LLM config flag.
"""

import logging
import os

logger = logging.getLogger(__name__)

# Set USE_LLM=1 in environment to enable OpenAI-based assembly
USE_LLM = os.getenv("USE_LLM", "0") == "1"


class NLPLayer:
    """Converts a list of sign labels into a grammatical English string."""

    def __init__(self) -> None:
        self._last_known_text: str = ""

    def assemble(self, labels: list[str]) -> str:
        """
        Convert sign labels to English text.

        - Empty list → empty string
        - On failure → returns last known text unchanged
        """
        if not labels:
            self._last_known_text = ""
            return ""

        try:
            if USE_LLM:
                text = self._llm_assemble(labels)
            else:
                text = self._simple_assemble(labels)
            self._last_known_text = text
            return text
        except Exception as exc:
            logger.error("NLP layer error: %s", exc)
            return self._last_known_text

    # ------------------------------------------------------------------
    # Implementations
    # ------------------------------------------------------------------

    @staticmethod
    def _simple_assemble(labels: list[str]) -> str:
        """Join labels with spaces, capitalise first word."""
        text = " ".join(lbl for lbl in labels if lbl.strip())
        return text.capitalize()

    @staticmethod
    def _llm_assemble(labels: list[str]) -> str:
        """Use OpenAI to produce a grammatical sentence from sign labels."""
        import openai  # optional dependency

        prompt = (
            "The following words were recognised from ASL signs in order: "
            f"{', '.join(labels)}. "
            "Rewrite them as a natural English sentence. "
            "Reply with only the sentence, no explanation."
        )
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=60,
        )
        return response.choices[0].message.content.strip()
