import { Activity, ArrowRight, Brain, Camera, CheckCircle2, Dumbbell, LineChart, Lock, Play, Shield, Sparkles, Target, UserRound } from 'lucide-react';
import Footer from '@/src/components/layout/Footer';
import masterHoopLogo from '@/src/assets/master-hoop-logo.png';

const architecture = [
  { title: 'AUTH', icon: Lock, items: ['Login Google', 'First setup profile', 'Save user data'] },
  { title: 'APP', icon: Target, items: ['Dashboard', 'Drills', 'Live Camera AI', 'Analysis', 'Stats'] },
  { title: 'AI SYSTEM', icon: Brain, items: ['Pose Detection', 'Basketball Movement Detection', 'Scoring Engine', 'AI Feedback'] },
];

const aiMetrics = ['Angle du coude', 'Hauteur du saut', 'Position jambes', 'Stabilite', 'Vitesse crossover', 'Equilibre', 'Release timing'];

const drills = [
  { title: 'Shot Mechanics', difficulty: 'Beginner', target: 'Jumpshot', score: '82%' },
  { title: 'Crossover Speed', difficulty: 'Intermediate', target: 'Dribbling', score: '76%' },
  { title: 'Release Timing', difficulty: 'Pro', target: 'Shooting', score: '88%' },
];

export default function LandingPage({ onStart, onGoogleLogin }: { onStart: () => void; onGoogleLogin: () => void }) {
  return (
    <div className="min-h-screen bg-brand-dark text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-dark/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <img src={masterHoopLogo} alt="Master Hoop logo" className="h-12 w-12 rounded-xl object-cover ring-1 ring-white/10" />
            <div>
              <div className="text-sm font-black uppercase tracking-widest">Master Hoop</div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-brand-orange">AI Basketball Training</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onGoogleLogin} className="hidden rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white/70 transition hover:bg-white/5 md:block">Login Google</button>
            <button onClick={onStart} className="rounded-xl bg-brand-orange px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-brand-orange/20 transition hover:brightness-110">Ouvrir l'app</button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 md:grid-cols-[1fr_0.82fr] md:px-8 md:py-16">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-orange/30 bg-brand-orange/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-brand-orange">
              <Sparkles size={13} /> Startup AI sport platform
            </div>
            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-black uppercase leading-none tracking-normal md:text-7xl">Master Hoop transforme ton entrainement basket en analyse IA.</h1>
              <p className="max-w-2xl text-base leading-7 text-white/60 md:text-lg">La plateforme combine onboarding joueur, drills guides, camera live, pose detection et feedback IA pour mesurer la forme de tir, le dribble, l'equilibre et la progression.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={onStart} className="flex items-center justify-center gap-2 rounded-2xl bg-brand-orange px-6 py-4 text-sm font-black uppercase tracking-wider text-white shadow-2xl shadow-brand-orange/25 transition hover:brightness-110">
                Commencer l'analyse <ArrowRight size={18} />
              </button>
              <button onClick={onGoogleLogin} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-bold text-white transition hover:bg-white/10">
                Login Google <UserRound size={18} />
              </button>
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-6 shadow-2xl">
            <img src={masterHoopLogo} alt="Master Hoop basketball AI logo" className="absolute inset-0 h-full w-full object-cover opacity-35" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/65 to-transparent" />
            <div className="relative z-10 flex h-full flex-col justify-end gap-5 pt-56">
              <div className="grid grid-cols-3 gap-3">
                <Metric label="Shot Form" value="82%" />
                <Metric label="Balance" value="91%" />
                <Metric label="Release" value="0.85s" />
              </div>
              <div className="rounded-2xl border border-brand-orange/30 bg-brand-surface/80 p-5 backdrop-blur-xl">
                <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand-orange"><Brain size={16} /> AI Analysis</div>
                <p className="text-sm leading-6 text-white/70">Points forts: coude aligne, bonne stabilite. A ameliorer: release plus rapide et jambes moins rigides.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-brand-surface/30 px-4 py-10 md:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
            {architecture.map((block) => {
              const Icon = block.icon;
              return (
                <div key={block.title} className="rounded-2xl border border-white/10 bg-black/20 p-6">
                  <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-brand-orange/15 p-3 text-brand-orange"><Icon size={22} /></div><h2 className="text-xl font-black uppercase tracking-wider">{block.title}</h2></div>
                  <div className="space-y-3">{block.items.map((item) => <div key={item} className="flex items-center gap-2 text-sm text-white/60"><CheckCircle2 size={15} className="text-brand-neon" /> {item}</div>)}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-14 md:grid-cols-[0.9fr_1.1fr] md:px-8">
          <div>
            <div className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-brand-orange">Flow final</div>
            <h2 className="mb-4 text-3xl font-black uppercase md:text-4xl">Du login au feedback IA.</h2>
            <p className="text-white/60">L'utilisateur se connecte, complete son profil, choisit un drill, ouvre la camera, puis recoit un score et des conseils exploitables.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {['Google Login', 'Complete Profile', 'Dashboard', 'Choose Drill', 'Open Camera', 'AI Feedback'].map((step, index) => (
              <div key={step} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-4 text-2xl font-black text-brand-orange">0{index + 1}</div>
                <div className="font-bold">{step}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-14 md:px-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div><div className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-brand-orange">Drills IA</div><h2 className="text-3xl font-black uppercase">Exercices guides avec scoring.</h2></div>
            <Dumbbell className="hidden text-brand-orange md:block" size={34} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {drills.map((drill) => (
              <div key={drill.title} className="rounded-2xl border border-white/10 bg-brand-surface/60 p-6">
                <div className="mb-5 flex items-center justify-between"><span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-black uppercase text-white/50">{drill.difficulty}</span><span className="text-xl font-black text-brand-neon">{drill.score}</span></div>
                <h3 className="mb-2 text-xl font-black">{drill.title}</h3>
                <p className="mb-5 text-sm text-white/50">Objectif: {drill.target}. Tutoriel video, analyse camera et feedback IA apres mouvement.</p>
                <button onClick={onStart} className="flex items-center gap-2 text-sm font-bold text-brand-orange">Start AI Analysis <Play size={15} /></button>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-black/30 px-4 py-14 md:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1fr_1fr]">
            <div className="rounded-3xl border border-white/10 bg-brand-surface/60 p-8">
              <div className="mb-4 flex items-center gap-3 text-brand-orange"><Camera size={24} /><span className="text-xs font-black uppercase tracking-widest">Camera AI</span></div>
              <h2 className="mb-4 text-3xl font-black uppercase">Ce que l'IA analyse.</h2>
              <div className="grid grid-cols-2 gap-3">{aiMetrics.map((metric) => <div key={metric} className="rounded-xl bg-white/5 p-3 text-sm text-white/65">{metric}</div>)}</div>
            </div>
            <div className="rounded-3xl border border-brand-orange/25 bg-brand-orange/10 p-8">
              <div className="mb-4 flex items-center gap-3 text-brand-orange"><LineChart size={24} /><span className="text-xs font-black uppercase tracking-widest">Resultat</span></div>
              <h2 className="mb-5 text-3xl font-black uppercase">AI Analysis: Score 82%</h2>
              <div className="space-y-3 text-sm text-white/70">
                <p><span className="font-black text-brand-neon">Points forts:</span> bonne stabilite, coude aligne, follow-through propre.</p>
                <p><span className="font-black text-red-300">A ameliorer:</span> release trop lente, jambes rigides, arc insuffisant.</p>
                <p><span className="font-black text-brand-orange">Role:</span> transformer la camera en coach technique qui suit la progression.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/50 p-4 backdrop-blur-xl">
      <div className="text-[10px] font-black uppercase text-white/40">{label}</div>
      <div className="text-2xl font-black text-white">{value}</div>
    </div>
  );
}
