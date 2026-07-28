import type { MatchEvent, MatchHighlight, MatchPlayerStats, MatchScore, MatchSummary } from "@/src/types/match";

export function applyMatchEvent(score: MatchScore, event: MatchEvent): MatchScore {
  if (event.type !== "made_shot" || !event.points) return score;
  return { ...score, [event.team]: score[event.team] + event.points };
}

export function calculateMatchScore(events: MatchEvent[]): MatchScore {
  return events.reduce((score, event) => applyMatchEvent(score, event), { A: 0, B: 0 });
}

export function calculatePlayerStats(events: MatchEvent[]): MatchPlayerStats[] {
  const stats = new Map<string, MatchPlayerStats>();
  const get = (playerId: string) => {
    const current = stats.get(playerId) || {
      playerId,
      points: 0,
      shotsAttempted: 0,
      shotsMade: 0,
      assists: 0,
      rebounds: 0,
      steals: 0,
      turnovers: 0,
      fieldGoalPercentage: 0,
    };
    stats.set(playerId, current);
    return current;
  };

  events.forEach((event) => {
    const player = get(event.playerId);
    if (event.type === "made_shot") {
      player.points += event.points || 2;
      player.shotsAttempted += 1;
      player.shotsMade += 1;
    } else if (event.type === "missed_shot") {
      player.shotsAttempted += 1;
    } else if (event.type === "pass") {
      player.assists += 1;
    } else if (event.type === "rebound") {
      player.rebounds += 1;
    } else if (event.type === "steal") {
      player.steals += 1;
    }
    player.fieldGoalPercentage = Math.round((player.shotsMade / Math.max(1, player.shotsAttempted)) * 100);
  });

  return [...stats.values()].sort((a, b) => b.points - a.points);
}

export function generateHighlights(matchId: string, events: MatchEvent[]): MatchHighlight[] {
  return events
    .filter((event) => event.type === "made_shot" || event.type === "steal" || event.type === "highlight_generated")
    .slice(-12)
    .map((event, index) => ({
      id: `${matchId}-highlight-${index + 1}`,
      matchId,
      eventIds: [event.id],
      title: event.type === "made_shot" ? `${event.points || 2} points Team ${event.team}` : "Action defensive",
      startSecond: Math.max(0, event.timestamp - 4),
      endSecond: event.timestamp + 3,
    }));
}

export function buildMatchSummary(matchId: string, events: MatchEvent[]): MatchSummary {
  const score = calculateMatchScore(events);
  const winner = score.A === score.B ? "draw" : score.A > score.B ? "A" : "B";
  const playerStats = calculatePlayerStats(events);
  const highlights = generateHighlights(matchId, events);

  return {
    matchId,
    score,
    winner,
    timeline: { matchId, events },
    playerStats,
    highlights,
    textSummary: createTextSummary(score, winner, playerStats, highlights.length),
  };
}

function createTextSummary(score: MatchScore, winner: MatchSummary["winner"], stats: MatchPlayerStats[], highlightCount: number) {
  const leader = stats[0];
  const winnerText = winner === "draw" ? "Match nul" : `Team ${winner} gagne`;
  const leaderText = leader ? ` Meilleur marqueur: ${leader.playerId} avec ${leader.points} points.` : "";
  return `${winnerText} ${score.A}-${score.B}.${leaderText} ${highlightCount} highlight(s) prepares.`;
}
