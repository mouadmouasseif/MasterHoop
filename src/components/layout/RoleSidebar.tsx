import { NavLink } from "react-router-dom";
import {
  Activity,
  Building2,
  ClipboardList,
  Dumbbell,
  FileText,
  Home,
  Settings,
  ShieldCheck,
  Swords,
  Trophy,
  UsersRound,
} from "lucide-react";
import type { UserRole } from "@/src/auth/types";
import { cn } from "@/src/lib/utils";

type ProRole = Exclude<UserRole, "athlete">;
type ProNavItem = { to: string; label: string; icon: typeof Home };

const items: Record<ProRole, ProNavItem[]> = {
  coach: [
    { to: "/coach", label: "Accueil", icon: Home },
    { to: "/coach/athletes", label: "Athletes", icon: UsersRound },
    { to: "/coach/analyses", label: "Analyses", icon: ClipboardList },
    { to: "/coach/compare", label: "Compare", icon: Activity },
    { to: "/coach/drills", label: "Drills", icon: Dumbbell },
    { to: "/coach/missions", label: "Missions", icon: Trophy },
    { to: "/coach/training-plans", label: "Plans", icon: ClipboardList },
    { to: "/coach/reports", label: "Reports", icon: FileText },
  ],
  club_admin: [
    { to: "/club", label: "Accueil", icon: Home },
    { to: "/club/players", label: "Players", icon: UsersRound },
    { to: "/club/coaches", label: "Coaches", icon: ShieldCheck },
    { to: "/club/teams", label: "Teams", icon: Building2 },
    { to: "/club/matches", label: "Matches", icon: Swords },
    { to: "/club/performance", label: "Perf", icon: Activity },
    { to: "/club/reports", label: "Reports", icon: FileText },
    { to: "/club/settings", label: "Settings", icon: Settings },
  ],
  super_admin: [
    { to: "/admin", label: "Accueil", icon: Home },
    { to: "/admin/clubs", label: "Clubs", icon: Building2 },
    { to: "/admin/users", label: "Users", icon: UsersRound },
    { to: "/admin/models", label: "Models", icon: ClipboardList },
    { to: "/admin/cloud-jobs", label: "Cloud", icon: Activity },
    { to: "/admin/tournaments", label: "Events", icon: Trophy },
    { to: "/admin/security", label: "Security", icon: ShieldCheck },
    { to: "/admin/audit", label: "Audit", icon: FileText },
    { to: "/admin/settings", label: "Settings", icon: Settings },
  ],
};

export default function RoleSidebar({ role }: { role: ProRole }) {
  return (
    <nav
      aria-label="Navigation de l'espace professionnel"
      className="fixed left-0 right-0 top-0 z-50 flex gap-2 overflow-x-auto border-b border-white/5 bg-brand-surface/95 p-3 backdrop-blur-xl md:sticky md:h-screen md:w-60 md:flex-col md:border-b-0 md:border-r md:p-4"
    >
      <div className="hidden px-3 pb-5 pt-2 text-sm font-black uppercase tracking-[0.18em] text-brand-orange md:block">
        BasketMotion AI Pro
      </div>
      {items[role].map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to.split("/").length === 2}
          className={({ isActive }) => cn(
            "flex min-w-max items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-brand-orange",
            isActive ? "bg-brand-orange/15 text-brand-orange" : "text-white/55 hover:bg-white/5 hover:text-white",
          )}
        >
          <Icon size={18} /> {label}
        </NavLink>
      ))}
    </nav>
  );
}
