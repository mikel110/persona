# Persona 🧠🎙️

Persona is a next-generation AI study companion that uses real-time conversational voice interaction to help you master concepts through the **Feynman Technique** and **Oral Flashcards**. Built with Next.js 15, Groq, and ElevenLabs, Persona creates an incredibly fast, dynamic, and beautiful learning environment.

## 🚀 Features

- **Teach-It Mode (Feynman Technique)**: Explain complex topics to "Sophia", a genuinely curious AI peer. If you can't explain it simply, you don't understand it well enough! Sophia will ask targeted follow-up questions to expose your knowledge gaps.
- **Quizzer Mode (Oral Flashcards)**: Upload your study notes and Persona will rapid-fire test you on key concepts, evaluating your answers in real-time.
- **Advanced Fluency Analytics**: Real-time evaluation of your hesitation density, filler word usage (ums, uhs), and concept mastery.
- **Exportable Scorecards**: Download a beautiful, dynamic PDF summarizing your session, highlighting your strengths, areas for improvement, and providing a custom-generated Targeted Revision Q&A based on what you missed.

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4 & Framer Motion for organic, liquid animations
- **LLM Engine**: Groq (Llama 3 70B) for ultra-low latency conversational responses
- **Speech-to-Text (STT)**: OpenAI Whisper
- **Text-to-Speech (TTS)**: ElevenLabs

## ⚙️ Getting Started (BYOK)

Persona operates on a **Bring Your Own Key (BYOK)** model. To run this project locally, you will need API keys from Groq, OpenAI, and ElevenLabs.

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/persona.git
cd persona
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root of the project and add your API keys:

```env
# Required for ultra-fast Llama-3 inference (Chat, Concept Extraction, Scoring)
GROQ_API_KEY=your_groq_api_key_here

# Required for Whisper Speech-to-Text (Transcription)
OPENAI_API_KEY=your_openai_api_key_here

# Required for Sophia's voice (Text-to-Speech)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to start a session.

## 📸 Usage Tips

- **Click the Mic Orb**: The glowing central orb is your lifeline. Tap it to start the session, or tap it while you are speaking to manually send your audio early.
- **Stay Engaged**: Persona tracks how long you pause. If you stop speaking for a few seconds, Persona will automatically assume you're finished and respond.
- **Download your Scorecard**: Always hit "Download PDF" at the end of a session to save your Targeted Revision Q&A!

---

*Built for speed, fluency, and deep learning.*
