export enum AppState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export type Language = 'Mixed' | 'Urdu' | 'English' | 'Siraiki';

export interface TranscriptionResult {
  text: string;
  language: string; // 'Urdu' | 'English' | 'Mixed' | 'Siraiki'
  timestamp: string;
}

export interface AudioBlobData {
  blob: Blob;
  mimeType: string;
}