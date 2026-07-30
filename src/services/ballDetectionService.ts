import type { Point2D } from "@/src/types/courtVision";

export type BallDetection = {
  detected: boolean;
  confidence: number;
  position?: Point2D;
  velocity?: Point2D;
  trail: Point2D[];
};

export function detectBallFromMetrics(input: {
  ballDetected?: boolean;
  ballPos?: Point2D | null;
  ballVelocity?: Point2D;
  ballConfidence?: number;
  previousTrail?: Point2D[];
}): BallDetection {
  const trail = [...(input.previousTrail || [])];
  if (input.ballDetected && input.ballPos) {
    trail.push(input.ballPos);
  }

  return {
    detected: Boolean(input.ballDetected && input.ballPos),
    confidence: input.ballDetected && input.ballPos
      ? Math.max(0, Math.min(1, Number(input.ballConfidence || 0) > 1 ? Number(input.ballConfidence) / 100 : Number(input.ballConfidence || 0)))
      : 0,
    position: input.ballPos || undefined,
    velocity: input.ballVelocity,
    trail: trail.slice(-18),
  };
}
