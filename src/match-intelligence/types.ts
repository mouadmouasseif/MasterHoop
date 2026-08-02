import type { MatchEvent, MatchScore, MatchSummary } from "@/src/types/match";

export type MatchIntelligenceMode = "manual_assisted" | "ai_suggestions" | "automatic_locked";

export interface MatchRosterPlayer {
  id: string;
  name: string;
  number: number;
  team: "A" | "B";
}

export interface MatchSetup {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  periodLengthMinutes: number;
  periods: number;
  roster: MatchRosterPlayer[];
}

export interface MatchValidationQueueItem {
  event: MatchEvent;
  reason: string;
  requiredAction: "validate" | "reject" | "edit";
}

export interface MatchIntelligenceDashboard {
  mode: MatchIntelligenceMode;
  setup: MatchSetup;
  score: MatchScore;
  summary: MatchSummary;
  timeline: MatchEvent[];
  validationQueue: MatchValidationQueueItem[];
  teamStats: {
    possessions: number;
    assists: number;
    rebounds: number;
    steals: number;
    turnovers: number;
    blocks: number;
    fastBreaks: number;
    fouls: number;
  };
  limitations: string[];
}
