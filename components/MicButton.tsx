'use client';

import { MicState } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Loader2, Volume2 } from 'lucide-react';

interface MicButtonProps {
  state: MicState;
  onPress: () => void;
  disabled?: boolean;
}

const stateConfig = {
  idle: {
    color: '#7c3aed', // Violet 600
    glow: 'rgba(124, 58, 237, 0.4)',
    label: 'Start conversation',
    icon: <Mic className="w-10 h-10 text-white opacity-90" />,
  },
  listening: {
    color: '#10b981', // Emerald 500
    glow: 'rgba(16, 185, 129, 0.6)',
    label: 'Listening...',
    icon: <Mic className="w-10 h-10 text-white" />,
  },
  thinking: {
    color: '#f59e0b', // Amber 500
    glow: 'rgba(245, 158, 11, 0.4)',
    label: 'Thinking...',
    icon: <Loader2 className="w-10 h-10 text-white animate-spin" />,
  },
  speaking: {
    color: '#3b82f6', // Blue 500
    glow: 'rgba(59, 130, 246, 0.6)',
    label: 'Speaking...',
    icon: <Volume2 className="w-10 h-10 text-white" />,
  },
};

export default function MicButton({ state, onPress, disabled }: MicButtonProps) {
  const config = stateConfig[state];

  // Define liquid/morphing animation variants based on state
  const variants = {
    idle: { scale: 1, borderRadius: '50%' },
    listening: {
      scale: [1, 1.1],
      borderRadius: ['50%', '40%'],
      transition: { repeat: Infinity, repeatType: 'reverse' as const, duration: 1, ease: "easeInOut" as const }
    },
    thinking: {
      scale: 1.05,
      borderRadius: '50%',
      transition: { duration: 0.5 }
    },
    speaking: {
      scale: [1.05, 1.2],
      borderRadius: ['50%', '45%'],
      transition: { repeat: Infinity, repeatType: 'reverse' as const, duration: 0.75, ease: "easeInOut" as const }
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 mt-4">
      {/* Outer glow ring and Button */}
      <div className="relative flex items-center justify-center w-40 h-40">
        
        {/* Ambient Glow */}
        <motion.div
          initial={false}
          animate={{ backgroundColor: config.glow }}
          className="absolute w-48 h-48 rounded-full blur-2xl pointer-events-none transition-colors duration-500"
        />

        {/* Main Button Wrapper (Handles continuous pulsing) */}
        <motion.div
          initial={false}
          animate={state}
          variants={variants}
          className="relative z-10 w-32 h-32 rounded-full"
        >
          {/* Main Button (Handles interaction) */}
          <motion.button
            id="mic-button"
            onClick={onPress}
            disabled={disabled || state === 'thinking'}
            whileHover={state === 'idle' ? { scale: 1.05 } : {}}
            whileTap={state === 'idle' ? { scale: 0.95 } : {}}
            className={`
              w-full h-full rounded-full flex items-center justify-center
              focus:outline-none overflow-hidden relative
              ${disabled || state === 'thinking'
                ? 'cursor-not-allowed'
                : 'cursor-pointer'
              }
            `}
            style={{
              background: `linear-gradient(135deg, ${config.color}, ${config.glow})`,
              boxShadow: `inset 0 2px 4px rgba(255,255,255,0.3), 0 10px 20px rgba(0,0,0,0.5)`,
            }}
          >
            {/* Inner glass reflection */}
            <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
            
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              key={state}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {config.icon}
            </motion.div>
          </motion.button>
        </motion.div>
      </div>

      {/* State label */}
      <AnimatePresence mode="wait">
        <motion.span
          key={state + "-label"}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
          className="text-xs font-semibold tracking-[0.2em] uppercase absolute -bottom-8"
          style={{ color: config.color }}
        >
          {config.label}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
