import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Activity, AlertTriangle, BarChart3, Gauge, Medal, Radar, ShieldAlert, UsersRound } from "lucide-react";
import { buildEliteAnalyticsReport } from "@/src/elite/eliteAnalyticsEngine";
import type { EliteAnalyticsReport, EliteAthleteSummary, EliteAnalyticsStatus } from "@/src/elite/types";
import { cn } from "@/src/lib/utils";
import { getLocalAnalyses } from "@/src/services/localAnalysisService";
import type { LocalAnalysis } from "@/src/services/localAnalysisService";

export default function EliteAnalyticsPage() {
  const [analyses, setAnalyses] = useState<LocalAnalysis[]>([]);

  useEffect(() => {
    setAnalyses(getLocalAnalyses());
  }, []);

  const athlete = useMemo<EliteAthleteSummary>(() => ({
    id: "local-athlete",
    name: "BasketMotion Athlete",
    role: "Observed player",
    analyses,
  }), [analyses]);

  const report = useMemo(() => buildEliteAnalyticsReport(athlete, buildTeam(analyses)), [athlete, analyses]);

  return (
    <motion.div
      key="elite-analytics-v4"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      className="space-y-7"
    >
      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="glass-card overflow-hidden p-5 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-brand-orange">Version 3.0</div>
              <h2 className="text-3xl font-black uppercase md:text-4xl">Elite analytics</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
                Pose comparison, motion similarity, scouting, fatigue trend and team analytics from observed BasketMotion data.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Metric label="Analyses" value={String(report.scouting.dataVolume.analyses)} tone="blue" />
              <Metric label="Shots" value={String(report.scouting.dataVolume.shots)} tone="orange" />
              <Metric label="Status" value={statusLabel(report.status)} tone={report.status === "ready" ? "green" : "orange"} />
            </div>
          </div>

          <div className="mt-7 grid gap-4 lg:grid-cols-3">
            <HeroSignal icon={<Radar size={20} />} label="Similarity" value={formatScore(report.motionSimilarity.score, "%")} status={report.motionSimilarity.status} />
            <HeroSignal icon={<Activity size={20} />} label="Fatigue trend" value={fatigueLabel(report)} status={report.fatigue.status} />
            <HeroSignal icon={<UsersRound size={20} />} label="Team avg" value={formatScore(report.team.averageScore, "")} status={report.team.status} />
          </div>
        </div>

        <Panel title="Scouting report" icon={<Medal size={18} />} tone="orange">
          <StatusBadge status={report.scouting.status} />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <InsightList title="Strengths" items={report.scouting.strengths} fallback="More validated sessions required." />
            <InsightList title="Weaknesses" items={report.scouting.weaknesses} fallback="No reliable weakness yet." />
          </div>
          <div className="mt-4">
            <InsightList title="Priorities" items={report.scouting.priorities} fallback="Collect more data first." />
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <MotionPanel report={report} />
        <FatigueAndTeamPanel report={report} />
      </section>

      <Panel title="Elite limits" icon={<ShieldAlert size={18} />} tone="green">
        <div className="grid gap-3 md:grid-cols-3">
          {report.limitations.map((item) => (
            <div key={item} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white/60">
              {item}
            </div>
          ))}
        </div>
      </Panel>
    </motion.div>
  );
}

function MotionPanel({ report }: { report: EliteAnalyticsReport }) {
  return (
    <Panel title="Pose comparison" icon={<Gauge size={18} />} tone="orange">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <StatusBadge status={report.motionSimilarity.status} />
          <div className="mt-3 text-4xl font-black text-white">{formatScore(report.motionSimilarity.score, "%")}</div>
          <p className="mt-2 text-sm leading-6 text-white/50">Compared to personal best or coach validated reference only.</p>
        </div>
        <div className="min-w-44 rounded-xl border border-brand-orange/25 bg-brand-orange/10 p-4 text-center">
          <div className="text-xs font-black uppercase text-brand-orange">Confidence</div>
          <div className="mt-2 text-3xl font-black">{Math.round(report.motionSimilarity.confidence * 100)}%</div>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {report.motionSimilarity.metrics.length ? report.motionSimilarity.metrics.map((metric) => (
          <div key={metric.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs text-white/45">
              <span>{metric.label}</span>
              <span>{metric.value === null ? "N/A" : `${metric.value} ${metric.unit}`}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-brand-orange" style={{ width: `${Math.round(metric.confidence * 100)}%` }} />
            </div>
          </div>
        )) : (
          <EmptyState text={report.motionSimilarity.limitations[0]} />
        )}
      </div>
    </Panel>
  );
}

function FatigueAndTeamPanel({ report }: { report: EliteAnalyticsReport }) {
  return (
    <Panel title="Fatigue and team analytics" icon={<BarChart3 size={18} />} tone="green">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-black uppercase text-white/35">Fatigue trend</div>
            <StatusBadge status={report.fatigue.status} compact />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric label="Start" value={formatScore(report.fatigue.startAccuracy, "%")} tone="green" />
            <Metric label="End" value={formatScore(report.fatigue.endAccuracy, "%")} tone="orange" />
            <Metric label="Delta" value={formatDelta(report.fatigue.delta)} tone={report.fatigue.delta !== null && report.fatigue.delta < -5 ? "orange" : "green"} />
          </div>
          <p className="mt-4 text-sm leading-6 text-white/55">{report.fatigue.limitations[0]}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-black uppercase text-white/35">Team analytics</div>
            <StatusBadge status={report.team.status} compact />
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <Metric label="Athletes" value={String(report.team.athleteCount)} tone="blue" />
            <Metric label="Accuracy" value={formatScore(report.team.averageAccuracy, "%")} tone="green" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InsightList title="Leaders" items={report.team.leaders} fallback="No leader yet." dense />
            <InsightList title="Attention" items={report.team.attention} fallback="No alert." dense />
          </div>
        </div>
      </div>
    </Panel>
  );
}

function HeroSignal({ icon, label, value, status }: { icon: ReactNode; label: string; value: string; status: EliteAnalyticsStatus }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-brand-orange">{icon}</div>
        <StatusBadge status={status} compact />
      </div>
      <div className="text-3xl font-black text-white">{value}</div>
      <div className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">{label}</div>
    </div>
  );
}

function InsightList({ title, items, fallback, dense = false }: { title: string; items: string[]; fallback: string; dense?: boolean }) {
  const visible = items.length ? items : [fallback];
  return (
    <div>
      <div className="mb-2 text-xs font-black uppercase text-white/35">{title}</div>
      <div className="space-y-2">
        {visible.map((item) => (
          <div key={item} className={cn("rounded-lg border border-white/10 bg-white/[0.03] text-white/60", dense ? "px-3 py-2 text-xs" : "px-3 py-2.5 text-sm")}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm leading-6 text-yellow-100/75">
      <AlertTriangle className="mt-0.5 shrink-0" size={18} />
      <span>{text}</span>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "green" | "orange" | "blue" }) {
  const toneClass = tone === "green" ? "text-brand-neon" : tone === "orange" ? "text-brand-orange" : "text-brand-blue";
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
      <div className={cn("text-lg font-black md:text-xl", toneClass)}>{value}</div>
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

function StatusBadge({ status, compact = false }: { status: EliteAnalyticsStatus; compact?: boolean }) {
  const label = statusLabel(status);
  return (
    <span className={cn(
      "inline-flex w-fit items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
      compact && "px-2 py-0.5 text-[9px]",
      status === "ready" && "border-brand-neon/40 bg-brand-neon/10 text-brand-neon",
      status === "partial" && "border-brand-orange/40 bg-brand-orange/10 text-brand-orange",
      status === "insufficient_data" && "border-yellow-400/35 bg-yellow-400/10 text-yellow-200",
    )}>
      {label}
    </span>
  );
}

function buildTeam(analyses: LocalAnalysis[]): EliteAthleteSummary[] {
  return [
    { id: "local", name: "BasketMotion Athlete", role: "Observed", analyses },
    { id: "sample-guard", name: "James L.", role: "Guard", analyses: sampleAnalyses("sample-guard", 84, 15, 6) },
    { id: "sample-forward", name: "Noah Wilson", role: "Forward", analyses: sampleAnalyses("sample-forward", 89, 18, 4) },
  ];
}

function sampleAnalyses(id: string, score: number, made: number, missed: number): LocalAnalysis[] {
  return [{
    id,
    title: "Coach validated sample",
    source: "drill",
    createdAt: "2026-08-01T10:00:00.000Z",
    score,
    confidenceScore: 82,
    qualityScore: 80,
    madeShots: made,
    missedShots: missed,
    strengths: ["Stable release"],
    weaknesses: [],
    recommendations: ["Maintain current load"],
  }];
}

function formatScore(value: number | null, unit: string) {
  if (value === null) return "N/A";
  return `${Math.round(value)}${unit}`;
}

function formatDelta(value: number | null) {
  if (value === null) return "N/A";
  return `${value > 0 ? "+" : ""}${Math.round(value)}%`;
}

function fatigueLabel(report: EliteAnalyticsReport) {
  if (report.fatigue.label === "unknown") return "N/A";
  return report.fatigue.label;
}

function statusLabel(status: EliteAnalyticsStatus) {
  if (status === "ready") return "Ready";
  if (status === "partial") return "Partial";
  return "Needs data";
}
