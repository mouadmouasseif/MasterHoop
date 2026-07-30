import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "@/src/lib/firebase";
import type { UserProfile } from "@/src/types";
import { resolveLegacyProfile, type AuthState, type ResolvedUserProfile } from "@/src/auth/types";

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<ResolvedUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileExists, setProfileExists] = useState(false);

  const loadProfile = useCallback(async (firebaseUser: FirebaseUser) => {
    setError(null);
    try {
      const snapshot = await getDoc(doc(db, "users", firebaseUser.uid));
      const storedProfile = snapshot.exists() ? (snapshot.data() as UserProfile) : null;
      setProfileExists(snapshot.exists());
      setProfile(resolveLegacyProfile(firebaseUser, storedProfile));
    } catch (profileError) {
      setProfile(resolveLegacyProfile(firebaseUser, null));
      setProfileExists(false);
      setError(profileError instanceof Error ? profileError.message : "Le profil n’a pas pu être chargé.");
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user);
  }, [loadProfile, user]);

  useEffect(() => onAuthStateChanged(auth, async (firebaseUser) => {
    setLoading(true);
    setUser(firebaseUser);
    if (firebaseUser) await loadProfile(firebaseUser);
    else {
      setProfile(null);
      setProfileExists(false);
    }
    setLoading(false);
  }), [loadProfile]);

  const value = useMemo<AuthState>(() => ({ user, profile, loading, error, profileExists, refreshProfile }), [error, loading, profile, profileExists, refreshProfile, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthContext doit être utilisé dans AuthProvider.");
  return context;
}
