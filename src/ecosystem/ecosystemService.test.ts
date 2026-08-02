import { describe, expect, it } from "vitest";
import { buildEcosystemDashboard, generateTrainingSchedule, rankTeams } from "@/src/ecosystem/ecosystemService";

describe("ecosystemService", () => {
  it("ranks tournament teams by wins then point differential", () => {
    const ranked = rankTeams([
      { id: "a", name: "A", seed: 2, wins: 2, losses: 1, pointsFor: 80, pointsAgainst: 70 },
      { id: "b", name: "B", seed: 1, wins: 2, losses: 1, pointsFor: 90, pointsAgainst: 70 },
      { id: "c", name: "C", seed: 3, wins: 1, losses: 2, pointsFor: 100, pointsAgainst: 60 },
    ]);

    expect(ranked.map((team) => team.id)).toEqual(["b", "a", "c"]);
  });

  it("generates a coach validated preview training schedule", () => {
    const plan = generateTrainingSchedule({
      objective: "Improve defense and release",
      athleteLevel: "elite",
      daysPerWeek: 4,
      availableEquipment: ["camera", "ball"],
    });

    expect(plan.status).toBe("preview");
    expect(plan.days).toHaveLength(4);
    expect(plan.limitations[0]).toContain("coach validation");
  });

  it("marks external integrations as requiring configuration", () => {
    const dashboard = buildEcosystemDashboard();

    expect(dashboard.integrations.every((provider) => provider.status === "requires_configuration")).toBe(true);
    expect(dashboard.marketplace.find((item) => item.type === "premium")?.priceLabel).toBe("Payments disabled");
    expect(dashboard.cloudJobs.find((job) => job.type === "video_analysis")?.progress).toBe(0);
  });
});
