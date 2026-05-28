import { motion } from "motion/react";
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { Video } from "lucide-react";

import AIAnalyticsPanel from "@/src/components/AIAnalyticsPanel";
import SessionHistory from "@/src/components/SessionHistory";
import SessionPlayer from "@/src/components/SessionPlayer";
import { analyzeBasketballSession } from "@/src/services/aiAnalysisService";
import { listTrainingSessions, type TrainingSession } from "@/src/services/sessionService";

export default function History({ user, refreshKey = 0 }: { user: User | null; refreshKey?: number }) {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [selected, setSelected] = useState<TrainingSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) return;
      setLoading(true);
      try {
        const next = await listTrainingSessions(user.uid);
        if (!cancelled) {
          setSessions(next);
          setSelected((current) => current || next[0] || null);
        }
      } catch (error) {
        console.error("Session history load failed:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, refreshKey]);

  const selectedAnalysis = selected
    ? analyzeBasketballSession({
        madeShots: Number(selected.metrics?.madeShots || 0),
        missedShots: Number(selected.metrics?.missedShots || 0),
        dribbleCount: Number(selected.metrics?.dribbleCount || 0),
      } as any)
    : null;

  return (
    <motion.div
      key="history"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="space-y-6"
    >
      <div>
        <div className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-brand-orange">History</div>
        <h2 className="text-3xl font-black uppercase">Session Replay</h2>
        <p className="mt-2 text-sm text-white/50">Private cloud videos, AI feedback, score comparison, and improvement review.</p>
      </div>

      {selected && (
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <SessionPlayer session={selected} />
          {selectedAnalysis && <AIAnalyticsPanel analysis={{ ...selectedAnalysis, score: selected.score || selectedAnalysis.score, aiFeedback: selected.aiFeedback || selectedAnalysis.aiFeedback }} />}
        </div>
      )}

      {loading ? (
        <div className="glass-card p-10 text-center text-white/45">Loading sessions...</div>
      ) : sessions.length > 0 ? (
        <SessionHistory sessions={sessions} selectedId={selected?.id} onSelect={setSelected} />
      ) : (
        <div className="glass-card flex flex-col items-center justify-center p-16 text-center text-white/45">
          <Video size={56} className="mb-5 text-white/20" />
          No saved sessions yet. Record live or upload a training video to build your history.
        </div>
      )}
    </motion.div>
  );
}
