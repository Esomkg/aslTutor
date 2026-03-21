"""Unit tests for FrameBuffer."""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

import pytest
from frame_buffer import FrameBuffer
from models import LandmarkFrame


def make_frame(ts: float = 0.0) -> LandmarkFrame:
    return LandmarkFrame(coords=[0.0] * 63, timestamp=ts)


# ---------------------------------------------------------------------------
# is_full property
# ---------------------------------------------------------------------------

def test_not_full_when_empty():
    buf = FrameBuffer(window_size=3)
    assert not buf.is_full


def test_not_full_before_window_size():
    buf = FrameBuffer(window_size=3)
    buf.add(make_frame())
    buf.add(make_frame())
    assert not buf.is_full


def test_full_at_window_size():
    buf = FrameBuffer(window_size=3)
    for _ in range(3):
        buf.add(make_frame())
    assert buf.is_full


# ---------------------------------------------------------------------------
# add() return value
# ---------------------------------------------------------------------------

def test_add_returns_none_while_not_full():
    buf = FrameBuffer(window_size=3)
    assert buf.add(make_frame()) is None
    assert buf.add(make_frame()) is None


def test_add_returns_window_when_full_stride_1():
    buf = FrameBuffer(window_size=3, stride=1)
    buf.add(make_frame(0.0))
    buf.add(make_frame(1.0))
    result = buf.add(make_frame(2.0))
    assert result is not None
    assert len(result) == 3


def test_add_returns_window_on_every_frame_after_full_stride_1():
    buf = FrameBuffer(window_size=2, stride=1)
    buf.add(make_frame(0.0))
    buf.add(make_frame(1.0))  # full, emit
    result = buf.add(make_frame(2.0))  # still full, stride=1 → emit again
    assert result is not None
    assert len(result) == 2


def test_add_respects_stride():
    buf = FrameBuffer(window_size=2, stride=2)
    buf.add(make_frame(0.0))
    first = buf.add(make_frame(1.0))   # full, stride counter = 1 → no emit yet
    assert first is None
    second = buf.add(make_frame(2.0))  # stride counter = 2 → emit
    assert second is not None
    third = buf.add(make_frame(3.0))   # stride counter = 1 → no emit
    assert third is None
    fourth = buf.add(make_frame(4.0))  # stride counter = 2 → emit
    assert fourth is not None


def test_window_contains_latest_n_frames():
    buf = FrameBuffer(window_size=3, stride=1)
    frames = [make_frame(float(i)) for i in range(5)]
    for f in frames[:3]:
        buf.add(f)
    buf.add(frames[3])
    result = buf.add(frames[4])
    assert result is not None
    timestamps = [f.timestamp for f in result]
    assert timestamps == [2.0, 3.0, 4.0]


# ---------------------------------------------------------------------------
# clear()
# ---------------------------------------------------------------------------

def test_clear_resets_buffer():
    buf = FrameBuffer(window_size=3)
    for _ in range(3):
        buf.add(make_frame())
    buf.clear()
    assert not buf.is_full


def test_clear_resets_stride_counter():
    buf = FrameBuffer(window_size=2, stride=2)
    buf.add(make_frame(0.0))
    buf.add(make_frame(1.0))  # full, stride counter = 1
    buf.clear()
    # After clear, filling again should behave as fresh start
    buf.add(make_frame(2.0))
    result = buf.add(make_frame(3.0))  # stride counter = 1 → no emit
    assert result is None


def test_add_after_clear_returns_none_until_full():
    buf = FrameBuffer(window_size=3)
    for _ in range(3):
        buf.add(make_frame())
    buf.clear()
    assert buf.add(make_frame()) is None
    assert buf.add(make_frame()) is None
    result = buf.add(make_frame())
    assert result is not None


# ---------------------------------------------------------------------------
# Constructor validation
# ---------------------------------------------------------------------------

def test_invalid_window_size_raises():
    with pytest.raises(ValueError):
        FrameBuffer(window_size=0)


def test_invalid_stride_raises():
    with pytest.raises(ValueError):
        FrameBuffer(stride=0)


# ---------------------------------------------------------------------------
# Default parameters
# ---------------------------------------------------------------------------

def test_default_window_size_is_30():
    buf = FrameBuffer()
    for i in range(29):
        assert buf.add(make_frame()) is None
    result = buf.add(make_frame())
    assert result is not None
    assert len(result) == 30
