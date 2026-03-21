/**
 * HandshapeGif — SVG hand illustrations for each ASL letter.
 * Uses smooth SVG paths (not pixel blocks) so fingers are clearly visible.
 * Animates: open palm fades out → letter shape fades in.
 * Minecraft color palette but smooth/readable shapes.
 */
import React from "react";

// Inject animation keyframes once
let _injected = false;
function injectStyles() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  const s = document.createElement("style");
  s.textContent = `
    @keyframes asl-palm-out {
      0%,10%  { opacity:1 }
      35%,65% { opacity:0 }
      90%,100%{ opacity:1 }
    }
    @keyframes asl-sign-in {
      0%,10%  { opacity:0 }
      35%,65% { opacity:1 }
      90%,100%{ opacity:0 }
    }
    @keyframes asl-static {
      0%,100% { opacity:1 }
    }
  `;
  document.head.appendChild(s);
}

// ─── Color palette ───────────────────────────────────────────────────────────
const C = {
  skin:  "#e8b87a",
  mid:   "#d4a060",
  dark:  "#b8844a",
  nail:  "#f5deb3",
  line:  "#8a5c28",
};

// ─── Shared hand parts ───────────────────────────────────────────────────────

/** A single finger: rounded rect from (cx, tipY) down to baseY, width w */
function Finger({ cx, tipY, baseY, w = 14, r = 6, color = C.skin, nail = true }: {
  cx: number; tipY: number; baseY: number; w?: number; r?: number;
  color?: string; nail?: boolean;
}) {
  const h = baseY - tipY;
  return (
    <g>
      <rect x={cx - w/2} y={tipY} width={w} height={h} rx={r} ry={r} fill={color} stroke={C.line} strokeWidth="1.2" />
      {nail && <rect x={cx - w/2 + 2} y={tipY + 2} width={w - 4} height={7} rx={3} fill={C.nail} opacity="0.7" />}
    </g>
  );
}

/** Palm base: rounded rect */
function Palm({ x = 8, y = 62, w = 68, h = 38 }: { x?: number; y?: number; w?: number; h?: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={10} ry={10} fill={C.mid} stroke={C.line} strokeWidth="1.2" />;
}

/** Thumb: rotated rounded rect */
function Thumb({ cx, cy, angle = -30, len = 28, w = 13 }: {
  cx: number; cy: number; angle?: number; len?: number; w?: number;
}) {
  return (
    <g transform={`rotate(${angle}, ${cx}, ${cy})`}>
      <rect x={cx - w/2} y={cy - len} width={w} height={len} rx={6} fill={C.skin} stroke={C.line} strokeWidth="1.2" />
      <rect x={cx - w/2 + 2} y={cy - len + 2} width={w - 4} height={6} rx={3} fill={C.nail} opacity="0.7" />
    </g>
  );
}

/** Bent/curled finger using a path */
function BentFinger({ cx, baseY, bendX, bendY, tipX, tipY, w = 13 }: {
  cx: number; baseY: number; bendX: number; bendY: number; tipX: number; tipY: number; w?: number;
}) {
  // Draw as a thick curved stroke
  return (
    <path
      d={`M${cx},${baseY} Q${bendX},${bendY} ${tipX},${tipY}`}
      fill="none" stroke={C.skin} strokeWidth={w} strokeLinecap="round"
    />
  );
}

// ─── Open palm (start state) ──────────────────────────────────────────────────
function OpenPalm() {
  return (
    <g>
      <Palm />
      <Finger cx={18} tipY={18} baseY={64} w={13} />
      <Finger cx={32} tipY={10} baseY={64} w={14} />
      <Finger cx={47} tipY={10} baseY={64} w={14} />
      <Finger cx={62} tipY={14} baseY={64} w={13} />
      <Finger cx={76} tipY={22} baseY={64} w={12} />
      {/* Thumb */}
      <Thumb cx={6} cy={72} angle={-15} len={30} w={14} />
    </g>
  );
}

// ─── Letter shapes ────────────────────────────────────────────────────────────

const LETTERS: Record<string, () => JSX.Element> = {

  A: () => (
    <g>
      <Palm />
      {/* All fingers curled into fist */}
      <BentFinger cx={18} baseY={64} bendX={18} bendY={50} tipX={22} tipY={58} />
      <BentFinger cx={32} baseY={64} bendX={32} bendY={46} tipX={36} tipY={56} />
      <BentFinger cx={47} baseY={64} bendX={47} bendY={46} tipX={51} tipY={56} />
      <BentFinger cx={62} baseY={64} bendX={62} bendY={48} tipX={65} tipY={57} />
      {/* Thumb on side */}
      <rect x={2} y={52} width={14} height={22} rx={6} fill={C.skin} stroke={C.line} strokeWidth="1.2" />
      <rect x={4} y={54} width={10} height={6} rx={3} fill={C.nail} opacity="0.7" />
    </g>
  ),

  B: () => (
    <g>
      <Palm />
      {/* Four fingers straight up */}
      <Finger cx={18} tipY={14} baseY={64} w={13} />
      <Finger cx={32} tipY={8}  baseY={64} w={14} />
      <Finger cx={47} tipY={8}  baseY={64} w={14} />
      <Finger cx={62} tipY={12} baseY={64} w={13} />
      {/* Thumb tucked across palm */}
      <rect x={14} y={68} width={30} height={12} rx={6} fill={C.skin} stroke={C.line} strokeWidth="1.2" />
    </g>
  ),

  C: () => (
    <g>
      {/* C-shaped arc — no full palm, open curve */}
      <path d="M72,30 Q72,10 42,8 Q12,8 12,30 Q12,52 42,58 Q62,58 72,50"
        fill="none" stroke={C.skin} strokeWidth="22" strokeLinecap="round" />
      <path d="M72,30 Q72,10 42,8 Q12,8 12,30 Q12,52 42,58 Q62,58 72,50"
        fill="none" stroke={C.line} strokeWidth="1.5" strokeLinecap="round" />
    </g>
  ),

  D: () => (
    <g>
      <Palm />
      {/* Index finger up */}
      <Finger cx={32} tipY={8} baseY={64} w={14} />
      {/* Other fingers curled to touch thumb */}
      <BentFinger cx={18} baseY={64} bendX={20} bendY={52} tipX={26} tipY={60} />
      <BentFinger cx={47} baseY={64} bendX={47} bendY={50} tipX={42} tipY={60} />
      <BentFinger cx={62} baseY={64} bendX={60} bendY={52} tipX={54} tipY={60} />
      {/* Thumb curving up to meet middle fingers */}
      <path d="M8,72 Q8,55 28,58" fill="none" stroke={C.skin} strokeWidth="13" strokeLinecap="round" />
    </g>
  ),

  E: () => (
    <g>
      <Palm />
      {/* All fingers bent/hooked downward */}
      <BentFinger cx={18} baseY={64} bendX={16} bendY={48} tipX={20} tipY={60} />
      <BentFinger cx={32} baseY={64} bendX={30} bendY={44} tipX={34} tipY={58} />
      <BentFinger cx={47} baseY={64} bendX={45} bendY={44} tipX={49} tipY={58} />
      <BentFinger cx={62} baseY={64} bendX={60} bendY={46} tipX={64} tipY={59} />
      {/* Thumb tucked under */}
      <rect x={10} y={66} width={28} height={11} rx={5} fill={C.skin} stroke={C.line} strokeWidth="1.2" />
    </g>
  ),

  F: () => (
    <g>
      <Palm />
      {/* Middle, ring, pinky up */}
      <Finger cx={47} tipY={10} baseY={64} w={14} />
      <Finger cx={62} tipY={14} baseY={64} w={13} />
      <Finger cx={76} tipY={22} baseY={64} w={12} />
      {/* Index curls to touch thumb — circle */}
      <circle cx={24} cy={56} r={12} fill="none" stroke={C.skin} strokeWidth="12" />
      <circle cx={24} cy={56} r={12} fill="none" stroke={C.line} strokeWidth="1.5" />
    </g>
  ),

  G: () => (
    <g>
      <Palm y={50} h={38} />
      {/* Index pointing sideways (right) */}
      <rect x={44} y={42} width={40} height={13} rx={6} fill={C.skin} stroke={C.line} strokeWidth="1.2" />
      <rect x={78} y={44} width={8} height={9} rx={4} fill={C.nail} opacity="0.7" />
      {/* Thumb parallel below */}
      <rect x={44} y={58} width={32} height={12} rx={6} fill={C.skin} stroke={C.line} strokeWidth="1.2" />
      {/* Other fingers curled */}
      <BentFinger cx={32} baseY={52} bendX={30} bendY={44} tipX={34} tipY={50} />
      <BentFinger cx={18} baseY={52} bendX={16} bendY={46} tipX={20} tipY={51} />
    </g>
  ),

  H: () => (
    <g>
      <Palm y={50} h={38} />
      {/* Index + middle pointing sideways */}
      <rect x={44} y={36} width={40} height={13} rx={6} fill={C.skin} stroke={C.line} strokeWidth="1.2" />
      <rect x={78} y={38} width={8} height={9} rx={4} fill={C.nail} opacity="0.7" />
      <rect x={44} y={52} width={40} height={13} rx={6} fill={C.skin} stroke={C.line} strokeWidth="1.2" />
      <rect x={78} y={54} width={8} height={9} rx={4} fill={C.nail} opacity="0.7" />
      {/* Ring + pinky curled */}
      <BentFinger cx={32} baseY={52} bendX={30} bendY={44} tipX={34} tipY={50} />
      <BentFinger cx={18} baseY={52} bendX={16} bendY={46} tipX={20} tipY={51} />
      {/* Thumb */}
      <Thumb cx={72} cy={72} angle={20} len={22} w={12} />
    </g>
  ),

  I: () => (
    <g>
      <Palm />
      {/* Pinky up */}
      <Finger cx={76} tipY={18} baseY={64} w={12} />
      {/* Other fingers curled */}
      <BentFinger cx={18} baseY={64} bendX={18} bendY={50} tipX={22} tipY={58} />
      <BentFinger cx={32} baseY={64} bendX={32} bendY={46} tipX={36} tipY={56} />
      <BentFinger cx={47} baseY={64} bendX={47} bendY={46} tipX={51} tipY={56} />
      <BentFinger cx={62} baseY={64} bendX={62} bendY={48} tipX={65} tipY={57} />
      {/* Thumb tucked */}
      <rect x={10} y={64} width={26} height={11} rx={5} fill={C.skin} stroke={C.line} strokeWidth="1.2" />
    </g>
  ),

  J: () => (
    <g>
      <Palm />
      {/* Pinky up (like I) */}
      <Finger cx={76} tipY={18} baseY={64} w={12} />
      <BentFinger cx={18} baseY={64} bendX={18} bendY={50} tipX={22} tipY={58} />
      <BentFinger cx={32} baseY={64} bendX={32} bendY={46} tipX={36} tipY={56} />
      <BentFinger cx={47} baseY={64} bendX={47} bendY={46} tipX={51} tipY={56} />
      <BentFinger cx={62} baseY={64} bendX={62} bendY={48} tipX={65} tipY={57} />
      {/* J motion arc */}
      <path d="M76,18 Q90,30 82,50" fill="none" stroke="#a0d040" strokeWidth="2.5" strokeDasharray="4,3" strokeLinecap="round" />
    </g>
  ),

  K: () => (
    <g>
      <Palm />
      {/* Index up */}
      <Finger cx={32} tipY={8} baseY={64} w={14} />
      {/* Middle up, spread */}
      <Finger cx={52} tipY={12} baseY={64} w={13} />
      {/* Thumb between them */}
      <path d="M8,72 Q20,55 40,50" fill="none" stroke={C.skin} strokeWidth="13" strokeLinecap="round" />
      {/* Ring + pinky curled */}
      <BentFinger cx={62} baseY={64} bendX={62} bendY={50} tipX={65} tipY={58} />
      <BentFinger cx={76} baseY={64} bendX={76} bendY={52} tipX={78} tipY={60} />
    </g>
  ),

  L: () => (
    <g>
      <Palm />
      {/* Index finger up */}
      <Finger cx={62} tipY={8} baseY={64} w={14} />
      {/* Thumb pointing out to the left */}
      <rect x={2} y={58} width={36} height={13} rx={6} fill={C.skin} stroke={C.line} strokeWidth="1.2" />
      <rect x={2} y={60} width={8} height={9} rx={4} fill={C.nail} opacity="0.7" />
      {/* Other fingers curled */}
      <BentFinger cx={18} baseY={64} bendX={18} bendY={50} tipX={22} tipY={58} />
      <BentFinger cx={32} baseY={64} bendX={32} bendY={48} tipX={36} tipY={57} />
      <BentFinger cx={47} baseY={64} bendX={47} bendY={48} tipX={50} tipY={57} />
    </g>
  ),

  M: () => (
    <g>
      <Palm />
      {/* Index, middle, ring folded over thumb */}
      <BentFinger cx={18} baseY={64} bendX={18} bendY={50} tipX={22} tipY={62} />
      <BentFinger cx={32} baseY={64} bendX={32} bendY={46} tipX={36} tipY={60} />
      <BentFinger cx={47} baseY={64} bendX={47} bendY={46} tipX={51} tipY={60} />
      {/* Pinky curled */}
      <BentFinger cx={62} baseY={64} bendX={62} bendY={50} tipX={65} tipY={60} />
      {/* Thumb tucked under, peeking */}
      <rect x={12} y={68} width={20} height={10} rx={5} fill={C.skin} stroke={C.line} strokeWidth="1.2" />
    </g>
  ),

  N: () => (
    <g>
      <Palm />
      {/* Index + middle folded over thumb */}
      <BentFinger cx={32} baseY={64} bendX={32} bendY={46} tipX={36} tipY={60} />
      <BentFinger cx={47} baseY={64} bendX={47} bendY={46} tipX={51} tipY={60} />
      {/* Ring + pinky curled */}
      <BentFinger cx={18} baseY={64} bendX={18} bendY={50} tipX={22} tipY={60} />
      <BentFinger cx={62} baseY={64} bendX={62} bendY={50} tipX={65} tipY={60} />
      {/* Thumb tucked */}
      <rect x={14} y={68} width={22} height={10} rx={5} fill={C.skin} stroke={C.line} strokeWidth="1.2" />
    </g>
  ),

  O: () => (
    <g>
      {/* O shape — all fingers curve to meet thumb */}
      <ellipse cx={42} cy={50} rx={30} ry={34} fill="none" stroke={C.skin} strokeWidth="18" />
      <ellipse cx={42} cy={50} rx={30} ry={34} fill="none" stroke={C.line} strokeWidth="1.5" />
      {/* Fill center */}
      <ellipse cx={42} cy={50} rx={12} ry={16} fill={C.mid} opacity="0.3" />
    </g>
  ),

  P: () => (
    // K rotated downward
    <g transform="rotate(180, 42, 50)">
      <Palm />
      <Finger cx={32} tipY={8} baseY={64} w={14} />
      <Finger cx={52} tipY={12} baseY={64} w={13} />
      <path d="M8,72 Q20,55 40,50" fill="none" stroke={C.skin} strokeWidth="13" strokeLinecap="round" />
      <BentFinger cx={62} baseY={64} bendX={62} bendY={50} tipX={65} tipY={58} />
      <BentFinger cx={76} baseY={64} bendX={76} bendY={52} tipX={78} tipY={60} />
    </g>
  ),

  Q: () => (
    // G rotated downward
    <g transform="rotate(90, 42, 50)">
      <Palm y={50} h={38} />
      <rect x={44} y={42} width={40} height={13} rx={6} fill={C.skin} stroke={C.line} strokeWidth="1.2" />
      <rect x={44} y={58} width={32} height={12} rx={6} fill={C.skin} stroke={C.line} strokeWidth="1.2" />
      <BentFinger cx={32} baseY={52} bendX={30} bendY={44} tipX={34} tipY={50} />
      <BentFinger cx={18} baseY={52} bendX={16} bendY={46} tipX={20} tipY={51} />
    </g>
  ),

  R: () => (
    <g>
      <Palm />
      {/* Index + middle crossed */}
      <Finger cx={38} tipY={8} baseY={64} w={13} />
      <Finger cx={50} tipY={10} baseY={64} w={13} />
      {/* Cross line */}
      <line x1={38} y1={30} x2={50} y2={22} stroke={C.dark} strokeWidth="3" strokeLinecap="round" />
      {/* Ring + pinky curled */}
      <BentFinger cx={18} baseY={64} bendX={18} bendY={50} tipX={22} tipY={58} />
      <BentFinger cx={62} baseY={64} bendX={62} bendY={50} tipX={65} tipY={58} />
      {/* Thumb */}
      <Thumb cx={8} cy={72} angle={-20} len={26} w={13} />
    </g>
  ),

  S: () => (
    <g>
      <Palm />
      {/* Fist */}
      <BentFinger cx={18} baseY={64} bendX={18} bendY={50} tipX={22} tipY={58} />
      <BentFinger cx={32} baseY={64} bendX={32} bendY={46} tipX={36} tipY={56} />
      <BentFinger cx={47} baseY={64} bendX={47} bendY={46} tipX={51} tipY={56} />
      <BentFinger cx={62} baseY={64} bendX={62} bendY={48} tipX={65} tipY={57} />
      {/* Thumb over fingers */}
      <rect x={10} y={52} width={46} height={13} rx={6} fill={C.skin} stroke={C.line} strokeWidth="1.2" />
      <rect x={10} y={54} width={8} height={8} rx={4} fill={C.nail} opacity="0.7" />
    </g>
  ),

  T: () => (
    <g>
      <Palm />
      {/* All fingers curled */}
      <BentFinger cx={18} baseY={64} bendX={18} bendY={50} tipX={22} tipY={58} />
      <BentFinger cx={32} baseY={64} bendX={32} bendY={46} tipX={36} tipY={56} />
      <BentFinger cx={47} baseY={64} bendX={47} bendY={46} tipX={51} tipY={56} />
      <BentFinger cx={62} baseY={64} bendX={62} bendY={48} tipX={65} tipY={57} />
      {/* Thumb peeking between index + middle */}
      <rect x={26} y={52} width={14} height={18} rx={6} fill={C.skin} stroke={C.line} strokeWidth="1.2" />
      <rect x={28} y={54} width={10} height={6} rx={3} fill={C.nail} opacity="0.7" />
    </g>
  ),

  U: () => (
    <g>
      <Palm />
      {/* Index + middle together up */}
      <Finger cx={38} tipY={8} baseY={64} w={13} />
      <Finger cx={52} tipY={8} baseY={64} w={13} />
      {/* Ring + pinky curled */}
      <BentFinger cx={18} baseY={64} bendX={18} bendY={50} tipX={22} tipY={58} />
      <BentFinger cx={66} baseY={64} bendX={66} bendY={50} tipX={68} tipY={58} />
      {/* Thumb */}
      <Thumb cx={8} cy={72} angle={-20} len={26} w={13} />
    </g>
  ),

  V: () => (
    <g>
      <Palm />
      {/* Index + middle spread in V */}
      <Finger cx={30} tipY={8} baseY={64} w={13} />
      <Finger cx={56} tipY={8} baseY={64} w={13} />
      {/* Ring + pinky curled */}
      <BentFinger cx={18} baseY={64} bendX={18} bendY={50} tipX={22} tipY={58} />
      <BentFinger cx={68} baseY={64} bendX={68} bendY={50} tipX={70} tipY={58} />
      {/* Thumb */}
      <Thumb cx={8} cy={72} angle={-20} len={26} w={13} />
    </g>
  ),

  W: () => (
    <g>
      <Palm />
      {/* Index, middle, ring spread */}
      <Finger cx={22} tipY={10} baseY={64} w={13} />
      <Finger cx={42} tipY={6}  baseY={64} w={14} />
      <Finger cx={62} tipY={10} baseY={64} w={13} />
      {/* Pinky curled */}
      <BentFinger cx={76} baseY={64} bendX={76} bendY={52} tipX={78} tipY={60} />
      {/* Thumb + pinky touch */}
      <Thumb cx={8} cy={72} angle={-15} len={26} w={13} />
    </g>
  ),

  X: () => (
    <g>
      <Palm />
      {/* Index hooked */}
      <path d="M38,64 Q38,44 50,38 Q58,34 56,46"
        fill="none" stroke={C.skin} strokeWidth="13" strokeLinecap="round" />
      {/* Other fingers curled */}
      <BentFinger cx={18} baseY={64} bendX={18} bendY={50} tipX={22} tipY={58} />
      <BentFinger cx={52} baseY={64} bendX={52} bendY={50} tipX={55} tipY={58} />
      <BentFinger cx={66} baseY={64} bendX={66} bendY={52} tipX={68} tipY={59} />
      {/* Thumb */}
      <Thumb cx={8} cy={72} angle={-20} len={26} w={13} />
    </g>
  ),

  Y: () => (
    <g>
      <Palm />
      {/* Pinky up */}
      <Finger cx={76} tipY={18} baseY={64} w={12} />
      {/* Thumb out */}
      <rect x={2} y={56} width={36} height={13} rx={6} fill={C.skin} stroke={C.line} strokeWidth="1.2" />
      <rect x={2} y={58} width={8} height={9} rx={4} fill={C.nail} opacity="0.7" />
      {/* Index, middle, ring curled */}
      <BentFinger cx={32} baseY={64} bendX={32} bendY={48} tipX={36} tipY={58} />
      <BentFinger cx={47} baseY={64} bendX={47} bendY={48} tipX={51} tipY={58} />
      <BentFinger cx={62} baseY={64} bendX={62} bendY={50} tipX={65} tipY={58} />
    </g>
  ),

  Z: () => (
    <g>
      <Palm />
      {/* Index up (like I) */}
      <Finger cx={32} tipY={8} baseY={64} w={14} />
      <BentFinger cx={18} baseY={64} bendX={18} bendY={50} tipX={22} tipY={58} />
      <BentFinger cx={47} baseY={64} bendX={47} bendY={48} tipX={51} tipY={57} />
      <BentFinger cx={62} baseY={64} bendX={62} bendY={50} tipX={65} tipY={58} />
      {/* Z motion path */}
      <path d="M26,14 L46,14 L26,30 L46,30" fill="none" stroke="#a0d040" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),

  // ── Number signs ────────────────────────────────────────────────────────────
  "1": () => (
    <g>
      <Palm />
      <Finger cx={42} tipY={8} baseY={64} w={14} />
      <BentFinger cx={18} baseY={64} bendX={18} bendY={50} tipX={22} tipY={58} />
      <BentFinger cx={32} baseY={64} bendX={32} bendY={48} tipX={36} tipY={57} />
      <BentFinger cx={57} baseY={64} bendX={57} bendY={48} tipX={60} tipY={57} />
      <BentFinger cx={72} baseY={64} bendX={72} bendY={50} tipX={74} tipY={58} />
      <Thumb cx={8} cy={72} angle={-20} len={26} w={13} />
    </g>
  ),

  "2": () => (
    <g>
      <Palm />
      <Finger cx={35} tipY={8} baseY={64} w={13} />
      <Finger cx={52} tipY={8} baseY={64} w={13} />
      <BentFinger cx={18} baseY={64} bendX={18} bendY={50} tipX={22} tipY={58} />
      <BentFinger cx={66} baseY={64} bendX={66} bendY={50} tipX={68} tipY={58} />
      <Thumb cx={8} cy={72} angle={-20} len={26} w={13} />
    </g>
  ),

  "3": () => (
    <g>
      <Palm />
      <Finger cx={28} tipY={8} baseY={64} w={13} />
      <Finger cx={44} tipY={8} baseY={64} w={13} />
      <Finger cx={60} tipY={10} baseY={64} w={12} />
      <BentFinger cx={18} baseY={64} bendX={18} bendY={50} tipX={22} tipY={58} />
      <BentFinger cx={74} baseY={64} bendX={74} bendY={52} tipX={76} tipY={60} />
      {/* Thumb out */}
      <rect x={2} y={58} width={30} height={12} rx={6} fill={C.skin} stroke={C.line} strokeWidth="1.2" />
    </g>
  ),

  "4": () => (
    <g>
      <Palm />
      <Finger cx={18} tipY={12} baseY={64} w={13} />
      <Finger cx={32} tipY={8} baseY={64} w={13} />
      <Finger cx={47} tipY={8} baseY={64} w={13} />
      <Finger cx={62} tipY={12} baseY={64} w={12} />
      {/* Thumb tucked */}
      <rect x={10} y={64} width={26} height={11} rx={5} fill={C.skin} stroke={C.line} strokeWidth="1.2" />
    </g>
  ),

  "5": () => (
    <g>
      <Palm />
      <Finger cx={18} tipY={12} baseY={64} w={13} />
      <Finger cx={32} tipY={8} baseY={64} w={14} />
      <Finger cx={47} tipY={8} baseY={64} w={14} />
      <Finger cx={62} tipY={12} baseY={64} w={13} />
      <Thumb cx={6} cy={72} angle={-15} len={30} w={14} />
    </g>
  ),

  "6": () => (
    <g>
      <Palm />
      <Finger cx={18} tipY={12} baseY={64} w={13} />
      <Finger cx={32} tipY={8} baseY={64} w={14} />
      <Finger cx={47} tipY={8} baseY={64} w={14} />
      {/* Pinky touches thumb */}
      <circle cx={62} cy={62} r={10} fill="none" stroke={C.skin} strokeWidth="10" />
      <circle cx={62} cy={62} r={10} fill="none" stroke={C.line} strokeWidth="1.5" />
      <Thumb cx={6} cy={72} angle={-15} len={30} w={14} />
    </g>
  ),

  "7": () => (
    <g>
      <Palm />
      <Finger cx={18} tipY={12} baseY={64} w={13} />
      <Finger cx={32} tipY={8} baseY={64} w={14} />
      {/* Ring touches thumb */}
      <circle cx={47} cy={62} r={10} fill="none" stroke={C.skin} strokeWidth="10" />
      <circle cx={47} cy={62} r={10} fill="none" stroke={C.line} strokeWidth="1.5" />
      <Finger cx={62} tipY={12} baseY={64} w={13} />
      <Thumb cx={6} cy={72} angle={-15} len={30} w={14} />
    </g>
  ),

  "8": () => (
    <g>
      <Palm />
      <Finger cx={18} tipY={12} baseY={64} w={13} />
      {/* Middle touches thumb */}
      <circle cx={32} cy={62} r={10} fill="none" stroke={C.skin} strokeWidth="10" />
      <circle cx={32} cy={62} r={10} fill="none" stroke={C.line} strokeWidth="1.5" />
      <Finger cx={47} tipY={8} baseY={64} w={14} />
      <Finger cx={62} tipY={12} baseY={64} w={13} />
      <Thumb cx={6} cy={72} angle={-15} len={30} w={14} />
    </g>
  ),

  "9": () => (
    <g>
      <Palm />
      {/* Index touches thumb — like F/O */}
      <circle cx={24} cy={56} r={12} fill="none" stroke={C.skin} strokeWidth="12" />
      <circle cx={24} cy={56} r={12} fill="none" stroke={C.line} strokeWidth="1.5" />
      <Finger cx={47} tipY={8} baseY={64} w={14} />
      <Finger cx={62} tipY={12} baseY={64} w={13} />
      <Finger cx={76} tipY={18} baseY={64} w={12} />
    </g>
  ),
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  letter?: string;
  sign?: string;
  size?: number;
  animate?: boolean;
}

// ─── Common ASL Sign shapes (two frames: start + end for movement) ────────────

const SIGNS: Record<string, { start: () => JSX.Element; end: () => JSX.Element; label: string }> = {

  hello: {
    label: "HELLO",
    start: () => (
      <g>
        <Palm x={8} y={30} w={68} h={38} />
        <Finger cx={18} tipY={4}  baseY={32} w={13} />
        <Finger cx={32} tipY={0}  baseY={32} w={14} />
        <Finger cx={47} tipY={0}  baseY={32} w={14} />
        <Finger cx={62} tipY={4}  baseY={32} w={13} />
        <Thumb cx={6} cy={42} angle={-15} len={26} w={13} />
        <ellipse cx={42} cy={8} rx={18} ry={6} fill="#a0d040" opacity="0.25" />
      </g>
    ),
    end: () => (
      <g>
        <Palm x={20} y={30} w={68} h={38} />
        <Finger cx={30} tipY={4}  baseY={32} w={13} />
        <Finger cx={44} tipY={0}  baseY={32} w={14} />
        <Finger cx={59} tipY={0}  baseY={32} w={14} />
        <Finger cx={74} tipY={4}  baseY={32} w={13} />
        <Thumb cx={18} cy={42} angle={-15} len={26} w={13} />
        <path d="M18,20 Q42,10 72,22" fill="none" stroke="#a0d040" strokeWidth="2.5" strokeDasharray="4,3" strokeLinecap="round" />
      </g>
    ),
  },

  "thank you": {
    label: "THANK YOU",
    start: () => (
      <g>
        <Palm x={8} y={50} w={68} h={38} />
        <Finger cx={18} tipY={24} baseY={52} w={13} />
        <Finger cx={32} tipY={20} baseY={52} w={14} />
        <Finger cx={47} tipY={20} baseY={52} w={14} />
        <Finger cx={62} tipY={24} baseY={52} w={13} />
        <Thumb cx={6} cy={62} angle={-15} len={26} w={13} />
        <circle cx={42} cy={18} r={5} fill="#a0d040" opacity="0.4" />
      </g>
    ),
    end: () => (
      <g>
        <Palm x={8} y={62} w={68} h={38} />
        <Finger cx={18} tipY={36} baseY={64} w={13} />
        <Finger cx={32} tipY={32} baseY={64} w={14} />
        <Finger cx={47} tipY={32} baseY={64} w={14} />
        <Finger cx={62} tipY={36} baseY={64} w={13} />
        <Thumb cx={6} cy={74} angle={-15} len={26} w={13} />
        <path d="M42,22 Q42,40 42,58" fill="none" stroke="#a0d040" strokeWidth="2.5" strokeDasharray="4,3" strokeLinecap="round" />
      </g>
    ),
  },

  please: {
    label: "PLEASE",
    start: () => (
      <g>
        <Palm x={8} y={30} w={68} h={38} />
        <Finger cx={18} tipY={4}  baseY={32} w={13} />
        <Finger cx={32} tipY={0}  baseY={32} w={14} />
        <Finger cx={47} tipY={0}  baseY={32} w={14} />
        <Finger cx={62} tipY={4}  baseY={32} w={13} />
        <Thumb cx={6} cy={42} angle={-15} len={26} w={13} />
        <path d="M42,20 Q70,30 60,55 Q50,75 20,65 Q0,50 15,28 Q28,12 42,20"
          fill="none" stroke="#a0d040" strokeWidth="2" strokeDasharray="4,3" opacity="0.7" />
      </g>
    ),
    end: () => (
      <g>
        <Palm x={8} y={50} w={68} h={38} />
        <Finger cx={18} tipY={24} baseY={52} w={13} />
        <Finger cx={32} tipY={20} baseY={52} w={14} />
        <Finger cx={47} tipY={20} baseY={52} w={14} />
        <Finger cx={62} tipY={24} baseY={52} w={13} />
        <Thumb cx={6} cy={62} angle={-15} len={26} w={13} />
        <path d="M42,20 Q70,30 60,55 Q50,75 20,65 Q0,50 15,28 Q28,12 42,20"
          fill="none" stroke="#a0d040" strokeWidth="2" strokeDasharray="4,3" opacity="0.7" />
      </g>
    ),
  },

  sorry: {
    label: "SORRY",
    start: () => (
      <g>
        <Palm x={8} y={30} w={68} h={38} />
        <BentFinger cx={18} baseY={32} bendX={18} bendY={22} tipX={22} tipY={28} />
        <BentFinger cx={32} baseY={32} bendX={32} bendY={18} tipX={36} tipY={26} />
        <BentFinger cx={47} baseY={32} bendX={47} bendY={18} tipX={51} tipY={26} />
        <BentFinger cx={62} baseY={32} bendX={62} bendY={20} tipX={65} tipY={27} />
        <rect x={2} y={22} width={14} height={18} rx={6} fill={C.skin} stroke={C.line} strokeWidth="1.2" />
        <path d="M42,18 Q70,28 60,53 Q50,73 20,63 Q0,48 15,26 Q28,10 42,18"
          fill="none" stroke="#a0d040" strokeWidth="2" strokeDasharray="4,3" opacity="0.7" />
      </g>
    ),
    end: () => (
      <g>
        <Palm x={8} y={50} w={68} h={38} />
        <BentFinger cx={18} baseY={52} bendX={18} bendY={42} tipX={22} tipY={48} />
        <BentFinger cx={32} baseY={52} bendX={32} bendY={38} tipX={36} tipY={46} />
        <BentFinger cx={47} baseY={52} bendX={47} bendY={38} tipX={51} tipY={46} />
        <BentFinger cx={62} baseY={52} bendX={62} bendY={40} tipX={65} tipY={47} />
        <rect x={2} y={42} width={14} height={18} rx={6} fill={C.skin} stroke={C.line} strokeWidth="1.2" />
        <path d="M42,18 Q70,28 60,53 Q50,73 20,63 Q0,48 15,26 Q28,10 42,18"
          fill="none" stroke="#a0d040" strokeWidth="2" strokeDasharray="4,3" opacity="0.7" />
      </g>
    ),
  },

  yes: {
    label: "YES",
    start: () => (
      <g>
        <Palm />
        <BentFinger cx={18} baseY={64} bendX={18} bendY={50} tipX={22} tipY={58} />
        <BentFinger cx={32} baseY={64} bendX={32} bendY={46} tipX={36} tipY={56} />
        <BentFinger cx={47} baseY={64} bendX={47} bendY={46} tipX={51} tipY={56} />
        <BentFinger cx={62} baseY={64} bendX={62} bendY={48} tipX={65} tipY={57} />
        <rect x={10} y={52} width={46} height={13} rx={6} fill={C.skin} stroke={C.line} strokeWidth="1.2" />
        <path d="M42,50 Q50,30 42,20" fill="none" stroke="#a0d040" strokeWidth="2.5" strokeDasharray="4,3" strokeLinecap="round" />
      </g>
    ),
    end: () => (
      <g>
        <Palm y={72} h={28} />
        <BentFinger cx={18} baseY={74} bendX={18} bendY={60} tipX={22} tipY={68} />
        <BentFinger cx={32} baseY={74} bendX={32} bendY={56} tipX={36} tipY={66} />
        <BentFinger cx={47} baseY={74} bendX={47} bendY={56} tipX={51} tipY={66} />
        <BentFinger cx={62} baseY={74} bendX={62} bendY={58} tipX={65} tipY={67} />
        <rect x={10} y={62} width={46} height={13} rx={6} fill={C.skin} stroke={C.line} strokeWidth="1.2" />
        <path d="M42,50 Q50,70 42,80" fill="none" stroke="#a0d040" strokeWidth="2.5" strokeDasharray="4,3" strokeLinecap="round" />
      </g>
    ),
  },

  no: {
    label: "NO",
    start: () => (
      <g>
        <Palm />
        <Finger cx={32} tipY={8}  baseY={64} w={14} />
        <Finger cx={47} tipY={10} baseY={64} w={13} />
        <BentFinger cx={18} baseY={64} bendX={18} bendY={50} tipX={22} tipY={58} />
        <BentFinger cx={62} baseY={64} bendX={62} bendY={50} tipX={65} tipY={58} />
        <Thumb cx={8} cy={72} angle={-20} len={26} w={13} />
      </g>
    ),
    end: () => (
      <g>
        <Palm />
        <BentFinger cx={32} baseY={64} bendX={32} bendY={52} tipX={38} tipY={66} />
        <BentFinger cx={47} baseY={64} bendX={47} bendY={52} tipX={42} tipY={66} />
        <BentFinger cx={18} baseY={64} bendX={18} bendY={50} tipX={22} tipY={58} />
        <BentFinger cx={62} baseY={64} bendX={62} bendY={50} tipX={65} tipY={58} />
        <path d="M8,72 Q20,60 38,66" fill="none" stroke={C.skin} strokeWidth="13" strokeLinecap="round" />
        <path d="M40,30 Q44,50 40,66" fill="none" stroke="#a0d040" strokeWidth="2" strokeDasharray="3,3" strokeLinecap="round" />
      </g>
    ),
  },

  help: {
    label: "HELP",
    start: () => (
      <g>
        <Palm x={4} y={70} w={76} h={28} />
        <Finger cx={14} tipY={44} baseY={72} w={12} />
        <Finger cx={28} tipY={40} baseY={72} w={13} />
        <Finger cx={42} tipY={40} baseY={72} w={13} />
        <Finger cx={56} tipY={44} baseY={72} w={12} />
        <Palm x={18} y={44} w={48} h={28} />
        <BentFinger cx={28} baseY={46} bendX={28} bendY={36} tipX={32} tipY={42} />
        <BentFinger cx={42} baseY={46} bendX={42} bendY={32} tipX={46} tipY={40} />
        <BentFinger cx={56} baseY={46} bendX={56} bendY={34} tipX={59} tipY={41} />
      </g>
    ),
    end: () => (
      <g>
        <Palm x={4} y={52} w={76} h={28} />
        <Finger cx={14} tipY={26} baseY={54} w={12} />
        <Finger cx={28} tipY={22} baseY={54} w={13} />
        <Finger cx={42} tipY={22} baseY={54} w={13} />
        <Finger cx={56} tipY={26} baseY={54} w={12} />
        <Palm x={18} y={26} w={48} h={28} />
        <BentFinger cx={28} baseY={28} bendX={28} bendY={18} tipX={32} tipY={24} />
        <BentFinger cx={42} baseY={28} bendX={42} bendY={14} tipX={46} tipY={22} />
        <BentFinger cx={56} baseY={28} bendX={56} bendY={16} tipX={59} tipY={23} />
        <path d="M42,60 L42,20" fill="none" stroke="#a0d040" strokeWidth="2.5" strokeDasharray="4,3" strokeLinecap="round" />
        <path d="M36,26 L42,18 L48,26" fill="none" stroke="#a0d040" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ),
  },

  good: {
    label: "GOOD",
    start: () => (
      <g>
        <Palm x={8} y={50} w={68} h={38} />
        <Finger cx={18} tipY={24} baseY={52} w={13} />
        <Finger cx={32} tipY={20} baseY={52} w={14} />
        <Finger cx={47} tipY={20} baseY={52} w={14} />
        <Finger cx={62} tipY={24} baseY={52} w={13} />
        <Thumb cx={6} cy={62} angle={-15} len={26} w={13} />
        <circle cx={42} cy={16} r={5} fill="#a0d040" opacity="0.4" />
      </g>
    ),
    end: () => (
      <g>
        <Palm x={4} y={68} w={76} h={28} />
        <Finger cx={14} tipY={42} baseY={70} w={12} />
        <Finger cx={28} tipY={38} baseY={70} w={13} />
        <Finger cx={56} tipY={42} baseY={70} w={12} />
        <Palm x={14} y={50} w={56} h={22} />
        <Finger cx={24} tipY={28} baseY={52} w={12} />
        <Finger cx={38} tipY={24} baseY={52} w={13} />
        <Finger cx={52} tipY={24} baseY={52} w={13} />
        <Finger cx={64} tipY={28} baseY={52} w={12} />
        <path d="M42,18 Q42,36 42,52" fill="none" stroke="#a0d040" strokeWidth="2.5" strokeDasharray="4,3" strokeLinecap="round" />
      </g>
    ),
  },

  love: {
    label: "LOVE",
    start: () => (
      <g>
        <rect x={4} y={30} width={30} height={60} rx={12} fill={C.mid} stroke={C.line} strokeWidth="1.2" />
        <Palm x={4} y={20} w={30} h={20} />
        <rect x={50} y={30} width={30} height={60} rx={12} fill={C.mid} stroke={C.line} strokeWidth="1.2" />
        <Palm x={50} y={20} w={30} h={20} />
        <path d="M42,55 Q42,45 35,45 Q28,45 28,53 Q28,60 42,70 Q56,60 56,53 Q56,45 49,45 Q42,45 42,55"
          fill="#e05050" opacity="0.3" />
      </g>
    ),
    end: () => (
      <g>
        <rect x={10} y={20} width={30} height={70} rx={12} fill={C.mid} stroke={C.line} strokeWidth="1.2" transform="rotate(-20,25,55)" />
        <rect x={44} y={20} width={30} height={70} rx={12} fill={C.skin} stroke={C.line} strokeWidth="1.2" transform="rotate(20,59,55)" />
        <path d="M42,50 Q42,38 34,38 Q26,38 26,47 Q26,56 42,68 Q58,56 58,47 Q58,38 50,38 Q42,38 42,50"
          fill="#e05050" opacity="0.5" />
        <path d="M20,35 Q30,20 42,30 Q54,20 64,35" fill="none" stroke="#a0d040" strokeWidth="2" strokeDasharray="3,3" strokeLinecap="round" />
      </g>
    ),
  },

  water: {
    label: "WATER",
    start: () => (
      <g>
        <Palm />
        <Finger cx={22} tipY={10} baseY={64} w={13} />
        <Finger cx={42} tipY={6}  baseY={64} w={14} />
        <Finger cx={62} tipY={10} baseY={64} w={13} />
        <BentFinger cx={76} baseY={64} bendX={76} bendY={52} tipX={78} tipY={60} />
        <Thumb cx={8} cy={72} angle={-15} len={26} w={13} />
      </g>
    ),
    end: () => (
      <g>
        <Palm y={50} h={38} />
        <Finger cx={22} tipY={26} baseY={52} w={13} />
        <Finger cx={42} tipY={22} baseY={52} w={14} />
        <Finger cx={62} tipY={26} baseY={52} w={13} />
        <BentFinger cx={76} baseY={52} bendX={76} bendY={44} tipX={78} tipY={50} />
        <Thumb cx={8} cy={62} angle={-15} len={26} w={13} />
        <circle cx={42} cy={18} r={6} fill="#a0d040" opacity="0.4" />
        <path d="M42,24 L42,18" fill="none" stroke="#a0d040" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    ),
  },

  more: {
    label: "MORE",
    start: () => (
      <g>
        <circle cx={22} cy={50} r={16} fill="none" stroke={C.skin} strokeWidth="14" />
        <circle cx={22} cy={50} r={16} fill="none" stroke={C.line} strokeWidth="1.5" />
        <circle cx={62} cy={50} r={16} fill="none" stroke={C.skin} strokeWidth="14" />
        <circle cx={62} cy={50} r={16} fill="none" stroke={C.line} strokeWidth="1.5" />
        <path d="M38,50 L46,50" fill="none" stroke="#a0d040" strokeWidth="2.5" strokeDasharray="3,2" strokeLinecap="round" />
      </g>
    ),
    end: () => (
      <g>
        <circle cx={28} cy={50} r={16} fill="none" stroke={C.skin} strokeWidth="14" />
        <circle cx={28} cy={50} r={16} fill="none" stroke={C.line} strokeWidth="1.5" />
        <circle cx={56} cy={50} r={16} fill="none" stroke={C.skin} strokeWidth="14" />
        <circle cx={56} cy={50} r={16} fill="none" stroke={C.line} strokeWidth="1.5" />
        <circle cx={42} cy={50} r={4} fill="#a0d040" opacity="0.7" />
      </g>
    ),
  },

  stop: {
    label: "STOP",
    start: () => (
      <g>
        <Palm x={4} y={60} w={76} h={30} />
        <Finger cx={14} tipY={34} baseY={62} w={12} />
        <Finger cx={28} tipY={30} baseY={62} w={13} />
        <Finger cx={42} tipY={30} baseY={62} w={13} />
        <Finger cx={56} tipY={34} baseY={62} w={12} />
        <Palm x={20} y={10} w={56} h={30} />
        <Finger cx={30} tipY={-10} baseY={12} w={12} />
        <Finger cx={44} tipY={-14} baseY={12} w={13} />
        <Finger cx={58} tipY={-10} baseY={12} w={12} />
        <path d="M42,10 L42,40" fill="none" stroke="#a0d040" strokeWidth="2.5" strokeDasharray="4,3" strokeLinecap="round" />
        <path d="M36,38 L42,46 L48,38" fill="none" stroke="#a0d040" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ),
    end: () => (
      <g>
        <Palm x={4} y={60} w={76} h={30} />
        <Finger cx={14} tipY={34} baseY={62} w={12} />
        <Finger cx={28} tipY={30} baseY={62} w={13} />
        <Finger cx={42} tipY={30} baseY={62} w={13} />
        <Finger cx={56} tipY={34} baseY={62} w={12} />
        <rect x={30} y={38} width={56} height={24} rx={10} fill={C.skin} stroke={C.line} strokeWidth="1.2" transform="rotate(-90,58,50)" />
        <path d="M36,58 L30,52" fill="none" stroke="#a0d040" strokeWidth="2" strokeLinecap="round" />
        <path d="M42,58 L42,50" fill="none" stroke="#a0d040" strokeWidth="2" strokeLinecap="round" />
        <path d="M48,58 L54,52" fill="none" stroke="#a0d040" strokeWidth="2" strokeLinecap="round" />
      </g>
    ),
  },

  friend: {
    label: "FRIEND",
    start: () => (
      <g>
        <Palm x={8} y={40} w={68} h={38} />
        <path d="M38,40 Q38,24 50,20 Q58,18 56,30" fill="none" stroke={C.skin} strokeWidth="13" strokeLinecap="round" />
        <path d="M38,56 Q38,70 50,74 Q58,76 56,64" fill="none" stroke={C.mid} strokeWidth="13" strokeLinecap="round" />
        <circle cx={50} cy={48} r={5} fill="#a0d040" opacity="0.5" />
      </g>
    ),
    end: () => (
      <g>
        <Palm x={8} y={40} w={68} h={38} />
        <path d="M38,40 Q38,24 50,20 Q58,18 56,30" fill="none" stroke={C.mid} strokeWidth="13" strokeLinecap="round" />
        <path d="M38,56 Q38,70 50,74 Q58,76 56,64" fill="none" stroke={C.skin} strokeWidth="13" strokeLinecap="round" />
        <path d="M28,48 Q42,38 56,48" fill="none" stroke="#a0d040" strokeWidth="2" strokeDasharray="3,3" strokeLinecap="round" />
        <path d="M50,44 L56,48 L50,52" fill="none" stroke="#a0d040" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ),
  },
};

export function HandshapeGif({ letter, sign, size = 60, animate = true }: Props) {
  injectStyles();

  // ── Sign mode ──────────────────────────────────────────────────────────────
  if (sign) {
    const key = sign.toLowerCase().trim();
    const signData = SIGNS[key];
    if (!signData) return <span style={{ fontSize: size * 0.5, lineHeight: 1 }}>🤟</span>;

    const dur = "2.8s";
    const startStyle: React.CSSProperties = animate
      ? { animation: `asl-palm-out ${dur} ease-in-out infinite` }
      : { opacity: 1 };
    const endStyle: React.CSSProperties = animate
      ? { animation: `asl-sign-in ${dur} ease-in-out infinite` }
      : { opacity: 0 };

    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 84 100"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={`ASL sign for ${signData.label}`}
        style={{ display: "inline-block", verticalAlign: "middle" }}
      >
        <g style={startStyle}><signData.start /></g>
        <g style={endStyle}><signData.end /></g>
      </svg>
    );
  }

  // ── Letter mode ────────────────────────────────────────────────────────────
  const key = (letter ?? "").toUpperCase();
  const Shape = LETTERS[key];
  if (!Shape) return <span style={{ fontSize: size * 0.5, lineHeight: 1 }}>✋</span>;

  const dur = "2.4s";
  const palmStyle: React.CSSProperties = animate
    ? { animation: `asl-palm-out ${dur} ease-in-out infinite` }
    : { opacity: 0 };
  const signStyle: React.CSSProperties = animate
    ? { animation: `asl-sign-in ${dur} ease-in-out infinite` }
    : { opacity: 1 };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 84 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`ASL letter ${letter}`}
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      {/* Open palm fades out */}
      <g style={palmStyle}>
        <OpenPalm />
      </g>
      {/* Letter shape fades in */}
      <g style={signStyle}>
        <Shape />
      </g>
    </svg>
  );
}
