/**
 * Minecraft-style sound feedback using Web Audio API.
 * No external files needed — all sounds are synthesized.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function playTone(
  freq: number,
  type: OscillatorType,
  duration: number,
  gainVal: number,
  freqEnd?: number,
) {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (freqEnd !== undefined) {
      osc.frequency.linearRampToValueAtTime(freqEnd, ac.currentTime + duration);
    }
    gain.gain.setValueAtTime(gainVal, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + duration);
  } catch (_) {}
}

/** Correct sign detected — bright Minecraft "ding" */
export function playCorrect() {
  playTone(880, "square", 0.08, 0.15);
  setTimeout(() => playTone(1320, "square", 0.12, 0.12), 60);
}

/** Wrong answer / timeout — low buzz */
export function playWrong() {
  playTone(180, "sawtooth", 0.18, 0.12, 120);
}

/** Letter detected (soft tick) */
export function playTick() {
  playTone(660, "square", 0.05, 0.06);
}

/** Achievement unlocked — ascending fanfare */
export function playAchievement() {
  [523, 659, 784, 1047].forEach((f, i) => {
    setTimeout(() => playTone(f, "square", 0.15, 0.1), i * 80);
  });
}

/** Streak milestone */
export function playStreak() {
  playTone(440, "square", 0.06, 0.1);
  setTimeout(() => playTone(550, "square", 0.06, 0.1), 50);
  setTimeout(() => playTone(660, "square", 0.1, 0.12), 100);
}

/** UI click */
export function playClick() {
  playTone(400, "square", 0.04, 0.07);
}
