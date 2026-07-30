# Persona 🧠🎙️

> *You think you know it — until someone asks you to explain it.*

Persona is a real-time AI voice study companion built on the Feynman Technique. Instead of passively re-reading notes, you speak out loud to an AI peer named Sophia who asks focused follow-up questions, probes your understanding, and tells you exactly where your knowledge breaks down — before the exam does.

---

## Table of Contents

- [What is Persona?](#what-is-persona)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables (BYOK)](#environment-variables-byok)
- [Running Locally](#running-locally)
- [Project Structure](#project-structure)
- [How it Works](#how-it-works)

---

## What is Persona?

Most students study by reading — and reading feels productive, but it creates a false sense of understanding. Your brain recognises the words on the page without truly internalising them.

**Persona forces active recall.** You explain, you answer, you defend your understanding out loud. The AI listens, evaluates, and pushes back — just like a real study partner who genuinely doesn't get it yet.

There are two modes:

- **Teach-It (Feynman Technique):** Explain a concept to Sophia. She asks follow-up questions until she's satisfied you truly understand it — not just that you can recite it.
- **Quizzer (Oral Flashcards):** Upload your notes. Persona fires rapid-fire oral questions at you and scores every answer in real time.

At the end of every session, you receive a detailed **scorecard** — including fluency analytics, mastered vs. shaky concepts, and a custom set of **Targeted Revision Q&As** generated specifically from your weak points. Download it all as a PDF.

---

## Features

- 🎙️ **Real-time voice conversation** with ultra-low latency
- 🧠 **Feynman Technique** — teach-back sessions with Sophia
- ⚡ **Oral Flashcards** — rapid-fire quiz mode from your own notes
- 📊 **Fluency analytics** — hesitation density, filler word tracking (um, uh, like), concept mastery
- 🗂️ **Concept checklist** — live tracker of covered and shaky concepts
- 📄 **PDF Scorecard export** — download your full session summary with targeted revision Q&As
- 💾 **Session history** — review past sessions and scorecards
- 🌙 **Dark-mode first UI** with organic mic orb animations

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| LLM Inference | Groq — Llama 3.3 70B |
| Speech-to-Text | Whisper large-v3 (via Groq) |
| Text-to-Speech | ElevenLabs (eleven_turbo_v2_5) |
| PDF Export | html-to-image + jsPDF |

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm
- A **Groq** API key — [console.groq.com](https://console.groq.com)
- An **ElevenLabs** API key — [elevenlabs.io](https://elevenlabs.io)

### Clone & Install

```bash
git clone https://github.com/mikel110/persona.git
cd persona
npm install
```

---

## Environment Variables (BYOK)

Persona is **Bring Your Own Key (BYOK)**. It does not ship with any API keys. You need to provide your own from Groq and ElevenLabs.

Create a file called `.env.local` in the root of the project:

```bash
touch .env.local
```

Then add the following:

```env
# ── Groq ─────────────────────────────────────────────────────────────────────
# Used for: Llama 3.3 70B (chat + scoring) and Whisper large-v3 (transcription)
# Get your key at: https://console.groq.com
GROQ_API_KEY=your_groq_api_key_here

# ── ElevenLabs ────────────────────────────────────────────────────────────────
# Used for: Sophia's voice (Text-to-Speech streaming)
# Get your key at: https://elevenlabs.io
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# ── ElevenLabs Voice ID (optional) ───────────────────────────────────────────
# Defaults to "Bella" if not set. Swap in any ElevenLabs voice ID you prefer.
# ELEVENLABS_VOICE_ID=your_voice_id_here
```

> **Note:** You do NOT need an OpenAI API key. Whisper transcription runs entirely through Groq's API.

---

## Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
persona/
├── app/
│   ├── api/
│   │   ├── chat/          # LLM chat completions (Groq / Llama 3)
│   │   ├── extract-concepts/  # Auto-extracts key concepts from uploaded notes
│   │   ├── score/         # End-of-session scoring and fluency analytics
│   │   ├── stt/           # Speech-to-Text (Whisper via Groq)
│   │   └── tts/           # Text-to-Speech (ElevenLabs streaming)
│   ├── layout.tsx
│   └── page.tsx           # Main session state and UI orchestration
├── components/
│   ├── MicButton.tsx      # Animated mic orb (idle / listening / thinking / speaking)
│   ├── LiveSubtitle.tsx   # Real-time sentence-by-sentence subtitle display
│   └── ScorecardOverlay.tsx  # End-of-session scorecard + PDF export
├── lib/
│   ├── modes/
│   │   ├── teachIt.ts     # Feynman Technique mode config + prompts
│   │   └── quizzer.ts     # Oral Flashcards mode config + prompts
│   └── speechEngine.ts    # Voice recording, STT polling, TTS playback
└── types/
    └── index.ts           # Shared TypeScript types
```

---

## How it Works

### Voice Pipeline

```
Microphone → WebM recording → /api/stt (Whisper via Groq)
    → transcript → /api/chat (Llama 3.3 70B via Groq)
    → AI response → /api/tts (ElevenLabs streaming)
    → Audio playback
```

### Scoring Pipeline

When you end a session, the full conversation transcript is sent to `/api/score`. The scoring engine:

1. Deterministically counts total words, filler words (um, uh, like, you know), and calculates hesitation density.
2. Penalises sessions where the student spoke fewer than 40 words (capped at 4/10).
3. Applies fluency bonuses or penalties based on hesitation density thresholds.
4. Passes all metrics plus the transcript to Llama 3 to generate qualitative feedback, strengths, improvements, and targeted revision Q&As.

### Concept Tracking

Both modes use special tags in the AI's responses:
- `[COVERED: concept_name]` — marks a concept as successfully explained/answered
- `[SHAKY: concept_name]` — marks a concept as hesitant or incorrect

These tags are parsed in real time and update the live concept checklist on-screen.
