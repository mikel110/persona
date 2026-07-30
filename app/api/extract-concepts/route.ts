import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy-key-for-build' });

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'You are a concept extractor. Extract 5-8 key concepts or terms from the provided study material. Return ONLY a valid JSON array of strings — no explanation, no markdown, no extra text. Example: ["concept1", "concept2", "concept3"]',
        },
        {
          role: 'user',
          content: `Extract the key concepts from this study material:\n\n${text.slice(0, 8000)}`,
        },
      ],
      temperature: 0.3,
      max_completion_tokens: 256,
    });

    const raw = completion.choices[0]?.message?.content ?? '[]';

    // Robustly parse JSON even if model adds extra text
    const match = raw.match(/\[[\s\S]*\]/);
    const concepts: string[] = match ? JSON.parse(match[0]) : [];

    return NextResponse.json({ concepts });
  } catch (err) {
    console.error('[/api/extract-concepts]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Concept extraction failed' },
      { status: 500 }
    );
  }
}
