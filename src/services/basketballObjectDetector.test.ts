import { describe, expect, it } from "vitest";

import {
  decodeBasketballPredictions,
  nonMaximumSuppression,
  type BasketballDetectedObject,
} from "@/src/services/basketballObjectDetector";

describe("basketballObjectDetector", () => {
  it("décode une sortie spécialisée au format [1, N, 6]", () => {
    const detections = decodeBasketballPredictions(
      new Float32Array([100, 120, 180, 210, 0.92, 0]),
      [1, 1, 6],
      640,
      640,
      1280,
      720,
    );

    expect(detections).toHaveLength(1);
    expect(detections[0].class).toBe("sports ball");
    expect(detections[0].source).toBe("BasketMotion-Ai-model");
    expect(detections[0].score).toBeCloseTo(0.92);
  });

  it("supprime les boîtes fortement superposées", () => {
    const detections: BasketballDetectedObject[] = [
      { bbox: [10, 10, 30, 30], class: "sports ball", score: 0.9, source: "BasketMotion-Ai-model" },
      { bbox: [12, 12, 30, 30], class: "sports ball", score: 0.7, source: "BasketMotion-Ai-model" },
      { bbox: [100, 100, 20, 20], class: "sports ball", score: 0.8, source: "BasketMotion-Ai-model" },
    ];

    const selected = nonMaximumSuppression(detections, 0.45);

    expect(selected).toHaveLength(2);
    expect(selected[0].score).toBe(0.9);
  });
});
