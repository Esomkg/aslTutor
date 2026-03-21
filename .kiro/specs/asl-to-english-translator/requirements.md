# Requirements Document

## Introduction

This feature enables real-time translation of American Sign Language (ASL) gestures into English text. The system uses a camera feed to capture hand and body gestures, recognizes ASL signs using a machine learning model, and outputs the corresponding English words or phrases. The goal is to make ASL communication more accessible to people who do not know sign language.

## Glossary

- **Translator**: The top-level system responsible for coordinating gesture capture, recognition, and text output.
- **Gesture_Capture**: The component that reads video frames from a camera and extracts hand/body landmark data.
- **Sign_Recognizer**: The ML model component that maps extracted landmarks to ASL sign labels.
- **Text_Output**: The component that assembles recognized sign labels into readable English text.
- **Landmark**: A spatial coordinate point representing a joint or keypoint on the hand or body (e.g., fingertip, wrist).
- **Sign**: A discrete ASL gesture corresponding to a letter, word, or phrase.
- **Confidence_Score**: A numeric value between 0.0 and 1.0 representing the model's certainty about a recognized sign.
- **Frame**: A single image captured from the camera at a point in time.
- **Session**: A continuous period of active translation from camera start to camera stop.

---

## Requirements

### Requirement 1: Camera Input and Gesture Capture

**User Story:** As a user, I want the system to capture my hand gestures from a camera, so that my ASL signs can be processed for translation.

#### Acceptance Criteria

1. WHEN the user starts a session, THE Gesture_Capture SHALL begin reading frames from the default camera device.
2. WHEN a frame is captured, THE Gesture_Capture SHALL extract hand and body landmark coordinates from the frame.
3. IF no camera device is available, THEN THE Translator SHALL display an error message indicating that no camera was detected.
4. IF the camera feed is interrupted during a session, THEN THE Translator SHALL display a warning and attempt to reconnect.
5. WHILE a session is active, THE Gesture_Capture SHALL process frames at a minimum rate of 15 frames per second.

---

### Requirement 2: ASL Sign Recognition

**User Story:** As a user, I want the system to recognize the ASL signs I make, so that my gestures are accurately mapped to English words.

#### Acceptance Criteria

1. WHEN landmark data is received, THE Sign_Recognizer SHALL classify the gesture and return a sign label with a Confidence_Score.
2. WHEN the Confidence_Score is below 0.6, THE Sign_Recognizer SHALL discard the result and not emit a sign label.
3. THE Sign_Recognizer SHALL support recognition of the 26 ASL fingerspelling letters (A–Z).
4. THE Sign_Recognizer SHALL support recognition of a minimum of 20 common ASL words (e.g., "hello", "thank you", "yes", "no", "please").
5. IF landmark data is malformed or incomplete, THEN THE Sign_Recognizer SHALL return an error code and log the malformed input.

---

### Requirement 3: English Text Output

**User Story:** As a user, I want recognized signs to be assembled into readable English text, so that I can communicate with non-signers.

#### Acceptance Criteria

1. WHEN a sign label is emitted, THE Text_Output SHALL append the corresponding English word or letter to the current output buffer.
2. WHEN the user performs the ASL "space" sign, THE Text_Output SHALL insert a word boundary in the output buffer.
3. WHEN the user performs the ASL "delete" sign, THE Text_Output SHALL remove the last appended word or letter from the output buffer.
4. THE Translator SHALL display the current output buffer as text on screen, updated within 300ms of each recognized sign.
5. WHEN the user clears the session, THE Text_Output SHALL reset the output buffer to empty.

---

### Requirement 4: Confidence and Feedback Display

**User Story:** As a user, I want to see visual feedback about recognition confidence, so that I know when the system is uncertain about my signs.

#### Acceptance Criteria

1. WHILE a session is active, THE Translator SHALL display the Confidence_Score of the most recently recognized sign.
2. WHEN the Confidence_Score is below 0.6, THE Translator SHALL display a visual indicator prompting the user to repeat the sign.
3. WHEN no hand is detected in the frame, THE Translator SHALL display a status message indicating that no hand is visible.

---

### Requirement 5: Session Management

**User Story:** As a user, I want to start, pause, and stop translation sessions, so that I have control over when the system is actively translating.

#### Acceptance Criteria

1. THE Translator SHALL provide controls to start, pause, and stop a session.
2. WHEN the user pauses a session, THE Gesture_Capture SHALL stop processing frames without clearing the output buffer.
3. WHEN the user resumes a paused session, THE Gesture_Capture SHALL resume processing frames from the current camera feed.
4. WHEN the user stops a session, THE Translator SHALL stop the camera feed and preserve the final output buffer for review.
5. WHILE a session is paused, THE Translator SHALL display a clear visual indicator that translation is paused.

---

### Requirement 6: Model Loading and Initialization

**User Story:** As a user, I want the system to load quickly and inform me of its status, so that I can start signing without long delays.

#### Acceptance Criteria

1. WHEN the application starts, THE Sign_Recognizer SHALL load the recognition model within 5 seconds on standard hardware.
2. WHILE the model is loading, THE Translator SHALL display a loading indicator to the user.
3. IF the model file is missing or corrupted, THEN THE Translator SHALL display a descriptive error message and prevent session start.
4. WHEN the model is loaded successfully, THE Translator SHALL display a ready status and enable session controls.
