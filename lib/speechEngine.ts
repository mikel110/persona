'use client';

// ─── Speech Engine ─────────────────────────────────────────────────────────────
// STT : Chrome Web Speech API (webkitSpeechRecognition) — zero latency, accurate
// TTS : Unreal Speech API (/api/tts) — natural human voices
// UX  : Barge-in / interrupt — while AI speaks, any user speech cancels it instantly

// ── Internal state ─────────────────────────────────────────────────────────────

let mainRecognition: any = null;       // main STT for user turns
let interruptRecognition: any = null;  // background listener during AI speech
let currentAudio: HTMLAudioElement | null = null;

// ── Helpers ────────────────────────────────────────────────────────────────────

function getSpeechRecognition(): any {
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
}

// ── STT — Main listening ───────────────────────────────────────────────────────

export function startListening(
  onResult: (transcript: string) => void,
  onError: (err: string) => void
): void {
  stopListening(); // clean up any previous session

  const SpeechRecognition = getSpeechRecognition();
  if (!SpeechRecognition) {
    onError('Speech recognition not supported. Please use Chrome.');
    return;
  }

  mainRecognition = new SpeechRecognition();
  mainRecognition.lang = 'en-US';
  mainRecognition.continuous = false;
  mainRecognition.interimResults = false;
  mainRecognition.maxAlternatives = 1;

  mainRecognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    onResult(transcript);
  };

  mainRecognition.onerror = (event: any) => {
    if (event.error === 'no-speech') {
      onError('No speech detected. Please try again.');
    } else if (event.error === 'not-allowed') {
      onError('Microphone access denied. Please allow it in Chrome settings.');
    } else if (event.error === 'aborted') {
      // Silently ignore — user manually stopped
    } else {
      onError(`Speech recognition error: ${event.error}`);
    }
  };

  mainRecognition.start();
}

export function stopListening(): void {
  if (mainRecognition) {
    try { mainRecognition.stop(); } catch { /* ignore */ }
    mainRecognition = null;
  }
}

// ── Interrupt detection — runs while AI is speaking ───────────────────────────
// Any voice input while AI speaks → immediately cancels TTS + calls onInterrupt

function startInterruptDetection(onInterrupt: (transcript?: string) => void): void {
  stopInterruptDetection();

  const SpeechRecognition = getSpeechRecognition();
  if (!SpeechRecognition) return;

  interruptRecognition = new SpeechRecognition();
  interruptRecognition.lang = 'en-US';
  interruptRecognition.continuous = true;
  interruptRecognition.interimResults = true; // catch partial speech for instant response

  let interrupted = false;

  interruptRecognition.onresult = (event: any) => {
    if (interrupted) return;
    interrupted = true;

    // Capture whatever they said (may be partial)
    const results = event.results;
    const last = results[results.length - 1];
    const transcript = last[0].transcript.trim();

    stopInterruptDetection();
    cancelSpeaking();
    onInterrupt(transcript || undefined);
  };

  interruptRecognition.onerror = () => {
    // Silently ignore interrupt detection errors
  };

  interruptRecognition.onend = () => {
    // Restart continuously until we stop it
    if (interruptRecognition && !interrupted) {
      try { interruptRecognition.start(); } catch { /* ignore */ }
    }
  };

  try {
    interruptRecognition.start();
  } catch {
    // Ignore if can't start
  }
}

function stopInterruptDetection(): void {
  if (interruptRecognition) {
    try { interruptRecognition.stop(); } catch { /* ignore */ }
    interruptRecognition = null;
  }
}

// ── TTS — Unreal Speech via /api/tts ──────────────────────────────────────────

export async function speak(
  text: string,
  onEnd?: () => void,
  onInterrupt?: (transcript?: string) => void
): Promise<void> {
  cancelSpeaking();

  return new Promise(async (resolve) => {
    const finish = (interrupted = false) => {
      stopInterruptDetection();
      currentAudio = null;
      if (interrupted) {
        // Don't call onEnd — caller handles interrupt separately
      } else {
        onEnd?.();
      }
      resolve();
    };

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        console.warn('[TTS] API failed, falling back to browser TTS');
        await speakFallback(text, onEnd);
        resolve();
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudio = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        finish(false);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        console.warn('[TTS] Audio playback error, falling back to browser TTS');
        speakFallback(text, onEnd).then(resolve);
      };

      await audio.play();

      // Start barge-in detection as soon as audio starts playing
      if (onInterrupt) {
        startInterruptDetection((transcript) => {
          // Immediately cancel audio
          if (currentAudio) {
            currentAudio.pause();
            URL.revokeObjectURL(url);
          }
          finish(true);
          onInterrupt(transcript);
        });
      }
    } catch (err) {
      console.warn('[TTS] Error:', err);
      await speakFallback(text, onEnd);
      resolve();
    }
  });
}

// ── Fallback TTS (browser speechSynthesis) ────────────────────────────────────

function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const preferred = ['Samantha', 'Google US English', 'Karen', 'Daniel', 'Google UK English Female'];
  for (const name of preferred) {
    const match = voices.find((v) => v.name === name);
    if (match) return match;
  }
  return voices.find((v) => v.lang.startsWith('en')) ?? voices[0] ?? null;
}

async function speakFallback(text: string, onEnd?: () => void): Promise<void> {
  return new Promise((resolve) => {
    cancelSpeaking();
    const utterance = new SpeechSynthesisUtterance(text);

    const doSpeak = () => {
      const voice = getBestVoice();
      if (voice) utterance.voice = voice;
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.onend = () => { onEnd?.(); resolve(); };
      utterance.onerror = () => { onEnd?.(); resolve(); };
      window.speechSynthesis.speak(utterance);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      doSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        doSpeak();
      };
      setTimeout(doSpeak, 500);
    }
  });
}

// ── Utilities ──────────────────────────────────────────────────────────────────

export function cancelSpeaking(): void {
  stopInterruptDetection();

  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (window.speechSynthesis?.speaking) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeaking(): boolean {
  return (currentAudio !== null && !currentAudio.paused) || window.speechSynthesis?.speaking;
}
