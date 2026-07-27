'use client';

import { Message } from '@/types';
import { useEffect, useRef } from 'react';

interface TranscriptPanelProps {
  messages: Message[];
  onClose: () => void;
}

export default function TranscriptPanel({ messages, onClose }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div
      className="fixed bottom-6 right-6 w-80 max-h-96 rounded-2xl overflow-hidden z-40 flex flex-col"
      style={{
        background: 'rgba(10, 10, 15, 0.95)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: '#a78bfa' }}>
          Transcript
        </span>
        <button
          id="close-transcript-btn"
          onClick={onClose}
          className="text-xs px-2 py-1 rounded-lg transition-colors hover:bg-white/10"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Conversation will appear here...
          </p>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <span className="text-xs font-semibold" style={{ color: msg.role === 'user' ? '#a78bfa' : 'rgba(255,255,255,0.4)' }}>
                {msg.role === 'user' ? 'You' : 'AI'}
              </span>
              <div
                className="px-3 py-2 rounded-xl text-xs leading-relaxed max-w-[90%]"
                style={{
                  background: msg.role === 'user'
                    ? 'rgba(124, 58, 237, 0.2)'
                    : 'rgba(255,255,255,0.05)',
                  border: msg.role === 'user'
                    ? '1px solid rgba(124, 58, 237, 0.3)'
                    : '1px solid rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.8)',
                }}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
