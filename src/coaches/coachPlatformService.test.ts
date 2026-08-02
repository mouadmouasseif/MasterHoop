import { beforeEach, describe, expect, it } from "vitest";
import {
  denormalizeDrawingPoint,
  generateLocalAICoachRecommendation,
  listTrainingMissions,
  listVideoComments,
  normalizeDrawingPoint,
  saveTrainingMission,
  saveVideoComment,
} from "@/src/coaches/coachPlatformService";

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  Object.defineProperty(globalThis, "window", { value: {}, configurable: true });
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    },
    configurable: true,
  });
});

describe("coachPlatformService", () => {
  it("creates and lists timestamped video comments", () => {
    const comment = saveVideoComment({
      analysisId: "analysis-1",
      authorId: "coach-1",
      athleteId: "athlete-1",
      timestampMs: 12_500,
      text: "Hold the follow-through here.",
    });

    expect(comment.id).toMatch(/^comment-/);
    expect(listVideoComments("analysis-1")).toHaveLength(1);
    expect(listVideoComments("analysis-2")).toHaveLength(0);
  });

  it("keeps drawing coordinates proportional after resize", () => {
    const normalized = normalizeDrawingPoint({ x: 320, y: 180 }, 640, 360);
    expect(normalized).toEqual({ x: 0.5, y: 0.5 });
    expect(denormalizeDrawingPoint(normalized, 1280, 720)).toEqual({ x: 640, y: 360 });
  });

  it("saves coach missions by coach boundary", () => {
    saveTrainingMission({
      id: "mission-1",
      athleteId: "athlete-1",
      coachId: "coach-1",
      title: "50 mid-range shots",
      drillIds: ["quick-release-form-shooting"],
      target: 50,
      status: "assigned",
    });

    expect(listTrainingMissions("coach-1")).toHaveLength(1);
    expect(listTrainingMissions("coach-2")).toHaveLength(0);
  });

  it("does not generate AI Coach recommendations with insufficient data", () => {
    expect(generateLocalAICoachRecommendation({ athleteId: "athlete-1", objective: "Improve release speed", confidence: 40 })).toBeNull();
  });

  it("generates rule-based AI Coach recommendations from observed metrics", () => {
    const recommendation = generateLocalAICoachRecommendation({
      athleteId: "athlete-1",
      objective: "Improve release speed",
      releaseTimeSeconds: 0.48,
      confidence: 82,
    });

    expect(recommendation?.target).toBe("0.40-0.44 s");
    expect(recommendation?.confidence).toBe(82);
    expect(recommendation?.limitations.length).toBeGreaterThan(0);
  });
});
