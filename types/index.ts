// ─── Shared Types ────────────────────────────────────────────────────────────

export type MicState = 'idle' | 'listening' | 'thinking' | 'speaking';

export type ModeId = 'teach-it' | 'socratic';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ScoreMetric {
  name: string;
  score: number; // 0–10
  feedback: string;
}

export interface ScoreCard {
  overallScore: number; // 0–10
  metrics: ScoreMetric[];
  summary: string;
  strengths: string[];
  improvements: string[];
}

export interface ModeConfig {
  id: ModeId;
  label: string;
  description: string;
  requiresUpload: boolean;
  buildSystemPrompt: (material: string, concepts: string[]) => string;
  scoringPrompt: string;
}

export interface AppState {
  mode: ModeId;
  micState: MicState;
  material: string;         // raw extracted text
  concepts: string[];       // 5–8 key terms
  coveredConcepts: string[]; // concepts confirmed covered by AI
  messages: Message[];      // full conversation history
  scoreCard: ScoreCard | null;
  sessionActive: boolean;
  isUploading: boolean;
  uploadedFileName: string;
  error: string | null;
}
