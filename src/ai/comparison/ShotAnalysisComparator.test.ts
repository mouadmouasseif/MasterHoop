import { describe, expect, it } from "vitest";
import { ShotAnalysisComparator } from "@/src/ai/comparison/ShotAnalysisComparator";
import type {
  BiomechanicsReport,
  MetricResult,
  ShotSequenceAnalysis,
  ShotTrajectoryReport,
} from "@/src/ai/types";

describe("ShotAnalysisComparator", () => {
  it("calcule uniquement les écarts compatibles et assez fiables", () => {
    const baseline = analysis(metric(6, "m", 0.9), metric(48, "deg_2d", 0.9));
    const current = analysis(metric(7, "m", 0.92), metric(50, "deg_2d", 0.4));

    const comparison = new ShotAnalysisComparator().compare(baseline, current);

    expect(comparison.status).toBe("partial");
    expect(comparison.metrics.find((item) => item.key === "shotDistance")?.delta.value).toBe(1);
    expect(comparison.metrics.find((item) => item.key === "releaseAngle")?.delta.status).toBe("unavailable");
  });

  it("bloque la comparaison des distances issues de deux calibrations différentes", () => {
    const baseline = analysis(metric(6, "m", 0.9), metric(48, "deg_2d", 0.9), "court-a");
    const current = analysis(metric(7, "m", 0.9), metric(49, "deg_2d", 0.9), "court-b");

    const comparison = new ShotAnalysisComparator().compare(baseline, current);

    expect(comparison.metrics.find((item) => item.key === "shotDistance")?.delta.status).toBe("unavailable");
    expect(comparison.metrics.find((item) => item.key === "releaseAngle")?.delta.value).toBe(1);
  });
});

function analysis(
  shotDistance: MetricResult,
  releaseAngle: MetricResult,
  calibrationId?: string,
): ShotSequenceAnalysis {
  const empty = unavailable();
  const trajectory: ShotTrajectoryReport = {
    points: [],
    releaseAngle,
    apexHeight: empty,
    horizontalDisplacement: empty,
    observedDuration: empty,
    confidence: releaseAngle.confidence,
    limitations: [],
  };
  const biomechanics: BiomechanicsReport = {
    efficiency: empty,
    balance: empty,
    timing: empty,
    powerTransfer: empty,
    stability: empty,
    observations: [],
    limitations: [],
  };
  return {
    outcome: "unknown",
    outcomeObservation: {
      outcome: "unknown",
      confidence: 0,
      status: "unavailable",
      source: "unavailable",
      evidenceFrameIndexes: [],
      evidence: [],
      limitations: [],
    },
    shotType: "unknown",
    courtCalibration: calibrationId ? {
      calibrationId,
      confidence: 0.9,
      status: "calibrated",
      source: "manual_reference",
      homography: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      imageSize: { width: 1000, height: 1000 },
      referenceCount: 4,
      reprojectionErrorPx: 1,
      coverage: 0.4,
      basketCourtPointMeters: { x: 5, y: 0 },
      limitations: [],
    } : null,
    shotDistance,
    timeline: [],
    highlights: [],
    trajectory,
    biomechanics,
    confidence: { global: 0.8, metrics: {}, limitations: [] },
    explanations: [],
    limitations: [],
  };
}

function metric(value: number, unit: string, confidence: number): MetricResult {
  return { value, unit, confidence, source: "test", status: "measured", limitations: [] };
}

function unavailable(): MetricResult {
  return { value: null, confidence: 0, source: "test", status: "unavailable", limitations: [] };
}
