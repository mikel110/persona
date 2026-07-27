import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import type { Message } from '@/types';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { transcript, scoringPrompt } = await request.json() as {
      transcript: Message[];
      scoringPrompt: string;
    };

    if (!transcript || !scoringPrompt) {
      return NextResponse.json({ error: 'Missing transcript or scoringPrompt' }, { status: 400 });
    }

    const transcriptText = transcript
      .map((m) => `${m.role === 'user' ? 'Student' : 'AI'}: ${m.content}`)
      .join('\n\n');

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: scoringPrompt },
        {
          role: 'user',
          content: `Here is the full conversation transcript to score:\n\n${transcriptText}`,
        },
      ],
      temperature: 0.3,
      max_completion_tokens: 1024,
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';

    // Robustly extract JSON even if model adds preamble
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error('Model returned invalid JSON for scoring');
    }

    const scorecard = JSON.parse(match[0]);
    return NextResponse.json({ scorecard });
  } catch (err) {
    console.error('[/api/score]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Scoring failed' },
      { status: 500 }
    );
  }
}
