import { AnimatePresence, motion } from "motion/react";
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
import AnalysisRow from "@/src/components/ui/AnalysisRow";
import StatCard from "@/src/components/ui/StatCard";
import { PERFORMANCE_DATA } from "@/src/constants/basketball";

export default function LiveTraining(props: any) {
  const {
    isImmersive = false,
    setIsImmersive = () => {},

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

    setActiveTab = () => {},
  } = props;

  // =========================
  // AUTO SCORING LOGIC
  // =========================
  const safeMetrics = liveMetrics || {};

  const madeShots = safeMetrics.madeShots || 0;
  const missedShots = safeMetrics.missedShots || 0;

  const scoreShot = (isMade: boolean) => {
    if (!handleMetricsUpdate) return;

    handleMetricsUpdate({
      ...safeMetrics,
      madeShots: isMade ? madeShots + 1 : madeShots,
      missedShots: !isMade ? missedShots + 1 : missedShots,
    });
  };

  // =========================
  // AUTO SAVE WHEN STOP RECORD
  // =========================
  const handleRecordToggle = async () => {
    const newState = !isRecording;
    setIsRecording(newState);

    // STOP RECORDING → SAVE AUTO
    if (!newState) {
      const fakeBlob = new Blob([], { type: "video/webm" });

      await handleRecordingComplete?.(fakeBlob);
    }
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
          />

          {/* ================= CONTROLS ================= */}
          <div className="absolute bottom-6 left-6 flex items-center gap-4 bg-black/40 p-3 rounded-xl">

            <button
              onClick={handleRecordToggle}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                isRecording
                  ? "bg-red-500"
                  : "bg-white text-black"
              )}
            >
              {isRecording ? <Square /> : <Play />}
            </button>

            {/* AUTO SCORING BUTTONS */}
            <button
              onClick={() => scoreShot(true)}
              className="px-3 py-1 bg-green-500 rounded text-white text-xs"
            >
              +2 Made
            </button>

            <button
              onClick={() => scoreShot(false)}
              className="px-3 py-1 bg-red-500 rounded text-white text-xs"
            >
              Miss
            </button>

          </div>

          {/* LIVE SCORE */}
          <div className="absolute top-4 right-4 bg-black/60 p-3 rounded-xl text-white text-sm">
            🏀 {madeShots} / {madeShots + missedShots}
          </div>
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
            value="42:12"
            label="Duration"
          />
        </div>
      </div>

      {/* ================= RIGHT PANEL ================= */}
      <div className="space-y-6">

        <div className="glass-card p-6">
          <h3 className="font-bold mb-4">Live Analysis</h3>

          <AnalysisRow
            label="Shots"
            value={`${madeShots}/${missedShots}`}
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