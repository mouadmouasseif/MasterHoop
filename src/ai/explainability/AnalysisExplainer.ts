import type {
  AnalysisExplanation,
  BiomechanicsReport,
  ConfidenceReport,
  ShotTimelineEvent,
  ShotTrajectoryReport,
} from "@/src/ai/types";

export function explainShotAnalysis(input: {
  timeline: ShotTimelineEvent[];
  trajectory: ShotTrajectoryReport;
  biomechanics: BiomechanicsReport;
  confidence: ConfidenceReport;
}): AnalysisExplanation[] {
  const explanations: AnalysisExplanation[] = input.timeline.map((event) => ({
    subject: `phase:${event.phase}`,
    confidence: event.confidence,
    evidence: event.evidence,
    limitations: event.limitations,
  }));

  explanations.push({
    subject: "trajectory:2d",
    confidence: input.trajectory.confidence,
    evidence: [`${input.trajectory.points.length} positions de ballon réellement observées.`],
    limitations: input.trajectory.limitations,
  });

  for (const observation of input.biomechanics.observations) {
    explanations.push({
      subject: `biomechanics:${observation.category}`,
      confidence: observation.confidence,
      evidence: [observation.message],
      limitations: observation.limitations,
    });
  }

  explanations.push({
    subject: "confidence:global",
    confidence: input.confidence.global,
    evidence: Object.entries(input.confidence.metrics).map(
      ([name, value]) => `${name}: ${Math.round(value * 100)} %`,
    ),
    limitations: input.confidence.limitations,
  });

  return explanations;
}
