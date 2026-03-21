"""
Run: python make_slides.py
Output: SignQuest.pptx
Then drag into Google Drive → it auto-converts to Google Slides.
"""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

# ── Colors ──────────────────────────────────────────────────────────────────
BG       = RGBColor(0x1a, 0x1a, 0x08)
GREEN    = RGBColor(0xa0, 0xd0, 0x40)
WHITE    = RGBColor(0xf0, 0xf0, 0xe0)
GRAY     = RGBColor(0x80, 0x80, 0x60)
DARK     = RGBColor(0x2a, 0x2a, 0x14)
DARKBORD = RGBColor(0x4a, 0x4a, 0x20)

W = Inches(13.33)
H = Inches(7.5)

prs = Presentation()
prs.slide_width  = W
prs.slide_height = H

blank_layout = prs.slide_layouts[6]  # completely blank


def add_slide():
    slide = prs.slides.add_slide(blank_layout)
    bg = slide.background.fill
    bg.solid()
    bg.fore_color.rgb = BG
    return slide


def txbox(slide, text, x, y, w, h,
          size=18, bold=False, color=WHITE, align=PP_ALIGN.LEFT,
          bg=None, border=None):
    tf = slide.shapes.add_textbox(x, y, w, h)
    if bg:
        tf.fill.solid()
        tf.fill.fore_color.rgb = bg
    frame = tf.text_frame
    frame.word_wrap = True
    p = frame.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    return tf


def title_bar(slide, title):
    """Green accent bar at top with title."""
    bar = slide.shapes.add_shape(1, 0, 0, W, Inches(1.1))
    bar.fill.solid()
    bar.fill.fore_color.rgb = DARK
    bar.line.color.rgb = GREEN
    bar.line.width = Pt(2)
    txbox(slide, title, Inches(0.4), Inches(0.2), W - Inches(0.8), Inches(0.8),
          size=28, bold=True, color=GREEN, align=PP_ALIGN.CENTER)


def bullet_box(slide, items, x, y, w, h, title=None):
    """Card with optional title and bullet list."""
    card = slide.shapes.add_shape(1, x, y, w, h)
    card.fill.solid()
    card.fill.fore_color.rgb = DARK
    card.line.color.rgb = DARKBORD
    card.line.width = Pt(1.5)

    tf = slide.shapes.add_textbox(x + Inches(0.15), y + Inches(0.1),
                                  w - Inches(0.3), h - Inches(0.2))
    tf.text_frame.word_wrap = True
    first = True
    if title:
        p = tf.text_frame.paragraphs[0] if first else tf.text_frame.add_paragraph()
        first = False
        p.alignment = PP_ALIGN.LEFT
        r = p.add_run()
        r.text = title
        r.font.size = Pt(14)
        r.font.bold = True
        r.font.color.rgb = GREEN

    for item in items:
        p = tf.text_frame.add_paragraph() if not first else tf.text_frame.paragraphs[0]
        first = False
        p.alignment = PP_ALIGN.LEFT
        p.space_before = Pt(4)
        r = p.add_run()
        r.text = ("▸ " if title else "• ") + item
        r.font.size = Pt(11)
        r.font.color.rgb = WHITE


# ════════════════════════════════════════════════════════════════════════════
# SLIDE 1 — Title
# ════════════════════════════════════════════════════════════════════════════
s = add_slide()
# Center box
box = s.shapes.add_shape(1, Inches(2.5), Inches(1.5), Inches(8.3), Inches(4.5))
box.fill.solid(); box.fill.fore_color.rgb = DARK
box.line.color.rgb = GREEN; box.line.width = Pt(3)

txbox(s, "🤟  SignQuest", Inches(2.5), Inches(1.8), Inches(8.3), Inches(1.2),
      size=44, bold=True, color=GREEN, align=PP_ALIGN.CENTER)
txbox(s, "Learn American Sign Language", Inches(2.5), Inches(3.1), Inches(8.3), Inches(0.7),
      size=18, color=WHITE, align=PP_ALIGN.CENTER)
txbox(s, "AI-Powered  ·  Gamified  ·  Real-Time Camera",
      Inches(2.5), Inches(3.9), Inches(8.3), Inches(0.6),
      size=13, color=GRAY, align=PP_ALIGN.CENTER)
txbox(s, "github.com/Esomkg/aslTranslator",
      Inches(2.5), Inches(5.5), Inches(8.3), Inches(0.5),
      size=11, color=GRAY, align=PP_ALIGN.CENTER)


# ════════════════════════════════════════════════════════════════════════════
# SLIDE 2 — Problem
# ════════════════════════════════════════════════════════════════════════════
s = add_slide()
title_bar(s, "The Problem")

cards = [
    ("😔  Hard to learn alone",
     ["Most resources are passive videos", "No feedback on whether you're signing correctly"]),
    ("📚  No interactive practice",
     ["Existing apps focus on vocabulary lists", "No real-time hand recognition or coaching"]),
    ("🌍  Accessibility gap",
     ["70 million Deaf people use sign language", "Hearing people rarely learn it"]),
    ("🎮  Low engagement",
     ["Traditional learning is boring", "Learners drop off without motivation systems"]),
]
positions = [
    (Inches(0.3),  Inches(1.3)),
    (Inches(6.8),  Inches(1.3)),
    (Inches(0.3),  Inches(4.1)),
    (Inches(6.8),  Inches(4.1)),
]
for (title, items), (cx, cy) in zip(cards, positions):
    bullet_box(s, items, cx, cy, Inches(6.2), Inches(2.6), title=title)


# ════════════════════════════════════════════════════════════════════════════
# SLIDE 3 — Solution
# ════════════════════════════════════════════════════════════════════════════
s = add_slide()
title_bar(s, "Our Solution")

# Accent box
box = s.shapes.add_shape(1, Inches(1.0), Inches(1.4), Inches(11.3), Inches(2.0))
box.fill.solid(); box.fill.fore_color.rgb = DARK
box.line.color.rgb = GREEN; box.line.width = Pt(2)
txbox(s,
      "SignQuest is a gamified ASL learning platform with real-time webcam hand recognition, "
      "an AI tutor powered by Groq, and a Minecraft-inspired interface that makes learning feel like play.",
      Inches(1.2), Inches(1.5), Inches(10.9), Inches(1.8),
      size=14, color=WHITE, align=PP_ALIGN.CENTER)

# Stats row
stats = [("24", "ASL Letters"), ("AI", "Groq Tutor"), ("📷", "Live Camera"), ("🎮", "Game Mode")]
for i, (num, lbl) in enumerate(stats):
    sx = Inches(1.0 + i * 2.9)
    sy = Inches(3.8)
    box2 = s.shapes.add_shape(1, sx, sy, Inches(2.5), Inches(1.5))
    box2.fill.solid(); box2.fill.fore_color.rgb = DARK
    box2.line.color.rgb = DARKBORD; box2.line.width = Pt(1.5)
    txbox(s, num, sx, sy + Inches(0.1), Inches(2.5), Inches(0.8),
          size=28, bold=True, color=GREEN, align=PP_ALIGN.CENTER)
    txbox(s, lbl, sx, sy + Inches(0.9), Inches(2.5), Inches(0.5),
          size=11, color=GRAY, align=PP_ALIGN.CENTER)


# ════════════════════════════════════════════════════════════════════════════
# SLIDE 4 — Key Features
# ════════════════════════════════════════════════════════════════════════════
s = add_slide()
title_bar(s, "Key Features")

features = [
    "Real-time ASL letter recognition via webcam (MediaPipe + custom ML model)",
    "Sign Sprint game — sign letters before the timer, earn points & achievements",
    "Learn mode — interactive alphabet with animated SVG handshapes",
    "AI Tutor — streaming chat with Groq llama-3.3-70b, tool calling, web search",
    "Spell Your Name — sign each letter of your name with live camera feedback",
    "Progress tracking — practiced letters, streaks, achievements, high scores",
    "Supabase auth — login / guest mode, cloud sync across devices",
    "Daily challenges, quiz mode, difficulty levels (Easy / Normal / Hard)",
]
bullet_box(s, features, Inches(0.5), Inches(1.3), Inches(12.3), Inches(5.8))


# ════════════════════════════════════════════════════════════════════════════
# SLIDE 5 — AI Tutor
# ════════════════════════════════════════════════════════════════════════════
s = add_slide()
title_bar(s, "AI Tutor — Powered by Groq")

ai_cards = [
    ("🧠  Personalized",
     ["Knows your practiced letters & weak spots", "Every response tailored to your progress"]),
    ("🔧  8 Tool Calls",
     ["Stats, lesson plans, web search", "Sign lookup, Deaf culture, common errors"]),
    ("🌐  Web Search",
     ["Tavily-powered real-time search", "Finds YouTube tutorials & ASL resources"]),
    ("📋  Lesson Plans",
     ["Structured exercises & weak spot analysis", "Next letters to learn, drill suggestions"]),
    ("🏛️  Deaf Culture",
     ["ASL grammar (not English word order)", "History, culture, facial expressions"]),
    ("💬  Chat Memory",
     ["History persisted in Supabase", "Summarizes long conversations automatically"]),
]
positions6 = [
    (Inches(0.2),  Inches(1.3)),
    (Inches(4.55), Inches(1.3)),
    (Inches(8.9),  Inches(1.3)),
    (Inches(0.2),  Inches(4.1)),
    (Inches(4.55), Inches(4.1)),
    (Inches(8.9),  Inches(4.1)),
]
for (title, items), (cx, cy) in zip(ai_cards, positions6):
    bullet_box(s, items, cx, cy, Inches(4.1), Inches(2.6), title=title)


# ════════════════════════════════════════════════════════════════════════════
# SLIDE 6 — Tech Stack
# ════════════════════════════════════════════════════════════════════════════
s = add_slide()
title_bar(s, "Tech Stack")

cols = [
    ("Frontend", ["React 18 + TypeScript", "Vite", "SVG Animations", "Web Speech API", "WebSocket client"]),
    ("Backend",  ["FastAPI (Python 3.11)", "WebSocket server", "MediaPipe Hands", "scikit-learn ML", "httpx"]),
    ("AI / Data",["Groq API (llama-3.3-70b)", "Tavily web search", "Supabase (Postgres)", "Row-level security", "Chat history"]),
]
for i, (title, items) in enumerate(cols):
    cx = Inches(0.3 + i * 4.35)
    bullet_box(s, items, cx, Inches(1.3), Inches(4.1), Inches(5.8), title=title)


# ════════════════════════════════════════════════════════════════════════════
# SLIDE 7 — Architecture
# ════════════════════════════════════════════════════════════════════════════
s = add_slide()
title_bar(s, "System Architecture")

arch_cards = [
    ("Frontend (React)",
     ["LandingPage · AuthPage · LearnPage",
      "GamePage · TranslatorPage · AITutorPage",
      "Webcam → WebSocket → Backend",
      "Streaming chat via ReadableStream"]),
    ("Backend (FastAPI)",
     ["/ws/{id} — sign recognition",
      "/ws/practice/{id} — letter practice",
      "POST /api/chat — streaming AI",
      "POST /api/chat/greeting & /history"]),
    ("ML Pipeline",
     ["MediaPipe Hands → 21 landmarks",
      "63 features (x,y,z per point)",
      "scikit-learn classifier",
      "Letter prediction + confidence score"]),
    ("Data Layer (Supabase)",
     ["user_progress — letters & scores",
      "chat_history — AI conversation",
      "Row-level security via JWT",
      "Guest mode via localStorage"]),
]
positions4 = [
    (Inches(0.2),  Inches(1.3)),
    (Inches(6.8),  Inches(1.3)),
    (Inches(0.2),  Inches(4.1)),
    (Inches(6.8),  Inches(4.1)),
]
for (title, items), (cx, cy) in zip(arch_cards, positions4):
    bullet_box(s, items, cx, cy, Inches(6.2), Inches(2.6), title=title)


# ════════════════════════════════════════════════════════════════════════════
# SLIDE 8 — App Pages
# ════════════════════════════════════════════════════════════════════════════
s = add_slide()
title_bar(s, "App Pages")

page_cards = [
    ("🏠  Landing Page",
     ["Animated floating hands background", "Login / guest mode", "Navigation to all features"]),
    ("📖  Learn Mode",
     ["Full alphabet with animated SVG hands", "Quiz mode (10-question rounds)", "Practice modal with live camera"]),
    ("🎮  Sign Sprint",
     ["Lives, timer, streaks", "Difficulty levels + daily challenge", "Achievements & high scores"]),
    ("🤖  AI Tutor",
     ["Streaming chat + quick-reply chips", "Inline handshape previews", "YouTube embeds & lesson cards"]),
    ("📷  Translator",
     ["Live ASL-to-English via webcam", "Real-time letter accumulation", "Session history export"]),
    ("✍️  Spell Your Name",
     ["Type your name, sign each letter", "Live camera feedback per letter", "Celebrates on completion"]),
]
for (title, items), (cx, cy) in zip(page_cards, positions6):
    bullet_box(s, items, cx, cy, Inches(4.1), Inches(2.6), title=title)


# ════════════════════════════════════════════════════════════════════════════
# SLIDE 9 — What's Next
# ════════════════════════════════════════════════════════════════════════════
s = add_slide()
title_bar(s, "What's Next")

next_cards = [
    ("🔤  Word & Phrase Recognition",
     ["Extend ML model beyond letters", "Recognize full ASL words & phrases"]),
    ("👥  Multiplayer Mode",
     ["Sign against friends in real time", "Leaderboards and social features"]),
    ("📱  Mobile App",
     ["React Native port for iOS/Android", "Native camera access"]),
    ("🌍  Other Sign Languages",
     ["BSL, LSF, Auslan support", "Serve global Deaf communities"]),
]
for (title, items), (cx, cy) in zip(next_cards, positions4):
    bullet_box(s, items, cx, cy, Inches(6.2), Inches(2.6), title=title)


# ════════════════════════════════════════════════════════════════════════════
# SLIDE 10 — Closing
# ════════════════════════════════════════════════════════════════════════════
s = add_slide()
box = s.shapes.add_shape(1, Inches(2.0), Inches(1.2), Inches(9.3), Inches(5.1))
box.fill.solid(); box.fill.fore_color.rgb = DARK
box.line.color.rgb = GREEN; box.line.width = Pt(3)

txbox(s, "🤟  SignQuest", Inches(2.0), Inches(1.5), Inches(9.3), Inches(1.2),
      size=40, bold=True, color=GREEN, align=PP_ALIGN.CENTER)
txbox(s, "Making ASL accessible, engaging,\nand genuinely educational for everyone.",
      Inches(2.0), Inches(2.9), Inches(9.3), Inches(1.5),
      size=16, color=WHITE, align=PP_ALIGN.CENTER)
txbox(s, "github.com/Esomkg/aslTranslator",
      Inches(2.0), Inches(4.7), Inches(9.3), Inches(0.5),
      size=12, color=GRAY, align=PP_ALIGN.CENTER)


# ── Save ────────────────────────────────────────────────────────────────────
prs.save("SignQuest.pptx")
print("✅  SignQuest.pptx created — drag it into Google Drive to open as Google Slides.")
