import { motion } from "motion/react";
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { Download, FileSpreadsheet, Printer, Share2, Video } from "lucide-react";

import AIAnalyticsPanel from "@/src/components/AIAnalyticsPanel";
import SessionHistory from "@/src/components/SessionHistory";
import SessionPlayer from "@/src/components/SessionPlayer";
import { analyzeBasketballSession } from "@/src/services/aiAnalysisService";
import { exportExcelWorkbook, exportProfessionalPdf, exportSessionsCsv } from "@/src/services/exportService";
import { listTrainingSessions, type TrainingSession } from "@/src/services/sessionService";
import { subscribeSharedVideos } from "@/src/services/socialService";
import type { SharedVideoSession } from "@/src/types";

export default function History({ user, refreshKey = 0 }: { user: User | null; refreshKey?: number }) {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [selected, setSelected] = useState<TrainingSession | null>(null);
  const [sharedVideos, setSharedVideos] = useState<SharedVideoSession[]>([]);
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

  useEffect(() => {
    if (!user) return undefined;
    return subscribeSharedVideos(user.uid, setSharedVideos);
  }, [user]);

  const selectedAnalysis = selected
    ? analyzeBasketballSession({
        madeShots: Number(selected.metrics?.madeShots || 0),
        missedShots: Number(selected.metrics?.missedShots || 0),
        dribbleCount: Number(selected.metrics?.dribbleCount || 0),
      } as any)
    : null;
  const recommendations = selected?.recommendations || selectedAnalysis?.suggestions || [];

  return (
    <motion.div
      key="history"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-brand-orange">History</div>
          <h2 className="text-3xl font-black uppercase">Session Replay</h2>
          <p className="mt-2 text-sm text-white/50">Mes videos, matchs, statistiques, analyses IA et sessions partagees par une equipe.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => exportProfessionalPdf({ sessions, recommendations })} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black"><Printer size={15} /> PDF</button>
          <button onClick={() => exportExcelWorkbook({ sessions, recommendations })} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black"><FileSpreadsheet size={15} /> Excel</button>
          <button onClick={() => exportSessionsCsv({ sessions, recommendations })} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black"><Download size={15} /> CSV</button>
        </div>
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

      <div className="glass-card max-w-full overflow-hidden p-6">
        <div className="mb-4 flex items-center gap-2 text-xl font-black uppercase"><Share2 className="text-brand-orange" /> Videos synchronisees</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sharedVideos.map((item) => (
            <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="font-black">{item.matchId ? `Match ${item.matchId.slice(0, 8)}` : "Video Session"}</div>
              <div className="mt-1 text-xs text-white/40">{(item.participantUids || []).length} participant(s)</div>
              <div className="mt-3 text-xs text-brand-neon">Video, analyse IA, rapport et statistiques disponibles pour chaque membre.</div>
              {item.videoUrl && (
                <video src={item.videoUrl} controls className="mt-4 aspect-video w-full rounded-xl bg-black object-cover" />
              )}
            </div>
          ))}
          {sharedVideos.length === 0 && <div className="text-sm text-white/45">Aucune video partagee pour le moment.</div>}
        </div>
      </div>
    </motion.div>
  );
}
