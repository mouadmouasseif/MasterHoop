import { clamp01, mean } from "@/src/ai/pose/poseMath";
import type {
  MetricResult,
  ShotAnalysisComparison,
  ShotMetricComparison,
  ShotSequenceAnalysis,
} from "@/src/ai/types";

type MetricKey = ShotMetricComparison["key"];

const MIN_CONFIDENCE = 0.6;

export class ShotAnalysisComparator {
  compare(baseline: ShotSequenceAnalysis, current: ShotSequenceAnalysis): ShotAnalysisComparison {
    const differentCalibrations = Boolean(
      baseline.courtCalibration &&
      current.courtCalibration &&
      baseline.courtCalibration.calibrationId !== current.courtCalibration.calibrationId,
    );
    const metricPairs: Array<[MetricKey, MetricResult, MetricResult]> = [
      ["shotDistance", baseline.shotDistance, current.shotDistance],
      ["releaseAngle", baseline.trajectory.releaseAngle, current.trajectory.releaseAngle],
      ["balance", baseline.biomechanics.balance, current.biomechanics.balance],
      ["timing", baseline.biomechanics.timing, current.biomechanics.timing],
      ["stability", baseline.biomechanics.stability, current.biomechanics.stability],
    ];
    const metrics = metricPairs.map(([key, before, after]) => ({
      key,
      baseline: before,
      current: after,
      delta: key === "shotDistance" && differentCalibrations
        ? unavailableDelta("Deux calibrations terrain différentes ne permettent pas de comparer les distances.")
        : delta(before, after),
    }));
    const comparable = metrics.filter((metric) => metric.delta.status !== "unavailable");
    const limitations: string[] = [];

    if (
      differentCalibrations
    ) {
      limitations.push("Les analyses utilisent deux calibrations différentes ; seules les métriques sans unité terrain sont comparables.");
    }
    if (!comparable.length) limitations.push("Aucune métrique commune n’atteint le seuil de confiance de 0,60.");
    if (comparable.length < metrics.length) limitations.push("Certaines métriques ne sont pas comparables ou sont indisponibles.");

    return {
      status: comparable.length === metrics.length ? "comparable" : comparable.length ? "partial" : "unavailable",
      confidence: comparable.length ? mean(comparable.map((metric) => metric.delta.confidence)) : 0,
      metrics,
      limitations,
    };
  }
}

function delta(baseline: MetricResult, current: MetricResult): MetricResult {
  const unavailable =
    baseline.value === null ||
    current.value === null ||
    baseline.status === "unavailable" ||
    current.status === "unavailable" ||
    baseline.confidence < MIN_CONFIDENCE ||
    current.confidence < MIN_CONFIDENCE ||
    baseline.unit !== current.unit;
  if (unavailable) {
    return unavailableDelta(
      "Valeurs, unités et confiance compatibles requises.",
      current.unit || baseline.unit,
    );
  }
  return {
    value: Number((current.value! - baseline.value!).toFixed(2)),
    unit: current.unit,
    confidence: clamp01(Math.min(baseline.confidence, current.confidence)),
    source: `comparison:${baseline.source}:${current.source}`,
    status: baseline.status === "measured" && current.status === "measured" ? "measured" : "estimated",
    limitations: [],
  };
}

function unavailableDelta(message: string, unit?: string): MetricResult {
  return {
    value: null,
    unit,
    confidence: 0,
    source: "comparison_unavailable",
    status: "unavailable",
    limitations: [message],
  };
}
