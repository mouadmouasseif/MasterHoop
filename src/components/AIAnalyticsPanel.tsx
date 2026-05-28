import { Brain, CheckCircle2, Target, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import type { AIAnalysisResult } from "@/src/services/aiAnalysisService";

export default function AIAnalyticsPanel({ analysis }: { analysis: AIAnalysisResult }) {
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-brand-surface/70 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand-orange">
            <Brain size={16} /> AI Analytics
          </div>
          <p className="mt-2 text-sm text-white/55">{analysis.aiFeedback}</p>
        </div>
        <div className="rounded-2xl bg-brand-neon/15 px-4 py-3 text-3xl font-black text-brand-neon">
          {analysis.score}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        {Object.entries(analysis.metrics).map(([key, value]) => (
          <div key={key} className="rounded-xl border border-white/10 bg-black/25 p-3">
            <div className="text-[10px] font-bold uppercase text-white/35">{key.replace(/([A-Z])/g, " $1")}</div>
            <div className="mt-1 text-xl font-black">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <List title="Strengths" icon={<CheckCircle2 size={16} />} items={analysis.strengths} color="text-brand-neon" />
        <List title="Weaknesses" icon={<Target size={16} />} items={analysis.weaknesses} color="text-red-300" />
        <List title="Suggestions" icon={<TrendingUp size={16} />} items={analysis.suggestions} color="text-brand-orange" />
      </div>
    </div>
  );
}

function List({ title, icon, items, color }: { title: string; icon: ReactNode; items: string[]; color: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className={`mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest ${color}`}>
        {icon} {title}
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="text-sm leading-5 text-white/60">{item}</div>
        ))}
      </div>
    </div>
  );
}
