import type { SessionLike, TrainingLevel } from "@/src/types/aiAssistant";

export type AICoachRecommendationStatus = "ready" | "insufficient_data";

export interface AICoachContext {
  athleteId: string;
  objective?: string;
  position?: string;
  level?: TrainingLevel | string;
  weeklyFrequency?: number;
  equipment?: string[];
  sessions: SessionLike[];
}

export interface AICoachRecommendationV4 {
  id: string;
  athleteId: string;
  status: AICoachRecommendationStatus;
  objective: string;
  reason: string;
  basedOnMetrics: string[];
  currentState?: string;
  target?: string;
  drills: string[];
  durationMinutes?: number;
  confidence: number;
  limitations: string[];
}

export interface AICoachPlanDay {
  day: string;
  drills: string[];
  durationMinutes: number;
  intensity: "light" | "medium" | "high";
}

export interface GeneratedTrainingPlan {
  objective: string;
  weekNumber: number;
  sessions: AICoachPlanDay[];
  basedOnData: string[];
  confidence: number;
  limitations: string[];
}
