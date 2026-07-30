import type { PoseMetrics } from "@/src/lib/poseDetection";
import type { PlayerAnalysisReport } from "@/src/types";

export type VisionStack = {
  detector: "BasketMotion-Ai-model" | "coco-ssd-browser" | "unavailable";
  pose: "MoveNet-browser";
  processing: "frame-observations-only";
};

export type PlayerTrack = {
  id: string;
  name: string;
  team?: string;
  positions: { x: number; y: number; t: number }[];
  speed: number | null;
  distance: number | null;
  directionChanges: number | null;
  spaceCreated: number | null;
};

export type AdvancedVideoAnalysis = {
  stack: VisionStack;
  players: PlayerTrack[];
  ball: { detected: boolean; confidence: number; x?: number; y?: number; source: string };
  hoop: { detected: false; confidence: 0; x: null; y: null; limitations: string[] };
  heatmap: [];
  attacker: {
    speed: number | null;
    distance: number | null;
    directionChanges: number | null;
    spaceCreated: number | null;
    successRate: number | null;
  };
  defender: {
    positioning: number | null;
    distanceToAttacker: number | null;
    reactionTime: number | null;
    lateralDefense: number | null;
    shotContests: number | null;
  };
  report: PlayerAnalysisReport;
  limitations: string[];
};

export function buildAdvancedVideoAnalysis(
  metrics?: Partial<PoseMetrics> | null,
  playerName = "Joueur",
): AdvancedVideoAnalysis {
  const made = finiteCount(metrics?.madeShots);
  const missed = finiteCount(metrics?.missedShots);
  const attempts = made + missed;
  const successRate = attempts > 0 ? Math.round((made / attempts) * 100) : null;
  const confidence = finiteConfidence(metrics?.ballConfidence);
  const ballObserved = metrics?.ballDetected === true && Boolean(metrics.ballPos) && confidence > 0;
  const detector = metrics?.ballDetectorSource === "BasketMotion-Ai-model"
    ? "BasketMotion-Ai-model"
    : metrics?.ballDetectorSource === "coco-ssd"
      ? "coco-ssd-browser"
      : "unavailable";

  const limitations = [
    "Aucune calibration métrique : vitesse et distance réelles indisponibles.",
    "Le panier n’est pas détecté par un modèle dédié : résultat du tir indisponible.",
    "Aucun suivi multi-joueur validé : statistiques offensives et défensives indisponibles.",
  ];

  return {
    stack: { detector, pose: "MoveNet-browser", processing: "frame-observations-only" },
    players: [],
    ball: {
      detected: ballObserved,
      confidence,
      x: ballObserved ? metrics?.ballPos?.x : undefined,
      y: ballObserved ? metrics?.ballPos?.y : undefined,
      source: detector,
    },
    hoop: { detected: false, confidence: 0, x: null, y: null, limitations: ["Détecteur de panier non disponible."] },
    heatmap: [],
    attacker: { speed: null, distance: null, directionChanges: null, spaceCreated: null, successRate },
    defender: { positioning: null, distanceToAttacker: null, reactionTime: null, lateralDefense: null, shotContests: null },
    report: {
      player: playerName,
      offense_score: null,
      defense_score: null,
      speed: null,
      distance: null,
      weaknesses: [],
      recommendations: [],
    },
    limitations,
  };
}

function finiteCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function finiteConfidence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value > 1 ? value / 100 : value));
}
