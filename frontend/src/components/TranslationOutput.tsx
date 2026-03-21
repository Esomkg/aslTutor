import React, { useEffect, useRef, useState } from "react";
import { TranslationResult } from "../types";

interface TranslationOutputProps {
  result: TranslationResult | null;
}

const MAX_HISTORY = 20;

export function TranslationOutput({ result }: TranslationOutputProps) {
  const confidence = result?.confidence ?? 0;
  const isLowConfidence = confidence > 0 && confidence < 0.6;
  const englishText = result?.englishText ?? "";
  const signLabel = result?.signLabel;

  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [history, setHistory] = useState<number[]>([]);
  const prevTextRef = useRef("");

  useEffect(() => {
    if (result?.status === "active" && confidence > 0) {
      setHistory((h) => [...h.slice(-(MAX_HISTORY - 1)), confidence]);
    }
  }, [result, confidence]);

  useEffect(() => {
    if (englishText && englishText !== prevTextRef.current) {
      prevTextRef.current = englishText;
    }
  }, [englishText]);

  function handleCopy() {
    if (!englishText) return;
    navigator.clipboard.writeText(englishText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleSpeak() {
    if (!englishText || !window.speechSynthesis) return;
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const utt = new SpeechSynthesisUtterance(englishText);
    utt.rate = 0.9;
    utt.onstart = () => setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
  }

  return (
    <div style={styles.container}>
      <div style={styles.textBox} aria-live="polite" aria-label="Translation output">
        {englishText || <span style={styles.placeholder}>Translation will appear here...</span>}
      </div>
      <div style={styles.actionRow}>
        <button className="mc-btn" style={{ ...styles.actionBtn, ...(copied ? styles.actionBtnActive : {}) }} onClick={handleCopy} disabled={!englishText} title="Copy to clipboard" aria-label="Copy translation">
          {copied ? "Copied!" : "Copy"}
        </button>
        <button className="mc-btn" style={{ ...styles.actionBtn, ...(speaking ? styles.actionBtnActive : {}) }} onClick={handleSpeak} disabled={!englishText || !window.speechSynthesis} title="Read aloud" aria-label="Read translation aloud">
          {speaking ? "Stop" : "Speak"}
        </button>
      </div>
      {signLabel && (
        <div style={styles.signRow}>
          <span style={styles.signLabel}>Detected: {signLabel}</span>
          <span style={styles.confidence}>{Math.round(confidence * 100)}%</span>
        </div>
      )}
      {isLowConfidence && (
        <div style={styles.lowConfidence} role="alert">
          Low confidence — try repeating the sign
        </div>
      )}
      {history.length > 1 && (
        <div style={styles.sparkWrap} aria-label="Confidence history">
          <span style={styles.sparkLabel}>Confidence</span>
          <Sparkline values={history} />
        </div>
      )}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const W = 200, H = 32, pad = 2;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2);
    const y = H - pad - v * (H - pad * 2);
    return `${x},${y}`;
  });
  const last = values[values.length - 1];
  const lastPt = pts[pts.length - 1].split(",");
  const dotColor = last > 0.7 ? "#a0d040" : last > 0.4 ? "#f0c030" : "#e05050";
  return (
    <svg width={W} height={H} style={{ display: "block", imageRendering: "pixelated" }}>
      <polyline points={pts.join(" ")} fill="none" stroke="rgba(160,208,64,0.5)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastPt[0]} cy={lastPt[1]} r={3} fill={dotColor} />
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { width: "100%", maxWidth: 640, display: "flex", flexDirection: "column", gap: 8 },
  textBox: {
    minHeight: 72,
    background: "#2a2a14",
    border: "3px solid #4a4a20",
    boxShadow: "inset -2px -2px 0 #1a1a08",
    padding: "12px 14px",
    fontSize: 16,
    color: "#f0f0e0",
    wordBreak: "break-word",
    fontFamily: "'Press Start 2P', monospace",
  },
  placeholder: { color: "#505040", fontSize: 10 },
  actionRow: { display: "flex", gap: 8 },
  actionBtn: {
    background: "#3a3a1a", color: "#a0a060",
    border: "3px solid #5a5a28",
    boxShadow: "inset -2px -2px 0 #1a1a08",
    padding: "6px 14px", fontSize: 8, letterSpacing: 1,
  },
  actionBtnActive: {
    background: "#2a3a0a", color: "#a0d040",
    border: "3px solid #8ab828",
  },
  signRow: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 8, color: "#808060", padding: "0 2px" },
  signLabel: { fontStyle: "italic" },
  confidence: { color: "#a0d040" },
  lowConfidence: {
    background: "#3a2a00", border: "2px solid #c08000",
    color: "#f0c030", padding: "6px 10px", fontSize: 8,
  },
  sparkWrap: { display: "flex", alignItems: "center", gap: 10, padding: "2px 0" },
  sparkLabel: { fontSize: 7, color: "#505040", whiteSpace: "nowrap" },
};
