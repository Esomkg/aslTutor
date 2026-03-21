// Shared localStorage utilities

export const KEYS = {
  HIGH_SCORES: "asl_highscores",
  ACHIEVEMENTS: "asl_achievements",
  PRACTICED_LETTERS: "asl_practiced",
  DAILY_CHALLENGE: "asl_daily",
  SETTINGS: "asl_settings",
  SESSION_HISTORY: "asl_session_history",
};

export interface ScoreEntry {
  score: number;
  mode: string;
  date: string;
  difficulty?: string;
}

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  unlockedAt?: string;
}

export const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: "first_sign",    icon: "✋", title: "First Sign",     desc: "Complete your first game" },
  { id: "streak_5",      icon: "🔥", title: "On Fire",        desc: "Get a 5-letter streak" },
  { id: "streak_10",     icon: "⚡", title: "Lightning",      desc: "Get a 10-letter streak" },
  { id: "perfect_game",  icon: "⭐", title: "Perfect Game",   desc: "Finish with no lives lost" },
  { id: "century",       icon: "💯", title: "Century",        desc: "Score 100+ points" },
  { id: "daily_done",    icon: "📅", title: "Daily Grind",    desc: "Complete a daily challenge" },
  { id: "hard_mode",     icon: "💀", title: "Hardcore",       desc: "Win a game on Hard difficulty" },
  { id: "word_master",   icon: "📖", title: "Word Master",    desc: "Complete a full word in Word Mode" },
  { id: "all_letters",   icon: "🏆", title: "Alphabet Hero",  desc: "Practice all 26 letters" },
  { id: "quiz_ace",      icon: "🎓", title: "Quiz Ace",       desc: "Get 5 correct in a row in Quiz Mode" },
];

export function getAchievements(): Achievement[] {
  try {
    const saved = JSON.parse(localStorage.getItem(KEYS.ACHIEVEMENTS) || "{}") as Record<string, string>;
    return ALL_ACHIEVEMENTS.map(a => ({ ...a, unlockedAt: saved[a.id] }));
  } catch { return ALL_ACHIEVEMENTS; }
}

export function unlockAchievement(id: string): boolean {
  try {
    const saved = JSON.parse(localStorage.getItem(KEYS.ACHIEVEMENTS) || "{}") as Record<string, string>;
    if (saved[id]) return false; // already unlocked
    saved[id] = new Date().toISOString();
    localStorage.setItem(KEYS.ACHIEVEMENTS, JSON.stringify(saved));
    return true;
  } catch { return false; }
}

export function getPracticedLetters(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEYS.PRACTICED_LETTERS) || "[]"));
  } catch { return new Set(); }
}

export function markLetterPracticed(letter: string) {
  const set = getPracticedLetters();
  set.add(letter);
  localStorage.setItem(KEYS.PRACTICED_LETTERS, JSON.stringify([...set]));
}

export interface DailyChallenge {
  date: string;       // YYYY-MM-DD
  letters: string[];  // 5 letters seeded by date
  completed: boolean;
  score: number;
}

function dateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

export function getDailyChallenge(): DailyChallenge {
  const today = dateKey();
  try {
    const saved = JSON.parse(localStorage.getItem(KEYS.DAILY_CHALLENGE) || "null");
    if (saved?.date === today) return saved;
  } catch {}
  // Generate deterministic letters from today's date
  const seed = parseInt(today.replace(/-/g, ""), 10);
  const rng = seededRandom(seed);
  const pool = "ABCDEFGHIKLMNOPQRSTUVWXY".split("");
  const letters: string[] = [];
  while (letters.length < 5) {
    const l = pool[Math.floor(rng() * pool.length)];
    if (!letters.includes(l)) letters.push(l);
  }
  return { date: today, letters, completed: false, score: 0 };
}

export function saveDailyChallenge(challenge: DailyChallenge) {
  localStorage.setItem(KEYS.DAILY_CHALLENGE, JSON.stringify(challenge));
}

export interface SessionHistoryEntry {
  sign: string;
  timestamp: number;
}

export function getSessionHistory(): SessionHistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(KEYS.SESSION_HISTORY) || "[]"); } catch { return []; }
}

export function addToSessionHistory(sign: string) {
  const h = getSessionHistory();
  h.push({ sign, timestamp: Date.now() });
  localStorage.setItem(KEYS.SESSION_HISTORY, JSON.stringify(h.slice(-100)));
}

export function clearSessionHistory() {
  localStorage.setItem(KEYS.SESSION_HISTORY, "[]");
}

// ---------------------------------------------------------------------------
// Supabase sync helpers
// Call schedulePush (from useAuth) after any of these writes when logged in.
// ---------------------------------------------------------------------------

export function saveHighScore(entry: ScoreEntry) {
  try {
    const scores: ScoreEntry[] = JSON.parse(localStorage.getItem(KEYS.HIGH_SCORES) || "[]");
    scores.push(entry);
    // Keep top 20 per mode, sorted by score desc
    const sorted = scores.sort((a, b) => b.score - a.score).slice(0, 20);
    localStorage.setItem(KEYS.HIGH_SCORES, JSON.stringify(sorted));
  } catch {}
}

export function getHighScores(): ScoreEntry[] {
  try { return JSON.parse(localStorage.getItem(KEYS.HIGH_SCORES) || "[]"); } catch { return []; }
}

// ---------------------------------------------------------------------------
// Daily streak tracking
// ---------------------------------------------------------------------------

export interface StreakData {
  current: number;      // current consecutive days
  longest: number;      // all-time best
  lastPracticed: string; // YYYY-MM-DD
}

const STREAK_KEY = "asl_streak";

export function getStreak(): StreakData {
  try {
    return JSON.parse(localStorage.getItem(STREAK_KEY) || "null") ?? { current: 0, longest: 0, lastPracticed: "" };
  } catch {
    return { current: 0, longest: 0, lastPracticed: "" };
  }
}

export function recordPracticeToday(): StreakData {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const s = getStreak();
  if (s.lastPracticed === today) return s; // already recorded today
  const newCurrent = s.lastPracticed === yesterday ? s.current + 1 : 1;
  const updated: StreakData = {
    current: newCurrent,
    longest: Math.max(newCurrent, s.longest),
    lastPracticed: today,
  };
  localStorage.setItem(STREAK_KEY, JSON.stringify(updated));
  return updated;
}

export function hasNotPracticedToday(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return getStreak().lastPracticed !== today;
}

// ---------------------------------------------------------------------------
// Miss history — aggregated from game results for AI agent context
// ---------------------------------------------------------------------------

export interface MissEntry {
  letter: string;
  misses: number;
  hits: number;
}

const MISS_KEY = "asl_miss_history";

/** Called at end of every game with the round results. */
export function recordGameResult(results: { letter: string; success: boolean }[]) {
  try {
    const stored: Record<string, { misses: number; hits: number }> =
      JSON.parse(localStorage.getItem(MISS_KEY) || "{}");
    for (const r of results) {
      if (!stored[r.letter]) stored[r.letter] = { misses: 0, hits: 0 };
      if (r.success) stored[r.letter].hits += 1;
      else stored[r.letter].misses += 1;
    }
    localStorage.setItem(MISS_KEY, JSON.stringify(stored));
  } catch {}
}

export function getMissedLetters(): MissEntry[] {
  try {
    const stored: Record<string, { misses: number; hits: number }> =
      JSON.parse(localStorage.getItem(MISS_KEY) || "{}");
    return Object.entries(stored)
      .map(([letter, v]) => ({ letter, misses: v.misses, hits: v.hits }))
      .filter(e => e.misses > 0)
      .sort((a, b) => b.misses - a.misses);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Number practice tracking (digits 1–9)
// ---------------------------------------------------------------------------

const PRACTICED_NUMBERS_KEY = "asl_practiced_numbers";

export function getPracticedNumbers(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(PRACTICED_NUMBERS_KEY) || "[]"));
  } catch { return new Set(); }
}

export function markNumberPracticed(digit: string) {
  const set = getPracticedNumbers();
  set.add(digit);
  localStorage.setItem(PRACTICED_NUMBERS_KEY, JSON.stringify([...set]));
}

// ---------------------------------------------------------------------------
// Number practice result tracking (digits 1–9)
// ---------------------------------------------------------------------------

export interface NumberStatEntry {
  digit: string;
  correct: number;
  attempts: number;
}

const NUMBER_STATS_KEY = "asl_number_stats";

export function getNumberStats(): Record<string, NumberStatEntry> {
  try {
    return JSON.parse(localStorage.getItem(NUMBER_STATS_KEY) || "{}");
  } catch { return {}; }
}

/** Call when a number practice session completes (correct = true means they held the sign). */
export function recordNumberResult(digit: string, correct: boolean) {
  try {
    const stats = getNumberStats();
    if (!stats[digit]) stats[digit] = { digit, correct: 0, attempts: 0 };
    stats[digit].attempts += 1;
    if (correct) stats[digit].correct += 1;
    localStorage.setItem(NUMBER_STATS_KEY, JSON.stringify(stats));
  } catch {}
}
