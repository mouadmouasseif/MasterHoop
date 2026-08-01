import type { UserProfile } from "@/src/types";

const profileStorageKey = (userId: string) => `basketmotion:profile:${userId}`;

export function getLocalProfile(userId: string): UserProfile | null {
  try {
    const value = window.localStorage.getItem(profileStorageKey(userId));
    return value ? (JSON.parse(value) as UserProfile) : null;
  } catch {
    return null;
  }
}

export function saveLocalProfile(userId: string, profile: UserProfile) {
  window.localStorage.setItem(profileStorageKey(userId), JSON.stringify(profile));
}
