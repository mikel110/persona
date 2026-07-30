'use client';

import { ScoreCard } from '@/types';

interface ScorecardOverlayProps {
  scoreCard: ScoreCard;
  onNewSession: () => void;
}

function ScoreRing({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;
  const color = score >= 7 ? '#22c55e' : score >= 5 ? '#fbbf24' : '#ef4444';

  return (
    <div className="relative flex items-center justify-center w-20 h-20">
      <svg width="80" height="80" className="-rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle
          cx="40" cy="40" r={radius} fill="none"
          stroke={color} strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <span className="absolute text-xl font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

export default function ScorecardOverlay({ scoreCard, onNewSession }: ScorecardOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)' }}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-8 flex flex-col gap-6"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(40px)',
          boxShadow: '0 0 80px rgba(124, 58, 237, 0.2)',
        }}
      >
        {/* Header */}
        <div className="text-center">
          <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#a78bfa' }}>
            Session Complete
          </p>
          <h2 className="text-3xl font-bold text-white mb-1">Your Scorecard</h2>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {scoreCard.summary}
          </p>
        </div>

        {/* Overall score */}
        <div className="flex justify-center">
          <div className="flex flex-col items-center gap-2">
            <ScoreRing score={scoreCard.overallScore} />
            <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Overall Score
            </span>
          </div>
        </div>

        {/* Metric breakdown */}
        <div className="grid grid-cols-2 gap-3">
          {scoreCard.metrics.map((metric) => (
            <div
              key={metric.name}
              className="p-4 rounded-2xl"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {metric.name}
                </span>
                <span
                  className="text-base font-bold"
                  style={{
                    color: metric.score >= 7 ? '#22c55e' : metric.score >= 5 ? '#fbbf24' : '#ef4444',
                  }}
                >
                  {metric.score}/10
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {metric.feedback}
              </p>
            </div>
          ))}
        </div>

        {/* Speech & Hesitation Analytics */}
        {scoreCard.fluencyStats && (
          <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
              Speech & Hesitation Analytics
            </h3>
            
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Total Words</p>
                <div className="flex items-end gap-2">
                  <span className="text-xl font-bold" style={{ color: scoreCard.fluencyStats.totalWordsSpoken > 50 ? '#22c55e' : '#ef4444' }}>
                    {scoreCard.fluencyStats.totalWordsSpoken}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Hesitation Density</p>
                <div className="flex items-end gap-2">
                  <span className="text-xl font-bold" style={{ color: scoreCard.fluencyStats.hesitationDensity > 10 ? '#ef4444' : scoreCard.fluencyStats.hesitationDensity > 3 ? '#fbbf24' : '#22c55e' }}>
                    {scoreCard.fluencyStats.hesitationDensity}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Fluency Score</p>
                <div className="flex items-end gap-2">
                  <span className="text-xl font-bold" style={{ color: scoreCard.fluencyStats.hesitationScore >= 7 ? '#22c55e' : scoreCard.fluencyStats.hesitationScore >= 5 ? '#fbbf24' : '#ef4444' }}>
                    {scoreCard.fluencyStats.hesitationScore}
                  </span>
                  <span className="text-xs pb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>/10</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Filler Words</p>
                <div className="flex items-end gap-2">
                  <span className="text-xl font-bold" style={{ color: scoreCard.fluencyStats.fillerCount > 5 ? '#ef4444' : scoreCard.fluencyStats.fillerCount > 2 ? '#fbbf24' : '#22c55e' }}>
                    {scoreCard.fluencyStats.fillerCount}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {scoreCard.fluencyStats.speechAnalysis}
            </p>

            {(scoreCard.fluencyStats.shakyConcepts.length > 0 || scoreCard.fluencyStats.masteredConcepts.length > 0) && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Concept Delivery</p>
                <div className="flex flex-wrap gap-2">
                  {scoreCard.fluencyStats.masteredConcepts.map(c => (
                    <span key={c} className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      🟢 Mastered: {c}
                    </span>
                  ))}
                  {scoreCard.fluencyStats.shakyConcepts.map(c => (
                    <span key={c} className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      🟡 Shaky: {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl" style={{ background: 'rgba(34, 197, 94, 0.06)', border: '1px solid rgba(34, 197, 94, 0.15)' }}>
            <p className="text-xs font-bold mb-2" style={{ color: '#86efac' }}>✓ Strengths</p>
            <ul className="space-y-1">
              {scoreCard.strengths && scoreCard.strengths.length > 0 ? (
                scoreCard.strengths.map((s, i) => (
                  <li key={i} className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>• {s}</li>
                ))
              ) : (
                <li className="text-xs italic" style={{ color: 'rgba(255,255,255,0.3)' }}>No strengths recorded. Speak at greater length to show mastery.</li>
              )}
            </ul>
          </div>
          <div className="p-4 rounded-2xl" style={{ background: 'rgba(251, 191, 36, 0.06)', border: '1px solid rgba(251, 191, 36, 0.15)' }}>
            <p className="text-xs font-bold mb-2" style={{ color: '#fde68a' }}>↑ Improve</p>
            <ul className="space-y-1">
              {scoreCard.improvements && scoreCard.improvements.length > 0 ? (
                scoreCard.improvements.map((s, i) => (
                  <li key={i} className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>• {s}</li>
                ))
              ) : (
                <li className="text-xs italic" style={{ color: 'rgba(255,255,255,0.3)' }}>Perfect session! No improvements suggested.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Action */}
        <button
          id="new-session-btn"
          onClick={onNewSession}
          className="w-full py-4 rounded-2xl font-semibold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
            boxShadow: '0 0 30px rgba(124, 58, 237, 0.4)',
          }}
        >
          New Session
        </button>
      </div>
    </div>
  );
}
