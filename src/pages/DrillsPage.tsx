import { motion } from 'motion/react';
import { Camera, Film, Play, Sparkles, Target, Timer, Upload } from 'lucide-react';
import type { Drill } from '@/src/components/drills/DrillTutorials';
import VideoUploadAnalyzer from '@/src/components/analysis/VideoUploadAnalyzer';
import { createVideoAnalysis, saveLocalAnalysis } from '@/src/services/localAnalysisService';

const drills: Array<Drill & { title: string; target: string; video: string; steps: string[] }> = [
  {
    id: 'shot-mechanics',
    name: 'Shot Mechanics',
    title: 'Shot Mechanics',
    category: 'Shooting',
    difficulty: 'Beginner',
    duration: '10 min',
    target: 'Jumpshot',
    description: 'Travaille alignement epaule-coude-poignet, appuis et follow-through.',
    videoThumb: 'https://images.unsplash.com/photo-1519861531158-21603874116?auto=format&fit=crop&q=80&w=800',
    video: 'Tutoriel: 20 tirs proches, 20 tirs mi-distance, 10 tirs avec pause au release.',
    aiFocus: ['Elbow angle', 'Release timing', 'Balance'],
    steps: ['Place tes pieds largeur epaules', 'Monte le coude sous la balle', 'Garde le poignet casse apres le tir'],
  },
  {
    id: 'crossover-speed',
    name: 'Crossover Speed',
    title: 'Crossover Speed',
    category: 'Dribbling',
    difficulty: 'Intermediate',
    duration: '15 min',
    target: 'Dribbling',
    description: 'Developpe explosivite laterale, changement de main et protection de balle.',
    videoThumb: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&q=80&w=800',
    video: 'Tutoriel: 5 series de 30 secondes, changement bas, acceleration apres cross.',
    aiFocus: ['Dribble height', 'Hip level', 'Speed'],
    steps: ['Descends ton centre de gravite', 'Croise sous le genou', 'Explose sur le premier pas'],
  },
  {
    id: 'step-back-mastery',
    name: 'Step-back Mastery',
    title: 'Step-back Mastery',
    category: 'Shooting',
    difficulty: 'Pro',
    duration: '12 min',
    target: 'Footwork',
    description: 'Cree de la separation sans perdre ton equilibre au moment du tir.',
    videoThumb: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=800',
    video: 'Tutoriel: dribble attaque, step-back, pause equilibre, tir.',
    aiFocus: ['Footwork', 'Landing balance', 'Shot arc'],
    steps: ['Attaque fort vers le cercle', 'Recule avec controle', 'Stabilise avant le release'],
  },
];

export default function DrillsPage({ onStartDrill }: { onStartDrill: (drill: Drill) => void }) {
  const runQuickTest = (drill: Drill & { title: string }) => {
    const analysis = createVideoAnalysis(`${drill.id}-camera-test.webm`, 'drill', drill.title);
    saveLocalAnalysis(analysis);
    onStartDrill(drill);
  };

  return (
    <motion.div key="drills" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-brand-orange">
            <Sparkles size={15} /> Drills IA
          </div>
          <h2 className="text-3xl font-black uppercase">Exercices, animation, video et test camera.</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/50">
            Chaque drill explique le mouvement, montre une video de reference et lance la camera IA pour analyser tes moves.
          </p>
        </div>
        <VideoUploadAnalyzer />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {drills.map((drill, index) => (
          <motion.article
            key={drill.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="overflow-hidden rounded-3xl border border-white/10 bg-brand-surface/70"
          >
            <div className="relative aspect-video overflow-hidden">
              <img src={drill.videoThumb} alt={drill.title} className="h-full w-full object-cover transition duration-700 hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-[10px] font-black uppercase">
                <Film size={13} className="text-brand-orange" /> Video drill
              </div>
            </div>
            <div className="space-y-5 p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black">{drill.title}</h3>
                  <p className="text-sm text-white/45">{drill.description}</p>
                </div>
                <span className="rounded-full bg-brand-orange/15 px-3 py-1 text-[10px] font-black text-brand-orange">{drill.difficulty}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-white/55">
                <div className="rounded-xl bg-white/5 p-3"><Target size={15} className="mb-2 text-brand-orange" />{drill.target}</div>
                <div className="rounded-xl bg-white/5 p-3"><Timer size={15} className="mb-2 text-brand-neon" />{drill.duration}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">{drill.video}</div>
              <div className="space-y-2">
                {drill.steps.map((step, stepIndex) => (
                  <div key={step} className="flex items-center gap-3 text-sm text-white/55">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-orange/15 text-[10px] font-black text-brand-orange">{stepIndex + 1}</span>
                    {step}
                  </div>
                ))}
              </div>

              <div className="grid gap-3">
                <button
                  onClick={() => onStartDrill(drill)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 py-3 text-sm font-black text-white transition hover:brightness-110"
                >
                  <Camera size={17} /> Start AI Analysis
                </button>
                <button
                  onClick={() => runQuickTest(drill)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/70 transition hover:bg-white/10"
                >
                  <Play size={17} /> Test + Save stats
                </button>
                <VideoUploadAnalyzer drill={drill.title} />
              </div>
            </div>
          </motion.article>
        ))}
      </div>

      <div className="rounded-3xl border border-brand-orange/20 bg-brand-orange/10 p-6">
        <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase text-brand-orange"><Upload size={17} /> Upload training video</div>
        <p className="text-sm text-white/60">
          Tu peux aussi uploader une video d entrainement deja enregistree. Master Hoop genere un rapport, les bons moves, les erreurs de position, le shoot form score et ajoute le resultat dans Stats, Historique et Coach AI.
        </p>
      </div>
    </motion.div>
  );
}
