import { describe, expect, it } from "vitest";
import { ShotOutcomeDetector } from "@/src/ai/shot/ShotOutcomeDetector";
import type { ShotFrameObservation } from "@/src/ai/types";

describe("ShotOutcomeDetector", () => {
  it("confirme un panier sur un passage descendant dans le cercle", () => {
    const result = new ShotOutcomeDetector().detect([
      frame(0, 0, 500, 420),
      frame(1, 100, 505, 500),
      frame(2, 200, 500, 590),
    ]);

    expect(result.outcome).toBe("made");
    expect(result.status).toBe("observed");
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it("confirme un tir manqué seulement quand le passage extérieur est clair", () => {
    const result = new ShotOutcomeDetector().detect([
      frame(0, 0, 610, 420),
      frame(1, 100, 620, 500),
      frame(2, 200, 630, 590),
    ]);

    expect(result.outcome).toBe("missed");
    expect(result.evidenceFrameIndexes).toEqual([0, 1, 2]);
  });

  it("garde unknown lorsque le panier n'est pas observé", () => {
    const frames = [frame(0, 0, 500, 420), frame(1, 100, 500, 500), frame(2, 200, 500, 590)];
    frames.forEach((value) => { value.hoop = null; });

    expect(new ShotOutcomeDetector().detect(frames).outcome).toBe("unknown");
  });
});

function frame(frameIndex: number, timestampMs: number, ballX: number, ballY: number): ShotFrameObservation {
  return {
    frameIndex,
    timestampMs,
    width: 1000,
    height: 1000,
    confidence: 0.95,
    hasBall: false,
    keypoints: [],
    ball: {
      frameIndex,
      timestampMs,
      bbox: { x: ballX - 15, y: ballY - 15, width: 30, height: 30 },
      center: { x: ballX, y: ballY },
      confidence: 0.92,
      detector: "BasketMotion-Ai",
      observed: true,
      velocity: { x: 0, y: 800 },
      acceleration: { x: 0, y: 0 },
    },
    hoop: {
      frameIndex,
      timestampMs,
      center: { x: 500, y: 500 },
      rimWidthPx: 120,
      confidence: 0.94,
      observed: true,
      source: "manual_annotation",
    },
  };
}
