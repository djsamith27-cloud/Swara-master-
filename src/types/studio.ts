export type LanguageMode = 'si' | 'en';

export type WorkspaceTab = 'studio' | 'diagnostics' | 'lyrics' | 'presets';

export interface MasteringParams {
  highPassHz: number;
  lowGainDb: number;
  mudFreqHz: number;
  mudCutDb: number;
  presenceFreqHz: number;
  presenceGainDb: number;
  deEssDb: number;
  airGainDb: number;
  compThresholdDb: number;
  compRatio: number;
  stereoWidth: number;
  makeupGainDb: number;
}

export interface MasteringPreset {
  id: string;
  nameSi: string;
  nameEn: string;
  descriptionSi: string;
  descriptionEn: string;
  params: MasteringParams;
}

export interface SongSection {
  label: string;
  startSec: number;
  endSec: number;
}

export interface AudioIssue {
  timestampSec: number;
  timestampLabel: string;
  category: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  fixAction: string;
  patch?: Partial<MasteringParams>;
}

export interface LyricIssue {
  timestampSec: number;
  timestampLabel: string;
  originalLine: string;
  issue: string;
  improvedLine: string;
}

export interface TrackAnalysis {
  title: string;
  genre: string;
  bpmEstimate?: number;
  keyEstimate?: string;
  summary: string;
  sections: SongSection[];
  audioIssues: AudioIssue[];
  lyricIssues: LyricIssue[];
  recommendedEq: MasteringParams;
}

export interface AudioFileStats {
  durationSec: number;
  sampleRate: number;
  channels: number;
  peakDbfs: number;
  rmsDbfs: number;
  crestFactorDb: number;
}

export interface LyricPolishResult {
  summary: string;
  lineFixes: Array<{
    original: string;
    reason: string;
    improved: string;
  }>;
  polishedLyrics: string;
}

export interface OnlineGroundingSource {
  title: string;
  uri: string;
}

export interface OnlineCheckResult {
  reportText: string;
  sources: OnlineGroundingSource[];
  checkedAt: string;
}
