export type AgentState =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'planning'
  | 'executing'
  | 'speaking'
  | 'error';

export interface PlanStep {
  stepIndex: number;
  agent: string;
  description: string;
  input: Record<string, unknown>;
  dependsOn: number[];
}

export interface StepState {
  stepIndex: number;
  agent: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  error?: string;
}

export type AttachmentType = 'image' | 'video' | 'audio' | 'document';

export interface Attachment {
  id: string;
  type: AttachmentType;
  name: string;
  mimeType: string;
  size: number;
  base64Data: string;
  thumbnailUrl?: string; // data:... for preview
  transcription?: string; // For audio files, transcribed text
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  plan?: PlanStep[];
  timestamp: Date;
  latencyMs?: number;
  attachments?: Attachment[];
  reaction?: 'up' | 'down' | null;
  pinned?: boolean;
}

export interface ArtifactSummary {
  type: string;
  url?: string;
  title?: string;
  contentBase64?: string;
}
