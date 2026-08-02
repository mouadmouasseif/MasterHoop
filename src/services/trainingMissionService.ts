import type { PoseMetrics } from "@/src/lib/poseDetection";

export type TrainingMissionId = "shooting-fundamentals" | "crossover-mastery" | "step-back-mastery" | "match-intelligence";
export type TrainingMissionLevel = "beginner" | "intermediate" | "advanced";

export type TrainingObjective = {
  id: string;
  label: string;
  target: number;
  unit: string;
};

export type TrainingMissionPlan = {
  id: TrainingMissionId;
  name: string;
  levels: Record<TrainingMissionLevel, {
    title: string;
    description: string;
    objectives: TrainingObjective[];
    aiFocus: string[];
  }>;
};

export type ObjectiveProgress = TrainingObjective & {
  current: number;
  percent: number;
};

export type TrainingMissionProgress = {
  trainingName: string;
  level: TrainingMissionLevel;
  completionRate: number;
  objectives: ObjectiveProgress[];
  voiceCue: string;
  badges: string[];
};

export type TrainingMissionReport = {
  trainingName: string;
  level: TrainingMissionLevel;
  completionRate: number;
  shotsAttempted: number;
  shotsMade: number;
  shootingPercentage: number | null;
  crossoversCompleted: number;
  stepBackCompleted: number;
  aiScore: number | null;
  confidenceScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  badges: string[];
  progress: ObjectiveProgress[];
};

export const TRAINING_MISSIONS: TrainingMissionPlan[] = [
  {
    id: "shooting-fundamentals",
    name: "Shooting Fundamentals",
    levels: {
      beginner: {
        title: "Niveau Debutant",
        description: "20 tirs proches, 20 tirs mi-distance, 10 tirs avec pause au release.",
        objectives: [
          { id: "closeShots", label: "Tirs proches", target: 20, unit: "tirs" },
          { id: "midRangeShots", label: "Mi-distance", target: 20, unit: "tirs" },
          { id: "releasePause", label: "Release Pause", target: 10, unit: "reps" },
        ],
        aiFocus: ["ballon", "panier", "mouvement du tir", "release"],
      },
      intermediate: {
        title: "Niveau Intermediaire",
        description: "50 tirs reussis repartis entre tirs a 2 points et 3 points.",
        objectives: [
          { id: "madeShots", label: "Tirs reussis", target: 50, unit: "made" },
          { id: "twoPointMakes", label: "Reussite 2 pts", target: 30, unit: "made" },
          { id: "threePointMakes", label: "Reussite 3 pts", target: 20, unit: "made" },
        ],
        aiFocus: ["ligne 3 points", "pourcentage global", "shot chart"],
      },
      advanced: {
        title: "Niveau Avance",
        description: "100 tirs reussis avec analyse angle, hauteur de relachement, preparation et vitesse.",
        objectives: [
          { id: "madeShots", label: "Tirs reussis", target: 100, unit: "made" },
          { id: "releaseAngle", label: "Angle stable", target: 85, unit: "score" },
          { id: "executionSpeed", label: "Vitesse execution", target: 85, unit: "score" },
        ],
        aiFocus: ["angle du tir", "hauteur release", "temps de preparation", "vitesse execution"],
      },
    },
  },
  {
    id: "crossover-mastery",
    name: "Crossover Mastery",
    levels: {
      beginner: {
        title: "Phase 1",
        description: "5 series de 30 secondes: crossover bas, controle du ballon, changement de rythme.",
        objectives: [
          { id: "series30", label: "Series 30 sec", target: 5, unit: "series" },
          { id: "crossovers", label: "Crossovers", target: 60, unit: "reps" },
          { id: "controlQuality", label: "Qualite technique", target: 80, unit: "score" },
        ],
        aiFocus: ["crossover", "controle ballon", "rythme"],
      },
      intermediate: {
        title: "Phase 2",
        description: "10 series: Crossover, acceleration, finition au panier.",
        objectives: [
          { id: "comboSeries", label: "Series combo", target: 10, unit: "series" },
          { id: "accelerations", label: "Accelerations", target: 10, unit: "reps" },
          { id: "finishes", label: "Finitions reussies", target: 10, unit: "made" },
        ],
        aiFocus: ["crossover effectue", "acceleration", "finition reussie"],
      },
      advanced: {
        title: "Phase 3",
        description: "20 series: Crossover, drive, tir ou layup.",
        objectives: [
          { id: "driveSeries", label: "Series drive", target: 20, unit: "series" },
          { id: "driveQuality", label: "Qualite du drive", target: 85, unit: "score" },
          { id: "finishRate", label: "Reussite finale", target: 70, unit: "%" },
        ],
        aiFocus: ["qualite du drive", "reussite finale", "temps execution"],
      },
    },
  },
  {
    id: "step-back-mastery",
    name: "Step-Back Mastery",
    levels: {
      beginner: {
        title: "Phase 1",
        description: "10 repetitions: dribble d'attaque, step-back, pause equilibre, tir.",
        objectives: [
          { id: "stepBacks", label: "Step-backs", target: 10, unit: "reps" },
          { id: "balancePause", label: "Pause equilibre", target: 10, unit: "reps" },
          { id: "shotQuality", label: "Qualite du tir", target: 80, unit: "score" },
        ],
        aiFocus: ["equilibre du corps", "separation creee", "qualite du tir"],
      },
      intermediate: {
        title: "Phase 2",
        description: "50 tirs mi-distance apres step-back.",
        objectives: [
          { id: "midRangeShots", label: "Tirs mi-distance", target: 50, unit: "tirs" },
          { id: "stepBackDistance", label: "Distance step-back", target: 80, unit: "score" },
          { id: "stability", label: "Stabilite", target: 85, unit: "score" },
        ],
        aiFocus: ["distance du step-back", "stabilite", "pourcentage de reussite"],
      },
      advanced: {
        title: "Phase 3",
        description: "100 tirs: gauche, droite, apres crossover.",
        objectives: [
          { id: "stepBackShots", label: "Tirs step-back", target: 100, unit: "tirs" },
          { id: "leftRightMix", label: "Gauche / droite", target: 50, unit: "mix" },
          { id: "crossoverStepBack", label: "Apres crossover", target: 30, unit: "reps" },
        ],
        aiFocus: ["step-back gauche", "step-back droite", "step-back apres crossover"],
      },
    },
  },
  {
    id: "match-intelligence",
    name: "Match Intelligence",
    levels: {
      beginner: {
        title: "Phase 1",
        description: "Lire 10 possessions: spacing, choix de tir, passe simple et transition defensive.",
        objectives: [
          { id: "possessionsRead", label: "Possessions lues", target: 10, unit: "reads" },
          { id: "goodDecisions", label: "Bonnes decisions", target: 7, unit: "actions" },
          { id: "defensiveRecoveries", label: "Retours defensifs", target: 5, unit: "reps" },
        ],
        aiFocus: ["possession", "decision", "spacing", "transition defense"],
      },
      intermediate: {
        title: "Phase 2",
        description: "Analyser 20 possessions avec passes, aides defensives, rebonds et turnovers.",
        objectives: [
          { id: "possessionsRead", label: "Possessions lues", target: 20, unit: "reads" },
          { id: "assistReads", label: "Lectures de passe", target: 8, unit: "reads" },
          { id: "turnoverControl", label: "Controle turnovers", target: 80, unit: "score" },
        ],
        aiFocus: ["assist reads", "rebonds", "turnovers", "aide defensive"],
      },
      advanced: {
        title: "Phase 3",
        description: "Session elite: rotations, fast breaks, shot quality et rapport tactique complet.",
        objectives: [
          { id: "possessionsRead", label: "Possessions lues", target: 40, unit: "reads" },
          { id: "rotationQuality", label: "Qualite rotations", target: 85, unit: "score" },
          { id: "shotQuality", label: "Shot quality", target: 85, unit: "score" },
        ],
        aiFocus: ["rotations defensives", "fast breaks", "shot quality", "rapport tactique"],
      },
    },
  },
];

export function getMission(id: TrainingMissionId) {
  return TRAINING_MISSIONS.find((mission) => mission.id === id) || TRAINING_MISSIONS[0];
}

export function buildTrainingMissionProgress(
  missionId: TrainingMissionId,
  level: TrainingMissionLevel,
  metrics: Partial<PoseMetrics> | null | undefined,
  elapsedSeconds: number,
): TrainingMissionProgress {
  const mission = getMission(missionId);
  const plan = mission.levels[level];
  const values = deriveValues(metrics, elapsedSeconds);
  const objectives = plan.objectives.map((objective) => {
    const current = Math.min(objective.target, Math.round(values[objective.id] || 0));
    return {
      ...objective,
      current,
      percent: Math.min(100, Math.round((current / objective.target) * 100)),
    };
  });
  const completionRate = Math.round(objectives.reduce((sum, item) => sum + item.percent, 0) / objectives.length);

  return {
    trainingName: mission.name,
    level,
    completionRate,
    objectives,
    voiceCue: chooseVoiceCue(missionId, metrics, completionRate),
    badges: unlockBadges(missionId, values, completionRate),
  };
}

export function buildTrainingMissionReport(
  missionId: TrainingMissionId,
  level: TrainingMissionLevel,
  metrics: Partial<PoseMetrics> | null | undefined,
  elapsedSeconds: number,
): TrainingMissionReport {
  const progress = buildTrainingMissionProgress(missionId, level, metrics, elapsedSeconds);
  const made = Number(metrics?.madeShots || 0);
  const missed = Number(metrics?.missedShots || 0);
  const attempted = made + missed;
  const shootingPercentage = attempted ? Math.round((made / attempted) * 100) : null;
  const values = deriveValues(metrics, elapsedSeconds);
  const observedSignals = [metrics?.elbowAngle, metrics?.kneeAngle, metrics?.dribbleRhythm, metrics?.dribblePower]
    .filter((value) => typeof value === "number" && Number.isFinite(value) && value > 0).length;
  const confidenceScore = Math.min(100, attempted * 5 + observedSignals * 18);
  const aiScore = confidenceScore >= 60 && shootingPercentage !== null
    ? Math.min(99, Math.round((progress.completionRate * 0.6) + (shootingPercentage * 0.4)))
    : null;

  return {
    trainingName: progress.trainingName,
    level,
    completionRate: progress.completionRate,
    shotsAttempted: attempted,
    shotsMade: made,
    shootingPercentage,
    crossoversCompleted: Math.round(values.crossovers),
    stepBackCompleted: Math.round(values.stepBacks),
    aiScore,
    confidenceScore,
    strengths: buildStrengths(metrics, progress.completionRate),
    weaknesses: buildWeaknesses(metrics, progress.completionRate),
    recommendations: buildRecommendations(missionId, progress.completionRate),
    badges: progress.badges,
    progress: progress.objectives,
  };
}

function deriveValues(metrics: Partial<PoseMetrics> | null | undefined, elapsedSeconds: number) {
  const made = Number(metrics?.madeShots || 0);
  const missed = Number(metrics?.missedShots || 0);
  const attempts = made + missed;
  const threes = metrics?.shots?.filter((shot) => shot.shotType === "Three Pointer").length || 0;
  const madeThrees = metrics?.shots?.filter((shot) => shot.shotType === "Three Pointer" && shot.outcome === "made").length || 0;
  const madeTwos = metrics?.shots?.filter((shot) => shot.shotType === "Two Pointer" && shot.outcome === "made").length || 0;
  const crossovers = Math.max(Number(metrics?.dribbleCount || 0), metrics?.isCrossover ? 1 : 0);
  const stepBacks = Number(metrics?.isFadeaway ? 1 : 0);
  const shootingScore = metrics?.elbowAngle && metrics?.kneeAngle
    ? Math.min(99, Math.round((metrics.elbowAngle + Math.max(0, 180 - metrics.kneeAngle)) / 2))
    : 0;
  const speedScore = metrics?.dribbleRhythm ? Math.min(99, Math.round(metrics.dribbleRhythm / 2)) : 0;
  const controlQuality = metrics?.dribblePower
    ? Math.min(99, Math.round(metrics.dribblePower * 0.75 + Math.min(crossovers, 40) * 0.25))
    : 0;
  const finishRate = attempts ? Math.round((made / attempts) * 100) : 0;
  const possessionsRead = Math.max(attempts, Math.floor(elapsedSeconds / 18));
  const goodDecisions = Math.min(possessionsRead, made + Math.floor(crossovers / 6));
  const defensiveRecoveries = Math.floor(elapsedSeconds / 45);
  const assistReads = Math.floor(Math.max(0, Number(metrics?.dribbleCount || 0)) / 8);
  const turnoverControl = attempts ? Math.max(0, 100 - missed * 8) : Math.min(80, Math.floor(elapsedSeconds / 6));
  const rotationQuality = Math.min(99, Math.round((turnoverControl + Math.min(defensiveRecoveries * 12, 90)) / 2));

  return {
    closeShots: metrics?.shots?.filter((shot) => shot.shotType === "Close Range").length || 0,
    midRangeShots: metrics?.shots?.filter((shot) => shot.shotType === "Mid Range").length || 0,
    releasePause: 0,
    madeShots: made,
    twoPointMakes: madeTwos,
    threePointMakes: madeThrees,
    releaseAngle: shootingScore,
    executionSpeed: speedScore,
    series30: Math.floor(elapsedSeconds / 30),
    crossovers,
    controlQuality,
    comboSeries: 0,
    accelerations: 0,
    finishes: made,
    driveSeries: 0,
    driveQuality: 0,
    finishRate,
    stepBacks,
    balancePause: 0,
    shotQuality: shootingScore,
    stepBackDistance: 0,
    stability: metrics?.kneeAngle ? Math.min(99, 100 - Math.abs(72 - metrics.kneeAngle)) : 0,
    stepBackShots: metrics?.shots?.filter((shot) => shot.shotType === "Step Back").length || 0,
    leftRightMix: 0,
    crossoverStepBack: Math.min(crossovers, stepBacks),
    possessionsRead,
    goodDecisions,
    defensiveRecoveries,
    assistReads,
    turnoverControl,
    rotationQuality,
  };
}

function chooseVoiceCue(missionId: TrainingMissionId, metrics: Partial<PoseMetrics> | null | undefined, completionRate: number) {
  if (metrics?.madeShots && metrics.madeShots > 0) return "Excellent tir";
  if (metrics?.isCrossover) return "Acceleration efficace";
  if (missionId === "step-back-mastery" && (metrics?.isFadeaway || metrics?.isShooting)) return "Tres bon step-back";
  if (missionId === "match-intelligence" && completionRate > 50) return "Bonne lecture de jeu";
  if (metrics?.kneeAngle && metrics.kneeAngle < 55) return "Pense a garder ton equilibre";
  if (Number(metrics?.dribbleRhythm || 0) > 155) return "Relachement trop rapide";
  if (completionRate > 80) return "BasketMotion Elite en approche";
  return "Continue, garde le rythme";
}

function unlockBadges(missionId: TrainingMissionId, values: Record<string, number>, completionRate: number) {
  const badges: string[] = [];
  if (values.madeShots >= 20 || values.threePointMakes >= 10) badges.push("🎯 Sharpshooter");
  if (values.midRangeShots >= 30) badges.push("🔥 Mid-Range Killer");
  if (values.crossovers >= 40) badges.push("⚡ Crossover King");
  if (missionId === "step-back-mastery" && values.stepBacks >= 20) badges.push("👑 Step-Back Master");
  if (completionRate >= 95) badges.push("🏀 BasketMotion Elite");
  return badges;
}

function buildStrengths(metrics: Partial<PoseMetrics> | null | undefined, completionRate: number) {
  return [
    ...(completionRate >= 70 ? ["Progression solide sur les objectifs observés"] : []),
    ...(metrics?.elbowAngle && metrics.elbowAngle >= 70 ? ["Angle du coude exploitable sur les images observées"] : []),
    ...(metrics?.dribblePower && metrics.dribblePower >= 60 ? ["Signal de contrôle de balle dynamique"] : []),
  ];
}

function buildWeaknesses(metrics: Partial<PoseMetrics> | null | undefined, completionRate: number) {
  return [
    ...(completionRate < 70 ? ["Objectifs observables encore incomplets"] : []),
    ...(metrics?.kneeAngle && metrics.kneeAngle < 58 ? ["Flexion basse à vérifier sur une nouvelle capture"] : []),
    ...(metrics?.dribbleRhythm && metrics.dribbleRhythm > 155 ? ["Rythme rapide observé, à confirmer"] : []),
  ];
}

function buildRecommendations(missionId: TrainingMissionId, completionRate: number) {
  if (missionId === "shooting-fundamentals") {
    return ["Garde une pause d'une seconde au release.", "Alterner 10 tirs proches puis 10 mi-distance.", "Reprendre la mission avec fatigue controlee."];
  }
  if (missionId === "crossover-mastery") {
    return ["Descendre le centre de gravite.", "Changer de rythme apres chaque crossover.", "Finir chaque serie par une acceleration franche."];
  }
  if (missionId === "match-intelligence") {
    return ["Scanner avant reception.", "Nommer la premiere option de passe.", "Revenir en defense des que le tir part."];
  }
  return completionRate >= 80
    ? ["Ajouter un defenseur passif.", "Varier step-back gauche et droite.", "Travailler le tir apres crossover."]
    : ["Marquer la pause equilibre.", "Reculer plus nettement sur le step-back.", "Stabiliser les appuis avant le tir."];
}
