import { describe, expect, it } from "vitest";
import { BiomechanicsAnalyzer } from "@/src/ai/biomechanics/BiomechanicsAnalyzer";
import type { ShotFrameObservation, ShotTimelineEvent } from "@/src/ai/types";

describe("BiomechanicsAnalyzer", () => {
  it("retourne des ratios 2D documentés sans inventer un transfert de puissance", () => {
    const frames = Array.from({ length: 5 }, (_, frameIndex) => poseFrame(frameIndex));
    const timeline: ShotTimelineEvent[] = [event("preparation", 0, 0), event("release", 3, 300)];

    const report = new BiomechanicsAnalyzer().analyze(frames, timeline);

    expect(report.balance.status).toBe("estimated");
    expect(report.balance.unit).toBe("stance_width_ratio");
    expect(report.timing.value).toBe(300);
    expect(report.powerTransfer.status).toBe("unavailable");
    expect(report.powerTransfer.value).toBeNull();
  });
});

function poseFrame(frameIndex: number): ShotFrameObservation {
  const point = (name: string, x: number, y: number) => ({ name, x, y, confidence: 0.95 });
  return {
    frameIndex,
    timestampMs: frameIndex * 100,
    width: 1000,
    height: 1000,
    confidence: 0.95,
    hasBall: false,
    ball: null,
    keypoints: [
      point("left_hip", 470, 600), point("right_hip", 530, 600),
      point("left_ankle", 440, 930), point("right_ankle", 560, 930),
    ],
  };
}

function event(phase: ShotTimelineEvent["phase"], frameIndex: number, timestampMs: number): ShotTimelineEvent {
  return {
    id: `${phase}-${frameIndex}`,
    phase,
    frameIndex,
    timestampMs,
    confidence: 0.9,
    status: "observed",
    evidence: ["fixture synthétique"],
    limitations: [],
  };
}
