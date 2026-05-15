import { Upload, Wand2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { createVideoAnalysis, saveLocalAnalysis, type LocalAnalysis } from '@/src/services/localAnalysisService';

export default function VideoUploadAnalyzer({
  drill,
  onAnalyzed,
}: {
  drill?: string;
  onAnalyzed?: (analysis: LocalAnalysis) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState('');

  const handleFile = (file?: File) => {
    if (!file) return;

    const videoUrl = URL.createObjectURL(file);
    setStatus('Analyse IA en cours...');

    window.setTimeout(() => {
      const analysis = createVideoAnalysis(file.name, 'upload', drill, videoUrl);
      saveLocalAnalysis(analysis);
      setStatus(`Rapport sauvegarde: score ${analysis.score}%`);
      onAnalyzed?.(analysis);
    }, 700);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-xl bg-brand-orange/15 p-3 text-brand-orange">
          <Upload size={20} />
        </div>
        <div>
          <div className="font-black uppercase tracking-wide">Upload video AI</div>
          <div className="text-xs text-white/40">Analyse un entrainement deja filme et sauvegarde le rapport.</div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 py-3 text-sm font-black text-white transition hover:brightness-110"
      >
        <Wand2 size={17} /> Upload & Analyze
      </button>
      {status && <div className="mt-3 rounded-xl bg-black/30 px-3 py-2 text-xs text-brand-neon">{status}</div>}
    </div>
  );
}
