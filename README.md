# SignQuest 🤟

A gamified web app that teaches ASL fingerspelling to children with hearing disabilities through real-time machine learning feedback, games, and an AI tutor.

> 3rd Place — Encode AI Conference Hackathon

---

## What it does

- Webcam-based hand recognition corrects your ASL signing in real time at 15fps
- Covers all 26 letters (A–Z) and numbers 0–9
- Game mode with points, streaks, and achievements to keep learners engaged
- Spell-your-name feature for a personal connection to the language
- AI tutor agent that recommends videos, classes, and schools based on your progress
- Spaced repetition built in so signs stick long-term

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, TypeScript, Vite, React Router |
| Backend | FastAPI, Python, Uvicorn, WebSockets |
| ML / Vision | MediaPipe, Scikit-learn, OpenCV |
| AI Tutor | OpenAI-compatible LLM via Groq, Tavily search |
| Database / Auth | Supabase |
| Deployment | Docker, Railway, Nixpacks |

---

## Project Structure

```
signquest/
├── backend/
│   ├── main.py               # FastAPI app + WebSocket endpoint
│   ├── sign_recognizer.py    # ML inference pipeline
│   ├── landmark_extractor.py # MediaPipe hand landmark extraction
│   ├── letter_recognizer.py  # Letter classification
│   ├── ai_agent.py           # AI tutor agent
│   ├── nlp_layer.py          # NLP processing
│   ├── session_manager.py    # User session handling
│   ├── label_accumulator.py  # Spaced repetition logic
│   ├── frame_buffer.py       # Frame buffering
│   ├── models.py             # Data models
│   └── asl_classifier.pkl    # Trained ML model
├── frontend/
│   └── src/
│       ├── pages/            # Translator, Learn, Game, AI Tutor, Spell Name
│       ├── components/       # UI components
│       ├── hooks/            # WebSocket, webcam, progress hooks
│       └── utils/            # Supabase client, storage, sounds
├── notebooks/                # Model training notebooks
└── models/                   # Model artifacts
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- A Supabase project
- A Groq API key
- A Tavily API key

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Fill in your keys in .env

uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install

cp .env.example .env
# Fill in your keys in .env

npm run dev
```

The app will be at `http://localhost:5173` with the backend at `http://localhost:8000`.

---

## Environment Variables

### backend/.env

```
GROQ_API_KEY=your_groq_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_key
TAVILY_API_KEY=your_tavily_api_key
```

### frontend/.env

```
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Training the Model

Notebooks for training the ASL classifier are in `/notebooks`. The trained model is already included as `backend/asl_classifier.pkl` so you don't need to retrain to run the app.

---

## Roadmap

- [ ] Full ASL word library
- [ ] LSTM model for word-level recognition
- [ ] NLP context understanding for full sentences
- [ ] ASL translation feature for common signs
- [ ] Mobile app

---

## Motivation

Sign language is severely underrepresented in early childhood education. This project started from a personal place and is built with the goal of making ASL accessible and engaging for the children who need it most. This is just the start.

---

## License

MIT
