import type { Drill } from '@/src/components/DrillTutorials';

export default function DrillCard({ drill, onStart }: { drill: Drill; onStart: (drill: Drill) => void }) {
  return (
    <button onClick={() => onStart(drill)} className="glass-card p-5 text-left hover:border-brand-orange/50 transition-all">
      <div className="font-bold mb-1">{drill.name}</div>
      <div className="text-sm text-white/40">{drill.description}</div>
    </button>
  );
}
