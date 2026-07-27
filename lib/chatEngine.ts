'use client';

import type { Message } from '@/types';

// ─── Chat Engine ─────────────────────────────────────────────────────────────
// Sends full conversation history + system prompt to /api/chat
// Returns the AI's reply text

export async function sendMessage(
  history: Message[],
  systemPrompt: string
): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: history,
      systemPrompt,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Chat request failed');
  }

  const data = await res.json();
  return data.reply as string;
}
