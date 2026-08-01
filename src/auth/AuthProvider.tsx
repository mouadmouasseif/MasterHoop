import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { getLocalProfile } from "@/src/auth/localProfile";
import { resolveLegacyProfile, type AuthState, type ResolvedUserProfile } from "@/src/auth/types";
import { auth, db } from "@/src/lib/firebase";
import type { UserProfile } from "@/src/types";

const AuthContext = createContext<AuthState | null>(null);

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number) => {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error("Firebase Firestore indisponible.")), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<ResolvedUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileExists, setProfileExists] = useState(false);

  const loadProfile = useCallback(async (firebaseUser: FirebaseUser) => {
    setError(null);

    try {
      const snapshot = await withTimeout(getDoc(doc(db, "users", firebaseUser.uid)), 8000);
      const storedProfile = snapshot.exists() ? (snapshot.data() as UserProfile) : null;
      const localProfile = getLocalProfile(firebaseUser.uid);
      const nextProfile = storedProfile || localProfile;

      setProfileExists(Boolean(nextProfile));
      setProfile(resolveLegacyProfile(firebaseUser, nextProfile));
    } catch (profileError) {
      const localProfile = getLocalProfile(firebaseUser.uid);

      setProfile(resolveLegacyProfile(firebaseUser, localProfile));
      setProfileExists(Boolean(localProfile));
      setError(profileError instanceof Error ? profileError.message : "Le profil n'a pas pu etre charge.");
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user);
  }, [loadProfile, user]);

  useEffect(() => onAuthStateChanged(auth, async (firebaseUser) => {
    setLoading(true);
    setUser(firebaseUser);

    if (firebaseUser) {
      await loadProfile(firebaseUser);
    } else {
      setProfile(null);
      setProfileExists(false);
    }

    setLoading(false);
  }), [loadProfile]);

  const value = useMemo<AuthState>(
    () => ({ user, profile, loading, error, profileExists, refreshProfile }),
    [error, loading, profile, profileExists, refreshProfile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthContext doit etre utilise dans AuthProvider.");
  return context;
}
