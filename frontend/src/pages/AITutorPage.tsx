import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getPracticedLetters, markLetterPracticed, getMissedLetters } from "../utils/storage";
import { useAuth } from "../context/AuthContext";
import { HandshapeGif } from "../components/HandshapeGif";
import { LetterPracticeModal } from "../components/LetterPracticeModal";

// ─── Web Speech API types ─────────────────────────────────────────────────────
interface ISpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onresult: ((e: ISpeechRecognitionEvent) => void) | null;
  onerror: ((e: ISpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
interface ISpeechRecognitionEvent {
  results: { [i: number]: { [j: number]: { transcript: string }; isFinal: boolean; length: number }; length: number };
}
interface ISpeechRecognitionErrorEvent { error: string; }
interface ISpeechRecognitionConstructor { new(): ISpeechRecognition; }

declare global {
  interface Window {
    SpeechRecognition: ISpeechRecognitionConstructor;
    webkitSpeechRecognition: ISpeechRecognitionConstructor;
  }
}

// ─── Letter metadata ──────────────────────────────────────────────────────────
const LETTER_META: Record<string, { description: string; emoji: string }> = {
  A: { description: "Fist with thumb on side", emoji: "✊" },
  B: { description: "Four fingers up, thumb tucked", emoji: "🖐" },
  C: { description: "Curved hand like holding a cup", emoji: "🤙" },
  D: { description: "Index up, others circle thumb", emoji: "☝️" },
  E: { description: "All fingers bent, thumb tucked", emoji: "🤞" },
  F: { description: "Index+thumb circle, three fingers up", emoji: "👌" },
  G: { description: "Index points sideways, thumb parallel", emoji: "👉" },
  H: { description: "Two fingers horizontal", emoji: "✌️" },
  I: { description: "Pinky up, fist", emoji: "🤙" },
  K: { description: "Index+middle up, thumb between", emoji: "✌️" },
  L: { description: "L-shape: index up, thumb out", emoji: "👆" },
  M: { description: "Three fingers over thumb", emoji: "✊" },
  N: { description: "Two fingers over thumb", emoji: "✊" },
  O: { description: "All fingers curve to thumb", emoji: "👌" },
  P: { description: "K rotated downward", emoji: "✌️" },
  Q: { description: "G rotated downward", emoji: "👇" },
  R: { description: "Index and middle crossed", emoji: "🤞" },
  S: { description: "Fist with thumb over fingers", emoji: "✊" },
  T: { description: "Thumb between index and middle", emoji: "✊" },
  U: { description: "Index+middle together up", emoji: "✌️" },
  V: { description: "Peace sign / V shape", emoji: "✌️" },
  W: { description: "Three fingers spread wide", emoji: "🖐" },
  X: { description: "Index finger hooked", emoji: "☝️" },
  Y: { description: "Thumb and pinky out (shaka)", emoji: "🤙" },
};

// ─── Quick-reply chip definitions ─────────────────────────────────────────────
// Extracted from the last assistant message to pick contextual chips
function getQuickReplies(lastMsg: string): string[] {
  const lower = lastMsg.toLowerCase();
  // Letter-specific context
  const letterMatch = lastMsg.match(/\[LETTER:([A-Z])\]/);
  const letter = letterMatch ? letterMatch[1] : null;

  if (letter && LETTER_META[letter]) {
    return [`Practice ${letter} now`, `What's ${letter} confused with?`, "What's next?"];
  }
  if (lower.includes("lesson") || lower.includes("exercise") || lower.includes("drill")) {
    return ["Start the drill", "Show me the handshapes", "What's next?"];
  }
  if (lower.includes("struggle") || lower.includes("miss") || lower.includes("weak")) {
    return ["Give me a drill for these", "Show me the handshapes", "What's next?"];
  }
  if (lower.includes("video") || lower.includes("youtube") || lower.includes("resource")) {
    return ["Give me a practice drill", "What should I learn next?", "Show my progress"];
  }
  // Default chips
  return ["Show me the handshape", "Give me a drill", "What's next?"];
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  role: "user" | "assistant";
  content: string;
}

interface MediaResult {
  title: string;
  url: string;
  snippet: string;
  type: "youtube" | "link";
  youtube_id: string | null;
}

interface LessonExercise {
  type: string;
  letters?: string[];
  description: string;
  tips?: Record<string, string>;
}

interface LessonPlan {
  level?: string;
  practiced_count?: number;
  total_letters?: number;
  completion_pct?: number;
  next_letters_to_learn?: string[];
  weak_spots?: string[];
  exercises: LessonExercise[];
  focus?: string;
}

// ─── Parsers ──────────────────────────────────────────────────────────────────
function parseMessage(content: string): { text: string; media: MediaResult[]; lesson: LessonPlan | null } {
  const mediaMatch = content.match(/\[MEDIA\]([\s\S]*?)\[\/MEDIA\]/);
  const lessonMatch = content.match(/\[LESSON\]([\s\S]*?)\[\/LESSON\]/);
  const text = content
    .replace(/\[MEDIA\][\s\S]*?\[\/MEDIA\]/, "")
    .replace(/\[LESSON\][\s\S]*?\[\/LESSON\]/, "")
    .replace(/\[MEDIA\][\s\S]*$/, "")
    .replace(/\[LESSON\][\s\S]*$/, "")
    .trim();
  let media: MediaResult[] = [];
  if (mediaMatch) { try { media = JSON.parse(mediaMatch[1]).results ?? []; } catch { /**/ } }
  let lesson: LessonPlan | null = null;
  if (lessonMatch) { try { lesson = JSON.parse(lessonMatch[1]); } catch { /**/ } }
  return { text, media, lesson };
}

/** Scan text for the first ASL letter mentioned — used for "Practice now" chip */
function extractFirstLetter(text: string): string | null {
  const m = text.match(/\[LETTER:([A-Z])\]/);
  return m ? m[1] : null;
}

function renderTextWithLetterTags(text: string, onPractice: (l: string) => void): React.ReactNode[] {
  // Split on both [LETTER:X] and [SIGN:xxx] tags
  return text.split(/(\[LETTER:[A-Z]\]|\[SIGN:[a-z ]+\])/g).map((part, i) => {
    const letterMatch = part.match(/^\[LETTER:([A-Z])\]$/);
    if (letterMatch) {
      const letter = letterMatch[1];
      return (
        <span key={i} style={S.inlineLetter} title={`Click to practice ${letter}`} onClick={() => onPractice(letter)}>
          <HandshapeGif letter={letter} size={36} animate={false} />
          <span style={S.inlineLetterLabel}>{letter}</span>
        </span>
      );
    }
    const signMatch = part.match(/^\[SIGN:([a-z ]+)\]$/);
    if (signMatch) {
      const signName = signMatch[1];
      return (
        <span key={i} style={S.inlineSign} title={`ASL sign: ${signName}`}>
          <HandshapeGif sign={signName} size={48} animate={true} />
          <span style={S.inlineSignLabel}>{signName.toUpperCase()}</span>
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function YouTubeEmbed({ videoId, title }: { videoId: string; title: string }) {
  return (
    <div style={S.embedWrap}>
      <div style={S.embedTitle}>{title}</div>
      <div style={S.iframeWrap}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen style={S.iframe}
        />
      </div>
    </div>
  );
}

function LinkCard({ result }: { result: MediaResult }) {
  const [expanded, setExpanded] = useState(false);
  const domain = result.url.replace(/^https?:\/\//, "").split("/")[0];
  return (
    <div style={S.linkCard}>
      <div style={S.linkCardHeader}>
        <div style={S.linkCardMeta}>
          <div style={S.linkCardDomain}>🌐 {domain}</div>
          <div style={S.linkCardTitle}>{result.title}</div>
        </div>
        <div style={S.linkCardActions}>
          <button style={S.linkCardToggle} onClick={() => setExpanded(v => !v)}>{expanded ? "▲ Hide" : "▼ Read"}</button>
          <a href={result.url} target="_blank" rel="noopener noreferrer" style={S.linkCardOpen}>↗ Open</a>
        </div>
      </div>
      {expanded && <div style={S.linkCardContent}><div style={S.linkCardSnippet}>{result.snippet || "No preview available."}</div></div>}
    </div>
  );
}

function MediaBlock({ media }: { media: MediaResult[] }) {
  if (!media.length) return null;
  const videos = media.filter(r => r.type === "youtube" && r.youtube_id);
  const links = media.filter(r => r.type !== "youtube" || !r.youtube_id);
  return (
    <div style={S.mediaBlock}>
      {videos.map(v => <YouTubeEmbed key={v.youtube_id} videoId={v.youtube_id!} title={v.title} />)}
      {links.length > 0 && <div style={S.linkCards}>{links.map(l => <LinkCard key={l.url} result={l} />)}</div>}
    </div>
  );
}

function LessonCard({ lesson, onPractice }: { lesson: LessonPlan; onPractice: (l: string) => void }) {
  return (
    <div style={S.lessonCard}>
      <div style={S.lessonHeader}>
        📋 Lesson Plan
        {lesson.completion_pct !== undefined && <span style={S.lessonPct}>{lesson.completion_pct}% complete</span>}
      </div>
      {lesson.weak_spots && lesson.weak_spots.length > 0 && (
        <div style={S.lessonSection}>
          <div style={S.lessonSectionTitle}>⚠ Weak spots to review</div>
          <div style={S.letterRow}>
            {lesson.weak_spots.map(l => (
              <button key={l} style={S.letterChip} onClick={() => onPractice(l)}>
                <HandshapeGif letter={l} size={40} animate={false} />
                <span style={S.letterChipLabel}>{l}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {lesson.next_letters_to_learn && lesson.next_letters_to_learn.length > 0 && (
        <div style={S.lessonSection}>
          <div style={S.lessonSectionTitle}>✨ New letters to learn</div>
          <div style={S.letterRow}>
            {lesson.next_letters_to_learn.map(l => (
              <button key={l} style={S.letterChip} onClick={() => onPractice(l)}>
                <HandshapeGif letter={l} size={40} animate={false} />
                <span style={S.letterChipLabel}>{l}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={S.lessonSection}>
        <div style={S.lessonSectionTitle}>📝 Exercises</div>
        {lesson.exercises.map((ex, i) => (
          <div key={i} style={S.exerciseRow}>
            <span style={S.exerciseDot}>▸</span>
            <span style={S.exerciseText}>{ex.description}</span>
            {ex.letters && ex.letters.length > 0 && (
              <button style={S.practiceBtnSmall} onClick={() => onPractice(ex.letters![0])}>
                Practice {ex.letters[0]}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "What should I practice next?",
  "Show me my progress stats",
  "How do I sign the letter R?",
  "What letters do I struggle with?",
  "Find me YouTube videos for learning ASL",
  "Give me a 5-minute practice drill",
];

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// Check at runtime inside component, not at module level
function getSpeechRecognition(): ISpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return (window as Window).SpeechRecognition ?? (window as Window).webkitSpeechRecognition ?? null;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AITutorPage() {
  const navigate = useNavigate();
  const { session, schedulePush } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [greetingLoading, setGreetingLoading] = useState(true);
  const [practiceModal, setPracticeModal] = useState<string | null>(null);
  // Voice input state
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const practicedLetters = [...getPracticedLetters()];
  const missedLetters = getMissedLetters();

  // Last assistant message for quick-reply chips
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === "assistant");
  const quickReplies = !loading && lastAssistantMsg
    ? getQuickReplies(lastAssistantMsg.content)
    : [];
  const practiceLetterFromChat = lastAssistantMsg
    ? extractFirstLetter(lastAssistantMsg.content)
    : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetch(`${API_BASE}/api/chat/greeting`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_jwt: session?.access_token ?? null,
        practiced_letters: practicedLetters.length > 0 ? practicedLetters : null,
      }),
    })
      .then(r => r.json())
      .then(data => { if (data.message) setMessages([{ role: "assistant", content: data.message }]); })
      .catch(() => { setMessages([{ role: "assistant", content: "Hey! I'm your ASL tutor. What do you want to work on?" }]); })
      .finally(() => setGreetingLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!session?.access_token) return;
    fetch(`${API_BASE}/api/chat/history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_jwt: session.access_token }),
    })
      .then(r => r.json())
      .then(data => { if (data.messages?.length > 0) setMessages(data.messages as Message[]); })
      .catch(() => {});
  }, [session?.access_token]);

  // Set speech support on mount
  useEffect(() => {
    setSpeechSupported(getSpeechRecognition() !== null);
  }, []);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => { recognitionRef.current?.abort(); };
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const newConversation = [...messages, userMsg];
    setMessages(newConversation);
    setInput("");
    setLoading(true);
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation: newConversation.map(m => ({ role: m.role, content: m.content })),
          practiced_letters: practicedLetters.length > 0 ? practicedLetters : null,
          missed_letters: missedLetters.length > 0 ? missedLetters : null,
          user_jwt: session?.access_token ?? null,
        }),
      });
      if (!res.ok || !res.body) throw new Error("Request failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: accumulated };
          return updated;
        });
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Sorry, I couldn't connect to the backend. Make sure the server is running." };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }, [messages, loading, practicedLetters, missedLetters, session]);

  // ── Voice input ─────────────────────────────────────────────────────────────
  function toggleVoice() {
    const SR = getSpeechRecognition();
    if (!SR) {
      setVoiceError("Voice input requires Chrome or Edge. Firefox doesn't support Web Speech API.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    setVoiceError(null);
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    rec.onstart = () => setListening(true);
    rec.onresult = (e: ISpeechRecognitionEvent) => {
      const transcript = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript).join("");
      setInput(transcript);
      if (e.results[e.results.length - 1].isFinal) {
        rec.stop();
        setListening(false);
        sendMessage(transcript);
      }
    };
    rec.onerror = (e: ISpeechRecognitionErrorEvent) => {
      setListening(false);
      if (e.error !== "aborted") setVoiceError(`Mic error: ${e.error}`);
    };
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    rec.start();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  function openPractice(letter: string) {
    if (LETTER_META[letter]) setPracticeModal(letter);
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => navigate("/learn")}>← Back</button>
        <div style={S.headerTitle}>AI ASL Tutor</div>
        {practicedLetters.length > 0 && (
          <div style={S.progressBadge}>{practicedLetters.length}/26 letters practiced</div>
        )}
      </div>

      <div style={S.chatArea}>
        {greetingLoading && messages.length === 0 && (
          <div style={{ ...S.bubble, ...S.aiBubble }}>
            <div style={{ ...S.bubbleLabel, ...S.aiLabel }}>AI Tutor</div>
            <div style={S.bubbleText}><span style={S.cursor}>▋</span></div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isStreaming = loading && i === messages.length - 1;
          const stripped = isStreaming
            ? msg.content.replace(/\[MEDIA\][\s\S]*$/, "").replace(/\[LESSON\][\s\S]*$/, "").trim()
            : msg.content;
          const { text, media, lesson } = msg.role === "assistant"
            ? parseMessage(stripped)
            : { text: msg.content, media: [], lesson: null };

          return (
            <div key={i} style={{ ...S.bubble, ...(msg.role === "user" ? S.userBubble : S.aiBubble) }}>
              <div style={{ ...S.bubbleLabel, ...(msg.role === "user" ? S.userLabel : S.aiLabel) }}>
                {msg.role === "user" ? "You" : "AI Tutor"}
              </div>
              <div style={S.bubbleText}>
                {text
                  ? renderTextWithLetterTags(text, openPractice)
                  : isStreaming ? <span style={S.cursor}>▋</span> : ""}
              </div>
              {!isStreaming && <MediaBlock media={media} />}
              {!isStreaming && lesson && <LessonCard lesson={lesson} onPractice={openPractice} />}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Initial suggestions (shown before first reply) ── */}
      {messages.length <= 1 && !loading && (
        <div style={S.chips}>
          {SUGGESTIONS.map(s => (
            <button key={s} style={S.suggBtn} onClick={() => sendMessage(s)}>{s}</button>
          ))}
        </div>
      )}

      {/* ── Quick-reply chips + Practice now button (shown after each AI reply) ── */}
      {messages.length > 1 && !loading && quickReplies.length > 0 && (
        <div style={S.chips}>
          {quickReplies.map(chip => (
            <button key={chip} style={S.chipBtn} onClick={() => sendMessage(chip)}>{chip}</button>
          ))}
          {practiceLetterFromChat && LETTER_META[practiceLetterFromChat] && (
            <button style={S.practiceNowBtn} onClick={() => openPractice(practiceLetterFromChat)}>
              📷 Practice {practiceLetterFromChat} now
            </button>
          )}
        </div>
      )}

      {/* ── Voice error ── */}
      {voiceError && (
        <div style={S.voiceError}>{voiceError}</div>
      )}

      {/* ── Input row ── */}
      <div style={S.inputRow}>
        <button
          style={{ ...S.micBtn, ...(listening ? S.micBtnActive : {}), ...(speechSupported ? {} : S.micBtnUnsupported) }}
          onClick={toggleVoice}
          title={speechSupported ? (listening ? "Stop listening" : "Speak your message") : "Voice input not supported in this browser (use Chrome)"}
          aria-label={listening ? "Stop voice input" : "Start voice input"}
        >
          {listening ? "⏹" : "🎤"}
        </button>
        <textarea
          style={{ ...S.textarea, ...(listening ? S.textareaListening : {}) }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={listening ? "Listening..." : "Ask about ASL signs, practice tips, resources..."}
          rows={2}
          disabled={loading}
        />
        <button
          className="mc-btn"
          style={{ ...S.sendBtn, ...(loading ? S.sendBtnDisabled : {}) }}
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
        >
          {loading ? "..." : "Send"}
        </button>
      </div>

      {/* ── Practice modal ── */}
      {practiceModal && LETTER_META[practiceModal] && (
        <LetterPracticeModal
          letter={practiceModal}
          description={LETTER_META[practiceModal].description}
          emoji={LETTER_META[practiceModal].emoji}
          onClose={() => setPracticeModal(null)}
          onComplete={(letter) => { markLetterPracticed(letter); schedulePush(); setPracticeModal(null); }}
        />
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh", background: "#1a1a08",
    fontFamily: "'Press Start 2P', monospace", color: "#f0f0e0",
    display: "flex", flexDirection: "column",
    maxWidth: 760, margin: "0 auto", padding: "0 0 16px",
  },
  header: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "14px 16px", background: "#2a2a14",
    border: "3px solid #4a4a20", borderTop: "none",
    boxShadow: "0 4px 0 #0a0a04", flexWrap: "wrap" as const,
  },
  backBtn: {
    background: "#1a1a08", color: "#808060",
    border: "2px solid #3a3a18", padding: "6px 10px", fontSize: 7,
    fontFamily: "'Press Start 2P', monospace", cursor: "pointer",
  },
  headerTitle: { fontSize: 10, color: "#a0d040", flex: 1 },
  progressBadge: {
    fontSize: 7, color: "#606040", background: "#1a1a08",
    border: "2px solid #3a3a18", padding: "4px 8px",
  },
  chatArea: {
    flex: 1, overflowY: "auto" as const, padding: "16px",
    display: "flex", flexDirection: "column", gap: 12,
    minHeight: 0, maxHeight: "calc(100vh - 220px)",
  },
  bubble: { maxWidth: "88%", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 },
  userBubble: { alignSelf: "flex-end", background: "#2a3a0a", border: "2px solid #6a8a20", boxShadow: "inset -2px -2px 0 #1a2a04" },
  aiBubble: { alignSelf: "flex-start", background: "#2a2a14", border: "2px solid #4a4a20", boxShadow: "inset -2px -2px 0 #1a1a08" },
  bubbleLabel: { fontSize: 7, letterSpacing: 1 },
  userLabel: { color: "#a0d040" },
  aiLabel: { color: "#808060" },
  bubbleText: { fontSize: 8, lineHeight: 2, color: "#f0f0e0", whiteSpace: "pre-wrap" as const, wordBreak: "break-word" as const },
  cursor: { animation: "blink 1s step-end infinite" },
  // Inline letter tag
  inlineLetter: {
    display: "inline-flex", flexDirection: "column" as const, alignItems: "center",
    gap: 2, margin: "0 4px", padding: "4px 6px",
    background: "#1a2a08", border: "2px solid #4a6a18",
    cursor: "pointer", verticalAlign: "middle",
  },
  inlineLetterLabel: { fontSize: 7, color: "#a0d040", lineHeight: 1 },
  // Inline sign tag
  inlineSign: {
    display: "inline-flex", flexDirection: "column" as const, alignItems: "center",
    gap: 2, margin: "0 6px", padding: "4px 8px",
    background: "#1a2a08", border: "2px solid #5a8a1a",
    cursor: "default", verticalAlign: "middle",
  },
  inlineSignLabel: { fontSize: 6, color: "#a0d040", lineHeight: 1, letterSpacing: 0.5 },
  // Chips row (suggestions + quick-replies)
  chips: {
    display: "flex", flexWrap: "wrap" as const, gap: 6,
    padding: "4px 16px 8px",
  },
  suggBtn: {
    background: "#1a1a08", color: "#606040",
    border: "2px solid #3a3a18", padding: "6px 10px", fontSize: 7,
    fontFamily: "'Press Start 2P', monospace", cursor: "pointer", lineHeight: 1.8,
  },
  // Quick-reply chips — slightly more prominent than suggestions
  chipBtn: {
    background: "#2a2a14", color: "#a0a060",
    border: "2px solid #4a4a20", padding: "6px 12px", fontSize: 7,
    fontFamily: "'Press Start 2P', monospace", cursor: "pointer",
    lineHeight: 1.8, boxShadow: "inset -2px -2px 0 #1a1a08",
  },
  // "Practice now" chip — green accent
  practiceNowBtn: {
    background: "#2a3a0a", color: "#a0d040",
    border: "2px solid #5a8a1a", padding: "6px 12px", fontSize: 7,
    fontFamily: "'Press Start 2P', monospace", cursor: "pointer",
    lineHeight: 1.8, boxShadow: "inset -2px -2px 0 #1a2a04",
  },
  // Voice error
  voiceError: {
    margin: "0 16px 4px", padding: "6px 10px", fontSize: 7,
    color: "#e05050", background: "#2a1a1a", border: "2px solid #5a2a2a",
  },
  // Input row
  inputRow: { display: "flex", gap: 8, padding: "8px 16px 0", alignItems: "flex-end" },
  // Mic button
  micBtn: {
    flexShrink: 0, width: 40, height: 40,
    background: "#2a2a14", border: "2px solid #4a4a20",
    boxShadow: "inset -2px -2px 0 #1a1a08",
    color: "#808060", fontSize: 16, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "inherit",
  },
  micBtnActive: {
    background: "#3a1a1a", border: "2px solid #c84a4a",
    color: "#e05050", animation: "pulse 1s ease-in-out infinite",
  },
  micBtnUnsupported: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
  textarea: {
    flex: 1, background: "#1a1a08", border: "2px solid #4a4a20",
    boxShadow: "inset 2px 2px 0 #0a0a04", color: "#f0f0e0",
    padding: "10px 12px", fontSize: 8,
    fontFamily: "'Press Start 2P', monospace",
    resize: "none" as const, outline: "none", lineHeight: 2,
  },
  textareaListening: {
    border: "2px solid #c84a4a",
    boxShadow: "inset 2px 2px 0 #3a0a0a",
  },
  sendBtn: {
    padding: "10px 16px", fontSize: 8,
    background: "#5a7a1a", color: "#f0ffe0",
    border: "3px solid #8ab828", boxShadow: "inset -3px -3px 0 #3a5010",
    cursor: "pointer", whiteSpace: "nowrap" as const,
  },
  sendBtnDisabled: {
    background: "#2a2a14", color: "#505040",
    border: "3px solid #3a3a18", boxShadow: "none",
  },
  // Lesson card
  lessonCard: {
    marginTop: 8, background: "#141408", border: "2px solid #4a6a18",
    padding: "12px 14px", display: "flex", flexDirection: "column" as const, gap: 10,
  },
  lessonHeader: { fontSize: 8, color: "#a0d040", display: "flex", justifyContent: "space-between", alignItems: "center" },
  lessonPct: { fontSize: 7, color: "#606040", background: "#1a1a08", border: "2px solid #3a3a18", padding: "2px 6px" },
  lessonSection: { display: "flex", flexDirection: "column" as const, gap: 6 },
  lessonSectionTitle: { fontSize: 7, color: "#808060", letterSpacing: 0.5 },
  letterRow: { display: "flex", flexWrap: "wrap" as const, gap: 6 },
  letterChip: {
    display: "flex", flexDirection: "column" as const, alignItems: "center",
    gap: 3, padding: "6px 8px", background: "#1a2a08",
    border: "2px solid #4a6a18", cursor: "pointer",
    fontFamily: "'Press Start 2P', monospace",
  },
  letterChipLabel: { fontSize: 7, color: "#a0d040" },
  exerciseRow: { display: "flex", alignItems: "flex-start", gap: 6, fontSize: 7, color: "#c0c0a0", lineHeight: 2 },
  exerciseDot: { color: "#a0d040", flexShrink: 0 },
  exerciseText: { flex: 1 },
  practiceBtnSmall: {
    flexShrink: 0, background: "#2a3a0a", color: "#a0d040",
    border: "2px solid #4a6a18", padding: "3px 8px", fontSize: 6,
    fontFamily: "'Press Start 2P', monospace", cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  // Media
  mediaBlock: { display: "flex", flexDirection: "column" as const, gap: 10, marginTop: 8 },
  embedWrap: { display: "flex", flexDirection: "column" as const, gap: 4 },
  embedTitle: { fontSize: 7, color: "#a0d040", lineHeight: 1.6 },
  iframeWrap: {
    position: "relative" as const, width: "100%", paddingBottom: "56.25%",
    height: 0, overflow: "hidden", border: "2px solid #4a4a20",
  },
  iframe: { position: "absolute" as const, top: 0, left: 0, width: "100%", height: "100%", border: "none" },
  linkCards: { display: "flex", flexDirection: "column" as const, gap: 6 },
  linkCard: { display: "flex", flexDirection: "column" as const, background: "#1a1a08", border: "2px solid #3a3a18", overflow: "hidden" },
  linkCardHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, padding: "8px 10px" },
  linkCardMeta: { display: "flex", flexDirection: "column" as const, gap: 4, flex: 1, minWidth: 0 },
  linkCardDomain: { fontSize: 6, color: "#505040", letterSpacing: 0.5 },
  linkCardTitle: { fontSize: 7, color: "#a0d040", lineHeight: 1.8, wordBreak: "break-word" as const },
  linkCardActions: { display: "flex", flexDirection: "column" as const, gap: 4, flexShrink: 0 },
  linkCardToggle: {
    background: "#2a2a14", color: "#808060", border: "2px solid #3a3a18",
    padding: "4px 8px", fontSize: 6, fontFamily: "'Press Start 2P', monospace",
    cursor: "pointer", whiteSpace: "nowrap" as const,
  },
  linkCardOpen: {
    display: "block", background: "#2a3a0a", color: "#a0d040",
    border: "2px solid #4a6010", padding: "4px 8px", fontSize: 6,
    fontFamily: "'Press Start 2P', monospace", textDecoration: "none",
    textAlign: "center" as const, whiteSpace: "nowrap" as const,
  },
  linkCardContent: { borderTop: "2px solid #2a2a14", padding: "10px 12px", background: "#141408" },
  linkCardSnippet: { fontSize: 7, color: "#c0c0a0", lineHeight: 2, whiteSpace: "pre-wrap" as const, wordBreak: "break-word" as const },
};
