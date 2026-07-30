'use client';

import { useState, useCallback, useRef } from 'react';
import MicButton from '@/components/MicButton';
import ModeToggle from '@/components/ModeToggle';
import FileUpload from '@/components/FileUpload';
import ScorecardOverlay from '@/components/ScorecardOverlay';
import TranscriptPanel from '@/components/TranscriptPanel';
import ConceptTracker from '@/components/ConceptTracker';
import { teachItMode } from '@/lib/modes/teachIt';
import { quizzerMode } from '@/lib/modes/quizzer';
import { sendMessage } from '@/lib/chatEngine';
import { scoreSession } from '@/lib/scoringEngine';
import { startListening, stopListening, speak, cancelSpeaking } from '@/lib/speechEngine';
import type { AppState, Message, ModeId } from '@/types';

const MODES = { 'teach-it': teachItMode, 'quizzer': quizzerMode };

// Regex to extract [COVERED: concept_name] and [SHAKY: concept_name] tags from AI replies
const COVERED_REGEX = /\[COVERED:\s*([^\]]+)\]/gi;
const SHAKY_REGEX = /\[SHAKY:\s*([^\]]+)\]/gi;

const initialState: AppState = {
  mode: 'teach-it',
  micState: 'idle',
  material: '',
  concepts: [],
  coveredConcepts: [],
  shakyConcepts: [],
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

  // ── Auto-resume listening after each AI turn ──────────────────────────────
  const resumeListening = useCallback((prefix: string = '') => {
    if (!stateRef.current.sessionActive) return;
    setMicState('listening');
    startListening(
      (transcript) => processTranscript(transcript),
      (errMsg) => {
        if (errMsg.includes('No speech detected')) {
          resumeListening(); // silently retry
        } else {
          setError(errMsg);
          setMicState('idle');
        }
      },
      prefix
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mode change ────────────────────────────────────────────────────────────
  const handleModeChange = useCallback((mode: ModeId) => {
    stopListening();
    cancelSpeaking();
    setState({ ...initialState, mode });
  }, []);

  // ── File upload + concept extraction ──────────────────────────────────────
  const handleFileExtracted = useCallback(async (text: string, fileName: string) => {
    if (!text) {
      setState((s) => ({ ...s, material: '', uploadedFileName: '', concepts: [], coveredConcepts: [] }));
      return;
    }
    setState((s) => ({ ...s, material: text, uploadedFileName: fileName, isUploading: true, concepts: [], coveredConcepts: [] }));
    try {
      const res = await fetch('/api/extract-concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.error || 'Failed to extract concepts');
      }
      setState((s) => ({ ...s, concepts: data.concepts ?? [], isUploading: false }));
    } catch (err: any) {
      setState((s) => ({ ...s, isUploading: false }));
      setError(err?.message || 'Failed to extract concepts. Check your Groq API key.');
    }
  }, []);

  // ── Process transcript → LLM → parse coverage → speak → loop ─────────────
  const processTranscript = useCallback(async (transcript: string) => {
    if (!transcript.trim()) {
      resumeListening();
      return;
    }

    const { mode, material, concepts, messages } = stateRef.current;
    const modeConfig = MODES[mode];

    setMicState('thinking');
    setError(null);

    try {
      const userMsg: Message = { role: 'user', content: transcript, timestamp: Date.now() };
      const updatedHistory = [...messages, userMsg];
      setState((s) => ({ ...s, messages: updatedHistory }));

      const systemPrompt = modeConfig.buildSystemPrompt(material, concepts);
      const rawReply = await sendMessage(updatedHistory, systemPrompt);

      // ── Parse [COVERED: concept] tags from AI reply ──────────────────────
      const newlyCovered: string[] = [];
      let matchCovered;
      const regexCovered = new RegExp(COVERED_REGEX.source, 'gi');
      while ((matchCovered = regexCovered.exec(rawReply)) !== null) {
        newlyCovered.push(matchCovered[1].trim());
      }

      // ── Parse [SHAKY: concept] tags from AI reply ────────────────────────
      const newlyShaky: string[] = [];
      let matchShaky;
      const regexShaky = new RegExp(SHAKY_REGEX.source, 'gi');
      while ((matchShaky = regexShaky.exec(rawReply)) !== null) {
        newlyShaky.push(matchShaky[1].trim());
      }

      // Strip tags from displayed/spoken text
      const cleanReply = rawReply
        .replace(COVERED_REGEX, '')
        .replace(SHAKY_REGEX, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      const aiMsg: Message = { role: 'assistant', content: cleanReply, timestamp: Date.now() };
      
      setState((s) => {
        // Fuzzy match newly detected concepts against tracked concepts
        const matchedCovered = concepts.filter((c) =>
          newlyCovered.some((n) => c.toLowerCase() === n.toLowerCase() || c.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(c.toLowerCase()))
        );
        const matchedShaky = concepts.filter((c) =>
          newlyShaky.some((n) => c.toLowerCase() === n.toLowerCase() || c.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(c.toLowerCase()))
        );

        return {
          ...s,
          messages: [...updatedHistory, aiMsg],
          coveredConcepts: [...new Set([...s.coveredConcepts, ...matchedCovered])],
          shakyConcepts: [...new Set([...s.shakyConcepts, ...matchedShaky])],
        };
      });

      setMicState('speaking');
      await speak(
        cleanReply,
        () => resumeListening(),   // onEnd — auto-resume
        (interruptText) => resumeListening(interruptText) // onInterrupt — barge-in → resume with captured words
      );
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Listening again...');
      setTimeout(() => resumeListening(), 2000);
    }
  }, [resumeListening]);

  // ── Mic press — one tap starts the session ─────────────────────────────────
  const handleMicPress = useCallback(() => {
    const { sessionActive, micState } = stateRef.current;
    if (sessionActive || micState !== 'idle') return;

    setState((s) => ({ ...s, sessionActive: true, error: null }));
    setMicState('listening');

    startListening(
      (transcript) => processTranscript(transcript),
      (errMsg) => {
        if (errMsg.includes('No speech detected')) {
          resumeListening();
        } else {
          setError(errMsg);
          setMicState('idle');
        }
      }
    );
  }, [processTranscript, resumeListening]);

  // ── End session + score ───────────────────────────────────────────────────
  const handleEndSession = useCallback(async () => {
    const { messages, mode } = stateRef.current;
    const modeConfig = MODES[mode];

    stopListening();
    cancelSpeaking();
    setState((s) => ({ ...s, sessionActive: false }));

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

  const { mode, micState, concepts, coveredConcepts, shakyConcepts, isUploading, uploadedFileName, scoreCard, sessionActive, error, messages } = state;
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

      {/* Live concept tracker — left side, only during active session */}
      <ConceptTracker
        concepts={concepts}
        coveredConcepts={coveredConcepts}
        shakyConcepts={shakyConcepts}
        isSessionActive={sessionActive}
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
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-6">
        <MicButton
          state={micState}
          onPress={handleMicPress}
          disabled={sessionActive}
        />

        {/* State hints */}
        {!sessionActive && micState === 'idle' && (
          <p className="text-xs tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>
            tap to begin
          </p>
        )}

        {sessionActive && (
          <p className="text-xs tracking-widest uppercase animate-pulse" style={{ color: 'rgba(124, 58, 237, 0.6)' }}>
            {micState === 'listening' ? 'speak anytime'
              : micState === 'thinking' ? 'thinking...'
              : micState === 'speaking' ? 'interrupt anytime'
              : ''}
          </p>
        )}

        {/* End session */}
        {sessionActive && (
          <button
            id="end-session-btn"
            onClick={handleEndSession}
            disabled={isScoringLoading}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)',
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

      {showTranscript && (
        <TranscriptPanel messages={messages} onClose={() => setShowTranscript(false)} />
      )}

      {scoreCard && (
        <ScorecardOverlay scoreCard={scoreCard} onNewSession={handleNewSession} />
      )}
    </main>
  );
}
