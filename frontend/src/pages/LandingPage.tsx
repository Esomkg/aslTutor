import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { OnboardingModal, useOnboarding } from "../components/OnboardingModal";
import { FloatingHands } from "../components/FloatingHands";
import { getStreak, hasNotPracticedToday } from "../utils/storage";
import { playClick } from "../utils/sounds";

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { show: showOnboarding, dismiss: dismissOnboarding } = useOnboarding();
  const streak = getStreak();
  const needsReminder = streak.current > 0 && hasNotPracticedToday();

  function go(path: string) {
    playClick();
    navigate(path);
  }

  return (
    <div style={S.page}>
      <FloatingHands />
      {showOnboarding && <OnboardingModal onDismiss={dismissOnboarding} />}

      {/* Top bar */}
      <div style={S.topBar}>
        {/* Streak badge */}
        {streak.current > 0 && (
          <div style={S.streakBadge} title={`Longest streak: ${streak.longest} days`}>
            🔥 {streak.current} day{streak.current !== 1 ? "s" : ""}
          </div>
        )}
        <div style={{ flex: 1 }} />
        {user ? (
          <>
            <span style={S.userLabel}>{user.email}</span>
            <button style={S.authBtn} onClick={() => { playClick(); signOut(); }}>Logout</button>
          </>
        ) : (
          <button style={S.authBtn} onClick={() => go("/auth")}>Login / Register</button>
        )}
      </div>

      {/* Practice reminder banner */}
      {needsReminder && (
        <div style={S.reminderBanner}>
          <span>⏰</span>
          <span style={{ flex: 1 }}>You haven't practiced today — keep your {streak.current}-day streak alive!</span>
          <button style={S.reminderBtn} onClick={() => go("/learn")}>Practice now</button>
        </div>
      )}

      {/* Hero */}
      <div style={S.hero}>
        <div style={S.badge}>[ American Sign Language ]</div>
        <h1 style={S.title}>SignQuest</h1>
        <p style={S.subtitle}>
          Learn ASL fingerspelling through real-time webcam recognition, games, and an AI tutor.
        </p>

        {/* Streak display in hero if active */}
        {streak.current >= 2 && (
          <div style={S.streakHero}>
            🔥 <span style={{ color: "#f0c030" }}>{streak.current}-day streak</span>
            {streak.longest > streak.current && (
              <span style={{ color: "#606040", fontSize: 7 }}> · best: {streak.longest}</span>
            )}
          </div>
        )}

        <div style={S.buttonRow}>
          <McButton color="green"  onClick={() => go("/translator")}>🎥 Translate</McButton>
          <McButton color="stone"  onClick={() => go("/learn")}>📚 Learn</McButton>
          <McButton color="purple" onClick={() => go("/game")}>⚡ Sign Sprint</McButton>
          <McButton color="gold"   onClick={() => go("/ai-tutor")}>🤖 AI Tutor</McButton>
          <McButton color="teal"   onClick={() => go("/spell-name")}>✍️ Spell Name</McButton>
        </div>

        <button style={S.howItWorks} onClick={dismissOnboarding}>
          ? How it works
        </button>
      </div>

      {/* Feature cards */}
      <div style={S.cards}>
        <FeatureCard icon="📷" title="Real-time" desc="Webcam recognition at 15 fps with instant feedback." />
        <FeatureCard icon="📚" title="Learn ASL" desc="All 26 fingerspelling letters with animated handshapes." />
        <FeatureCard icon="⚡" title="Sign Sprint" desc="Race the clock. Earn points, build streaks, beat your score." />
        <FeatureCard icon="🤖" title="AI Tutor" desc="Personalised tips, drills, and YouTube resources." />
        <FeatureCard icon="✍️" title="Spell Name" desc="Sign your name letter by letter with live feedback." />
        <FeatureCard icon="🔥" title="Streaks" desc="Practice daily to build your streak and stay consistent." />
      </div>

      <footer style={S.footer}>Built with MediaPipe · FastAPI · React · Groq</footer>
    </div>
  );
}

function McButton({ children, color, onClick }: {
  children: React.ReactNode;
  color: "green" | "stone" | "purple" | "gold" | "teal";
  onClick: () => void;
}) {
  const colors = {
    green:  { bg: "#5a7a1a", border: "#8ab828", shadow: "#3a5010", text: "#f0ffe0" },
    stone:  { bg: "#5a5a5a", border: "#8a8a8a", shadow: "#2a2a2a", text: "#f0f0f0" },
    purple: { bg: "#5a1a7a", border: "#9a4ac8", shadow: "#2a0a3a", text: "#f0d0ff" },
    gold:   { bg: "#7a6010", border: "#c8a030", shadow: "#3a2a08", text: "#fff8d0" },
    teal:   { bg: "#0a5a5a", border: "#20a8a8", shadow: "#042a2a", text: "#d0ffff" },
  };
  const c = colors[color];
  return (
    <button
      className="mc-btn"
      onClick={onClick}
      style={{
        background: c.bg, color: c.text,
        border: `3px solid ${c.border}`,
        boxShadow: `inset -3px -3px 0 ${c.shadow}, inset 3px 3px 0 rgba(255,255,255,0.15)`,
        padding: "12px 20px", fontSize: 10, letterSpacing: 1,
      }}
    >
      {children}
    </button>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={S.card}>
      <span style={S.cardIcon}>{icon}</span>
      <h3 style={S.cardTitle}>{title}</h3>
      <p style={S.cardDesc}>{desc}</p>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #1a1a08 0%, #2d2d0f 50%, #1a1a08 100%)",
    color: "#f0f0e0",
    fontFamily: "'Press Start 2P', monospace",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0 16px 40px",
    gap: 40,
    imageRendering: "pixelated",
    position: "relative" as const,
  },
  topBar: {
    width: "100%",
    maxWidth: 720,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 0",
    flexWrap: "wrap" as const,
  },
  streakBadge: {
    background: "#2a1a08",
    border: "2px solid #c8a030",
    color: "#f0c030",
    padding: "5px 10px",
    fontSize: 8,
    letterSpacing: 1,
  },
  userLabel: { fontSize: 7, color: "#606040" },
  authBtn: {
    background: "#2a2a14", color: "#a0d040",
    border: "2px solid #4a6a10",
    boxShadow: "inset -2px -2px 0 #1a1a08",
    padding: "6px 12px", fontSize: 7,
    fontFamily: "'Press Start 2P', monospace",
    cursor: "pointer",
  },
  reminderBanner: {
    width: "100%",
    maxWidth: 720,
    background: "#2a1a08",
    border: "2px solid #c8a030",
    color: "#f0c030",
    padding: "10px 14px",
    fontSize: 8,
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap" as const,
    lineHeight: 2,
  },
  reminderBtn: {
    background: "#7a6010",
    color: "#fff8d0",
    border: "2px solid #c8a030",
    padding: "5px 12px",
    fontSize: 7,
    fontFamily: "'Press Start 2P', monospace",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  hero: {
    textAlign: "center",
    maxWidth: 640,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 18,
    animation: "blockSlide 0.4s ease-out",
    paddingTop: 8,
  },
  badge: {
    background: "#2a3a0a",
    border: "2px solid #5a8a1a",
    color: "#a0d040",
    padding: "6px 14px",
    fontSize: 9,
    letterSpacing: 2,
  },
  title: {
    margin: 0,
    fontSize: "clamp(20px, 6vw, 40px)",
    fontWeight: 400,
    color: "#f0f0e0",
    textShadow: "4px 4px 0 #3a3a10, 2px 2px 0 #5a5a20",
    lineHeight: 1.4,
  },
  subtitle: {
    margin: 0,
    color: "#a0a080",
    fontSize: 9,
    lineHeight: 2,
    maxWidth: 480,
  },
  streakHero: {
    fontSize: 9,
    background: "#2a1a08",
    border: "2px solid #c8a030",
    padding: "6px 14px",
    display: "flex",
    gap: 6,
    alignItems: "center",
  },
  buttonRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap" as const,
    justifyContent: "center",
    marginTop: 4,
  },
  howItWorks: {
    background: "transparent",
    color: "#505040",
    border: "none",
    fontSize: 7,
    fontFamily: "'Press Start 2P', monospace",
    cursor: "pointer",
    padding: "4px 8px",
    textDecoration: "underline",
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 4,
    width: "100%",
    maxWidth: 720,
  },
  card: {
    background: "#2a2a14",
    border: "3px solid #4a4a20",
    boxShadow: "inset -2px -2px 0 #1a1a08, inset 2px 2px 0 rgba(255,255,255,0.05)",
    padding: "18px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  cardIcon: { fontSize: 22 },
  cardTitle: { margin: 0, fontSize: 9, color: "#f0f0e0" },
  cardDesc: { margin: 0, fontSize: 7, color: "#808060", lineHeight: 2 },
  footer: { color: "#4a4a30", fontSize: 7 },
};
