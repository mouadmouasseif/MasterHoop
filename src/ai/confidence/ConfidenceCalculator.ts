import { clamp01, mean } from "@/src/ai/pose/poseMath";
import type {
  BiomechanicsReport,
  ConfidenceReport,
  ShotFrameObservation,
  ShotTimelineEvent,
  ShotTrajectoryReport,
} from "@/src/ai/types";

export class ConfidenceCalculator {
  calculate(input: {
    frames: ShotFrameObservation[];
    timeline: ShotTimelineEvent[];
    trajectory: ShotTrajectoryReport;
    biomechanics: BiomechanicsReport;
  }): ConfidenceReport {
    const pose = mean(input.frames.map((frame) => frame.confidence));
    const observedBallFrames = input.frames.filter((frame) => frame.ball?.observed);
    const ball = observedBallFrames.length
      ? mean(observedBallFrames.map((frame) => frame.ball!.confidence)) * Math.min(1, observedBallFrames.length / 5)
      : 0;
    const phases = input.timeline.length
      ? mean(input.timeline.map((event) => event.confidence)) * Math.min(1, input.timeline.length / 4)
      : 0;
    const metrics = [
      input.biomechanics.balance,
      input.biomechanics.timing,
      input.biomechanics.stability,
      input.trajectory.releaseAngle,
    ].filter((metric) => metric.status !== "unavailable");
    const metricConfidence = metrics.length ? mean(metrics.map((metric) => metric.confidence)) : 0;
    const global = clamp01(pose * 0.25 + ball * 0.3 + phases * 0.3 + metricConfidence * 0.15);
    const limitations: string[] = [];
    if (global < 0.6) limitations.push("Confiance globale inférieure à 0,60 ; nouvelle capture recommandée.");
    if (!input.timeline.some((event) => event.phase === "release")) limitations.push("Relâchement non confirmé.");
    if (observedBallFrames.length < 3) limitations.push("Ballon observé sur moins de trois images.");

    return {
      global,
      metrics: { pose, ball, phases, trajectory: input.trajectory.confidence, biomechanics: metricConfidence },
      limitations,
    };
  }
}
