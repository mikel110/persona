import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const apiKey = process.env.UNREALSPEECH_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'UNREALSPEECH_API_KEY not configured' }, { status: 500 });
    }

    // Unreal Speech streaming endpoint
    // Voice options: Scarlett, Dan, Will, Liv, Amy
    const response = await fetch('https://api.v7.unrealspeech.com/stream', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Text: text,
        VoiceId: process.env.UNREALSPEECH_VOICE_ID ?? 'Scarlett',
        Bitrate: '192k',
        Speed: '0',
        Pitch: '1',
        Codec: 'libmp3lame',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[/api/tts] Unreal Speech error:', errText);
      return NextResponse.json({ error: 'TTS generation failed' }, { status: 500 });
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (err) {
    console.error('[/api/tts]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'TTS failed' },
      { status: 500 }
    );
  }
}
