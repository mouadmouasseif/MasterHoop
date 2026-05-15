import { motion } from 'motion/react';
import { CalendarClock, Download, Play, Video } from 'lucide-react';
import { downloadJson, getLocalAnalyses } from '@/src/services/localAnalysisService';

export default function HistoryPage(props: any) {
  const { sessions = [] } = props;
  const analyses = getLocalAnalyses();

  return (
    <motion.div key="history" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-brand-orange">Historique</div>
          <h2 className="text-3xl font-black uppercase">Entrainements passes</h2>
          <p className="mt-2 text-sm text-white/50">Videos live, uploads, tests drills et rapports IA sauvegardes.</p>
        </div>
        <button
          onClick={() => downloadJson('master-hoop-history.json', { sessions, analyses })}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold hover:bg-white/10"
        >
          <Download size={17} /> Export history
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {analyses.map((analysis) => (
          <article key={analysis.id} className="overflow-hidden rounded-3xl border border-white/10 bg-brand-surface/70">
            {analysis.videoUrl ? (
              <video src={analysis.videoUrl} controls className="aspect-video w-full bg-black object-cover" />
            ) : (
              <div className="flex aspect-video items-center justify-center bg-black/40">
                <Play className="text-brand-orange" size={44} />
              </div>
            )}
            <div className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black">{analysis.title}</h3>
                  <div className="mt-1 flex items-center gap-2 text-xs text-white/40">
                    <CalendarClock size={13} /> {new Date(analysis.createdAt).toLocaleString()}
                  </div>
                </div>
                <span className="rounded-xl bg-brand-neon/15 px-3 py-1 text-lg font-black text-brand-neon">{analysis.score}%</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                <div><span className="font-black text-brand-neon">Bonne partie:</span> {analysis.strengths[0]}</div>
                <div className="mt-2"><span className="font-black text-red-300">A corriger:</span> {analysis.weaknesses[0]}</div>
              </div>
              <div className="text-xs uppercase tracking-widest text-white/35">{analysis.source} {analysis.drill ? `- ${analysis.drill}` : ''}</div>
            </div>
          </article>
        ))}

        {sessions.map((session: any) => (
          <article key={session.id} className="overflow-hidden rounded-3xl border border-white/10 bg-brand-surface/70">
            <video src={session.videoUrl} controls className="aspect-video w-full bg-black object-cover" />
            <div className="p-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-black">Session live</h3>
                <span className="font-black text-brand-orange">{session.accuracy}%</span>
              </div>
              <p className="text-sm text-white/45">{session.notes || 'Aucune note ajoutee.'}</p>
            </div>
          </article>
        ))}
      </div>

      {analyses.length === 0 && sessions.length === 0 && (
        <div className="glass-card flex flex-col items-center justify-center p-16 text-center text-white/45">
          <Video size={56} className="mb-5 text-white/20" />
          Aucun entrainement sauvegarde pour le moment.
        </div>
      )}
    </motion.div>
  );
}
