import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import type { User as FirebaseUser } from "firebase/auth";
import { AlertTriangle, Brain, CheckCircle2, Clock, Dumbbell, Gauge, ListChecks, ShieldCheck, Target } from "lucide-react";
import { generateAICoachRecommendationV4, generateWeeklyTrainingPlan } from "@/src/ai-coach/aiCoachEngine";
import type { AICoachContext } from "@/src/ai-coach/types";
import { getLocalAnalyses } from "@/src/services/localAnalysisService";
import { listTrainingSessions } from "@/src/services/sessionService";
import type { UserProfile } from "@/src/types";
import type { SessionLike } from "@/src/types/aiAssistant";
import { cn } from "@/src/lib/utils";

type Props = {
  user: FirebaseUser | null;
  profile?: UserProfile | null;
};

export default function AICoachPage({ user, profile }: Props) {
  const [sessions, setSessions] = useState<SessionLike[]>([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState<string | null>(null);
  const [objective, setObjective] = useState("Improve shooting consistency");
  const [frequency, setFrequency] = useState(3);
  const [equipment, setEquipment] = useState("ball, hoop");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const firebaseSessions = user ? await listTrainingSessions(user.uid) : [];
        if (!cancelled) setSessions(firebaseSessions.length ? firebaseSessions : localAnalysesToSessions());
      } catch (loadError) {
        if (!cancelled) {
          setSessions(localAnalysesToSessions());
          setError(loadError instanceof Error ? loadError.message : "Firebase sessions unavailable. Using local analyses.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const context = useMemo<AICoachContext>(() => ({
    athleteId: user?.uid || profile?.userId || "local-athlete",
    objective,
    position: profile?.basketballPosition || undefined,
    level: "intermediate",
    weeklyFrequency: frequency,
    equipment: equipment.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean),
    sessions,
  }), [equipment, frequency, objective, profile?.basketballPosition, profile?.userId, sessions, user?.uid]);

  const recommendation = useMemo(() => generateAICoachRecommendationV4(context), [context]);
  const plan = useMemo(() => generateWeeklyTrainingPlan(context, 1), [context]);

  return (
    <motion.div key="ai-coach-v4" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }} className="space-y-7">
      <section className="glass-card overflow-hidden p-5 sm:p-6">
        <div className="grid gap-6 xl:grid-cols-[1fr_0.82fr] xl:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-brand-orange">
              <Brain size={15} /> Sprint 4 - AI Coach
            </div>
            <h2 className="text-3xl font-black uppercase md:text-4xl">BasketMotion AI Coach</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">
              Rule-based coaching from observed sessions only. No generic chatbot, no recommendation when data is insufficient.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Sessions" value={sessions.length} />
            <Metric label="Confidence" value={`${recommendation.confidence}%`} />
            <Metric label="Status" value={recommendation.status === "ready" ? "Ready" : "Need data"} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="space-y-5">
          <Panel title="Inputs" icon={<Target size={18} />} tone="orange">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-wider text-white/40">Objective</span>
                <input value={objective} onChange={(event) => setObjective(event.target.value)} className="min-h-12 w-full rounded-xl border border-white/10 bg-black/25 px-4 text-sm outline-none focus:border-brand-orange" />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-wider text-white/40">Weekly frequency</span>
                <input type="number" min={2} max={6} value={frequency} onChange={(event) => setFrequency(Number(event.target.value))} className="min-h-12 w-full rounded-xl border border-white/10 bg-black/25 px-4 text-sm outline-none focus:border-brand-orange" />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-wider text-white/40">Equipment</span>
                <input value={equipment} onChange={(event) => setEquipment(event.target.value)} className="min-h-12 w-full rounded-xl border border-white/10 bg-black/25 px-4 text-sm outline-none focus:border-brand-orange" />
              </label>
            </div>
          </Panel>

          <Panel title="Evidence" icon={<ListChecks size={18} />} tone="green">
            {loading ? (
              <div className="space-y-3">
                <div className="h-4 animate-pulse rounded bg-white/10" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
              </div>
            ) : (
              <div className="space-y-3">
                {error && <div className="rounded-xl border border-brand-orange/20 bg-brand-orange/10 p-3 text-xs text-brand-orange">{error}</div>}
                {recommendation.basedOnMetrics.length ? recommendation.basedOnMetrics.map((metric) => (
                  <div key={metric} className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2 text-sm text-white/65">
                    <CheckCircle2 size={15} className="text-brand-neon" /> {metric}
                  </div>
                )) : <Empty text="No reliable observed metrics yet." />}
              </div>
            )}
          </Panel>
        </div>

        <Panel title="Recommendation" icon={<Brain size={18} />} tone={recommendation.status === "ready" ? "green" : "orange"}>
          <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
            <div>
              <div className={cn("mb-3 inline-flex rounded-lg px-3 py-1 text-xs font-black uppercase", recommendation.status === "ready" ? "bg-brand-neon/10 text-brand-neon" : "bg-brand-orange/10 text-brand-orange")}>
                {recommendation.status === "ready" ? "Recommendation ready" : "Insufficient data"}
              </div>
              <h3 className="text-2xl font-black">{recommendation.objective}</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">{recommendation.reason}</p>
              {recommendation.currentState && <InfoLine label="Current state" value={recommendation.currentState} />}
              {recommendation.target && <InfoLine label="Target" value={recommendation.target} />}
              {recommendation.durationMinutes && <InfoLine label="Duration" value={`${recommendation.durationMinutes} min`} />}
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-brand-orange">
                <Dumbbell size={17} /> Drills
              </div>
              <div className="space-y-2">
                {recommendation.drills.length ? recommendation.drills.map((drill) => (
                  <div key={drill} className="rounded-lg bg-white/[0.03] px-3 py-2 text-sm text-white/70">{drill}</div>
                )) : <Empty text="Collect more sessions before assigning drills." />}
              </div>
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.82fr]">
        <Panel title="Generated weekly plan" icon={<Clock size={18} />} tone="orange">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {plan.sessions.map((session) => (
              <div key={session.day} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-black">{session.day}</div>
                  <span className="rounded-lg bg-white/[0.04] px-2 py-1 text-[10px] font-black uppercase text-white/45">{session.intensity}</span>
                </div>
                <div className="mb-3 text-xs text-white/40">{session.durationMinutes} min</div>
                <div className="space-y-2">
                  {session.drills.map((drill) => <div key={drill} className="rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-white/65">{drill}</div>)}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Limitations" icon={<ShieldCheck size={18} />} tone="green">
          <div className="space-y-3">
            {recommendation.limitations.map((limitation) => (
              <div key={limitation} className="flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/60">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-brand-orange" /> {limitation}
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </motion.div>
  );
}

function localAnalysesToSessions(): SessionLike[] {
  return getLocalAnalyses().map((analysis) => ({
    id: analysis.id,
    duration: 0,
    drillName: analysis.drill || analysis.title,
    score: analysis.score,
    createdAt: analysis.createdAt,
    metrics: {
      madeShots: analysis.madeShots,
      missedShots: analysis.missedShots,
      confidenceScore: analysis.confidenceScore || analysis.score,
    },
  }));
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
      <Gauge className="mb-2 text-brand-orange" size={18} />
      <div className="text-xl font-black">{value}</div>
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

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="text-xs font-black uppercase text-white/35">{label}</div>
      <div className="mt-1 text-sm font-bold text-white">{value}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/45">{text}</div>;
}
