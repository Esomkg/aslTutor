// Message sent to backend
export interface FrameMessage {
  type: "frame";
  sessionId: string;
  frameData: string; // base64-encoded JPEG
  timestamp: number;
}

// Message received from backend
export interface TranslationResult {
  type: "result";
  signLabel: string | null;
  confidence: number;
  englishText: string;
  status: "active" | "paused" | "no_hand" | "low_confidence" | "error";
}

export interface LandmarkFrame {
  coords: number[]; // length 63
  timestamp: number;
}

export interface SessionState {
  sessionId: string;
  status: "idle" | "active" | "paused" | "stopped";
  englishText: string;
  lastConfidence: number;
}
