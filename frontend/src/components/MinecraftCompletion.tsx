import { useEffect, useRef } from "react";

interface Props {
  show: boolean;
  title: string;
  subtitle?: string;
  icon?: string;
}

/**
 * Minecraft-style "Advancement Made!" completion banner.
 * Plays a pixel-block particle burst + audio fanfare.
 */
export function MinecraftCompletion({ show, title, subtitle, icon = "🏆" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  // Synthesize Minecraft-style level-up sound
  useEffect(() => {
    if (!show) return;
    try {
      const ac = new AudioContext();
      const notes = [523, 659, 784, 1047, 1319];
      notes.forEach((freq, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.type = "square";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, ac.currentTime + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + i * 0.09 + 0.18);
        osc.start(ac.currentTime + i * 0.09);
        osc.stop(ac.currentTime + i * 0.09 + 0.2);
      });
    } catch (_) {}
  }, [show]);

  // Pixel block particle animation
  useEffect(() => {
    if (!show) return;
    const cvs = canvasRef.current;
    if (!cvs) return;

    const W = cvs.width = window.innerWidth;
    const H = cvs.height = window.innerHeight;

    const COLORS = ["#a0d040", "#f0c040", "#e07020", "#60a0e0", "#c040c0", "#40e080"];
    const BLOCK_SIZE = 10;

    type Particle = {
      x: number; y: number;
      vx: number; vy: number;
      color: string;
      life: number;
      maxLife: number;
    };

    const particles: Particle[] = Array.from({ length: 80 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * 200,
      y: H / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: -(Math.random() * 12 + 4),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 1,
      maxLife: 0.6 + Math.random() * 0.8,
    }));

    let start: number | null = null;

    function draw(ts: number) {
      if (!start) start = ts;
      const elapsed = (ts - start) / 1000;

      const ctx = cvs!.getContext("2d")!;
      ctx.clearRect(0, 0, W, H);

      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.5; // gravity
        p.life -= 0.016 / p.maxLife;

        if (p.life > 0) {
          alive = true;
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = p.color;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), BLOCK_SIZE, BLOCK_SIZE);
          // pixel shadow
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          ctx.fillRect(Math.round(p.x) + 2, Math.round(p.y) + 2, BLOCK_SIZE, BLOCK_SIZE);
        }
      }
      ctx.globalAlpha = 1;

      if (alive && elapsed < 3) {
        animRef.current = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, W, H);
      }
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [show]);

  if (!show) return null;

  return (
    <>
      {/* Particle canvas — sits behind the banner */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9990,
          pointerEvents: "none",
        }}
      />

      {/* Minecraft "Advancement Made!" banner */}
      <div style={S.wrap}>
        <div style={S.banner}>
          <div style={S.topLabel}>✦ ADVANCEMENT MADE! ✦</div>
          <div style={S.body}>
            <div style={S.iconBox}>{icon}</div>
            <div style={S.textCol}>
              <div style={S.title}>{title}</div>
              {subtitle && <div style={S.subtitle}>{subtitle}</div>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: {
    position: "fixed",
    top: 24,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 9995,
    pointerEvents: "none",
    animation: "mcSlideIn 0.3s ease-out",
  },
  banner: {
    background: "#1a1a0a",
    border: "3px solid #a0d040",
    boxShadow: "inset -3px -3px 0 #0a0a04, 0 0 24px rgba(160,208,64,0.4), 4px 4px 0 #0a0a04",
    padding: "10px 20px 12px",
    minWidth: 320,
    maxWidth: 480,
    fontFamily: "'Press Start 2P', monospace",
  },
  topLabel: {
    fontSize: 7,
    color: "#a0d040",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 8,
  },
  body: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  iconBox: {
    fontSize: 32,
    background: "#2a3a0a",
    border: "2px solid #8ab828",
    padding: "6px 8px",
    flexShrink: 0,
    imageRendering: "pixelated",
  },
  textCol: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  title: {
    fontSize: 10,
    color: "#f0f0e0",
    lineHeight: 1.6,
  },
  subtitle: {
    fontSize: 7,
    color: "#a0a060",
    lineHeight: 1.8,
  },
};
