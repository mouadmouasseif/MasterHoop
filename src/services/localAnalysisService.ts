export type LocalAnalysis = {
  id: string;
  title: string;
  source: 'camera' | 'upload' | 'drill';
  drill?: string;
  videoName?: string;
  videoUrl?: string;
  createdAt: string;
  score: number;
  confidenceScore?: number;
  qualityScore?: number;
  madeShots: number;
  missedShots: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  notes?: string;
};

export type MeasuredLocalAnalysisInput = {
  fileName: string;
  videoUrl: string;
  source: LocalAnalysis["source"];
  drill?: string;
  score: number;
  confidenceScore: number;
  qualityScore?: number;
  madeShots?: number;
  missedShots?: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
};

const STORAGE_KEY = 'masterHoopAnalyses';

export function getLocalAnalyses(): LocalAnalysis[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveLocalAnalysis(analysis: LocalAnalysis) {
  const analyses = [analysis, ...getLocalAnalyses()].slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(analyses));
  return analyses;
}

export function createMeasuredVideoAnalysis(input: MeasuredLocalAnalysisInput): LocalAnalysis {
  return {
    id: `analysis-${Date.now()}-${crypto.randomUUID()}`,
    title: input.drill ? `${input.drill} — Analyse` : "Analyse vidéo importée",
    source: input.source,
    drill: input.drill,
    videoName: input.fileName,
    videoUrl: input.videoUrl,
    createdAt: new Date().toISOString(),
    score: input.score,
    confidenceScore: input.confidenceScore,
    qualityScore: input.qualityScore,
    madeShots: input.madeShots || 0,
    missedShots: input.missedShots || 0,
    strengths: input.strengths,
    weaknesses: input.weaknesses,
    recommendations: input.recommendations,
  };
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
