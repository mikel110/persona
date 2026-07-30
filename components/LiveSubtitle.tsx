'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LiveSubtitle({ text }: { text: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Split text into sentences intelligently using lookbehind for punctuation
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);
  
  if (sentences.length === 0) {
    sentences.push(text);
  }

  useEffect(() => {
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (currentIndex >= sentences.length - 1) return;

    // Estimate duration based on sentence length (roughly 50ms per character)
    const currentSentence = sentences[currentIndex] || '';
    const durationMs = Math.max(800, currentSentence.length * 50);

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [currentIndex, sentences]);

  const currentText = sentences[currentIndex] || '';

  return (
    <div className="flex items-center justify-center min-h-[3rem] w-full">
      <AnimatePresence mode="wait">
        <motion.p
          key={currentIndex}
          initial={{ opacity: 0, y: 5, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -5, filter: 'blur(4px)' }}
          transition={{ duration: 0.5 }}
          className="text-lg font-medium tracking-wide text-center"
          style={{
            color: 'rgba(255,255,255,0.95)',
            textShadow: '0 0 20px rgba(99, 102, 241, 0.5), 0 2px 4px rgba(0,0,0,0.8)'
          }}
        >
          {currentText}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
