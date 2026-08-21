import { AlertCircle, CheckCircle2, Image as ImageIcon, ListVideo, Upload, Wand2, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { analyzeUploadedVideo, type AIAnalysisResult } from "@/src/services/aiAnalysisService";
import { saveTrainingSession } from "@/src/services/sessionService";
import AIAnalyticsPanel from "@/src/components/AIAnalyticsPanel";

const MAX_SIZE_GB = 5;
const MAX_SIZE = MAX_SIZE_GB * 1024 * 1024 * 1024;
const MAX_DURATION_MINUTES = 60;
const MAX_DURATION = MAX_DURATION_MINUTES * 60;
const ACCEPTED_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

export default function VideoUploader({
  user,
  onOpenHistory,
  onSaved,
}: {
  user: User | null;
  onOpenHistory?: () => void;
  onSaved?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const helperText = useMemo(() => {
    if (!file) return `MP4, MOV, or WebM. Max ${MAX_SIZE_GB}GB and ${MAX_DURATION_MINUTES} minutes.`;
    return `${file.name} - ${(file.size / 1024 / 1024 / 1024).toFixed(2)}GB`;
  }, [file]);

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl("");
    setError("");
    setAnalysis(null);
    setSaved(false);
    setProgress(0);
  };

  const validateDuration = (nextFile: File) =>
    new Promise<void>((resolve, reject) => {
      const url = URL.createObjectURL(nextFile);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        if (video.duration > MAX_DURATION) reject(new Error(`Video must be ${MAX_DURATION_MINUTES} minutes or less.`));
        else resolve();
      };
      video.onerror = () => reject(new Error("Unable to read this video."));
      video.src = url;
    });

  const handleFile = async (nextFile?: File) => {
    if (!nextFile) return;
    setError("");
    setAnalysis(null);
    setSaved(false);

    if (!ACCEPTED_TYPES.includes(nextFile.type)) {
      setError("Unsupported format. Use MP4, MOV, or WebM.");
      return;
    }
    if (nextFile.size > MAX_SIZE) {
      setError(`Video is too large. Maximum size is ${MAX_SIZE_GB}GB.`);
      return;
    }

    try {
      await validateDuration(nextFile);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(nextFile);
      setPreviewUrl(URL.createObjectURL(nextFile));
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : "Invalid video.");
    }
  };

  const analyzeAndSave = async () => {
    if (!file || !user) return;
    setIsProcessing(true);
    setError("");
    try {
      const result = await analyzeUploadedVideo(file);
      setAnalysis(result);
      if (!result.videoQuality?.analysisPossible) {
        setError("Qualité insuffisante : corrigez la vidéo avant de l’enregistrer comme analyse.");
        return;
      }
      await saveTrainingSession({
        userId: user.uid,
        videoBlob: file,
        duration: Math.round(result.videoQuality.duration),
        drillName: "Uploaded Video",
        metrics: result.observedMetrics,
        shotAnalysis: result.shotAnalysis,
        onProgress: setProgress,
      });
      setSaved(true);
      onSaved?.();
    } catch (uploadError) {
      console.error(uploadError);
      setError("Upload failed. Check Firebase Storage rules and try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bm-card space-y-4 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#ff8a00]">
            <Upload size={16} /> Nouvelle analyse vidéo
          </div>
          <p className="mt-2 text-sm text-white/55">{helperText}</p>
        </div>
        {file && (
          <button onClick={reset} className="rounded-md border border-white/10 p-2 text-white/50 hover:bg-white/10">
            <X size={16} />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      {previewUrl ? (
        <div className="relative overflow-hidden rounded-md border border-white/10 bg-black">
          <video src={previewUrl} controls playsInline className="aspect-video w-full bg-black object-contain" />
          <div className="absolute left-3 top-3 rounded-md border border-white/10 bg-black/65 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white/70 backdrop-blur">
            Aperçu vidéo
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex aspect-video w-full flex-col items-center justify-center rounded-md border border-dashed border-white/15 bg-black/25 text-white/45 transition hover:border-[#ff8a00]/70 hover:text-white"
        >
          <ImageIcon size={34} className="mb-3 text-[#ff8a00]" />
          <span className="font-black uppercase">Choisir une vidéo</span>
          <span className="mt-1 text-xs text-white/35">L'aperçu apparaîtra ici avant l'analyse</span>
        </button>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {progress > 0 && (
        <div>
          <div className="mb-1 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/50">
            <span>Sauvegarde</span>
            <span className="text-[#21e58b]">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-[#21e58b] transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <button
        onClick={file ? analyzeAndSave : () => inputRef.current?.click()}
        disabled={isProcessing || !user}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[#ff4d00] to-[#ff8a00] px-4 py-3 text-sm font-black uppercase tracking-wider text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Wand2 size={17} /> {isProcessing ? `Analyse ${progress}%` : file ? "Analyser et sauvegarder" : "Uploader une vidéo"}
      </button>

      {saved && (
        <div className="rounded-md border border-[#21e58b]/20 bg-[#21e58b]/10 p-3">
          <div className="flex items-center gap-2 text-sm font-black text-[#21e58b]">
            <CheckCircle2 size={17} /> Analyse sauvegardée
          </div>
          <p className="mt-1 text-xs text-white/55">Tu peux maintenant ouvrir la liste des analyses pour voir l'image/aperçu et le rapport détaillé.</p>
          <button
            onClick={onOpenHistory}
            className="mt-3 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black uppercase text-white hover:border-[#ff8a00]/60"
          >
            <ListVideo size={15} /> Voir la liste des analyses
          </button>
        </div>
      )}

      {analysis && <div className="bm-card p-3"><AIAnalyticsPanel analysis={analysis} /></div>}
    </div>
  );
}
