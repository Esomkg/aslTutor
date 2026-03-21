import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (mode === "login") {
      const err = await signIn(email, password);
      if (err) { setError(err); setLoading(false); return; }
      navigate("/");
    } else {
      const err = await signUp(email, password);
      if (err) { setError(err); setLoading(false); return; }
      setSuccess("Account created! Check your email to confirm, then log in.");
      setMode("login");
    }
    setLoading(false);
  }

  return (
    <div style={S.page}>
      <div style={S.box}>
        <div style={S.title}>ASL Translator</div>
        <div style={S.subtitle}>{mode === "login" ? "Welcome back" : "Create account"}</div>

        <div style={S.tabs}>
          <button style={{ ...S.tab, ...(mode === "login" ? S.tabActive : {}) }} onClick={() => { setMode("login"); setError(null); setSuccess(null); }}>
            Login
          </button>
          <button style={{ ...S.tab, ...(mode === "register" ? S.tabActive : {}) }} onClick={() => { setMode("register"); setError(null); setSuccess(null); }}>
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} style={S.form}>
          <label style={S.label}>Email</label>
          <input
            style={S.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />

          <label style={S.label}>Password</label>
          <input
            style={S.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={6}
          />

          {error && <div style={S.error}>{error}</div>}
          {success && <div style={S.successMsg}>{success}</div>}

          <button className="mc-btn" style={S.submitBtn} type="submit" disabled={loading}>
            {loading ? "..." : mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>

        <button style={S.guestBtn} onClick={() => navigate("/")}>
          Continue as guest
        </button>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#1a1a08",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Press Start 2P', monospace",
    padding: 16,
  },
  box: {
    background: "#2a2a14",
    border: "3px solid #4a4a20",
    boxShadow: "inset -3px -3px 0 #1a1a08, 6px 6px 0 #0a0a04",
    padding: "32px 28px",
    width: "100%",
    maxWidth: 380,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  title: { fontSize: 14, color: "#a0d040", textAlign: "center", textShadow: "2px 2px 0 #3a5010" },
  subtitle: { fontSize: 8, color: "#606040", textAlign: "center" },
  tabs: { display: "flex", gap: 0 },
  tab: {
    flex: 1, padding: "8px 0", fontSize: 8, cursor: "pointer",
    background: "#1a1a08", color: "#606040",
    border: "2px solid #3a3a18",
    boxShadow: "none",
  },
  tabActive: {
    background: "#3a3a1a", color: "#a0d040",
    border: "2px solid #6a8a20",
    boxShadow: "inset -2px -2px 0 #1a1a08",
  },
  form: { display: "flex", flexDirection: "column", gap: 10 },
  label: { fontSize: 7, color: "#808060", letterSpacing: 1 },
  input: {
    background: "#1a1a08",
    border: "2px solid #4a4a20",
    boxShadow: "inset 2px 2px 0 #0a0a04",
    color: "#f0f0e0",
    padding: "10px 12px",
    fontSize: 9,
    fontFamily: "'Press Start 2P', monospace",
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  error: {
    background: "#3a1a1a", border: "2px solid #7a3030",
    color: "#e08080", padding: "8px 10px", fontSize: 7, lineHeight: 1.8,
  },
  successMsg: {
    background: "#1a3a1a", border: "2px solid #3a7a3a",
    color: "#80e080", padding: "8px 10px", fontSize: 7, lineHeight: 1.8,
  },
  submitBtn: {
    marginTop: 4, padding: "12px 0", fontSize: 9,
    background: "#5a7a1a", color: "#f0ffe0",
    border: "3px solid #8ab828",
    boxShadow: "inset -3px -3px 0 #3a5010, inset 3px 3px 0 rgba(255,255,255,0.15)",
    cursor: "pointer",
  },
  guestBtn: {
    background: "transparent", border: "none",
    color: "#505040", fontSize: 7, cursor: "pointer",
    textAlign: "center" as const, textDecoration: "underline",
    fontFamily: "'Press Start 2P', monospace",
  },
};
