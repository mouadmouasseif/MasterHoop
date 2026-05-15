import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Activity, Award, Download, LineChart as LineIcon, Target, Video } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import StatCard from '@/src/components/ui/StatCard';
import { downloadJson, getLocalAnalyses } from '@/src/services/localAnalysisService';

export default function Dashboard(props: any) {
  const { sessions = [], profile } = props;
  const analyses = getLocalAnalyses();

  const stats = useMemo(() => {
    const madeFromSessions = sessions.reduce((acc: number, session: any) => acc + (session.madeShots || 0), 0);
    const missedFromSessions = sessions.reduce((acc: number, session: any) => acc + (session.missedShots || 0), 0);
    const madeFromAnalyses = analyses.reduce((acc, analysis) => acc + analysis.madeShots, 0);
    const missedFromAnalyses = analyses.reduce((acc, analysis) => acc + analysis.missedShots, 0);
    const made = madeFromSessions + madeFromAnalyses;
    const missed = missedFromSessions + missedFromAnalyses;
    const total = made + missed || 1;
    const avgScore = analyses.length ? Math.round(analyses.reduce((acc, analysis) => acc + analysis.score, 0) / analyses.length) : Math.round((made / total) * 100);
    return { made, missed, total, avgScore };
  }, [sessions, analyses]);

  const chartData = analyses.length
    ? [...analyses].reverse().slice(-10).map((analysis, index) => ({ session: `A${index + 1}`, accuracy: analysis.score }))
    : [{ session: 'A1', accuracy: 72 }, { session: 'A2', accuracy: 80 }, { session: 'A3', accuracy: 76 }];

  return (
    <motion.div key="stats" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-brand-orange">Stats</div>
          <h2 className="text-3xl font-black uppercase">Performance globale</h2>
          <p className="mt-2 text-sm text-white/50">Stats des entrainements live, drills testes et videos uploadees.</p>
        </div>
        <button
          onClick={() => downloadJson('master-hoop-stats.json', { profile, sessions, analyses })}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold hover:bg-white/10"
        >
          <Download size={17} /> Telecharger data
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Target />} value={`${stats.made}`} label="Paniers reussis" color="text-brand-neon" />
        <StatCard icon={<Activity />} value={`${stats.missed}`} label="Paniers manques" color="text-red-400" />
        <StatCard icon={<Award />} value={`${stats.avgScore}%`} label="Score IA moyen" color="text-brand-orange" />
        <StatCard icon={<Video />} value={`${analyses.length}`} label="Rapports IA" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-card p-6">
          <h3 className="mb-6 flex items-center gap-2 text-xl font-black"><LineIcon className="text-brand-orange" /> Progression score IA</h3>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="session" stroke="#ffffff40" fontSize={10} />
                <YAxis stroke="#ffffff40" fontSize={10} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#161617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                <Line type="monotone" dataKey="accuracy" stroke="#FF6B00" strokeWidth={3} dot={{ r: 4, fill: '#FF6B00' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="mb-5 text-xl font-black">Dernieres analyses</h3>
          <div className="space-y-3">
            {analyses.slice(0, 5).map((analysis) => (
              <div key={analysis.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold">{analysis.title}</div>
                    <div className="text-xs text-white/40">{new Date(analysis.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="text-2xl font-black text-brand-neon">{analysis.score}%</div>
                </div>
              </div>
            ))}
            {analyses.length === 0 && <div className="rounded-2xl border border-white/10 p-6 text-sm text-white/45">Aucune analyse sauvegardee. Lance un drill ou upload une video.</div>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
