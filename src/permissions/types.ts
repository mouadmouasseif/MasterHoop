import type { ResolvedUserProfile, UserRole } from "@/src/auth/types";

export type Permission =
  | "manage_platform"
  | "manage_clubs"
  | "manage_club"
  | "manage_club_users"
  | "manage_teams"
  | "view_global_stats"
  | "view_club_stats"
  | "view_assigned_athletes"
  | "comment_analyses"
  | "manage_programs"
  | "manage_drills"
  | "manage_missions"
  | "run_analysis"
  | "view_own_analyses"
  | "manage_privacy"
  | "respond_to_association";

export type PermissionUser = Pick<
  ResolvedUserProfile,
  "id" | "userId" | "role" | "clubId" | "coachId" | "athleteIds" | "accountStatus"
>;

export interface AthleteAccessRecord {
  id?: string;
  userId?: string;
  clubId?: string;
  coachId?: string;
  coachIds?: string[];
}

export interface AnalysisAccessRecord {
  id?: string;
  ownerId?: string;
  userId?: string;
  athleteId?: string;
  coachId?: string;
  clubId?: string;
}

export type RolePermissions = Record<UserRole, ReadonlySet<Permission>>;
