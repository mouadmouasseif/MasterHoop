import { describe, expect, it } from "vitest";
import { calculateTrainingProgress, detectTrainingLevel, suggestNextTraining } from "@/src/services/trainingProgressService";
import type { SessionLike } from "@/src/types/aiAssistant";

describe("trainingProgressService", () => {
  it("calculates shooting progress from saved metrics", () => {
    const sessions: SessionLike[] = [
      { id: "s1", duration: 600, drillName: "Close", score: 80, createdAt: "", metrics: { madeShots: 8, missedShots: 2 } },
      { id: "s2", duration: 600, drillName: "Mid", score: 70, createdAt: "", metrics: { madeShots: 6, missedShots: 4 } },
    ];

    const progress = calculateTrainingProgress(sessions);

    expect(progress.sessionsAnalyzed).toBe(2);
    expect(progress.shotsAttempted).toBe(20);
    expect(progress.shootingAccuracy).toBe(70);
  });

  it("suggests mid-range after strong close finishing", () => {
    const progress = calculateTrainingProgress([
      {
        id: "s1",
        duration: 500,
        drillName: "Close",
        score: 82,
        createdAt: "",
        metrics: {
          madeShots: 8,
          missedShots: 2,
          shots: [
            { y: 20, outcome: "made" },
            { y: 20, outcome: "made" },
            { y: 20, outcome: "made" },
          ],
        },
      },
    ]);

    expect(suggestNextTraining(progress).id).toBe("mid-range-progression");
    expect(detectTrainingLevel(progress)).toBe("beginner");
  });
});
