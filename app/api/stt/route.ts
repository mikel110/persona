import { NextRequest, NextResponse } from 'next/server';
import Groq, { toFile } from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy-key-for-build' });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Convert the Web File → Buffer → Groq Uploadable
    // The Groq SDK needs toFile() in a Next.js server context
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadable = await toFile(buffer, 'recording.webm', {
      type: 'audio/webm',
    });

    const transcription = await groq.audio.transcriptions.create({
      file: uploadable,
      model: 'whisper-large-v3',
      response_format: 'json',
      language: 'en',
    });

    return NextResponse.json({ transcript: transcription.text });
  } catch (err) {
    console.error('[/api/stt]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'STT failed' },
      { status: 500 }
    );
  }
}
