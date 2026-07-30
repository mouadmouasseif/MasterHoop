import type { MetricResult } from "@/src/ai/types";

export const RELIABLE_CONFIDENCE_THRESHOLD = 0.6;

export function createMetricResult(input: Omit<MetricResult, "status"> & { status?: MetricResult["status"] }): MetricResult {
  const confidence = Math.max(0, Math.min(1, input.confidence));
  if (input.value === null) return { ...input, value: null, confidence, status: "unavailable" };
  if (confidence < RELIABLE_CONFIDENCE_THRESHOLD) {
    return {
      ...input,
      value: null,
      confidence,
      status: "unavailable",
      limitations: [...(input.limitations || []), "Confiance inférieure à 0,60 ; nouvelle capture recommandée."],
    };
  }
  return { ...input, confidence, status: input.status || "measured" };
}
