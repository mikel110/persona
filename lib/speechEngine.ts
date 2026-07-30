'use client';

// ─── Speech Engine ─────────────────────────────────────────────────────────────
// STT : Groq Whisper via MediaRecorder (Captures filler words perfectly)
// TTS : Unreal Speech API (/api/tts)
// UX  : Gemini-style Barge-in — user voice cuts AI speech & seamlessly captures full turn

let mainRecognition: any = null;       // for silence/VAD detection
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: BlobPart[] = [];
let interruptRecognition: any = null;  // background listener during AI speech
let currentAudio: HTMLAudioElement | null = null;

function getSpeechRecognition(): any {
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
}

// ── STT — Main listening (MediaRecorder + Whisper) ───────────────────────────

export async function startListening(
  onResult: (transcript: string) => void,
  onError: (err: string) => void,
  prefix: string = ''
): Promise<void> {
  stopListening();

  const SpeechRecognition = getSpeechRecognition();
  if (!SpeechRecognition) {
    onError('Speech recognition not supported. Please use Chrome.');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };

    let silenceTimer: NodeJS.Timeout | null = null;

    mediaRecorder.onstop = async () => {
      // Clean up tracks
      stream.getTracks().forEach((track) => track.stop());

      if (audioChunks.length === 0) {
        if (prefix) onResult(prefix.trim());
        else onError('No speech detected. Please try again.');
        return;
      }

      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      try {
        const res = await fetch('/api/stt', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Whisper API failed');
        const data = await res.json();
        
        let finalText = data.transcript?.trim() || '';
        if (prefix) finalText = prefix + ' ' + finalText;
        
        if (finalText) {
          onResult(finalText);
        } else {
          onError('No speech detected. Please try again.');
        }
      } catch (err) {
        console.error('STT Error:', err);
        onError('Transcription failed. Please try again.');
      }
    };

    // We use Web Speech API purely as a Voice Activity Detector (VAD) / Silence detector
    mainRecognition = new SpeechRecognition();
    mainRecognition.lang = 'en-US';
    mainRecognition.continuous = true;
    mainRecognition.interimResults = true;

    mainRecognition.onresult = () => {
      // Whenever speech is detected, reset the 2.5s silence timer
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        stopListening(); // This stops the MediaRecorder and triggers onstop
      }, 2500);
    };

    mainRecognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        // If webkit fails to detect speech at all, rely on our prefix or just error
        if (prefix) stopListening(); 
      }
    };

    mediaRecorder.start();
    mainRecognition.start();

  } catch (err) {
    console.error('Mic error:', err);
    onError('Microphone access denied or error starting recording.');
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
  
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try {
      mediaRecorder.stop();
    } catch { /* ignore */ }
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
        const errorText = await res.text();
        console.warn('[TTS] API failed, using browser fallback', errorText);
        alert(`[TTS] Server Error: The TTS API returned ${res.status}. Falling back to robotic voice.`);
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
        alert(`[TTS] Audio play failed: ${err.message || err}. Falling back to robotic voice.`);
        URL.revokeObjectURL(url);
        speakFallback(text, onEnd, onInterrupt).then(resolve);
      });
    } catch (err: any) {
      console.warn('[TTS] Error:', err);
      alert(`[TTS] Fetch Error: ${err.message || err}. Falling back to robotic voice.`);
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
