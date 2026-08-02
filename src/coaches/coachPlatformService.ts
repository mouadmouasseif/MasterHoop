import { CURRENT_LOCAL_PREFIX } from "@/src/shared/brand";
import { getLocalStorageWithLegacy } from "@/src/shared/legacyMigration";
import type { AICoachRecommendation, CoachDrill, TrainingMission, TrainingPlan, VideoComment, VideoDrawing } from "@/src/coaches/types";

const keys = {
  comments: `${CURRENT_LOCAL_PREFIX}:coach:video-comments`,
  drawings: `${CURRENT_LOCAL_PREFIX}:coach:video-drawings`,
  drills: `${CURRENT_LOCAL_PREFIX}:coach:drills`,
  missions: `${CURRENT_LOCAL_PREFIX}:coach:missions`,
  plans: `${CURRENT_LOCAL_PREFIX}:coach:training-plans`,
};

export function listVideoComments(analysisId: string) {
  return read<VideoComment>(keys.comments).filter((comment) => comment.analysisId === analysisId);
}

export function saveVideoComment(input: Omit<VideoComment, "id" | "createdAt"> & { id?: string }) {
  const comments = read<VideoComment>(keys.comments);
  const now = new Date().toISOString();
  const next: VideoComment = {
    ...input,
    id: input.id || `comment-${crypto.randomUUID()}`,
    createdAt: input.id ? comments.find((comment) => comment.id === input.id)?.createdAt || now : now,
    updatedAt: input.id ? now : undefined,
  };
  write(keys.comments, [next, ...comments.filter((comment) => comment.id !== next.id)]);
  return next;
}

export function resolveVideoComment(id: string) {
  const comments = read<VideoComment>(keys.comments);
  write(keys.comments, comments.map((comment) => comment.id === id ? { ...comment, resolvedAt: new Date().toISOString() } : comment));
}

export function deleteVideoComment(id: string) {
  write(keys.comments, read<VideoComment>(keys.comments).filter((comment) => comment.id !== id && comment.parentId !== id));
}

export function listVideoDrawings(analysisId: string) {
  return read<VideoDrawing>(keys.drawings).filter((drawing) => drawing.analysisId === analysisId);
}

export function saveVideoDrawing(input: Omit<VideoDrawing, "id"> & { id?: string }) {
  const drawings = read<VideoDrawing>(keys.drawings);
  const next: VideoDrawing = { ...input, id: input.id || `drawing-${crypto.randomUUID()}` };
  write(keys.drawings, [next, ...drawings.filter((drawing) => drawing.id !== next.id)]);
  return next;
}

export function normalizeDrawingPoint(point: { x: number; y: number }, videoWidth: number, videoHeight: number) {
  return {
    x: videoWidth > 0 ? point.x / videoWidth : 0,
    y: videoHeight > 0 ? point.y / videoHeight : 0,
  };
}

export function denormalizeDrawingPoint(point: { x: number; y: number }, renderedWidth: number, renderedHeight: number) {
  return {
    x: point.x * renderedWidth,
    y: point.y * renderedHeight,
  };
}

export function listCoachDrills() {
  const stored = read<CoachDrill>(keys.drills);
  return stored.length ? stored : defaultDrills;
}

export function saveCoachDrill(drill: CoachDrill) {
  const drills = read<CoachDrill>(keys.drills);
  write(keys.drills, [drill, ...drills.filter((item) => item.id !== drill.id)]);
  return drill;
}

export function listTrainingMissions(coachId?: string) {
  const missions = read<TrainingMission>(keys.missions);
  return coachId ? missions.filter((mission) => mission.coachId === coachId) : missions;
}

export function saveTrainingMission(mission: TrainingMission) {
  const missions = read<TrainingMission>(keys.missions);
  write(keys.missions, [mission, ...missions.filter((item) => item.id !== mission.id)]);
  return mission;
}

export function listTrainingPlans(coachId?: string) {
  const plans = read<TrainingPlan>(keys.plans);
  return coachId ? plans.filter((plan) => plan.coachId === coachId) : plans;
}

export function saveTrainingPlan(plan: TrainingPlan) {
  const plans = read<TrainingPlan>(keys.plans);
  write(keys.plans, [plan, ...plans.filter((item) => item.id !== plan.id)]);
  return plan;
}

export function generateLocalAICoachRecommendation(input: {
  athleteId: string;
  objective: string;
  releaseTimeSeconds?: number | null;
  confidence?: number;
  availableDrills?: CoachDrill[];
}): AICoachRecommendation | null {
  if (!input.releaseTimeSeconds || !input.confidence || input.confidence < 60) return null;
  const target = input.releaseTimeSeconds > 0.44 ? "0.40-0.44 s" : "Maintain current release range";
  const drills = (input.availableDrills?.length ? input.availableDrills : defaultDrills)
    .filter((drill) => drill.category.toLowerCase().includes("shoot") || drill.objectives.some((objective) => objective.toLowerCase().includes("release")))
    .slice(0, 2)
    .map((drill) => drill.title);

  return {
    id: `ai-coach-${crypto.randomUUID()}`,
    athleteId: input.athleteId,
    objective: input.objective,
    reason: "Recommendation generated from observed release timing and analysis confidence.",
    basedOnMetrics: ["releaseTimeSeconds", "analysisConfidence"],
    currentState: `${input.releaseTimeSeconds.toFixed(2)} s`,
    target,
    drills,
    durationMinutes: 15,
    confidence: Math.min(95, input.confidence),
    limitations: ["Local rule-based recommendation.", "No recommendation is generated when observed data is insufficient."],
  };
}

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(getLocalStorageWithLegacy(key, [`BasketMotion-Ai:${key}`, `masterhoop_${key}`], "[]"));
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

const defaultDrills: CoachDrill[] = [
  {
    id: "quick-release-form-shooting",
    title: "Quick Release Form Shooting",
    description: "Short-range form shooting focused on earlier set point and faster release.",
    category: "shooting",
    level: "intermediate",
    durationMinutes: 15,
    repetitions: 50,
    sets: 5,
    equipment: ["Ball", "Hoop"],
    objectives: ["release speed", "elbow alignment", "repeatable follow-through"],
    createdBy: "basketmotion-system",
  },
  {
    id: "defensive-slide-control",
    title: "Defensive Slide Control",
    description: "Lateral movement block with posture and balance checks.",
    category: "defense",
    level: "beginner",
    durationMinutes: 10,
    sets: 5,
    objectives: ["stance", "balance", "footwork speed"],
    createdBy: "basketmotion-system",
  },
];
