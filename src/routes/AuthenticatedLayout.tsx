import { AnimatePresence } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import type { PoseMetrics } from "@/src/lib/poseDetection";
import { db } from "@/src/lib/firebase";
import { useAuthContext } from "@/src/auth/AuthProvider";
import { saveLocalProfile } from "@/src/auth/localProfile";
import Sidebar from "@/src/components/layout/Sidebar";
import RoleSidebar from "@/src/components/layout/RoleSidebar";
import Navbar from "@/src/components/layout/Navbar";
import Footer from "@/src/components/layout/Footer";
import InstallPrompt from "@/src/components/InstallPrompt";
import CompleteProfile from "@/src/components/auth/CompleteProfile";
import { saveTrainingSession } from "@/src/services/sessionService";
import { AppShellContext, type AppShellState } from "@/src/routes/AppShellContext";
import { TAB_PATHS, tabForPath } from "@/src/routes/paths";
import type { ActiveTab, UserProfile } from "@/src/types";

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, message: string) => {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
};

export default function AuthenticatedLayout() {
  const { user, profile, profileExists, refreshProfile } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [isImmersive, setIsImmersive] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState<PoseMetrics | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);

  useEffect(() => {
    if (user && !profileExists) setShowProfileModal(true);
  }, [profileExists, user]);

  const activeTab = tabForPath(location.pathname);
  const handleTabChange = useCallback((tab: ActiveTab) => {
    if (tab !== "live") setIsImmersive(false);
    navigate(TAB_PATHS[tab]);
  }, [navigate]);

  const handleRecordingChange = useCallback((recording: boolean) => {
    setIsRecording(recording);
    setRecordingStartedAt(recording ? Date.now() : null);
  }, []);

  const handleRecordingComplete = useCallback(async (blob: Blob, metricsOverride?: Partial<PoseMetrics> | null) => {
    if (!user || blob.size === 0) return;
    const duration = recordingStartedAt ? Math.max(1, Math.round((Date.now() - recordingStartedAt) / 1000)) : 0;
    const metricsForSave = metricsOverride || liveMetrics;
    setUploadProgress(1);
    try {
      await saveTrainingSession({
        userId: user.uid,
        videoBlob: blob,
        duration,
        drillName: (metricsForSave as Record<string, unknown> | null | undefined)?.trainingName as string || "Live Training",
        metrics: metricsForSave,
        onProgress: setUploadProgress,
      });
      setHistoryRefreshKey((key) => key + 1);
    } finally {
      window.setTimeout(() => setUploadProgress(0), 1200);
    }
  }, [liveMetrics, recordingStartedAt, user]);

  const shellState = useMemo<AppShellState | null>(() => user && profile ? ({
    user,
    profile,
    isImmersive,
    setIsImmersive,
    isRecording,
    setIsRecording: handleRecordingChange,
    liveMetrics,
    uploadProgress,
    historyRefreshKey,
    handleMetricsUpdate: setLiveMetrics,
    handleRecordingComplete,
    notifySessionSaved: () => setHistoryRefreshKey((key) => key + 1),
    openProfileEditor: () => setShowProfileModal(true),
  }) : null, [handleRecordingChange, handleRecordingComplete, historyRefreshKey, isImmersive, isRecording, liveMetrics, profile, uploadProgress, user]);

  if (!user || !profile || !shellState) return null;

  const hasMobileSubnav = ["games", "friends", "teams", "leaderboard", "notifications"].includes(activeTab);

  const saveProfile = async (data: Partial<UserProfile>) => {
    const nextProfile: UserProfile = {
      userId: user.uid,
      email: user.email || "",
      displayName: data.name || user.displayName || "Joueur BasketMotion-Ai",
      name: data.name || user.displayName || "Joueur BasketMotion-Ai",
      photoURL: user.photoURL || null,
      role: profile.role,
      accountStatus: profile.accountStatus,
      age: Number(data.age),
      height: Number(data.height),
      weight: Number(data.weight),
      basketballPosition: data.basketballPosition || null,
      totalSessions: profile.totalSessions,
      avgAccuracy: profile.avgAccuracy,
      bestAccuracy: profile.bestAccuracy,
      preferredShot: profile.preferredShot,
      createdAt: profile.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    saveLocalProfile(user.uid, nextProfile);

    try {
      await withTimeout(
        setDoc(doc(db, "users", user.uid), nextProfile, { merge: true }),
        10000,
        "Firebase Firestore ne repond pas. Verifie que la base de donnees existe.",
      );
    } catch (error) {
      console.warn("Firestore profile save skipped; using local profile.", error);
    }

    await withTimeout(refreshProfile(), 10000, "Le profil a ete sauvegarde, mais son rechargement a pris trop longtemps.");
    setShowProfileModal(false);
  };

  return (
    <AppShellContext.Provider value={shellState}>
      <div className="min-h-screen bg-brand-dark flex flex-col md:flex-row overflow-hidden">
        {profile.role === "athlete"
          ? <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} isImmersive={isImmersive} setIsImmersive={setIsImmersive} />
          : <RoleSidebar role={profile.role} />}
        <main className={`min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 ${hasMobileSubnav ? "pt-32" : "pt-24"} md:pt-8`}>
          <Navbar activeTab={activeTab} user={user} profile={profile} walletAddress={null} isImmersive={isImmersive} onOpenProfile={() => setShowProfileModal(true)} onDisconnectWallet={() => undefined} />
          <Outlet />
          {!isImmersive && <Footer />}
        </main>
        <AnimatePresence>
          {showProfileModal && <CompleteProfile user={user} profile={profile} onClose={() => profileExists && setShowProfileModal(false)} onSave={saveProfile} />}
        </AnimatePresence>
        <InstallPrompt />
      </div>
    </AppShellContext.Provider>
  );
}
