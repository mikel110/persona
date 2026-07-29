'use client';

import { useState, useEffect, useRef } from 'react';

interface ConceptTrackerProps {
  concepts: string[];
  coveredConcepts: string[];
  isSessionActive: boolean;
}

export default function ConceptTracker({ concepts, coveredConcepts, isSessionActive }: ConceptTrackerProps) {
  const [expanded, setExpanded] = useState(true);
  const [newlyCovered, setNewlyCovered] = useState<Set<string>>(new Set());
  const prevCoveredRef = useRef<string[]>([]);

  // Detect newly covered concepts and flash them
  useEffect(() => {
    const prev = new Set(prevCoveredRef.current);
    const fresh = coveredConcepts.filter((c) => !prev.has(c));
    if (fresh.length > 0) {
      setNewlyCovered(new Set(fresh));
      setTimeout(() => setNewlyCovered(new Set()), 1200);
    }
    prevCoveredRef.current = coveredConcepts;
  }, [coveredConcepts]);

  if (!isSessionActive || concepts.length === 0) return null;

  const covered = coveredConcepts.length;
  const total = concepts.length;
  const pct = Math.round((covered / total) * 100);

  return (
    <div
      className="fixed left-5 top-1/2 -translate-y-1/2 z-20 flex flex-col"
      style={{ maxWidth: expanded ? '220px' : '44px' }}
    >
      <div
        className="rounded-2xl overflow-hidden transition-all duration-500 ease-in-out"
        style={{
          background: 'rgba(10, 10, 20, 0.85)',
          border: '1px solid rgba(124, 58, 237, 0.2)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          width: expanded ? '220px' : '44px',
        }}
      >
        {/* Header — always visible */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-2.5 w-full px-3 py-3 transition-colors hover:bg-white/5"
          style={{ minHeight: '44px' }}
        >
          {/* Circular progress ring */}
          <div className="relative flex-shrink-0" style={{ width: 28, height: 28 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" className="rotate-[-90deg]">
              <circle
                cx="14" cy="14" r="11"
                fill="none"
                stroke="rgba(124, 58, 237, 0.15)"
                strokeWidth="2.5"
              />
              <circle
                cx="14" cy="14" r="11"
                fill="none"
                stroke={pct === 100 ? '#10b981' : 'rgba(124, 58, 237, 0.85)'}
                strokeWidth="2.5"
                strokeDasharray={`${2 * Math.PI * 11}`}
                strokeDashoffset={`${2 * Math.PI * 11 * (1 - pct / 100)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
              />
            </svg>
            <span
              className="absolute inset-0 flex items-center justify-center font-bold"
              style={{ fontSize: '8px', color: 'rgba(255,255,255,0.7)' }}
            >
              {pct}%
            </span>
          </div>

          {expanded && (
            <div className="flex flex-col items-start overflow-hidden">
              <span className="text-xs font-semibold whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {covered}/{total} concepts
              </span>
              <span className="text-[10px] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {pct === 100 ? '🎉 All covered!' : 'tap to toggle'}
              </span>
            </div>
          )}
        </button>

        {/* Progress bar */}
        {expanded && (
          <div className="mx-3 mb-2 rounded-full overflow-hidden" style={{ height: '2px', background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${pct}%`,
                background: pct === 100
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : 'linear-gradient(90deg, rgba(124,58,237,0.8), rgba(167,139,250,0.9))',
              }}
            />
          </div>
        )}

        {/* Concept list */}
        {expanded && (
          <div className="flex flex-col gap-0.5 pb-3 px-2 max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            {concepts.map((concept) => {
              const isCovered = coveredConcepts.includes(concept);
              const isNew = newlyCovered.has(concept);

              return (
                <div
                  key={concept}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-400"
                  style={{
                    background: isNew
                      ? 'rgba(124, 58, 237, 0.25)'
                      : isCovered
                      ? 'rgba(124, 58, 237, 0.08)'
                      : 'transparent',
                    transform: isNew ? 'scale(1.02)' : 'scale(1)',
                  }}
                >
                  {/* Check circle */}
                  <div
                    className="flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-400"
                    style={{
                      width: 16,
                      height: 16,
                      background: isCovered ? 'rgba(124, 58, 237, 0.9)' : 'rgba(255,255,255,0.06)',
                      border: isCovered ? 'none' : '1px solid rgba(255,255,255,0.15)',
                      boxShadow: isNew ? '0 0 8px rgba(124,58,237,0.6)' : 'none',
                    }}
                  >
                    {isCovered && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>

                  {/* Concept name */}
                  <span
                    className="text-[11px] leading-tight transition-all duration-400 line-clamp-2"
                    style={{
                      color: isCovered ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)',
                      fontWeight: isCovered ? 500 : 400,
                      textDecoration: isCovered ? 'none' : 'none',
                    }}
                  >
                    {concept}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
