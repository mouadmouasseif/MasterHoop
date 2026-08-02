import { describe, expect, it } from "vitest";
import { calculateAICoachConfidence, generateAICoachRecommendationV4, generateWeeklyTrainingPlan } from "@/src/ai-coach/aiCoachEngine";
import type { SessionLike } from "@/src/types/aiAssistant";

const reliableSessions: SessionLike[] = [
  {
    id: "s1",
    duration: 900,
    drillName: "Shooting",
    score: 82,
    createdAt: "2026-08-01",
    metrics: { madeShots: 8, missedShots: 5, dribbleRhythm: 92, metricConfidence: 84 },
  },
  {
    id: "s2",
    duration: 840,
    drillName: "Shooting",
    score: 78,
    createdAt: "2026-08-02",
    metrics: { madeShots: 7, missedShots: 6, dribbleRhythm: 96, metricConfidence: 80 },
  },
];

describe("aiCoachEngine", () => {
  it("refuses recommendations when data is insufficient", () => {
    const recommendation = generateAICoachRecommendationV4({
      athleteId: "athlete-1",
      objective: "Improve release speed",
      sessions: [],
    });

    expect(recommendation.status).toBe("insufficient_data");
    expect(recommendation.drills).toEqual([]);
    expect(recommendation.limitations.some((item) => item.includes("Needs at least"))).toBe(true);
  });

  it("generates a recommendation from reliable observed sessions", () => {
    const recommendation = generateAICoachRecommendationV4({
      athleteId: "athlete-1",
      objective: "Improve shooting consistency",
      position: "Guard",
      equipment: ["ball", "cones"],
      weeklyFrequency: 4,
      sessions: reliableSessions,
    });

    expect(recommendation.status).toBe("ready");
    expect(recommendation.confidence).toBeGreaterThanOrEqual(60);
    expect(recommendation.basedOnMetrics).toContain("madeShots");
    expect(recommendation.drills.length).toBeGreaterThan(0);
  });

  it("generates a weekly plan that respects requested frequency", () => {
    const plan = generateWeeklyTrainingPlan({
      athleteId: "athlete-1",
      objective: "Improve shooting consistency",
      weeklyFrequency: 4,
      sessions: reliableSessions,
    });

    expect(plan.sessions).toHaveLength(4);
    expect(plan.limitations).toContain("Local rule-based AI Coach. No generic chatbot output.");
  });

  it("calculates confidence from volume and metric confidence", () => {
    const recommendation = generateAICoachRecommendationV4({ athleteId: "athlete-1", sessions: reliableSessions });
    expect(calculateAICoachConfidence(reliableSessions, {
      sessionsAnalyzed: 2,
      shotsAttempted: 26,
      shotsMade: 15,
      shootingAccuracy: 58,
      closeAccuracy: null,
      midRangeAccuracy: null,
      threePointAccuracy: null,
      dribbleStability: 98,
      averageIntensity: 25,
      totalDurationSeconds: 1740,
      trend: "stable",
    })).toBe(recommendation.confidence);
  });
});
