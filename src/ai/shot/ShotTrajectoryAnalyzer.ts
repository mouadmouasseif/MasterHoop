import { createMetricResult } from "@/src/ai/confidence/metricResult";
import { clamp01, mean } from "@/src/ai/pose/poseMath";
import type {
  MetricResult,
  ShotFrameObservation,
  ShotTrajectoryReport,
  TrajectoryPoint,
} from "@/src/ai/types";

const SOURCE = "observed_ball_track_2d";

export class ShotTrajectoryAnalyzer {
  analyze(frames: ShotFrameObservation[], releaseFrameIndex: number | null): ShotTrajectoryReport {
    const observed = frames
      .filter((frame) => frame.ball?.observed)
      .filter((frame) => releaseFrameIndex === null || frame.frameIndex >= releaseFrameIndex)
      .sort((left, right) => left.timestampMs - right.timestampMs);
    const points: TrajectoryPoint[] = observed.map((frame) => ({
      frameIndex: frame.frameIndex,
      timestampMs: frame.timestampMs,
      x: frame.ball!.center.x / Math.max(1, frame.width),
      y: frame.ball!.center.y / Math.max(1, frame.height),
      confidence: frame.ball!.confidence,
      coordinateSpace: "normalized_2d",
    }));

    const confidence = trajectoryConfidence(observed, releaseFrameIndex !== null);
    const limitations = [
      "Trajectoire exprimée en coordonnées 2D normalisées, sans profondeur ni distance réelle.",
      "Les points prédits par le tracker sont exclus des métriques.",
    ];
    if (releaseFrameIndex === null) limitations.push("Relâchement non confirmé ; aucune trajectoire de tir n’est validée.");
    if (points.length < 3) limitations.push("Moins de trois positions de ballon observées après le relâchement.");

    return {
      points,
      releaseAngle: releaseAngle(points, confidence, releaseFrameIndex !== null),
      apexHeight: apexHeight(points, confidence, releaseFrameIndex !== null),
      horizontalDisplacement: horizontalDisplacement(points, confidence, releaseFrameIndex !== null),
      observedDuration: observedDuration(points, confidence, releaseFrameIndex !== null),
      confidence,
      limitations,
    };
  }
}

function releaseAngle(points: TrajectoryPoint[], confidence: number, hasRelease: boolean): MetricResult {
  const first = points[0];
  const second = points.find((point) => first && point.timestampMs - first.timestampMs >= 15);
  if (!hasRelease || !first || !second) return unavailable("Angle de relâchement non calculable sans deux observations post-relâchement.", confidence);
  const dx = Math.abs(second.x - first.x);
  const dyUp = first.y - second.y;
  if (dyUp <= 0) return unavailable("Mouvement ascendant non confirmé après le relâchement.", confidence);
  const value = Number((Math.atan2(dyUp, Math.max(dx, 0.0001)) * 180 / Math.PI).toFixed(1));
  return createMetricResult({
    value,
    unit: "deg_2d",
    confidence,
    source: SOURCE,
    status: "estimated",
    limitations: ["Angle dans le plan image ; dépend de la perspective de la caméra."],
  });
}

function apexHeight(points: TrajectoryPoint[], confidence: number, hasRelease: boolean): MetricResult {
  if (!hasRelease || points.length < 3) return unavailable("Sommet non observable avec moins de trois positions post-relâchement.", confidence);
  const apex = points.reduce((highest, point) => point.y < highest.y ? point : highest);
  return createMetricResult({
    value: Number((1 - apex.y).toFixed(4)),
    unit: "frame_height_ratio",
    confidence,
    source: SOURCE,
    status: "estimated",
    limitations: ["Hauteur relative au cadre, pas une hauteur réelle en mètres."],
  });
}

function horizontalDisplacement(points: TrajectoryPoint[], confidence: number, hasRelease: boolean): MetricResult {
  const first = points[0];
  const last = points.at(-1);
  if (!hasRelease || !first || !last || first === last) return unavailable("Déplacement horizontal non observable.", confidence);
  return createMetricResult({
    value: Number(Math.abs(last.x - first.x).toFixed(4)),
    unit: "frame_width_ratio",
    confidence,
    source: SOURCE,
    status: "estimated",
    limitations: ["Déplacement projeté dans le plan 2D de la caméra."],
  });
}

function observedDuration(points: TrajectoryPoint[], confidence: number, hasRelease: boolean): MetricResult {
  const first = points[0];
  const last = points.at(-1);
  if (!hasRelease || !first || !last || first === last) return unavailable("Durée de vol observée insuffisante.", confidence);
  return createMetricResult({
    value: Math.max(0, last.timestampMs - first.timestampMs),
    unit: "ms",
    confidence,
    source: SOURCE,
    status: "measured",
    limitations: ["Durée limitée à la portion où le ballon est réellement détecté."],
  });
}

function trajectoryConfidence(frames: ShotFrameObservation[], hasRelease: boolean): number {
  if (!hasRelease || frames.length < 2) return 0;
  const ballConfidence = mean(frames.map((frame) => frame.ball!.confidence));
  const sampleFactor = Math.min(1, frames.length / 5);
  return clamp01(ballConfidence * 0.8 + sampleFactor * 0.2);
}

function unavailable(reason: string, confidence: number): MetricResult {
  return createMetricResult({ value: null, confidence, source: SOURCE, limitations: [reason] });
}
