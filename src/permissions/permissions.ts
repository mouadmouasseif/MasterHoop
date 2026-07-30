import type { UserRole } from "@/src/auth/types";
import type { AnalysisAccessRecord, AthleteAccessRecord, Permission, PermissionUser, RolePermissions } from "@/src/permissions/types";

const ALL_PERMISSIONS: Permission[] = [
  "manage_platform", "manage_clubs", "manage_club", "manage_club_users", "manage_teams",
  "view_global_stats", "view_club_stats", "view_assigned_athletes", "comment_analyses",
  "manage_programs", "manage_drills", "manage_missions", "run_analysis", "view_own_analyses",
  "manage_privacy", "respond_to_association",
];

export const ROLE_PERMISSIONS: RolePermissions = {
  super_admin: new Set(ALL_PERMISSIONS),
  club_admin: new Set(["manage_club", "manage_club_users", "manage_teams", "view_club_stats", "manage_programs", "manage_drills", "manage_missions"]),
  coach: new Set(["view_assigned_athletes", "comment_analyses", "manage_programs", "manage_drills", "manage_missions"]),
  athlete: new Set(["run_analysis", "view_own_analyses", "manage_privacy", "respond_to_association"]),
};

export function hasPermission(user: PermissionUser | null | undefined, permission: Permission): boolean {
  return isActive(user) && ROLE_PERMISSIONS[user.role].has(permission);
}

export function canAccessClub(user: PermissionUser | null | undefined, clubId: string | null | undefined): boolean {
  if (!isActive(user) || !clubId) return false;
  return user.role === "super_admin" || (user.role === "club_admin" && user.clubId === clubId) || (user.role === "coach" && user.clubId === clubId) || (user.role === "athlete" && user.clubId === clubId);
}

export function canAccessAthlete(
  user: PermissionUser | null | undefined,
  athleteId: string,
  athlete?: AthleteAccessRecord | null,
): boolean {
  if (!isActive(user)) return false;
  if (user.role === "super_admin") return true;
  if (user.role === "athlete") return identity(user) === athleteId;
  if (user.role === "coach") {
    return user.athleteIds.includes(athleteId) || athlete?.coachId === identity(user) || Boolean(athlete?.coachIds?.includes(identity(user)));
  }
  return user.role === "club_admin" && Boolean(user.clubId) && user.clubId === athlete?.clubId;
}

export function canAccessAnalysis(user: PermissionUser | null | undefined, analysis: AnalysisAccessRecord): boolean {
  if (!isActive(user)) return false;
  const athleteId = analysis.athleteId || analysis.ownerId || analysis.userId;
  if (!athleteId) return false;
  if (user.role === "super_admin") return true;
  if (user.role === "athlete") return identity(user) === athleteId;
  if (user.role === "coach") {
    return user.athleteIds.includes(athleteId) || analysis.coachId === identity(user);
  }
  return user.role === "club_admin" && Boolean(user.clubId) && user.clubId === analysis.clubId;
}

export function isRoleAllowed(user: PermissionUser | null | undefined, roles: readonly UserRole[]): boolean {
  return isActive(user) && roles.includes(user.role);
}

function identity(user: PermissionUser): string {
  return user.id || user.userId;
}

function isActive(user: PermissionUser | null | undefined): user is PermissionUser {
  return Boolean(user && user.accountStatus === "active");
}
