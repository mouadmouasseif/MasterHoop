import { createMetricResult } from "@/src/ai/confidence/metricResult";
import { averageConfidence, clamp01, keypoint, mean, midpoint } from "@/src/ai/pose/poseMath";
import type {
  BiomechanicalObservation,
  BiomechanicsReport,
  MetricResult,
  ShotFrameObservation,
  ShotTimelineEvent,
} from "@/src/ai/types";

const SOURCE = "movenet_pose_2d";

export class BiomechanicsAnalyzer {
  analyze(frames: ShotFrameObservation[], timeline: ShotTimelineEvent[]): BiomechanicsReport {
    const balanceSamples = frames.flatMap(balanceSample);
    const preparation = timeline.find((event) => event.phase === "preparation");
    const release = timeline.find((event) => event.phase === "release");
    const landing = timeline.find((event) => event.phase === "landing");
    const timingConfidence = preparation && release
      ? Math.min(preparation.confidence, release.confidence)
      : 0;
    const observations: BiomechanicalObservation[] = [];

    const balance = balanceMetric(balanceSamples);
    if (balance.value !== null) {
      observations.push({
        id: "support-balance-2d",
        category: "balance",
        message: balance.value <= 0.25
          ? "Le bassin reste proche du centre des appuis sur les images observées."
          : "Un décalage du bassin par rapport au centre des appuis est observable.",
        confidence: balance.confidence,
        source: SOURCE,
        limitations: ["Observation 2D dépendante de l’angle de caméra ; ce n’est pas un diagnostic médical."],
      });
    }

    const timing = createMetricResult({
      value: preparation && release ? release.timestampMs - preparation.timestampMs : null,
      unit: "ms",
      confidence: timingConfidence,
      source: "shot_phase_timeline",
      status: "measured",
      limitations: ["Temps mesuré entre les premières phases détectées, limité par la fréquence d’échantillonnage."],
    });

    const stability = landing ? landingStability(frames, landing.frameIndex) : unavailable(
      "Atterrissage non observé avec une confiance suffisante.",
      "landing_pose_2d",
    );
    if (stability.value !== null) {
      observations.push({
        id: "landing-sway-2d",
        category: "stability",
        message: stability.value <= 0.12
          ? "Faible déplacement latéral du bassin observé après l’atterrissage."
          : "Déplacement latéral du bassin observable après l’atterrissage.",
        confidence: stability.confidence,
        source: "landing_pose_2d",
        frameIndex: landing?.frameIndex,
        limitations: ["Signal technique 2D ; aucune force d’impact ni risque de blessure n’est mesuré."],
      });
    }

    return {
      efficiency: unavailable("L’efficacité globale exige une définition validée et davantage de signaux observés.", SOURCE),
      balance,
      timing,
      powerTransfer: unavailable("Le transfert de puissance ne peut pas être mesuré à partir d’une pose 2D seule.", SOURCE),
      stability,
      observations,
      limitations: [
        "Toutes les observations biomécaniques sont des projections 2D dépendantes du cadrage.",
        "Aucun diagnostic médical, risque de blessure ou mesure de force n’est produit.",
      ],
    };
  }
}

interface BalanceSample { offsetRatio: number; confidence: number; }

function balanceSample(frame: ShotFrameObservation): BalanceSample[] {
  const leftHip = keypoint(frame, "left_hip");
  const rightHip = keypoint(frame, "right_hip");
  const leftAnkle = keypoint(frame, "left_ankle");
  const rightAnkle = keypoint(frame, "right_ankle");
  if (!leftHip || !rightHip || !leftAnkle || !rightAnkle) return [];
  const hipCenter = midpoint(leftHip, rightHip);
  const supportCenter = midpoint(leftAnkle, rightAnkle);
  const stanceWidth = Math.abs(rightAnkle.x - leftAnkle.x);
  if (stanceWidth < frame.width * 0.02) return [];
  return [{
    offsetRatio: Math.abs(hipCenter.x - supportCenter.x) / stanceWidth,
    confidence: averageConfidence([leftHip, rightHip, leftAnkle, rightAnkle]),
  }];
}

function balanceMetric(samples: BalanceSample[]): MetricResult {
  if (samples.length < 2) return unavailable("Appuis et bassin insuffisamment visibles pour estimer l’équilibre.", SOURCE);
  const confidence = clamp01(mean(samples.map((sample) => sample.confidence)) * Math.min(1, samples.length / 5));
  return createMetricResult({
    value: Number(mean(samples.map((sample) => sample.offsetRatio)).toFixed(4)),
    unit: "stance_width_ratio",
    confidence,
    source: SOURCE,
    status: "estimated",
    limitations: ["Décalage horizontal du bassin normalisé par la largeur des appuis dans le plan image."],
  });
}

function landingStability(frames: ShotFrameObservation[], landingFrameIndex: number): MetricResult {
  const samples = frames
    .filter((frame) => frame.frameIndex >= landingFrameIndex)
    .slice(0, 5)
    .flatMap((frame) => {
      const leftHip = keypoint(frame, "left_hip");
      const rightHip = keypoint(frame, "right_hip");
      if (!leftHip || !rightHip) return [];
      return [{ x: midpoint(leftHip, rightHip).x / Math.max(1, frame.width), confidence: averageConfidence([leftHip, rightHip]) }];
    });
  if (samples.length < 2) return unavailable("Moins de deux positions du bassin visibles après l’atterrissage.", "landing_pose_2d");
  const xs = samples.map((sample) => sample.x);
  const sway = Math.max(...xs) - Math.min(...xs);
  const confidence = clamp01(mean(samples.map((sample) => sample.confidence)) * Math.min(1, samples.length / 3));
  return createMetricResult({
    value: Number(sway.toFixed(4)),
    unit: "frame_width_ratio",
    confidence,
    source: "landing_pose_2d",
    status: "estimated",
    limitations: ["Stabilité décrite par le déplacement latéral 2D du bassin après l’atterrissage."],
  });
}

function unavailable(reason: string, source: string): MetricResult {
  return createMetricResult({ value: null, confidence: 0, source, limitations: [reason] });
}
