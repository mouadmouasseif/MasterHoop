import { Activity, Brain, Camera, Github, Globe2, Instagram, Linkedin, Target } from 'lucide-react';
import BasketMotion-AiLogo from '@/src/assets/basketmotion-logo.png';

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-white/10 bg-black/30 px-4 py-8 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-7 lg:grid-cols-[1fr_1fr_1fr]">
        <div className="flex items-center gap-4">
          <img src={BasketMotion-AiLogo} alt="Basket Motion logo" className="h-14 w-14 rounded-xl object-cover ring-1 ring-white/10" />
          <div>
            <div className="text-sm font-black uppercase tracking-widest text-white">Basket Motion</div>
            <div className="text-xs text-white/40">Basketball social training AI</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs text-white/50 sm:grid-cols-4 lg:grid-cols-2">
          <span className="flex items-center gap-2"><Target size={14} className="text-brand-orange" /> Drills</span>
          <span className="flex items-center gap-2"><Camera size={14} className="text-blue-400" /> Camera AI</span>
          <span className="flex items-center gap-2"><Activity size={14} className="text-brand-neon" /> Scoring</span>
          <span className="flex items-center gap-2"><Brain size={14} className="text-brand-orange" /> Feedback IA</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-black uppercase tracking-widest text-white/35">Instagram</div>
            <a href="https://www.instagram.com/BasketMotion-Ai" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white/80 hover:text-brand-orange">
              <Instagram size={18} /> @BasketMotion-Ai
            </a>
          </div>
          <div>
            <div className="mb-2 text-xs font-black uppercase tracking-widest text-white/35">Developpeur</div>
            <div className="flex items-center gap-3">
              <img src="https://api.dicebear.com/7.x/initials/svg?seed=Mouad%20Mouasseif" alt="Mouad Mouasseif" className="h-11 w-11 rounded-xl bg-white" />
              <div>
                <div className="text-sm font-black">Mouad Mouasseif</div>
                <div className="text-xs text-white/45">Full Stack Developer & Founder</div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <a href="https://github.com/" target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 p-2 text-white/55 hover:text-white" title="GitHub"><Github size={16} /></a>
              <a href="https://www.linkedin.com/" target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 p-2 text-white/55 hover:text-white" title="LinkedIn"><Linkedin size={16} /></a>
              <a href="https://mouad-mouasseif.dev" target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 p-2 text-white/55 hover:text-white" title="Portfolio"><Globe2 size={16} /></a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
