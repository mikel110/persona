'use client';

// ─── Speech Engine (Chrome Web Speech API + ElevenLabs TTS) ─────────────────
// STT: MediaRecorder → /api/stt (Groq Whisper)
// TTS: /api/tts (ElevenLabs) → Web Audio playback

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let currentAudio: HTMLAudioElement | null = null;

// ── Recording / STT ──────────────────────────────────────────────────────────

export async function startListening(): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  // Prefer webm/opus (Chrome default), fall back to whatever is supported
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : MediaRecorder.isTypeSupported('audio/webm')
    ? 'audio/webm'
    : '';

  mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  audioChunks = [];

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) audioChunks.push(e.data);
  };

  mediaRecorder.start(100); // collect chunks every 100ms
}

export async function stopListening(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder) {
      reject(new Error('Not recording'));
      return;
    }

    mediaRecorder.onstop = async () => {
      try {
        const blob = new Blob(audioChunks, {
          type: mediaRecorder?.mimeType ?? 'audio/webm',
        });

        // Stop all tracks so mic indicator goes away
        mediaRecorder?.stream?.getTracks().forEach((t) => t.stop());

        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');

        const res = await fetch('/api/stt', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? 'STT failed');
        }

        const { transcript } = await res.json();
        resolve(transcript ?? '');
      } catch (err) {
        reject(err);
      }
    };

    mediaRecorder.stop();
  });
}

// ── TTS ──────────────────────────────────────────────────────────────────────

export async function speak(text: string, onEnd?: () => void): Promise<void> {
  // Cancel any ongoing speech
  cancelSpeaking();

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) throw new Error('TTS failed');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    currentAudio = new Audio(url);
    currentAudio.onended = () => {
      URL.revokeObjectURL(url);
      currentAudio = null;
      onEnd?.();
    };
    currentAudio.onerror = () => {
      URL.revokeObjectURL(url);
      currentAudio = null;
      onEnd?.();
    };

    await currentAudio.play();
  } catch (err) {
    console.error('TTS error:', err);
    onEnd?.(); // Don't block the conversation on TTS failure
  }
}

export function cancelSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

export function isSpeaking(): boolean {
  return currentAudio !== null && !currentAudio.paused;
}
