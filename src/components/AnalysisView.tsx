import React from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, Info, Activity, Dumbbell, ChevronRight } from 'lucide-react';

interface AnalysisViewProps {
  analysis: {
    summary: string;
    kpis: Array<{ label: string; value: string; assessment: string }>;
    strengths: string[];
    weaknesses: string[];
    drills: Array<{ name: string; description: string }>;
  };
  onClose: () => void;
}

export default function AnalysisView({ analysis, onClose }: AnalysisViewProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl w-full mx-auto bg-brand-dark/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
    >
      {/* Header */}
      <div className="p-8 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-brand-blue/10 to-transparent">
        <div>
          <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">
            Analyse Post-Session
          </h2>
          <p className="text-white/40 text-sm mt-1">Intelligence Artificielle de Performance</p>
        </div>
        <button 
          onClick={onClose}
          className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl transition-all uppercase border border-white/10"
        >
          Fermer
        </button>
      </div>

      <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 overflow-y-auto max-h-[70vh]">
        
        {/* Left Column: Summary & KPIs */}
        <div className="md:col-span-2 space-y-8">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Info size={18} className="text-brand-blue" />
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">Résumé Global</h3>
            </div>
            <div className="p-6 bg-white/5 rounded-2xl border border-white/5 leading-relaxed text-white/80">
              {analysis.summary}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-brand-blue" />
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">Indicateurs de Performance</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {analysis.kpis.map((kpi, idx) => (
                <div key={`kpi-${idx}`} className="p-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="text-[10px] text-white/40 uppercase font-bold tracking-widest">{kpi.label}</div>
                  <div className="text-2xl font-black text-white mt-1">{kpi.value}</div>
                  <div className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full inline-block mt-2 ${
                    kpi.assessment.toLowerCase().includes('excellent') ? 'bg-green-500/10 text-green-400' :
                    kpi.assessment.toLowerCase().includes('bon') ? 'bg-blue-500/10 text-blue-400' :
                    'bg-brand-blue/10 text-brand-blue'
                  }`}>
                    {kpi.assessment}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Dumbbell size={18} className="text-brand-blue" />
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">Exercices Recommandés</h3>
            </div>
            <div className="space-y-4">
              {analysis.drills.map((drill, idx) => (
                <div key={`drill-${idx}`} className="group p-6 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-white uppercase tracking-tight">{drill.name}</h4>
                    <ChevronRight size={16} className="text-brand-blue group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed">
                    {drill.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Strengths & Weaknesses */}
        <div className="space-y-8">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Activity size={18} className="text-green-400" />
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">Points Forts</h3>
            </div>
            <div className="space-y-2">
              {analysis.strengths.map((str, idx) => (
                <div key={`strength-${idx}`} className="flex items-start gap-3 p-3 bg-green-500/5 rounded-xl border border-green-500/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shadow-lg shadow-green-400/20" />
                  <span className="text-sm text-green-100/80">{str}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Target size={18} className="text-brand-blue" />
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">Axes de Progrès</h3>
            </div>
            <div className="space-y-2">
              {analysis.weaknesses.map((weak, idx) => (
                <div key={`weak-${idx}`} className="flex items-start gap-3 p-3 bg-brand-blue/5 rounded-xl border border-brand-blue/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-blue mt-1.5 shadow-lg shadow-brand-blue/20" />
                  <span className="text-sm text-brand-blue/80">{weak}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Training Motivation Card */}
          <div className="p-6 bg-gradient-to-br from-brand-blue to-red-600 rounded-3xl mt-12 overflow-hidden relative">
            <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none mb-2">
              Prêt pour la Prochaine ?
            </h4>
            <p className="text-white/80 text-xs font-bold uppercase tracking-widest">
              L'excellence est une habitude.
            </p>
            <div className="absolute -bottom-8 -right-8 opacity-20">
              <Target size={100} className="text-white rotate-12" />
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
