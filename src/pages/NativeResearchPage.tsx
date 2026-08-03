import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Activity, CheckCircle2, Cpu, FlaskConical, Laptop, Lock, MonitorSmartphone, Smartphone, Watch } from "lucide-react";
import { buildNativeResearchDashboard } from "@/src/native-research/nativeResearchService";
import type { NativeResearchStatus } from "@/src/native-research/types";
import { cn } from "@/src/lib/utils";

const dashboard = buildNativeResearchDashboard();

export default function NativeResearchPage() {
  return (
    <motion.div
      key="native-research-sprint-8"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      className="space-y-7"
    >
      <section className="glass-card p-5 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-brand-blue">Version 4.0 Research</div>
            <h2 className="text-3xl font-black uppercase md:text-4xl">Native and research preview</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
              Mobile, desktop, wearables and research tracks prepared with explicit preview, experimental and configuration states.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <Metric label="Preview" value={String(dashboard.readiness.preview)} tone="green" />
            <Metric label="Experimental" value={String(dashboard.readiness.experimental)} tone="orange" />
            <Metric label="Config" value={String(dashboard.readiness.requiresConfiguration)} tone="blue" />
            <Metric label="Blocked" value={String(dashboard.readiness.blocked)} tone="red" />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Native targets" icon={<MonitorSmartphone size={18} />} tone="blue">
          <div className="grid gap-3 md:grid-cols-2">
            {dashboard.nativeTargets.map((target) => (
              <div key={target.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <TargetIcon platform={target.platform} />
                    <div>
                      <div className="font-black">{target.name}</div>
                      <div className="text-xs text-white/35">{target.preferredStack}</div>
                    </div>
                  </div>
                  <StatusBadge status={target.status} compact />
                </div>
                <div className="space-y-2">
                  {target.capabilities.map((capability) => (
                    <div key={capability} className="rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-white/55">{capability}</div>
                  ))}
                </div>
                {target.requiredConfig.length > 0 && (
                  <div className="mt-3 rounded-lg border border-yellow-400/20 bg-yellow-400/10 px-3 py-2 text-xs leading-5 text-yellow-100/70">
                    Requires: {target.requiredConfig.join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Device benchmark plan" icon={<Activity size={18} />} tone="green">
          <StatusBadge status={dashboard.benchmarkPlan.status} />
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {dashboard.benchmarkPlan.metrics.map((metric) => (
              <div key={metric} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/60">
                <CheckCircle2 size={15} className="text-brand-neon" /> {metric}
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-white/55">
            {dashboard.benchmarkPlan.limitations[0]}
          </div>
        </Panel>
      </section>

      <Panel title="Research modules" icon={<FlaskConical size={18} />} tone="orange">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dashboard.researchModules.map((module) => (
            <article key={module.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-black">{module.title}</div>
                  <div className="mt-1 text-xs font-black uppercase text-white/35">{module.category}</div>
                </div>
                <StatusBadge status={module.status} compact />
              </div>
              <p className="text-sm leading-6 text-white/55">{module.description}</p>
              <div className="mt-4 space-y-2">
                {(module.requiredEvidence.length ? module.requiredEvidence : ["Evidence complete for preview"]).map((item) => (
                  <div key={item} className="rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-white/50">{item}</div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </Panel>

      <Panel title="Research limits" icon={<Lock size={18} />} tone="green">
        <div className="grid gap-3 md:grid-cols-3">
          {dashboard.limitations.map((limit) => (
            <div key={limit} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white/60">{limit}</div>
          ))}
        </div>
      </Panel>
    </motion.div>
  );
}

function TargetIcon({ platform }: { platform: string }) {
  const className = "text-brand-blue";
  if (platform === "mobile") return <Smartphone size={20} className={className} />;
  if (platform === "desktop") return <Laptop size={20} className={className} />;
  if (platform === "wearable") return <Watch size={20} className={className} />;
  return <Cpu size={20} className={className} />;
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "green" | "orange" | "blue" | "red" }) {
  const toneClass = tone === "green" ? "text-brand-neon" : tone === "orange" ? "text-brand-orange" : tone === "red" ? "text-red-300" : "text-brand-blue";
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
      <div className={cn("text-xl font-black", toneClass)}>{value}</div>
      <div className="mt-1 text-[10px] font-black uppercase text-white/35">{label}</div>
    </div>
  );
}

function Panel({ title, icon, tone, children }: { title: string; icon: ReactNode; tone: "green" | "orange" | "blue"; children: ReactNode }) {
  const toneClass = tone === "green" ? "border-brand-neon/20" : tone === "orange" ? "border-brand-orange/20" : "border-brand-blue/20";
  const textClass = tone === "green" ? "text-brand-neon" : tone === "orange" ? "text-brand-orange" : "text-brand-blue";
  return (
    <div className={cn("glass-card p-5", toneClass)}>
      <div className={cn("mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em]", textClass)}>
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function StatusBadge({ status, compact = false }: { status: NativeResearchStatus; compact?: boolean }) {
  const label = status.replace(/_/g, " ");
  return (
    <span className={cn(
      "inline-flex w-fit rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
      compact && "px-2 py-0.5 text-[9px]",
      status === "preview" && "border-brand-neon/40 bg-brand-neon/10 text-brand-neon",
      status === "experimental" && "border-brand-orange/40 bg-brand-orange/10 text-brand-orange",
      status === "requires_configuration" && "border-yellow-400/35 bg-yellow-400/10 text-yellow-200",
      status === "blocked" && "border-red-400/35 bg-red-400/10 text-red-200",
    )}>
      {label}
    </span>
  );
}
