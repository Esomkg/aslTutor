# Implementation Plan: ASL to English Translator

## Overview

Incremental implementation of the two-stage ML pipeline (LSTM sign recognition → NLP English output) embedded in a React + FastAPI web application. Tasks build from data models and core backend components up through the frontend, WebSocket wiring, and finally the offline training notebook.

## Tasks

- [x] 1. Set up project structure and shared data models
  - Create `backend/`, `frontend/`, `models/`, `notebooks/` directories
  - Define Python dataclasses: `LandmarkFrame`, `SignPrediction`, `SessionState`, `SessionStatus`, `TranslationResult` in `backend/models.py`
  - Define TypeScript interfaces: `FrameMessage`, `TranslationResult`, `SessionState` in `frontend/src/types.ts`
  - Add `backend/requirements.txt` (fastapi, uvicorn, mediapipe, tensorflow, hypothesis, pytest, websockets)
  - Add `frontend/package.json` with React, TypeScript, fast-check dependencies
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 2. Implement landmark extractor
  - [x] 2.1 Implement `backend/landmark_extractor.py`
    - Wrap MediaPipe Hands; accept raw JPEG bytes, return `LandmarkFrame` (63 floats) or `None`
    - _Requirements: 1.2, 1.3_

  - [ ]* 2.2 Write property test for landmark extractor output contract
    - **Property 1: Landmark extractor output contract**
    - **Validates: Requirements 1.2**
    - Generate synthetic JPEG frames with a visible hand; assert `len(coords) == 63` and `is_valid() == True`
    - Tag: `# Feature: asl-to-english-translator, Property 1`

  - [ ]* 2.3 Write unit tests for landmark extractor
    - Test `LandmarkFrame.is_valid()` with exact-length, short, and long coord lists
    - Test `None` return when no hand is detected
    - _Requirements: 1.2_

- [x] 3. Implement frame buffer
  - [x] 3.1 Implement `backend/frame_buffer.py`
    - Sliding window of last N=30 `LandmarkFrame` objects; emit complete window when full; configurable stride
    - _Requirements: 2.1_

- [ ] 4. Implement LSTM sign recognizer
  - [ ] 4.1 Implement `backend/sign_recognizer.py`
    - Load `.h5` / `.tflite` at startup; raise `ModelLoadError` if missing or corrupted
    - Accept `(30, 63)` float32 tensor; return `SignPrediction`; validate input shape and values
    - Raise `InvalidLandmarkError` for malformed input (wrong shape, NaN/Inf, empty); log error
    - Discard predictions with confidence < 0.6
    - _Requirements: 2.1, 2.2, 2.5, 6.1, 6.3_

  - [ ]* 4.2 Write property test for sign recognizer output contract
    - **Property 2: Sign recognizer output contract**
    - **Validates: Requirements 2.1**
    - Generate random `(30, 63)` float32 tensors; assert output label is non-empty string and confidence ∈ `[0.0, 1.0]`
    - Tag: `# Feature: asl-to-english-translator, Property 2`

  - [ ]* 4.3 Write property test for confidence threshold filtering
    - **Property 3: Confidence threshold filtering**
    - **Validates: Requirements 2.2**
    - Generate predictions with `confidence < 0.6`; assert label sequence length unchanged after processing
    - Tag: `# Feature: asl-to-english-translator, Property 3`

  - [ ]* 4.4 Write property test for malformed landmark input error handling
    - **Property 4: Malformed landmark input error handling**
    - **Validates: Requirements 2.5**
    - Generate malformed tensors (wrong shape, NaN, empty); assert `InvalidLandmarkError` is raised and logged
    - Tag: `# Feature: asl-to-english-translator, Property 4`

  - [ ]* 4.5 Write unit tests for sign recognizer
    - Test confidence boundary: exactly 0.6 passes, 0.5999 is discarded
    - Test `ModelLoadError` on missing model file
    - _Requirements: 2.2, 6.3_

- [ ] 5. Checkpoint — Ensure all backend model tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement sign label accumulator
  - [ ] 6.1 Implement `backend/label_accumulator.py`
    - Maintain ordered label sequence; handle `SPACE` (word boundary) and `DELETE` (remove last); expose current sequence
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [ ]* 6.2 Write property test for sign label append grows sequence
    - **Property 5: Sign label append grows sequence**
    - **Validates: Requirements 3.1**
    - Generate random valid labels with confidence ≥ 0.6; assert sequence length increases by 1 and last element matches
    - Tag: `# Feature: asl-to-english-translator, Property 5`

  - [ ]* 6.3 Write property test for DELETE sign removes last label
    - **Property 6: DELETE sign removes last label**
    - **Validates: Requirements 3.3**
    - Generate random non-empty sequences; apply DELETE; assert length decreases by 1 and prefix preserved
    - Tag: `# Feature: asl-to-english-translator, Property 6`

  - [ ]* 6.4 Write property test for stop/clear resets output buffer
    - **Property 7: Stop/clear resets output buffer**
    - **Validates: Requirements 3.5**
    - Generate random session states; apply clear; assert empty label sequence and empty `english_text`
    - Tag: `# Feature: asl-to-english-translator, Property 7`

  - [ ]* 6.5 Write unit tests for label accumulator
    - Test SPACE inserts word boundary; DELETE on empty sequence is a no-op
    - _Requirements: 3.2, 3.3_

- [ ] 7. Implement NLP layer
  - [ ] 7.1 Implement `backend/nlp_layer.py`
    - Accept list of sign labels; return grammatical English string
    - Support seq2seq model or LLM API (OpenAI) via config flag; debounce trigger after each new label
    - On failure, return last known `english_text` unchanged and log error
    - Empty label list returns empty string
    - _Requirements: 3.1, 3.4_

  - [ ]* 7.2 Write unit tests for NLP layer
    - Test empty label list returns empty string
    - Test NLP failure returns last known text without crashing
    - _Requirements: 3.1_

- [ ] 8. Implement session manager
  - [ ] 8.1 Implement `backend/session_manager.py`
    - Track active sessions keyed by `session_id`; manage start / pause / resume / stop lifecycle
    - Raise error on invalid transitions (e.g., resuming a STOPPED session)
    - Clean up resources on stop; allow reconnect with same `session_id` within 30s
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 8.2 Write property test for session lifecycle state transitions
    - **Property 8: Session lifecycle state transitions**
    - **Validates: Requirements 1.1, 5.2, 5.3, 5.4**
    - Generate random sessions; apply start/pause/resume/stop sequences; assert correct status and label sequence preserved through pause/resume
    - Tag: `# Feature: asl-to-english-translator, Property 8`

  - [ ]* 8.3 Write unit tests for session manager
    - Test invalid transitions raise errors; test reconnect within 30s reuses session state
    - _Requirements: 5.1, 5.4_

- [ ] 9. Implement FastAPI WebSocket endpoint and wire backend pipeline
  - [ ] 9.1 Implement `backend/main.py` with FastAPI app and `/ws/{session_id}` WebSocket endpoint
    - Accept `FrameMessage` JSON; dispatch frame through landmark extractor → frame buffer → sign recognizer → label accumulator → NLP layer
    - Send `TranslationResult` JSON back to client after each pipeline step
    - Catch all errors at handler level; return `TranslationResult` with `status="error"` and human-readable message
    - Handle WebSocket disconnection: clean up session, allow reconnect within 30s
    - _Requirements: 1.1, 1.4, 2.5, 3.4, 5.1, 5.2, 5.3, 5.4, 6.2, 6.4_

  - [ ]* 9.2 Write integration test for WebSocket endpoint
    - Send sequence of synthetic frames over WebSocket; assert `TranslationResult` messages received with correct structure
    - Test malformed JSON payload returns error result without crashing
    - _Requirements: 2.5, 3.4_

- [ ] 10. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement React frontend
  - [ ] 11.1 Implement `frontend/src/hooks/useWebcam.ts`
    - Access webcam via `getUserMedia`; encode frames as JPEG at ≥15 fps; expose stream and error state
    - _Requirements: 1.1, 1.3, 1.5_

  - [ ] 11.2 Implement `frontend/src/hooks/useTranslationSocket.ts`
    - Manage WebSocket connection to `/ws/{session_id}`; send `FrameMessage`; receive and parse `TranslationResult`
    - Expose connection status and latest result
    - _Requirements: 1.1, 3.4_

  - [ ] 11.3 Implement `frontend/src/components/CameraPreview.tsx`
    - Render live camera feed in a `<video>` element
    - Display "No camera detected" error when camera unavailable
    - Display "No hand visible" status when `status === "no_hand"`
    - _Requirements: 1.3, 4.3_

  - [ ] 11.4 Implement `frontend/src/components/TranslationOutput.tsx`
    - Display current `englishText` output buffer, updated within 300ms of each result
    - Display confidence score; show low-confidence indicator when confidence < 0.6
    - _Requirements: 3.4, 4.1, 4.2_

  - [ ] 11.5 Implement `frontend/src/components/SessionControls.tsx`
    - Render Start / Pause / Resume / Stop buttons; disable Start when model not ready or no camera
    - Display loading indicator while model loads; display "paused" indicator when session is paused
    - Display ready status when model loaded
    - _Requirements: 5.1, 5.5, 6.2, 6.3, 6.4_

  - [ ] 11.6 Implement `frontend/src/App.tsx`
    - Compose `CameraPreview`, `TranslationOutput`, `SessionControls`; wire hooks to components
    - _Requirements: 1.1, 3.4, 5.1_

  - [ ]* 11.7 Write property tests for frontend (fast-check)
    - Test `TranslationResult` parsing handles arbitrary valid JSON payloads without throwing
    - Test confidence display renders correctly for any float in `[0.0, 1.0]`
    - _Requirements: 4.1, 4.2_

- [ ] 12. Checkpoint — Ensure all frontend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Create offline training notebook
  - [x] 13.1 Implement `notebooks/train_asl_lstm.ipynb` (Google Colab / Kaggle compatible)
    - Section 1: Dataset setup — download and load ASL Citizen dataset; extract MediaPipe landmarks from video frames; save as `.npy` arrays
    - Section 2: Data preprocessing — normalize landmarks; create sliding windows of 30 frames; encode labels with `LabelEncoder`; save `label_encoder.json`
    - Section 3: LSTM model definition — `Input(30, 63)` → LSTM layers → Dense softmax; compile with categorical crossentropy
    - Section 4: Training — fit model with train/val split; plot accuracy and loss curves
    - Section 5: Evaluation — confusion matrix; per-class accuracy; identify weak signs
    - Section 6: Export — save model as `sign_recognizer.h5` and optionally convert to `.tflite`; download artifacts
    - _Requirements: 2.1, 2.3, 2.4, 6.1_

- [ ] 14. Final checkpoint — Full integration
  - Ensure all tests pass, verify backend starts and loads model, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use **Hypothesis** (Python backend) and **fast-check** (TypeScript frontend), minimum 100 iterations each
- The training notebook (task 13) is standalone and runs on Google Colab or Kaggle; the exported `.h5` artifact is placed in `models/` before running the backend
- NLP layer can start with an LLM API call (OpenAI) and be swapped for a local seq2seq model later via a config flag
