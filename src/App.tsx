import { useEffect, useState, useCallback } from "react";
import { AnimatePresence } from "motion/react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { activeFirebaseAuthDomain, activeFirebaseProjectId, auth, db, loginWithGoogle } from "@/src/lib/firebase";

import Sidebar from "@/src/components/layout/Sidebar";
import Navbar from "@/src/components/layout/Navbar";
import Footer from "@/src/components/layout/Footer";

import LandingPage from "@/src/pages/LandingPage";
import LiveTraining from "@/src/pages/LiveTraining";
import DrillsPage from "@/src/pages/DrillsPage";
import Dashboard from "@/src/pages/Dashboard";
import CoachPage from "@/src/pages/CoachPage";
import HistoryPage from "@/src/pages/HistoryPage";
import ProfilePage from "@/src/pages/ProfilePage";

import CompleteProfile from "@/src/components/auth/CompleteProfile";

import type { ActiveTab, UserProfile } from "@/src/types";

export default function App() {

  // ================= ALL HOOKS (STRICT ORDER) =================
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>("live");

  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isImmersive, setIsImmersive] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // ================= AUTH LISTENER =================
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        setActiveTab("live");

        try {
          const ref = doc(db, "users", firebaseUser.uid);
          const snap = await getDoc(ref);

          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          } else {
            setProfile(null);
            setShowProfileModal(true);
          }
        } catch (err) {
          console.error("Profile load error:", err);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  // ================= HANDLERS =================
  const handleTabChange = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
  }, []);

  const handleGoogleLogin = useCallback(async () => {
    if (authLoading) return;

    setAuthLoading(true);
    setAuthError(null);

    try {
      await loginWithGoogle();
      setActiveTab("live");
    } catch (error) {
      console.error("Google login error:", error);
      const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";

      if (code === "auth/unauthorized-domain") {
        setAuthError(
          `Domaine non autorise Firebase. Origine actuelle: ${window.location.origin}. Projet actif: ${activeFirebaseProjectId} (${activeFirebaseAuthDomain}). Ajoute localhost et 127.0.0.1 dans Firebase Console > Authentication > Settings > Authorized domains du bon projet.`
        );
      } else if (code === "auth/cancelled-popup-request") {
        setAuthError("Une connexion Google est deja en cours. Ferme l'autre popup puis reessaie.");
      } else if (code === "auth/popup-closed-by-user") {
        setAuthError("Popup Google fermee avant la fin de connexion.");
      } else {
        setAuthError("Connexion Google impossible. Verifie que apiKey, appId, messagingSenderId, authDomain et projectId viennent tous du meme projet Firebase.");
      }
    } finally {
      setAuthLoading(false);
    }
  }, [authLoading]);

  // ================= LOADING SCREEN =================
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-brand-dark text-white">
        Loading MasterHoop...
      </div>
    );
  }

  // ================= AUTH GATE =================
  if (!user) {
    return (
      <LandingPage
        onStart={handleGoogleLogin}
        onGoogleLogin={handleGoogleLogin}
        isAuthLoading={authLoading}
        authError={authError}
      />
    );
  }

  // ================= PAGE ROUTER =================
  const renderPage = () => {
    switch (activeTab) {
      case "live":
        return (
          <LiveTraining
            isImmersive={isImmersive}
            setIsImmersive={setIsImmersive}
          />
        );

      case "drills":
        return <DrillsPage onStartDrill={() => setActiveTab("live")} />;

      case "stats":
        return <Dashboard />;

      case "coach":
        return <CoachPage />;

      case "history":
        return <HistoryPage />;

      case "profile":
        return (
          <ProfilePage
            user={user}
            profile={profile}
            sessions={[]}
            onEditProfile={() => setShowProfileModal(true)}
          />
        );

      default:
        return <LiveTraining />;
    }
  };

  // ================= UI =================
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col md:flex-row overflow-hidden">
      
      {/* SIDEBAR */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isImmersive={isImmersive}
      />
      
      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
 
        {/* NAVBAR */}
        <Navbar
          activeTab={activeTab}
          user={user}
          profile={profile}
          walletAddress={null}
          isImmersive={isImmersive}
          onGoogleLogin={() => {}}
          onMetaMaskLogin={() => {}}
          onOpenProfile={() => setShowProfileModal(true)}
          onDisconnectWallet={() => {}}
        />

        {/* ROUTER */}
        <AnimatePresence mode="wait">
          {renderPage()}
        </AnimatePresence>

        {!isImmersive && <Footer />}
      </main>

      {/* PROFILE MODAL */}
      <AnimatePresence>
        {showProfileModal && (
          <CompleteProfile
            user={user}
            profile={profile}
            onClose={() => setShowProfileModal(false)}
            onSave={(data) => {
              setProfile((prev) => ({
                userId: user.uid,
                totalSessions: prev?.totalSessions || 0,
                avgAccuracy: prev?.avgAccuracy || 0,
                bestAccuracy: prev?.bestAccuracy || 0,
                preferredShot: prev?.preferredShot || "Jump Shot",
                name: data.name || prev?.name || user.displayName || "Joueur Master Hoop",
                age: Number(data.age || prev?.age || 0),
                height: Number(data.height || prev?.height || 0),
                weight: Number(data.weight || prev?.weight || 0),
                basketballPosition: data.basketballPosition || prev?.basketballPosition,
              }));
              setShowProfileModal(false);
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
