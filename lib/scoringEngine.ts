'use client';

import type { Message, ScoreCard } from '@/types';

// ─── Scoring Engine ───────────────────────────────────────────────────────────
// Sends full transcript + scoring prompt to /api/score at session end
// Returns a structured ScoreCard

export async function scoreSession(
  transcript: Message[],
  scoringPrompt: string
): Promise<ScoreCard> {
  const res = await fetch('/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, scoringPrompt }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Scoring request failed');
  }

  const data = await res.json();
  return data.scorecard as ScoreCard;
}
