'use client';

import { MicState } from '@/types';

interface MicButtonProps {
  state: MicState;
  onPress: () => void;
  disabled?: boolean;
}

const stateConfig = {
  idle: {
    ring: 'rgba(124, 58, 237, 0.3)',
    glow: 'rgba(124, 58, 237, 0.15)',
    icon: '🎙️',
    label: 'Start conversation',
    animation: 'animate-breathe',
  },
  listening: {
    ring: 'rgba(34, 197, 94, 0.8)',
    glow: 'rgba(34, 197, 94, 0.3)',
    icon: '🎙️',
    label: 'Listening...',
    animation: 'animate-ripple',
  },
  thinking: {
    ring: 'rgba(251, 191, 36, 0.8)',
    glow: 'rgba(251, 191, 36, 0.25)',
    icon: '⏳',
    label: 'Thinking...',
    animation: 'animate-spin-slow',
  },
  speaking: {
    ring: 'rgba(99, 102, 241, 0.9)',
    glow: 'rgba(99, 102, 241, 0.3)',
    icon: '🔊',
    label: 'Speaking...',
    animation: 'animate-wave',
  },
};

export default function MicButton({ state, onPress, disabled }: MicButtonProps) {
  const config = stateConfig[state];
  const isActive = state === 'listening';

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Outer glow ring */}
      <div className="relative flex items-center justify-center">
        {/* Animated rings */}
        <div
          className={`absolute rounded-full transition-all duration-500 ${
            state === 'listening' ? 'animate-ping-slow' : ''
          }`}
          style={{
            width: 180,
            height: 180,
            background: `radial-gradient(circle, ${config.glow} 0%, transparent 70%)`,
            opacity: state === 'idle' ? 0.5 : 1,
          }}
        />
        <div
          className="absolute rounded-full transition-all duration-500"
          style={{
            width: 160,
            height: 160,
            boxShadow: `0 0 40px ${config.ring}, 0 0 80px ${config.glow}`,
            border: `2px solid ${config.ring}`,
            borderRadius: '50%',
          }}
        />

        {/* Main button */}
        <button
          id="mic-button"
          onClick={onPress}
          disabled={disabled || state === 'thinking' || state === 'speaking'}
          aria-label={`Microphone - ${config.label}`}
          className={`
            relative z-10 flex items-center justify-center
            w-32 h-32 rounded-full
            transition-all duration-300 ease-out
            focus:outline-none focus:ring-4 focus:ring-violet-500/50
            ${disabled || state === 'thinking' || state === 'speaking'
              ? 'cursor-not-allowed opacity-60'
              : 'cursor-pointer hover:scale-105 active:scale-95'
            }
            ${isActive ? 'scale-110' : ''}
          `}
          style={{
            background: isActive
              ? 'linear-gradient(135deg, #16a34a, #22c55e)'
              : 'linear-gradient(135deg, #4c1d95, #7c3aed)',
            boxShadow: isActive
              ? '0 0 30px rgba(34, 197, 94, 0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
              : '0 0 30px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          <span className="text-4xl select-none" role="img" aria-hidden>
            {config.icon}
          </span>
        </button>
      </div>

      {/* State label */}
      <span
        className="text-sm font-medium tracking-widest uppercase transition-all duration-300"
        style={{ color: config.ring, letterSpacing: '0.15em' }}
      >
        {config.label}
      </span>
    </div>
  );
}
