import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/firebase", () => ({ db: {} }));

import { generateAssistantReport } from "@/src/services/aiAssistantService";
import { buildUserLearningProfile } from "@/src/services/userLearningProfileService";
import type { SessionLike } from "@/src/types/aiAssistant";

describe("aiAssistantService", () => {
  it("generates reports using only provided sessions as evidence", () => {
    const sessions: SessionLike[] = [
      { id: "s1", duration: 600, drillName: "Live", score: 75, createdAt: "", metrics: { madeShots: 7, missedShots: 3 } },
    ];
    const profile = buildUserLearningProfile("u1", sessions);
    const report = generateAssistantReport(profile, sessions);

    expect(report.evidence.sessionIds).toEqual(["s1"]);
    expect(report.evidence.sessionsAnalyzed).toBe(1);
    expect(report.summary).toContain("1 session");
  });
});
