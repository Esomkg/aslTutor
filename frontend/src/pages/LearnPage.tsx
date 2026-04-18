import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LetterPracticeModal } from "../components/LetterPracticeModal";
import { HandshapeGif } from "../components/HandshapeGif";
import { getPracticedLetters, markLetterPracticed, unlockAchievement, recordPracticeToday, getPracticedNumbers, markNumberPracticed, recordNumberResult, getNumberStats, NumberStatEntry } from "../utils/storage";
import { AchievementToast } from "../components/AchievementToast";
import { ALL_ACHIEVEMENTS, Achievement } from "../utils/storage";

const ASL_ALPHABET: { letter: string; description: string; emoji: string }[] = [
  { letter: "A", emoji: "✊", description: "Make a fist with your thumb resting on the side." },
  { letter: "B", emoji: "🖐", description: "Hold four fingers straight up, thumb tucked across palm." },
  { letter: "C", emoji: "🤏", description: "Curve all fingers and thumb into a C shape." },
  { letter: "D", emoji: "👆", description: "Index finger points up, other fingers touch thumb forming a circle." },
  { letter: "E", emoji: "🤜", description: "Curl all fingers down, thumb tucked under fingers." },
  { letter: "F", emoji: "👌", description: "Index finger and thumb touch forming a circle, other fingers up." },
  { letter: "G", emoji: "👉", description: "Index finger and thumb point sideways, parallel to the ground." },
  { letter: "H", emoji: "✌️", description: "Index and middle fingers point sideways together, horizontally." },
  { letter: "I", emoji: "🤙", description: "Pinky finger points up, all other fingers curled into fist." },
  { letter: "J", emoji: "🤙", description: "Like I, then trace a J shape in the air with your pinky." },
  { letter: "K", emoji: "✌️", description: "Index and middle fingers up in a V, thumb between them." },
  { letter: "L", emoji: "🤙", description: "Index finger points up, thumb points out — like an L shape." },
  { letter: "M", emoji: "✊", description: "Three fingers folded over thumb, tucked under." },
  { letter: "N", emoji: "✊", description: "Two fingers folded over thumb, tucked under." },
  { letter: "O", emoji: "👌", description: "All fingers and thumb curve together forming an O shape." },
  { letter: "P", emoji: "👇", description: "Like K but pointing downward." },
  { letter: "Q", emoji: "👇", description: "Like G but pointing downward." },
  { letter: "R", emoji: "🤞", description: "Index and middle fingers crossed and pointing up." },
  { letter: "S", emoji: "✊", description: "Fist with thumb wrapped over fingers." },
  { letter: "T", emoji: "✊", description: "Thumb tucked between index and middle fingers." },
  { letter: "U", emoji: "✌️", description: "Index and middle fingers together pointing up." },
  { letter: "V", emoji: "✌️", description: "Index and middle fingers spread in a V shape." },
  { letter: "W", emoji: "🖖", description: "Index, middle, and ring fingers spread and pointing up." },
  { letter: "X", emoji: "☝️", description: "Index finger bent into a hook shape." },
  { letter: "Y", emoji: "🤙", description: "Thumb and pinky extended, other fingers curled." },
  { letter: "Z", emoji: "☝️", description: "Index finger traces a Z shape in the air." },
];

const ASL_NUMBERS: { digit: string; description: string }[] = [
  { digit: "1", description: "Index finger points up, all other fingers curled." },
  { digit: "2", description: "Index and middle fingers up (like V/peace sign)." },
  { digit: "3", description: "Thumb, index, and middle fingers extended." },
  { digit: "4", description: "Four fingers up, thumb tucked across palm." },
  { digit: "5", description: "All five fingers spread open — open palm." },
  { digit: "6", description: "Pinky and thumb touch, other three fingers up." },
  { digit: "7", description: "Ring finger and thumb touch, other fingers up." },
  { digit: "8", description: "Middle finger and thumb touch, other fingers up." },
  { digit: "9", description: "Index finger and thumb touch (like F), other fingers up." },
];

type LearnTab = "browse" | "numbers" | "quiz";
type Filter = "all" | "practiced" | "unpracticed";

const QUIZ_LENGTH = 10;

// Quiz state
interface QuizState {
  questionIdx: number;
  options: string[];
  selected: string | null;
  correct: number;
  streak: number;
  done: boolean;
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeQuizQuestion(letters: typeof ASL_ALPHABET) {
  const correct = letters[Math.floor(Math.random() * letters.length)];
  const others = shuffled(letters.filter(l => l.letter !== correct.letter)).slice(0, 3);
  const options = shuffled([correct, ...others]).map(l => l.letter);
  return { correct, options };
}

export default function LearnPage() {
  const navigate = useNavigate();
  const { schedulePush } = useAuth();
  const [tab, setTab] = useState<LearnTab>("browse");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<typeof ASL_ALPHABET[0] | null>(null);
  const [practicing, setPracticing] = useState<typeof ASL_ALPHABET[0] | null>(null);
  const [practiced, setPracticed] = useState<Set<string>>(getPracticedLetters());
  const [practicedNumbers, setPracticedNumbers] = useState<Set<string>>(getPracticedNumbers());
  const [numberStats, setNumberStats] = useState<Record<string, NumberStatEntry>>(getNumberStats());

  // Re-read practiced letters when page gains focus (e.g. returning from AITutorPage)
  useEffect(() => {
    const refresh = () => {
      setPracticed(getPracticedLetters());
      setPracticedNumbers(getPracticedNumbers());
      setNumberStats(getNumberStats());
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);

  // Quiz state
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [quizQuestion, setQuizQuestion] = useState<{ correct: typeof ASL_ALPHABET[0]; options: string[] } | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<"correct" | "wrong" | null>(null);

  function tryUnlock(id: string) {
    const unlocked = unlockAchievement(id);
    if (unlocked) {
      const a = ALL_ACHIEVEMENTS.find(x => x.id === id)!;
      setNewAchievement(a);
    }
  }

  function onPracticeComplete(letter: string) {
    markLetterPracticed(letter);
    recordPracticeToday();
    const updated = getPracticedLetters();
    setPracticed(updated);
    if (updated.size >= 26) tryUnlock("all_letters");
    schedulePush();
  }

  const filtered = ASL_ALPHABET.filter(item => {
    const matchSearch = item.letter.includes(search.toUpperCase());
    const matchFilter =
      filter === "all" ? true :
      filter === "practiced" ? practiced.has(item.letter) :
      !practiced.has(item.letter);
    return matchSearch && matchFilter;
  });

  const progressPct = Math.round((practiced.size / 26) * 100);

  // Quiz logic
  function startQuiz() {
    const q = makeQuizQuestion(ASL_ALPHABET);
    setQuizQuestion(q);
    setQuiz({ questionIdx: 0, options: q.options, selected: null, correct: 0, streak: 0, done: false });
    setQuizFeedback(null);
  }

  function answerQuiz(letter: string) {
    if (!quiz || !quizQuestion || quizFeedback || quiz.done) return;
    const isCorrect = letter === quizQuestion.correct.letter;
    const newCorrect = isCorrect ? quiz.correct + 1 : quiz.correct;
    const newStreak = isCorrect ? quiz.streak + 1 : 0;
    const nextIdx = quiz.questionIdx + 1;
    const isDone = nextIdx >= QUIZ_LENGTH;

    // Mark letter as practiced on correct answer
    if (isCorrect) {
      onPracticeComplete(quizQuestion.correct.letter);
    }

    setQuiz(q => q ? { ...q, selected: letter, correct: newCorrect, streak: newStreak } : q);
    setQuizFeedback(isCorrect ? "correct" : "wrong");
    if (isCorrect && newStreak >= 5) tryUnlock("quiz_ace");

    setTimeout(() => {
      if (isDone) {
        setQuiz(q => q ? { ...q, questionIdx: nextIdx, done: true } : q);
        setQuizFeedback(null);
      } else {
        const next = makeQuizQuestion(ASL_ALPHABET);
        setQuizQuestion(next);
        setQuiz(q => q ? { ...q, questionIdx: nextIdx, options: next.options, selected: null } : q);
        setQuizFeedback(null);
      }
    }, 900);
  }

  return (
    <div style={S.page}>
      <AchievementToast achievement={newAchievement} onDone={() => setNewAchievement(null)} />

      <div style={S.topBar}>
        <button className="mc-btn" style={S.backBtn} onClick={() => navigate("/")}>← Back</button>
        <h1 style={S.title}>ASL Alphabet</h1>
        <span style={S.count}>[ 26 letters ]</span>
      </div>

      {/* Progress bar */}
      <div style={S.progressWrap}>
        <div style={S.progressLabel}>Progress: {practiced.size}/26 letters practiced ({progressPct}%)</div>
        <div style={S.progressTrack}>
          <div style={{ ...S.progressFill, width: progressPct + "%" }} />
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabRow}>
        <button className="mc-btn" style={{ ...S.tab, ...(tab === "browse" ? S.tabActive : {}) }} onClick={() => setTab("browse")}>Browse</button>
        <button className="mc-btn" style={{ ...S.tab, ...(tab === "numbers" ? S.tabActive : {}) }} onClick={() => setTab("numbers")}>Numbers</button>
        <button className="mc-btn" style={{ ...S.tab, ...(tab === "quiz" ? S.tabActive : {}) }} onClick={() => { setTab("quiz"); if (!quiz) startQuiz(); }}>Quiz Mode</button>
      </div>

      {/* BROWSE TAB */}
      {tab === "browse" && <>
        {/* Search + filter */}
        <div style={S.filterRow}>
          <input
            style={S.searchInput}
            placeholder="Search letter..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            maxLength={1}
          />
          {(["all","practiced","unpracticed"] as Filter[]).map(f => (
            <button key={f} className="mc-btn" style={{ ...S.filterBtn, ...(filter === f ? S.filterBtnActive : {}) }} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f === "practiced" ? "✓ Done" : "○ Todo"}
            </button>
          ))}
        </div>

        <div style={S.grid}>
          {filtered.map(item => (
            <button
              key={item.letter}
              className="mc-btn"
              style={{
                ...S.letterCard,
                ...(selected?.letter === item.letter ? S.letterCardActive : {}),
                ...(practiced.has(item.letter) ? S.letterCardPracticed : {}),
              }}
              onClick={() => setSelected(selected?.letter === item.letter ? null : item)}
              aria-label={`ASL letter ${item.letter}`}
            >
              <span style={S.emoji}><HandshapeGif letter={item.letter} size={36} animate={selected?.letter === item.letter} /></span>
              <span style={S.letter}>{item.letter}</span>
              {practiced.has(item.letter) && <span style={S.checkmark}>✓</span>}
            </button>
          ))}
          {filtered.length === 0 && <div style={{ gridColumn: "1/-1", color: "#606040", fontSize: 8, padding: 16 }}>No letters match.</div>}
        </div>

        {selected && (
          <div style={S.detail}>
            <div style={S.detailEmoji}><HandshapeGif letter={selected.letter} size={64} animate /></div>
            <div style={S.detailContent}>
              <h2 style={S.detailLetter}>Letter {selected.letter}</h2>
              <p style={S.detailDesc}>{selected.description}</p>
              <button className="mc-btn" style={S.practiceBtn} onClick={() => setPracticing(selected)}>
                Practice with Camera
              </button>
            </div>
          </div>
        )}

        {practicing && (
          <LetterPracticeModal
            letter={practicing.letter}
            description={practicing.description}
            emoji={practicing.emoji}
            onClose={() => { setPracticing(null); setPracticed(getPracticedLetters()); }}
            onComplete={(letter) => onPracticeComplete(letter)}
          />
        )}

        <div style={S.tip}>
          Tip: ASL fingerspelling is used to spell out names and words that don't have their own sign.
        </div>
      </>}

      {/* NUMBERS TAB */}
      {tab === "numbers" && (
        <div style={{ width: "100%", maxWidth: 700, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 7, color: "#808060", lineHeight: 2 }}>
            ASL numbers 1–9 — recognized by the camera in Practice mode.
          </div>
          {/* Numbers progress bar */}
          <div style={S.progressWrap}>
            <div style={S.progressLabel}>Progress: {practicedNumbers.size}/9 numbers practiced ({Math.round((practicedNumbers.size / 9) * 100)}%)</div>
            <div style={S.progressTrack}>
              <div style={{ ...S.progressFill, width: Math.round((practicedNumbers.size / 9) * 100) + "%" }} />
            </div>
          </div>
          {/* Correct count summary */}
          {Object.keys(numberStats).length > 0 && (
            <div style={{ fontSize: 7, color: "#808060", lineHeight: 2 }}>
              Total correct sessions: {Object.values(numberStats).reduce((s, v) => s + v.correct, 0)} &nbsp;|&nbsp;
              Total attempts: {Object.values(numberStats).reduce((s, v) => s + v.attempts, 0)}
            </div>
          )}
          <div style={S.grid}>
            {ASL_NUMBERS.map(item => {
              const stat = numberStats[item.digit];
              const correctCount = stat?.correct ?? 0;
              return (
                <button
                  key={item.digit}
                  className="mc-btn"
                  style={{
                    ...S.letterCard,
                    ...(selected?.letter === item.digit ? S.letterCardActive : {}),
                    ...(practicedNumbers.has(item.digit) ? S.letterCardPracticed : {}),
                  }}
                  onClick={() => setSelected(selected?.letter === item.digit ? null : { letter: item.digit, description: item.description, emoji: item.digit })}
                  aria-label={`ASL number ${item.digit}`}
                >
                  <span style={S.emoji}><HandshapeGif letter={item.digit} size={36} animate={selected?.letter === item.digit} /></span>
                  <span style={S.letter}>{item.digit}</span>
                  {practicedNumbers.has(item.digit) && <span style={S.checkmark}>✓</span>}
                  {correctCount > 0 && (
                    <span style={S.correctBadge}>{correctCount}✓</span>
                  )}
                </button>
              );
            })}
          </div>
          {selected && ASL_NUMBERS.some(n => n.digit === selected.letter) && (
            <div style={S.detail}>
              <div style={S.detailEmoji}><HandshapeGif letter={selected.letter} size={64} animate /></div>
              <div style={S.detailContent}>
                <h2 style={S.detailLetter}>Number {selected.letter}</h2>
                <p style={S.detailDesc}>{selected.description}</p>
                <button className="mc-btn" style={S.practiceBtn} onClick={() => setPracticing(selected)}>
                  Practice with Camera
                </button>
              </div>
            </div>
          )}

          {practicing && ASL_NUMBERS.some(n => n.digit === practicing.letter) && (
            <LetterPracticeModal
              letter={practicing.letter}
              description={practicing.description}
              emoji={practicing.letter}
              onClose={() => setPracticing(null)}
              onComplete={(digit) => {
                markNumberPracticed(digit);
                recordNumberResult(digit, true);
                recordPracticeToday();
                setPracticedNumbers(getPracticedNumbers());
                setNumberStats(getNumberStats());
                schedulePush();
                setPracticing(null);
              }}
            />
          )}
        </div>
      )}

      {/* QUIZ TAB */}
      {tab === "quiz" && quiz && quiz.done && (
        <div style={S.quizPanel}>
          <div style={{ fontSize: 10, color: "#a0d040", textAlign: "center" }}>Round Complete!</div>
          <div style={{ fontSize: 8, color: "#f0f0e0", textAlign: "center", lineHeight: 2 }}>
            You got {quiz.correct} / {QUIZ_LENGTH} correct
          </div>
          <div style={{ fontSize: 8, color: "#f0c030" }}>
            {quiz.correct === QUIZ_LENGTH ? "⭐ Perfect score!" :
             quiz.correct >= 7 ? "🔥 Great job!" :
             quiz.correct >= 5 ? "👍 Keep practicing!" :
             "💪 Don't give up!"}
          </div>
          <div style={{ fontSize: 7, color: "#808060", lineHeight: 2, textAlign: "center" }}>
            Correct answers were added to your practiced letters.
          </div>
          <button className="mc-btn" style={S.practiceBtn} onClick={startQuiz}>
            Play Again
          </button>
        </div>
      )}

      {tab === "quiz" && quiz && !quiz.done && quizQuestion && (
        <div style={S.quizPanel}>
          <div style={S.quizHeader}>
            <span style={{ fontSize: 8, color: "#606040" }}>Q {quiz.questionIdx + 1}/{QUIZ_LENGTH}</span>
            <span style={{ fontSize: 8, color: "#a0d040" }}>✓ {quiz.correct}</span>
            <span style={{ fontSize: 8, color: "#f0c030" }}>🔥 {quiz.streak}</span>
          </div>
          <div style={S.quizPrompt}>
            <div style={{ fontSize: 8, color: "#808060", marginBottom: 8 }}>Which letter is this sign?</div>
            <div style={S.quizEmoji}><HandshapeGif letter={quizQuestion.correct.letter} size={80} animate /></div>
            <div style={{ fontSize: 8, color: "#a0a080", lineHeight: 2, maxWidth: 300, textAlign: "center" }}>
              {quizQuestion.correct.description}
            </div>
          </div>
          <div style={S.quizOptions}>
            {quizQuestion.options.map(opt => {
              const isSelected = quiz.selected === opt;
              const isCorrectOpt = opt === quizQuestion.correct.letter;
              let bg = "#2a2a14", border = "#4a4a20", color = "#f0f0e0";
              if (quizFeedback && isCorrectOpt) { bg = "#2a3a0a"; border = "#8ab828"; color = "#a0d040"; }
              else if (quizFeedback && isSelected && !isCorrectOpt) { bg = "#3a1a1a"; border = "#8a2a2a"; color = "#e05050"; }
              return (
                <button key={opt} className="mc-btn" onClick={() => answerQuiz(opt)} style={{
                  background: bg, border: `3px solid ${border}`, color,
                  boxShadow: "inset -2px -2px 0 #1a1a08",
                  padding: "14px 0", fontSize: 18, cursor: "pointer", width: "100%",
                }}>
                  {opt}
                </button>
              );
            })}
          </div>
          <button className="mc-btn" style={S.quizSkip} onClick={startQuiz}>Restart</button>
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "linear-gradient(180deg, #1a1a08 0%, #2d2d0f 50%, #1a1a08 100%)", color: "#f0f0e0", fontFamily: "'Press Start 2P', monospace", padding: "24px 16px 48px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, imageRendering: "pixelated" },
  topBar: { width: "100%", maxWidth: 700, display: "flex", alignItems: "center", justifyContent: "space-between" },
  backBtn: { background: "#5a5a5a", color: "#f0f0f0", border: "3px solid #8a8a8a", boxShadow: "inset -3px -3px 0 #2a2a2a, inset 3px 3px 0 rgba(255,255,255,0.15)", padding: "8px 14px", fontSize: 8, letterSpacing: 1 },
  title: { margin: 0, fontSize: "clamp(12px, 3vw, 20px)", fontWeight: 400, color: "#f0f0e0", textShadow: "3px 3px 0 #3a3a10" },
  count: { color: "#a0d040", fontSize: 8, background: "#2a3a0a", border: "2px solid #5a8a1a", padding: "4px 8px" },
  progressWrap: { width: "100%", maxWidth: 700, display: "flex", flexDirection: "column", gap: 4 },
  progressLabel: { fontSize: 7, color: "#808060" },
  progressTrack: { height: 10, background: "#1a1a08", border: "2px solid #3a3a18", overflow: "hidden" },
  progressFill: { height: "100%", background: "#5a8a1a", transition: "width 0.4s ease" },
  tabRow: { display: "flex", gap: 6, width: "100%", maxWidth: 700 },
  tab: { flex: 1, background: "#2a2a14", border: "2px solid #4a4a20", color: "#808060", padding: "8px 0", fontSize: 8, letterSpacing: 1 },
  tabActive: { background: "#2a3a0a", border: "2px solid #8ab828", color: "#a0d040" },
  filterRow: { display: "flex", gap: 6, width: "100%", maxWidth: 700, flexWrap: "wrap" },
  searchInput: { background: "#1a1a08", border: "2px solid #4a4a20", color: "#f0f0e0", padding: "6px 10px", fontSize: 10, fontFamily: "'Press Start 2P', monospace", width: 60, outline: "none" },
  filterBtn: { background: "#2a2a14", border: "2px solid #4a4a20", color: "#808060", padding: "6px 10px", fontSize: 7, letterSpacing: 1 },
  filterBtnActive: { background: "#2a3a0a", border: "2px solid #8ab828", color: "#a0d040" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 4, width: "100%", maxWidth: 700 },
  letterCard: { background: "#2a2a14", border: "3px solid #4a4a20", boxShadow: "inset -2px -2px 0 #1a1a08, inset 2px 2px 0 rgba(255,255,255,0.05)", padding: "12px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", position: "relative" },
  letterCardActive: { background: "#2a3a0a", border: "3px solid #8ab828", boxShadow: "inset -2px -2px 0 #1a2a04, inset 2px 2px 0 rgba(255,255,255,0.1)" },
  letterCardPracticed: { border: "3px solid #5a8a1a" },
  checkmark: { position: "absolute", top: 3, right: 5, fontSize: 8, color: "#a0d040" },
  correctBadge: { position: "absolute", bottom: 3, right: 4, fontSize: 6, color: "#f0c030", background: "#2a2a08", padding: "1px 3px", border: "1px solid #5a5010" },
  emoji: { fontSize: 20 },
  letter: { fontSize: 14, fontWeight: 400, color: "#f0f0e0" },
  detail: { width: "100%", maxWidth: 700, background: "#2a3a0a", border: "3px solid #5a8a1a", boxShadow: "inset -3px -3px 0 #1a2a04, inset 3px 3px 0 rgba(255,255,255,0.08)", padding: "20px 24px", display: "flex", alignItems: "center", gap: 20 },
  detailEmoji: { fontSize: 40 },
  detailContent: { display: "flex", flexDirection: "column", gap: 10 },
  detailLetter: { margin: 0, fontSize: 14, fontWeight: 400, color: "#a0d040" },
  detailDesc: { margin: 0, color: "#c0c0a0", fontSize: 8, lineHeight: 2 },
  practiceBtn: { marginTop: 4, background: "#5a7a1a", color: "#f0ffe0", border: "3px solid #8ab828", boxShadow: "inset -3px -3px 0 #3a5010, inset 3px 3px 0 rgba(255,255,255,0.15)", padding: "8px 14px", fontSize: 8, letterSpacing: 1, alignSelf: "flex-start" },
  tip: { maxWidth: 700, width: "100%", background: "#2a2a14", border: "3px solid #4a4a20", boxShadow: "inset -2px -2px 0 #1a1a08", padding: "12px 16px", fontSize: 8, color: "#a0a060", lineHeight: 2 },
  quizPanel: { width: "100%", maxWidth: 520, background: "#2a2a14", border: "4px solid #4a4a20", boxShadow: "inset -3px -3px 0 #1a1a08", padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 },
  quizHeader: { width: "100%", display: "flex", justifyContent: "space-between" },
  quizPrompt: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  quizEmoji: { fontSize: 56 },
  quizOptions: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%" },
  quizSkip: { background: "#3a3a1a", color: "#808060", border: "2px solid #5a5a28", boxShadow: "inset -2px -2px 0 #1a1a08", padding: "6px 16px", fontSize: 7, letterSpacing: 1 },
};
