import { buildUserLearningProfile } from "@/src/services/userLearningProfileService";
import type { AICoachContext, AICoachRecommendationV4, GeneratedTrainingPlan } from "@/src/ai-coach/types";
import type { SessionLike, TrainingProgressSnapshot } from "@/src/types/aiAssistant";

const MIN_SESSIONS = 2;
const MIN_SHOTS = 10;
const MIN_CONFIDENCE = 60;

export function generateAICoachRecommendationV4(context: AICoachContext): AICoachRecommendationV4 {
  const profile = buildUserLearningProfile(context.athleteId, context.sessions);
  const progress = profile.progression;
  const confidence = calculateAICoachConfidence(context.sessions, progress);
  const objective = context.objective || inferObjective(progress);

  if (!hasSufficientData(progress, confidence)) {
    return {
      id: `ai-coach-${context.athleteId}-insufficient`,
      athleteId: context.athleteId,
      status: "insufficient_data",
      objective,
      reason: "BasketMotion AI Coach needs more observed sessions, shot volume, or analysis confidence before recommending training.",
      basedOnMetrics: observedMetricNames(context.sessions),
      drills: [],
      confidence,
      limitations: buildLimitations(context, progress, confidence),
    };
  }

  const primaryWeakness = profile.weaknesses[0] || "General consistency";
  const recommendation = profile.recommendations[0];
  const target = chooseTarget(progress, objective);
  const drills = chooseDrills(progress, context.position, context.equipment);

  return {
    id: `ai-coach-${context.athleteId}-${recommendation?.id || "local-rule"}`,
    athleteId: context.athleteId,
    status: "ready",
    objective,
    reason: recommendation?.reason || `Main observed priority: ${primaryWeakness}.`,
    basedOnMetrics: observedMetricNames(context.sessions),
    currentState: describeCurrentState(progress),
    target,
    drills,
    durationMinutes: recommendation?.estimatedMinutes || 16,
    confidence,
    limitations: buildLimitations(context, progress, confidence),
  };
}

export function generateWeeklyTrainingPlan(context: AICoachContext, weekNumber = 1): GeneratedTrainingPlan {
  const recommendation = generateAICoachRecommendationV4(context);
  const frequency = Math.max(2, Math.min(6, Number(context.weeklyFrequency || 3)));
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const baseDrills = recommendation.drills.length ? recommendation.drills : ["Collect 2 reliable analysis sessions"];

  return {
    objective: recommendation.objective,
    weekNumber,
    sessions: days.slice(0, frequency).map((day, index) => ({
      day,
      drills: rotate(baseDrills, index).slice(0, 3),
      durationMinutes: recommendation.status === "ready" ? Math.max(12, recommendation.durationMinutes || 16) : 10,
      intensity: recommendation.status === "ready" ? (index % 3 === 2 ? "light" : "medium") : "light",
    })),
    basedOnData: recommendation.basedOnMetrics,
    confidence: recommendation.confidence,
    limitations: recommendation.limitations,
  };
}

export function calculateAICoachConfidence(sessions: SessionLike[], progress: TrainingProgressSnapshot) {
  const metricConfidenceValues = sessions
    .map((session) => session.metrics?.metricConfidence ?? session.metrics?.confidenceScore ?? session.score)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const averageMetricConfidence = metricConfidenceValues.length
    ? metricConfidenceValues.reduce((sum, value) => sum + value, 0) / metricConfidenceValues.length
    : 0;
  const volumeScore = Math.min(100, progress.sessionsAnalyzed * 18 + progress.shotsAttempted * 2);
  return Math.round(Math.min(96, averageMetricConfidence * 0.55 + volumeScore * 0.45));
}

function hasSufficientData(progress: TrainingProgressSnapshot, confidence: number) {
  return progress.sessionsAnalyzed >= MIN_SESSIONS && progress.shotsAttempted >= MIN_SHOTS && confidence >= MIN_CONFIDENCE;
}

function inferObjective(progress: TrainingProgressSnapshot) {
  if (progress.shootingAccuracy < 65) return "Improve shooting consistency";
  if ((progress.threePointAccuracy ?? 100) < 45) return "Build a reliable 3-point base";
  if (progress.dribbleStability < 65) return "Improve dribble control";
  if (progress.trend === "declining") return "Recover quality under fatigue";
  return "Maintain balanced performance growth";
}

function chooseTarget(progress: TrainingProgressSnapshot, objective: string) {
  if (objective.toLowerCase().includes("3-point")) return "Reach 45% on validated 3-point attempts";
  if (objective.toLowerCase().includes("dribble")) return "Reach 65 dribble stability";
  if (objective.toLowerCase().includes("fatigue")) return "Keep end-session accuracy within 5% of start-session accuracy";
  return `Reach 70% shooting accuracy from current ${progress.shootingAccuracy}%`;
}

function chooseDrills(progress: TrainingProgressSnapshot, position?: string, equipment: string[] = []) {
  const drills: string[] = [];
  if (progress.shootingAccuracy < 70) drills.push("Quick Release Form Shooting", "50 mid-range makes");
  if ((progress.threePointAccuracy ?? 100) < 45) drills.push("Corner 3 Form Ladder");
  if (progress.dribbleStability < 70) drills.push("Short Crossover Control Series");
  if (progress.trend === "declining") drills.push("Light Recovery Shooting");
  if (position?.toLowerCase().includes("guard")) drills.push("Change-of-Pace Guard Reads");
  if (equipment.includes("cones")) drills.push("Cone Footwork Closeouts");
  return Array.from(new Set(drills.length ? drills : ["Mixed Skill Builder", "Form Shooting Ladder"])).slice(0, 4);
}

function describeCurrentState(progress: TrainingProgressSnapshot) {
  return `${progress.sessionsAnalyzed} session(s), ${progress.shotsAttempted} shot(s), ${progress.shootingAccuracy}% shooting, ${progress.dribbleStability} dribble stability`;
}

function observedMetricNames(sessions: SessionLike[]) {
  const names = new Set<string>();
  sessions.forEach((session) => {
    Object.keys(session.metrics || {}).forEach((key) => names.add(key));
  });
  return [...names].filter((key) => !key.toLowerCase().includes("raw")).slice(0, 10);
}

function buildLimitations(context: AICoachContext, progress: TrainingProgressSnapshot, confidence: number) {
  const limitations: string[] = ["Local rule-based AI Coach. No generic chatbot output."];
  if (progress.sessionsAnalyzed < MIN_SESSIONS) limitations.push(`Needs at least ${MIN_SESSIONS} reliable sessions.`);
  if (progress.shotsAttempted < MIN_SHOTS) limitations.push(`Needs at least ${MIN_SHOTS} observed shot attempts.`);
  if (confidence < MIN_CONFIDENCE) limitations.push(`Needs confidence of ${MIN_CONFIDENCE}% or higher.`);
  if (!context.position) limitations.push("Position-specific guidance is limited until player position is set.");
  if (!context.equipment?.length) limitations.push("Equipment-specific planning is limited until equipment is selected.");
  return limitations;
}

function rotate<T>(items: T[], offset: number) {
  return items.map((_, index) => items[(index + offset) % items.length]);
}
