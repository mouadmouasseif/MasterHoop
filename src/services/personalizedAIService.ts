import type { PoseMetrics } from "@/src/lib/poseDetection";
import type { VideoQualityReport } from "@/src/services/videoFrameAnalysisService";
import type { MetricResult } from "@/src/ai/types";
import type { ShotSequenceAnalysis } from "@/src/ai/types";

export type ConfidenceLabel =
  | "very_reliable"
  | "reliable"
  | "caution"
  | "unreliable";

export type AIAnalysisMetrics = {
  shootingForm: number;
  balance: number;
  releaseSpeed: number;
  stability: number;
  jumpTiming: number;
};

export type MetricConfidence = {
  confidence: number;
  label: ConfidenceLabel;
  measured: boolean;
  source: string;
  status: MetricResult["status"];
  limitations?: string[];
};

export type AIAnalysisResult = {
  score: number;
  confidenceScore: number;
  confidenceLabel: ConfidenceLabel;
  engine: "BasketMotion-Ai-local-v1";
  aiFeedback: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  recommendedDrills: { title: string; focus: string; level: string }[];
  metrics: AIAnalysisMetrics;
  metricConfidence: Record<keyof AIAnalysisMetrics, MetricConfidence>;
  metricResults: Record<keyof AIAnalysisMetrics, MetricResult>;
  limitations: string[];
  videoQuality?: VideoQualityReport;
  observedMetrics?: Partial<PoseMetrics> | null;
  shotAnalysis?: ShotSequenceAnalysis;
};

export interface BasketballAnalysisService {
  analyze(metrics?: Partial<PoseMetrics> | null): AIAnalysisResult;
}

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Math.round(value)));

const reliabilityLabel = (confidence: number): ConfidenceLabel => {
  if (confidence >= 90) return "very_reliable";
  if (confidence >= 75) return "reliable";
  if (confidence >= 60) return "caution";
  return "unreliable";
};

const finiteMetric = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;

const confidence = (value: number, measured: boolean, source: string): MetricConfidence => ({
  confidence: clamp(value),
  label: reliabilityLabel(clamp(value)),
  measured,
  source,
  status: measured && value >= 60 ? "estimated" : "unavailable",
  limitations: measured ? ["Score technique dérivé de points 2D ; ce n’est pas une mesure biomécanique 3D."] : ["Signal requis non observé."],
});

class LocalBasketballAnalysisService implements BasketballAnalysisService {
  analyze(metrics?: Partial<PoseMetrics> | null): AIAnalysisResult {
    const elbow = finiteMetric(metrics?.elbowAngle);
    const knee = finiteMetric(metrics?.kneeAngle);
    const rhythm = finiteMetric(metrics?.dribbleRhythm);
    const dribblePower = finiteMetric(metrics?.dribblePower);
    const made = Math.max(0, Number(metrics?.madeShots || 0));
    const missed = Math.max(0, Number(metrics?.missedShots || 0));
    const attempts = made + missed;
    const hasShotSample = attempts >= 3;
    const accuracy = attempts > 0 ? (made / attempts) * 100 : null;

    const analysisMetrics: AIAnalysisMetrics = {
      shootingForm:
        elbow !== null
          ? accuracy !== null
            ? clamp(accuracy * 0.45 + scoreAround(elbow, 88, 45) * 0.55)
            : scoreAround(elbow, 88, 45)
          : 0,
      balance: knee !== null ? scoreAround(knee, 72, 50) : 0,
      releaseSpeed: rhythm !== null ? clamp(45 + Math.min(rhythm, 170) * 0.3) : 0,
      stability: dribblePower !== null ? clamp(50 + Math.min(dribblePower, 100) * 0.45) : 0,
      jumpTiming: knee !== null ? clamp(scoreAround(knee, 68, 45) + (metrics?.isShooting ? 4 : 0)) : 0,
    };

    const metricConfidence: AIAnalysisResult["metricConfidence"] = {
      shootingForm: confidence(
        elbow !== null ? 70 + (hasShotSample ? Math.min(attempts, 10) * 2 : 0) : 0,
        elbow !== null,
        hasShotSample ? "movenet_pose+shot_annotations" : "movenet_pose",
      ),
      balance: confidence(knee !== null ? 78 : 0, knee !== null, "movenet_pose"),
      releaseSpeed: confidence(rhythm !== null ? 68 : 0, rhythm !== null, "local_motion_timing"),
      stability: confidence(dribblePower !== null ? 66 : 0, dribblePower !== null, "local_ball_motion"),
      jumpTiming: confidence(knee !== null && metrics?.isShooting ? 76 : knee !== null ? 62 : 0, knee !== null, "movenet_pose"),
    };
    const metricResults = Object.fromEntries(
      (Object.keys(analysisMetrics) as (keyof AIAnalysisMetrics)[]).map((key) => {
        const metadata = metricConfidence[key];
        const reliable = metadata.measured && metadata.confidence >= 60;
        return [key, {
          value: reliable ? analysisMetrics[key] : null,
          unit: "score/100",
          confidence: metadata.confidence / 100,
          source: metadata.source,
          status: reliable ? metadata.status : "unavailable",
          limitations: metadata.limitations,
        } satisfies MetricResult];
      }),
    ) as Record<keyof AIAnalysisMetrics, MetricResult>;

    const measuredEntries = (Object.keys(analysisMetrics) as (keyof AIAnalysisMetrics)[])
      .filter((key) => metricConfidence[key].measured);
    const score = measuredEntries.length
      ? clamp(measuredEntries.reduce((sum, key) => sum + analysisMetrics[key], 0) / measuredEntries.length)
      : 0;
    const confidenceScore = measuredEntries.length
      ? clamp(
          measuredEntries.reduce((sum, key) => sum + metricConfidence[key].confidence, 0) /
            measuredEntries.length,
        )
      : 0;

    const reliable = confidenceScore >= 60;
    const strengths = reliable ? buildStrengths(analysisMetrics, metricConfidence) : [];
    const weaknesses = reliable ? buildWeaknesses(analysisMetrics, metricConfidence) : [];
    const suggestions = reliable
      ? buildSuggestions(weaknesses)
      : ["Reprendre une vidéo avec le corps entier et le ballon visibles avant de générer des conseils."];

    return {
      score,
      confidenceScore,
      confidenceLabel: reliabilityLabel(confidenceScore),
      engine: "BasketMotion-Ai-local-v1",
      aiFeedback: feedbackFor(score, confidenceScore),
      strengths,
      weaknesses,
      suggestions,
      recommendedDrills: reliable ? buildDrills(weaknesses) : [],
      metrics: analysisMetrics,
      metricConfidence,
      metricResults,
      limitations: buildLimitations({ elbow, knee, rhythm, dribblePower, attempts }),
    };
  }
}

function scoreAround(value: number, target: number, tolerance: number) {
  return clamp(100 - (Math.abs(target - value) / tolerance) * 55);
}

function isUsable(
  key: keyof AIAnalysisMetrics,
  metricConfidence: AIAnalysisResult["metricConfidence"],
) {
  return metricConfidence[key].confidence >= 60;
}

function buildStrengths(
  metrics: AIAnalysisMetrics,
  metricConfidence: AIAnalysisResult["metricConfidence"],
) {
  const strengths: string[] = [];
  if (isUsable("shootingForm", metricConfidence) && metrics.shootingForm >= 80) {
    strengths.push("Alignement du bras de tir régulier");
  }
  if (isUsable("balance", metricConfidence) && metrics.balance >= 80) {
    strengths.push("Bonne utilisation de la flexion des jambes");
  }
  if (isUsable("stability", metricConfidence) && metrics.stability >= 78) {
    strengths.push("Contrôle stable pendant le maniement du ballon");
  }
  return strengths;
}

function buildWeaknesses(
  metrics: AIAnalysisMetrics,
  metricConfidence: AIAnalysisResult["metricConfidence"],
) {
  const weaknesses: string[] = [];
  if (isUsable("shootingForm", metricConfidence) && metrics.shootingForm < 75) {
    weaknesses.push("Alignement du coude à stabiliser");
  }
  if (isUsable("balance", metricConfidence) && metrics.balance < 75) {
    weaknesses.push("Flexion et équilibre à améliorer");
  }
  if (isUsable("releaseSpeed", metricConfidence) && metrics.releaseSpeed < 70) {
    weaknesses.push("Rythme de déclenchement irrégulier");
  }
  if (isUsable("stability", metricConfidence) && metrics.stability < 70) {
    weaknesses.push("Contrôle du dribble à renforcer");
  }
  return weaknesses;
}

function buildSuggestions(weaknesses: string[]) {
  const suggestions: string[] = [];
  if (weaknesses.some((item) => item.includes("coude"))) {
    suggestions.push("Effectuer 3 séries de 10 tirs de forme en maintenant le suivi du geste.");
  }
  if (weaknesses.some((item) => item.includes("équilibre") || item.includes("Flexion"))) {
    suggestions.push("Ajouter 3 séries d’équilibre sur une jambe avant les tirs.");
  }
  if (weaknesses.some((item) => item.includes("déclenchement"))) {
    suggestions.push("Travailler la réception et le déclenchement à vitesse progressive.");
  }
  if (weaknesses.some((item) => item.includes("dribble"))) {
    suggestions.push("Alterner 30 secondes de dribble bas par main en gardant le buste stable.");
  }
  return suggestions.length
    ? suggestions
    : ["Continuer le même exercice et comparer une nouvelle série dans des conditions identiques."];
}

function buildDrills(weaknesses: string[]) {
  const drills: AIAnalysisResult["recommendedDrills"] = [];
  if (weaknesses.some((item) => item.includes("coude"))) {
    drills.push({ title: "Form Shooting Ladder", focus: "Alignement coude-poignet", level: "Débutant" });
  }
  if (weaknesses.some((item) => item.includes("équilibre") || item.includes("Flexion"))) {
    drills.push({ title: "Balance Into Pull-Up", focus: "Appuis et stabilité", level: "Intermédiaire" });
  }
  if (weaknesses.some((item) => item.includes("déclenchement"))) {
    drills.push({ title: "Quick Release Series", focus: "Rythme du déclenchement", level: "Avancé" });
  }
  return drills;
}

function feedbackFor(score: number, confidenceScore: number) {
  if (confidenceScore < 60) {
    return "Données insuffisantes : aucun diagnostic technique fiable ne peut être généré.";
  }
  if (score >= 85) {
    return "Mécanique régulière sur les mesures disponibles. Confirme ce résultat sur plusieurs séries.";
  }
  if (score >= 70) {
    return "Base solide. Les recommandations ciblent uniquement les mesures suffisamment fiables.";
  }
  return "Des axes de progression ont été détectés, à confirmer avec une nouvelle série filmée dans les mêmes conditions.";
}

function buildLimitations(input: {
  elbow: number | null;
  knee: number | null;
  rhythm: number | null;
  dribblePower: number | null;
  attempts: number;
}) {
  const limitations: string[] = [];
  if (input.elbow === null) limitations.push("Angle du coude non mesuré.");
  if (input.knee === null) limitations.push("Angle du genou non mesuré.");
  if (input.rhythm === null) limitations.push("Rythme du mouvement non mesuré.");
  if (input.dribblePower === null) limitations.push("Puissance du dribble non mesurée.");
  if (input.attempts < 3) limitations.push("Moins de trois tentatives détectées.");
  return limitations;
}

export const personalizedAIService: BasketballAnalysisService =
  new LocalBasketballAnalysisService();
