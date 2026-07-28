import type { TrainingSession } from "@/src/services/sessionService";

export type TrainingLevel = "beginner" | "intermediate" | "advanced" | "competitive";

export type TrainingZone = "close" | "midRange" | "threePoint" | "unknown";

export type TrainingObjective = {
  id: string;
  title: string;
  description: string;
  targetMetric: string;
  targetValue: number;
  currentValue: number;
  priority: "low" | "medium" | "high";
};

export type TrainingRecommendation = {
  id: string;
  title: string;
  reason: string;
  drillType: "shooting" | "dribbling" | "conditioning" | "recovery" | "mixed";
  intensity: "light" | "medium" | "high";
  estimatedMinutes: number;
};

export type TrainingProgressSnapshot = {
  sessionsAnalyzed: number;
  shotsAttempted: number;
  shotsMade: number;
  shootingAccuracy: number;
  closeAccuracy: number | null;
  midRangeAccuracy: number | null;
  threePointAccuracy: number | null;
  dribbleStability: number;
  averageIntensity: number;
  totalDurationSeconds: number;
  trend: "improving" | "stable" | "declining";
};

export type UserLearningProfile = {
  userId: string;
  strengths: string[];
  weaknesses: string[];
  progression: TrainingProgressSnapshot;
  recommendations: TrainingRecommendation[];
  proposedGoals: TrainingObjective[];
  estimatedLevel: TrainingLevel;
  adviceHistory: Array<{
    id: string;
    createdAt: string;
    advice: string;
    sourceSessionIds: string[];
  }>;
  updatedAt: string;
};

export type AssistantReport = {
  summary: string;
  level: TrainingLevel;
  recommendations: TrainingRecommendation[];
  goals: TrainingObjective[];
  evidence: {
    sessionIds: string[];
    sessionsAnalyzed: number;
    shotsAttempted: number;
  };
};

export type SessionLike = Omit<Pick<TrainingSession, "id" | "duration" | "drillName" | "score" | "createdAt">, never> & {
  metrics?: Record<string, unknown>;
};
