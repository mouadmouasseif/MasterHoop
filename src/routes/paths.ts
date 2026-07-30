import type { UserRole } from "@/src/auth/types";
import type { ActiveTab } from "@/src/types";

export const ROLE_HOME: Record<UserRole, string> = {
  athlete: "/app",
  coach: "/coach",
  club_admin: "/club",
  super_admin: "/admin",
};

export const TAB_PATHS: Record<ActiveTab, string> = {
  live: "/app/analyse/nouvelle",
  drills: "/app/entrainements",
  games: "/app/matchs",
  friends: "/app/communaute",
  teams: "/app/equipes",
  leaderboard: "/app/communaute/classement",
  notifications: "/app/notifications",
  stats: "/app/progression",
  coach: "/app/coach-ia",
  history: "/app/analyse",
  profile: "/app/profil",
};

export function tabForPath(pathname: string): ActiveTab {
  const match = (Object.entries(TAB_PATHS) as [ActiveTab, string][])
    .sort((left, right) => right[1].length - left[1].length)
    .find(([, path]) => pathname === path || pathname.startsWith(`${path}/`));
  return match?.[0] || "stats";
}
