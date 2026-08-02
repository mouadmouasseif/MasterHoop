import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Activity, CalendarCheck, Cloud, Lock, Medal, Plug, ShoppingBag, Trophy, Watch } from "lucide-react";
import { buildEcosystemDashboard } from "@/src/ecosystem/ecosystemService";
import type { EcosystemStatus } from "@/src/ecosystem/types";
import { cn } from "@/src/lib/utils";

const dashboard = buildEcosystemDashboard();

export default function EcosystemPage() {
  return (
    <motion.div
      key="ecosystem-sprint-7"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      className="space-y-7"
    >
      <section className="glass-card p-5 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-brand-neon">Version 4.0</div>
            <h2 className="text-3xl font-black uppercase md:text-4xl">Professional ecosystem</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
              Tournaments, marketplace, weekly training generator, integrations and cloud jobs with safe configuration states.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric label="Teams" value={String(dashboard.tournament.teams.length)} tone="green" />
            <Metric label="Catalog" value={String(dashboard.marketplace.length)} tone="orange" />
            <Metric label="Providers" value={String(dashboard.integrations.length)} tone="blue" />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="Tournament platform" icon={<Trophy size={18} />} tone="green">
          <StatusBadge status={dashboard.tournament.status} />
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase text-white/35"><Medal size={14} /> Leaderboard</div>
              <div className="space-y-2">
                {dashboard.tournament.leaderboard.map((team, index) => (
                  <div key={team.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                    <span className="text-sm font-bold text-white/75">{index + 1}. {team.name}</span>
                    <span className="text-xs font-black text-brand-neon">{team.wins}-{team.losses}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 text-xs font-black uppercase text-white/35">Bracket</div>
              <div className="space-y-2">
                {dashboard.tournament.matches.map((match) => (
                  <div key={match.id} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                    <div className="text-xs font-black uppercase text-brand-orange">{match.round}</div>
                    <div className="mt-1 text-sm text-white/65">{match.teamAId} vs {match.teamBId}</div>
                    <div className="mt-1 text-xs text-white/35">{match.status === "completed" ? `${match.scoreA}-${match.scoreB}` : "Scheduled"}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="AI training generator" icon={<CalendarCheck size={18} />} tone="orange">
          <StatusBadge status={dashboard.trainingSchedule.status} />
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            {dashboard.trainingSchedule.days.map((day) => (
              <div key={day.day} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs font-black uppercase text-white/35">{day.day}</div>
                <div className="mt-2 text-sm font-black text-brand-orange">{day.focus}</div>
                <div className="mt-3 space-y-2">
                  {day.drills.map((drill) => <div key={drill} className="rounded-lg bg-white/[0.03] px-2 py-2 text-[11px] text-white/55">{drill}</div>)}
                </div>
                <div className="mt-3 text-[10px] font-black uppercase text-white/35">Load {day.load}</div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Marketplace" icon={<ShoppingBag size={18} />} tone="orange">
          <div className="grid gap-3 md:grid-cols-3">
            {dashboard.marketplace.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <StatusBadge status={item.status} compact />
                <div className="mt-3 text-lg font-black text-white">{item.title}</div>
                <div className="mt-1 text-xs text-white/40">{item.author} - {item.priceLabel}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.tags.map((tag) => <span key={tag} className="rounded-full bg-white/[0.05] px-2 py-1 text-[10px] font-black uppercase text-white/45">{tag}</span>)}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Integrations and cloud jobs" icon={<Plug size={18} />} tone="green">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              {dashboard.integrations.map((provider) => (
                <div key={provider.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center gap-3">
                    {provider.category === "wearable" ? <Watch size={18} className="text-brand-neon" /> : provider.category === "cloud_ai" ? <Cloud size={18} className="text-brand-blue" /> : <Lock size={18} className="text-brand-orange" />}
                    <div>
                      <div className="text-sm font-black">{provider.name}</div>
                      <div className="text-xs text-white/35">{provider.category}</div>
                    </div>
                  </div>
                  <StatusBadge status={provider.status} compact />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {dashboard.cloudJobs.map((job) => (
                <div key={job.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-black"><Activity size={16} className="text-brand-orange" /> {job.type.replace(/_/g, " ")}</div>
                    <StatusBadge status={job.status} compact />
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-brand-orange" style={{ width: `${job.progress}%` }} />
                  </div>
                  <div className="mt-2 text-xs text-white/40">{job.limitations[0]}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </section>

      <Panel title="Ecosystem limits" icon={<Lock size={18} />} tone="green">
        <div className="grid gap-3 md:grid-cols-3">
          {dashboard.limitations.map((limit) => (
            <div key={limit} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white/60">{limit}</div>
          ))}
        </div>
      </Panel>
    </motion.div>
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

function Panel({ title, icon, tone, children }: { title: string; icon: ReactNode; tone: "green" | "orange"; children: ReactNode }) {
  return (
    <div className={cn("glass-card p-5", tone === "green" ? "border-brand-neon/20" : "border-brand-orange/20")}>
      <div className={cn("mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em]", tone === "green" ? "text-brand-neon" : "text-brand-orange")}>
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function StatusBadge({ status, compact = false }: { status: EcosystemStatus; compact?: boolean }) {
  const label = status.replace(/_/g, " ");
  return (
    <span className={cn(
      "inline-flex w-fit rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
      compact && "px-2 py-0.5 text-[9px]",
      status === "active" && "border-brand-neon/40 bg-brand-neon/10 text-brand-neon",
      status === "preview" && "border-brand-orange/40 bg-brand-orange/10 text-brand-orange",
      status === "requires_configuration" && "border-yellow-400/35 bg-yellow-400/10 text-yellow-200",
      status === "disabled" && "border-white/10 bg-white/[0.03] text-white/35",
    )}>
      {label}
    </span>
  );
}
