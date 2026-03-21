/**
 * 3-step onboarding modal for first-time users.
 * Shows once, then sets localStorage flag.
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { playClick } from "../utils/sounds";

const ONBOARD_KEY = "asl_onboarded";

export function useOnboarding() {
  const seen = localStorage.getItem(ONBOARD_KEY) === "1";
  const [show, setShow] = React.useState(!seen);
  function dismiss() {
    localStorage.setItem(ONBOARD_KEY, "1");
    setShow(false);
  }
  return { show, dismiss };
}

const STEPS = [
  {
    icon: "🤟",
    title: "Welcome to SignQuest",
    body: "Learn American Sign Language fingerspelling through real-time webcam recognition, games, and an AI tutor — all in one place.",
    cta: "Next →",
  },
  {
    icon: "📷",
    title: "How it works",
    body: "Point your webcam at your hand. The app recognises ASL letters in real time. Practice each letter, play Sign Sprint, or spell your name.",
    cta: "Next →",
  },
  {
    icon: "🎮",
    title: "Pick your mode",
    body: "Start with Learn to study the alphabet, jump into Sign Sprint to test your speed, or ask the AI Tutor for personalised tips.",
    cta: "Let's go!",
  },
];

interface Props {
  onDismiss: () => void;
}

export function OnboardingModal({ onDismiss }: Props) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function next() {
    playClick();
    if (isLast) {
      onDismiss();
    } else {
      setStep(s => s + 1);
    }
  }

  function skip() {
    playClick();
    onDismiss();
  }

  return (
    <div style={S.backdrop}>
      <div style={S.modal}>
        {/* Step dots */}
        <div style={S.dots}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ ...S.dot, ...(i === step ? S.dotActive : {}) }} />
          ))}
        </div>

        <div style={S.icon}>{current.icon}</div>
        <h2 style={S.title}>{current.title}</h2>
        <p style={S.body}>{current.body}</p>

        {/* Mode shortcuts on last step */}
        {isLast && (
          <div style={S.modeRow}>
            <button style={{ ...S.modeBtn, borderColor: "#8ab828" }} onClick={() => { onDismiss(); navigate("/learn"); }}>
              📚 Learn
            </button>
            <button style={{ ...S.modeBtn, borderColor: "#9a4ac8" }} onClick={() => { onDismiss(); navigate("/game"); }}>
              ⚡ Game
            </button>
            <button style={{ ...S.modeBtn, borderColor: "#c8a030" }} onClick={() => { onDismiss(); navigate("/ai-tutor"); }}>
              🤖 Tutor
            </button>
          </div>
        )}

        <div style={S.btnRow}>
          {!isLast && (
            <button style={S.skipBtn} onClick={skip}>Skip</button>
          )}
          <button style={S.nextBtn} onClick={next}>{current.cta}</button>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 16,
  },
  modal: {
    background: "#2a2a14",
    border: "4px solid #6a8a20",
    boxShadow: "inset -4px -4px 0 #1a1a08, 0 0 0 2px #3a3a10",
    padding: "28px 24px",
    maxWidth: 420,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
    fontFamily: "'Press Start 2P', monospace",
    textAlign: "center",
    animation: "blockSlide 0.3s ease-out",
  },
  dots: { display: "flex", gap: 8 },
  dot: {
    width: 10, height: 10,
    background: "#3a3a18",
    border: "2px solid #5a5a28",
  },
  dotActive: {
    background: "#a0d040",
    border: "2px solid #c0f060",
  },
  icon: { fontSize: 48 },
  title: {
    margin: 0,
    fontSize: 12,
    color: "#a0d040",
    textShadow: "2px 2px 0 #3a5010",
    lineHeight: 1.6,
  },
  body: {
    margin: 0,
    fontSize: 8,
    color: "#c0c0a0",
    lineHeight: 2.2,
    maxWidth: 340,
  },
  modeRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap" as const,
    justifyContent: "center",
  },
  modeBtn: {
    background: "#1a1a08",
    color: "#f0f0e0",
    border: "2px solid #4a4a20",
    padding: "8px 14px",
    fontSize: 8,
    fontFamily: "'Press Start 2P', monospace",
    cursor: "pointer",
    boxShadow: "inset -2px -2px 0 #0a0a04",
  },
  btnRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    marginTop: 4,
  },
  skipBtn: {
    background: "transparent",
    color: "#606040",
    border: "none",
    fontSize: 7,
    fontFamily: "'Press Start 2P', monospace",
    cursor: "pointer",
    padding: "6px 10px",
  },
  nextBtn: {
    background: "#5a7a1a",
    color: "#f0ffe0",
    border: "3px solid #8ab828",
    boxShadow: "inset -3px -3px 0 #3a5010, inset 3px 3px 0 rgba(255,255,255,0.15)",
    padding: "10px 20px",
    fontSize: 9,
    fontFamily: "'Press Start 2P', monospace",
    cursor: "pointer",
    letterSpacing: 1,
  },
};
