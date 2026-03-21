import React from "react";
import { useNavigate } from "react-router-dom";
import { FloatingHands } from "../components/FloatingHands";

const FEATURES = [
  {
    icon: "📷",
    title: "Real-Time Recognition",
    desc: "Hold your hand up to the webcam and SignQuest instantly recognises your ASL fingerspelling using MediaPipe and a custom ML model — no app install needed.",
  },
  {
    icon: "🎮",
    title: "Sign Sprint Game",
    desc: "Race the clock to sign letters before time runs out. Earn points, build streaks, unlock achievements, and beat your high score across Easy, Normal, and Hard modes.",
  },
  {
    icon: "📚",
    title: "Learn Mode",
    desc: "Browse all 26 ASL letters with animated handshape guides. Take a 10-question quiz, then jump into live camera practice for any letter you want to drill.",
  },
  {
    icon: "🤖",
    title: "AI Tutor",
    desc: "Chat with an AI tutor powered by Groq. It knows which letters you've practiced, finds your weak spots, builds personalised lesson plans, and searches YouTube for tutorials.",
  },
  {
    icon: "✍️",
    title: "Spell Your Name",
    desc: "Type your name and sign each letter one by one with live webcam feedback. A fun way to make fingerspelling personal from day one.",
  },
  {
    icon: "🔥",
    title: "Progress & Streaks",
    desc: "Track every letter you've practiced, maintain daily streaks, and sync your progress across devices when you create a free account.",
  },
];

const STEPS = [
  { n: "1", title: "Open the app", desc: "No download. Works in any Chromium browser with a webcam." },
  { n: "2", title: "Pick a mode", desc: "Start with Learn to see the handshapes, or jump straight into Sign Sprint." },
  { n: "3", title: "Sign to your camera", desc: "Hold your hand steady — the model reads your landmarks in real time." },
  { n: "4", title: "Get coached", desc: "Ask the AI Tutor what to work on next and follow a personalised drill." },
];

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div style={S.page}>
      <FloatingHands />

      {/* Nav */}
      <div style={S.nav}>
        <span style={S.navLogo}>🤟 SignQuest</span>
        <div style={S.navLinks}>
          <button style={S.navLink} onClick={() => navigate("/")}>Home</button>
          <button style={S.navCta} onClick={() => navigate("/auth")}>Get Started Free</button>
        </div>
      </div>

      {/* Hero */}
      <div style={S.hero}>
        <div style={S.heroBadge}>[ Learn American Sign Language ]</div>
        <h1 style={S.heroTitle}>Sign language learning<br />that actually works</h1>
        <p style={S.heroSub}>
          Real-time webcam feedback, a gamified practice loop, and an AI tutor that knows exactly where you're struggling.
          No prior experience needed.
        </p>
        <div style={S.heroButtons}>
          <button style={S.btnPrimary} onClick={() => navigate("/auth")}>Start for free</button>
          <button style={S.btnSecondary} onClick={() => navigate("/")}>Try as guest</button>
        </div>
      </div>

      {/* Stats row */}
      <div style={S.statsRow}>
        {[
          { n: "26", label: "ASL letters" },
          { n: "AI", label: "Groq-powered tutor" },
          { n: "15fps", label: "Live recognition" },
          { n: "Free", label: "No credit card" },
        ].map(({ n, label }) => (
          <div key={label} style={S.statBox}>
            <span style={S.statNum}>{n}</span>
            <span style={S.statLabel}>{label}</span>
          </div>
        ))}
      </div>

      {/* Features */}
      <div style={S.section}>
        <div style={S.sectionLabel}>[ Features ]</div>
        <h2 style={S.sectionTitle}>Everything you need to learn ASL</h2>
        <div style={S.featureGrid}>
          {FEATURES.map(f => (
            <div key={f.title} style={S.featureCard}>
              <span style={S.featureIcon}>{f.icon}</span>
              <h3 style={S.featureTitle}>{f.title}</h3>
              <p style={S.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={S.section}>
        <div style={S.sectionLabel}>[ How it works ]</div>
        <h2 style={S.sectionTitle}>Up and running in 60 seconds</h2>
        <div style={S.steps}>
          {STEPS.map(step => (
            <div key={step.n} style={S.stepCard}>
              <div style={S.stepNum}>{step.n}</div>
              <div style={S.stepContent}>
                <div style={S.stepTitle}>{step.title}</div>
                <div style={S.stepDesc}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={S.ctaBox}>
        <h2 style={S.ctaTitle}>Ready to start signing?</h2>
        <p style={S.ctaSub}>Create a free account to save your progress, or jump in as a guest right now.</p>
        <div style={S.heroButtons}>
          <button style={S.btnPrimary} onClick={() => navigate("/auth")}>Create free account</button>
          <button style={S.btnSecondary} onClick={() => navigate("/")}>Continue as guest</button>
        </div>
      </div>

      <footer style={S.footer}>
        Built with MediaPipe · FastAPI · React · Groq · Supabase
      </footer>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #1a1a08 0%, #2d2d0f 60%, #1a1a08 100%)",
    color: "#f0f0e0",
    fontFamily: "'Press Start 2P', monospace",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0 16px 60px",
    gap: 60,
    position: "relative" as const,
  },
  // Nav
  nav: {
    width: "100%", maxWidth: 800,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 0", flexWrap: "wrap" as const, gap: 10,
  },
  navLogo: { fontSize: 11, color: "#a0d040", letterSpacing: 1 },
  navLinks: { display: "flex", gap: 10, alignItems: "center" },
  navLink: {
    background: "transparent", color: "#808060",
    border: "none", fontSize: 7,
    fontFamily: "'Press Start 2P', monospace",
    cursor: "pointer", padding: "6px 10px",
  },
  navCta: {
    background: "#2a3a0a", color: "#a0d040",
    border: "2px solid #5a8a1a",
    boxShadow: "inset -2px -2px 0 #1a2a04",
    padding: "8px 14px", fontSize: 7,
    fontFamily: "'Press Start 2P', monospace",
    cursor: "pointer",
  },
  // Hero
  hero: {
    textAlign: "center", maxWidth: 640,
    display: "flex", flexDirection: "column",
    alignItems: "center", gap: 20,
    paddingTop: 20,
  },
  heroBadge: {
    background: "#2a3a0a", border: "2px solid #5a8a1a",
    color: "#a0d040", padding: "6px 14px", fontSize: 8, letterSpacing: 2,
  },
  heroTitle: {
    margin: 0, fontSize: "clamp(16px, 4vw, 28px)",
    fontWeight: 400, color: "#f0f0e0",
    textShadow: "4px 4px 0 #3a3a10",
    lineHeight: 1.8,
  },
  heroSub: {
    margin: 0, color: "#a0a080", fontSize: 8,
    lineHeight: 2.2, maxWidth: 520,
  },
  heroButtons: { display: "flex", gap: 12, flexWrap: "wrap" as const, justifyContent: "center" },
  btnPrimary: {
    background: "#5a7a1a", color: "#f0ffe0",
    border: "3px solid #8ab828",
    boxShadow: "inset -3px -3px 0 #3a5010, inset 3px 3px 0 rgba(255,255,255,0.15)",
    padding: "12px 22px", fontSize: 9,
    fontFamily: "'Press Start 2P', monospace",
    cursor: "pointer",
  },
  btnSecondary: {
    background: "#2a2a14", color: "#a0a060",
    border: "3px solid #4a4a20",
    boxShadow: "inset -3px -3px 0 #1a1a08",
    padding: "12px 22px", fontSize: 9,
    fontFamily: "'Press Start 2P', monospace",
    cursor: "pointer",
  },
  // Stats
  statsRow: {
    display: "flex", gap: 4, flexWrap: "wrap" as const,
    justifyContent: "center", width: "100%", maxWidth: 720,
  },
  statBox: {
    flex: "1 1 140px",
    background: "#2a2a14", border: "3px solid #4a4a20",
    boxShadow: "inset -2px -2px 0 #1a1a08",
    padding: "18px 14px",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
  },
  statNum: { fontSize: 22, color: "#a0d040", fontWeight: "bold" },
  statLabel: { fontSize: 7, color: "#606040", textAlign: "center" as const, lineHeight: 1.8 },
  // Section
  section: {
    width: "100%", maxWidth: 800,
    display: "flex", flexDirection: "column", gap: 24, alignItems: "center",
  },
  sectionLabel: {
    fontSize: 8, color: "#5a8a1a", letterSpacing: 2,
  },
  sectionTitle: {
    margin: 0, fontSize: "clamp(12px, 3vw, 18px)",
    color: "#f0f0e0", textAlign: "center" as const, lineHeight: 1.8,
  },
  // Feature grid
  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 4, width: "100%",
  },
  featureCard: {
    background: "#2a2a14", border: "3px solid #4a4a20",
    boxShadow: "inset -2px -2px 0 #1a1a08",
    padding: "20px 16px",
    display: "flex", flexDirection: "column", gap: 10,
  },
  featureIcon: { fontSize: 24 },
  featureTitle: { margin: 0, fontSize: 9, color: "#a0d040" },
  featureDesc: { margin: 0, fontSize: 7, color: "#808060", lineHeight: 2.2 },
  // Steps
  steps: {
    display: "flex", flexDirection: "column", gap: 4, width: "100%",
  },
  stepCard: {
    background: "#2a2a14", border: "3px solid #4a4a20",
    boxShadow: "inset -2px -2px 0 #1a1a08",
    padding: "16px 20px",
    display: "flex", alignItems: "flex-start", gap: 20,
  },
  stepNum: {
    fontSize: 20, color: "#a0d040", fontWeight: "bold",
    flexShrink: 0, width: 32, textAlign: "center" as const,
  },
  stepContent: { display: "flex", flexDirection: "column", gap: 6 },
  stepTitle: { fontSize: 9, color: "#f0f0e0" },
  stepDesc: { fontSize: 7, color: "#808060", lineHeight: 2 },
  // CTA box
  ctaBox: {
    width: "100%", maxWidth: 640,
    background: "#2a3a0a", border: "3px solid #5a8a1a",
    boxShadow: "inset -3px -3px 0 #1a2a04",
    padding: "36px 28px",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
    textAlign: "center" as const,
  },
  ctaTitle: { margin: 0, fontSize: "clamp(12px, 3vw, 18px)", color: "#a0d040", lineHeight: 1.8 },
  ctaSub: { margin: 0, fontSize: 7, color: "#a0a060", lineHeight: 2.2, maxWidth: 440 },
  footer: { color: "#4a4a30", fontSize: 7 },
};
