import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import {
  Activity,
  Brain,
  ChevronRight,
  Clock,
  Maximize2,
  Newspaper,
  Play,
  Square,
  Target,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

import { cn } from "@/src/lib/utils";
import { getBasketballNews } from "@/src/services/geminiService";
import { CameraRecorder } from "@/src/components/CameraRecorder";
import VideoUploader from "@/src/components/VideoUploader";
import AnalysisRow from "@/src/components/ui/AnalysisRow";
import StatCard from "@/src/components/ui/StatCard";
import { PERFORMANCE_DATA } from "@/src/constants/basketball";

export default function LiveTraining(props: any) {
  const {
    isImmersive = false,
    setIsImmersive = () => {},
    user = null,

    isRecording = false,
    setIsRecording = () => {},

    handleRecordingComplete = () => {},
    handleMetricsUpdate = () => {},

    trainingMode = "FREESTYLE",
    setTrainingMode = () => {},

    targetedMoves = [],
    toggleTargetedMove = () => {},

    currentDrill = null,
    setCurrentDrill = () => {},

    newsData = null,
    setNewsData = () => {},

    isFetchingNews = false,
    setIsFetchingNews = () => {},

    activeCoachTip = null,
    liveMetrics = null,
    uploadProgress = 0,
    onSessionSaved = () => {},

    setActiveTab = () => {},
  } = props;

  // =========================
  // AUTO SCORING LOGIC
  // =========================
  const safeMetrics = liveMetrics || {};

  const [madeCount, setMadeCount] = useState(0);
  const [missCount, setMissCount] = useState(0);

  useEffect(() => {
    setMadeCount((current) => Math.max(current, Number(safeMetrics.madeShots || 0)));
    setMissCount((current) => Math.max(current, Number(safeMetrics.missedShots || 0)));
  }, [safeMetrics.madeShots, safeMetrics.missedShots]);

  const madeShots = madeCount;
  const missedShots = missCount;
  const totalShots = madeCount + missCount;

  const scoreShot = (isMade: boolean) => {
    const nextMade = isMade ? madeCount + 1 : madeCount;
    const nextMiss = isMade ? missCount : missCount + 1;

    setMadeCount(nextMade);
    setMissCount(nextMiss);

    if (!handleMetricsUpdate) return;

    handleMetricsUpdate({
      ...safeMetrics,
      madeShots: nextMade,
      missedShots: nextMiss,
    });
  };

  // =========================
  // AUTO SAVE WHEN STOP RECORD
  // =========================
  const handleRecordToggle = () => {
    const newState = !isRecording;
    setIsRecording(newState);
  };

  return (
    <motion.div
      key="live"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "grid grid-cols-1 lg:grid-cols-3 gap-6 h-full",
        isImmersive && "lg:grid-cols-1 gap-0"
      )}
    >
      {/* ================= CAMERA ================= */}
      <div className="lg:col-span-2 space-y-6 h-full">
        <div className="relative aspect-video glass-card overflow-hidden">

          <CameraRecorder
            isRecording={isRecording}
            onRecordingChange={setIsRecording}
            onRecordingComplete={handleRecordingComplete}
            onMetricsUpdate={handleMetricsUpdate}
            selectedMoves={
              trainingMode === "TARGETED"
                ? targetedMoves
                : undefined
            }
            currentDrill={currentDrill}
            onClearDrill={() => setCurrentDrill(null)}
            madeCount={madeCount}
            missCount={missCount}
            onMadeShot={() => scoreShot(true)}
            onMissedShot={() => scoreShot(false)}
          />`r`n
          {uploadProgress > 0 && (
            <div className="absolute bottom-24 left-6 right-6 z-20 rounded-xl border border-white/10 bg-black/70 p-3 backdrop-blur-xl">
              <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-widest text-white/65">
                <span>Cloud save</span>
                <span className="text-brand-neon">{uploadProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-brand-neon transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* ================= STATS ================= */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Activity />}
            value={`${safeMetrics.elbowAngle || 72}%`}
            label="Accuracy"
          />

          <StatCard
            icon={<Target />}
            value={`${madeShots}`}
            label="Made Shots"
            color="text-green-400"
          />

          <StatCard
            icon={<Zap />}
            value="840"
            label="Kcal"
          />

          <StatCard
            icon={<Clock />}
            value={`${totalShots}`}
            label="Total Shots"
          />
        </div>
      </div>

      {/* ================= RIGHT PANEL ================= */}
      <div className="space-y-6">

        <VideoUploader user={user} onSaved={onSessionSaved} />

        <div className="glass-card p-6">
          <h3 className="font-bold mb-4">Live Analysis</h3>

          <AnalysisRow
            label="Shots"
            value={`${missedShots} MISS | ${madeShots} MADE | ${totalShots} SHOTS`}
            status="Live"
          />

          <AnalysisRow
            label="Move"
            value={
              safeMetrics.isCrossover
                ? "CROSSOVER"
                : safeMetrics.isFadeaway
                ? "FADE"
                : "NORMAL"
            }
            status="Detecting"
          />
        </div>

        {/* AUTO SCORING TEST PANEL */}
        <div className="glass-card p-6">
          <h3 className="font-bold mb-3">Quick Score</h3>

          <button
            onClick={() => scoreShot(true)}
            className="w-full py-3 bg-green-500 rounded-xl mb-2"
          >
            Shot Made (+2)
          </button>

          <button
            onClick={() => scoreShot(false)}
            className="w-full py-3 bg-red-500 rounded-xl"
          >
            Shot Missed
          </button>
        </div>

        {/* CHART */}
        <div className="glass-card p-6">
          <h3 className="font-bold mb-4">Performance</h3>

          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={PERFORMANCE_DATA}>
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Area
                type="monotone"
                dataKey="bpm"
                stroke="#00FF94"
                fill="#00FF94"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
