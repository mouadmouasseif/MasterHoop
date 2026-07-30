import { BiomechanicsAnalyzer } from "@/src/ai/biomechanics/BiomechanicsAnalyzer";
import { CourtCalibration } from "@/src/ai/calibration/CourtCalibration";
import { ConfidenceCalculator } from "@/src/ai/confidence/ConfidenceCalculator";
import { explainShotAnalysis } from "@/src/ai/explainability/AnalysisExplainer";
import { HighlightExtractor } from "@/src/ai/highlights/HighlightExtractor";
import { ShotOutcomeDetector } from "@/src/ai/shot/ShotOutcomeDetector";
import { ShotPhaseDetector } from "@/src/ai/shot/ShotPhaseDetector";
import { ShotTrajectoryAnalyzer } from "@/src/ai/shot/ShotTrajectoryAnalyzer";
import type {
  CourtGeometry,
  Point2D,
  ShotFrameObservation,
  ShotSequenceAnalysis,
  ShotTimelineEvent,
} from "@/src/ai/types";

export class ShotAnalysisEngine {
  private frames: ShotFrameObservation[] = [];
  private readonly phaseDetector = new ShotPhaseDetector();
  private readonly trajectoryAnalyzer = new ShotTrajectoryAnalyzer();
  private readonly biomechanicsAnalyzer = new BiomechanicsAnalyzer();
  private readonly confidenceCalculator = new ConfidenceCalculator();
  private readonly outcomeDetector = new ShotOutcomeDetector();
  private readonly highlightExtractor = new HighlightExtractor();
  private readonly courtCalibration = new CourtCalibration();
  private calibration: CourtGeometry | null = null;

  constructor(private readonly historySize = 240) {}

  addFrame(frame: ShotFrameObservation): void {
    this.frames.push(frame);
    this.frames = this.frames
      .sort((left, right) => left.timestampMs - right.timestampMs)
      .slice(-this.historySize);
  }

  setCourtCalibration(calibration: CourtGeometry | null): void {
    this.calibration = calibration;
  }

  analyze(): ShotSequenceAnalysis {
    const phaseResult = this.phaseDetector.detect(this.frames);
    const outcomeObservation = this.outcomeDetector.detect(this.frames);
    const timeline = appendOutcomeEvent(phaseResult.events, outcomeObservation, this.frames);
    const trajectory = this.trajectoryAnalyzer.analyze(this.frames, phaseResult.releaseFrameIndex);
    const biomechanics = this.biomechanicsAnalyzer.analyze(this.frames, timeline);
    const releaseFrame = phaseResult.releaseFrameIndex === null
      ? null
      : this.frames.find((frame) => frame.frameIndex === phaseResult.releaseFrameIndex) || null;
    const shotDistance = this.courtCalibration.estimateShotDistance(
      this.calibration,
      releaseFrame ? shooterFloorPoint(releaseFrame) : null,
    );
    const confidence = this.confidenceCalculator.calculate({
      frames: this.frames,
      timeline,
      trajectory,
      biomechanics,
    });
    const explanations = explainShotAnalysis({
      timeline,
      trajectory,
      biomechanics,
      confidence,
    });
    const limitations = [
      ...phaseResult.limitations,
      ...trajectory.limitations,
      ...biomechanics.limitations,
      ...confidence.limitations,
      ...outcomeObservation.limitations,
      ...(shotDistance.limitations || []),
      ...(this.calibration?.limitations || []),
      "Type de tir laissé à unknown tant qu’un classifieur validé n’est pas disponible.",
    ];

    return {
      outcome: outcomeObservation.outcome,
      outcomeObservation,
      shotType: "unknown",
      courtCalibration: this.calibration,
      shotDistance,
      timeline,
      highlights: this.highlightExtractor.extract(timeline),
      trajectory,
      biomechanics,
      confidence,
      explanations,
      limitations: [...new Set(limitations)],
    };
  }

  reset(): void {
    this.frames = [];
  }
}

function appendOutcomeEvent(
  timeline: ShotTimelineEvent[],
  outcome: ShotSequenceAnalysis["outcomeObservation"],
  frames: ShotFrameObservation[],
): ShotTimelineEvent[] {
  if (outcome.status !== "observed" || !outcome.evidenceFrameIndexes.length) return timeline;
  const evidenceFrames = outcome.evidenceFrameIndexes
    .map((frameIndex) => frames.find((frame) => frame.frameIndex === frameIndex))
    .filter((frame): frame is ShotFrameObservation => Boolean(frame));
  const resultFrame = evidenceFrames.at(-1);
  if (!resultFrame) return timeline;
  return [
    ...timeline.filter((event) => event.phase !== "result"),
    {
      id: `result-${resultFrame.frameIndex}`,
      phase: "result" as const,
      frameIndex: resultFrame.frameIndex,
      timestampMs: resultFrame.timestampMs,
      confidence: outcome.confidence,
      status: "observed" as const,
      evidence: outcome.evidence,
      limitations: [],
    },
  ].sort((left, right) => left.timestampMs - right.timestampMs);
}

function shooterFloorPoint(frame: ShotFrameObservation): Point2D | null {
  const ankles = frame.keypoints.filter((point) =>
    (point.name === "left_ankle" || point.name === "right_ankle") && point.confidence >= 0.6,
  );
  if (!ankles.length) return null;
  return {
    x: ankles.reduce((sum, point) => sum + point.x, 0) / ankles.length,
    y: ankles.reduce((sum, point) => sum + point.y, 0) / ankles.length,
  };
}
