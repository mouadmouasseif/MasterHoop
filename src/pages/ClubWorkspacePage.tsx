import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Activity,
  BarChart3,
  CalendarCheck,
  ClipboardList,
  Download,
  FileJson,
  FileText,
  Search,
  ShieldCheck,
  Swords,
  UserPlus,
  UsersRound,
} from "lucide-react";
import {
  buildClubMetrics,
  createClubReport,
  downloadClubCsv,
  downloadClubJson,
  filterClubPlayers,
  getClubDashboardSnapshot,
} from "@/src/clubs/clubPlatformService";
import type { ClubCoach, ClubDashboardSnapshot, ClubPlayer, ClubReport, ClubTeam, ClubWorkspaceSection } from "@/src/clubs/types";
import { cn } from "@/src/lib/utils";

type Props = {
  section?: ClubWorkspaceSection;
};

const sectionCopy: Record<ClubWorkspaceSection, { eyebrow: string; title: string; description: string }> = {
  dashboard: {
    eyebrow: "Sprint 3 - Club Platform",
    title: "Club command center",
    description: "Players, coaches, teams, matches, attendance, performance, training and reports in one responsive workspace.",
  },
  players: {
    eyebrow: "Club players",
    title: "Player management",
    description: "Search players, review assignments, monitor performance and prepare coach follow-up.",
  },
  coaches: {
    eyebrow: "Club coaches",
    title: "Coach management",
    description: "Track coach assignments, active teams, unread comments and invitation state.",
  },
  teams: {
    eyebrow: "Club teams",
    title: "Teams and rosters",
    description: "Review team structure, coaches, roster size and average performance.",
  },
  matches: {
    eyebrow: "Club matches",
    title: "Match operations",
    description: "Follow scheduled and completed matches. Automatic stats remain disabled until validated models are ready.",
  },
  attendance: {
    eyebrow: "Attendance",
    title: "Attendance tracking",
    description: "Monitor attendance rates from club session data and flag low participation.",
  },
  training: {
    eyebrow: "Training",
    title: "Training activity",
    description: "Review training volume, player load and coach follow-up priorities.",
  },
  performance: {
    eyebrow: "Performance",
    title: "Club performance analytics",
    description: "Compare average player score, team score, attendance and session volume.",
  },
  reports: {
    eyebrow: "Reports",
    title: "Club reports and exports",
    description: "Generate athlete, team, coach, season, technical and attendance reports as CSV or JSON.",
  },
  settings: {
    eyebrow: "Settings",
    title: "Club settings",
    description: "Configuration preview for club boundaries, invitations, reports and privacy controls.",
  },
};

export default function ClubWorkspacePage({ section = "dashboard" }: Props) {
  const [snapshot, setSnapshot] = useState<ClubDashboardSnapshot>(() => getClubDashboardSnapshot());
  const [query, setQuery] = useState("");
  const page = sectionCopy[section];
  const metrics = useMemo(() => buildClubMetrics(snapshot), [snapshot]);
  const players = useMemo(() => filterClubPlayers(snapshot.players, query), [query, snapshot.players]);

  const generateReport = (type: ClubReport["type"]) => {
    setSnapshot(createClubReport(snapshot, type));
  };

  return (
    <motion.div
      key={`club-${section}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      className="space-y-7"
    >
      <section className="glass-card overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-brand-orange">{page.eyebrow}</div>
            <h2 className="text-3xl font-black uppercase md:text-4xl">{page.title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">{page.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric icon={<UsersRound />} label="Players" value={metrics.players} />
            <Metric icon={<ShieldCheck />} label="Coaches" value={metrics.coaches} />
            <Metric icon={<Swords />} label="Matches" value={metrics.matches} />
            <Metric icon={<FileText />} label="Reports" value={metrics.reportsReady} />
          </div>
        </div>
      </section>

      <StatusStrip />

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="Club performance" icon={<BarChart3 size={18} />} tone="orange">
          <div className="grid gap-4 sm:grid-cols-2">
            <ProgressBlock label="Average performance" value={metrics.averagePerformance} />
            <ProgressBlock label="Attendance" value={metrics.attendance} />
            <ProgressBlock label="Training sessions" value={Math.min(100, metrics.sessions)} suffix={`${metrics.sessions}`} />
            <ProgressBlock label="Unread comments" value={Math.min(100, metrics.unreadComments * 12)} suffix={`${metrics.unreadComments}`} warning />
          </div>
        </Panel>

        <Panel title="Club actions" icon={<ClipboardList size={18} />} tone="green">
          <div className="grid gap-3 sm:grid-cols-2">
            <ActionCard icon={<UserPlus />} title="Invite coach" text="Creates an invitation flow when Firestore invite UI is connected." state="Ready route" />
            <ActionCard icon={<UsersRound />} title="Add athlete" text="Prepared for club-scoped player onboarding and coach assignment." state="Ready route" />
            <ActionCard icon={<FileText />} title="Generate report" text="CSV and JSON exports are active for the current club snapshot." state="Active" />
            <ActionCard icon={<Swords />} title="Match review" text="Manual validated stats only until automatic match models are ready." state="Manual assisted" />
          </div>
        </Panel>
      </section>

      {(section === "dashboard" || section === "players" || section === "attendance" || section === "training" || section === "performance") && (
        <Panel title="Players" icon={<UsersRound size={18} />} tone="orange">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="flex min-h-12 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-4">
              <Search size={17} className="text-brand-orange" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player, position, level..." className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/30" />
            </div>
            <button onClick={() => setQuery("")} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white/65 hover:bg-white/5">Reset</button>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {players.map((player) => <PlayerCard key={player.id} player={player} />)}
            {players.length === 0 && <EmptyState text="No club players match this filter." />}
          </div>
        </Panel>
      )}

      {(section === "dashboard" || section === "coaches") && (
        <Panel title="Coaches" icon={<ShieldCheck size={18} />} tone="green">
          <div className="grid gap-3 lg:grid-cols-3">
            {snapshot.coaches.map((coach) => <CoachCard key={coach.id} coach={coach} />)}
          </div>
        </Panel>
      )}

      {(section === "dashboard" || section === "teams") && (
        <Panel title="Teams" icon={<Swords size={18} />} tone="orange">
          <div className="grid gap-3 lg:grid-cols-2">
            {snapshot.teams.map((team) => <TeamCard key={team.id} team={team} snapshot={snapshot} />)}
          </div>
        </Panel>
      )}

      {(section === "dashboard" || section === "matches") && (
        <Panel title="Matches" icon={<CalendarCheck size={18} />} tone="green">
          <div className="grid gap-3 lg:grid-cols-2">
            {snapshot.matches.map((match) => (
              <div key={match.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-black">{match.opponent}</div>
                    <div className="mt-1 text-xs text-white/40">{match.date} - {match.status}</div>
                  </div>
                  <span className="rounded-lg border border-white/10 px-2 py-1 text-xs font-black uppercase text-white/50">{match.score || "Scheduled"}</span>
                </div>
                <div className="mt-3 text-xs text-white/45">
                  Stats: {match.manuallyValidatedStats ? "manually validated" : "requires validation"}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {(section === "dashboard" || section === "reports") && (
        <Panel title="Reports and exports" icon={<Download size={18} />} tone="orange">
          <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 text-sm font-black uppercase text-white/70">Generate report</div>
              <div className="grid grid-cols-2 gap-2">
                {(["athlete", "team", "coach", "season", "technical", "attendance"] as ClubReport["type"][]).map((type) => (
                  <button key={type} onClick={() => generateReport(type)} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-black uppercase text-white/60 hover:border-brand-orange hover:text-brand-orange">
                    {type}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button onClick={() => downloadClubCsv(snapshot)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 py-3 text-sm font-black text-white">
                  <Download size={17} /> CSV
                </button>
                <button onClick={() => downloadClubJson(snapshot)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-white/70 hover:bg-white/5">
                  <FileJson size={17} /> JSON
                </button>
              </div>
            </div>
            <div className="grid gap-3">
              {snapshot.reports.map((report) => (
                <div key={report.id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-black">{report.title}</div>
                    <div className="mt-1 text-xs text-white/40">{new Date(report.createdAt).toLocaleDateString()} - {report.type}</div>
                  </div>
                  <span className={cn("rounded-lg px-2 py-1 text-xs font-black uppercase", report.status === "ready" ? "bg-brand-neon/10 text-brand-neon" : "bg-white/5 text-white/45")}>{report.status}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      )}

      {section === "settings" && (
        <Panel title="Settings" icon={<ShieldCheck size={18} />} tone="green">
          <div className="grid gap-3 md:grid-cols-3">
            <ActionCard icon={<ShieldCheck />} title="Club boundary" text="Club-scoped access stays enforced by role guards and Firebase rules." state="Configured" />
            <ActionCard icon={<FileText />} title="Report privacy" text="Report exports use local data until club backend exports are connected." state="Local export" />
            <ActionCard icon={<Activity />} title="Sync status" text="Firestore club sync requires the next backend sprint." state="Requires configuration" />
          </div>
        </Panel>
      )}
    </motion.div>
  );
}

function StatusStrip() {
  const states = ["success", "syncing", "offline-ready", "permission-guarded"];
  return (
    <div className="grid gap-2 sm:grid-cols-4">
      {states.map((state) => (
        <div key={state} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-center text-[10px] font-black uppercase tracking-wider text-white/45">
          {state}
        </div>
      ))}
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
      <div className="mb-2 text-brand-orange">{icon}</div>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-[10px] font-black uppercase text-white/35">{label}</div>
    </div>
  );
}

function Panel({ title, icon, tone, children }: { title: string; icon: ReactNode; tone: "orange" | "green"; children: ReactNode }) {
  return (
    <section className={cn("glass-card p-5 sm:p-6", tone === "green" ? "border-brand-neon/20" : "border-brand-orange/20")}>
      <div className={cn("mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em]", tone === "green" ? "text-brand-neon" : "text-brand-orange")}>
        {icon} {title}
      </div>
      {children}
    </section>
  );
}

function ProgressBlock({ label, value, suffix, warning = false }: { label: string; value: number; suffix?: string; warning?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="mb-2 flex items-center justify-between text-xs text-white/45">
        <span>{label}</span>
        <span>{suffix || `${value}%`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className={cn("h-full rounded-full", warning ? "bg-brand-orange" : "bg-brand-neon")} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

function PlayerCard({ player }: { key?: string; player: ClubPlayer }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-black">{player.fullName}</div>
          <div className="mt-1 text-xs text-white/40">{player.position} - {player.level}</div>
        </div>
        <span className="text-2xl font-black text-brand-neon">{player.averageScore}%</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/45">
        <div>Sessions: <span className="text-white">{player.sessionsThisMonth}</span></div>
        <div>Attendance: <span className="text-white">{player.attendanceRate}%</span></div>
        <div>Teams: <span className="text-white">{player.teamIds.length}</span></div>
        <div>Coaches: <span className="text-white">{player.coachIds.length}</span></div>
      </div>
    </div>
  );
}

function CoachCard({ coach }: { key?: string; coach: ClubCoach }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="font-black">{coach.fullName}</div>
      <div className="mt-1 text-xs uppercase text-brand-orange">{coach.role.replace("_", " ")}</div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/45">
        <div>Athletes: <span className="text-white">{coach.athletesAssigned}</span></div>
        <div>Unread: <span className="text-white">{coach.unreadComments}</span></div>
        <div>Teams: <span className="text-white">{coach.teamIds.length}</span></div>
        <div>Status: <span className="text-white">{coach.status}</span></div>
      </div>
    </div>
  );
}

function TeamCard({ team, snapshot }: { key?: string; team: ClubTeam; snapshot: ClubDashboardSnapshot }) {
  const coaches = team.coachIds.map((id) => snapshot.coaches.find((coach) => coach.id === id)?.fullName).filter(Boolean);
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-black">{team.name}</div>
          <div className="mt-1 text-xs text-white/40">{team.mode.replace("_", " ")}</div>
        </div>
        <span className="text-2xl font-black text-brand-orange">{team.averagePerformance}%</span>
      </div>
      <div className="mt-4 text-sm text-white/55">{team.playerIds.length} player(s)</div>
      <div className="mt-2 text-xs text-white/40">Coaches: {coaches.join(", ") || "Unassigned"}</div>
    </div>
  );
}

function ActionCard({ icon, title, text, state }: { icon: ReactNode; title: string; text: string; state: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3 text-brand-orange">{icon}</div>
      <div className="font-black">{title}</div>
      <p className="mt-2 text-sm leading-6 text-white/50">{text}</p>
      <div className="mt-3 inline-flex rounded-lg border border-white/10 px-2 py-1 text-[10px] font-black uppercase text-white/40">{state}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/45">{text}</div>;
}
