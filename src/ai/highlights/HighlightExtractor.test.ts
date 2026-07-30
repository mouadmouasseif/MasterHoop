import { describe, expect, it } from "vitest";
import { HighlightExtractor } from "@/src/ai/highlights/HighlightExtractor";
import type { ShotTimelineEvent } from "@/src/ai/types";

describe("HighlightExtractor", () => {
  it("regroupe les événements observés proches sans inventer de segment", () => {
    const highlights = new HighlightExtractor().extract([
      event("release", 1000, 0.9),
      event("flight", 1300, 0.82),
      event("result", 1700, 0.88),
      event("landing", 5000, 0.4),
    ]);

    expect(highlights).toHaveLength(1);
    expect(highlights[0].startMs).toBe(200);
    expect(highlights[0].endMs).toBe(2900);
    expect(highlights[0].phases).toEqual(["release", "flight", "result"]);
  });
});

function event(phase: ShotTimelineEvent["phase"], timestampMs: number, confidence: number): ShotTimelineEvent {
  return {
    id: `${phase}-${timestampMs}`,
    phase,
    frameIndex: timestampMs / 100,
    timestampMs,
    confidence,
    status: "observed",
    evidence: [],
    limitations: [],
  };
}
