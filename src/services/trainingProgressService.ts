import type {
  SessionLike,
  TrainingLevel,
  TrainingObjective,
  TrainingProgressSnapshot,
  TrainingRecommendation,
} from "@/src/types/aiAssistant";

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

export function calculateTrainingProgress(sessions: SessionLike[] = []): TrainingProgressSnapshot {
  const safeSessions = sessions.filter(Boolean);
  const shotsMade = safeSessions.reduce((sum, session) => sum + numberFromMetric(session, "madeShots"), 0);
  const shotsMissed = safeSessions.reduce((sum, session) => sum + numberFromMetric(session, "missedShots"), 0);
  const shotsAttempted = shotsMade + shotsMissed;
  const shootingAccuracy = shotsAttempted ? clamp((shotsMade / shotsAttempted) * 100) : 0;
  const totalDurationSeconds = safeSessions.reduce((sum, session) => sum + Number(session.duration || 0), 0);
  const averageIntensity = safeSessions.length
    ? clamp(safeSessions.reduce((sum, session) => sum + inferIntensity(session), 0) / safeSessions.length)
    : 0;
  const dribbleStability = calculateDribbleStability(safeSessions);
  const zoneStats = calculateZoneAccuracy(safeSessions);

  return {
    sessionsAnalyzed: safeSessions.length,
    shotsAttempted,
    shotsMade,
    shootingAccuracy,
    closeAccuracy: zoneStats.close,
    midRangeAccuracy: zoneStats.midRange,
    threePointAccuracy: zoneStats.threePoint,
    dribbleStability,
    averageIntensity,
    totalDurationSeconds,
    trend: detectProgressTrend(safeSessions),
  };
}

export function detectTrainingLevel(progress: TrainingProgressSnapshot): TrainingLevel {
  const score =
    progress.shootingAccuracy * 0.38 +
    progress.dribbleStability * 0.24 +
    progress.averageIntensity * 0.16 +
    Math.min(progress.sessionsAnalyzed * 5, 100) * 0.12 +
    (progress.trend === "improving" ? 10 : progress.trend === "declining" ? -8 : 0);

  if (score >= 82 && progress.sessionsAnalyzed >= 8) return "competitive";
  if (score >= 70 && progress.sessionsAnalyzed >= 5) return "advanced";
  if (score >= 52 || progress.sessionsAnalyzed >= 3) return "intermediate";
  return "beginner";
}

export function generateTrainingObjectives(progress: TrainingProgressSnapshot): TrainingObjective[] {
  const goals: TrainingObjective[] = [];

  if (progress.shootingAccuracy < 70) {
    goals.push({
      id: "shooting-accuracy-70",
      title: "Stabiliser le tir",
      description: "Atteindre 70% de reussite sur les tirs suivis avant d'augmenter la distance.",
      targetMetric: "shootingAccuracy",
      targetValue: 70,
      currentValue: progress.shootingAccuracy,
      priority: "high",
    });
  }

  if ((progress.threePointAccuracy ?? 100) < 45) {
    goals.push({
      id: "three-point-base",
      title: "Routine 3 points equilibree",
      description: "Construire une base 3 points avec volume modere et mecanique stable.",
      targetMetric: "threePointAccuracy",
      targetValue: 45,
      currentValue: progress.threePointAccuracy ?? 0,
      priority: "medium",
    });
  }

  if (progress.dribbleStability < 65) {
    goals.push({
      id: "dribble-control-65",
      title: "Controle dribble",
      description: "Reduire les variations de rythme avec des series courtes de crossover.",
      targetMetric: "dribbleStability",
      targetValue: 65,
      currentValue: progress.dribbleStability,
      priority: "high",
    });
  }

  if (progress.averageIntensity > 82 && progress.trend === "declining") {
    goals.push({
      id: "fatigue-recovery",
      title: "Recuperation intelligente",
      description: "Baisser l'intensite pour retrouver de la precision en fin de seance.",
      targetMetric: "averageIntensity",
      targetValue: 70,
      currentValue: progress.averageIntensity,
      priority: "medium",
    });
  }

  return goals.slice(0, 4);
}

export function suggestNextTraining(progress: TrainingProgressSnapshot): TrainingRecommendation {
  if ((progress.closeAccuracy ?? 0) > 70 && (progress.midRangeAccuracy ?? 0) < 65) {
    return {
      id: "mid-range-progression",
      title: "Progression mi-distance",
      reason: "Les tirs proches sont solides, la prochaine adaptation logique est d'augmenter la distance.",
      drillType: "shooting",
      intensity: "medium",
      estimatedMinutes: 18,
    };
  }

  if ((progress.threePointAccuracy ?? 100) < 40 && progress.shotsAttempted >= 12) {
    return {
      id: "balanced-three-point-routine",
      title: "Routine tir equilibree",
      reason: "La reussite a 3 points est le point le plus fragile detecte dans les donnees.",
      drillType: "shooting",
      intensity: "medium",
      estimatedMinutes: 20,
    };
  }

  if (progress.dribbleStability < 60) {
    return {
      id: "short-crossover-series",
      title: "Crossover en series courtes",
      reason: "Le dribble manque de stabilite; des blocs courts limitent les pertes de controle.",
      drillType: "dribbling",
      intensity: "medium",
      estimatedMinutes: 12,
    };
  }

  if (progress.averageIntensity > 82 || progress.trend === "declining") {
    return {
      id: "light-recovery-shooting",
      title: "Routine legere de recuperation",
      reason: "Les donnees indiquent une baisse ou une charge elevee; la priorite est la qualite.",
      drillType: "recovery",
      intensity: "light",
      estimatedMinutes: 10,
    };
  }

  return {
    id: "mixed-skill-builder",
    title: "Bloc mixte tir + dribble",
    reason: "Les indicateurs sont stables; un bloc mixte entretient la progression globale.",
    drillType: "mixed",
    intensity: "medium",
    estimatedMinutes: 16,
  };
}

export function buildTrainingRecommendations(progress: TrainingProgressSnapshot): TrainingRecommendation[] {
  const primary = suggestNextTraining(progress);
  const recommendations = [primary];

  if (primary.id !== "short-crossover-series" && progress.dribbleStability < 72) {
    recommendations.push({
      id: "dribble-rhythm-reset",
      title: "Reset rythme dribble",
      reason: "Ameliorer le controle main faible et les changements de rythme.",
      drillType: "dribbling",
      intensity: "light",
      estimatedMinutes: 8,
    });
  }

  if (primary.id !== "balanced-three-point-routine" && (progress.threePointAccuracy ?? 70) < 50) {
    recommendations.push({
      id: "corner-three-form",
      title: "Form shooting corner 3",
      reason: "Renforcer la mecanique 3 points sans augmenter trop vite le volume.",
      drillType: "shooting",
      intensity: "medium",
      estimatedMinutes: 14,
    });
  }

  return recommendations.slice(0, 3);
}

function numberFromMetric(session: SessionLike, key: string) {
  const value = session.metrics?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function inferIntensity(session: SessionLike) {
  const duration = Math.max(1, Number(session.duration || 0));
  const attempts = numberFromMetric(session, "madeShots") + numberFromMetric(session, "missedShots");
  const dribbles = numberFromMetric(session, "dribbleCount");
  return clamp((attempts / Math.max(duration / 60, 1)) * 10 + dribbles * 0.6);
}

function calculateDribbleStability(sessions: SessionLike[]) {
  const rhythmValues = sessions.map((session) => numberFromMetric(session, "dribbleRhythm")).filter((value) => value > 0);
  if (!rhythmValues.length) return 50;
  const average = rhythmValues.reduce((sum, value) => sum + value, 0) / rhythmValues.length;
  const variance = rhythmValues.reduce((sum, value) => sum + Math.abs(value - average), 0) / rhythmValues.length;
  return clamp(100 - variance * 0.6);
}

function calculateZoneAccuracy(sessions: SessionLike[]) {
  const zones = { close: { made: 0, total: 0 }, midRange: { made: 0, total: 0 }, threePoint: { made: 0, total: 0 } };
  sessions.forEach((session) => {
    const shots = Array.isArray(session.metrics?.shots) ? session.metrics.shots : [];
    shots.forEach((shot) => {
      if (!shot || typeof shot !== "object") return;
      const data = shot as { y?: number; shotType?: string; outcome?: string };
      const zone = data.shotType?.toLowerCase().includes("three") || Number(data.y || 0) > 66
        ? "threePoint"
        : Number(data.y || 0) < 34
        ? "close"
        : "midRange";
      zones[zone].total += 1;
      if (data.outcome === "made") zones[zone].made += 1;
    });
  });

  return {
    close: toAccuracyOrNull(zones.close),
    midRange: toAccuracyOrNull(zones.midRange),
    threePoint: toAccuracyOrNull(zones.threePoint),
  };
}

function toAccuracyOrNull(input: { made: number; total: number }) {
  return input.total ? clamp((input.made / input.total) * 100) : null;
}

function detectProgressTrend(sessions: SessionLike[]): TrainingProgressSnapshot["trend"] {
  if (sessions.length < 4) return "stable";
  const chronological = [...sessions].reverse();
  const midpoint = Math.floor(chronological.length / 2);
  const first = calculateSimpleAccuracy(chronological.slice(0, midpoint));
  const second = calculateSimpleAccuracy(chronological.slice(midpoint));
  if (second - first >= 6) return "improving";
  if (first - second >= 6) return "declining";
  return "stable";
}

function calculateSimpleAccuracy(sessions: SessionLike[]) {
  const made = sessions.reduce((sum, session) => sum + numberFromMetric(session, "madeShots"), 0);
  const missed = sessions.reduce((sum, session) => sum + numberFromMetric(session, "missedShots"), 0);
  return made + missed ? (made / (made + missed)) * 100 : 0;
}
