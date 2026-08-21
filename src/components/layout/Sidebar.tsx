import {
  BarChart3,
  Bell,
  Camera,
  CalendarDays,
  ChartNoAxesCombined,
  Dumbbell,
  FileSearch,
  Home,
  LogOut,
  Menu,
  Settings,
  SlidersHorizontal,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";

import basketMotionAiLogo from "@/src/assets/basketmotion-logo.png";
import { cn } from "@/src/lib/utils";
import type { ActiveTab } from "@/src/types";

const primaryItems: Array<{ tab: ActiveTab; label: string; icon: ReactNode; indent?: boolean }> = [
  { tab: "stats", label: "Tableau de bord", icon: <Home size={17} /> },
  { tab: "history", label: "Analyses", icon: <FileSearch size={17} /> },
  { tab: "live", label: "Nouvelle analyse", icon: <span className="h-1.5 w-1.5 rounded-full bg-current" />, indent: true },
  { tab: "history", label: "Mes analyses", icon: <span className="h-1.5 w-1.5 rounded-full bg-current" />, indent: true },
  { tab: "games", label: "Comparaisons", icon: <SlidersHorizontal size={17} /> },
  { tab: "stats", label: "Progression", icon: <ChartNoAxesCombined size={17} /> },
  { tab: "drills", label: "Entraînements", icon: <Dumbbell size={17} /> },
  { tab: "drills", label: "Exercices", icon: <Trophy size={17} /> },
  { tab: "coach", label: "Calendrier", icon: <CalendarDays size={17} /> },
];

const secondaryItems: Array<{ tab: ActiveTab; label: string; icon: ReactNode }> = [
  { tab: "profile", label: "Athlètes", icon: <UserRound size={17} /> },
  { tab: "teams", label: "Équipes", icon: <UsersRound size={17} /> },
  { tab: "coach", label: "Coach AI", icon: <Bell size={17} /> },
];

const tertiaryItems: Array<{ tab: ActiveTab; label: string; icon: ReactNode }> = [
  { tab: "stats", label: "Statistiques", icon: <BarChart3 size={17} /> },
  { tab: "leaderboard", label: "Classements", icon: <SlidersHorizontal size={17} /> },
];

const mobileItems: Array<{ tab: ActiveTab; label: string; icon: ReactNode; featured?: boolean }> = [
  { tab: "stats", label: "Accueil", icon: <Home size={21} /> },
  { tab: "history", label: "Analyses", icon: <FileSearch size={21} /> },
  { tab: "live", label: "Vidéo", icon: <Camera size={22} />, featured: true },
  { tab: "profile", label: "Athlètes", icon: <UserRound size={21} /> },
  { tab: "drills", label: "Entraînement", icon: <CalendarDays size={21} /> },
  { tab: "coach", label: "Menu", icon: <Menu size={21} /> },
];

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
    if (tab !== "live") setIsImmersive?.(false);
  };

  return (
    <>
      <aside
        className={cn(
          "hidden h-screen w-[188px] shrink-0 border-r border-white/10 bg-[#020609] px-4 py-5 text-white md:sticky md:top-0 md:flex md:flex-col",
          isImmersive && activeTab === "live" && "opacity-30 transition hover:opacity-100",
        )}
      >
        <img src={basketMotionAiLogo} alt="BasketMotion AI" className="mb-6 h-auto w-[150px] object-contain" />

        <div className="space-y-1">
          {primaryItems.map((item, index) => (
            <div key={`${item.label}-${index}`}>
              <SideItem active={activeTab === item.tab && !item.indent} indent={item.indent} onClick={() => navigate(item.tab)} icon={item.icon} label={item.label} />
            </div>
          ))}
        </div>

        <SideGroup>
          {secondaryItems.map((item) => (
            <div key={item.label}>
              <SideItem active={activeTab === item.tab} onClick={() => navigate(item.tab)} icon={item.icon} label={item.label} />
            </div>
          ))}
        </SideGroup>

        <SideGroup>
          {tertiaryItems.map((item) => (
            <div key={item.label}>
              <SideItem active={activeTab === item.tab} onClick={() => navigate(item.tab)} icon={item.icon} label={item.label} />
            </div>
          ))}
        </SideGroup>

        <SideGroup>
          <SideItem active={false} onClick={() => navigate("profile")} icon={<Settings size={17} />} label="Paramètres" />
          <SideItem active={false} onClick={() => undefined} icon={<LogOut size={17} />} label="Déconnexion" />
        </SideGroup>

        <div className="mt-auto rounded-md border border-white/10 bg-white/[0.03] p-3">
          <div className="text-[10px] font-bold uppercase text-white/45">Prochaine séance</div>
          <div className="mt-3 text-xs text-white">Entraînement tir</div>
          <div className="mt-1 text-[11px] text-white/55">Aujourd'hui · 16:00</div>
          <button className="mt-3 w-full rounded-md border border-white/10 px-3 py-2 text-xs font-bold text-white hover:border-[#ff6b00]/60">Voir le plan</button>
        </div>

        <div className="mt-6">
          <img src={basketMotionAiLogo} alt="BasketMotion AI" className="h-auto w-[118px] object-contain" />
          <p className="mt-2 text-xs italic text-white/75">Be you, be different.</p>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 grid h-[78px] grid-cols-6 border-t border-white/10 bg-[#071019]/95 px-1 pb-2 pt-1 backdrop-blur md:hidden">
        {mobileItems.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.tab)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-[10px] font-semibold",
              item.featured && "-mt-4",
              activeTab === item.tab ? "text-[#ff6b00]" : "text-white/70",
            )}
            title={item.featured ? "Nouvelle analyse vidéo" : item.label}
          >
            <span className={cn(item.featured && "grid h-12 w-12 place-items-center rounded-full border border-[#ff8a00]/60 bg-gradient-to-br from-[#ff4d00] to-[#ff8a00] text-white shadow-lg shadow-[#ff6b00]/30")}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}

function SideGroup({ children }: { children: ReactNode }) {
  return <div className="mt-4 space-y-1 border-t border-white/10 pt-4">{children}</div>;
}

function SideItem({ active, icon, indent, label, onClick }: { active: boolean; icon: ReactNode; indent?: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-9 w-full items-center gap-3 rounded-md px-3 text-left text-[13px] transition",
        indent && "h-7 pl-6 text-[12px]",
        active ? "border border-[#ff6b00]/50 bg-[#ff6b00]/22 text-white" : "text-white/76 hover:bg-white/[0.05] hover:text-white",
      )}
    >
      <span className={cn("grid w-4 place-items-center", active ? "text-[#ff8a00]" : "text-[#ff8a00]/80")}>{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
