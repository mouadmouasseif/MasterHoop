import type { PoseMetrics } from "@/src/lib/poseDetection";
import type { AIAnalysisResult } from "@/src/services/personalizedAIService";
import { personalizedAIService } from "@/src/services/personalizedAIService";
import { extractVideoMetrics } from "@/src/services/videoFrameAnalysisService";

export type {
  AIAnalysisMetrics,
  AIAnalysisResult,
  BasketballAnalysisService,
  ConfidenceLabel,
  MetricConfidence,
} from "@/src/services/personalizedAIService";

export function analyzeBasketballSession(metrics?: Partial<PoseMetrics> | null) {
  return personalizedAIService.analyze(metrics);
}

export async function analyzeUploadedVideo(file: File): Promise<AIAnalysisResult> {
  try {
    const extracted = await extractVideoMetrics(file);
    const result = analyzeBasketballSession(extracted.metrics);
    return {
      ...result,
      confidenceScore: extracted.quality.analysisPossible ? result.confidenceScore : Math.min(result.confidenceScore, 59),
      confidenceLabel: extracted.quality.analysisPossible ? result.confidenceLabel : "unreliable",
      aiFeedback: extracted.quality.analysisPossible
        ? result.aiFeedback
        : "Qualité vidéo insuffisante : les mesures sont affichées avec prudence et aucun diagnostic fiable n’est confirmé.",
      videoQuality: extracted.quality,
      observedMetrics: extracted.metrics,
      limitations: [...result.limitations, ...extracted.quality.issues],
    };
  } catch (error) {
    const result = analyzeBasketballSession(null);
    return {
      ...result,
      aiFeedback: error instanceof Error ? error.message : "La vidéo n’a pas pu être analysée.",
      limitations: [...result.limitations, "Extraction des images impossible."],
    };
  }
}
