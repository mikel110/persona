'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConceptTrackerProps {
  concepts: string[];
  coveredConcepts: string[];
  shakyConcepts: string[];
  isSessionActive: boolean;
}

export default function ConceptTracker({ concepts, coveredConcepts, shakyConcepts, isSessionActive }: ConceptTrackerProps) {
  const [expanded, setExpanded] = useState(true);
  const [newlyCovered, setNewlyCovered] = useState<Set<string>>(new Set());
  const [newlyShaky, setNewlyShaky] = useState<Set<string>>(new Set());
  const prevCoveredRef = useRef<string[]>([]);
  const prevShakyRef = useRef<string[]>([]);

  // Detect newly covered concepts and flash them
  useEffect(() => {
    const prevC = new Set(prevCoveredRef.current);
    const prevS = new Set(prevShakyRef.current);
    
    const freshCovered = coveredConcepts.filter((c) => !prevC.has(c));
    const freshShaky = shakyConcepts.filter((c) => !prevS.has(c));
    
    if (freshCovered.length > 0) {
      setNewlyCovered(new Set(freshCovered));
      setTimeout(() => setNewlyCovered(new Set()), 1500);
    }
    
    if (freshShaky.length > 0) {
      setNewlyShaky(new Set(freshShaky));
      setTimeout(() => setNewlyShaky(new Set()), 1500);
    }
    
    prevCoveredRef.current = coveredConcepts;
    prevShakyRef.current = shakyConcepts;
  }, [coveredConcepts, shakyConcepts]);

  if (!isSessionActive || concepts.length === 0) return null;

  const combinedCovered = new Set([...coveredConcepts, ...shakyConcepts]);
  const covered = combinedCovered.size;
  const total = concepts.length;
  const pct = Math.round((covered / total) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
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
          className="flex items-center gap-2.5 w-full px-3 py-3 transition-colors hover:bg-white/5 outline-none"
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

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex flex-col items-start overflow-hidden whitespace-nowrap"
              >
                <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {covered}/{total} concepts
                </span>
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {pct === 100 ? '🎉 All covered!' : 'tap to toggle'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* Progress bar */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 2, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mx-3 mb-2 rounded-full overflow-hidden" 
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${pct}%`,
                  background: pct === 100
                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                    : 'linear-gradient(90deg, rgba(124,58,237,0.8), rgba(167,139,250,0.9))',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Concept list */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col gap-0.5 pb-3 px-2 max-h-64 overflow-y-auto" 
              style={{ scrollbarWidth: 'none' }}
            >
              <AnimatePresence>
                {concepts.map((concept, i) => {
                  const isMastered = coveredConcepts.includes(concept);
                  const isShaky = !isMastered && shakyConcepts.includes(concept);
                  const isCovered = isMastered || isShaky;
                  const isNewMastered = newlyCovered.has(concept);
                  const isNewShaky = newlyShaky.has(concept);

                  return (
                    <motion.div
                      key={concept}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ 
                        opacity: 1, 
                        x: isNewShaky ? [-5, 5, -5, 5, 0] : 0, 
                        scale: isNewMastered ? [1, 1.05, 1] : 1 
                      }}
                      transition={{ 
                        delay: i * 0.05,
                        duration: isNewShaky || isNewMastered ? 0.4 : 0.2
                      }}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                      style={{
                        background: isMastered
                          ? 'rgba(16, 185, 129, 0.08)'
                          : isShaky
                          ? 'rgba(245, 158, 11, 0.08)'
                          : 'transparent',
                        boxShadow: isNewMastered ? '0 0 12px rgba(16,185,129,0.3)' : isNewShaky ? '0 0 12px rgba(245,158,11,0.3)' : 'none',
                      }}
                    >
                      {/* Check circle */}
                      <motion.div
                        animate={{
                          backgroundColor: isMastered ? '#10b981' : isShaky ? '#f59e0b' : 'rgba(255,255,255,0.06)',
                          borderColor: isCovered ? 'transparent' : 'rgba(255,255,255,0.15)',
                        }}
                        className="flex-shrink-0 flex items-center justify-center rounded-full border border-solid"
                        style={{ width: 16, height: 16 }}
                      >
                        <AnimatePresence>
                          {isMastered && (
                            <motion.svg 
                              initial={{ scale: 0 }} 
                              animate={{ scale: 1 }} 
                              width="8" height="8" viewBox="0 0 8 8" fill="none"
                            >
                              <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </motion.svg>
                          )}
                          {isShaky && (
                            <motion.svg 
                              initial={{ scale: 0 }} 
                              animate={{ scale: 1 }}
                              width="8" height="8" viewBox="0 0 8 8" fill="none"
                            >
                              <circle cx="4" cy="4" r="1.5" fill="white" />
                            </motion.svg>
                          )}
                        </AnimatePresence>
                      </motion.div>

                      {/* Concept name */}
                      <span
                        className="text-[11px] leading-tight line-clamp-2 transition-colors duration-300"
                        style={{
                          color: isCovered ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                          fontWeight: isCovered ? 500 : 400,
                        }}
                      >
                        {concept}
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
