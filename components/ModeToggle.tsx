'use client';

import { ModeId } from '@/types';
import { teachItMode } from '@/lib/modes/teachIt';
import { quizzerMode } from '@/lib/modes/quizzer';
import { motion } from 'framer-motion';

const modes = [teachItMode, quizzerMode];

interface ModeToggleProps {
  current: ModeId;
  onChange: (mode: ModeId) => void;
  disabled?: boolean;
}

export default function ModeToggle({ current, onChange, disabled }: ModeToggleProps) {
  return (
    <div
      className="flex items-center p-1.5 rounded-2xl relative"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(16px)',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)',
      }}
      role="tablist"
      aria-label="Mode selection"
    >
      {modes.map((mode) => {
        const isActive = current === mode.id;
        return (
          <button
            key={mode.id}
            id={`mode-${mode.id}`}
            role="tab"
            aria-selected={isActive}
            onClick={() => !disabled && onChange(mode.id)}
            disabled={disabled}
            title={mode.description}
            className={`
              relative z-10 px-6 py-2.5 rounded-xl text-sm font-semibold
              transition-colors duration-300 ease-out
              focus:outline-none focus:ring-2 focus:ring-violet-500/50
              ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:text-white'}
            `}
            style={{
              color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
            }}
          >
            {isActive && (
              <motion.div
                layoutId="active-mode-pill"
                className="absolute inset-0 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.9), rgba(99, 102, 241, 0.9))',
                  boxShadow: '0 0 20px rgba(124, 58, 237, 0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 select-none tracking-wide">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
