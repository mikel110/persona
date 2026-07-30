import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import type { Message } from '@/types';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy-key-for-build' });

export async function POST(request: NextRequest) {
  try {
    const { messages, systemPrompt } = await request.json() as {
      messages: Message[];
      systemPrompt: string;
    };

    if (!messages || !systemPrompt) {
      return NextResponse.json({ error: 'Missing messages or systemPrompt' }, { status: 400 });
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.8,
      max_completion_tokens: 512,
    });

    const reply = completion.choices[0]?.message?.content ?? '';
    return NextResponse.json({ reply });
  } catch (err) {
    console.error('[/api/chat]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Chat failed' },
      { status: 500 }
    );
  }
}
