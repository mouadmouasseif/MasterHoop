import {
  BookOpen,
  Brain,
  Camera,
  Bell,
  ChevronDown,
  History,
  LayoutDashboard,
  Shield,
  Settings,
  Swords,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";
import React from "react";
import { useState } from "react";

import { cn } from "@/src/lib/utils";
import basketMotionAiLogo from "@/src/assets/basketmotion-logo.png";
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
  const [gamesOpen, setGamesOpen] = useState(false);
  const gameTabs: ActiveTab[] = ["games", "friends", "teams", "leaderboard", "notifications"];
  const isGamesGroupActive = gameTabs.includes(activeTab);
  const showGamesSubmenu = gamesOpen || isGamesGroupActive;

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
        "fixed left-0 right-0 top-0 z-50 w-full bg-brand-surface/90 px-3 py-2 backdrop-blur-xl transition-all duration-500 md:sticky md:right-auto md:h-screen md:w-20 md:border-r md:border-b-0 md:border-white/5 md:px-0 md:py-8",
        "border-b border-white/5 flex flex-col items-stretch md:items-center",

        // UX IMMERSIVE MODE (soft fade, pas de blocage)
        isImmersive &&
          activeTab === "live" &&
          "md:opacity-20 md:scale-95 md:hover:opacity-100"
      )}
    >
      {/* LOGO */}
      <div className="hidden md:flex mb-10">
        <img
          src={basketMotionAiLogo}
          alt="Basket Motion"
          className="h-11 w-11 rounded-xl object-cover ring-1 ring-white/10 shadow-lg shadow-brand-orange/30"
        />
      </div>

      {/* NAV ITEMS */}
      <div className="flex w-full flex-row justify-start gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 md:flex-col md:justify-start md:gap-5 md:overflow-visible md:px-0 md:pb-0">
        
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
          active={isGamesGroupActive}
          onClick={() => {
            setGamesOpen((open) => !open);
            navigate("games");
          }}
          icon={<Swords />}
          label="Games"
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

      {showGamesSubmenu && (
        <div className="mt-2 flex w-full justify-end md:mt-0 md:justify-center">
          <div className="flex max-w-full flex-row gap-1 overflow-x-auto rounded-xl border border-white/5 bg-black/35 p-1 shadow-lg shadow-black/20 md:-mt-3 md:flex-col md:gap-1 md:overflow-visible md:rounded-2xl">
            <SubNavButton active={activeTab === "games"} onClick={() => navigate("games")} icon={<Swords />} label="Match" />
            <SubNavButton active={activeTab === "friends"} onClick={() => navigate("friends")} icon={<UsersRound />} label="Amis" />
            <SubNavButton active={activeTab === "teams"} onClick={() => navigate("teams")} icon={<Shield />} label="Equipe" />
            <SubNavButton active={activeTab === "leaderboard"} onClick={() => navigate("leaderboard")} icon={<Trophy />} label="Rank" />
            <SubNavButton active={activeTab === "notifications"} onClick={() => navigate("notifications")} icon={<Bell />} label="Alertes" />
            <ChevronDown className="hidden self-center text-white/20 md:block" size={12} />
          </div>
        </div>
      )}

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

function SubNavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center rounded-xl p-2 transition md:flex-col md:gap-1",
        active ? "bg-brand-orange/15 text-brand-orange" : "text-white/35 hover:bg-white/5 hover:text-white",
      )}
      title={label}
    >
      <span>{React.cloneElement(icon as React.ReactElement, { size: 17 } as any)}</span>
      <span className="hidden text-[9px] font-black uppercase tracking-wider md:block">{label}</span>
    </button>
  );
}
