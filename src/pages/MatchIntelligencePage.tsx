import { motion } from "motion/react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Check, Clock, FileText, Gauge, ListChecks, Play, Plus, ShieldCheck, TimerReset, X } from "lucide-react";
import {
  buildMatchIntelligenceDashboard,
  createMatchEvent,
  importManualTimeline,
  rejectSuggestedEvent,
  validateSuggestedEvent,
} from "@/src/match-intelligence/matchIntelligenceEngine";
import type { MatchSetup } from "@/src/match-intelligence/types";
import { cn } from "@/src/lib/utils";
import type { MatchEvent, MatchEventType } from "@/src/types/match";

const setup: MatchSetup = {
  matchId: "basketmotion-match-local",
  homeTeam: "BasketMotion A",
  awayTeam: "BasketMotion B",
  periodLengthMinutes: 10,
  periods: 4,
  roster: [
    { id: "a1", name: "James L.", number: 7, team: "A" },
    { id: "a2", name: "Liam J.", number: 12, team: "A" },
    { id: "b1", name: "Noah W.", number: 11, team: "B" },
    { id: "b2", name: "Ethan O.", number: 22, team: "B" },
  ],
};

const eventButtons: Array<{ type: MatchEventType; label: string; points?: 1 | 2 | 3 }> = [
  { type: "possession", label: "Possession" },
  { type: "made_shot", label: "2PT", points: 2 },
  { type: "made_shot", label: "3PT", points: 3 },
  { type: "missed_shot", label: "Miss" },
  { type: "assist", label: "Assist" },
  { type: "rebound", label: "Rebound" },
  { type: "steal", label: "Steal" },
  { type: "turnover", label: "Turnover" },
  { type: "block", label: "Block" },
  { type: "fast_break", label: "Fast break" },
  { type: "foul", label: "Foul" },
  { type: "timeout", label: "Timeout" },
];

export default function MatchIntelligencePage() {
  const [team, setTeam] = useState<"A" | "B">("A");
  const [playerId, setPlayerId] = useState("a1");
  const [clock, setClock] = useState(0);
  const [manualText, setManualText] = useState("12,made,A,a1,3\n28,assist,A,a2\n44,rebound,B,b1");
  const [events, setEvents] = useState<MatchEvent[]>([
    createMatchEvent({ timestamp: 0, type: "match_started", team: "A", playerId: "system", note: "Manual assisted match started" }),
    createMatchEvent({ timestamp: 18, type: "made_shot", team: "A", playerId: "a1", points: 2, confidence: 0.64, status: "suggested", note: "AI suggestion pending coach validation" }),
    createMatchEvent({ timestamp: 36, type: "rebound", team: "B", playerId: "b1", confidence: 1, status: "manual" }),
  ]);

  const dashboard = useMemo(() => buildMatchIntelligenceDashboard(setup, events), [events]);
  const players = setup.roster.filter((player) => player.team === team);

  const addEvent = (type: MatchEventType, points?: 1 | 2 | 3) => {
    setEvents((current) => [
      ...current,
      createMatchEvent({
        timestamp: clock,
        type,
        team,
        playerId,
        points,
        confidence: 1,
        status: "manual",
        note: "Manual coach entry",
      }),
    ]);
    setClock((value) => value + 12);
  };

  return (
    <motion.div
      key="match-intelligence-sprint-6"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      className="space-y-7"
    >
      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="glass-card p-5 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-brand-orange">Version 3.5</div>
              <h2 className="text-3xl font-black uppercase md:text-4xl">Match intelligence</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
                Manual assisted timeline, score, events, statistics and coach validation before official reports.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Metric label={setup.homeTeam} value={String(dashboard.score.A)} tone="orange" />
              <Metric label={setup.awayTeam} value={String(dashboard.score.B)} tone="green" />
              <Metric label="Queue" value={String(dashboard.validationQueue.length)} tone="blue" />
            </div>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-4">
            <HeroSignal icon={<Play size={20} />} label="Mode" value="Manual" />
            <HeroSignal icon={<Clock size={20} />} label="Clock" value={formatClock(clock)} />
            <HeroSignal icon={<ListChecks size={20} />} label="Events" value={String(dashboard.timeline.length)} />
            <HeroSignal icon={<ShieldCheck size={20} />} label="Winner" value={dashboard.summary.winner === "draw" ? "Draw" : `Team ${dashboard.summary.winner}`} />
          </div>
        </div>

        <Panel title="Event entry" icon={<Plus size={18} />} tone="orange">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select label="Team" value={team} onChange={(value) => {
              const nextTeam = value as "A" | "B";
              setTeam(nextTeam);
              setPlayerId(setup.roster.find((player) => player.team === nextTeam)?.id || "");
            }} options={[["A", setup.homeTeam], ["B", setup.awayTeam]]} />
            <Select label="Player" value={playerId} onChange={setPlayerId} options={players.map((player) => [player.id, `#${player.number} ${player.name}`])} />
            <label>
              <span className="mb-2 block text-xs font-black uppercase text-white/35">Second</span>
              <input value={clock} onChange={(event) => setClock(Math.max(0, Number(event.target.value)))} type="number" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm font-bold outline-none focus:border-brand-orange" />
            </label>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {eventButtons.map((event) => (
              <button key={`${event.type}-${event.label}`} onClick={() => addEvent(event.type, event.points)} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-xs font-black uppercase text-white/70 transition hover:border-brand-orange/50 hover:bg-brand-orange/10">
                {event.label}
              </button>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Coach validation" icon={<ShieldCheck size={18} />} tone="green">
          <div className="space-y-3">
            {dashboard.validationQueue.map((item) => (
              <div key={item.event.id} className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-black uppercase text-yellow-100">{eventLabel(item.event.type)} - Team {item.event.team}</div>
                    <p className="mt-1 text-xs leading-5 text-yellow-100/65">{item.reason}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEvents((current) => validateSuggestedEvent(current, item.event.id))} className="inline-flex items-center gap-1 rounded-lg bg-brand-neon px-3 py-2 text-xs font-black text-black"><Check size={14} /> Valid</button>
                    <button onClick={() => setEvents((current) => rejectSuggestedEvent(current, item.event.id))} className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-3 py-2 text-xs font-black text-white"><X size={14} /> Reject</button>
                  </div>
                </div>
              </div>
            ))}
            {!dashboard.validationQueue.length && <EmptyState text="No pending AI suggestion. Official stats are based on manual or validated events." />}
          </div>
        </Panel>

        <Panel title="Live dashboard" icon={<Gauge size={18} />} tone="orange">
          <div className="grid gap-3 sm:grid-cols-4">
            <Metric label="Possessions" value={String(dashboard.teamStats.possessions)} tone="blue" />
            <Metric label="Assists" value={String(dashboard.teamStats.assists)} tone="green" />
            <Metric label="Rebounds" value={String(dashboard.teamStats.rebounds)} tone="orange" />
            <Metric label="Turnovers" value={String(dashboard.teamStats.turnovers)} tone="orange" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <Metric label="Steals" value={String(dashboard.teamStats.steals)} tone="green" />
            <Metric label="Blocks" value={String(dashboard.teamStats.blocks)} tone="blue" />
            <Metric label="Fast breaks" value={String(dashboard.teamStats.fastBreaks)} tone="orange" />
            <Metric label="Fouls" value={String(dashboard.teamStats.fouls)} tone="blue" />
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="Timeline" icon={<TimerReset size={18} />} tone="green">
          <div className="max-h-[430px] space-y-3 overflow-auto pr-1">
            {dashboard.timeline.map((event) => (
              <div key={event.id} className={cn("rounded-xl border p-4", event.status === "rejected" ? "border-red-400/20 bg-red-400/10 opacity-70" : "border-white/10 bg-black/20")}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black uppercase">{eventLabel(event.type)} · Team {event.team}</div>
                    <div className="mt-1 text-xs text-white/40">{formatClock(event.timestamp)} · {event.playerId} · {event.status || "manual"}</div>
                  </div>
                  <div className="text-xl font-black text-brand-orange">{event.points ? `+${event.points}` : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Manual importer" icon={<FileText size={18} />} tone="orange">
          <textarea value={manualText} onChange={(event) => setManualText(event.target.value)} className="min-h-40 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm leading-6 text-white/75 outline-none focus:border-brand-orange" />
          <button onClick={() => setEvents((current) => [...current, ...importManualTimeline(manualText)])} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 py-3 text-sm font-black text-white">
            <FileText size={17} /> Import timeline
          </button>
          <div className="mt-4 space-y-2">
            {dashboard.limitations.map((limit) => (
              <div key={limit} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs leading-5 text-white/50">{limit}</div>
            ))}
          </div>
        </Panel>
      </section>
    </motion.div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return (
    <label>
      <span className="mb-2 block text-xs font-black uppercase text-white/35">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm font-bold outline-none focus:border-brand-orange">
        {options.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}
      </select>
    </label>
  );
}

function HeroSignal({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3 text-brand-orange">{icon}</div>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">{label}</div>
    </div>
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/55">
      {text}
    </div>
  );
}

function eventLabel(type: MatchEventType) {
  return type.replace(/_/g, " ");
}

function formatClock(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}
