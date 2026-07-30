import { AlertCircle, Upload, Wand2 } from 'lucide-react';
import { useRef, useState } from 'react';
import AIAnalyticsPanel from '@/src/components/AIAnalyticsPanel';
import { analyzeUploadedVideo, type AIAnalysisResult } from '@/src/services/aiAnalysisService';
import {
  createMeasuredVideoAnalysis,
  saveLocalAnalysis,
  type LocalAnalysis,
} from '@/src/services/localAnalysisService';

export default function VideoUploadAnalyzer({
  drill,
  onAnalyzed,
}: {
  drill?: string;
  onAnalyzed?: (analysis: LocalAnalysis) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);

  const handleFile = async (file?: File) => {
    if (!file) return;

    const videoUrl = URL.createObjectURL(file);
    setStatus('Contrôle qualité et extraction des images...');
    setError('');
    setAnalysisResult(null);
    setIsProcessing(true);

    try {
      const result = await analyzeUploadedVideo(file);
      setAnalysisResult(result);

      if (!result.videoQuality?.analysisPossible) {
        setStatus('');
        setError('Qualité insuffisante. Suivez les recommandations avant de sauvegarder cette analyse.');
        URL.revokeObjectURL(videoUrl);
        return;
      }

      const analysis = createMeasuredVideoAnalysis({
        fileName: file.name,
        videoUrl,
        source: 'upload',
        drill,
        score: result.score,
        confidenceScore: result.confidenceScore,
        qualityScore: result.videoQuality.score,
        madeShots: result.observedMetrics?.madeShots,
        missedShots: result.observedMetrics?.missedShots,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        recommendations: result.suggestions,
        shotAnalysis: result.shotAnalysis,
      });
      saveLocalAnalysis(analysis);
      setStatus(
        `Rapport sauvegardé — score ${analysis.score}/100, confiance ${analysis.confidenceScore}%`,
      );
      onAnalyzed?.(analysis);
    } catch (analysisError) {
      URL.revokeObjectURL(videoUrl);
      setStatus('');
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "L’analyse de cette vidéo a échoué.",
      );
    } finally {
      setIsProcessing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
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
        disabled={isProcessing}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 py-3 text-sm font-black text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Wand2 size={17} /> {isProcessing ? 'Analyse en cours…' : 'Importer et analyser'}
      </button>
      {status && <div className="mt-3 rounded-xl bg-black/30 px-3 py-2 text-xs text-brand-neon">{status}</div>}
      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          <AlertCircle size={15} /> {error}
        </div>
      )}
      {analysisResult && <div className="mt-4"><AIAnalyticsPanel analysis={analysisResult} /></div>}
    </div>
  );
}
