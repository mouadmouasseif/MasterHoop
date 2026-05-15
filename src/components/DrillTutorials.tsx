import React from 'react';
import { motion } from 'motion/react';
import { Play, Star, Clock, Target, Shield, Zap, ChevronRight, BookOpen } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export interface Drill {
  id: string;
  name: string;
  category: 'Shooting' | 'Dribbling' | 'Defense' | 'Agility';
  difficulty: 'Beginner' | 'Intermediate' | 'Pro';
  duration: string;
  description: string;
  videoThumb: string;
  aiFocus: string[];
}

const DRILLS: Drill[] = [
  {
    id: 'shot-mechanics',
    name: 'Balance & Release',
    category: 'Shooting',
    difficulty: 'Beginner',
    duration: '10 min',
    description: 'Perfect your shooting form focusing on elbow alignment and high release point.',
    videoThumb: 'https://images.unsplash.com/photo-1519861531158-21603874116?auto=format&fit=crop&q=80&w=600',
    aiFocus: ['Release Angle', 'Knee Bend', 'Follow-through']
  },
  {
    id: 'crossover-speed',
    name: 'Killer Crossover',
    category: 'Dribbling',
    difficulty: 'Intermediate',
    duration: '15 min',
    description: 'Develop explosive lateral movement and low ball control during the crossover.',
    videoThumb: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&q=80&w=600',
    aiFocus: ['Dribble Height', 'Crossover Speed', 'Center of Gravity']
  },
  {
    id: 'step-back-mastery',
    name: 'Step-back Separation',
    category: 'Shooting',
    difficulty: 'Pro',
    duration: '12 min',
    description: 'Learn the footwork to create space for your jump shot against tight defense.',
    videoThumb: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=600',
    aiFocus: ['Footwork Precision', 'Balance Portst-Step', 'Separation Distance']
  },
  {
    id: 'lateral-slides',
    name: 'Lockdown Defense',
    category: 'Defense',
    difficulty: 'Intermediate',
    duration: '8 min',
    description: 'Improve your lateral quickness and defensive stance to stay in front of your man.',
    videoThumb: 'https://images.unsplash.com/photo-1544919982-b61976f0ba43?auto=format&fit=crop&q=80&w=600',
    aiFocus: ['Stance Width', 'Hip Height', 'Reaction Time']
  }
];

interface DrillTutorialsProps {
  onStartDrill: (drill: Drill) => void;
}

export function DrillTutorials({ onStartDrill }: DrillTutorialsProps) {
  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Entraînements Interactifs</h2>
        <p className="text-white/40 text-sm font-medium">Apprenez avec le feedback en temps réel de notre IA.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {DRILLS.map((drill, idx) => (
          <motion.div
            key={drill.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group relative bg-brand-surface border border-white/5 rounded-[2rem] overflow-hidden hover:border-brand-orange/30 transition-all duration-500"
          >
            {/* Image Section */}
            <div className="relative h-60 overflow-hidden">
              <img 
                src={drill.videoThumb} 
                alt={drill.name} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-surface via-transparent to-transparent" />
              
              <div className="absolute top-4 left-4 flex gap-2">
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-black/40 backdrop-blur-md border border-white/10",
                  drill.difficulty === 'Pro' ? "text-red-400" : drill.difficulty === 'Intermediate' ? "text-brand-orange" : "text-green-400"
                )}>
                  {drill.difficulty}
                </span>
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-black/40 backdrop-blur-md border border-white/10 text-white/60">
                  {drill.category}
                </span>
              </div>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute inset-0 m-auto w-16 h-16 bg-brand-orange rounded-full flex items-center justify-center shadow-2xl shadow-brand-orange/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              >
                <Play fill="white" className="text-white ml-1" size={24} />
              </motion.button>
            </div>

            {/* Content Section */}
            <div className="p-8">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none mb-2">{drill.name}</h3>
                  <div className="flex items-center gap-4 text-white/40 text-xs">
                    <span className="flex items-center gap-1.5"><Clock size={14} /> {drill.duration}</span>
                    <span className="flex items-center gap-1.5"><Target size={14} /> {drill.aiFocus.length} Points Clés</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-white/50 leading-relaxed mb-8 line-clamp-2 italic">
                "{drill.description}"
              </p>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-3">AI Focus Points</h4>
                  <div className="flex flex-wrap gap-2">
                    {drill.aiFocus.map(point => (
                      <div key={point} className="px-3 py-1.5 bg-white/5 rounded-xl border border-white/5 text-[10px] text-white/60 font-bold uppercase">
                        {point}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => onStartDrill(drill)}
                    className="flex-1 py-4 bg-brand-orange text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-brand-orange/20 flex items-center justify-center gap-3 transition-all duration-300"
                  >
                    Démarrer
                    <Play size={14} fill="currentColor" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    className="flex-1 py-4 bg-white/5 border border-white/10 text-white/40 hover:text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    Tutoriel
                    <BookOpen size={14} />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
