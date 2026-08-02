import { describe, expect, it } from "vitest";
import { buildEliteAnalyticsReport, buildFatigueTrendReport, buildScoutingReport } from "@/src/elite/eliteAnalyticsEngine";
import type { EliteAthleteSummary } from "@/src/elite/types";
import type { LocalAnalysis } from "@/src/services/localAnalysisService";

describe("eliteAnalyticsEngine", () => {
  it("blocks scouting when data volume is too low", () => {
    const report = buildScoutingReport("James L.", [analysis({ madeShots: 2, missedShots: 1 })]);

    expect(report.status).toBe("insufficient_data");
    expect(report.priorities[0]).toContain("Record more");
    expect(report.strengths).toEqual([]);
  });

  it("creates confidence weighted scouting without potential score", () => {
    const report = buildScoutingReport("Noah Wilson", [
      analysis({ id: "a", madeShots: 8, missedShots: 4, strengths: ["Release speed"], confidenceScore: 82 }),
      analysis({ id: "b", madeShots: 7, missedShots: 3, weaknesses: ["Late balance"], recommendations: ["Add landing control"], confidenceScore: 78 }),
    ]);

    expect(report.status).toBe("ready");
    expect(report.dataVolume.shots).toBe(22);
    expect(report.strengths).toContain("Release speed");
    expect(report.limitations.join(" ")).toContain("No arbitrary potential score");
  });

  it("labels a declining fatigue trend from observed accuracy", () => {
    const report = buildFatigueTrendReport([
      analysis({ id: "early-1", createdAt: "2026-08-01T10:00:00.000Z", madeShots: 8, missedShots: 2 }),
      analysis({ id: "late-1", createdAt: "2026-08-02T10:00:00.000Z", madeShots: 5, missedShots: 5 }),
    ]);

    expect(report.status).toBe("ready");
    expect(report.label).toBe("declining");
    expect(report.delta).toBe(-30);
  });

  it("builds an overall report with team analytics", () => {
    const athlete: EliteAthleteSummary = {
      id: "athlete-1",
      name: "Noah Wilson",
      role: "Forward",
      analyses: [
        analysis({ id: "a", madeShots: 8, missedShots: 4, score: 86 }),
        analysis({ id: "b", madeShots: 7, missedShots: 3, score: 90 }),
      ],
    };
    const report = buildEliteAnalyticsReport(athlete, [athlete]);

    expect(report.status).not.toBe("insufficient_data");
    expect(report.team.leaders).toContain("Noah Wilson");
    expect(report.limitations.join(" ")).toContain("No professional player comparison");
  });
});

function analysis(overrides: Partial<LocalAnalysis> = {}): LocalAnalysis {
  return {
    id: overrides.id ?? "analysis-1",
    title: "Shooting session",
    source: "upload",
    createdAt: overrides.createdAt ?? "2026-08-01T10:00:00.000Z",
    score: overrides.score ?? 84,
    confidenceScore: overrides.confidenceScore ?? 80,
    qualityScore: overrides.qualityScore ?? 80,
    madeShots: overrides.madeShots ?? 6,
    missedShots: overrides.missedShots ?? 4,
    strengths: overrides.strengths ?? ["Good alignment"],
    weaknesses: overrides.weaknesses ?? ["Late balance"],
    recommendations: overrides.recommendations ?? ["Repeat controlled release drill"],
  };
}
