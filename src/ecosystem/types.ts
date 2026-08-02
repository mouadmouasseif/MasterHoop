export type EcosystemStatus = "active" | "preview" | "requires_configuration" | "disabled";

export interface TournamentTeam {
  id: string;
  name: string;
  seed: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
}

export interface TournamentMatch {
  id: string;
  round: string;
  teamAId: string;
  teamBId: string;
  scoreA?: number;
  scoreB?: number;
  status: "scheduled" | "completed";
}

export interface TournamentSnapshot {
  id: string;
  name: string;
  status: EcosystemStatus;
  teams: TournamentTeam[];
  matches: TournamentMatch[];
  leaderboard: TournamentTeam[];
  limitations: string[];
}

export interface MarketplaceItem {
  id: string;
  title: string;
  author: string;
  type: "free" | "premium" | "private" | "club_only";
  status: EcosystemStatus;
  priceLabel: string;
  tags: string[];
  limitations: string[];
}

export interface TrainingGeneratorInput {
  objective: string;
  athleteLevel: "beginner" | "intermediate" | "advanced" | "elite";
  daysPerWeek: number;
  availableEquipment: string[];
}

export interface TrainingDayPlan {
  day: string;
  focus: string;
  drills: string[];
  load: "low" | "medium" | "high";
}

export interface GeneratedTrainingSchedule {
  status: EcosystemStatus;
  objective: string;
  days: TrainingDayPlan[];
  limitations: string[];
}

export interface IntegrationProvider {
  id: string;
  name: string;
  category: "wearable" | "cloud_ai" | "payment" | "federation" | "storage";
  status: EcosystemStatus;
  requiredConfig: string[];
  limitations: string[];
}

export interface CloudJob {
  id: string;
  type: "video_analysis" | "report_export" | "model_evaluation";
  status: EcosystemStatus;
  queuedAt: string;
  progress: number;
  limitations: string[];
}

export interface EcosystemDashboard {
  tournament: TournamentSnapshot;
  marketplace: MarketplaceItem[];
  trainingSchedule: GeneratedTrainingSchedule;
  integrations: IntegrationProvider[];
  cloudJobs: CloudJob[];
  limitations: string[];
}
