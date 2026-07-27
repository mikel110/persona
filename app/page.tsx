'use client';

import { useState, useCallback, useRef } from 'react';
import MicButton from '@/components/MicButton';
import ModeToggle from '@/components/ModeToggle';
import FileUpload from '@/components/FileUpload';
import ScorecardOverlay from '@/components/ScorecardOverlay';
import TranscriptPanel from '@/components/TranscriptPanel';
import { debateMode } from '@/lib/modes/debate';
import { timeTravelerMode } from '@/lib/modes/timeTraveler';
import { sendMessage } from '@/lib/chatEngine';
import { scoreSession } from '@/lib/scoringEngine';
import { startListening, stopListening, speak, cancelSpeaking } from '@/lib/speechEngine';
import type { AppState, Message, ModeId } from '@/types';

const MODES = { debate: debateMode, 'time-traveler': timeTravelerMode };

const initialState: AppState = {
  mode: 'debate',
  micState: 'idle',
  material: '',
  concepts: [],
  messages: [],
  scoreCard: null,
  sessionActive: false,
  isUploading: false,
  uploadedFileName: '',
  error: null,
};

export default function PersonaApp() {
  const [state, setState] = useState<AppState>(initialState);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isScoringLoading, setIsScoringLoading] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const setMicState = (micState: AppState['micState']) =>
    setState((s) => ({ ...s, micState }));

  const setError = (error: string | null) =>
    setState((s) => ({ ...s, error }));

  // ── Mode change ────────────────────────────────────────────────────────────
  const handleModeChange = useCallback((mode: ModeId) => {
    stopListening();
    cancelSpeaking();
    setState({ ...initialState, mode });
  }, []);

  // ── File upload + concept extraction ──────────────────────────────────────
  const handleFileExtracted = useCallback(async (text: string, fileName: string) => {
    if (!text) {
      setState((s) => ({ ...s, material: '', uploadedFileName: '', concepts: [] }));
      return;
    }
    setState((s) => ({ ...s, material: text, uploadedFileName: fileName, isUploading: true, concepts: [] }));

    try {
      const res = await fetch('/api/extract-concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setState((s) => ({ ...s, concepts: data.concepts ?? [], isUploading: false }));
    } catch {
      setState((s) => ({ ...s, isUploading: false }));
      setError('Failed to extract concepts. Check your Groq API key.');
    }
  }, []);

  // ── Process transcript after speech recognition returns ───────────────────
  const processTranscript = useCallback(async (transcript: string) => {
    if (!transcript.trim()) {
      setMicState('idle');
      return;
    }

    const { mode, material, concepts, messages } = stateRef.current;
    const modeConfig = MODES[mode];

    setMicState('thinking');
    setError(null);

    try {
      // Build updated history with user message
      const userMsg: Message = { role: 'user', content: transcript, timestamp: Date.now() };
      const updatedHistory = [...messages, userMsg];
      setState((s) => ({ ...s, messages: updatedHistory }));

      // Get AI reply
      const systemPrompt = modeConfig.buildSystemPrompt(material, concepts);
      const reply = await sendMessage(updatedHistory, systemPrompt);

      const aiMsg: Message = { role: 'assistant', content: reply, timestamp: Date.now() };
      setState((s) => ({ ...s, messages: [...updatedHistory, aiMsg] }));

      // Speak reply — with barge-in: if user speaks, cancel AI and process their input
      setMicState('speaking');
      await speak(
        reply,
        // onEnd — natural finish
        () => setMicState('idle'),
        // onInterrupt — user spoke over AI
        (interruptTranscript) => {
          if (interruptTranscript && interruptTranscript.trim().length > 3) {
            // They said something meaningful — process it directly
            processTranscript(interruptTranscript);
          } else {
            // Too short / noise — just go back to listening
            setMicState('idle');
          }
        }
      );
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      setMicState('idle');
    }
  }, []);

  // ── Mic press ─────────────────────────────────────────────────────────────
  const handleMicToggle = useCallback(() => {
    const { micState, sessionActive } = stateRef.current;

    // Stop listening if currently active
    if (micState === 'listening') {
      stopListening();
      setMicState('idle');
      return;
    }

    if (micState !== 'idle') return;

    // Start session on first press
    if (!sessionActive) {
      setState((s) => ({ ...s, sessionActive: true }));
    }

    setError(null);
    setMicState('listening');

    startListening(
      // onResult — speech recognised
      (transcript) => {
        processTranscript(transcript);
      },
      // onError
      (errMsg) => {
        setError(errMsg);
        setMicState('idle');
      }
    );
  }, [processTranscript]);

  // ── End session + score ───────────────────────────────────────────────────
  const handleEndSession = useCallback(async () => {
    const { messages, mode } = stateRef.current;
    const modeConfig = MODES[mode];

    stopListening();
    cancelSpeaking();

    if (messages.length === 0) {
      setState(initialState);
      return;
    }

    setIsScoringLoading(true);
    setMicState('thinking');

    try {
      const scoreCard = await scoreSession(messages, modeConfig.scoringPrompt);
      setState((s) => ({ ...s, scoreCard, sessionActive: false, micState: 'idle' }));
    } catch {
      setError('Failed to score session. Please try again.');
      setMicState('idle');
    } finally {
      setIsScoringLoading(false);
    }
  }, []);

  // ── New session ───────────────────────────────────────────────────────────
  const handleNewSession = useCallback(() => {
    stopListening();
    cancelSpeaking();
    setState((s) => ({
      ...initialState,
      mode: s.mode,
      material: s.material,
      concepts: s.concepts,
      uploadedFileName: s.uploadedFileName,
    }));
  }, []);

  const { mode, micState, concepts, isUploading, uploadedFileName, scoreCard, sessionActive, error, messages } = state;
  const isProcessing = micState === 'thinking' || micState === 'speaking' || isScoringLoading;

  return (
    <main
      className="relative min-h-screen flex flex-col items-center overflow-hidden"
      style={{ background: '#0a0a0f' }}
    >
      {/* Background radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 60%, rgba(124, 58, 237, 0.12) 0%, transparent 70%)',
        }}
      />

      {/* Top: mode toggle + upload */}
      <div className="relative z-10 flex flex-col items-center gap-4 pt-10 w-full px-6">
        <span className="text-xs font-bold tracking-[0.3em] uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Persona
        </span>

        <ModeToggle
          current={mode}
          onChange={handleModeChange}
          disabled={sessionActive || isProcessing}
        />

        <FileUpload
          onExtracted={handleFileExtracted}
          concepts={concepts}
          isExtracting={isUploading}
          uploadedFileName={uploadedFileName}
          disabled={sessionActive || isProcessing}
        />
      </div>

      {/* Center: Mic button */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-4">
        <MicButton
          state={micState}
          onPress={handleMicToggle}
          disabled={isProcessing}
        />

        {/* Tap-to-stop hint while listening */}
        {micState === 'listening' && (
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            tap again to stop
          </p>
        )}

        {/* End session button */}
        {sessionActive && (
          <button
            id="end-session-btn"
            onClick={handleEndSession}
            disabled={isProcessing}
            className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            {isScoringLoading ? 'Scoring...' : 'End Session'}
          </button>
        )}

        {/* Error display */}
        {error && (
          <div
            className="max-w-xs px-4 py-3 rounded-xl text-xs text-center"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#fca5a5',
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Transcript toggle */}
      {messages.length > 0 && !showTranscript && (
        <div className="fixed bottom-6 right-6 z-30">
          <button
            id="show-transcript-btn"
            onClick={() => setShowTranscript(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 hover:scale-[1.02]"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.4)',
              backdropFilter: 'blur(12px)',
            }}
          >
            ≡ Transcript
          </button>
        </div>
      )}

      {/* Overlays */}
      {showTranscript && (
        <TranscriptPanel messages={messages} onClose={() => setShowTranscript(false)} />
      )}

      {scoreCard && (
        <ScorecardOverlay scoreCard={scoreCard} onNewSession={handleNewSession} />
      )}
    </main>
  );
}
