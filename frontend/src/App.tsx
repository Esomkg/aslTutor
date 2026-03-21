import React, { useCallback, useEffect, useRef, useState } from "react";
import { CameraPreview } from "./components/CameraPreview";
import { TranslationOutput } from "./components/TranslationOutput";
import { SessionControls } from "./components/SessionControls";
import { AchievementToast } from "./components/AchievementToast";
import { useTranslationSocket } from "./hooks/useTranslationSocket";
import { useWebcam, FRAME_INTERVAL_MS } from "./hooks/useWebcam";
import { addToSessionHistory, clearSessionHistory, getSessionHistory, SessionHistoryEntry, Achievement } from "./utils/storage";

const SESSION_ID = "main-" + Math.random().toString(36).slice(2);

const ASL_SIGNS: Record<string, { emoji: string; hint: string }> = {
  A: { emoji: "", hint: "Fist with thumb on side" },
  B: { emoji: "", hint: "Flat hand, fingers together" },
  C: { emoji: "", hint: "Curved hand like letter C" },
  D: { emoji: "", hint: "Index up, others curved" },
  E: { emoji: "", hint: "Fingers bent, thumb tucked" },
  F: { emoji: "", hint: "OK sign" },
  G: { emoji: "", hint: "Index pointing sideways" },
  H: { emoji: "", hint: "Two fingers pointing sideways" },
  I: { emoji: "", hint: "Pinky up" },
  K: { emoji: "", hint: "Index & middle up, thumb out" },
  L: { emoji: "", hint: "L-shape with index & thumb" },
  M: { emoji: "", hint: "Three fingers over thumb" },
  N: { emoji: "", hint: "Two fingers over thumb" },
  O: { emoji: "", hint: "Fingers form an O" },
  P: { emoji: "", hint: "K shape pointing down" },
  Q: { emoji: "", hint: "G shape pointing down" },
  R: { emoji: "", hint: "Crossed index & middle" },
  S: { emoji: "", hint: "Fist with thumb over fingers" },
  T: { emoji: "", hint: "Thumb between index & middle" },
  U: { emoji: "", hint: "Index & middle together up" },
  V: { emoji: "", hint: "V for victory" },
  W: { emoji: "", hint: "Three fingers spread up" },
  X: { emoji: "", hint: "Index finger hooked" },
  Y: { emoji: "", hint: "Thumb & pinky out" },
};

export default function App() {
  const { videoRef, canvasRef, error: camError, isReady, captureFrame } = useWebcam();
  const { connectionStatus, sessionStatus, latestResult, sendFrame, startSession, pauseSession, resumeSession, stopSession } =
    useTranslationSocket(SESSION_ID);

  const [history, setHistory] = useState<SessionHistoryEntry[]>([]);
  const [pendingAchievement, setPendingAchievement] = useState<Achievement | null>(null);
  const prevSignRef = useRef<string | null>(null);
  const frameTimerRef = useRef<number>(0);

  // Load history on mount
  useEffect(() => {
    setHistory(getSessionHistory());
  }, []);

  // Frame capture loop
  useEffect(() => {
    if (sessionStatus !== "active") return;
    const id = window.setInterval(() => {
      const frame = captureFrame();
      if (frame) sendFrame(frame);
    }, FRAME_INTERVAL_MS);
    frameTimerRef.current = id;
    return () => clearInterval(id);
  }, [sessionStatus, captureFrame, sendFrame]);

  // Track sign changes and append to history
  useEffect(() => {
    const sign = latestResult?.signLabel ?? null;
    if (sign && sign !== prevSignRef.current && sessionStatus === "active") {
      prevSignRef.current = sign;
      addToSessionHistory(sign);
      setHistory(getSessionHistory());
    }
  }, [latestResult, sessionStatus]);

  const handleClearHistory = useCallback(() => {
    clearSessionHistory();
    setHistory([]);
  }, []);

  const handleExportSession = useCallback(() => {
    const lines = history.map((e) => {
      const d = new Date(e.timestamp);
      return `[${d.toLocaleTimeString()}] ${e.sign}`;
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asl-session-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [history]);

  const currentSign = latestResult?.signLabel ?? null;
  const guideInfo = currentSign ? ASL_SIGNS[currentSign] : null;
  const showNoHand = sessionStatus === "active" && latestResult?.status === "no_hand";

  return (
    <div style={S.page}>
      <AchievementToast achievement={pendingAchievement} onDone={() => setPendingAchievement(null)} />
      <div style={S.layout}>
        <div style={S.leftCol}>
          <div style={S.card}>
            <div style={S.cardTitle}>Camera Feed</div>
            <CameraPreview videoRef={videoRef} canvasRef={canvasRef} error={camError} showNoHand={showNoHand} />
          </div>
          <div style={S.card}>
            <SessionControls
              sessionStatus={sessionStatus}
              connectionStatus={connectionStatus}
              cameraReady={isReady}
              onStart={startSession}
              onPause={pauseSession}
              onResume={resumeSession}
              onStop={stopSession}
            />
          </div>
        </div>
        <div style={S.rightCol}>
          <div style={S.card}>
            <div style={S.cardTitle}>Translation</div>
            <TranslationOutput result={latestResult} />
          </div>
          {guideInfo && (
            <div style={S.guideCard}>
              <span style={S.guideEmoji}>{guideInfo.emoji}</span>
              <div style={S.guideText}>
                <div style={S.guideLetter}>Letter {currentSign}</div>
                <div style={S.guideHint}>{guideInfo.hint}</div>
              </div>
            </div>
          )}
          <div style={S.card}>
            <div style={S.historyHeader}>
              <div style={S.cardTitle}>Session Log</div>
              <div style={S.historyActions}>
                <button className="mc-btn" style={S.histBtn} onClick={handleExportSession} disabled={history.length === 0}>Export</button>
                <button className="mc-btn" style={{ ...S.histBtn, ...S.histBtnRed }} onClick={handleClearHistory} disabled={history.length === 0}>Clear</button>
              </div>
            </div>
            <div style={S.historyList}>
              {history.length === 0 ? (
                <div style={S.histEmpty}>No signs detected yet</div>
              ) : (
                [...history].reverse().map((e, i) => (
                  <div key={i} style={S.histItem}>
                    <span style={S.histSign}>{e.sign}</span>
                    <span style={S.histTime}>{new Date(e.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#1a1a08", padding: "20px 16px", fontFamily: "'Press Start 2P', monospace", color: "#f0f0e0" },
  layout: { display: "flex", gap: 16, maxWidth: 1100, margin: "0 auto", flexWrap: "wrap" as const },
  leftCol: { flex: "1 1 340px", display: "flex", flexDirection: "column", gap: 12 },
  rightCol: { flex: "1 1 380px", display: "flex", flexDirection: "column", gap: 12 },
  card: { background: "#2a2a14", border: "3px solid #4a4a20", boxShadow: "inset -3px -3px 0 #1a1a08, 4px 4px 0 #0a0a04", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 },
  cardTitle: { fontSize: 9, color: "#a0d040", letterSpacing: 2, marginBottom: 4 },
  guideCard: { background: "#1e2e08", border: "3px solid #6a8a20", boxShadow: "inset -3px -3px 0 #0e1a04", padding: "12px 14px", display: "flex", alignItems: "center", gap: 14 },
  guideEmoji: { fontSize: 36, flexShrink: 0 },
  guideText: { display: "flex", flexDirection: "column", gap: 6 },
  guideLetter: { fontSize: 10, color: "#a0d040" },
  guideHint: { fontSize: 8, color: "#808060", lineHeight: 1.8 },
  historyHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  historyActions: { display: "flex", gap: 6 },
  histBtn: { fontSize: 7, padding: "5px 10px", background: "#3a3a1a", color: "#a0a060", border: "2px solid #5a5a28", boxShadow: "inset -2px -2px 0 #1a1a08" },
  histBtnRed: { background: "#3a1a1a", color: "#e08080", border: "2px solid #7a3030" },
  historyList: { maxHeight: 200, overflowY: "auto" as const, display: "flex", flexDirection: "column", gap: 4 },
  histEmpty: { fontSize: 8, color: "#505040", padding: "8px 0" },
  histItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", background: "#1a1a08", border: "1px solid #3a3a18" },
  histSign: { fontSize: 10, color: "#a0d040", fontWeight: "bold" },
  histTime: { fontSize: 7, color: "#505040" },
};
