import { describe, expect, it } from "vitest";

import { analyzeBasketballSession, analyzeUploadedVideo } from "@/src/services/aiAnalysisService";

describe("personalizedAIService", () => {
  it("refuse de produire un diagnostic fiable sans mesures", () => {
    const result = analyzeBasketballSession(null);

    expect(result.score).toBe(0);
    expect(result.confidenceScore).toBe(0);
    expect(result.confidenceLabel).toBe("unreliable");
    expect(result.strengths).toEqual([]);
    expect(result.weaknesses).toEqual([]);
    expect(result.recommendedDrills).toEqual([]);
    expect(result.limitations.length).toBeGreaterThan(0);
  });

  it("produit une analyse locale explicable avec des mesures valides", () => {
    const result = analyzeBasketballSession({
      elbowAngle: 88,
      kneeAngle: 72,
      madeShots: 8,
      missedShots: 2,
      dribbleRhythm: 110,
      dribblePower: 80,
      isShooting: true,
    });

    expect(result.engine).toBe("masterhoop-local-v1");
    expect(result.score).toBeGreaterThan(0);
    expect(result.confidenceScore).toBeGreaterThanOrEqual(60);
    expect(result.metricConfidence.shootingForm.measured).toBe(true);
  });

  it("n'invente plus de métriques à partir du nom d'une vidéo", async () => {
    const result = await analyzeUploadedVideo(
      new File(["video"], "entrainement.mp4", { type: "video/mp4" }),
    );

    expect(result.score).toBe(0);
    expect(result.confidenceLabel).toBe("unreliable");
  });
});
