import { buildMatchSummary } from "@/src/services/matchScoreService";
import type { MatchEvent } from "@/src/types/match";
import type { MatchIntelligenceDashboard, MatchSetup, MatchValidationQueueItem } from "@/src/match-intelligence/types";

const LOW_CONFIDENCE_THRESHOLD = 0.7;

export function createMatchEvent(input: Omit<MatchEvent, "id" | "status"> & { id?: string; status?: MatchEvent["status"] }): MatchEvent {
  return {
    ...input,
    id: input.id ?? `event-${input.timestamp}-${input.type}-${input.playerId}`,
    status: input.status ?? "manual",
  };
}

export function buildMatchIntelligenceDashboard(setup: MatchSetup, events: MatchEvent[]): MatchIntelligenceDashboard {
  const ordered = normalizeTimeline(events);
  const validated = ordered.filter((event) => event.status !== "rejected");
  const summary = buildMatchSummary(setup.matchId, validated);
  const validationQueue = buildValidationQueue(ordered);

  return {
    mode: "manual_assisted",
    setup,
    score: summary.score,
    summary,
    timeline: ordered,
    validationQueue,
    teamStats: calculateTeamStats(validated),
    limitations: [
      "Match Intelligence Sprint 6 is manual assisted.",
      "AI suggested events require coach validation before they affect official reports.",
      "Automatic match statistics remain locked until specialized models are trained and validated.",
    ],
  };
}

export function validateSuggestedEvent(events: MatchEvent[], eventId: string): MatchEvent[] {
  return events.map((event) => event.id === eventId ? { ...event, status: "validated" } : event);
}

export function rejectSuggestedEvent(events: MatchEvent[], eventId: string): MatchEvent[] {
  return events.map((event) => event.id === eventId ? { ...event, status: "rejected" } : event);
}

export function importManualTimeline(text: string, defaultTeam: "A" | "B" = "A"): MatchEvent[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => parseTimelineLine(line, index, defaultTeam));
}

function parseTimelineLine(line: string, index: number, defaultTeam: "A" | "B"): MatchEvent {
  const parts = line.split(",").map((part) => part.trim());
  const timestamp = Math.max(0, Number(parts[0] || index * 24));
  const type = normalizeType(parts[1]);
  const team = parts[2] === "B" ? "B" : parts[2] === "A" ? "A" : defaultTeam;
  const playerId = parts[3] || `${team}-player`;
  const points = type === "made_shot" ? normalizePoints(parts[4]) : undefined;
  return createMatchEvent({
    id: `import-${index + 1}`,
    timestamp,
    type,
    team,
    playerId,
    points,
    confidence: 1,
    status: "manual",
    note: parts[5] || "Imported manually",
  });
}

function normalizeTimeline(events: MatchEvent[]) {
  return [...events].sort((a, b) => a.timestamp - b.timestamp);
}

function buildValidationQueue(events: MatchEvent[]): MatchValidationQueueItem[] {
  return events
    .filter((event) => event.status !== "validated" && event.status !== "rejected")
    .filter((event) => event.status === "suggested" || (event.confidence ?? 1) < LOW_CONFIDENCE_THRESHOLD)
    .map((event) => ({
      event,
      reason: event.status === "suggested" ? "AI suggestion requires coach validation." : "Low confidence event requires review.",
      requiredAction: "validate",
    }));
}

function calculateTeamStats(events: MatchEvent[]) {
  return {
    possessions: count(events, "possession"),
    assists: count(events, "assist") + count(events, "pass"),
    rebounds: count(events, "rebound"),
    steals: count(events, "steal"),
    turnovers: count(events, "turnover"),
    blocks: count(events, "block"),
    fastBreaks: count(events, "fast_break"),
    fouls: count(events, "foul"),
  };
}

function count(events: MatchEvent[], type: MatchEvent["type"]) {
  return events.filter((event) => event.type === type).length;
}

function normalizeType(value?: string): MatchEvent["type"] {
  const key = (value || "possession").toLowerCase().replace(/\s+/g, "_");
  if (key === "made" || key === "score" || key === "made_shot") return "made_shot";
  if (key === "miss" || key === "missed" || key === "missed_shot") return "missed_shot";
  if (key === "assist") return "assist";
  if (key === "rebound") return "rebound";
  if (key === "steal") return "steal";
  if (key === "turnover") return "turnover";
  if (key === "block") return "block";
  if (key === "fast_break") return "fast_break";
  if (key === "foul") return "foul";
  if (key === "timeout") return "timeout";
  if (key === "substitution") return "substitution";
  return "possession";
}

function normalizePoints(value?: string): 1 | 2 | 3 {
  if (value === "1" || value === "3") return Number(value) as 1 | 3;
  return 2;
}
