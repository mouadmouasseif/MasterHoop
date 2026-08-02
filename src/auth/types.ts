import type { User as FirebaseUser } from "firebase/auth";
import type { UserProfile } from "@/src/types";

export type UserRole = "super_admin" | "club_admin" | "coach" | "athlete";

export type AccountStatus = "active" | "suspended" | "invited";

export interface ResolvedUserProfile extends UserProfile {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  accountStatus: AccountStatus;
  athleteIds: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AuthState {
  user: FirebaseUser | null;
  profile: ResolvedUserProfile | null;
  loading: boolean;
  error: string | null;
  profileExists: boolean;
  refreshProfile(): Promise<void>;
}

export type InvitationType = "club_admin" | "coach" | "athlete" | "coach_athlete";
export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";

export interface Invitation {
  id: string;
  type: InvitationType;
  email?: string;
  senderId: string;
  recipientId?: string;
  clubId?: string;
  coachId?: string;
  status: InvitationStatus;
  expiresAt: unknown;
  createdAt: unknown;
}

export function resolveLegacyProfile(
  user: FirebaseUser,
  profile: UserProfile | null,
): ResolvedUserProfile {
  const role = isUserRole(profile?.role) ? profile.role : "athlete";
  const displayName =
    profile?.displayName || profile?.fullName || profile?.name || user.displayName || "Joueur BasketMotion";

  return {
    userId: user.uid,
    id: user.uid,
    uid: user.uid,
    name: profile?.name || displayName,
    displayName,
    email: profile?.email || user.email || "",
    photoURL: profile?.photoURL || user.photoURL || undefined,
    role,
    clubId: profile?.clubId,
    coachId: profile?.coachId,
    athleteIds: Array.isArray(profile?.athleteIds) ? profile.athleteIds : [],
    accountStatus: isAccountStatus(profile?.accountStatus) ? profile.accountStatus : "active",
    createdAt: profile?.createdAt,
    updatedAt: profile?.updatedAt,
    username: profile?.username,
    fullName: profile?.fullName,
    uniquePlayerId: profile?.uniquePlayerId,
    qrCode: profile?.qrCode,
    followers: profile?.followers,
    following: profile?.following,
    teams: profile?.teams,
    age: finiteNumber(profile?.age),
    height: finiteNumber(profile?.height),
    weight: finiteNumber(profile?.weight),
    totalSessions: finiteNumber(profile?.totalSessions),
    avgAccuracy: finiteNumber(profile?.avgAccuracy),
    bestAccuracy: finiteNumber(profile?.bestAccuracy),
    preferredShot: profile?.preferredShot || "Jump Shot",
    basketballPosition: profile?.basketballPosition,
  };
}

export function isUserRole(value: unknown): value is UserRole {
  return value === "super_admin" || value === "club_admin" || value === "coach" || value === "athlete";
}

function isAccountStatus(value: unknown): value is AccountStatus {
  return value === "active" || value === "suspended" || value === "invited";
}

function finiteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
