import { useNavigate } from "react-router-dom";
import App from "../App";

export default function TranslatorPage() {
  const navigate = useNavigate();
  return (
    <div style={styles.page}>
      <div style={styles.nav}>
        <button className="mc-btn" style={styles.backBtn} onClick={() => navigate("/")}>← Home</button>
        <button className="mc-btn" style={styles.learnBtn} onClick={() => navigate("/learn")}>Learn ASL</button>
      </div>
      <App />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #1a1a08 0%, #2d2d0f 50%, #1a1a08 100%)",
    fontFamily: "'Press Start 2P', monospace",
    imageRendering: "pixelated",
  },
  nav: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 16px",
    background: "#1a1a08",
    borderBottom: "3px solid #3a3a18",
  },
  backBtn: {
    background: "#5a5a5a",
    color: "#f0f0f0",
    border: "3px solid #8a8a8a",
    boxShadow: "inset -3px -3px 0 #2a2a2a, inset 3px 3px 0 rgba(255,255,255,0.15)",
    padding: "8px 14px",
    fontSize: 8,
    letterSpacing: 1,
  },
  learnBtn: {
    background: "#5a7a1a",
    color: "#f0ffe0",
    border: "3px solid #8ab828",
    boxShadow: "inset -3px -3px 0 #3a5010, inset 3px 3px 0 rgba(255,255,255,0.15)",
    padding: "8px 14px",
    fontSize: 8,
    letterSpacing: 1,
  },
};
