import { motion } from "motion/react";
import type { ReactNode } from "react";
import {
  Activity,
  BarChart3,
  Brain,
  CalendarCheck,
  Cloud,
  Dumbbell,
  FileText,
  LineChart,
  Medal,
  MonitorSmartphone,
  Radar,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Trophy,
  UsersRound,
  Watch,
} from "lucide-react";
import { cn } from "@/src/lib/utils";

type WorkspaceKind = "coach" | "club" | "elite" | "match" | "ecosystem" | "admin";

const athletes = [
  { name: "James L.", role: "Guard", progress: 85, load: "Medium" },
  { name: "Liam Johnson", role: "Wing", progress: 72, load: "High" },
  { name: "Noah Wilson", role: "Forward", progress: 90, load: "Low" },
  { name: "Ethan O.", role: "Center", progress: 68, load: "Medium" },
];

const scoutingSignals = [
  { label: "Pose comparison", value: "91%", detail: "Release similar to elite guard pattern" },
  { label: "Motion similarity", value: "82%", detail: "Stable elbow path, late wrist snap" },
  { label: "Future progression", value: "+14%", detail: "Projected after 4 focused sessions" },
];

const matchEvents = [
  { label: "Possessions", value: 92 },
  { label: "Shots", value: 78 },
  { label: "Assists", value: 18 },
  { label: "Steals", value: 8 },
  { label: "Turnovers", value: 14 },
  { label: "Fast breaks", value: 9 },
];

const ecosystemModules = [
  { label: "Mobile app", icon: MonitorSmartphone, state: "Android / iOS ready UI" },
  { label: "Desktop app", icon: MonitorSmartphone, state: "Windows / Mac route" },
  { label: "Smart watch", icon: Watch, state: "Wearable data model" },
  { label: "Cloud AI", icon: Cloud, state: "Batch analysis queue" },
  { label: "Marketplace", icon: ShoppingBag, state: "Coach content catalog" },
  { label: "Tournament", icon: Trophy, state: "Rankings and brackets" },
];

const weeklyPlan = [
  ["Shooting", "Strength", "Recovery"],
  ["Dribbling", "Footwork", "Film"],
  ["Defense", "Match IQ", "Mobility"],
  ["Release", "Conditioning", "Recovery"],
  ["Tournament", "Scout report", "Game"],
];

const copy: Record<WorkspaceKind, { eyebrow: string; title: string; description: string }> = {
  coach: {
    eyebrow: "Version 2.1 / 2.2 / 2.3",
    title: "Coach, club et missions IA",
    description: "Dashboard coach avec athletes, charge, programmes, exercices, missions et rapports actionnables.",
  },
  club: {
    eyebrow: "Version 2.2",
    title: "Club dashboard",
    description: "Vue club pour suivre joueurs, coachs, equipes, presences, performance et entrainements.",
  },
  elite: {
    eyebrow: "Version 3.0",
    title: "Elite analytics et scouting",
    description: "Comparaison de pose, rapport de scouting, progression et risques observables.",
  },
  match: {
    eyebrow: "Version 3.5",
    title: "Match intelligence",
    description: "Lecture automatique des evenements de match, statistiques et rotations defensives.",
  },
  ecosystem: {
    eyebrow: "Version 4.0",
    title: "Professional ecosystem",
    description: "Mobile, desktop, wearables, cloud AI, tournoi, marketplace et plans d'entrainement.",
  },
  admin: {
    eyebrow: "Professional control",
    title: "Administration plateforme",
    description: "Pilotage des clubs, modeles IA, securite, audit et configuration de l'ecosysteme.",
  },
};

export default function ProfessionalWorkspacePage({ kind = "coach" }: { kind?: WorkspaceKind }) {
  const page = copy[kind];

  return (
    <motion.div
      key={`professional-${kind}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      className="space-y-7"
    >
      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-card overflow-hidden p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-brand-orange">{page.eyebrow}</div>
              <h2 className="text-3xl font-black uppercase md:text-4xl">{page.title}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">{page.description}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Metric label="Athletes" value="24" tone="green" />
              <Metric label="Reports" value="Local" tone="orange" />
              <Metric label="Mode" value="Preview" tone="blue" />
            </div>
          </div>

          <div className="mt-7 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <Panel title="Athletes" icon={<UsersRound size={18} />} tone="green">
              <div className="space-y-3">
                {athletes.map((athlete) => (
                  <div key={athlete.name} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-black">{athlete.name}</div>
                        <div className="text-xs text-white/40">{athlete.role} - Load {athlete.load}</div>
                      </div>
                      <div className="text-xl font-black text-brand-neon">{athlete.progress}%</div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-brand-neon" style={{ width: `${athlete.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Training load" icon={<Dumbbell size={18} />} tone="orange">
              <div className="grid h-full gap-3 sm:grid-cols-2">
                <MiniChart title="Performance" values={[32, 48, 44, 62, 58, 76, 70]} />
                <MiniChart title="Fatigue" values={[22, 35, 31, 48, 54, 42, 38]} warning />
                <ActionList
                  items={[
                    "Review 3 shooting videos",
                    "Assign release-speed mission",
                    "Comment latest analysis",
                    "Create next week program",
                  ]}
                />
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-2 text-xs font-black uppercase text-white/35">Coach note</div>
                  <p className="text-sm leading-6 text-white/65">Noah is ready for advanced shooting load. Ethan needs reduced fatigue and balance work.</p>
                </div>
              </div>
            </Panel>
          </div>
        </div>

        <EliteScoutingPanel />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.92fr]">
        <MatchIntelligencePanel />
        <EcosystemPanel />
      </section>
    </motion.div>
  );
}

function EliteScoutingPanel() {
  return (
    <Panel title="Elite scouting" icon={<Radar size={18} />} tone="orange" className="min-h-full">
      <div className="grid gap-4">
        <div className="rounded-xl border border-brand-orange/25 bg-brand-orange/10 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-black uppercase text-brand-orange">Scouting report preview</div>
            <Medal size={20} className="text-brand-orange" />
          </div>
          <div className="grid gap-3">
            {scoutingSignals.map((signal) => (
              <div key={signal.label} className="rounded-xl border border-white/10 bg-black/25 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-bold">{signal.label}</div>
                  <div className="text-xl font-black text-white">{signal.value}</div>
                </div>
                <p className="mt-1 text-xs leading-5 text-white/45">{signal.detail}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <RiskCard title="Movement stability observation" value="Attention" icon={<ShieldAlert size={18} />} danger />
          <RiskCard title="Fatigue indicators" value="Requires data" icon={<Activity size={18} />} />
        </div>
      </div>
    </Panel>
  );
}

function MatchIntelligencePanel() {
  return (
    <Panel title="Match intelligence" icon={<BarChart3 size={18} />} tone="orange">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1fr]">
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="mb-3 text-xs font-black uppercase text-white/35">Manual assisted events</div>
          <div className="space-y-2">
            {matchEvents.map((event) => (
              <div key={event.label} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                <span className="text-sm text-white/65">{event.label}</span>
                <span className="font-black text-white">{event.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-black uppercase text-white/35">Team analytics</div>
            <LineChart size={18} className="text-brand-neon" />
          </div>
          {["Spacing", "Passing", "Rebounds", "Defense", "Turnovers"].map((label, index) => {
            const values = [90, 80, 70, 60, 30];
            return (
              <div key={label} className="mb-3">
                <div className="mb-1 flex justify-between text-xs text-white/45">
                  <span>{label}</span>
                  <span>{values[index]}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className={cn("h-full rounded-full", index < 3 ? "bg-brand-neon" : index === 3 ? "bg-brand-orange" : "bg-red-400")} style={{ width: `${values[index]}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

function EcosystemPanel() {
  return (
    <Panel title="Professional ecosystem 4.0" icon={<Sparkles size={18} />} tone="green">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ecosystemModules.map(({ label, icon: Icon, state }) => (
          <div key={label} className="rounded-xl border border-white/10 bg-black/20 p-4">
            <Icon className="mb-3 text-brand-neon" size={22} />
            <div className="font-black">{label}</div>
            <div className="mt-1 text-xs leading-5 text-white/45">{state}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-brand-orange">
          <CalendarCheck size={17} /> AI training generator
        </div>
        <div className="grid grid-cols-5 gap-2">
          {weeklyPlan.map((day, index) => (
            <div key={index} className="space-y-2">
              <div className="text-center text-[10px] font-black uppercase text-white/35">D{index + 1}</div>
              {day.map((item) => (
                <div key={item} className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2 text-center text-[10px] font-bold text-white/60">
                  {item}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "green" | "orange" | "blue" }) {
  const toneClass = tone === "green" ? "text-brand-neon" : tone === "orange" ? "text-brand-orange" : "text-brand-blue";
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
      <div className={cn("text-xl font-black", toneClass)}>{value}</div>
      <div className="mt-1 text-[10px] font-black uppercase text-white/35">{label}</div>
    </div>
  );
}

function Panel({ title, icon, tone, className, children }: { title: string; icon: ReactNode; tone: "green" | "orange"; className?: string; children: ReactNode }) {
  return (
    <div className={cn("glass-card p-5", tone === "green" ? "border-brand-neon/20" : "border-brand-orange/20", className)}>
      <div className={cn("mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em]", tone === "green" ? "text-brand-neon" : "text-brand-orange")}>
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function MiniChart({ title, values, warning = false }: { title: string; values: number[]; warning?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="mb-4 text-xs font-black uppercase text-white/35">{title}</div>
      <div className="flex h-24 items-end gap-2">
        {values.map((value, index) => (
          <div key={`${title}-${index}`} className="flex-1 rounded-t bg-white/10">
            <div className={cn("rounded-t", warning ? "bg-brand-orange" : "bg-brand-neon")} style={{ height: `${value}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionList({ items }: { items: string[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase text-white/35">
        <FileText size={14} /> Coach tools
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-white/60">{item}</div>
        ))}
      </div>
    </div>
  );
}

function RiskCard({ title, value, icon, danger = false }: { title: string; value: string; icon: ReactNode; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className={cn("mb-2 flex items-center gap-2 text-xs font-black uppercase", danger ? "text-red-300" : "text-brand-orange")}>
        {icon} {title}
      </div>
      <div className={cn("text-2xl font-black", danger ? "text-red-300" : "text-brand-orange")}>{value}</div>
      <p className="mt-2 text-xs leading-5 text-white/45">Not a medical diagnosis. Automatic confidence requires connected session data.</p>
    </div>
  );
}
