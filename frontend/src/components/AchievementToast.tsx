import { useEffect, useState } from "react";
import { Achievement } from "../utils/storage";

interface Props {
  achievement: Achievement | null;
  onDone: () => void;
}

export function AchievementToast({ achievement, onDone }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!achievement) return;
    setVisible(true);
    const t = setTimeout(() => { setVisible(false); setTimeout(onDone, 400); }, 3000);
    return () => clearTimeout(t);
  }, [achievement]);

  if (!achievement) return null;

  return (
    <div style={{
      ...S.toast,
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(-20px)",
    }}>
      <span style={S.icon}>{achievement.icon}</span>
      <div style={S.text}>
        <div style={S.label}>Achievement Unlocked!</div>
        <div style={S.title}>{achievement.title}</div>
        <div style={S.desc}>{achievement.desc}</div>
      </div>
    </div>
  );
}

const S: React.CSSProperties | any = {
  toast: {
    position: "fixed" as const,
    top: 16,
    right: 16,
    zIndex: 9999,
    background: "#2a3a0a",
    border: "3px solid #8ab828",
    boxShadow: "inset -3px -3px 0 #1a2a04, 4px 4px 0 #1a1a08",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontFamily: "'Press Start 2P', monospace",
    maxWidth: 280,
    transition: "opacity 0.3s, transform 0.3s",
  },
  icon: { fontSize: 28, flexShrink: 0 },
  text: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 7, color: "#a0d040", letterSpacing: 1 },
  title: { fontSize: 9, color: "#f0f0e0" },
  desc: { fontSize: 7, color: "#808060", lineHeight: 1.8 },
};
