export type CoachPlatformState = "loading" | "empty" | "error" | "offline" | "permission_denied" | "success" | "syncing";

export interface AthleteProfile {
  id: string;
  firstName: string;
  lastName: string;
  photoURL?: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  position?: string;
  dominantHand?: "left" | "right" | "both";
  clubId?: string;
  teamIds?: string[];
  coachIds?: string[];
  playerId?: string;
  level?: string;
}

export interface VideoComment {
  id: string;
  analysisId: string;
  authorId: string;
  athleteId: string;
  timestampMs: number;
  text: string;
  createdAt: unknown;
  updatedAt?: unknown;
  parentId?: string;
  resolvedAt?: unknown;
}

export interface VideoDrawing {
  id: string;
  analysisId: string;
  timestampMs: number;
  authorId: string;
  type: "arrow" | "circle" | "line" | "freehand" | "text" | "angle";
  data: {
    videoWidth: number;
    videoHeight: number;
    points?: { x: number; y: number }[];
    text?: string;
    color?: string;
  };
}

export interface CoachDrill {
  id: string;
  title: string;
  description: string;
  category: string;
  level: "beginner" | "intermediate" | "advanced";
  durationMinutes?: number;
  repetitions?: number;
  sets?: number;
  equipment?: string[];
  objectives: string[];
  videoURL?: string;
  createdBy: string;
}

export interface TrainingMission {
  id: string;
  athleteId: string;
  coachId: string;
  title: string;
  description?: string;
  drillIds: string[];
  target?: number;
  dueDate?: string;
  status: "assigned" | "in_progress" | "completed" | "reviewed";
}

export interface TrainingPlan {
  id: string;
  coachId: string;
  title: string;
  weekStart: string;
  athleteIds: string[];
  days: {
    day: string;
    drillIds: string[];
    notes?: string;
  }[];
  status: "draft" | "assigned" | "in_progress" | "completed";
}

export interface AICoachRecommendation {
  id: string;
  athleteId: string;
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
