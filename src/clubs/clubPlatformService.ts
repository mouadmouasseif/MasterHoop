import { basketmotionFilename, CURRENT_LOCAL_PREFIX } from "@/src/shared/brand";
import { getLocalStorageWithLegacy } from "@/src/shared/legacyMigration";
import type { ClubCoach, ClubDashboardSnapshot, ClubMatch, ClubPlayer, ClubReport, ClubTeam } from "@/src/clubs/types";

const STORAGE_KEY = `${CURRENT_LOCAL_PREFIX}:club-platform:snapshot`;
const LEGACY_KEYS = ["BasketMotion-AiClubSnapshot", "masterhoop_club_snapshot"];

export function getClubDashboardSnapshot(clubId = "club-demo"): ClubDashboardSnapshot {
  const stored = readSnapshot();
  if (stored && stored.clubId === clubId) return stored;
  return buildDefaultClubSnapshot(clubId);
}

export function saveClubDashboardSnapshot(snapshot: ClubDashboardSnapshot) {
  if (typeof window === "undefined") return snapshot;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  return snapshot;
}

export function buildClubMetrics(snapshot: ClubDashboardSnapshot) {
  const activePlayers = snapshot.players.filter((player) => player.status === "active");
  const activeCoaches = snapshot.coaches.filter((coach) => coach.status === "active");
  const averagePerformance = average(activePlayers.map((player) => player.averageScore));
  const attendance = average(activePlayers.map((player) => player.attendanceRate));
  const sessions = activePlayers.reduce((sum, player) => sum + player.sessionsThisMonth, 0);
  const unreadComments = activeCoaches.reduce((sum, coach) => sum + coach.unreadComments, 0);
  const completedMatches = snapshot.matches.filter((match) => match.status === "completed").length;

  return {
    players: activePlayers.length,
    coaches: activeCoaches.length,
    teams: snapshot.teams.length,
    matches: snapshot.matches.length,
    completedMatches,
    attendance,
    averagePerformance,
    sessions,
    reportsReady: snapshot.reports.filter((report) => report.status === "ready").length,
    unreadComments,
  };
}

export function filterClubPlayers(players: ClubPlayer[], query: string) {
  const clean = query.trim().toLowerCase();
  if (!clean) return players;
  return players.filter((player) =>
    [player.fullName, player.position, player.level, player.status].some((value) => value.toLowerCase().includes(clean)),
  );
}

export function createClubReport(snapshot: ClubDashboardSnapshot, type: ClubReport["type"]) {
  const report: ClubReport = {
    id: `club-report-${Date.now()}`,
    clubId: snapshot.clubId,
    title: `${labelForReportType(type)} Report`,
    type,
    createdAt: new Date().toISOString(),
    status: "ready",
  };
  return saveClubDashboardSnapshot({ ...snapshot, reports: [report, ...snapshot.reports] });
}

export function buildClubCsv(snapshot: ClubDashboardSnapshot) {
  const header = ["type", "id", "name", "status", "score", "attendance"];
  const playerRows = snapshot.players.map((player) => [
    "player",
    player.id,
    player.fullName,
    player.status,
    player.averageScore,
    player.attendanceRate,
  ]);
  const coachRows = snapshot.coaches.map((coach) => [
    "coach",
    coach.id,
    coach.fullName,
    coach.status,
    coach.athletesAssigned,
    "",
  ]);
  return [header, ...playerRows, ...coachRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildClubJson(snapshot: ClubDashboardSnapshot) {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    clubId: snapshot.clubId,
    metrics: buildClubMetrics(snapshot),
    players: snapshot.players,
    coaches: snapshot.coaches,
    teams: snapshot.teams,
    matches: snapshot.matches,
    reports: snapshot.reports,
  }, null, 2);
}

export function downloadClubCsv(snapshot: ClubDashboardSnapshot) {
  downloadBlob(basketmotionFilename("club-report", "csv"), new Blob([buildClubCsv(snapshot)], { type: "text/csv;charset=utf-8" }));
}

export function downloadClubJson(snapshot: ClubDashboardSnapshot) {
  downloadBlob(basketmotionFilename("club-report", "json"), new Blob([buildClubJson(snapshot)], { type: "application/json;charset=utf-8" }));
}

export function buildDefaultClubSnapshot(clubId: string): ClubDashboardSnapshot {
  const players: ClubPlayer[] = [
    { id: "player-1", clubId, fullName: "James L.", position: "Guard", level: "Elite prospect", teamIds: ["team-a"], coachIds: ["coach-1"], sessionsThisMonth: 18, averageScore: 85, attendanceRate: 92, status: "active" },
    { id: "player-2", clubId, fullName: "Liam Johnson", position: "Wing", level: "Advanced", teamIds: ["team-a"], coachIds: ["coach-1"], sessionsThisMonth: 14, averageScore: 74, attendanceRate: 84, status: "active" },
    { id: "player-3", clubId, fullName: "Noah Wilson", position: "Forward", level: "Elite prospect", teamIds: ["team-b"], coachIds: ["coach-2"], sessionsThisMonth: 21, averageScore: 90, attendanceRate: 96, status: "active" },
    { id: "player-4", clubId, fullName: "Ethan O.", position: "Center", level: "Development", teamIds: ["team-b"], coachIds: ["coach-2"], sessionsThisMonth: 9, averageScore: 68, attendanceRate: 76, status: "active" },
  ];

  const coaches: ClubCoach[] = [
    { id: "coach-1", clubId, fullName: "Maya Carter", role: "head_coach", teamIds: ["team-a"], athletesAssigned: 12, unreadComments: 4, status: "active" },
    { id: "coach-2", clubId, fullName: "Omar Benali", role: "skills_coach", teamIds: ["team-b"], athletesAssigned: 10, unreadComments: 2, status: "active" },
    { id: "coach-3", clubId, fullName: "Sarah Miles", role: "assistant", teamIds: [], athletesAssigned: 0, unreadComments: 0, status: "invited" },
  ];

  const teams: ClubTeam[] = [
    { id: "team-a", clubId, name: "U18 Elite", mode: "5v5", playerIds: ["player-1", "player-2"], coachIds: ["coach-1"], averagePerformance: 82 },
    { id: "team-b", clubId, name: "Development Squad", mode: "training_group", playerIds: ["player-3", "player-4"], coachIds: ["coach-2"], averagePerformance: 79 },
  ];

  const matches: ClubMatch[] = [
    { id: "match-1", clubId, teamId: "team-a", opponent: "North Academy", date: "2026-08-12", status: "scheduled", manuallyValidatedStats: false },
    { id: "match-2", clubId, teamId: "team-b", opponent: "City Hoops", date: "2026-07-28", status: "completed", score: "68-61", manuallyValidatedStats: true },
  ];

  const reports: ClubReport[] = [
    { id: "report-1", clubId, title: "U18 Elite Technical Report", type: "technical", createdAt: "2026-08-01T12:00:00.000Z", status: "ready" },
    { id: "report-2", clubId, title: "Attendance Summary", type: "attendance", createdAt: "2026-07-31T12:00:00.000Z", status: "draft" },
  ];

  return { clubId, players, coaches, teams, matches, reports };
}

function readSnapshot(): ClubDashboardSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const value = getLocalStorageWithLegacy(STORAGE_KEY, LEGACY_KEYS, "");
    return value ? JSON.parse(value) as ClubDashboardSnapshot : null;
  } catch {
    return null;
  }
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function labelForReportType(type: ClubReport["type"]) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
