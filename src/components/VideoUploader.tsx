import { AlertCircle, Upload, Wand2, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { analyzeUploadedVideo, type AIAnalysisResult } from "@/src/services/aiAnalysisService";
import { saveTrainingSession } from "@/src/services/sessionService";
import AIAnalyticsPanel from "@/src/components/AIAnalyticsPanel";

const MAX_SIZE = 200 * 1024 * 1024;
const MAX_DURATION = 120;
const ACCEPTED_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

export default function VideoUploader({
  user,
  onSaved,
}: {
  user: User | null;
  onSaved?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const helperText = useMemo(() => {
    if (!file) return "MP4, MOV, or WebM. Max 200MB and 2 minutes.";
    return `${file.name} - ${(file.size / 1024 / 1024).toFixed(1)}MB`;
  }, [file]);

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl("");
    setError("");
    setAnalysis(null);
    setProgress(0);
  };

  const validateDuration = (nextFile: File) =>
    new Promise<void>((resolve, reject) => {
      const url = URL.createObjectURL(nextFile);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        if (video.duration > MAX_DURATION) reject(new Error("Video must be 2 minutes or less."));
        else resolve();
      };
      video.onerror = () => reject(new Error("Unable to read this video."));
      video.src = url;
    });

  const handleFile = async (nextFile?: File) => {
    if (!nextFile) return;
    setError("");
    setAnalysis(null);

    if (!ACCEPTED_TYPES.includes(nextFile.type)) {
      setError("Unsupported format. Use MP4, MOV, or WebM.");
      return;
    }
    if (nextFile.size > MAX_SIZE) {
      setError("Video is too large. Maximum size is 200MB.");
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
      await saveTrainingSession({
        userId: user.uid,
        videoBlob: file,
        duration: 0,
        drillName: "Uploaded Video",
        onProgress: setProgress,
      });
      onSaved?.();
    } catch (uploadError) {
      console.error(uploadError);
      setError("Upload failed. Check Firebase Storage rules and try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-brand-surface/70 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand-orange">
            <Upload size={16} /> Upload Video
          </div>
          <p className="mt-2 text-sm text-white/50">{helperText}</p>
        </div>
        {file && (
          <button onClick={reset} className="rounded-xl border border-white/10 p-2 text-white/50 hover:bg-white/10">
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
        <video src={previewUrl} controls playsInline className="aspect-video w-full rounded-xl bg-black object-contain" />
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex aspect-video w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/25 text-white/45 transition hover:border-brand-orange/60 hover:text-white"
        >
          <Upload size={34} className="mb-3 text-brand-orange" />
          Select training video
        </button>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {progress > 0 && (
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-brand-neon transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      <button
        onClick={file ? analyzeAndSave : () => inputRef.current?.click()}
        disabled={isProcessing || !user}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 py-3 text-sm font-black uppercase tracking-wider text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Wand2 size={17} /> {isProcessing ? `Uploading ${progress}%` : file ? "Analyze & Save" : "Choose Video"}
      </button>

      {analysis && <AIAnalyticsPanel analysis={analysis} />}
    </div>
  );
}
