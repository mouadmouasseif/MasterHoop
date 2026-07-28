import { describe, expect, it } from "vitest";
import { buildMatchSummary, calculateMatchScore } from "@/src/services/matchScoreService";
import type { MatchEvent } from "@/src/types/match";

const events: MatchEvent[] = [
  { id: "e1", type: "match_started", timestamp: 0, team: "A", playerId: "p1" },
  { id: "e2", type: "made_shot", timestamp: 12, team: "A", playerId: "p1", points: 2 },
  { id: "e3", type: "missed_shot", timestamp: 18, team: "B", playerId: "p2" },
  { id: "e4", type: "made_shot", timestamp: 30, team: "B", playerId: "p2", points: 3 },
];

describe("matchScoreService", () => {
  it("calculates score only from made shots", () => {
    expect(calculateMatchScore(events)).toEqual({ A: 2, B: 3 });
  });

  it("builds a summary with player stats and highlights", () => {
    const summary = buildMatchSummary("m1", events);

    expect(summary.winner).toBe("B");
    expect(summary.playerStats[0].playerId).toBe("p2");
    expect(summary.highlights.length).toBe(2);
  });
});
