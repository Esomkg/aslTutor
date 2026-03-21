import React from "react";
import { HandshapeGif } from "./HandshapeGif";

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  error: string | null;
  showNoHand: boolean;
  /** If provided, shows the target letter's handshape as a hint when no hand detected */
  hintLetter?: string | null;
}

export function CameraPreview({ videoRef, canvasRef, error, showNoHand, hintLetter }: CameraPreviewProps) {
  return (
    <div style={styles.container}>
      {error ? (
        <div style={styles.error}>{error}</div>
      ) : (
        <>
          <video ref={videoRef} autoPlay playsInline muted style={styles.video} aria-label="Live camera feed" />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          {showNoHand && (
            <div style={styles.overlay} role="status" aria-live="polite">
              {hintLetter ? (
                <div style={styles.hintWrap}>
                  <div style={styles.hintLabel}>No hand — show this:</div>
                  <HandshapeGif letter={hintLetter} size={72} animate={false} />
                  <div style={styles.hintLetter}>{hintLetter}</div>
                </div>
              ) : (
                <span style={styles.noHandText}>No hand visible</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "relative",
    width: "100%",
    maxWidth: 640,
    background: "#000",
    border: "4px solid #4a4a20",
    boxShadow: "inset -3px -3px 0 #1a1a08, 4px 4px 0 #1a1a08",
    aspectRatio: "4/3",
    overflow: "hidden",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    transform: "scaleX(-1)",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.65)",
  },
  hintWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  hintLabel: {
    fontSize: 8,
    color: "#a0a060",
    fontFamily: "'Press Start 2P', monospace",
  },
  hintLetter: {
    fontSize: 14,
    color: "#a0d040",
    fontFamily: "'Press Start 2P', monospace",
  },
  noHandText: {
    fontSize: 8,
    color: "#a0a060",
    fontFamily: "'Press Start 2P', monospace",
    background: "#2a2a14",
    border: "2px solid #5a5a20",
    padding: "4px 12px",
  },
  error: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "#e05050",
    padding: 16,
    textAlign: "center",
    fontSize: 8,
    fontFamily: "'Press Start 2P', monospace",
  },
};
