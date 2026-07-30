import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import type { Message } from '@/types';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy-key-for-build' });

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

    // Calculate Professional Deterministic Metrics
    const studentText = transcript
      .filter(m => m.role === 'user')
      .map(m => m.content.toLowerCase())
      .join(' ');
      
    // 1. Total Words
    const totalWordsSpoken = studentText.split(/\s+/).filter(w => w.trim().length > 0).length;
      
    // 2. Filler Count
    const fillerMatches = studentText.match(/\b(um+|uh+|er+|ah+|like|you know|i mean|sort of|kind of)\b/g);
    const actualFillerCount = fillerMatches ? fillerMatches.length : 0;

    // 3. Hesitation Density (Percentage of words that are fillers)
    const hesitationDensity = totalWordsSpoken > 0 
      ? Math.round((actualFillerCount / totalWordsSpoken) * 100) 
      : 0;

    // 4. Mathematical Prompt Penalties
    let strictPenalties = `\n\n=== DETERMINISTIC BEHAVIORAL METRICS ===\n`;
    strictPenalties += `The student spoke a total of ${totalWordsSpoken} words.\n`;
    strictPenalties += `They used ${actualFillerCount} filler words, resulting in a Hesitation Density of ${hesitationDensity}%.\n\n`;
    
    strictPenalties += `CRITICAL SCORING RULES:\n`;
    strictPenalties += `1. You MUST include these exact numbers in the 'fluencyStats' JSON output: totalWordsSpoken: ${totalWordsSpoken}, fillerCount: ${actualFillerCount}, hesitationDensity: ${hesitationDensity}.\n`;
    
    if (totalWordsSpoken < 40) {
      strictPenalties += `2. [SEVERE PENALTY]: The student spoke less than 40 words total. They did NOT provide enough information to prove mastery. You MUST cap all their scores (including Overall Score) to a MAXIMUM of 4/10. Label the session as "Severely Incomplete" in the summary.\n`;
    }
    
    if (hesitationDensity > 15) {
      strictPenalties += `3. [FLUENCY PENALTY]: The student's Hesitation Density is extremely high (>15%). You MUST score their 'hesitationScore' below 5/10, regardless of how accurate their actual words were.\n`;
    } else if (hesitationDensity === 0 && totalWordsSpoken > 50) {
      strictPenalties += `3. [FLUENCY BONUS]: The student spoke at length with 0% Hesitation Density. You should give them a 9/10 or 10/10 for 'hesitationScore'.\n`;
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: scoringPrompt },
        {
          role: 'user',
          content: `Here is the full conversation transcript to score:\n\n${transcriptText}${strictPenalties}`,
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
