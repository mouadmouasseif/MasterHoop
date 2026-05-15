import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { addDoc, collection } from "firebase/firestore";

import Sidebar from "@/src/components/layout/Sidebar";
import Navbar from "@/src/components/layout/Navbar";
import Footer from "@/src/components/layout/Footer";

import LiveTraining from "@/src/pages/LiveTraining";
import DrillsPage from "@/src/pages/DrillsPage";
import Dashboard from "@/src/pages/Dashboard";
import CoachPage from "@/src/pages/CoachPage";
import HistoryPage from "@/src/pages/HistoryPage";
import ProfilePage from "@/src/pages/ProfilePage";
import LandingPage from "@/src/pages/LandingPage";


import CompleteProfile from "@/src/components/auth/CompleteProfile";

import { auth, db } from "@/src/lib/firebase";
import type { ActiveTab, UserProfile } from "@/src/types";

export default function App() {
  // ================= STATE =================
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("live");
  const [hasEnteredApp, setHasEnteredApp] = useState(false);

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isImmersive, setIsImmersive] = useState(false);

  // ================= AUTH =================
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        setHasEnteredApp(true);
        setActiveTab("live");
      }
    });

    return () => unsub();
  }, []);

  // ================= VIDEO SAVE =================
  const handleRecordingComplete = async (blob: Blob) => {
    try {
      if (!blob) return;

      const url = URL.createObjectURL(blob);

      await addDoc(collection(db, "sessions"), {
        videoUrl: url,
        createdAt: Date.now(),
      });
    } catch (err) {
      console.error("Save video error:", err);
    }
  };

  // ================= LOGIN SCREEN =================
  if (!hasEnteredApp && !user && !walletAddress) {
    return (
      <LandingPage
        onStart={() => {
          setHasEnteredApp(true);
          setActiveTab("live");
        }}
        onGoogleLogin={() => {
          setHasEnteredApp(true);
          setActiveTab("live");
        }}
      />
    );
  }

  // ================= ROUTER =================
  const renderPage = () => {
    const commonProps = {
      isImmersive,
      setIsImmersive,
      handleRecordingComplete,
    };

    switch (activeTab) {
      case "live":
        return <LiveTraining {...commonProps} />;

      case "drills":
        return <DrillsPage />;

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
        return <LiveTraining {...commonProps} />;
    }
  };

  // ================= UI =================
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col md:flex-row h-screen overflow-hidden">

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isImmersive={isImmersive}
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-8">

        <Navbar
          isImmersive={isImmersive}
          activeTab={activeTab}
          user={user}
          walletAddress={walletAddress}
          profile={profile}
          onGoogleLogin={() => {}}
          onMetaMaskLogin={() => {}}
          onOpenProfile={() => setShowProfileModal(true)}
          onDisconnectWallet={() => setWalletAddress(null)}
        />

        <AnimatePresence mode="wait">
          {renderPage()}
        </AnimatePresence>

        {!isImmersive && <Footer />}
      </main>

      {/* PROFILE MODAL */}
      <AnimatePresence>
        {showProfileModal && (
          <CompleteProfile
            profile={profile}
            user={user}
            onClose={() => setShowProfileModal(false)}
            onSave={(data) => {
              console.log(data);
              setShowProfileModal(false);
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}