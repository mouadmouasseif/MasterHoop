import type {
  CloudJob,
  EcosystemDashboard,
  EcosystemStatus,
  GeneratedTrainingSchedule,
  IntegrationProvider,
  MarketplaceItem,
  TournamentMatch,
  TournamentSnapshot,
  TournamentTeam,
  TrainingGeneratorInput,
} from "@/src/ecosystem/types";

export function buildEcosystemDashboard(input: TrainingGeneratorInput = defaultTrainingInput()): EcosystemDashboard {
  return {
    tournament: buildTournamentSnapshot(seedTeams(), seedMatches()),
    marketplace: seedMarketplace(),
    trainingSchedule: generateTrainingSchedule(input),
    integrations: seedIntegrations(),
    cloudJobs: seedCloudJobs(),
    limitations: [
      "External providers require secure backend configuration.",
      "Payments, federation publishing, wearable telemetry, and cloud AI are not simulated.",
      "Preview modules are local-first until production services are connected.",
    ],
  };
}

export function buildTournamentSnapshot(teams: TournamentTeam[], matches: TournamentMatch[]): TournamentSnapshot {
  return {
    id: "local-tournament",
    name: "BasketMotion Invitational",
    status: "preview",
    teams,
    matches,
    leaderboard: rankTeams(teams),
    limitations: [
      "Tournament publishing and federation sync require backend configuration.",
      "Results are local preview data until Firestore tournament collections are connected.",
    ],
  };
}

export function rankTeams(teams: TournamentTeam[]): TournamentTeam[] {
  return [...teams].sort((a, b) => {
    const winDelta = b.wins - a.wins;
    if (winDelta) return winDelta;
    const diffDelta = pointDiff(b) - pointDiff(a);
    if (diffDelta) return diffDelta;
    return a.seed - b.seed;
  });
}

export function generateTrainingSchedule(input: TrainingGeneratorInput): GeneratedTrainingSchedule {
  const days = Math.max(1, Math.min(7, Math.round(input.daysPerWeek)));
  const focuses = focusPool(input.objective, input.athleteLevel);
  return {
    status: "preview",
    objective: input.objective,
    days: Array.from({ length: days }, (_, index) => ({
      day: `Day ${index + 1}`,
      focus: focuses[index % focuses.length],
      drills: drillsForFocus(focuses[index % focuses.length], input.availableEquipment),
      load: loadForDay(index, days, input.athleteLevel),
    })),
    limitations: ["Generated plans require coach validation before use with athletes."],
  };
}

export function integrationReadiness(provider: IntegrationProvider): EcosystemStatus {
  return provider.requiredConfig.length ? "requires_configuration" : provider.status;
}

function seedTeams(): TournamentTeam[] {
  return [
    { id: "team-a", name: "U18 Elite", seed: 1, wins: 3, losses: 0, pointsFor: 212, pointsAgainst: 176 },
    { id: "team-b", name: "North Academy", seed: 2, wins: 2, losses: 1, pointsFor: 198, pointsAgainst: 190 },
    { id: "team-c", name: "City Hoops", seed: 3, wins: 1, losses: 2, pointsFor: 184, pointsAgainst: 196 },
    { id: "team-d", name: "South Select", seed: 4, wins: 0, losses: 3, pointsFor: 169, pointsAgainst: 201 },
  ];
}

function seedMatches(): TournamentMatch[] {
  return [
    { id: "match-1", round: "Semi-final", teamAId: "team-a", teamBId: "team-d", scoreA: 72, scoreB: 55, status: "completed" },
    { id: "match-2", round: "Semi-final", teamAId: "team-b", teamBId: "team-c", scoreA: 64, scoreB: 61, status: "completed" },
    { id: "match-3", round: "Final", teamAId: "team-a", teamBId: "team-b", status: "scheduled" },
  ];
}

function seedMarketplace(): MarketplaceItem[] {
  return [
    { id: "free-release", title: "Release speed starter", author: "BasketMotion AI", type: "free", status: "active", priceLabel: "Free", tags: ["shooting", "release"], limitations: [] },
    { id: "club-pack", title: "Club weekly development pack", author: "Coach Library", type: "club_only", status: "preview", priceLabel: "Club", tags: ["team", "weekly"], limitations: ["Club publishing requires Firestore permissions."] },
    { id: "premium-elite", title: "Elite scorer program", author: "Verified coach", type: "premium", status: "requires_configuration", priceLabel: "Payments disabled", tags: ["elite", "scoring"], limitations: ["Payments require secure backend configuration."] },
  ];
}

function seedIntegrations(): IntegrationProvider[] {
  return [
    provider("polar", "Polar", "wearable", ["POLAR_CLIENT_ID", "POLAR_CLIENT_SECRET"]),
    provider("garmin", "Garmin", "wearable", ["GARMIN_CONSUMER_KEY", "GARMIN_CONSUMER_SECRET"]),
    provider("apple-health", "Apple Health", "wearable", ["NATIVE_HEALTHKIT_BRIDGE"]),
    provider("whoop", "WHOOP", "wearable", ["WHOOP_CLIENT_ID", "WHOOP_CLIENT_SECRET"]),
    provider("cloud-ai", "Cloud AI queue", "cloud_ai", ["CLOUD_ANALYSIS_QUEUE_URL"]),
    provider("payments", "Marketplace payments", "payment", ["PAYMENT_PROVIDER_SECRET"]),
  ];
}

function seedCloudJobs(): CloudJob[] {
  const now = new Date().toISOString();
  return [
    { id: "job-video-analysis", type: "video_analysis", status: "requires_configuration", queuedAt: now, progress: 0, limitations: ["Cloud video analysis queue is not configured."] },
    { id: "job-report-export", type: "report_export", status: "preview", queuedAt: now, progress: 35, limitations: ["Local export preview only."] },
    { id: "job-model-evaluation", type: "model_evaluation", status: "requires_configuration", queuedAt: now, progress: 0, limitations: ["Model evaluation requires a configured dataset and backend runner."] },
  ];
}

function provider(id: string, name: string, category: IntegrationProvider["category"], requiredConfig: string[]): IntegrationProvider {
  return {
    id,
    name,
    category,
    status: "requires_configuration",
    requiredConfig,
    limitations: ["Integration unavailable until required configuration is provided."],
  };
}

function defaultTrainingInput(): TrainingGeneratorInput {
  return {
    objective: "Improve release speed and late-game decision making",
    athleteLevel: "advanced",
    daysPerWeek: 5,
    availableEquipment: ["ball", "cones", "camera"],
  };
}

function pointDiff(team: TournamentTeam) {
  return team.pointsFor - team.pointsAgainst;
}

function focusPool(objective: string, level: TrainingGeneratorInput["athleteLevel"]) {
  const base = ["Shooting form", "Handle pressure", "Footwork", "Decision reads", "Recovery"];
  if (objective.toLowerCase().includes("defense")) base.splice(2, 0, "Closeout defense");
  if (level === "elite") base.splice(3, 0, "Game speed reads");
  return base;
}

function drillsForFocus(focus: string, equipment: string[]) {
  const hasCamera = equipment.some((item) => item.toLowerCase().includes("camera"));
  if (focus.includes("Shooting")) return hasCamera ? ["Form video capture", "Release speed ladder"] : ["Wall form reps", "Spot shooting"];
  if (focus.includes("Handle")) return ["Cone pressure series", "Weak-hand control"];
  if (focus.includes("Footwork")) return ["1-2 step series", "Balance landing"];
  if (focus.includes("Decision")) return ["20 possession reads", "Advantage choice drill"];
  if (focus.includes("Closeout")) return ["Closeout angle", "Contain and recover"];
  if (focus.includes("Game")) return ["Timed reads", "Fatigue shooting"];
  return ["Mobility", "Light recovery shooting"];
}

function loadForDay(index: number, days: number, level: TrainingGeneratorInput["athleteLevel"]): "low" | "medium" | "high" {
  if (index === days - 1) return "low";
  if (level === "elite" && index % 2 === 0) return "high";
  return index % 3 === 1 ? "high" : "medium";
}
