import type { LocalAnalysis } from "@/src/services/localAnalysisService";

export type EliteAnalyticsStatus = "ready" | "partial" | "insufficient_data";

export interface EliteAthleteSummary {
  id: string;
  name: string;
  role: string;
  analyses: LocalAnalysis[];
}

export interface EliteMetric {
  label: string;
  value: number | null;
  unit: string;
  confidence: number;
  status: EliteAnalyticsStatus;
  evidence: string[];
}

export interface MotionSimilarityReport {
  status: EliteAnalyticsStatus;
  score: number | null;
  confidence: number;
  comparisonTarget: "personal_best" | "coach_validated_reference";
  metrics: EliteMetric[];
  limitations: string[];
}

export interface ScoutingReport {
  status: EliteAnalyticsStatus;
  athleteName: string;
  confidence: number;
  dataVolume: {
    analyses: number;
    shots: number;
  };
  strengths: string[];
  weaknesses: string[];
  priorities: string[];
  limitations: string[];
}

export interface FatigueTrendReport {
  status: EliteAnalyticsStatus;
  confidence: number;
  startAccuracy: number | null;
  endAccuracy: number | null;
  delta: number | null;
  label: "stable" | "declining" | "improving" | "unknown";
  limitations: string[];
}

export interface TeamAnalyticsReport {
  status: EliteAnalyticsStatus;
  confidence: number;
  athleteCount: number;
  averageScore: number | null;
  averageAccuracy: number | null;
  leaders: string[];
  attention: string[];
  limitations: string[];
}

export interface EliteAnalyticsReport {
  status: EliteAnalyticsStatus;
  generatedAt: string;
  motionSimilarity: MotionSimilarityReport;
  scouting: ScoutingReport;
  fatigue: FatigueTrendReport;
  team: TeamAnalyticsReport;
  limitations: string[];
}
