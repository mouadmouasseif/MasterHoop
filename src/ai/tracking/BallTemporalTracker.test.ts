import { describe, expect, it } from "vitest";
import { BallTemporalTracker } from "@/src/ai/tracking/BallTemporalTracker";
import type { BallDetection } from "@/src/ai/types";

const detection = (frameIndex: number, x: number, confidence = 0.9): BallDetection => ({
  frameIndex,
  timestampMs: frameIndex * 40,
  bbox: { x, y: 20, width: 10, height: 10 },
  center: { x: x + 5, y: 25 },
  confidence,
  detector: "BasketMotion-Ai",
});

describe("BallTemporalTracker", () => {
  it("lisse les observations et calcule une vitesse observée", () => {
    const tracker = new BallTemporalTracker();
    tracker.update([detection(0, 0)], 0);
    const track = tracker.update([detection(1, 10)], 40);
    expect(track.status).toBe("tracked");
    expect(track.detections.at(-1)?.velocity.x).toBeGreaterThan(0);
    expect(track.detections.at(-1)?.observed).toBe(true);
  });

  it("prédit brièvement puis déclare la piste perdue", () => {
    const tracker = new BallTemporalTracker(2);
    tracker.update([detection(0, 0)], 0);
    expect(tracker.update([], 40).status).toBe("predicted");
    expect(tracker.update([], 80).status).toBe("predicted");
    expect(tracker.update([], 120).status).toBe("lost");
  });
});
