# SignQuest — Hackathon Pitch Script
> Target time: ~3 minutes. Slide cues in [brackets].

---

## [Slide 1 — Title]

Hi everyone. My name is [your name], and I built SignQuest.

Before I get into what it is, I want to tell you why I built it.

---

## [Slide 2 — The Problem]

I have a cousin who has hearing difficulties. She was never taught sign language
when she was young. And because of that, she grew up struggling to communicate
with the people around her. Not because she couldn't learn — but because nobody
gave her the right tools early enough.

She is not alone. 70% of deaf children in Nigeria are out of school, largely
because accessible education for the deaf simply does not exist at scale.

Sign language is one of the most underutilized communication tools in the world.
And the window to learn it most effectively is early childhood. That is the
problem SignQuest is solving.

---

## [Slide 3 — The Solution]

SignQuest is a gamified web app that teaches ASL letters and numbers to children
through real-time machine learning feedback.

You open the app, turn on your webcam, and start signing. The model watches your
hand, tells you if you got it right, and guides you to improve. No flashcards.
No passive watching. Actual practice with instant correction.

On top of that, there is an AI tutor that recommends videos, online classes, and
schools based on where you are in your learning. And spaced repetition is built
in so the signs actually stick over time.

---

## [Slide 4 — Target Audience]

This is built specifically for children in their early stages of development.
That is intentional. Language acquisition is most effective when it starts young,
and for deaf children, getting that foundation early can change the entire
trajectory of their social and academic life.

---

## [Slide 5 — Competition]

Most sign language tools online are just flashcard sites. You look at a picture,
maybe watch a video, and that is it. There is no feedback on whether you are
actually signing correctly.

SignQuest is different because it puts a machine learning model between you and
the screen. It watches you sign and responds. That is the gap no one else is
filling for this age group.

---

## [Slide 6 — How It Works]

On the technical side: the frontend is built in React with TypeScript. The
backend runs on FastAPI. MediaPipe extracts hand landmarks from the webcam feed
in real time, and a Scikit-learn classifier identifies the letter or number being
signed. Everything communicates over WebSockets so the feedback is instant.

The AI tutor is powered by a large language model through OpenRouter, and user
progress is stored in Supabase.

---

## [Slide 7 — Team]

I built this solo. Every part of it — the frontend, the backend, the ML model,
the AI integration. It was a lot, but the problem felt personal enough that I
could not wait for a team.

---

## [Slide 8 — Roadmap]

Right now SignQuest covers all 26 ASL letters and numbers 0 through 9. The next
step is expanding to full words using an LSTM model, then full sentences with NLP
for context understanding. I also want to add a translation feature that covers
the majority of common ASL signs.

The foundation is there. It just needs to scale.

---

## [Slide 9 — Feedback]

I actually had my cousin try it. She has hearing difficulties and had never used
anything like this before. She said, and I quote: "I actually understood what my
hands were supposed to look like. The game made me want to keep going."

She kept practicing on her own after I left the room. That told me everything.

---

## [Slide 10 — Close]

Every child deserves a way to communicate. SignQuest is not just a project for a
hackathon. It is something I genuinely want to exist in the world.

Thank you.

---

> Tip: practice this out loud at least twice before presenting.
> Keep it conversational, not read. The personal story is your strongest moment — slow down there.
