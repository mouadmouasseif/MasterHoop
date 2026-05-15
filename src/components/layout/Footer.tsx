import { Activity, Brain, Camera, Target } from 'lucide-react';
import masterHoopLogo from '@/src/assets/master-hoop-logo.png';

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-white/10 bg-black/20 px-4 py-8 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <img src={masterHoopLogo} alt="Master Hoop logo" className="h-14 w-14 rounded-xl object-cover ring-1 ring-white/10" />
          <div>
            <div className="text-sm font-black uppercase tracking-widest text-white">Master Hoop</div>
            <div className="text-xs text-white/40">Basketball Training AI by Mouad-Mouasseif</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs text-white/50 md:grid-cols-4">
          <span className="flex items-center gap-2"><Target size={14} className="text-brand-orange" /> Drills</span>
          <span className="flex items-center gap-2"><Camera size={14} className="text-blue-400" /> Camera AI</span>
          <span className="flex items-center gap-2"><Activity size={14} className="text-brand-neon" /> Scoring</span>
          <span className="flex items-center gap-2"><Brain size={14} className="text-brand-orange" /> Feedback IA</span>
        </div>
      </div>
    </footer>
  );
}
