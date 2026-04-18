"""
AI Agent for ASL learning assistance using Groq API with tool calling.

Improvements:
  - Always-on user context injected into every system prompt (#2)
  - Multi-turn tool calling loop up to 4 iterations (#1)
  - Smart search query rewriting for better Tavily results (#5)
  - Embedded ASL handshape knowledge base (#8)
"""

import os
import re
import json
import httpx
from openai import OpenAI

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")

# OpenRouter model — change this to any model on openrouter.ai/models
MODEL = "meta-llama/llama-3.3-70b-instruct"
MAX_TOOL_ITERATIONS = 4

ALL_LETTERS = list("ABCDEFGHIKLMNOPQRSTUVWXY")

# ---------------------------------------------------------------------------
# #8 — ASL Handshape Knowledge Base
# ---------------------------------------------------------------------------

ASL_HANDSHAPES: dict[str, dict] = {
    "A": {"shape": "Fist with thumb resting on side of index finger", "palm": "Faces outward", "common_mistakes": "Confusing with S (thumb position differs) and E (fingers more curled in E)", "tip": "Thumb sits beside the fist, not tucked under"},
    "B": {"shape": "Four fingers straight up, thumb tucked across palm", "palm": "Faces outward", "common_mistakes": "Forgetting to tuck thumb", "tip": "Fingers flat and together, thumb fully tucked"},
    "C": {"shape": "Curved hand like holding a cup", "palm": "Faces sideways", "common_mistakes": "Making it too flat or too closed", "tip": "Imagine gripping a tennis ball"},
    "D": {"shape": "Index finger points up, other fingers curl to touch thumb forming a circle", "palm": "Faces outward", "common_mistakes": "Confusing with G", "tip": "Middle/ring/pinky touch the thumb tip"},
    "E": {"shape": "All fingers bent/hooked, thumb tucked under", "palm": "Faces outward", "common_mistakes": "Confusing with A and S — fingers are more hooked than A, thumb tucked unlike S", "tip": "Fingertips curl down toward palm"},
    "F": {"shape": "Index finger and thumb touch forming a circle, other three fingers up", "palm": "Faces outward", "common_mistakes": "Confusing with 9 number sign", "tip": "Three fingers spread wide and straight"},
    "G": {"shape": "Index finger points sideways, thumb parallel pointing same direction", "palm": "Faces inward", "common_mistakes": "Confusing with D and H", "tip": "Like pointing a gun sideways"},
    "H": {"shape": "Index and middle fingers extended together pointing sideways", "palm": "Faces inward", "common_mistakes": "Confusing with U (U points up, H points sideways)", "tip": "Two fingers flat and horizontal"},
    "I": {"shape": "Pinky finger extended, other fingers curled into fist", "palm": "Faces outward", "common_mistakes": "Confusing with Y (Y has thumb out too)", "tip": "Only the pinky — keep thumb tucked"},
    "K": {"shape": "Index and middle fingers up in V shape, thumb between them touching middle finger", "palm": "Faces outward", "common_mistakes": "Confusing with V (thumb placement differs)", "tip": "Thumb touches the middle finger knuckle"},
    "L": {"shape": "Index finger points up, thumb points out — L shape", "palm": "Faces outward", "common_mistakes": "Not keeping other fingers curled", "tip": "Classic L shape — clean right angle"},
    "M": {"shape": "Three fingers (index, middle, ring) folded over tucked thumb", "palm": "Faces down", "common_mistakes": "Confusing with N (N uses two fingers)", "tip": "Three fingers over thumb = M (3 humps)"},
    "N": {"shape": "Two fingers (index, middle) folded over tucked thumb", "palm": "Faces down", "common_mistakes": "Confusing with M (M uses three fingers)", "tip": "Two fingers over thumb = N (2 humps)"},
    "O": {"shape": "All fingers curved to touch thumb tip forming an O", "palm": "Faces outward", "common_mistakes": "Making it too flat", "tip": "Fingertips and thumb tip all meet"},
    "P": {"shape": "Like K but hand points downward", "palm": "Faces down", "common_mistakes": "Confusing with K", "tip": "K rotated so fingers point to the floor"},
    "Q": {"shape": "Like G but hand points downward", "palm": "Faces down", "common_mistakes": "Confusing with G", "tip": "G rotated so fingers point to the floor"},
    "R": {"shape": "Index and middle fingers crossed", "palm": "Faces outward", "common_mistakes": "Not crossing fingers enough", "tip": "Middle finger crosses over index — like crossing your fingers for luck"},
    "S": {"shape": "Fist with thumb over fingers", "palm": "Faces outward", "common_mistakes": "Confusing with A (thumb position) and E", "tip": "Thumb wraps over the front of the fingers"},
    "T": {"shape": "Thumb tucked between index and middle fingers", "palm": "Faces outward", "common_mistakes": "Confusing with D", "tip": "Thumb peeks out between index and middle"},
    "U": {"shape": "Index and middle fingers extended together pointing up", "palm": "Faces outward", "common_mistakes": "Confusing with H (H is horizontal, U is vertical) and V", "tip": "Two fingers together and straight up"},
    "V": {"shape": "Index and middle fingers in V/peace sign", "palm": "Faces outward", "common_mistakes": "Confusing with U (U fingers together, V spread apart)", "tip": "Spread the two fingers apart like a peace sign"},
    "W": {"shape": "Index, middle, ring fingers spread in W shape, thumb and pinky touch", "palm": "Faces outward", "common_mistakes": "Not spreading fingers enough", "tip": "Three fingers spread = W"},
    "X": {"shape": "Index finger hooked/bent like a hook", "palm": "Faces outward", "common_mistakes": "Bending too much or too little", "tip": "Just the index finger curled like a hook"},
    "Y": {"shape": "Thumb and pinky extended, other fingers curled", "palm": "Faces outward", "common_mistakes": "Confusing with I (I has no thumb)", "tip": "Hang loose / shaka sign"},
}

CONFUSABLE_PAIRS = [
    ("A", "S", "E"),
    ("U", "V", "H"),
    ("M", "N"),
    ("P", "Q"),
    ("G", "D"),
    ("K", "V"),
    ("R", "U"),
    ("T", "D"),
    ("I", "Y"),
]

# ---------------------------------------------------------------------------
# ASL Common Signs Knowledge Base (beyond fingerspelling)
# ---------------------------------------------------------------------------

ASL_COMMON_SIGNS: dict[str, dict] = {
    "hello": {
        "description": "Open hand, fingers together, touch forehead with fingertips then move hand outward (like a salute)",
        "handshape": "Flat B hand",
        "movement": "Starts at forehead, sweeps outward away from body",
        "tip": "Think of a casual salute — relaxed, not military",
        "category": "greeting",
    },
    "thank you": {
        "description": "Flat hand touches chin/lips then moves forward toward the person you're thanking",
        "handshape": "Flat open hand",
        "movement": "Fingertips touch chin, then extend outward",
        "tip": "Like blowing a kiss but more formal — you're sending gratitude outward",
        "category": "courtesy",
    },
    "please": {
        "description": "Flat hand on chest, circular motion",
        "handshape": "Flat open hand",
        "movement": "Rub hand in a circle on the chest",
        "tip": "The circular rubbing motion on the chest is the key — it's a warm, polite gesture",
        "category": "courtesy",
    },
    "sorry": {
        "description": "Fist (A handshape) on chest, circular motion",
        "handshape": "A handshape (fist)",
        "movement": "Rub fist in a circle on the chest",
        "tip": "Same location as 'please' but with a fist instead of flat hand — the fist shows sincerity",
        "category": "courtesy",
    },
    "yes": {
        "description": "S handshape (fist) nods up and down like a head nodding",
        "handshape": "S handshape (fist)",
        "movement": "Wrist bends to make the fist nod up and down",
        "tip": "Your hand is literally nodding — same motion as a head nod",
        "category": "basic",
    },
    "no": {
        "description": "Index and middle fingers snap down to touch thumb (like a mouth saying 'no')",
        "handshape": "Index + middle extended, then snap to thumb",
        "movement": "Two fingers snap closed to thumb twice",
        "tip": "Looks like a mouth snapping shut — quick double snap",
        "category": "basic",
    },
    "help": {
        "description": "Flat hand (B) on top of fist (A), both hands move upward together",
        "handshape": "One hand flat, other in fist",
        "movement": "Fist rests on flat palm, both lift upward",
        "tip": "The flat hand is lifting/supporting the fist — you're being lifted up",
        "category": "basic",
    },
    "water": {
        "description": "W handshape taps chin twice",
        "handshape": "W handshape (3 fingers spread)",
        "movement": "Tap chin with W handshape twice",
        "tip": "W for water, tapped at the mouth where you drink",
        "category": "common",
    },
    "eat": {
        "description": "Flat O handshape (fingers bunched) taps mouth repeatedly",
        "handshape": "Flat O (fingertips touching thumb)",
        "movement": "Bring hand to mouth repeatedly",
        "tip": "Mimics putting food in your mouth",
        "category": "common",
    },
    "more": {
        "description": "Both hands in flat O shape, fingertips tap together repeatedly",
        "handshape": "Both hands flat O",
        "movement": "Fingertips of both hands tap together",
        "tip": "Like pinching both hands together — gathering more",
        "category": "common",
    },
    "stop": {
        "description": "One flat hand chops down onto the other flat palm",
        "handshape": "Both flat B hands",
        "movement": "Dominant hand chops down onto non-dominant palm",
        "tip": "Sharp, decisive chop — like a stop sign",
        "category": "basic",
    },
    "good": {
        "description": "Flat hand touches chin then moves forward and down into other palm",
        "handshape": "Flat B hand",
        "movement": "Fingertips touch chin, then hand moves forward landing in other palm",
        "tip": "Similar to 'thank you' but lands in your other hand",
        "category": "basic",
    },
    "bad": {
        "description": "Flat hand touches chin then flips down/away",
        "handshape": "Flat B hand",
        "movement": "Fingertips touch chin, then hand flips outward/downward",
        "tip": "Opposite motion to 'good' — throwing the bad thing away",
        "category": "basic",
    },
    "love": {
        "description": "Cross arms over chest (like hugging yourself)",
        "handshape": "Both fists or flat hands crossed",
        "movement": "Arms cross over chest, hands near shoulders",
        "tip": "Universal — like hugging your heart",
        "category": "emotion",
    },
    "friend": {
        "description": "Hook index fingers together and switch which is on top",
        "handshape": "Both index fingers hooked (X handshape)",
        "movement": "Hook together, then flip so other hand is on top",
        "tip": "Two people linked together — the switching shows mutual connection",
        "category": "social",
    },
    "name": {
        "description": "Both H handshapes (two fingers horizontal), tap middle fingers together twice",
        "handshape": "Both H handshapes",
        "movement": "Middle fingers of both H hands tap together twice",
        "tip": "Used when asking 'what's your name?' — MY NAME IS is a common intro phrase",
        "category": "social",
    },
    "learn": {
        "description": "Flat O hand at forehead, opens to 5 hand as it moves away",
        "handshape": "Flat O opening to 5",
        "movement": "Starts closed at forehead, opens as it moves away",
        "tip": "Taking knowledge from a book and putting it in your head",
        "category": "education",
    },
    "understand": {
        "description": "Index finger at temple, flicks upward (like a lightbulb going on)",
        "handshape": "Index finger (1 handshape)",
        "movement": "Finger at temple flicks up quickly",
        "tip": "The lightbulb moment — sudden understanding",
        "category": "education",
    },
    "practice": {
        "description": "A handshape rubs back and forth on non-dominant index finger",
        "handshape": "A handshape (fist)",
        "movement": "Knuckles rub back and forth on extended index finger of other hand",
        "tip": "Repetitive motion = repetitive practice",
        "category": "education",
    },
    "sign": {
        "description": "Both index fingers point at each other and rotate in alternating circles",
        "handshape": "Both index fingers (1 handshape)",
        "movement": "Alternating circular motion toward each other",
        "tip": "Represents the flowing movement of signing",
        "category": "asl_meta",
    },
}

# ---------------------------------------------------------------------------
# Deaf Culture & ASL Grammar Knowledge Base
# ---------------------------------------------------------------------------

DEAF_CULTURE_TOPICS: dict[str, dict] = {
    "asl_grammar": {
        "title": "ASL Grammar — It's Not English",
        "content": """ASL has its own complete grammar system, completely independent of English:

TOPIC-COMMENT STRUCTURE: ASL often puts the topic first, then the comment.
  English: "I went to the store yesterday"
  ASL: "YESTERDAY STORE I GO" (topic=yesterday/store, comment=I go)

TIME COMES FIRST: Time markers go at the start of a sentence.
  English: "I will eat tomorrow"
  ASL: "TOMORROW I EAT"

YES/NO QUESTIONS: Raise eyebrows, lean head forward slightly.
  The facial expression IS the question mark — not a sign.

WH-QUESTIONS (who, what, where, when, why): Furrow brows, lean head forward.
  These go at the END of the sentence in ASL.
  English: "Where do you live?"
  ASL: "YOU LIVE WHERE?" (with furrowed brows on WHERE)

NEGATION: Head shake while signing the verb, or add NOT.
  "I don't like" = sign LIKE while shaking head, or LIKE NOT

CLASSIFIERS: Handshapes that represent categories of objects.
  A flat hand can represent a flat surface, a vehicle, a person lying down — context determines meaning.

NO ARTICLES: ASL has no signs for "a", "an", "the" — context handles this.

NO TO-BE VERBS: "I am happy" = just "I HAPPY" with appropriate facial expression.""",
        "key_point": "ASL is a complete, complex language — not signed English or a code for English",
    },
    "deaf_culture": {
        "title": "Deaf Culture Basics",
        "content": """Deaf culture is a rich, vibrant community with its own values, history, and identity:

CAPITAL D vs lowercase d:
  'Deaf' (capital D) = cultural identity, part of the Deaf community
  'deaf' (lowercase) = audiological condition (hearing loss)
  Many Deaf people see deafness as a difference, not a disability.

DEAF SCHOOLS & COMMUNITY:
  Residential schools for the Deaf were historically centers of culture and language transmission.
  Gallaudet University (Washington DC) is the world's only university designed for Deaf students.

EYE CONTACT:
  Maintaining eye contact while signing is respectful and necessary — looking away is like covering your ears.
  To get a Deaf person's attention: wave in their visual field, tap shoulder, or flash lights.

HEARING AIDS & COCHLEAR IMPLANTS:
  Views vary widely in the community. Many Deaf people don't see themselves as needing to be "fixed."
  This is a sensitive topic — follow the individual's lead.

INTERPRETERS:
  When using an interpreter, speak to the Deaf person directly ("tell her...") is considered rude.
  Speak directly to the Deaf person; the interpreter is a communication tool, not the conversation partner.

ASL IS NOT UNIVERSAL:
  Different countries have different sign languages (BSL in UK, LSF in France, etc.)
  Even within the US, there are regional variations and Black ASL (BASL) with its own history.""",
        "key_point": "Deaf culture is a linguistic minority culture, not a disability group",
    },
    "fingerspelling": {
        "title": "When to Use Fingerspelling",
        "content": """Fingerspelling (using the manual alphabet) has specific uses in ASL:

WHEN TO FINGERSPELL:
  - Proper nouns: names of people, places, brands (STARBUCKS, AMAZON)
  - Technical terms without an established sign
  - English words being quoted or referenced as English
  - When you don't know the sign for something

WHEN NOT TO FINGERSPELL:
  - Common words that have established signs (use the sign, not the spelling)
  - Fingerspelling everything is a sign of a beginner — fluent signers use it selectively

LOAN SIGNS:
  Some fingerspelled words get abbreviated into signs over time.
  Examples: #BACK, #JOB, #WHAT — the # symbol indicates a lexicalized fingerspelled sign.

SPEED:
  Fluent fingerspelling is fast and rhythmic — don't pause between letters.
  Beginners should focus on smooth flow over speed.""",
        "key_point": "Fingerspelling is a tool within ASL, not a substitute for learning signs",
    },
    "history": {
        "title": "Brief History of ASL",
        "content": """ASL's origins trace back to the early 1800s:

1817: American School for the Deaf founded in Hartford, CT by Thomas Hopkins Gallaudet and Laurent Clerc.
  Clerc was a Deaf teacher from France who brought French Sign Language (LSF).
  LSF mixed with local sign systems used by Deaf Americans → became ASL.

MARTHA'S VINEYARD:
  Before 1817, Martha's Vineyard had a high rate of hereditary deafness.
  The entire community (hearing and Deaf) used a sign language — an early example of a signing community.

MILAN CONFERENCE 1880:
  International conference voted to ban sign language in Deaf education, forcing oral-only methods.
  This caused decades of suppression of ASL and Deaf culture.
  Deaf teachers were fired; signing was punished in schools.

REVIVAL:
  William Stokoe's 1960 linguistic analysis proved ASL is a complete language.
  This was revolutionary — ASL had been dismissed as "mere gestures."
  Led to the revival of sign language in Deaf education.""",
        "key_point": "ASL is approximately 200 years old and has survived active suppression",
    },
    "learning_tips": {
        "title": "Tips for Learning ASL Effectively",
        "content": """Evidence-based advice for ASL learners:

IMMERSION IS KEY:
  The fastest way to learn is exposure to fluent signers.
  Watch ASL content on YouTube, attend Deaf events, find a Deaf language partner.

FACIAL EXPRESSIONS ARE GRAMMAR:
  Don't sign with a blank face — you're missing half the language.
  Raised eyebrows = yes/no question
  Furrowed brows = wh-question or negation
  Puffed cheeks = large/heavy
  Pursed lips = small/thin

DOMINANT HAND:
  Pick one dominant hand and stick with it — switching is confusing.
  Most signs are done with the dominant hand; the non-dominant hand is often the base.

SPACE:
  ASL uses the space in front of you grammatically.
  Setting up referents in space (pointing to locations for people/things) is essential grammar.

COMMON BEGINNER MISTAKES:
  - Signing too small (use full signing space)
  - Ignoring facial expressions
  - Fingerspelling everything instead of learning signs
  - Translating word-for-word from English""",
        "key_point": "ASL fluency requires learning the grammar and culture, not just the signs",
    },
}

# ---------------------------------------------------------------------------
# Common Beginner Errors Database
# ---------------------------------------------------------------------------

COMMON_ERRORS: list[dict] = [
    {
        "id": 1,
        "error": "Confusing A, S, and E handshapes",
        "description": "These three look similar — all are fist-like — but thumb position is different",
        "correction": "A: thumb on side of fist. S: thumb over fingers. E: fingers hooked, thumb tucked under. Practice all three in sequence.",
        "category": "handshape",
    },
    {
        "id": 2,
        "error": "Confusing U and V",
        "description": "Both use two fingers up, but U has fingers together and V has them spread",
        "correction": "U = fingers touching (like the letter U shape). V = fingers spread (peace sign). Exaggerate the spread for V.",
        "category": "handshape",
    },
    {
        "id": 3,
        "error": "Confusing M and N",
        "description": "Both fold fingers over the thumb, but M uses 3 fingers and N uses 2",
        "correction": "M = 3 humps = 3 fingers. N = 2 humps = 2 fingers. Count the humps in the letter shape.",
        "category": "handshape",
    },
    {
        "id": 4,
        "error": "Blank facial expression while signing",
        "description": "Signing without facial expressions removes grammatical information — questions, negations, and intensity all require specific expressions",
        "correction": "Practice in a mirror. Raised brows for yes/no questions, furrowed brows for wh-questions. Facial expression is not optional.",
        "category": "grammar",
    },
    {
        "id": 5,
        "error": "Translating English word-for-word into ASL",
        "description": "ASL has different word order (Topic-Comment, time first) and no articles or to-be verbs",
        "correction": "Think in concepts, not English words. 'I am going to the store tomorrow' → 'TOMORROW STORE I GO'",
        "category": "grammar",
    },
    {
        "id": 6,
        "error": "Fingerspelling everything instead of using signs",
        "description": "Beginners often fingerspell common words that have established signs",
        "correction": "Learn the signs for common words (HELLO, THANK YOU, PLEASE, YES, NO, HELP). Fingerspelling is for proper nouns and unknown words.",
        "category": "fluency",
    },
    {
        "id": 7,
        "error": "Signing too small or close to the body",
        "description": "Signs made too small are hard to read and look unnatural",
        "correction": "Use your full signing space — roughly from waist to top of head, shoulder-width. Signs should be clear and visible.",
        "category": "production",
    },
    {
        "id": 8,
        "error": "Inconsistent dominant hand",
        "description": "Switching which hand is dominant mid-conversation is confusing",
        "correction": "Pick your dominant hand (usually your writing hand) and always use it as the active hand. Never switch.",
        "category": "production",
    },
    {
        "id": 9,
        "error": "Confusing H and U",
        "description": "Both use two fingers, but H is horizontal and U is vertical",
        "correction": "H = Horizontal (fingers point sideways). U = Up (fingers point up). The letter shape tells you the direction.",
        "category": "handshape",
    },
    {
        "id": 10,
        "error": "Forgetting to tuck thumb in B",
        "description": "B requires the thumb tucked across the palm — leaving it out makes it look like a 4",
        "correction": "Actively press the thumb across the palm. Four fingers straight up, thumb tucked in.",
        "category": "handshape",
    },
    {
        "id": 11,
        "error": "Confusing I and Y",
        "description": "I is just the pinky up; Y adds the thumb out (shaka/hang loose)",
        "correction": "I = pinky only. Y = pinky AND thumb (shaka sign). Check your thumb position.",
        "category": "handshape",
    },
    {
        "id": 12,
        "error": "Not maintaining eye contact",
        "description": "Looking away while signing is like covering your ears — it breaks communication",
        "correction": "Maintain eye contact with your conversation partner. Looking at your own hands is a beginner habit to break.",
        "category": "culture",
    },
    {
        "id": 13,
        "error": "Pausing between letters when fingerspelling",
        "description": "Fingerspelling should flow smoothly — pausing between each letter makes it hard to read",
        "correction": "Practice words as units, not individual letters. Aim for smooth, rhythmic flow. Speed comes with practice.",
        "category": "fluency",
    },
    {
        "id": 14,
        "error": "Confusing G and D",
        "description": "Both involve the index finger, but G points sideways and D points up with other fingers circling the thumb",
        "correction": "G = gun pointing sideways (index + thumb parallel, pointing sideways). D = index up, other fingers make a circle with thumb.",
        "category": "handshape",
    },
    {
        "id": 15,
        "error": "Confusing K and V",
        "description": "Both have two fingers up, but K has the thumb between the fingers touching the middle finger",
        "correction": "V = peace sign, no thumb involvement. K = thumb inserted between index and middle, touching middle finger knuckle.",
        "category": "handshape",
    },
    {
        "id": 16,
        "error": "Using English mouth movements for every sign",
        "description": "Mouthing English words for every sign is not standard ASL — it's a feature of Signed Exact English (SEE), not ASL",
        "correction": "In ASL, mouth movements are used selectively and have their own grammar. Some signs have associated mouth morphemes (like 'puffed cheeks' for large).",
        "category": "grammar",
    },
    {
        "id": 17,
        "error": "Signing R without crossing fingers enough",
        "description": "R requires the middle finger clearly crossed over the index — a subtle cross looks like U",
        "correction": "Exaggerate the cross — middle finger should be clearly on top of index. Practice the distinction between R and U.",
        "category": "handshape",
    },
    {
        "id": 18,
        "error": "Treating ASL as a universal sign language",
        "description": "Learners sometimes assume all Deaf people worldwide use the same sign language",
        "correction": "Every country has its own sign language. British Sign Language (BSL) is completely different from ASL. Even within ASL there are regional and cultural variations.",
        "category": "culture",
    },
    {
        "id": 19,
        "error": "Rushing through signs without proper handshape formation",
        "description": "Speed without accuracy creates sloppy, unreadable signing",
        "correction": "Slow down and form each handshape correctly. Accuracy first, speed second. Fluent signers are accurate AND fast.",
        "category": "production",
    },
    {
        "id": 20,
        "error": "Ignoring non-manual markers (NMMs)",
        "description": "Non-manual markers include facial expressions, head tilts, shoulder raises, and mouth movements — all are grammatically significant",
        "correction": "Study NMMs explicitly. A sentence signed with wrong NMMs can change meaning completely or be grammatically incorrect.",
        "category": "grammar",
    },
]

def _build_user_context(
    user_jwt: str | None,
    practiced_letters: list[str] | None,
    missed_letters: list[dict] | None = None,
) -> str:
    """
    Build a compact context block injected into every system prompt.
    For logged-in users: fetches live stats from Supabase.
    For guests: uses localStorage data passed from frontend.
    """
    if user_jwt:
        stats = _get_user_stats(user_jwt)
        if "error" not in stats:
            practiced = stats.get("practiced_letters") or []
            remaining = stats.get("remaining_letters") or []
            achievements = stats.get("unlocked_achievements") or []
            scores = stats.get("high_scores") or []

            # Identify weak spots from confusable pairs
            practiced_set = set(practiced)
            weak = []
            for group in CONFUSABLE_PAIRS:
                if any(l in practiced_set for l in group) and not all(l in practiced_set for l in group):
                    weak.extend([l for l in group if l not in practiced_set])
            weak = list(set(weak))[:6]

            level = "Beginner" if len(practiced) < 8 else "Intermediate" if len(practiced) < 18 else "Advanced"

            ctx = f"""
[USER PROFILE — use this to personalize every response]
- Level: {level} ({len(practiced)}/{len(ALL_LETTERS)} letters practiced)
- Practiced letters: {', '.join(practiced) if practiced else 'none yet'}
- Not yet practiced: {', '.join(remaining[:10]) if remaining else 'all done!'}{'...' if len(remaining) > 10 else ''}
- Potential weak spots (confusable pairs): {', '.join(weak) if weak else 'none identified yet'}
- Achievements unlocked: {', '.join(achievements) if achievements else 'none yet'}
- Top scores: {scores if scores else 'no games played yet'}
"""
            if missed_letters:
                top = ", ".join(f"{m['letter']}({m['misses']}x)" for m in missed_letters[:6])
                ctx += f"- Most missed in games: {top}\n"
            return ctx

    # Guest mode — use localStorage data
    if practiced_letters:
        remaining = [l for l in ALL_LETTERS if l not in practiced_letters]
        practiced_set = set(practiced_letters)
        weak = []
        for group in CONFUSABLE_PAIRS:
            if any(l in practiced_set for l in group) and not all(l in practiced_set for l in group):
                weak.extend([l for l in group if l not in practiced_set])
        weak = list(set(weak))[:6]
        level = "Beginner" if len(practiced_letters) < 8 else "Intermediate" if len(practiced_letters) < 18 else "Advanced"
        miss_line = ""
        if missed_letters:
            miss_line = "- Most missed in games: " + ", ".join(
                f"{m['letter']}({m['misses']}x)" for m in missed_letters[:6]
            )
        return f"""
[USER PROFILE — guest mode]
- Level: {level} ({len(practiced_letters)}/{len(ALL_LETTERS)} letters practiced)
- Practiced: {', '.join(practiced_letters)}
- Not yet practiced: {', '.join(remaining[:10]) if remaining else 'all done!'}
- Potential weak spots: {', '.join(weak) if weak else 'none yet'}
{miss_line}
"""

    return "\n[USER PROFILE — not logged in, no progress data available]\n"


BASE_SYSTEM_PROMPT = """You are an expert ASL (American Sign Language) tutor embedded in a Minecraft-themed learning app called SignQuest.

LOCATION QUERIES — IMPORTANT:
When a user asks about ASL schools, classes, programs, or learning centers (in-person or online), ALWAYS call the find_asl_locations tool.
This will render an interactive map in the chat showing nearby locations.
DO NOT list specific school names or addresses in your text response — the map handles that.
Just briefly say the map is showing nearby options and let the user explore it.
Examples that should trigger find_asl_locations:
- "Where can I take ASL classes near me?"
- "Are there ASL schools in [city]?"
- "Find me ASL programs in Texas"
- "I want to learn ASL in person"
- "ASL classes online"

You have deep knowledge of ASL fingerspelling, common signs, Deaf culture, ASL grammar, and effective teaching strategies.

TOOLS — use proactively:
- get_user_stats: user asks about stats/progress/achievements
- suggest_next_lesson: user wants a lesson plan or what to practice next
- search_web: user asks for videos, tutorials, links, or external resources
- get_letter_detail: user asks how to sign a specific LETTER (A-Z)
- get_miss_history: user asks what they struggle with or for targeted feedback
- get_asl_sign: user asks how to sign a WORD or PHRASE (hello, thank you, please, sorry, yes, no, help, etc.)
- get_deaf_culture_info: user asks about Deaf culture, ASL grammar/word order, facial expressions, history, or learning tips
- get_common_errors: user asks about common mistakes, what to avoid, or how to improve

KNOWLEDGE SCOPE:
You can answer questions about:
- All 24 ASL fingerspelling letters (use get_letter_detail)
- Common everyday signs: greetings, courtesy, basic vocabulary (use get_asl_sign)
- ASL grammar: topic-comment structure, time-first order, no articles, facial expressions as grammar (use get_deaf_culture_info with topic=asl_grammar)
- Deaf culture: community values, Deaf identity, history, etiquette (use get_deaf_culture_info with topic=deaf_culture)
- Common beginner mistakes with specific corrections (use get_common_errors)
- When to fingerspell vs use signs (use get_deaf_culture_info with topic=fingerspelling)

INLINE LETTER TAGS — IMPORTANT:
Whenever you mention a specific ASL letter by name (e.g. "the letter R", "sign an A", "practice B and C"),
wrap it in a [LETTER:X] tag like this: [LETTER:R], [LETTER:A], [LETTER:B].
This renders an interactive handshape preview inline in the chat.
Only tag single uppercase letters that are ASL fingerspelling letters (A-Z).
Example: "Try practicing [LETTER:R] and [LETTER:U] since they look similar."

INLINE SIGN TAGS — IMPORTANT:
Whenever you describe or mention a common ASL sign by name, wrap it in a [SIGN:name] tag.
Supported signs: hello, thank you, please, sorry, yes, no, help, good, love, water, more, stop, friend.
Example: "To greet someone, use [SIGN:hello] — flat hand sweeps from forehead outward."
Example: "Show gratitude with [SIGN:thank you] and politeness with [SIGN:please]."
Only use [SIGN:x] for signs in the supported list above.

RESPONSE STYLE:
- Be concise and practical — bullet points preferred
- Reference the user's actual progress when relevant (their profile is in the system prompt)
- Be encouraging but specific — not just "great job!" but "you've mastered 12 letters, the next challenge is M vs N"
- For handshape questions, give precise anatomical detail
- Always use [LETTER:X] tags when mentioning specific letters
- When explaining ASL grammar, contrast with English to make it clear
- Treat Deaf culture topics with respect — Deaf people are a linguistic minority, not a disability group"""


# ---------------------------------------------------------------------------
# Tool definitions
# ---------------------------------------------------------------------------

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_user_stats",
            "description": "Retrieves full ASL learning stats from the database: practiced letters, achievements, high scores.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "suggest_next_lesson",
            "description": "Generates a personalized lesson plan based on the user's practiced letters, weak spots, and level.",
            "parameters": {
                "type": "object",
                "properties": {
                    "focus": {
                        "type": "string",
                        "description": "Optional focus: 'fingerspelling speed', 'confusing letters', 'new letters', 'game practice'",
                    }
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "Searches the internet for ASL learning resources, YouTube videos, and tutorials. Always use this for resource/video requests.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search query — be specific"}
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_letter_detail",
            "description": "Returns precise handshape details for a specific ASL letter from the embedded knowledge base: finger positions, palm direction, common mistakes, memory tip, and confusable letters. Use this whenever a user asks how to sign a specific letter.",
            "parameters": {
                "type": "object",
                "properties": {
                    "letter": {"type": "string", "description": "The ASL letter to look up, e.g. 'R' or 'M'"}
                },
                "required": ["letter"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_miss_history",
            "description": "Returns the user's most-missed ASL letters based on their game history. Use this when giving targeted feedback or when the user asks what they struggle with.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_asl_sign",
            "description": "Returns how to perform a common ASL sign (hello, thank you, please, sorry, yes, no, help, water, eat, more, stop, good, bad, love, friend, name, learn, understand, practice, sign).",
            "parameters": {
                "type": "object",
                "properties": {
                    "sign": {"type": "string", "description": "The word or phrase, e.g. 'hello' or 'thank you'"}
                },
                "required": ["sign"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_deaf_culture_info",
            "description": "Returns Deaf culture or ASL grammar information. Topics: asl_grammar, deaf_culture, fingerspelling, history, learning_tips.",
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {"type": "string", "description": "One of: asl_grammar, deaf_culture, fingerspelling, history, learning_tips"}
                },
                "required": ["topic"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_common_errors",
            "description": "Returns the 20 most common beginner ASL mistakes with corrections. Optional category filter: handshape, grammar, fluency, production, culture.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {"type": "string", "description": "Optional: handshape, grammar, fluency, production, or culture"}
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "find_asl_locations",
            "description": "Use this when the user asks about ASL schools, classes, programs, or learning centers — whether in-person or online. Returns a map embed showing relevant locations. Always call this for location/school/class queries.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City, state, or region the user mentioned. Use 'near me' if no location specified.",
                    },
                    "type": {
                        "type": "string",
                        "description": "Type of program: 'in-person', 'online', or 'both'. Default: 'both'.",
                    },
                },
                "required": [],
            },
        },
    },
]


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------

def _get_user_stats(user_jwt: str | None) -> dict:
    if not user_jwt or not SUPABASE_URL:
        return {"error": "Not logged in — sign in to track your stats."}
    try:
        resp = httpx.get(
            f"{SUPABASE_URL}/rest/v1/user_progress",
            headers={
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {user_jwt}",
                "Accept": "application/json",
            },
            params={"select": "practiced_letters,achievements,high_scores"},
            timeout=5,
        )
        if resp.status_code != 200:
            return {"error": f"Could not fetch stats (status {resp.status_code})"}
        rows = resp.json()
        if not rows or not isinstance(rows, list):
            return {"practiced_letters": [], "achievements": {}, "high_scores": []}
        row = rows[0]
        practiced = row.get("practiced_letters") or []
        achievements = row.get("achievements") or {}
        scores = row.get("high_scores") or []
        remaining = [l for l in ALL_LETTERS if l not in practiced]
        unlocked = [k for k, v in achievements.items() if v]
        return {
            "practiced_letters": practiced,
            "practiced_count": len(practiced),
            "remaining_letters": remaining,
            "remaining_count": len(remaining),
            "unlocked_achievements": unlocked,
            "achievement_count": len(unlocked),
            "high_scores": scores[:3],
        }
    except Exception as e:
        return {"error": str(e)}


def _suggest_next_lesson(user_jwt: str | None, focus: str = "") -> dict:
    stats = _get_user_stats(user_jwt)
    if "error" in stats:
        return {
            "plan": "Beginner plan (log in for personalized plan)",
            "focus_letters": ["A", "B", "C", "D", "E"],
            "exercises": [
                "Practice A-E for 5 minutes using the camera",
                "Focus on thumb placement for A vs S vs E",
                "Try spelling your name",
            ],
            "handshape_tips": {k: ASL_HANDSHAPES[k]["tip"] for k in ["A", "B", "C", "D", "E"]},
        }

    practiced = set(stats.get("practiced_letters") or [])
    remaining = stats.get("remaining_letters") or ALL_LETTERS

    weak_spots = []
    for group in CONFUSABLE_PAIRS:
        if any(l in practiced for l in group) and not all(l in practiced for l in group):
            weak_spots.extend([l for l in group if l not in practiced])
    weak_spots = list(set(weak_spots))[:6]

    next_letters = remaining[:5] if remaining else []

    exercises = []
    if weak_spots:
        tips = {l: ASL_HANDSHAPES[l]["tip"] for l in weak_spots if l in ASL_HANDSHAPES}
        exercises.append({
            "type": "review",
            "letters": weak_spots,
            "description": f"Review confusable letters: {', '.join(weak_spots)}",
            "tips": tips,
        })
    if next_letters:
        tips = {l: ASL_HANDSHAPES[l]["tip"] for l in next_letters if l in ASL_HANDSHAPES}
        exercises.append({
            "type": "new_letters",
            "letters": next_letters,
            "description": f"Learn new letters: {', '.join(next_letters)}",
            "tips": tips,
        })
    exercises.append({"type": "drill", "description": "Spell 5 short words using only practiced letters"})
    exercises.append({"type": "game", "description": "Play Sign Sprint on Easy mode for muscle memory"})
    if len(practiced) >= 10:
        exercises.append({"type": "game", "description": "Try Normal difficulty in Sign Sprint"})

    level = "Beginner" if len(practiced) < 8 else "Intermediate" if len(practiced) < 18 else "Advanced"

    return {
        "level": level,
        "practiced_count": len(practiced),
        "total_letters": len(ALL_LETTERS),
        "completion_pct": round(len(practiced) / len(ALL_LETTERS) * 100),
        "next_letters_to_learn": next_letters,
        "weak_spots": weak_spots,
        "exercises": exercises,
        "focus": focus or ("new letters" if remaining else "speed and accuracy"),
    }


def _get_miss_history(user_jwt: str | None) -> dict:
    """
    Returns the user's most-missed letters based on game results stored in Supabase.
    Falls back to confusable-pair analysis if no game data exists.
    """
    if not user_jwt or not SUPABASE_URL:
        return {"error": "Not logged in — sign in to track miss history."}
    try:
        resp = httpx.get(
            f"{SUPABASE_URL}/rest/v1/user_progress",
            headers={
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {user_jwt}",
                "Accept": "application/json",
            },
            params={"select": "practiced_letters,high_scores"},
            timeout=5,
        )
        if resp.status_code != 200:
            return {"error": f"Could not fetch data (status {resp.status_code})"}
        rows = resp.json()
        if not rows or not isinstance(rows, list):
            return {"most_missed": [], "message": "No game data yet — play Sign Sprint to track misses."}
        row = rows[0]
        practiced = set(row.get("practiced_letters") or [])
        scores = row.get("high_scores") or []

        # Infer misses from confusable pairs: letters in a confusable group
        # that the user has partially practiced are likely trouble spots
        miss_counts: dict[str, int] = {}
        for group in CONFUSABLE_PAIRS:
            practiced_in_group = [l for l in group if l in practiced]
            missed_in_group = [l for l in group if l not in practiced]
            if practiced_in_group and missed_in_group:
                for l in missed_in_group:
                    miss_counts[l] = miss_counts.get(l, 0) + 2
            # Also flag letters in group that were practiced but are confusable
            for l in practiced_in_group:
                miss_counts[l] = miss_counts.get(l, 0) + 1

        # Sort by miss count descending
        sorted_misses = sorted(miss_counts.items(), key=lambda x: x[1], reverse=True)
        top_missed = [l for l, _ in sorted_misses[:8]]

        return {
            "most_missed": top_missed,
            "confusable_groups": [list(g) for g in CONFUSABLE_PAIRS if any(l in practiced for l in g)],
            "games_played": len(scores),
            "message": f"Based on your practice history, these letters need the most attention: {', '.join(top_missed) if top_missed else 'none identified yet'}",
        }
    except Exception as e:
        return {"error": str(e)}

def _get_letter_detail(letter: str) -> dict:
    """Return guaranteed-accurate handshape data from the embedded knowledge base."""
    letter = letter.upper().strip()
    if letter not in ASL_HANDSHAPES:
        available = ", ".join(sorted(ASL_HANDSHAPES.keys()))
        return {"error": f"Letter '{letter}' not found. Available: {available}"}
    data = ASL_HANDSHAPES[letter]
    # Find all confusable pairs this letter belongs to
    confusable_with = []
    for group in CONFUSABLE_PAIRS:
        if letter in group:
            confusable_with.extend([l for l in group if l != letter])
    return {
        "letter": letter,
        "handshape": data["shape"],
        "palm_direction": data["palm"],
        "common_mistakes": data["common_mistakes"],
        "memory_tip": data["tip"],
        "commonly_confused_with": list(set(confusable_with)),
    }


def _get_asl_sign(sign: str) -> dict:
    """Return description of a common ASL sign from the knowledge base."""
    key = sign.lower().strip()
    if key in ASL_COMMON_SIGNS:
        data = ASL_COMMON_SIGNS[key]
        return {"sign": sign, **data}
    # Fuzzy match — check if query contains a known sign name
    for name, data in ASL_COMMON_SIGNS.items():
        if name in key or key in name:
            return {"sign": name, **data}
    available = ", ".join(sorted(ASL_COMMON_SIGNS.keys()))
    return {
        "error": f"Sign '{sign}' not in knowledge base.",
        "available_signs": available,
        "suggestion": "Use search_web to find this sign, or ask about fingerspelling it.",
    }


def _get_deaf_culture_info(topic: str) -> dict:
    """Return Deaf culture or ASL grammar information."""
    key = topic.lower().strip().replace(" ", "_").replace("-", "_")
    # Direct match
    if key in DEAF_CULTURE_TOPICS:
        return DEAF_CULTURE_TOPICS[key]
    # Fuzzy match
    for name, data in DEAF_CULTURE_TOPICS.items():
        if any(word in name for word in key.split("_") if len(word) > 3):
            return data
    available = ", ".join(sorted(DEAF_CULTURE_TOPICS.keys()))
    return {
        "error": f"Topic '{topic}' not found.",
        "available_topics": available,
    }


def _get_common_errors(category: str = "") -> dict:
    """Return common beginner ASL mistakes, optionally filtered by category."""
    if category:
        cat = category.lower().strip()
        filtered = [e for e in COMMON_ERRORS if e["category"] == cat]
        if filtered:
            return {"category": cat, "errors": filtered, "count": len(filtered)}
    return {"errors": COMMON_ERRORS, "count": len(COMMON_ERRORS), "categories": list({e["category"] for e in COMMON_ERRORS})}


def _find_asl_locations(location: str = "", program_type: str = "both") -> dict:
    """
    Build a Google Maps search query for ASL schools/classes.
    Returns a map_query + schools list that the frontend renders as an interactive map.
    """
    base = "ASL classes"
    if program_type == "online":
        base = "ASL online classes"
    elif program_type == "in-person":
        base = "ASL sign language school"

    if location and location.lower() not in ("near me", "nearby", ""):
        query = f"{base} in {location}"
    else:
        query = f"{base} near me"

    resources = [
        {"name": "Gallaudet University", "url": "https://gallaudet.edu", "note": "World's only Deaf university — offers ASL courses online"},
        {"name": "ASL University (Lifeprint)", "url": "https://www.lifeprint.com", "note": "Free ASL curriculum by Dr. Bill Vicars"},
        {"name": "Sign Language 101", "url": "https://www.signlanguage101.com", "note": "Free beginner ASL video lessons"},
        {"name": "StartASL", "url": "https://www.startasl.com", "note": "Structured online ASL courses"},
    ]

    return {
        "map_query": query,
        "label": f"ASL Schools & Classes{' — ' + location if location and location != 'near me' else ' Near You'}",
        "program_type": program_type,
        "online_resources": resources,
    }


def _extract_youtube_id(url: str) -> str | None:
    m = re.search(
        r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([A-Za-z0-9_-]{11})",
        url,
    )
    return m.group(1) if m else None


# ---------------------------------------------------------------------------
# #5 — Smart query rewriting
# ---------------------------------------------------------------------------

def _rewrite_search_query(raw_query: str) -> str:
    """
    Rewrite the model's search query to get better Tavily results.
    - Video/YouTube requests → add site:youtube.com
    - Generic ASL queries → add specificity
    """
    q = raw_query.strip()
    lower = q.lower()

    video_keywords = ["video", "youtube", "watch", "tutorial", "lesson", "channel", "learn asl"]
    wants_video = any(kw in lower for kw in video_keywords)

    # Already has site: filter — leave it
    if "site:" in lower:
        return q

    if wants_video:
        # Strip filler and add YouTube targeting
        q = re.sub(r"\b(find me|show me|give me|can you|please|some|a few)\b", "", q, flags=re.IGNORECASE).strip()
        if "youtube" not in lower:
            q = f"{q} site:youtube.com"
        return q

    # For general resource queries, ensure ASL context
    if "asl" not in lower and "sign language" not in lower:
        q = f"ASL {q}"

    return q


def _search_web(query: str) -> dict:
    if not TAVILY_API_KEY:
        return {"status": "unavailable", "message": "TAVILY_API_KEY not configured."}

    rewritten = _rewrite_search_query(query)

    try:
        resp = httpx.post(
            "https://api.tavily.com/search",
            json={
                "api_key": TAVILY_API_KEY,
                "query": rewritten,
                "search_depth": "advanced",
                "max_results": 6,
                "include_answer": True,
                "include_raw_content": False,
            },
            timeout=10,
        )
        if resp.status_code != 200:
            return {"status": "error", "message": f"Tavily status {resp.status_code}"}
        data = resp.json()
        if not data or not isinstance(data, dict):
            return {"status": "error", "message": "Invalid response from Tavily"}
        results = []
        for r in data.get("results") or []:
            if not r or not isinstance(r, dict):
                continue
            url = r.get("url") or ""
            yt_id = _extract_youtube_id(url)
            snippet = r.get("content") or r.get("snippet") or ""
            results.append({
                "title": r.get("title") or "",
                "url": url,
                "snippet": snippet[:600],
                "type": "youtube" if yt_id else "link",
                "youtube_id": yt_id,
            })
        return {
            "status": "ok",
            "answer": data.get("answer") or "",
            "results": results,
            "query_used": rewritten,
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ---------------------------------------------------------------------------
# Tool dispatcher
# ---------------------------------------------------------------------------

def _run_tool(name: str, args: dict, user_jwt: str | None) -> str:
    try:
        if name == "get_user_stats":
            return json.dumps(_get_user_stats(user_jwt))
        if name == "suggest_next_lesson":
            return json.dumps(_suggest_next_lesson(user_jwt, (args or {}).get("focus", "") or ""))
        if name == "search_web":
            return json.dumps(_search_web((args or {}).get("query", "") or ""))
        if name == "get_letter_detail":
            letter = ((args or {}).get("letter") or "").upper()
            return json.dumps(_get_letter_detail(letter))
        if name == "get_miss_history":
            return json.dumps(_get_miss_history(user_jwt))
        if name == "get_asl_sign":
            return json.dumps(_get_asl_sign((args or {}).get("sign", "") or ""))
        if name == "get_deaf_culture_info":
            return json.dumps(_get_deaf_culture_info((args or {}).get("topic", "") or ""))
        if name == "get_common_errors":
            return json.dumps(_get_common_errors((args or {}).get("category", "") or ""))
        if name == "find_asl_locations":
            return json.dumps(_find_asl_locations(
                (args or {}).get("location", "") or "",
                (args or {}).get("type", "both") or "both",
            ))
        return json.dumps({"error": f"Unknown tool: {name}"})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return json.dumps({"error": f"Tool {name} failed: {e}"})


# ---------------------------------------------------------------------------
# Chat history persistence (Supabase)
# ---------------------------------------------------------------------------

def load_chat_history(user_jwt: str) -> list[dict]:
    if not SUPABASE_URL or not user_jwt:
        return []
    try:
        resp = httpx.get(
            f"{SUPABASE_URL}/rest/v1/chat_history",
            headers={
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {user_jwt}",
                "Accept": "application/json",
            },
            params={"select": "role,content", "order": "created_at.desc", "limit": "20"},
            timeout=5,
        )
        if resp.status_code != 200:
            return []
        rows = resp.json()
        return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]
    except Exception:
        return []


def save_message(user_jwt: str, role: str, content: str) -> None:
    if not SUPABASE_URL or not user_jwt:
        return
    try:
        httpx.post(
            f"{SUPABASE_URL}/rest/v1/chat_history",
            headers={
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {user_jwt}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
            json={"role": role, "content": content},
            timeout=5,
        )
    except Exception:
        pass


# ---------------------------------------------------------------------------
# #4 — Conversation summarization
# ---------------------------------------------------------------------------

SUMMARY_THRESHOLD = 14  # summarize when history exceeds this many messages
KEEP_RECENT = 6         # always keep this many recent messages verbatim

def _summarize_history(history: list[dict], client: OpenAI) -> list[dict]:
    """
    When history is long, summarize older messages into a single compact
    assistant message and keep only the most recent turns verbatim.
    This preserves context without bloating the prompt.
    """
    if len(history) <= SUMMARY_THRESHOLD:
        return history

    older = history[:-KEEP_RECENT]
    recent = history[-KEEP_RECENT:]

    # Build a summary of the older messages
    summary_prompt = [
        {"role": "system", "content": "Summarize the following ASL tutoring conversation in 3-4 sentences. Focus on: what letters the user has been working on, any struggles mentioned, and what was recommended. Be concise."},
        {"role": "user", "content": "\n".join(f"{m['role'].upper()}: {m['content']}" for m in older)},
    ]
    try:
        resp = client.chat.completions.create(
            model=MODEL,
            messages=summary_prompt,
            max_tokens=200,
            temperature=0.3,
        )
        summary_text = resp.choices[0].message.content or ""
        summary_msg = {"role": "assistant", "content": f"[Earlier conversation summary: {summary_text}]"}
        return [summary_msg] + recent
    except Exception:
        # If summarization fails, just truncate to recent
        return recent


# ---------------------------------------------------------------------------
# #3 — Proactive greeting
# ---------------------------------------------------------------------------

def generate_greeting(user_jwt: str | None, practiced_letters: list[str] | None = None) -> str:
    """
    Generate a personalized opening message based on the user's current stats.
    Called by GET /api/chat/greeting endpoint.
    """
    client = get_groq_client()
    user_context = _build_user_context(user_jwt, practiced_letters)

    prompt = [
        {
            "role": "system",
            "content": BASE_SYSTEM_PROMPT + "\n" + user_context,
        },
        {
            "role": "user",
            "content": "Generate a short, personalized welcome message for when I open the tutor. Reference my actual progress specifically. Mention one concrete thing I should work on today. Keep it under 3 sentences. Be encouraging but specific.",
        },
    ]
    try:
        resp = client.chat.completions.create(
            model=MODEL,
            messages=prompt,
            max_tokens=150,
            temperature=0.8,
        )
        return resp.choices[0].message.content or "Hey! Ready to practice some ASL today?"
    except Exception:
        return "Hey! Ready to practice some ASL today?"


# ---------------------------------------------------------------------------
# Main streaming chat
# ---------------------------------------------------------------------------

def get_groq_client() -> OpenAI:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY not set in environment")
    return OpenAI(
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1",
    )


def stream_chat(
    conversation: list[dict],
    practiced_letters: list[str] | None = None,
    user_jwt: str | None = None,
    missed_letters: list[dict] | None = None,
    show_browsing: bool = False,
):
    """
    Generator yielding text chunks.
    - Injects always-on user context into system prompt (#2)
    - Runs multi-turn tool loop up to MAX_TOOL_ITERATIONS (#1)
    - Summarizes long history to preserve context quality (#4)
    - Appends [MEDIA] block directly when search_web runs (#5)
    - Persists messages to Supabase
    """
    client = get_groq_client()

    # Persist incoming user message
    if user_jwt and conversation and conversation[-1]["role"] == "user":
        save_message(user_jwt, "user", conversation[-1]["content"])

    # Build system prompt with always-on user context (#2)
    user_context = _build_user_context(user_jwt, practiced_letters, missed_letters)
    system_content = BASE_SYSTEM_PROMPT + "\n" + user_context

    # Load and optionally summarize history (#4)
    history: list[dict] = []
    if user_jwt:
        history = load_chat_history(user_jwt)
        if history and conversation and history[-1].get("content") == conversation[-1].get("content"):
            history = history[:-1]
        # Summarize if history is long
        if len(history) > SUMMARY_THRESHOLD:
            history = _summarize_history(history, client)

    messages: list[dict] = [{"role": "system", "content": system_content}]
    if history:
        messages.extend(history[:-1])
    messages.extend(conversation)

    # #1 — Multi-turn tool loop
    search_results: dict | None = None
    lesson_plan: dict | None = None
    map_data: dict | None = None
    iterations = 0

    while iterations < MAX_TOOL_ITERATIONS:
        iterations += 1
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
                parallel_tool_calls=False,
                max_tokens=1024,
                temperature=0.7,
            )
        except Exception as exc:
            err_str = str(exc)
            # Groq tool_use_failed — retry without tools
            if "tool_use_failed" in err_str or "failed_generation" in err_str:
                try:
                    response = client.chat.completions.create(
                        model=MODEL,
                        messages=messages,
                        max_tokens=1024,
                        temperature=0.7,
                    )
                    # No tool calls possible in this fallback — break to streaming
                    msg = response.choices[0].message
                    break
                except Exception as exc2:
                    yield f"[Error: {exc2}]"
                    return
            yield f"[Error: {exc}]"
            return

        msg = response.choices[0].message

        # No tool calls — ready to stream final answer
        if not msg.tool_calls:
            break

        # Append assistant tool-call message
        messages.append({
            "role": "assistant",
            "content": msg.content or "",
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                }
                for tc in msg.tool_calls
            ],
        })

        # Execute all tool calls in this iteration
        for tc in msg.tool_calls:
            try:
                args = json.loads(tc.function.arguments or "{}")
            except Exception:
                args = {}

            # Emit thinking event before search_web runs
            if tc.function.name == "search_web" and show_browsing:
                raw_query = (args or {}).get("query", "")
                rewritten = _rewrite_search_query(raw_query)
                yield f"[THINKING]{json.dumps({'step': 'search', 'query': rewritten})}[/THINKING]"

            result = _run_tool(tc.function.name, args, user_jwt)
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": result})

            # Capture search results for media block injection
            if tc.function.name == "search_web":
                try:
                    parsed = json.loads(result)
                    if parsed and parsed.get("status") == "ok" and parsed.get("results"):
                        search_results = parsed
                        # Emit per-URL thinking events
                        if show_browsing:
                            for r in parsed["results"]:
                                yield f"[THINKING]{json.dumps({'step': 'visit', 'url': r.get('url',''), 'title': r.get('title','')})}[/THINKING]"
                            yield f"[THINKING]{json.dumps({'step': 'done', 'sources_found': len(parsed['results'])})}[/THINKING]"
                except Exception:
                    pass

            # Capture lesson plan for lesson block injection
            if tc.function.name == "suggest_next_lesson":
                try:
                    lesson_data = json.loads(result)
                    if lesson_data and "exercises" in lesson_data:
                        lesson_plan = lesson_data
                except Exception:
                    pass

            # Capture location data for map block injection
            if tc.function.name == "find_asl_locations":
                try:
                    loc_data = json.loads(result)
                    if loc_data and loc_data.get("map_query"):
                        map_data = loc_data
                except Exception:
                    pass

    # Stream final response
    stream = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        stream=True,
        max_tokens=1024,
        temperature=0.7,
    )
    full_response = ""
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            full_response += delta
            yield delta

    # Inject media block directly — reliable, model-independent (#5)
    if search_results is not None:
        media_block = f"\n[MEDIA]{json.dumps({'results': search_results['results']})}[/MEDIA]"
        full_response += media_block
        yield media_block

    # Inject lesson block when suggest_next_lesson ran
    if lesson_plan is not None:
        lesson_block = f"\n[LESSON]{json.dumps(lesson_plan)}[/LESSON]"
        full_response += lesson_block
        yield lesson_block

    # Inject map block when find_asl_locations ran
    if map_data is not None:
        map_block = f"\n[MAP]{json.dumps(map_data)}[/MAP]"
        full_response += map_block
        yield map_block

    if user_jwt and full_response:
        save_message(user_jwt, "assistant", full_response)


def get_gesture_feedback(target: str, detected: str, confidence: float, streak: int = 0) -> str:
    """
    Returns a short, actionable tip when the user is signing the wrong letter.
    Feeds the lookup table as grounding context to the LLM so tips are both
    accurate (knowledge-base backed) and naturally varied.
    """
    t = target.upper().strip()
    d = detected.upper().strip() if detected else ""

    # Lookup table — used as grounding context for the LLM
    PAIR_CORRECTIONS: dict[tuple[str, str], str] = {
        ("A", "S"): "Thumb is wrapping over fingers. For A, rest thumb on the SIDE of the fist, not over the top.",
        ("A", "E"): "Fingers are too hooked. For A, keep a loose fist with thumb on the side.",
        ("S", "A"): "Thumb is on the side. For S, wrap thumb OVER the front of the fingers.",
        ("S", "E"): "Fingers too hooked. S is a fist with thumb over fingers, not hooked fingertips.",
        ("E", "A"): "Curl fingertips DOWN toward palm more. E has hooked fingers, not a straight fist.",
        ("E", "S"): "Tuck thumb UNDER fingers. In E the thumb goes under, in S it goes over.",
        ("B", "4"): "Tuck thumb across palm. B needs the thumb tucked in, otherwise it looks like the number 4.",
        ("U", "V"): "Bring index and middle fingers TOGETHER. U has them touching, V has them spread apart.",
        ("V", "U"): "SPREAD index and middle fingers apart. V is a peace sign, U has them together.",
        ("U", "H"): "Point fingers UP. U is vertical, H is horizontal (pointing sideways).",
        ("H", "U"): "Rotate hand so fingers point SIDEWAYS. H is horizontal, U points up.",
        ("V", "H"): "Point fingers UP and spread them. V is vertical peace sign, H is two fingers sideways.",
        ("M", "N"): "Add one more finger. M folds THREE fingers over the thumb, N only uses two.",
        ("N", "M"): "Remove one finger. N folds only TWO fingers over the thumb, M uses three.",
        ("I", "Y"): "Tuck thumb in. I is ONLY the pinky up. Y adds the thumb out (shaka sign).",
        ("Y", "I"): "Stick thumb OUT too. Y needs both pinky AND thumb extended, like a shaka/hang loose.",
        ("G", "D"): "Point finger SIDEWAYS with thumb parallel. G points horizontally like a gun.",
        ("D", "G"): "Point index finger UP and curl others to touch thumb. D is vertical, G is horizontal.",
        ("K", "V"): "Insert thumb between index and middle fingers. K needs thumb touching the middle finger knuckle.",
        ("V", "K"): "Remove thumb from between fingers. V is just a peace sign with no thumb involvement.",
        ("P", "K"): "Rotate whole hand DOWN so fingers point toward the floor. P is K pointing downward.",
        ("K", "P"): "Rotate hand UP so fingers point forward. K points up/forward, P points down.",
        ("R", "U"): "Cross middle finger OVER index finger. R has crossed fingers, U has them side by side.",
        ("U", "R"): "Uncross fingers and hold them side by side. U has fingers together but NOT crossed.",
        ("T", "D"): "Tuck thumb between index and middle fingers. T has the thumb peeking out between those two fingers.",
        ("L", "D"): "Extend thumb OUT to the side. L is an L-shape with index up AND thumb out at a right angle.",
        ("F", "O"): "Keep middle, ring, pinky fingers straight UP. F has index+thumb touching but three fingers extended.",
        ("O", "F"): "Curve ALL fingers to meet the thumb tip. O is a full circle, not just index+thumb.",
        ("C", "O"): "Open hand more. C is a wider curve like holding a cup, O closes tighter with all fingertips meeting.",
        ("X", "D"): "Only hook the INDEX finger. X is just the index finger bent like a hook, everything else stays curled.",
        ("W", "6"): "Spread all three fingers (index, middle, ring) wide. W needs three clearly spread fingers.",
    }

    target_info = ASL_HANDSHAPES.get(t, {})
    detected_info = ASL_HANDSHAPES.get(d, {}) if d else {}

    # Build grounding context from lookup table + knowledge base
    pair_note = PAIR_CORRECTIONS.get((t, d), "")
    target_shape = target_info.get("shape", "")
    target_tip = target_info.get("tip", "")
    target_mistakes = target_info.get("common_mistakes", "")
    detected_shape = detected_info.get("shape", "") if detected_info else ""

    # Vary tone based on streak
    if streak > 40:
        tone = "They've been stuck a while — be extra encouraging and give a fresh angle."
    elif streak > 20:
        tone = "Try a different way of explaining it — a new mental model or analogy."
    else:
        tone = "Be direct and specific."

    grounding = f"""Known correction for {t}→{d}: {pair_note}""" if pair_note else ""

    prompt = f"""You are an ASL coach giving real-time feedback during a fingerspelling practice session.

TARGET letter: {t}
Correct handshape: {target_shape}
Memory tip: {target_tip}
Common mistakes: {target_mistakes}

Camera is detecting: {d if d else 'nothing clear'} ({detected_shape})
Confidence: {confidence:.0%}
{grounding}

{tone}
Write ONE sentence of feedback. Start with the physical action (e.g. "Move your thumb...", "Curl your index finger..."). 
Use the grounding correction above as your source of truth but rephrase it naturally. Max 20 words."""

    try:
        client = get_groq_client()
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=60,
            temperature=0.7,
        )
        return response.choices[0].message.content.strip()
    except Exception:
        # Fall back to lookup table directly if LLM fails
        return pair_note or target_tip or f"Check your handshape for {t}."


def get_next_lesson(
    practiced_letters: list[str],
    missed_letters: list[dict] | None = None,
    user_jwt: str | None = None,
) -> dict:
    """
    Generate a personalized spaced-repetition lesson plan.
    Returns a structured lesson with review items, new letters, and drills.
    """
    client = get_groq_client()

    # Build data for the LLM
    practiced_set = set(practiced_letters)
    remaining = [l for l in ALL_LETTERS if l not in practiced_set]

    # Identify weak spots from confusable pairs
    weak_spots = []
    for group in CONFUSABLE_PAIRS:
        if any(l in practiced_set for l in group) and not all(l in practiced_set for l in group):
            weak_spots.extend([l for l in group if l not in practiced_set])
    # Also add letters that are in confusable pairs and were practiced (likely to be confused)
    for group in CONFUSABLE_PAIRS:
        if all(l in practiced_set for l in group):
            weak_spots.extend(list(group))
    weak_spots = list(dict.fromkeys(weak_spots))[:8]  # deduplicate, keep order

    # Top missed from game data
    top_missed = []
    if missed_letters:
        top_missed = [m["letter"] for m in sorted(missed_letters, key=lambda x: x.get("misses", 0), reverse=True)[:5]]

    level = "Beginner" if len(practiced_set) < 8 else "Intermediate" if len(practiced_set) < 18 else "Advanced"
    pct = round(len(practiced_set) / len(ALL_LETTERS) * 100)

    context = f"""User level: {level} ({len(practiced_set)}/{len(ALL_LETTERS)} letters = {pct}%)
Practiced: {', '.join(sorted(practiced_set)) if practiced_set else 'none'}
Not yet practiced: {', '.join(remaining[:12]) if remaining else 'all done'}
Confusable weak spots: {', '.join(weak_spots) if weak_spots else 'none identified'}
Most missed in games: {', '.join(top_missed) if top_missed else 'no game data'}"""

    prompt = f"""You are an ASL tutor creating a personalized 10-minute practice session using spaced repetition principles.

{context}

Create a lesson plan as a JSON object with this exact structure:
{{
  "level": "{level}",
  "practiced_count": {len(practiced_set)},
  "total_letters": {len(ALL_LETTERS)},
  "completion_pct": {pct},
  "focus": "one sentence describing today's focus",
  "next_letters_to_learn": ["up to 3 new letters from the not-yet-practiced list"],
  "weak_spots": ["up to 4 letters to review based on confusable pairs and misses"],
  "exercises": [
    {{"type": "review", "letters": ["X", "Y"], "description": "specific drill description", "tips": {{"X": "tip", "Y": "tip"}}}},
    {{"type": "new_letters", "letters": ["Z"], "description": "specific intro description", "tips": {{"Z": "tip"}}}},
    {{"type": "drill", "description": "fingerspell these 5 words: ..."}},
    {{"type": "game", "description": "play Sign Sprint on Easy for 2 minutes"}}
  ]
}}

Rules:
- Prioritize reviewing confusable pairs the user has partially learned
- Introduce at most 2-3 new letters per session
- Include at least one word-spelling drill using only practiced letters
- Be specific in descriptions (name the actual letters and words)
- Return ONLY the JSON, no other text"""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600,
            temperature=0.4,
        )
        raw = response.choices[0].message.content.strip()
        # Strip markdown code fences if present
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        return json.loads(raw)
    except Exception:
        # Fallback to rule-based plan
        return _suggest_next_lesson(user_jwt)


def get_practice_word(practiced_letters: list[str], difficulty: str = "easy") -> dict:
    """
    Pick a word for conversational practice mode.
    Returns a word that can be fingerspelled using only practiced letters.
    difficulty: 'easy' (3-4 letters), 'medium' (5-6), 'hard' (7+)
    """
    import random

    practiced_set = set(l.upper() for l in practiced_letters)

    # If user has no practiced letters, give them beginner-friendly letters to start
    if len(practiced_set) < 3:
        practiced_set = {"A", "B", "C", "D", "E", "H", "I", "L", "O", "S"}

    # Word banks by difficulty
    easy_words = ["CAT", "DOG", "HAT", "BIG", "SIT", "CUP", "BED", "FAN", "HOP", "LAP", "NAP", "OAK", "TAB", "VAN", "WAX"]
    medium_words = ["CHAIR", "CLOUD", "DANCE", "EARTH", "HEART", "LIGHT", "MUSIC", "NIGHT", "OCEAN", "PLANT", "RIVER", "SMILE", "TIGER", "VOICE", "WATER"]
    hard_words = ["BLANKET", "CAPTAIN", "DIAMOND", "FREEDOM", "HISTORY", "KITCHEN", "LIBRARY", "MORNING", "NATURAL", "OUTSIDE", "PICTURE", "RAINBOW", "STUDENT", "VILLAGE"]

    pool = easy_words if difficulty == "easy" else medium_words if difficulty == "medium" else hard_words

    # Filter to words using only practiced letters (J and Z require motion, skip them)
    valid = [w for w in pool if all(c in practiced_set for c in w) and "J" not in w and "Z" not in w]

    if not valid:
        # Try easy words regardless of difficulty
        valid = [w for w in easy_words if all(c in practiced_set for c in w) and "J" not in w and "Z" not in w]

    if not valid:
        # Build a word from their practiced letters
        letters = sorted(l for l in practiced_set if l not in ("J", "Z"))
        if len(letters) >= 3:
            word = letters[0] + letters[1] + letters[2]
            return {"word": word, "letters": list(word), "difficulty": difficulty}
        # Absolute fallback
        return {"word": "CAT", "letters": ["C", "A", "T"], "difficulty": difficulty}

    word = random.choice(valid)
    return {"word": word, "letters": list(word), "difficulty": difficulty}
