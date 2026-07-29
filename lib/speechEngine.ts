'use client';

// ─── Speech Engine ─────────────────────────────────────────────────────────────
// STT : Chrome Web Speech API (webkitSpeechRecognition) — zero latency, accurate
// TTS : Unreal Speech API (/api/tts) — natural human voices with browser fallback
// UX  : Gemini-style Barge-in — user voice cuts AI speech & seamlessly captures full turn

let mainRecognition: any = null;       // main STT for user turns
let interruptRecognition: any = null;  // background listener during AI speech
let currentAudio: HTMLAudioElement | null = null;

function getSpeechRecognition(): any {
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
}

// ── STT — Main listening ───────────────────────────────────────────────────────

export function startListening(
  onResult: (transcript: string) => void,
  onError: (err: string) => void,
  prefix: string = ''
): void {
  stopListening();

  const SpeechRecognition = getSpeechRecognition();
  if (!SpeechRecognition) {
    onError('Speech recognition not supported. Please use Chrome.');
    return;
  }

  mainRecognition = new SpeechRecognition();
  mainRecognition.lang = 'en-US';
  mainRecognition.continuous = true;
  mainRecognition.interimResults = true;
  mainRecognition.maxAlternatives = 1;

  let silenceTimer: NodeJS.Timeout | null = null;
  let finalTranscriptAccumulated = prefix ? prefix + ' ' : '';
  let currentFullText = '';

  mainRecognition.onresult = (event: any) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    if (finalTranscript) {
      finalTranscriptAccumulated += finalTranscript + ' ';
    }
    
    currentFullText = (finalTranscriptAccumulated + interimTranscript).trim();

    if (silenceTimer) clearTimeout(silenceTimer);
    
    if (currentFullText) {
      // Reset the silence countdown
      silenceTimer = setTimeout(() => {
        stopListening(); // This nullifies handlers so onend won't fire
        onResult(currentFullText);
      }, 2500); // 2.5 seconds of silence
    }
  };

  mainRecognition.onerror = (event: any) => {
    if (silenceTimer) clearTimeout(silenceTimer);
    if (event.error === 'no-speech') {
      if (prefix) {
        onResult(prefix.trim());
      } else {
        onError('No speech detected. Please try again.');
      }
    } else if (event.error === 'not-allowed') {
      onError('Microphone access denied. Please allow it in Chrome settings.');
    } else if (event.error === 'aborted') {
      // User manually stopped or switched mode
    } else {
      onError(`Speech recognition error: ${event.error}`);
    }
  };

  mainRecognition.onend = () => {
    if (silenceTimer) clearTimeout(silenceTimer);
    if (currentFullText) {
      onResult(currentFullText);
    } else if (prefix) {
      onResult(prefix.trim());
    } else {
      // In case it silently stops without throwing no-speech
      onError('No speech detected. Please try again.');
    }
  };

  try {
    mainRecognition.start();
  } catch (e) {
    console.error('Error starting main recognition:', e);
  }
}

export function stopListening(): void {
  if (mainRecognition) {
    try {
      mainRecognition.onresult = null;
      mainRecognition.onerror = null;
      mainRecognition.onend = null;
      mainRecognition.abort();
    } catch { /* ignore */ }
    mainRecognition = null;
  }
}

// ── Interrupt detection — active while AI is speaking ─────────────────────────

function startInterruptDetection(onInterrupt: (text: string) => void): void {
  stopInterruptDetection();

  const SpeechRecognition = getSpeechRecognition();
  if (!SpeechRecognition) return;

  interruptRecognition = new SpeechRecognition();
  interruptRecognition.lang = 'en-US';
  interruptRecognition.continuous = true;
  interruptRecognition.interimResults = true;

  let interrupted = false;

  interruptRecognition.onresult = (event: any) => {
    if (interrupted) return;

    // Check if there is actual non-empty interim transcript
    const results = event.results;
    const last = results[results.length - 1];
    const text = last?.[0]?.transcript?.trim();

    if (text && text.length > 0) {
      interrupted = true;
      stopInterruptDetection();
      cancelSpeaking();
      onInterrupt(text);
    }
  };

  interruptRecognition.onerror = () => {
    // Silently ignore interrupt detection errors
  };

  interruptRecognition.onend = () => {
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
    try {
      interruptRecognition.onresult = null;
      interruptRecognition.onerror = null;
      interruptRecognition.onend = null;
      interruptRecognition.abort();
    } catch { /* ignore */ }
    interruptRecognition = null;
  }
}

// ── TTS — Unreal Speech via /api/tts with Fallback ────────────────────────────

export async function speak(
  text: string,
  onEnd?: () => void,
  onInterrupt?: (text: string) => void
): Promise<void> {
  cancelSpeaking();

  return new Promise(async (resolve) => {
    let finished = false;

    const finish = (wasInterrupted = false, interruptText = '') => {
      if (finished) return;
      finished = true;

      stopInterruptDetection();
      currentAudio = null;

      if (wasInterrupted) {
        onInterrupt?.(interruptText);
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
        console.warn('[TTS] API failed, using browser fallback');
        await speakFallback(text, onEnd, onInterrupt);
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
        console.warn('[TTS] Audio playback error, using browser fallback');
        speakFallback(text, onEnd, onInterrupt).then(resolve);
      };

      audio.play().then(() => {
        // Enable barge-in detection as soon as audio starts
        if (onInterrupt) {
          startInterruptDetection((interruptText) => {
            if (currentAudio) {
              currentAudio.pause();
              URL.revokeObjectURL(url);
            }
            finish(true, interruptText);
          });
        }
      }).catch((err) => {
        console.warn('[TTS] Audio play rejected (autoplay blocked?), falling back', err);
        URL.revokeObjectURL(url);
        speakFallback(text, onEnd, onInterrupt).then(resolve);
      });
    } catch (err) {
      console.warn('[TTS] Error:', err);
      await speakFallback(text, onEnd, onInterrupt);
      resolve();
    }
  });
}

// ── Fallback TTS (Browser speechSynthesis) ────────────────────────────────────

function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const preferred = ['Samantha', 'Google US English', 'Karen', 'Daniel', 'Google UK English Female'];
  for (const name of preferred) {
    const match = voices.find((v) => v.name === name);
    if (match) return match;
  }
  return voices.find((v) => v.lang.startsWith('en')) ?? voices[0] ?? null;
}

async function speakFallback(
  text: string,
  onEnd?: () => void,
  onInterrupt?: (text: string) => void
): Promise<void> {
  return new Promise((resolve) => {
    cancelSpeaking();
    const utterance = new SpeechSynthesisUtterance(text);

    let finished = false;
    const finish = (wasInterrupted = false, interruptText = '') => {
      if (finished) return;
      finished = true;
      stopInterruptDetection();
      if (wasInterrupted) {
        onInterrupt?.(interruptText);
      } else {
        onEnd?.();
      }
      resolve();
    };

    const doSpeak = () => {
      const voice = getBestVoice();
      if (voice) utterance.voice = voice;
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onend = () => finish(false);
      utterance.onerror = () => finish(false);

      window.speechSynthesis.speak(utterance);

      if (onInterrupt) {
        startInterruptDetection((interruptText) => {
          window.speechSynthesis.cancel();
          finish(true, interruptText);
        });
      }
    };

    const voices = window.speechSynthesis?.getVoices() ?? [];
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
  if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeaking(): boolean {
  return (currentAudio !== null && !currentAudio.paused) || (typeof window !== 'undefined' && window.speechSynthesis?.speaking);
}
