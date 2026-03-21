import React from "react";

type SessionStatus = "idle" | "active" | "paused" | "stopped";
type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

interface SessionControlsProps {
  sessionStatus: SessionStatus;
  connectionStatus: ConnectionStatus;
  cameraReady: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function SessionControls({ sessionStatus, connectionStatus, cameraReady, onStart, onPause, onResume, onStop }: SessionControlsProps) {
  const isConnecting = connectionStatus === "connecting";
  const canStart = cameraReady && (sessionStatus === "idle" || sessionStatus === "stopped");
  const canPause = sessionStatus === "active";
  const canResume = sessionStatus === "paused";
  const canStop = sessionStatus === "active" || sessionStatus === "paused";

  return (
    <div style={styles.container}>
      <div style={styles.statusRow}>
        <StatusBadge sessionStatus={sessionStatus} connectionStatus={connectionStatus} />
      </div>
      <div style={styles.buttonRow}>
        <button className="mc-btn" style={{ ...styles.btn, ...styles.start }} onClick={onStart} disabled={!canStart || isConnecting} aria-label="Start translation session">
          {isConnecting ? "Connecting..." : "Start"}
        </button>
        <button className="mc-btn" style={{ ...styles.btn, ...styles.pause }} onClick={canResume ? onResume : onPause} disabled={!canPause && !canResume} aria-label={canResume ? "Resume translation" : "Pause translation"}>
          {canResume ? "Resume" : "Pause"}
        </button>
        <button className="mc-btn" style={{ ...styles.btn, ...styles.stop }} onClick={onStop} disabled={!canStop} aria-label="Stop translation session">
          Stop
        </button>
      </div>
      {!cameraReady && <p style={styles.hint}>Waiting for camera...</p>}
    </div>
  );
}

function StatusBadge({ sessionStatus, connectionStatus }: { sessionStatus: SessionStatus; connectionStatus: ConnectionStatus }) {
  const label =
    connectionStatus === "connecting" ? "Connecting..." :
    connectionStatus === "error"      ? "Connection error" :
    sessionStatus === "active"        ? "Translating" :
    sessionStatus === "paused"        ? "Paused" :
    sessionStatus === "stopped"       ? "Stopped" : "Ready";

  const color =
    sessionStatus === "active"   ? "#a0d040" :
    sessionStatus === "paused"   ? "#f0c030" :
    connectionStatus === "error" ? "#e05050" : "#606040";

  return (
    <span style={{ ...styles.badge, borderColor: color, color }} role="status" aria-live="polite">
      <span style={{ ...styles.dot, background: color }} />
      {label}
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { width: "100%", maxWidth: 640, display: "flex", flexDirection: "column", gap: 10 },
  statusRow: { display: "flex", alignItems: "center" },
  badge: {
    display: "inline-flex", alignItems: "center", gap: 6,
    border: "2px solid", padding: "4px 10px", fontSize: 8,
  },
  dot: { width: 8, height: 8, display: "inline-block" },
  buttonRow: { display: "flex", gap: 8 },
  btn: { flex: 1, padding: "10px 0", fontSize: 8, letterSpacing: 1, cursor: "pointer" },
  start: {
    background: "#5a7a1a", color: "#f0ffe0",
    border: "3px solid #8ab828",
    boxShadow: "inset -3px -3px 0 #3a5010, inset 3px 3px 0 rgba(255,255,255,0.15)",
  },
  pause: {
    background: "#7a6010", color: "#fff8d0",
    border: "3px solid #c8a030",
    boxShadow: "inset -3px -3px 0 #3a2a08, inset 3px 3px 0 rgba(255,255,255,0.15)",
  },
  stop: {
    background: "#7a1a1a", color: "#ffe0e0",
    border: "3px solid #c84a4a",
    boxShadow: "inset -3px -3px 0 #3a0a0a, inset 3px 3px 0 rgba(255,255,255,0.15)",
  },
  hint: { fontSize: 8, color: "#606040", margin: 0 },
};
