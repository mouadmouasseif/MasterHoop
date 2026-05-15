export type LocalAnalysis = {
  id: string;
  title: string;
  source: 'camera' | 'upload' | 'drill';
  drill?: string;
  videoName?: string;
  videoUrl?: string;
  createdAt: string;
  score: number;
  madeShots: number;
  missedShots: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  notes?: string;
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

export function createVideoAnalysis(
  fileName: string,
  source: LocalAnalysis['source'],
  drill?: string,
  videoUrl?: string,
): LocalAnalysis {
  const seed = Array.from(fileName + (drill || '')).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const score = 68 + (seed % 24);
  const madeShots = 8 + (seed % 12);
  const missedShots = 3 + (seed % 7);

  return {
    id: `analysis-${Date.now()}-${seed}`,
    title: drill ? `${drill} Analysis` : 'Uploaded Training Analysis',
    source,
    drill,
    videoName: fileName,
    videoUrl,
    createdAt: new Date().toISOString(),
    score,
    madeShots,
    missedShots,
    strengths: [
      'Bonne stabilite du haut du corps',
      'Coude proche de l axe de tir',
      'Bon controle du ballon sur les changements de main',
    ],
    weaknesses: [
      'Release parfois trop lent',
      'Genoux pas assez charges avant le tir',
      'Equilibre a renforcer apres le crossover',
    ],
    recommendations: [
      'Travailler 3 series de 20 tirs avec pause au release',
      'Ajouter des squats explosifs avant les drills',
      'Filmer de profil pour verifier alignement epaule-coude-poignet',
    ],
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
