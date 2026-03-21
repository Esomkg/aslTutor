/**
 * FloatingHands — canvas background animation for the landing page.
 * Spawns pixel-art ASL hand SVGs that drift upward, rotate slowly,
 * and fade in/out. Purely decorative, pointer-events: none.
 */
import { useEffect, useRef } from "react";

const SKIN  = "#e8b87a";
const MID   = "#d4a060";
const DARK  = "#b8844a";
const NAIL  = "#f5deb3";
const LINE  = "#8a5c28";
const PX    = 5; // pixel block size — deliberately blocky

// Each shape is an array of [col, row, color] pixel blocks on a 7×9 grid
type Px = [number, number, string];

const SHAPES: Record<string, Px[]> = {
  A: [
    [1,2,NAIL],[2,2,NAIL],[3,2,NAIL],[0,2,NAIL],
    [0,3,SKIN],[1,3,SKIN],[2,3,SKIN],[3,3,SKIN],
    [0,4,MID],[1,4,MID],[2,4,MID],[3,4,MID],[4,4,MID],
    [0,5,DARK],[1,5,MID],[2,5,MID],[3,5,MID],[4,5,DARK],
    [1,6,DARK],[2,6,MID],[3,6,DARK],
    [5,3,NAIL],[5,4,SKIN],
  ],
  B: [
    [0,0,NAIL],[1,0,NAIL],[2,0,NAIL],[3,0,NAIL],
    [0,1,SKIN],[1,1,SKIN],[2,1,SKIN],[3,1,SKIN],
    [0,2,SKIN],[1,2,SKIN],[2,2,SKIN],[3,2,SKIN],
    [0,3,SKIN],[1,3,SKIN],[2,3,SKIN],[3,3,SKIN],
    [0,4,MID],[1,4,MID],[2,4,MID],[3,4,MID],
    [0,5,DARK],[1,5,MID],[2,5,MID],[3,5,DARK],
    [1,6,DARK],[2,6,MID],[3,6,DARK],
  ],
  C: [
    [0,1,NAIL],[1,0,NAIL],[2,0,NAIL],[3,1,NAIL],
    [0,2,SKIN],[3,2,SKIN],
    [0,3,SKIN],[3,3,SKIN],
    [0,4,MID],[1,4,MID],[2,4,MID],[3,4,MID],
    [0,5,DARK],[1,5,MID],[2,5,MID],[3,5,DARK],
    [1,6,DARK],[2,6,MID],
  ],
  V: [
    [1,0,NAIL],[3,0,NAIL],
    [1,1,SKIN],[3,1,SKIN],
    [1,2,SKIN],[3,2,SKIN],
    [1,3,SKIN],[2,3,SKIN],[3,3,SKIN],
    [0,3,NAIL],
    [0,4,MID],[1,4,MID],[2,4,MID],[3,4,MID],[4,4,MID],
    [0,5,DARK],[1,5,MID],[2,5,MID],[3,5,MID],[4,5,DARK],
    [1,6,DARK],[2,6,MID],[3,6,DARK],
    [4,3,NAIL],[4,4,SKIN],
  ],
  Y: [
    [0,1,NAIL],[0,2,SKIN],[0,3,SKIN],
    [5,1,NAIL],[5,2,SKIN],[5,3,SKIN],
    [1,3,NAIL],[2,3,NAIL],[3,3,NAIL],
    [0,4,MID],[1,4,MID],[2,4,MID],[3,4,MID],[4,4,MID],
    [0,5,DARK],[1,5,MID],[2,5,MID],[3,5,MID],[4,5,DARK],
    [1,6,DARK],[2,6,MID],[3,6,DARK],
  ],
  L: [
    [3,0,NAIL],[3,1,SKIN],[3,2,SKIN],[3,3,SKIN],
    [5,3,NAIL],[5,4,SKIN],[5,5,SKIN],
    [0,3,NAIL],[1,3,NAIL],[2,3,NAIL],
    [0,4,MID],[1,4,MID],[2,4,MID],[3,4,MID],[4,4,MID],
    [0,5,DARK],[1,5,MID],[2,5,MID],[3,5,MID],[4,5,DARK],
    [1,6,DARK],[2,6,MID],[3,6,DARK],
  ],
  I: [
    [0,0,NAIL],[0,1,SKIN],[0,2,SKIN],[0,3,SKIN],
    [1,3,NAIL],[2,3,NAIL],[3,3,NAIL],
    [0,4,MID],[1,4,MID],[2,4,MID],[3,4,MID],[4,4,MID],
    [0,5,DARK],[1,5,MID],[2,5,MID],[3,5,MID],[4,5,DARK],
    [1,6,DARK],[2,6,MID],[3,6,DARK],
    [4,3,NAIL],[4,4,SKIN],
  ],
  W: [
    [0,0,NAIL],[2,0,NAIL],[4,0,NAIL],
    [0,1,SKIN],[2,1,SKIN],[4,1,SKIN],
    [0,2,SKIN],[2,2,SKIN],[4,2,SKIN],
    [0,3,SKIN],[1,3,SKIN],[2,3,SKIN],[3,3,SKIN],[4,3,SKIN],
    [0,4,MID],[1,4,MID],[2,4,MID],[3,4,MID],[4,4,MID],
    [0,5,DARK],[1,5,MID],[2,5,MID],[3,5,MID],[4,5,DARK],
    [1,6,DARK],[2,6,MID],[3,6,DARK],
  ],
};

const SHAPE_KEYS = Object.keys(SHAPES);

// Pre-render each shape to an offscreen canvas
function buildSprite(pixels: Px[], scale: number): HTMLCanvasElement {
  const cols = 7, rows = 8;
  const c = document.createElement("canvas");
  c.width  = cols * PX * scale;
  c.height = rows * PX * scale;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  for (const [col, row, color] of pixels) {
    ctx.fillStyle = color;
    ctx.fillRect(col * PX * scale, row * PX * scale, PX * scale, PX * scale);
    // pixel border
    ctx.fillStyle = LINE;
    ctx.fillRect(col * PX * scale, row * PX * scale, PX * scale, 1);
    ctx.fillRect(col * PX * scale, row * PX * scale, 1, PX * scale);
  }
  return c;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  va: number;       // angular velocity
  alpha: number;
  alphaDir: number; // 1 = fading in, -1 = fading out
  scale: number;
  sprite: HTMLCanvasElement;
  letter: string;
}

const PARTICLE_COUNT = 18;

function spawnParticle(
  w: number,
  h: number,
  sprites: Record<string, HTMLCanvasElement[]>,
  fromBottom = false,
): Particle {
  const letter = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
  const scaleIdx = Math.floor(Math.random() * 3); // 0=small,1=med,2=large
  const sprite = sprites[letter][scaleIdx];
  const scales = [1, 1.5, 2];
  return {
    x: Math.random() * w,
    y: fromBottom ? h + 60 : Math.random() * h,
    vx: (Math.random() - 0.5) * 0.4,
    vy: -(0.3 + Math.random() * 0.5),
    angle: Math.random() * Math.PI * 2,
    va: (Math.random() - 0.5) * 0.008,
    alpha: fromBottom ? 0 : Math.random() * 0.18,
    alphaDir: 1,
    scale: scales[scaleIdx],
    sprite,
    letter,
  };
}

export function FloatingHands() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    // Build sprites at 3 sizes
    const sprites: Record<string, HTMLCanvasElement[]> = {};
    for (const key of SHAPE_KEYS) {
      sprites[key] = [1, 1.5, 2].map(s => buildSprite(SHAPES[key], s));
    }

    let w = canvas.offsetWidth;
    let h = canvas.offsetHeight;
    canvas.width  = w;
    canvas.height = h;

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () =>
      spawnParticle(w, h, sprites, false)
    );

    let raf: number;

    function draw() {
      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        // Move
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.va;

        // Fade
        p.alpha += p.alphaDir * 0.003;
        if (p.alpha >= 0.22) { p.alpha = 0.22; p.alphaDir = -1; }
        if (p.alpha <= 0)    { p.alpha = 0;    p.alphaDir =  1; }

        // Respawn when off top
        if (p.y < -80) {
          const next = spawnParticle(w, h, sprites, true);
          Object.assign(p, next);
        }

        // Draw
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        const sw = p.sprite.width;
        const sh = p.sprite.height;
        ctx.drawImage(p.sprite, -sw / 2, -sh / 2);
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    }

    draw();

    // Resize handler
    function onResize() {
      if (!canvas) return;
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width  = w;
      canvas.height = h;
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        imageRendering: "pixelated",
      }}
      aria-hidden="true"
    />
  );
}
