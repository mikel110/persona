'use client';

import { ModeId } from '@/types';
import { teachItMode } from '@/lib/modes/teachIt';
import { socraticMode } from '@/lib/modes/socratic';

const modes = [teachItMode, socraticMode];

interface ModeToggleProps {
  current: ModeId;
  onChange: (mode: ModeId) => void;
  disabled?: boolean;
}

export default function ModeToggle({ current, onChange, disabled }: ModeToggleProps) {
  return (
    <div
      className="flex items-center gap-1 p-1 rounded-2xl"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
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
              relative px-5 py-2.5 rounded-xl text-sm font-semibold
              transition-all duration-300 ease-out
              focus:outline-none focus:ring-2 focus:ring-violet-500/50
              ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
            `}
            style={{
              background: isActive
                ? 'linear-gradient(135deg, #7c3aed, #6366f1)'
                : 'transparent',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
              boxShadow: isActive
                ? '0 0 20px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255,255,255,0.15)'
                : 'none',
            }}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
