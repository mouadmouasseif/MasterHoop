export type MatchEventType =
  | "match_started"
  | "made_shot"
  | "missed_shot"
  | "pass"
  | "rebound"
  | "steal"
  | "score_change"
  | "highlight_generated"
  | "match_finished";

export type MatchInviteStatus =
  | "match_invite_pending"
  | "match_ready"
  | "match_live"
  | "match_finished"
  | "match_cancelled";

export type SocialStatus =
  | "friend_request_pending"
  | "friend_request_accepted"
  | "team_invite_pending"
  | "team_invite_accepted"
  | MatchInviteStatus;

export type MatchEvent = {
  id: string;
  type: MatchEventType;
  timestamp: number;
  team: "A" | "B";
  playerId: string;
  points?: 1 | 2 | 3;
  confidence?: number;
  note?: string;
};

export type MatchTimeline = {
  matchId: string;
  events: MatchEvent[];
};

export type MatchScore = {
  A: number;
  B: number;
};

export type MatchPlayerStats = {
  playerId: string;
  points: number;
  shotsAttempted: number;
  shotsMade: number;
  assists: number;
  rebounds: number;
  steals: number;
  turnovers: number;
  fieldGoalPercentage: number;
};

export type MatchHighlight = {
  id: string;
  matchId: string;
  eventIds: string[];
  title: string;
  startSecond: number;
  endSecond: number;
  videoUrl?: string;
};

export type MatchSummary = {
  matchId: string;
  score: MatchScore;
  winner: "A" | "B" | "draw";
  timeline: MatchTimeline;
  playerStats: MatchPlayerStats[];
  highlights: MatchHighlight[];
  textSummary: string;
};
