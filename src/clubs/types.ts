export type ClubWorkspaceSection =
  | "dashboard"
  | "players"
  | "coaches"
  | "teams"
  | "matches"
  | "attendance"
  | "training"
  | "performance"
  | "reports"
  | "settings";

export interface ClubPlayer {
  id: string;
  clubId: string;
  fullName: string;
  position: string;
  level: string;
  teamIds: string[];
  coachIds: string[];
  sessionsThisMonth: number;
  averageScore: number;
  attendanceRate: number;
  status: "active" | "invited" | "inactive";
}

export interface ClubCoach {
  id: string;
  clubId: string;
  fullName: string;
  role: "head_coach" | "assistant" | "skills_coach";
  teamIds: string[];
  athletesAssigned: number;
  unreadComments: number;
  status: "active" | "invited" | "inactive";
}

export interface ClubTeam {
  id: string;
  clubId: string;
  name: string;
  mode: "3v3" | "5v5" | "training_group";
  playerIds: string[];
  coachIds: string[];
  averagePerformance: number;
}

export interface ClubMatch {
  id: string;
  clubId: string;
  teamId: string;
  opponent: string;
  date: string;
  status: "scheduled" | "live" | "completed";
  score?: string;
  manuallyValidatedStats: boolean;
}

export interface ClubReport {
  id: string;
  clubId: string;
  title: string;
  type: "athlete" | "team" | "coach" | "season" | "technical" | "attendance";
  createdAt: string;
  status: "draft" | "ready" | "exported";
}

export interface ClubDashboardSnapshot {
  clubId: string;
  players: ClubPlayer[];
  coaches: ClubCoach[];
  teams: ClubTeam[];
  matches: ClubMatch[];
  reports: ClubReport[];
}
