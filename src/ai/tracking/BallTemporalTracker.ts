import type { BallDetection, BallTrack } from "@/src/ai/types";

export interface TrackedBallPoint extends BallDetection {
  observed: boolean;
  velocity: { x: number; y: number };
  acceleration: { x: number; y: number };
}

export interface TemporalBallTrack extends Omit<BallTrack, "detections"> {
  detections: TrackedBallPoint[];
  lostFrames: number;
}

export class BallTemporalTracker {
  private points: TrackedBallPoint[] = [];
  private lostFrames = 0;

  constructor(private readonly maxPredictionFrames = 3, private readonly historySize = 60) {}

  update(candidates: BallDetection[], timestampMs: number): TemporalBallTrack {
    const previous = this.points.at(-1);
    const candidate = selectCandidate(candidates, previous);
    if (candidate) {
      const point = this.observe(candidate, previous);
      this.points.push(point);
      this.points = this.points.slice(-this.historySize);
      this.lostFrames = 0;
      return this.snapshot("tracked");
    }

    this.lostFrames += 1;
    if (previous && this.lostFrames <= this.maxPredictionFrames) {
      const deltaSeconds = Math.max(1 / 120, (timestampMs - previous.timestampMs) / 1000);
      const predicted: TrackedBallPoint = {
        ...previous,
        frameIndex: previous.frameIndex + 1,
        timestampMs,
        center: {
          x: previous.center.x + previous.velocity.x * deltaSeconds,
          y: previous.center.y + previous.velocity.y * deltaSeconds,
        },
        bbox: {
          ...previous.bbox,
          x: previous.bbox.x + previous.velocity.x * deltaSeconds,
          y: previous.bbox.y + previous.velocity.y * deltaSeconds,
        },
        confidence: Math.max(0, previous.confidence * 0.72),
        observed: false,
      };
      this.points.push(predicted);
      this.points = this.points.slice(-this.historySize);
      return this.snapshot("predicted");
    }

    if (this.lostFrames > this.maxPredictionFrames + 2) this.reset();
    return this.snapshot("lost");
  }

  reset(): void { this.points = []; this.lostFrames = 0; }

  private observe(detection: BallDetection, previous?: TrackedBallPoint): TrackedBallPoint {
    if (!previous) return { ...detection, observed: true, velocity: { x: 0, y: 0 }, acceleration: { x: 0, y: 0 } };
    const deltaSeconds = Math.max(1 / 120, (detection.timestampMs - previous.timestampMs) / 1000);
    const alpha = detection.detector === "BasketMotion-Ai" ? 0.72 : 0.58;
    const center = {
      x: previous.center.x + alpha * (detection.center.x - previous.center.x),
      y: previous.center.y + alpha * (detection.center.y - previous.center.y),
    };
    const rawVelocity = { x: (center.x - previous.center.x) / deltaSeconds, y: (center.y - previous.center.y) / deltaSeconds };
    const velocity = { x: previous.velocity.x * 0.35 + rawVelocity.x * 0.65, y: previous.velocity.y * 0.35 + rawVelocity.y * 0.65 };
    return {
      ...detection,
      center,
      bbox: { ...detection.bbox, x: center.x - detection.bbox.width / 2, y: center.y - detection.bbox.height / 2 },
      observed: true,
      velocity,
      acceleration: { x: (velocity.x - previous.velocity.x) / deltaSeconds, y: (velocity.y - previous.velocity.y) / deltaSeconds },
    };
  }

  private snapshot(status: BallTrack["status"]): TemporalBallTrack {
    const observed = this.points.filter((point) => point.observed);
    const confidence = observed.length ? observed.reduce((sum, point) => sum + point.confidence, 0) / observed.length : 0;
    return { detections: [...this.points], confidence, status, lostFrames: this.lostFrames };
  }
}

function selectCandidate(candidates: BallDetection[], previous?: TrackedBallPoint): BallDetection | undefined {
  return candidates
    .filter((candidate) => candidate.confidence >= 0.35 && candidate.bbox.width > 1 && candidate.bbox.height > 1)
    .sort((left, right) => scoreCandidate(right, previous) - scoreCandidate(left, previous))[0];
}

function scoreCandidate(candidate: BallDetection, previous?: TrackedBallPoint): number {
  if (!previous) return candidate.confidence + (candidate.detector === "BasketMotion-Ai" ? 0.12 : 0);
  const distance = Math.hypot(candidate.center.x - previous.center.x, candidate.center.y - previous.center.y);
  const sizeRatio = Math.max(candidate.bbox.width * candidate.bbox.height, previous.bbox.width * previous.bbox.height) /
    Math.max(1, Math.min(candidate.bbox.width * candidate.bbox.height, previous.bbox.width * previous.bbox.height));
  return candidate.confidence + (candidate.detector === "BasketMotion-Ai" ? 0.12 : 0) - Math.min(0.5, distance / 500) - Math.min(0.35, Math.max(0, sizeRatio - 1) * 0.1);
}
