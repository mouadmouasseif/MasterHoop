import {
  BookOpen,
  Brain,
  Camera,
  History,
  LayoutDashboard,
  Settings,
  UserRound,
} from "lucide-react";

import { cn } from "@/src/lib/utils";
import masterHoopLogo from "@/src/assets/master-hoop-logo.png";
import type { ActiveTab } from "@/src/types";
import NavButton from "@/src/components/ui/NavButton";

export default function Sidebar({
  activeTab,
  setActiveTab,
  isImmersive,
  setIsImmersive,
}: {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isImmersive: boolean;
  setIsImmersive?: (value: boolean) => void;
}) {
  const navigate = (tab: ActiveTab) => {
    setActiveTab(tab);

    // UX PRO: quitter immersive si on change de page
    if (tab !== "live" && setIsImmersive) {
      setIsImmersive(false);
    }
  };

  return (
    <nav
      className={cn(
        "w-full md:w-20 bg-brand-surface/80 backdrop-blur-xl border-b md:border-r border-white/5 flex flex-row md:flex-col items-center py-3 md:py-8 sticky top-0 z-50 transition-all duration-500",

        // UX IMMERSIVE MODE (soft fade, pas de blocage)
        isImmersive &&
          activeTab === "live" &&
          "md:opacity-20 md:scale-95 md:hover:opacity-100"
      )}
    >
      {/* LOGO */}
      <div className="hidden md:flex mb-10">
        <img
          src={masterHoopLogo}
          alt="Master Hoop"
          className="h-11 w-11 rounded-xl object-cover ring-1 ring-white/10 shadow-lg shadow-brand-orange/30"
        />
      </div>

      {/* NAV ITEMS */}
      <div className="flex flex-row md:flex-col gap-5 px-3 md:px-0 w-full justify-around md:justify-start">
        
        <NavButton
          active={activeTab === "live"}
          onClick={() => navigate("live")}
          icon={<Camera />}
          label="Live"
        />

        <NavButton
          active={activeTab === "drills"}
          onClick={() => navigate("drills")}
          icon={<BookOpen />}
          label="Drills"
        />

        <NavButton
          active={activeTab === "stats"}
          onClick={() => navigate("stats")}
          icon={<LayoutDashboard />}
          label="Stats"
        />

        <NavButton
          active={activeTab === "coach"}
          onClick={() => navigate("coach")}
          icon={<Brain />}
          label="Coach AI"
        />

        <NavButton
          active={activeTab === "history"}
          onClick={() => navigate("history")}
          icon={<History />}
          label="History"
        />

        <NavButton
          active={activeTab === "profile"}
          onClick={() => navigate("profile")}
          icon={<UserRound />}
          label="Profil"
        />
      </div>

      {/* SETTINGS */}
      <div className="mt-auto hidden md:flex pb-4">
        <NavButton
          active={false}
          icon={<Settings />}
          label="Settings"
          onClick={() => {}}
        />
      </div>
    </nav>
  );
}