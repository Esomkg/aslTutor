import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AchievementToast } from "../components/AchievementToast";
import { MinecraftCompletion } from "../components/MinecraftCompletion";
import { useAuth } from "../context/AuthContext";
import {
  ScoreEntry, Achievement,
  getAchievements, unlockAchievement, ALL_ACHIEVEMENTS,
  getDailyChallenge, saveDailyChallenge, DailyChallenge,
  KEYS, recordPracticeToday, recordGameResult, getMissedLetters,
} from "../utils/storage";
import { playCorrect, playWrong, playAchievement, playStreak } from "../utils/sounds";

const LETTERS = "ABCDEFGHIKLMNOPQRSTUVWXY".split("");
const WORDS = ["CAT","DOG","BAT","CAN","HAM","FAN","BIG","CUP","HEN","MAP","NAP","OAK","PIG","RAN","SAP","TAN","VAN","WAX","YAK","FIG","GUM","HIP","KIT","LAP","MOP"];
const REQUIRED_HITS = 4;
const TOTAL_ROUNDS = 10;
const WS_BASE = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000";

type Phase = "intro" | "playing" | "result";
type GameMode = "sprint" | "word" | "daily";
type Difficulty = "easy" | "normal" | "hard";

const DIFF_CONFIG: Record<Difficulty, { time: number; wordTime: number; label: string; color: string }> = {
  easy:   { time: 18, wordTime: 20, label: "Easy",   color: "#5a8a1a" },
  normal: { time: 12, wordTime: 15, label: "Normal",  color: "#8a8a1a" },
  hard:   { time: 7,  wordTime: 9,  label: "Hard",    color: "#8a2a1a" },
};

function pickLetter(exclude?: string): string {
  const pool = LETTERS.filter(l => l !== exclude);
  // Spaced repetition: weight missed letters 3x more likely to appear
  const missData = getMissedLetters();
  const missMap: Record<string, number> = {};
  for (const m of missData) missMap[m.letter] = m.misses;
  const weighted: string[] = [];
  for (const l of pool) {
    const weight = 1 + Math.min((missMap[l] ?? 0) * 2, 6); // max 7x weight
    for (let i = 0; i < weight; i++) weighted.push(l);
  }
  return weighted[Math.floor(Math.random() * weighted.length)];
}
function pickWord(): string {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}
function getScores(): ScoreEntry[] {
  try { return JSON.parse(localStorage.getItem(KEYS.HIGH_SCORES) || "[]"); } catch { return []; }
}
function saveScore(entry: ScoreEntry) {
  const scores = [...getScores(), entry].sort((a, b) => b.score - a.score).slice(0, 5);
  localStorage.setItem(KEYS.HIGH_SCORES, JSON.stringify(scores));
}

// ── Pixel heart ──────────────────────────────────────────────────────────────
function Heart({ state }: { state: "full" | "losing" | "empty" }) {
  const color = state === "empty" ? "#3a1a1a" : "#e03030";
  const border = state === "empty" ? "#5a2a2a" : "#ff6060";
  const animStyle: React.CSSProperties = state === "losing"
    ? { animation: "heartLose 0.7s ease-out forwards", display: "inline-block" }
    : { display: "inline-block" };
  return (
    <span style={animStyle}>
      <svg width="28" height="28" viewBox="0 0 16 16" style={{ imageRendering: "pixelated" }}>
        <rect x="2" y="4" width="4" height="2" fill={border} />
        <rect x="10" y="4" width="4" height="2" fill={border} />
        <rect x="1" y="5" width="6" height="5" fill={border} />
        <rect x="9" y="5" width="6" height="5" fill={border} />
        <rect x="0" y="6" width="16" height="4" fill={border} />
        <rect x="1" y="10" width="14" height="2" fill={border} />
        <rect x="2" y="12" width="12" height="2" fill={border} />
        <rect x="4" y="14" width="8" height="1" fill={border} />
        <rect x="6" y="15" width="4" height="1" fill={border} />
        <rect x="2" y="5" width="4" height="1" fill={color} />
        <rect x="10" y="5" width="4" height="1" fill={color} />
        <rect x="1" y="6" width="14" height="4" fill={color} />
        <rect x="2" y="10" width="12" height="2" fill={color} />
        <rect x="3" y="12" width="10" height="2" fill={color} />
        <rect x="5" y="14" width="6" height="1" fill={color} />
        <rect x="7" y="15" width="2" height="1" fill={color} />
      </svg>
    </span>
  );
}

function HeartsDisplay({ lives, prevLives }: { lives: number; prevLives: number }) {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {[0, 1, 2].map(i => {
        const isLosing = i === lives && prevLives > lives;
        const state = i < lives ? "full" : isLosing ? "losing" : "empty";
        return <Heart key={i} state={state} />;
      })}
    </div>
  );
}

function McBtn({ children, onClick, disabled, color = "green" }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
  color?: "green" | "stone" | "red" | "purple" | "gold";
}) {
  const colors = {
    green:  { bg: "#5a7a1a", border: "#8ab828", shadow: "#3a5010", text: "#f0ffe0" },
    stone:  { bg: "#5a5a5a", border: "#8a8a8a", shadow: "#2a2a2a", text: "#f0f0f0" },
    red:    { bg: "#7a1a1a", border: "#c84a4a", shadow: "#3a0a0a", text: "#ffe0e0" },
    purple: { bg: "#5a1a7a", border: "#9a4ac8", shadow: "#2a0a3a", text: "#f0d0ff" },
    gold:   { bg: "#7a6010", border: "#c8a030", shadow: "#3a2a08", text: "#fff8d0" },
  };
  const c = colors[color];
  return (
    <button className="mc-btn" onClick={onClick} disabled={disabled} style={{
      background: c.bg, color: c.text,
      border: `3px solid ${c.border}`,
      boxShadow: `inset -3px -3px 0 ${c.shadow}, inset 3px 3px 0 rgba(255,255,255,0.15)`,
      padding: "10px 18px", fontSize: 9, letterSpacing: 1,
    }}>
      {children}
    </button>
  );
}

export default function GamePage() {
  const navigate = useNavigate();
  const { schedulePush } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sendingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [phase, setPhase] = useState<Phase>("intro");
  const [gameMode, setGameMode] = useState<GameMode>("sprint");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [prevLives, setPrevLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(12);
  const [hits, setHits] = useState(0);
  const [detected, setDetected] = useState<string | null>(null);
  const [targetLetter, setTargetLetter] = useState("");
  const [currentWord, setCurrentWord] = useState("");
  const [wordProgress, setWordProgress] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "timeout" | null>(null);
  const [results, setResults] = useState<{ letter: string; success: boolean }[]>([]);
  const [camReady, setCamReady] = useState(false);
  const [highScores, setHighScores] = useState<ScoreEntry[]>(getScores());
  const [achievements, setAchievements] = useState<Achievement[]>(getAchievements());
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [daily, setDaily] = useState<DailyChallenge>(getDailyChallenge());
  const [dailyIdx, setDailyIdx] = useState(0);
  const [tab, setTab] = useState<"modes" | "achievements">("modes");

  const hitsRef = useRef(0);
  const targetRef = useRef("");
  const livesRef = useRef(3);
  const roundRef = useRef(0);
  const scoreRef = useRef(0);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const resultsRef = useRef<{ letter: string; success: boolean }[]>([]);
  const feedbackActiveRef = useRef(false);
  const gameModeRef = useRef<GameMode>("sprint");
  const difficultyRef = useRef<Difficulty>("normal");
  const currentWordRef = useRef("");
  const wordProgressRef = useRef(0);
  const timeLeftRef = useRef(12);
  const dailyIdxRef = useRef(0);
  const dailyRef = useRef<DailyChallenge>(getDailyChallenge());

  function tryUnlock(id: string) {
    const unlocked = unlockAchievement(id);
    if (unlocked) {
      const a = ALL_ACHIEVEMENTS.find(x => x.id === id)!;
      setNewAchievement(a);
      setAchievements(getAchievements());
      playAchievement();
    }
  }

  useEffect(() => {
    const sessionId = "game-" + Math.random().toString(36).slice(2);
    let dead = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
        if (dead) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        const ws = new WebSocket(WS_BASE + "/ws/practice/" + sessionId);
        wsRef.current = ws;
        ws.onopen = () => { if (!dead) setCamReady(true); };
        ws.onmessage = (evt) => {
          sendingRef.current = false;
          if (dead || feedbackActiveRef.current) return;
          try {
            const data = JSON.parse(evt.data);
            const letter: string | null = data.letter ?? null;
            setDetected(letter);
            if (letter && letter === targetRef.current) {
              hitsRef.current = Math.min(hitsRef.current + 1, REQUIRED_HITS);
              setHits(hitsRef.current);
              if (hitsRef.current >= REQUIRED_HITS) handleSuccess();
            } else {
              hitsRef.current = Math.max(0, hitsRef.current - 1);
              setHits(hitsRef.current);
            }
          } catch (_) {}
        };
        ws.onerror = () => {};
        ws.onclose = () => {};
        startVideoLoop();
      } catch (_) {}
    })();
    return () => {
      dead = true;
      cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      wsRef.current?.close();
    };
  }, []);

  function startVideoLoop() {
    function loop() {
      const vid = videoRef.current, cvs = canvasRef.current;
      if (!vid || !cvs || vid.readyState < 2) { rafRef.current = requestAnimationFrame(loop); return; }
      const ctx = cvs.getContext("2d");
      if (!ctx) return;
      cvs.width = vid.videoWidth; cvs.height = vid.videoHeight;
      ctx.save(); ctx.translate(cvs.width, 0); ctx.scale(-1, 1); ctx.drawImage(vid, 0, 0); ctx.restore();
      if (!sendingRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
        sendingRef.current = true;
        cvs.toBlob(blob => {
          if (!blob || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) { sendingRef.current = false; return; }
          const reader = new FileReader();
          reader.onload = () => {
            const b64 = (reader.result as string).split(",")[1];
            wsRef.current!.send(JSON.stringify({ type: "frame", frameData: b64 }));
          };
          reader.readAsDataURL(blob);
        }, "image/jpeg", 0.65);
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
  }

  const startRound = useCallback((roundNum: number, prevLetter?: string) => {
    const mode = gameModeRef.current;
    const diff = difficultyRef.current;
    const cfg = DIFF_CONFIG[diff];
    const totalRounds = mode === "daily" ? dailyRef.current.letters.length : TOTAL_ROUNDS;
    if (roundNum >= totalRounds) { endGame(); return; }

    let letter: string;
    if (mode === "daily") {
      letter = dailyRef.current.letters[dailyIdxRef.current];
    } else if (mode === "word") {
      const wp = wordProgressRef.current;
      if (wp === 0 || wp >= currentWordRef.current.length) {
        const word = pickWord();
        currentWordRef.current = word;
        wordProgressRef.current = 0;
        setCurrentWord(word);
        setWordProgress(0);
      }
      letter = currentWordRef.current[wordProgressRef.current];
    } else {
      letter = pickLetter(prevLetter);
    }

    const timeLimit = mode === "word" ? cfg.wordTime : cfg.time;
    targetRef.current = letter;
    hitsRef.current = 0;
    feedbackActiveRef.current = false;
    timeLeftRef.current = timeLimit;
    setTargetLetter(letter);
    setHits(0);
    setDetected(null);
    setFeedback(null);
    setTimeLeft(timeLimit);
    setRound(roundNum);
    if (timerRef.current) clearInterval(timerRef.current);
    let t = timeLimit;
    timerRef.current = setInterval(() => {
      t--;
      timeLeftRef.current = t;
      setTimeLeft(t);
      if (t <= 0) { if (timerRef.current) clearInterval(timerRef.current); handleTimeout(); }
    }, 1000);
  }, []);

  function handleSuccess() {
    if (feedbackActiveRef.current) return;
    feedbackActiveRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    const pts = 10 + Math.max(0, timeLeftRef.current) * 2;
    scoreRef.current += pts;
    streakRef.current += 1;
    if (streakRef.current > bestStreakRef.current) { bestStreakRef.current = streakRef.current; setBestStreak(streakRef.current); }
    resultsRef.current = [...resultsRef.current, { letter: targetRef.current, success: true }];
    setScore(scoreRef.current);
    setStreak(streakRef.current);
    setFeedback("correct");
    setResults([...resultsRef.current]);
    // Sounds
    if (streakRef.current > 1 && streakRef.current % 3 === 0) playStreak();
    else playCorrect();
    if (gameModeRef.current === "word") {
      wordProgressRef.current += 1;
      setWordProgress(wordProgressRef.current);
      if (wordProgressRef.current >= currentWordRef.current.length) tryUnlock("word_master");
    }
    if (gameModeRef.current === "daily") {
      dailyIdxRef.current += 1;
      setDailyIdx(dailyIdxRef.current);
    }
    if (streakRef.current >= 5) tryUnlock("streak_5");
    if (streakRef.current >= 10) tryUnlock("streak_10");
    roundRef.current += 1;
    setTimeout(() => startRound(roundRef.current, targetRef.current), 1000);
  }

  function handleTimeout() {
    if (feedbackActiveRef.current) return;
    feedbackActiveRef.current = true;
    const newLives = livesRef.current - 1;
    setPrevLives(livesRef.current);
    livesRef.current = newLives;
    streakRef.current = 0;
    resultsRef.current = [...resultsRef.current, { letter: targetRef.current, success: false }];
    setLives(newLives);
    setStreak(0);
    setFeedback("timeout");
    setResults([...resultsRef.current]);
    playWrong();
    if (gameModeRef.current === "word") { wordProgressRef.current = 0; setWordProgress(0); }
    if (newLives <= 0) { setTimeout(() => endGame(), 1200); return; }
    roundRef.current += 1;
    setTimeout(() => startRound(roundRef.current, targetRef.current), 1400);
  }

  function endGame() {
    const mode = gameModeRef.current;
    const diff = difficultyRef.current;
    const finalScore = scoreRef.current;
    const noLivesLost = livesRef.current === 3;

    tryUnlock("first_sign");
    if (finalScore >= 100) tryUnlock("century");
    if (noLivesLost) tryUnlock("perfect_game");
    if (diff === "hard") tryUnlock("hard_mode");

    if (mode === "daily") {
      const updated = { ...dailyRef.current, completed: true, score: finalScore };
      saveDailyChallenge(updated);
      setDaily(updated);
      tryUnlock("daily_done");
    }

    const label = mode === "word" ? "Word Mode" : mode === "daily" ? "Daily" : "Sprint";
    saveScore({ score: finalScore, mode: label, date: new Date().toLocaleDateString(), difficulty: diff });
    setHighScores(getScores());
    recordGameResult(resultsRef.current);
    recordPracticeToday();
    schedulePush();
    setShowCompletion(true);
    setTimeout(() => setShowCompletion(false), 3500);
    setPhase("result");
  }

  function startGame(mode: GameMode, diff: Difficulty = difficulty) {
    gameModeRef.current = mode;
    difficultyRef.current = diff;
    scoreRef.current = 0; streakRef.current = 0; bestStreakRef.current = 0;
    livesRef.current = 3; roundRef.current = 0; resultsRef.current = [];
    wordProgressRef.current = 0; currentWordRef.current = "";
    dailyIdxRef.current = 0;
    const d = getDailyChallenge();
    dailyRef.current = d;
    setGameMode(mode); setDifficulty(diff); setScore(0); setStreak(0); setBestStreak(0);
    setLives(3); setPrevLives(3); setResults([]); setCurrentWord(""); setWordProgress(0);
    setDailyIdx(0); setDaily(d);
    setPhase("playing");
    startRound(0);
  }

  const cfg = DIFF_CONFIG[difficulty];
  const totalRounds = gameMode === "daily" ? daily.letters.length : TOTAL_ROUNDS;
  const timePct = (timeLeft / (gameMode === "word" ? cfg.wordTime : cfg.time)) * 100;
  const hitsPct = (hits / REQUIRED_HITS) * 100;
  const timerColor = timeLeft > 6 ? "#a0d040" : timeLeft > 3 ? "#f0c030" : "#e05050";

  return (
    <div style={S.page}>
      <AchievementToast achievement={newAchievement} onDone={() => setNewAchievement(null)} />
      <MinecraftCompletion
        show={showCompletion}
        title="Challenge Complete!"
        subtitle={`Score: ${score} pts`}
        icon="⚔️"
      />

      <div style={S.topBar}>
        <McBtn color="stone" onClick={() => navigate("/")}>Back</McBtn>
        <span style={S.pageTitle}>{gameMode === "daily" ? "Daily Challenge" : gameMode === "word" ? "Word Mode" : "Sign Sprint"}</span>
        {phase === "playing" ? (
          <div style={S.statsRow}>
            <span style={S.stat}>Score: {score}</span>
            <HeartsDisplay lives={lives} prevLives={prevLives} />
            <span style={S.stat}>x{streak}</span>
          </div>
        ) : <span />}
      </div>

      <div style={S.cameraWrap} className="mc-game-camera">
        <video ref={videoRef} style={S.video} muted playsInline />
        <canvas ref={canvasRef} style={S.canvas} />
        {!camReady && <div style={S.camOverlay}><div style={S.spinner} /><span style={{ fontSize: 8 }}>Starting camera...</span></div>}
        {phase === "playing" && feedback === "correct" && <div style={{ ...S.camOverlay, background: "rgba(74,180,40,0.25)" }}><span style={{ fontSize: 48 }}>✓</span></div>}
        {phase === "playing" && feedback === "timeout" && <div style={{ ...S.camOverlay, background: "rgba(200,50,50,0.25)" }}><span style={{ fontSize: 48 }}>✗</span></div>}
        {phase === "playing" && detected && !feedback && <div style={S.detectedBadge}>Seeing: <strong>{detected}</strong></div>}
      </div>

      {/* INTRO */}
      {phase === "intro" && (
        <div style={S.panel}>
          {/* Tabs */}
          <div style={S.tabRow}>
            <button className="mc-btn" style={{ ...S.tab, ...(tab === "modes" ? S.tabActive : {}) }} onClick={() => setTab("modes")}>Modes</button>
            <button className="mc-btn" style={{ ...S.tab, ...(tab === "achievements" ? S.tabActive : {}) }} onClick={() => setTab("achievements")}>Badges</button>
          </div>

          {tab === "modes" && <>
            {/* Difficulty selector */}
            <div style={S.diffRow}>
              {(["easy","normal","hard"] as Difficulty[]).map(d => (
                <button key={d} className="mc-btn" onClick={() => setDifficulty(d)} style={{
                  ...S.diffBtn,
                  background: difficulty === d ? DIFF_CONFIG[d].color : "#2a2a14",
                  border: `2px solid ${difficulty === d ? "#f0f0e0" : "#4a4a20"}`,
                  color: difficulty === d ? "#f0f0e0" : "#808060",
                }}>
                  {DIFF_CONFIG[d].label}
                </button>
              ))}
            </div>

            {/* Daily challenge */}
            <div style={{ ...S.dailyCard, opacity: daily.completed ? 0.5 : 1 }}>
              <span style={{ fontSize: 20 }}>📅</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 8, color: "#a0d040", marginBottom: 4 }}>Daily Challenge</div>
                <div style={{ fontSize: 7, color: "#808060" }}>
                  {daily.completed ? `Completed! Score: ${daily.score}` : `Sign: ${daily.letters.join(" · ")}`}
                </div>
              </div>
              <McBtn color="gold" disabled={!camReady || daily.completed} onClick={() => startGame("daily", difficulty)}>
                {daily.completed ? "Done" : "Play"}
              </McBtn>
            </div>

            {/* Mode cards */}
            <div style={S.modeGrid}>
              <button className="mc-btn" style={S.modeCard} onClick={() => startGame("sprint", difficulty)} disabled={!camReady}>
                <span style={{ fontSize: 28 }}>⚡</span>
                <strong style={{ fontSize: 9 }}>Sign Sprint</strong>
                <span style={S.modeDesc}>Sign random letters. 10 rounds, 3 lives, bonus points for speed.</span>
              </button>
              <button className="mc-btn" style={S.modeCard} onClick={() => startGame("word", difficulty)} disabled={!camReady}>
                <span style={{ fontSize: 28 }}>📖</span>
                <strong style={{ fontSize: 9 }}>Word Mode</strong>
                <span style={S.modeDesc}>Spell full words letter by letter. Complete as many as you can.</span>
              </button>
            </div>

            {!camReady && <p style={{ color: "#808060", fontSize: 8, margin: 0 }}>Waiting for camera...</p>}

            {highScores.length > 0 && (
              <div style={S.leaderboard}>
                <div style={S.lbTitle}>[ High Scores ]</div>
                {highScores.map((s, i) => (
                  <div key={i} style={S.lbRow}>
                    <span style={S.lbRank}>#{i + 1}</span>
                    <span style={S.lbScore}>{s.score} pts</span>
                    <span style={S.lbMeta}>{s.mode}{s.difficulty ? ` · ${s.difficulty}` : ""} · {s.date}</span>
                  </div>
                ))}
              </div>
            )}
          </>}

          {tab === "achievements" && (
            <div style={S.achieveGrid}>
              {achievements.map(a => (
                <div key={a.id} style={{ ...S.achieveCard, opacity: a.unlockedAt ? 1 : 0.35 }}>
                  <span style={{ fontSize: 22 }}>{a.icon}</span>
                  <div style={{ fontSize: 7, color: a.unlockedAt ? "#a0d040" : "#606040" }}>{a.title}</div>
                  <div style={{ fontSize: 6, color: "#606040", lineHeight: 1.8 }}>{a.desc}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PLAYING */}
      {phase === "playing" && (
        <div style={S.gamePanel}>
          <div style={S.roundInfo}>
            Round {round + 1} / {totalRounds}
            {gameMode === "daily" && <span style={{ color: "#f0c030", marginLeft: 8 }}>📅 Daily</span>}
            <span style={{ color: DIFF_CONFIG[difficulty].color, marginLeft: 8 }}>[{DIFF_CONFIG[difficulty].label}]</span>
          </div>
          {gameMode === "daily" && (
            <div style={S.wordDisplay}>
              {daily.letters.map((ch, i) => (
                <span key={i} style={{ ...S.wordChar, ...(i < dailyIdx ? S.wordCharDone : i === dailyIdx ? S.wordCharActive : S.wordCharPending) }}>
                  {ch}
                </span>
              ))}
            </div>
          )}
          {gameMode === "word" && currentWord && (
            <div style={S.wordDisplay}>
              {currentWord.split("").map((ch, i) => (
                <span key={i} style={{ ...S.wordChar, ...(i < wordProgress ? S.wordCharDone : i === wordProgress ? S.wordCharActive : S.wordCharPending) }}>
                  {ch}
                </span>
              ))}
            </div>
          )}
          <div style={S.letterPrompt}>
            <span style={S.promptLabel}>Sign this letter:</span>
            <span style={S.bigLetter}>{targetLetter}</span>
          </div>
          <div style={S.barWrap}>
            <div style={S.barLabel}><span>Time</span><span style={{ color: timerColor }}>{timeLeft}s</span></div>
            <div style={S.track}><div style={{ ...S.fill, width: timePct + "%", background: timerColor, transition: "width 1s linear, background 0.3s" }} /></div>
          </div>
          <div style={S.barWrap}>
            <div style={S.barLabel}><span>Hold it...</span><span>{hits}/{REQUIRED_HITS}</span></div>
            <div style={S.track}><div style={{ ...S.fill, width: hitsPct + "%", background: "#5a8a1a" }} /></div>
          </div>
        </div>
      )}

      {/* RESULT */}
      {phase === "result" && (
        <div style={S.panel}>
          <div style={{ fontSize: 36 }}>{score >= 100 ? "🏆" : score >= 60 ? "⭐" : "💀"}</div>
          <h2 style={S.panelTitle}>Game Over!</h2>
          <div style={S.scoreDisplay}>{score} pts</div>
          <div style={S.statGrid}>
            <div style={S.statBox}><div style={S.statVal}>{results.filter(r => r.success).length}</div><div style={S.statLbl}>Correct</div></div>
            <div style={S.statBox}><div style={S.statVal}>{bestStreak}</div><div style={S.statLbl}>Best Streak</div></div>
            <div style={S.statBox}><div style={S.statVal}>{results.filter(r => !r.success).length}</div><div style={S.statLbl}>Missed</div></div>
          </div>
          <div style={S.resultLetters}>
            {results.map((r, i) => (
              <span key={i} style={{ ...S.resultBadge, background: r.success ? "#2a3a0a" : "#3a1a1a", border: `2px solid ${r.success ? "#5a8a1a" : "#8a2a2a"}`, color: r.success ? "#a0d040" : "#e05050" }}>
                {r.letter}
              </span>
            ))}
          </div>
          {results.filter(r => !r.success).length > 0 && (
            <div style={S.weakBox}>
              <div style={S.weakTitle}>⚠ Letters to work on</div>
              <div style={S.weakRow}>
                {[...new Set(results.filter(r => !r.success).map(r => r.letter))].map(l => (
                  <span key={l} style={S.weakBadge}>{l}</span>
                ))}
              </div>
              <div style={S.weakHint}>These will appear more often in your next game.</div>
            </div>
          )}
          {highScores.length > 0 && (
            <div style={S.leaderboard}>
              <div style={S.lbTitle}>[ High Scores ]</div>
              {highScores.map((s, i) => (
                <div key={i} style={S.lbRow}>
                  <span style={S.lbRank}>#{i + 1}</span>
                  <span style={S.lbScore}>{s.score} pts</span>
                  <span style={S.lbMeta}>{s.mode}{s.difficulty ? ` · ${s.difficulty}` : ""} · {s.date}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <McBtn color="green" onClick={() => setPhase("intro")}>Play Again</McBtn>
            <McBtn color="stone" onClick={() => navigate("/learn")}>Study Letters</McBtn>
          </div>
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "linear-gradient(180deg, #1a1a08 0%, #2d2d0f 50%, #1a1a08 100%)", color: "#f0f0e0", fontFamily: "'Press Start 2P', monospace", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "16px 16px 40px", imageRendering: "pixelated" },
  topBar: { width: "100%", maxWidth: 700, display: "flex", alignItems: "center", justifyContent: "space-between" },
  pageTitle: { fontSize: 12, color: "#a0d040", textShadow: "2px 2px 0 #3a5010" },
  statsRow: { display: "flex", gap: 10, alignItems: "center" },
  stat: { fontSize: 8, color: "#c0c0a0" },
  cameraWrap: { position: "relative", width: "100%", maxWidth: 520, aspectRatio: "4/3", background: "#000", border: "4px solid #4a4a20", boxShadow: "inset -3px -3px 0 #1a1a08, 4px 4px 0 #1a1a08", overflow: "hidden" },
  video: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0 },
  canvas: { position: "absolute", inset: 0, width: "100%", height: "100%" },
  camOverlay: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#a0a080", fontSize: 14, background: "rgba(0,0,0,0.7)" },
  spinner: { width: 28, height: 28, border: "3px solid #4a4a20", borderTop: "3px solid #a0d040", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  detectedBadge: { position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", background: "#2a2a14", border: "2px solid #5a5a20", color: "#a0d040", padding: "4px 12px", fontSize: 8, whiteSpace: "nowrap" },
  panel: { width: "100%", maxWidth: 520, background: "#2a2a14", border: "4px solid #4a4a20", boxShadow: "inset -3px -3px 0 #1a1a08, inset 3px 3px 0 rgba(255,255,255,0.05)", padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" },
  panelTitle: { margin: 0, fontSize: 14, fontWeight: 400, color: "#a0d040", textShadow: "2px 2px 0 #3a5010" },
  tabRow: { display: "flex", gap: 6, width: "100%" },
  tab: { flex: 1, background: "#2a2a14", border: "2px solid #4a4a20", color: "#808060", padding: "8px 0", fontSize: 8, letterSpacing: 1 },
  tabActive: { background: "#2a3a0a", border: "2px solid #8ab828", color: "#a0d040" },
  diffRow: { display: "flex", gap: 6, width: "100%" },
  diffBtn: { flex: 1, padding: "8px 0", fontSize: 7, letterSpacing: 1, cursor: "pointer" },
  dailyCard: { width: "100%", background: "#1a1a08", border: "2px solid #3a3a18", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 },
  modeGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%" },
  modeCard: { background: "#2a2a14", border: "3px solid #4a4a20", boxShadow: "inset -3px -3px 0 #1a1a08, inset 3px 3px 0 rgba(255,255,255,0.05)", padding: "16px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", color: "#f0f0e0" },
  modeDesc: { fontSize: 7, color: "#808060", lineHeight: 2 },
  achieveGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 6, width: "100%" },
  achieveCard: { background: "#1a1a08", border: "2px solid #3a3a18", padding: "10px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textAlign: "center" },
  leaderboard: { width: "100%", background: "#1a1a08", border: "2px solid #3a3a18", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 },
  lbTitle: { fontSize: 7, color: "#606040", letterSpacing: 1, marginBottom: 4 },
  lbRow: { display: "flex", alignItems: "center", gap: 10, fontSize: 8 },
  lbRank: { color: "#606040", width: 24 },
  lbScore: { fontWeight: 400, color: "#a0d040", flex: 1 },
  lbMeta: { color: "#606040", fontSize: 7 },
  gamePanel: { width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: 12 },
  roundInfo: { fontSize: 8, color: "#606040", textAlign: "center" },
  wordDisplay: { display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" },
  wordChar: { width: 36, height: 44, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 400, border: "2px solid transparent" },
  wordCharDone: { background: "#2a3a0a", border: "2px solid #5a8a1a", color: "#a0d040" },
  wordCharActive: { background: "#2a3a1a", border: "2px solid #a0d040", color: "#f0f0e0" },
  wordCharPending: { background: "#2a2a14", border: "2px solid #3a3a18", color: "#505040" },
  letterPrompt: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
  promptLabel: { fontSize: 8, color: "#808060" },
  bigLetter: { fontSize: 80, fontWeight: 400, lineHeight: 1, color: "#a0d040", textShadow: "4px 4px 0 #3a5010, 8px 8px 0 #1a2a08" },
  barWrap: { display: "flex", flexDirection: "column", gap: 4 },
  barLabel: { display: "flex", justifyContent: "space-between", fontSize: 8, color: "#a0a080" },
  track: { height: 12, background: "#1a1a08", border: "2px solid #3a3a18", overflow: "hidden" },
  fill: { height: "100%", transition: "width 0.2s ease" },
  scoreDisplay: { fontSize: 40, fontWeight: 400, color: "#a0d040", textShadow: "4px 4px 0 #3a5010" },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, width: "100%" },
  statBox: { background: "#1a1a08", border: "2px solid #3a3a18", padding: "10px 6px", textAlign: "center" },
  statVal: { fontSize: 20, fontWeight: 400, color: "#a0d040" },
  statLbl: { fontSize: 7, color: "#606040", marginTop: 4 },
  resultLetters: { display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" },
  resultBadge: { padding: "4px 8px", fontSize: 10, fontWeight: 400 },
  weakBox: { width: "100%", background: "#2a1a08", border: "2px solid #8a4a1a", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 },
  weakTitle: { fontSize: 7, color: "#f0a030", letterSpacing: 1 },
  weakRow: { display: "flex", flexWrap: "wrap" as const, gap: 4 },
  weakBadge: { background: "#3a1a08", border: "2px solid #8a4a1a", color: "#f0a030", padding: "4px 10px", fontSize: 10 },
  weakHint: { fontSize: 6, color: "#806040", lineHeight: 1.8 },
};
