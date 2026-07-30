import { describe, expect, it } from "vitest";
import { ShotAnalysisEngine } from "@/src/ai/shot/ShotAnalysisEngine";
import type { BallFrameObservation, ShotFrameObservation } from "@/src/ai/types";

describe("ShotAnalysisEngine", () => {
  it("construit une timeline à partir d'observations et conserve un outcome inconnu", () => {
    const engine = new ShotAnalysisEngine();
    [
      frame(0, 0, true, ball(0, 0, 500, 650, 0)),
      frame(1, 100, true, ball(1, 100, 500, 670, 200)),
      frame(2, 200, true, ball(2, 200, 505, 620, -500)),
      frame(3, 300, false, ball(3, 300, 515, 540, -800)),
      frame(4, 400, false, ball(4, 400, 530, 470, -700)),
      frame(5, 500, false, ball(5, 500, 550, 430, -400)),
      frame(6, 650, false, null, 35),
    ].forEach((value) => engine.addFrame(value));

    const result = engine.analyze();
    const phases = result.timeline.map((event) => event.phase);

    expect(phases).toContain("release");
    expect(phases).toContain("flight");
    expect(result.outcome).toBe("unknown");
    expect(result.shotType).toBe("unknown");
    expect(result.trajectory.points).toHaveLength(3);
    expect(result.trajectory.releaseAngle.value).not.toBeNull();
    expect(result.outcomeObservation.status).toBe("unavailable");
    expect(result.shotDistance.status).toBe("unavailable");
  });

  it("exclut les points prédits des métriques de trajectoire", () => {
    const engine = new ShotAnalysisEngine();
    [
      frame(0, 0, true, ball(0, 0, 500, 650, 0)),
      frame(1, 100, true, ball(1, 100, 505, 590, -600)),
      frame(2, 200, false, ball(2, 200, 515, 520, -700)),
      frame(3, 300, false, ball(3, 300, 530, 470, -500, false)),
    ].forEach((value) => engine.addFrame(value));

    const result = engine.analyze();

    expect(result.trajectory.points.map((point) => point.frameIndex)).toEqual([2]);
    expect(result.trajectory.releaseAngle.status).toBe("unavailable");
  });

  it("ne confirme aucune phase lorsque la confiance est insuffisante", () => {
    const engine = new ShotAnalysisEngine();
    [
      frame(0, 0, true, ball(0, 0, 500, 650, 0, true, 0.35), 0, 0.4),
      frame(1, 100, true, ball(1, 100, 505, 590, -600, true, 0.35), 0, 0.4),
      frame(2, 200, false, ball(2, 200, 515, 520, -700, true, 0.35), 0, 0.4),
    ].forEach((value) => engine.addFrame(value));

    const result = engine.analyze();

    expect(result.timeline).toHaveLength(0);
    expect(result.confidence.global).toBeLessThan(0.6);
    expect(result.trajectory.releaseAngle.value).toBeNull();
  });
});

function frame(
  frameIndex: number,
  timestampMs: number,
  hasBall: boolean,
  observedBall: BallFrameObservation | null,
  hipDrop = 0,
  confidence = 0.92,
): ShotFrameObservation {
  const point = (name: string, x: number, y: number) => ({ name, x, y, confidence });
  return {
    frameIndex,
    timestampMs,
    width: 1000,
    height: 1000,
    confidence,
    hasBall,
    ball: observedBall,
    keypoints: [
      point("left_wrist", 485, 620), point("right_wrist", 515, 620),
      point("left_shoulder", 460, 350), point("right_shoulder", 540, 350),
      point("left_hip", 470, 600 + hipDrop), point("right_hip", 530, 600 + hipDrop),
      point("left_knee", 465, 760 + hipDrop), point("right_knee", 535, 760 + hipDrop),
      point("left_ankle", 440, 930), point("right_ankle", 560, 930),
    ],
  };
}

function ball(
  frameIndex: number,
  timestampMs: number,
  x: number,
  y: number,
  velocityY: number,
  observed = true,
  confidence = 0.92,
): BallFrameObservation {
  return {
    frameIndex,
    timestampMs,
    bbox: { x: x - 20, y: y - 20, width: 40, height: 40 },
    center: { x, y },
    confidence,
    detector: "BasketMotion-Ai",
    observed,
    velocity: { x: 0, y: velocityY },
    acceleration: { x: 0, y: 0 },
  };
}
