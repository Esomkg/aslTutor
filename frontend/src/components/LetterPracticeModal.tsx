import { useEffect, useRef, useState, useCallback } from "react";

const REQUIRED = 5;
const WS_BASE = "ws://localhost:8000";

interface Props {
  letter: string;
  description: string;
  emoji: string;
  onClose: () => void;
  onComplete?: (letter: string) => void;
}

export function LetterPracticeModal({ letter, description, emoji, onClose, onComplete }: Props): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sendingRef = useRef(false);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errMsg, setErrMsg] = useState("");
  const [hits, setHits] = useState(0);
  const [done, setDone] = useState(false);
  const [detected, setDetected] = useState<string | null>(null);
  const hitsRef = useRef(0);

  const reset = useCallback(() => {
    hitsRef.current = 0;
    setHits(0);
    setDone(false);
    setDetected(null);
  }, []);

  useEffect(() => {
    let dead = false;
    const sessionId = "practice-" + Math.random().toString(36).slice(2);
    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
        if (dead) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        const ws = new WebSocket(WS_BASE + "/ws/practice/" + sessionId);
        wsRef.current = ws;
        ws.onopen = () => { if (!dead) { setStatus("ready"); startLoop(); } };
        ws.onmessage = (evt) => {
          sendingRef.current = false;
          if (dead) return;
          try {
            const data = JSON.parse(evt.data);
            const dl: string | null = data.letter ?? null;
            setDetected(dl);
            if (dl === letter) {
              hitsRef.current = Math.min(hitsRef.current + 1, REQUIRED);
              setHits(hitsRef.current);
              if (hitsRef.current >= REQUIRED) setDone(true);
            } else {
              hitsRef.current = Math.max(0, hitsRef.current - 1);
              setHits(hitsRef.current);
            }
          } catch (_) {}
        };
        ws.onerror = () => { if (!dead) { setErrMsg("Backend connection failed."); setStatus("error"); } };
        ws.onclose = () => { if (!dead && status !== "error") setStatus("error"); };
      } catch (e: unknown) {
        if (!dead) { setErrMsg(e instanceof Error ? e.message : "Camera failed"); setStatus("error"); }
      }
    }
    init();
    return () => {
      dead = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      wsRef.current?.close();
    };
  }, [letter]);

  function startLoop() {
    function loop() {
      const vid = videoRef.current; const cvs = canvasRef.current;
      if (!vid || !cvs || vid.readyState < 2) { rafRef.current = requestAnimationFrame(loop); return; }
      const ctx = cvs.getContext("2d"); if (!ctx) return;
      cvs.width = vid.videoWidth; cvs.height = vid.videoHeight;
      ctx.save(); ctx.translate(cvs.width, 0); ctx.scale(-1, 1); ctx.drawImage(vid, 0, 0); ctx.restore();
      if (!sendingRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
        sendingRef.current = true;
        cvs.toBlob((blob) => {
          if (!blob || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) { sendingRef.current = false; return; }
          const reader = new FileReader();
          reader.onload = () => { const b64 = (reader.result as string).split(",")[1]; wsRef.current!.send(JSON.stringify({ type: "frame", frameData: b64 })); };
          reader.readAsDataURL(blob);
        }, "image/jpeg", 0.7);
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
  }

  const pct = (hits / REQUIRED) * 100;

  return (
    <div style={S.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={S.modal}>
        <div style={S.header}>
          <span>{emoji} Letter {letter}</span>
          <button style={S.closeBtn} onClick={onClose}>X</button>
        </div>
        <p style={S.desc}>{description}</p>
        <div style={S.videoWrap}>
          <video ref={videoRef} style={S.video} muted playsInline />
          <canvas ref={canvasRef} style={S.canvas} />
          {status === "loading" && <div style={S.overlayMsg}><div style={S.spinner} /><span>Loading camera...</span></div>}
          {status === "error" && <div style={S.overlayMsg}><span style={{ color: "#f87171", textAlign: "center", padding: "0 16px" }}>{errMsg}</span></div>}
          {done && (
            <div style={S.successOverlay}>
              <div style={S.successBox}>
                <div style={{ fontSize: 40 }}></div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#4ade80" }}>Great job!</div>
                <div style={{ color: "#ccc", fontSize: 13 }}>You signed letter {letter} correctly!</div>
                <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
                  <button style={S.tryAgain} onClick={reset}>Try Again</button>
                  <button style={S.doneBtn} onClick={() => { onComplete?.(letter); onClose(); }}>Done </button>
                </div>
              </div>
            </div>
          )}
          {status === "ready" && !done && detected && <div style={S.detectedBadge}>Seeing: <strong>{detected}</strong></div>}
        </div>
        {status === "ready" && !done && (
          <div style={S.progressWrap}>
            <div style={S.progressLabel}>Hold the sign for letter {letter}... {hits}/{REQUIRED}</div>
            <div style={S.track}><div style={{ ...S.fill, width: pct + "%" }} /></div>
          </div>
        )}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  modal: { background: "#13131f", border: "1px solid rgba(126,200,227,0.25)", borderRadius: 16, padding: "20px 20px 24px", width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: 12 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 700, fontSize: 18, color: "#7ec8e3" },
  closeBtn: { background: "transparent", border: "none", color: "#888", fontSize: 18, cursor: "pointer" },
  desc: { margin: 0, color: "#bbb", fontSize: 14, lineHeight: 1.6 },
  videoWrap: { position: "relative", width: "100%", aspectRatio: "4/3", background: "#000", borderRadius: 10, overflow: "hidden" },
  video: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0 },
  canvas: { position: "absolute", inset: 0, width: "100%", height: "100%" },
  overlayMsg: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#aaa", fontSize: 14, background: "rgba(0,0,0,0.6)" },
  spinner: { width: 32, height: 32, border: "3px solid rgba(255,255,255,0.1)", borderTop: "3px solid #7ec8e3", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  successOverlay: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center" },
  successBox: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center", padding: "0 20px" },
  tryAgain: { background: "rgba(126,200,227,0.15)", border: "1px solid #7ec8e3", color: "#7ec8e3", borderRadius: 8, padding: "10px 22px", fontSize: 14, cursor: "pointer" },
  doneBtn: { background: "rgba(74,222,128,0.25)", border: "2px solid #4ade80", color: "#4ade80", borderRadius: 8, padding: "10px 22px", fontSize: 14, cursor: "pointer", fontWeight: 700 },
  progressWrap: { display: "flex", flexDirection: "column", gap: 6 },
  progressLabel: { fontSize: 13, color: "#aaa" },
  track: { height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", background: "linear-gradient(90deg, #7ec8e3, #a78bfa)", borderRadius: 4, transition: "width 0.2s ease" },
  detectedBadge: { position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.7)", color: "#7ec8e3", borderRadius: 8, padding: "4px 14px", fontSize: 14, whiteSpace: "nowrap" },
};
