import { describe, expect, it } from "vitest";
import {
  buildMatchIntelligenceDashboard,
  createMatchEvent,
  importManualTimeline,
  rejectSuggestedEvent,
  validateSuggestedEvent,
} from "@/src/match-intelligence/matchIntelligenceEngine";
import type { MatchSetup } from "@/src/match-intelligence/types";

const setup: MatchSetup = {
  matchId: "match-1",
  homeTeam: "BasketMotion A",
  awayTeam: "BasketMotion B",
  periodLengthMinutes: 10,
  periods: 4,
  roster: [
    { id: "a1", name: "James L.", number: 7, team: "A" },
    { id: "b1", name: "Noah W.", number: 11, team: "B" },
  ],
};

describe("matchIntelligenceEngine", () => {
  it("builds score, timeline and team stats from validated events", () => {
    const dashboard = buildMatchIntelligenceDashboard(setup, [
      createMatchEvent({ timestamp: 0, type: "match_started", team: "A", playerId: "a1" }),
      createMatchEvent({ timestamp: 12, type: "possession", team: "A", playerId: "a1" }),
      createMatchEvent({ timestamp: 18, type: "made_shot", team: "A", playerId: "a1", points: 3 }),
      createMatchEvent({ timestamp: 21, type: "assist", team: "A", playerId: "a1" }),
      createMatchEvent({ timestamp: 30, type: "turnover", team: "B", playerId: "b1" }),
    ]);

    expect(dashboard.score).toEqual({ A: 3, B: 0 });
    expect(dashboard.teamStats.possessions).toBe(1);
    expect(dashboard.teamStats.assists).toBe(1);
    expect(dashboard.teamStats.turnovers).toBe(1);
  });

  it("keeps suggested events in validation queue until accepted", () => {
    const suggested = createMatchEvent({ timestamp: 18, type: "made_shot", team: "A", playerId: "a1", points: 2, confidence: 0.62, status: "suggested" });
    const pending = buildMatchIntelligenceDashboard(setup, [suggested]);
    const accepted = buildMatchIntelligenceDashboard(setup, validateSuggestedEvent([suggested], suggested.id));

    expect(pending.validationQueue).toHaveLength(1);
    expect(accepted.validationQueue).toHaveLength(0);
    expect(accepted.timeline[0].status).toBe("validated");
  });

  it("excludes rejected suggestions from official score", () => {
    const suggested = createMatchEvent({ timestamp: 18, type: "made_shot", team: "A", playerId: "a1", points: 2, status: "suggested" });
    const dashboard = buildMatchIntelligenceDashboard(setup, rejectSuggestedEvent([suggested], suggested.id));

    expect(dashboard.score).toEqual({ A: 0, B: 0 });
    expect(dashboard.timeline[0].status).toBe("rejected");
  });

  it("imports a simple manual csv timeline", () => {
    const events = importManualTimeline("12,made,A,a1,3\n24,rebound,B,b1");

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("made_shot");
    expect(events[0].points).toBe(3);
    expect(events[1].team).toBe("B");
  });
});
