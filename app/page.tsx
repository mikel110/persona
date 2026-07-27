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

  // ── Mic press — main interaction loop ─────────────────────────────────────
  const handleMicPress = useCallback(async () => {
    const { micState, mode, material, concepts, messages, sessionActive } = stateRef.current;
    const modeConfig = MODES[mode];

    if (micState !== 'idle') return;

    // Start session on first press
    if (!sessionActive) {
      setState((s) => ({ ...s, sessionActive: true, messages: [] }));
    }

    // 1. Start listening
    setMicState('listening');
    setError(null);

    try {
      await startListening();
    } catch {
      setError('Microphone access denied. Please allow microphone access in Chrome.');
      setMicState('idle');
      return;
    }

    // 2. Wait for user to release (handled below via button click toggle)
    // We auto-stop after holding — here we stop immediately on next click via a flag
    // Actually: press once to START, press again to STOP
    // This is handled by the toggle logic: if micState is 'listening', stop
  }, []);

  const handleMicStop = useCallback(async () => {
    const { mode, material, concepts, messages } = stateRef.current;
    const modeConfig = MODES[mode];

    setMicState('thinking');

    try {
      // 3. Stop recording + transcribe via Groq Whisper
      const transcript = await stopListening();

      if (!transcript.trim()) {
        setMicState('idle');
        return;
      }

      // 4. Build updated history
      const userMsg: Message = { role: 'user', content: transcript, timestamp: Date.now() };
      const updatedHistory = [...stateRef.current.messages, userMsg];
      setState((s) => ({ ...s, messages: updatedHistory }));

      // 5. Get AI reply
      const systemPrompt = modeConfig.buildSystemPrompt(material, concepts);
      const reply = await sendMessage(updatedHistory, systemPrompt);

      const aiMsg: Message = { role: 'assistant', content: reply, timestamp: Date.now() };
      const finalHistory = [...updatedHistory, aiMsg];
      setState((s) => ({ ...s, messages: finalHistory }));

      // 6. Speak reply
      setMicState('speaking');
      await speak(reply, () => setMicState('idle'));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setMicState('idle');
    }
  }, []);

  // Toggle: idle → listening, listening → stop+process
  const handleMicToggle = useCallback(async () => {
    const { micState } = stateRef.current;
    if (micState === 'idle') {
      await handleMicPress();
    } else if (micState === 'listening') {
      await handleMicStop();
    }
  }, [handleMicPress, handleMicStop]);

  // ── End session + score ───────────────────────────────────────────────────
  const handleEndSession = useCallback(async () => {
    const { messages, mode } = stateRef.current;
    const modeConfig = MODES[mode];

    if (messages.length === 0) {
      setState(initialState);
      return;
    }

    cancelSpeaking();
    setIsScoringLoading(true);
    setMicState('thinking');

    try {
      const scoreCard = await scoreSession(messages, modeConfig.scoringPrompt);
      setState((s) => ({ ...s, scoreCard, sessionActive: false, micState: 'idle' }));
    } catch (err) {
      setError('Failed to score session. Please try again.');
      setMicState('idle');
    } finally {
      setIsScoringLoading(false);
    }
  }, []);

  // ── New session ───────────────────────────────────────────────────────────
  const handleNewSession = useCallback(() => {
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

      {/* Top area: mode toggle */}
      <div className="relative z-10 flex flex-col items-center gap-4 pt-10 w-full px-6">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-bold tracking-[0.3em] uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Persona
          </span>
        </div>

        <ModeToggle
          current={mode}
          onChange={handleModeChange}
          disabled={sessionActive || isProcessing}
        />

        {/* File upload */}
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
          disabled={isProcessing && micState !== 'listening'}
        />

        {/* Session controls */}
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

        {/* Error */}
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

      {/* Bottom right: transcript toggle */}
      {messages.length > 0 && (
        <div className="fixed bottom-6 right-6 z-30">
          {!showTranscript && (
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
          )}
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
