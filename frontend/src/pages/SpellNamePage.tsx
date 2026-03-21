import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const WS_BASE = "ws://localhost:8000";
const REQUIRED_HITS = 4;
const VALID_LETTERS = new Set("ABCDEFGHIKLMNOPQRSTUVWXY");

type Phase = "input" | "playing" | "complete";

export default function SpellNamePage() {
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("input");
  const [nameInput, setNameInput] = useState("");
  const [letters, setLetters] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [hits, setHits] = useState(0);
  const [detected, setDetected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"correct" | null>(null);
  const [camReady, setCamReady] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sendingRef = useRef(false);
  const feedbackRef = useRef(false);
  const hitsRef = useRef(0);
  const idxRef = useRef(0);
  const lettersRef = useRef<string[]>([]);

  useEffect(() => {
    if (phase !== "playing") return;
    let dead = false;
    const sessionId = "spell-" + Math.random().toString(36).slice(2);

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
        if (dead) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }

        const ws = new WebSocket(`${WS_BASE}/ws/practice/${sessionId}`);
        wsRef.current = ws;
        ws.onopen = () => { if (!dead) setCamReady(true); };
        ws.onmessage = (evt) => {
          sendingRef.current = false;
          if (dead || feedbackRef.current) return;
          try {
            const data = JSON.parse(evt.data);
            const letter: string | null = data.letter ?? null;
            setDetected(letter);
            const target = lettersRef.current[idxRef.current];
            if (letter && letter === target) {
              hitsRef.current = Math.min(hitsRef.current + 1, REQUIRED_HITS);
              setHits(hitsRef.current);
              if (hitsRef.current >= REQUIRED_HITS) handleLetterSuccess();
            } else {
              hitsRef.current = Math.max(0, hitsRef.current - 1);
              setHits(hitsRef.current);
            }
          } catch (_) {}
        };
        ws.onerror = () => { if (!dead) setCamError("Backend connection failed."); };
        startLoop();
      } catch (e: unknown) {
        if (!dead) setCamError(e instanceof Error ? e.message : "Camera failed");
      }
    })();

    return () => {
      dead = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      wsRef.current?.close();
    };
  }, [phase]);

  function startLoop() {
    function loop() {
      const vid = videoRef.current, cvs = canvasRef.current;
      if (!vid || !cvs || vid.readyState < 2) { rafRef.current = requestAnimationFrame(loop); return; }
      const ctx = cvs.getContext("2d");
      if (!ctx) return;
      cvs.width = vid.videoWidth; cvs.height = vid.videoHeight;
      ctx.save(); ctx.translate(cvs.width, 0); ctx.scale(-1, 1); ctx.drawImage(vid, 0, 0); ctx.restore();
      if (!sendingRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
        sendingRef.current = true;
        cvs.toBlob(blob => {
          if (!blob || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) { sendingRef.current = false; return; }
          const reader = new FileReader();
          reader.onload = () => {
            const b64 = (reader.result as string).split(",")[1];
            wsRef.current!.send(JSON.stringify({ type: "frame", frameData: b64 }));
          };
          reader.readAsDataURL(blob);
        }, "image/jpeg", 0.65);
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
  }

  function handleLetterSuccess() {
    if (feedbackRef.current) return;
    feedbackRef.current = true;
    const nextIdx = idxRef.current + 1;
    setFeedback("correct");
    hitsRef.current = 0;
    setHits(0);
    setTimeout(() => {
      setFeedback(null);
      feedbackRef.current = false;
      if (nextIdx >= lettersRef.current.length) {
        setPhase("complete");
      } else {
        idxRef.current = nextIdx;
        setCurrentIdx(nextIdx);
      }
    }, 900);
  }

  function handleStart() {
    const valid = nameInput.toUpperCase().replace(/[^A-Z]/g, "").split("").filter(l => VALID_LETTERS.has(l));
    if (valid.length === 0) return;
    lettersRef.current = valid;
    idxRef.current = 0;
    hitsRef.current = 0;
    feedbackRef.current = false;
    setLetters(valid);
    setCurrentIdx(0);
    setHits(0);
    setDetected(null);
    setFeedback(null);
    setCamReady(false);
    setCamError(null);
    setPhase("playing");
  }

  function handleReset() {
    setPhase("input");
    setNameInput("");
    setLetters([]);
    setCurrentIdx(0);
    setHits(0);
    setDetected(null);
    setFeedback(null);
    setCamReady(false);
    setCamError(null);
  }

  function handleTryAgain() {
    idxRef.current = 0;
    hitsRef.current = 0;
    feedbackRef.current = false;
    setCurrentIdx(0);
    setHits(0);
    setDetected(null);
    setFeedback(null);
    setCamReady(false);
    setPhase("playing");
  }

  const currentLetter = letters[currentIdx] ?? "";
  const hitsPct = (hits / REQUIRED_HITS) * 100;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => navigate("/")}>Back</button>
        <div style={S.headerTitle}>Spell Your Name</div>
      </div>

      {phase === "input" && (
        <div style={S.inputPanel}>
          <div style={S.inputDesc}>Type your name and sign each letter in sequence using ASL fingerspelling.</div>
          <input
            style={S.nameInput}
            type="text"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleStart()}
            placeholder="Enter your name..."
            maxLength={20}
            autoFocus
          />
          {nameInput && (
            <div style={S.preview}>
              {nameInput.toUpperCase().replace(/[^A-Z]/g, "").split("").map((l, i) => (
                <span key={i} style={{ ...S.previewLetter, opacity: VALID_LETTERS.has(l) ? 1 : 0.3 }}>{l}</span>
              ))}
            </div>
          )}
          <button className="mc-btn" style={S.startBtn} onClick={handleStart} disabled={nameInput.replace(/[^A-Za-z]/g, "").length === 0}>
            Start Signing
          </button>
          <div style={S.note}>Note: J and Z require motion and are not supported.</div>
        </div>
      )}

      {phase === "playing" && (
        <>
          <div style={S.sequenceRow}>
            {letters.map((l, i) => (
              <span key={i} style={{
                ...S.seqLetter,
                ...(i < currentIdx ? S.seqDone : {}),
                ...(i === currentIdx ? S.seqActive : {}),
              }}>
                {l}
                {i < currentIdx && <span style={S.tick}>v</span>}
              </span>
            ))}
          </div>

          <div style={S.cameraWrap}>
            <video ref={videoRef} style={S.video} muted playsInline />
            <canvas ref={canvasRef} style={S.canvas} />
            {!camReady && !camError && (
              <div style={S.camOverlay}>
                <div style={S.spinner} />
                <span style={{ fontSize: 8 }}>Starting camera...</span>
              </div>
            )}
            {camError && (
              <div style={S.camOverlay}>
                <span style={{ color: "#e05050", fontSize: 8, textAlign: "center", padding: "0 16px" }}>{camError}</span>
              </div>
            )}
            {feedback === "correct" && (
              <div style={{ ...S.camOverlay, background: "rgba(74,180,40,0.3)" }}>
                <span style={{ fontSize: 56 }}>OK</span>
              </div>
            )}
            {camReady && !feedback && detected && (
              <div style={S.detectedBadge}>Seeing: {detected}</div>
            )}
          </div>

          <div style={S.promptCard}>
            <div style={S.promptLabel}>Sign this letter:</div>
            <div style={S.bigLetter}>{currentLetter}</div>
            <div style={S.progressWrap}>
              <div style={S.progressLabel}>Hold it... {hits}/{REQUIRED_HITS}</div>
              <div style={S.track}><div style={{ ...S.fill, width: hitsPct + "%" }} /></div>
            </div>
            <div style={S.stepCount}>{currentIdx + 1} / {letters.length}</div>
          </div>

          <button style={S.resetBtn} onClick={handleReset}>Start Over</button>
        </>
      )}

      {phase === "complete" && (
        <div style={S.completePanel}>
          <div style={{ fontSize: 56 }}>!</div>
          <div style={S.completeTitle}>You spelled it!</div>
          <div style={S.completeName}>
            {letters.map((l, i) => (
              <span key={i} style={S.completeLetter}>{l}</span>
            ))}
          </div>
          <div style={S.completeSubtitle}>Great job fingerspelling your name in ASL!</div>
          <div style={S.completeBtns}>
            <button className="mc-btn" style={S.tryAgainBtn} onClick={handleTryAgain}>Try Again</button>
            <button className="mc-btn" style={S.newNameBtn} onClick={handleReset}>New Name</button>
          </div>
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#1a1a08", fontFamily: "'Press Start 2P', monospace", color: "#f0f0e0", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 16px 32px" },
  header: { width: "100%", maxWidth: 640, display: "flex", alignItems: "center", gap: 12, padding: "14px 0" },
  backBtn: { background: "#1a1a08", color: "#808060", border: "2px solid #3a3a18", padding: "6px 10px", fontSize: 7, fontFamily: "'Press Start 2P', monospace", cursor: "pointer" },
  headerTitle: { fontSize: 11, color: "#a0d040" },
  inputPanel: { width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", alignItems: "center", gap: 20, marginTop: 40 },
  inputDesc: { fontSize: 8, color: "#808060", textAlign: "center", lineHeight: 2 },
  nameInput: { width: "100%", background: "#1a1a08", border: "3px solid #4a4a20", boxShadow: "inset 2px 2px 0 #0a0a04", color: "#f0f0e0", padding: "14px 16px", fontSize: 18, fontFamily: "'Press Start 2P', monospace", outline: "none", textAlign: "center", boxSizing: "border-box", letterSpacing: 4 },
  preview: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  previewLetter: { background: "#2a2a14", border: "2px solid #4a4a20", padding: "8px 12px", fontSize: 14, color: "#a0d040", minWidth: 36, textAlign: "center" },
  startBtn: { padding: "14px 32px", fontSize: 10, background: "#5a7a1a", color: "#f0ffe0", border: "3px solid #8ab828", boxShadow: "inset -3px -3px 0 #3a5010", cursor: "pointer" },
  note: { fontSize: 7, color: "#505040", textAlign: "center", lineHeight: 2 },
  sequenceRow: { display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginTop: 20, marginBottom: 12, maxWidth: 600 },
  seqLetter: { position: "relative", padding: "10px 14px", fontSize: 16, border: "3px solid #3a3a18", background: "#1a1a08", color: "#505040", minWidth: 40, textAlign: "center" },
  seqDone: { background: "#1e2e08", border: "3px solid #5a8a1a", color: "#a0d040" },
  seqActive: { background: "#2a3a0a", border: "3px solid #a0d040", color: "#f0ffe0", boxShadow: "0 0 0 2px #a0d040" },
  tick: { position: "absolute", top: -8, right: -6, fontSize: 9, color: "#a0d040", background: "#1a1a08", padding: "1px 2px" },
  cameraWrap: { position: "relative", width: "100%", maxWidth: 480, aspectRatio: "4/3", background: "#000", border: "3px solid #4a4a20", boxShadow: "inset -3px -3px 0 #1a1a08, 4px 4px 0 #0a0a04", overflow: "hidden", marginBottom: 12 },
  video: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" },
  canvas: { position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0 },
  camOverlay: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "rgba(0,0,0,0.6)", color: "#f0f0e0" },
  spinner: { width: 32, height: 32, border: "3px solid rgba(255,255,255,0.1)", borderTop: "3px solid #a0d040", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  detectedBadge: { position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.75)", border: "2px solid #4a4a20", color: "#a0d040", padding: "4px 14px", fontSize: 8, whiteSpace: "nowrap" },
  promptCard: { width: "100%", maxWidth: 480, background: "#2a2a14", border: "3px solid #4a4a20", boxShadow: "inset -3px -3px 0 #1a1a08", padding: "16px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 },
  promptLabel: { fontSize: 8, color: "#808060" },
  bigLetter: { fontSize: 64, color: "#a0d040", textShadow: "4px 4px 0 #3a5010", lineHeight: 1 },
  progressWrap: { width: "100%", display: "flex", flexDirection: "column", gap: 6 },
  progressLabel: { fontSize: 7, color: "#808060", textAlign: "center" },
  track: { height: 10, background: "#1a1a08", border: "2px solid #3a3a18", overflow: "hidden" },
  fill: { height: "100%", background: "#5a8a1a", transition: "width 0.15s ease" },
  stepCount: { fontSize: 7, color: "#505040" },
  resetBtn: { marginTop: 12, background: "transparent", color: "#505040", border: "none", fontSize: 7, fontFamily: "'Press Start 2P', monospace", cursor: "pointer", textDecoration: "underline" },
  completePanel: { display: "flex", flexDirection: "column", alignItems: "center", gap: 20, marginTop: 48, maxWidth: 480, width: "100%", textAlign: "center" },
  completeTitle: { fontSize: 16, color: "#a0d040", textShadow: "3px 3px 0 #3a5010" },
  completeName: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  completeLetter: { background: "#2a3a0a", border: "3px solid #8ab828", boxShadow: "inset -2px -2px 0 #1a2a04", padding: "10px 14px", fontSize: 20, color: "#a0d040", minWidth: 44, textAlign: "center" },
  completeSubtitle: { fontSize: 8, color: "#808060", lineHeight: 2 },
  completeBtns: { display: "flex", gap: 12 },
  tryAgainBtn: { padding: "12px 20px", fontSize: 8, background: "#5a7a1a", color: "#f0ffe0", border: "3px solid #8ab828", boxShadow: "inset -3px -3px 0 #3a5010", cursor: "pointer" },
  newNameBtn: { padding: "12px 20px", fontSize: 8, background: "#3a3a1a", color: "#a0a060", border: "3px solid #5a5a28", boxShadow: "inset -3px -3px 0 #1a1a08", cursor: "pointer" },
};
