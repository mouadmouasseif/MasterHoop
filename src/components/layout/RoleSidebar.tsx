import { NavLink } from "react-router-dom";
import { Building2, ClipboardList, Dumbbell, FileText, Home, Settings, ShieldCheck, UsersRound } from "lucide-react";
import type { UserRole } from "@/src/auth/types";
import { cn } from "@/src/lib/utils";

const items: Record<Exclude<UserRole, "athlete">, { to: string; label: string; icon: typeof Home }[]> = {
  coach: [
    { to: "/coach", label: "Accueil", icon: Home },
    { to: "/coach/athletes", label: "Athlètes", icon: UsersRound },
    { to: "/coach/analyses", label: "Analyses", icon: ClipboardList },
    { to: "/coach/programmes", label: "Programmes", icon: Dumbbell },
    { to: "/coach/rapports", label: "Rapports", icon: FileText },
  ],
  club_admin: [
    { to: "/club", label: "Accueil", icon: Home },
    { to: "/club/joueurs", label: "Joueurs", icon: UsersRound },
    { to: "/club/coachs", label: "Coachs", icon: ShieldCheck },
    { to: "/club/equipes", label: "Équipes", icon: Building2 },
    { to: "/club/rapports", label: "Rapports", icon: FileText },
    { to: "/club/parametres", label: "Paramètres", icon: Settings },
  ],
  super_admin: [
    { to: "/admin", label: "Accueil", icon: Home },
    { to: "/admin/clubs", label: "Clubs", icon: Building2 },
    { to: "/admin/utilisateurs", label: "Utilisateurs", icon: UsersRound },
    { to: "/admin/modeles", label: "Modèles", icon: ClipboardList },
    { to: "/admin/securite", label: "Sécurité", icon: ShieldCheck },
    { to: "/admin/parametres", label: "Paramètres", icon: Settings },
  ],
};

export default function RoleSidebar({ role }: { role: Exclude<UserRole, "athlete"> }) {
  return (
    <nav aria-label="Navigation de l’espace professionnel" className="fixed left-0 right-0 top-0 z-50 flex gap-2 overflow-x-auto border-b border-white/5 bg-brand-surface/95 p-3 backdrop-blur-xl md:sticky md:h-screen md:w-56 md:flex-col md:border-b-0 md:border-r md:p-4">
      <div className="hidden px-3 pb-5 pt-2 text-sm font-black uppercase tracking-[0.18em] text-brand-orange md:block">BasketMotion-Ai Pro</div>
      {items[role].map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to.split("/").length === 2} className={({ isActive }) => cn("flex min-w-max items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-brand-orange", isActive ? "bg-brand-orange/15 text-brand-orange" : "text-white/55 hover:bg-white/5 hover:text-white")}>
          <Icon size={18} /> {label}
        </NavLink>
      ))}
    </nav>
  );
}
