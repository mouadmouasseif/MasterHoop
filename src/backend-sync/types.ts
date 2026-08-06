import type { AICoachRecommendationV4, GeneratedTrainingPlan } from "@/src/ai-coach/types";
import type { TrainingPlan, VideoComment, VideoDrawing } from "@/src/coaches/types";
import type { ClubDashboardSnapshot, ClubReport } from "@/src/clubs/types";
import type { MarketplaceItem, TournamentSnapshot } from "@/src/ecosystem/types";
import type { EliteAnalyticsReport, ScoutingReport } from "@/src/elite/types";
import type { MatchIntelligenceDashboard } from "@/src/match-intelligence/types";

export type BackendSyncStatus = "synced" | "pending" | "offline_fallback" | "permission_denied" | "failed";

export type BackendSyncCollection =
  | "coachComments"
  | "coachDrawings"
  | "trainingPlans"
  | "aiCoachPlans"
  | "clubSnapshots"
  | "clubReports"
  | "scoutingReports"
  | "eliteReports"
  | "matchReports"
  | "tournaments"
  | "marketplaceDrafts";

export interface BackendSyncResult {
  status: BackendSyncStatus;
  collection: BackendSyncCollection;
  id: string;
  fallbackKey?: string;
  errorCode?: string;
}

export interface SyncActor {
  uid: string;
  role: "athlete" | "coach" | "club_admin" | "super_admin";
  clubId?: string;
}

export interface BackendSyncEnvelope<T> {
  id: string;
  ownerId: string;
  athleteId?: string;
  coachId?: string;
  clubId?: string;
  status: "draft" | "pending_validation" | "validated" | "published" | "archived";
  payload: T;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type SyncablePayload =
  | VideoComment
  | VideoDrawing
  | TrainingPlan
  | AICoachRecommendationV4
  | GeneratedTrainingPlan
  | ClubDashboardSnapshot
  | ClubReport
  | ScoutingReport
  | EliteAnalyticsReport
  | MatchIntelligenceDashboard
  | TournamentSnapshot
  | MarketplaceItem;
