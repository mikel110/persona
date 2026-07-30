'use client';

import { useState } from 'react';
import { SavedSession } from '@/types';
import TranscriptPanel from './TranscriptPanel';

interface HistoryPanelProps {
  sessions: SavedSession[];
  onClose: () => void;
  onDeleteSession: (id: string) => void;
  onSelectSession: (session: SavedSession) => void;
}

export default function HistoryPanel({
  sessions,
  onClose,
  onDeleteSession,
  onSelectSession,
}: HistoryPanelProps) {
  const [selectedSessionForTranscript, setSelectedSessionForTranscript] = useState<SavedSession | null>(null);

  // Calculate high-level stats
  const totalSessions = sessions.length;
  const avgScore = totalSessions > 0
    ? (sessions.reduce((acc, s) => acc + s.scoreCard.overallScore, 0) / totalSessions).toFixed(1)
    : '0.0';
  const avgFluency = totalSessions > 0
    ? (sessions.reduce((acc, s) => acc + (s.scoreCard.fluencyStats?.hesitationScore ?? 0), 0) / totalSessions).toFixed(1)
    : '0.0';

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className="fixed inset-y-0 right-0 z-40 w-full max-w-md flex flex-col transition-transform duration-300 ease-out shadow-2xl"
      style={{
        background: 'rgba(10, 10, 15, 0.85)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>📊</span> Session History
          </h2>
          <p className="text-xs mt-0.5 text-white/40">Track your learning progress</p>
        </div>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white text-xl transition-colors w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5"
        >
          ✕
        </button>
      </div>

      {/* Stats Summary */}
      <div className="px-6 py-4 grid grid-cols-3 gap-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="p-3 rounded-xl bg-white/[0.02] border" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <p className="text-[10px] text-white/40 uppercase font-semibold">Sessions</p>
          <p className="text-lg font-bold text-white mt-1">{totalSessions}</p>
        </div>
        <div className="p-3 rounded-xl bg-white/[0.02] border" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <p className="text-[10px] text-white/40 uppercase font-semibold">Avg Score</p>
          <p className="text-lg font-bold mt-1" style={{ color: Number(avgScore) >= 7 ? '#22c55e' : '#fbbf24' }}>
            {avgScore}<span className="text-[10px] text-white/30 font-normal">/10</span>
          </p>
        </div>
        <div className="p-3 rounded-xl bg-white/[0.02] border" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <p className="text-[10px] text-white/40 uppercase font-semibold">Avg Fluency</p>
          <p className="text-lg font-bold mt-1" style={{ color: Number(avgFluency) >= 7 ? '#22c55e' : '#fbbf24' }}>
            {avgFluency}<span className="text-[10px] text-white/30 font-normal">/10</span>
          </p>
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 scrollbar-thin">
        {sessions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-20 text-white/30">
            <span className="text-3xl mb-3">📭</span>
            <p className="text-sm font-medium">No sessions saved yet</p>
            <p className="text-xs mt-1 text-white/20">Complete a study session to save your score</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="p-4 rounded-xl relative group transition-all duration-300 hover:bg-white/[0.04] bg-white/[0.02] border"
              style={{ borderColor: 'rgba(255,255,255,0.05)' }}
            >
              {/* Top Row: Date & Mode badge */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium text-white/40">
                  {formatDate(session.timestamp)}
                </span>
                <span
                  className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: session.mode === 'quizzer' ? 'rgba(124, 58, 237, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    border: session.mode === 'quizzer' ? '1px solid rgba(124, 58, 237, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
                    color: session.mode === 'quizzer' ? '#c084fc' : '#60a5fa',
                  }}
                >
                  {session.mode === 'quizzer' ? 'Flashcards' : 'Feynman'}
                </span>
              </div>

              {/* Material Name */}
              <h4 className="text-sm font-semibold text-white/90 truncate pr-6">
                {session.fileName || 'General Practice'}
              </h4>

              {/* Stats Row */}
              <div className="flex gap-4 mt-3 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                <div>
                  <span className="text-[9px] uppercase text-white/30 block">Score</span>
                  <span className="text-sm font-bold text-white">{session.scoreCard.overallScore}/10</span>
                </div>
                {session.scoreCard.fluencyStats && (
                  <>
                    <div>
                      <span className="text-[9px] uppercase text-white/30 block">Fluency</span>
                      <span className="text-sm font-bold text-white">{session.scoreCard.fluencyStats.hesitationScore}/10</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-white/30 block">Density</span>
                      <span className="text-sm font-bold text-white">{session.scoreCard.fluencyStats.hesitationDensity}%</span>
                    </div>
                  </>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2 mt-4 pt-2">
                <button
                  onClick={() => onSelectSession(session)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 transition-all"
                >
                  View Scorecard
                </button>
                <button
                  onClick={() => setSelectedSessionForTranscript(session)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 transition-all"
                >
                  Transcript
                </button>
                <button
                  onClick={() => onDeleteSession(session.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                  title="Delete Session"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Embedded Transcript Overlay */}
      {selectedSessionForTranscript && (
        <TranscriptPanel
          messages={selectedSessionForTranscript.messages}
          onClose={() => setSelectedSessionForTranscript(null)}
        />
      )}
    </div>
  );
}
