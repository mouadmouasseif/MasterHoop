import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Activity,
  Award,
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
import { CameraRecorder } from "@/src/components/CameraRecorder";
import VideoUploader from "@/src/components/VideoUploader";
import AnalysisRow from "@/src/components/ui/AnalysisRow";
import StatCard from "@/src/components/ui/StatCard";
import type { ShotSequenceAnalysis } from "@/src/ai/types";
import {
  buildTrainingMissionProgress,
  buildTrainingMissionReport,
  getMission,
  TRAINING_MISSIONS,
  type TrainingMissionId,
  type TrainingMissionLevel,
  type TrainingMissionReport,
} from "@/src/services/trainingMissionService";

export default function LiveTraining(props: any) {
  const navigate = useNavigate();
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
  const [showMissionPicker, setShowMissionPicker] = useState(false);
  const [selectedMissionId, setSelectedMissionId] = useState<TrainingMissionId>("shooting-fundamentals");
  const [selectedLevel, setSelectedLevel] = useState<TrainingMissionLevel>("beginner");
  const [missionStarted, setMissionStarted] = useState(false);
  const [missionStartedAt, setMissionStartedAt] = useState<number | null>(null);
  const [finalReport, setFinalReport] = useState<TrainingMissionReport | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [missionTick, setMissionTick] = useState(0);
  const lastVoiceCueRef = useRef("");

  useEffect(() => {
    setMadeCount((current) => Math.max(current, Number(safeMetrics.madeShots || 0)));
    setMissCount((current) => Math.max(current, Number(safeMetrics.missedShots || 0)));
  }, [safeMetrics.madeShots, safeMetrics.missedShots]);

  const madeShots = madeCount;
  const missedShots = missCount;
  const totalShots = madeCount + missCount;
  const elapsedSeconds = missionStartedAt ? Math.max(0, Math.round((Date.now() - missionStartedAt) / 1000)) : 0;
  const activeMission = getMission(selectedMissionId);
  const missionPlan = activeMission.levels[selectedLevel];
  const missionProgress = useMemo(
    () => buildTrainingMissionProgress(selectedMissionId, selectedLevel, safeMetrics, elapsedSeconds),
    [elapsedSeconds, missionTick, safeMetrics, selectedLevel, selectedMissionId],
  );

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
      isShooting: true,
      shots: [
        ...((safeMetrics as any).shots || []),
        {
          shotType: "unknown",
          outcome: isMade ? "made" : "missed",
          confidence: 1,
          source: "manual_user_annotation",
        },
      ],
    });
  };

  useEffect(() => {
    if (!missionStarted || !isRecording) return;
    const enrichedMetrics = {
      ...safeMetrics,
      trainingName: missionProgress.trainingName,
      trainingMissionProgress: missionProgress,
      trainingBadges: missionProgress.badges,
    };
    handleMetricsUpdate(enrichedMetrics);
  }, [handleMetricsUpdate, isRecording, missionProgress.completionRate, missionProgress.trainingName, missionStarted, madeShots, missedShots]);

  useEffect(() => {
    if (!missionStarted || !voiceEnabled || !missionProgress.voiceCue || lastVoiceCueRef.current === missionProgress.voiceCue) return;
    lastVoiceCueRef.current = missionProgress.voiceCue;
    window.speechSynthesis?.cancel();
    const utterance = new SpeechSynthesisUtterance(missionProgress.voiceCue);
    utterance.lang = "fr-FR";
    utterance.rate = 1;
    window.speechSynthesis?.speak(utterance);
  }, [missionProgress.voiceCue, missionStarted, voiceEnabled]);

  useEffect(() => {
    if (!missionStarted) return undefined;
    const timer = window.setInterval(() => setMissionTick((tick) => tick + 1), 1000);
    return () => window.clearInterval(timer);
  }, [missionStarted]);

  const startMissionAnalytics = () => {
    setMissionStarted(true);
    setMissionStartedAt(Date.now());
    setFinalReport(null);
    setIsImmersive(true);
    setIsRecording(true);
  };

  const completeRecordingWithMission = (blob: Blob, shotAnalysis?: ShotSequenceAnalysis) => {
    const report = buildTrainingMissionReport(selectedMissionId, selectedLevel, safeMetrics, elapsedSeconds);
    setFinalReport(report);
    setMissionStarted(false);
    const enrichedMetrics = {
      ...safeMetrics,
      trainingName: report.trainingName,
      trainingMissionReport: report,
      trainingMissionProgress: missionProgress,
      trainingBadges: report.badges,
      shotAnalysis,
    };
    handleMetricsUpdate(enrichedMetrics);
    handleRecordingComplete(blob, enrichedMetrics);
  };

  return (
    <motion.div
      key="live"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "grid h-full max-w-full grid-cols-1 gap-4 overflow-hidden sm:gap-6 lg:grid-cols-3",
        isImmersive && "lg:grid-cols-1 gap-0"
      )}
    >
      {/* ================= CAMERA ================= */}
      <div className="min-w-0 space-y-6 h-full lg:col-span-2">
        <div className="relative aspect-video max-w-full glass-card overflow-hidden">

          <CameraRecorder
            isRecording={isRecording}
            onRecordingChange={setIsRecording}
            onRecordingComplete={completeRecordingWithMission}
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
          />
          {missionStarted && (
            <div className="absolute left-6 right-6 top-6 z-20 rounded-2xl border border-brand-orange/25 bg-black/70 p-4 backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-brand-orange">{missionProgress.trainingName}</div>
                  <div className="text-sm text-white/55">{missionPlan.title} - {missionProgress.voiceCue}</div>
                </div>
                <div className="text-2xl font-black text-brand-neon">{missionProgress.completionRate}%</div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-brand-neon transition-all" style={{ width: `${missionProgress.completionRate}%` }} />
              </div>
            </div>
          )}
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4">
          <StatCard
            icon={<Activity />}
            value={safeMetrics.elbowAngle ? `${Math.round(safeMetrics.elbowAngle)}°` : "—"}
            label="Angle du coude"
          />

          <StatCard
            icon={<Target />}
            value={`${madeShots}`}
            label="Made Shots"
            color="text-green-400"
          />

          <StatCard
            icon={<Zap />}
            value={safeMetrics.ballConfidence ? `${Math.round(safeMetrics.ballConfidence)}%` : "—"}
            label="Confiance ballon"
          />

          <StatCard
            icon={<Clock />}
            value={`${totalShots}`}
            label="Total Shots"
          />
        </div>
      </div>

      {/* ================= RIGHT PANEL ================= */}
      <div className="min-w-0 space-y-6">

        <div className="glass-card p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-brand-orange">
                <Brain size={15} /> Open Test
              </div>
              <h3 className="text-xl font-black uppercase">Mission guidee IA</h3>
              <p className="mt-1 text-xs text-white/45">Choisis un programme, lance l'analyse, puis laisse l'IA suivre les objectifs.</p>
            </div>
            <button onClick={() => setShowMissionPicker((value) => !value)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-white/65">
              {showMissionPicker ? "Close" : "Open Test"}
            </button>
          </div>

          <AnimatePresence>
            {showMissionPicker && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="space-y-3 pb-4">
                  {TRAINING_MISSIONS.map((mission) => (
                    <button
                      key={mission.id}
                      onClick={() => setSelectedMissionId(mission.id)}
                      className={cn(
                        "w-full rounded-xl border p-3 text-left transition",
                        selectedMissionId === mission.id ? "border-brand-orange bg-brand-orange/15" : "border-white/10 bg-white/[0.03] hover:bg-white/5",
                      )}
                    >
                      <div className="font-black">{mission.name}</div>
                      <div className="mt-1 text-xs text-white/40">{mission.levels[selectedLevel].description}</div>
                    </button>
                  ))}

                  <div className="grid grid-cols-3 gap-2">
                    {(["beginner", "intermediate", "advanced"] as TrainingMissionLevel[]).map((level) => (
                      <button
                        key={level}
                        onClick={() => setSelectedLevel(level)}
                        className={cn(
                          "rounded-xl border px-2 py-3 text-[10px] font-black uppercase",
                          selectedLevel === level ? "border-brand-neon bg-brand-neon/15 text-brand-neon" : "border-white/10 bg-black/20 text-white/45",
                        )}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="mb-2 text-sm font-black">{activeMission.name}</div>
            <p className="text-xs text-white/45">{missionPlan.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {missionPlan.aiFocus.map((focus) => (
                <span key={focus} className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold text-white/45">{focus}</span>
              ))}
            </div>
          </div>

          <button
            onClick={startMissionAnalytics}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 py-3 text-sm font-black uppercase"
          >
            <Play size={17} /> Start AI Analytics
          </button>

          <button
            onClick={() => setVoiceEnabled((value) => !value)}
            className="mt-3 w-full rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white/55"
          >
            Assistant vocal IA: {voiceEnabled ? "ON" : "OFF"}
          </button>
        </div>

        <div className="glass-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold">Progression Mission</h3>
            <span className="text-sm font-black text-brand-neon">{missionProgress.completionRate}%</span>
          </div>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-brand-neon transition-all" style={{ width: `${missionProgress.completionRate}%` }} />
          </div>
          <div className="space-y-3">
            {missionProgress.objectives.map((objective) => (
              <div key={objective.id}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-white/65">{objective.label}</span>
                  <span className="font-black text-white">{objective.current} / {objective.target}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-brand-orange transition-all" style={{ width: `${objective.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
          {missionProgress.badges.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {missionProgress.badges.map((badge) => (
                <span key={badge} className="rounded-full border border-brand-neon/25 bg-brand-neon/10 px-3 py-1 text-[10px] font-black text-brand-neon">{badge}</span>
              ))}
            </div>
          )}
        </div>

        {finalReport && (
          <div className="glass-card p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase text-brand-orange"><Award size={17} /> Rapport Final</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <MiniReport label="Completion" value={`${finalReport.completionRate}%`} />
              <MiniReport label="Score fiable" value={finalReport.aiScore === null ? "Indisponible" : `${finalReport.aiScore}`} />
              <MiniReport label="Shots" value={`${finalReport.shotsMade}/${finalReport.shotsAttempted}`} />
              <MiniReport label="FG%" value={`${finalReport.shootingPercentage}%`} />
              <MiniReport label="Crossovers" value={`${finalReport.crossoversCompleted}`} />
              <MiniReport label="Step-backs" value={`${finalReport.stepBackCompleted}`} />
            </div>
            <div className="mt-4 space-y-2 text-xs text-white/55">
              <p><span className="font-black text-brand-neon">Strength:</span> {finalReport.strengths[0]}</p>
              <p><span className="font-black text-red-300">Fix:</span> {finalReport.weaknesses[0]}</p>
              <p><span className="font-black text-brand-orange">Next:</span> {finalReport.recommendations[0]}</p>
            </div>
          </div>
        )}

        <VideoUploader user={user} onSaved={onSessionSaved} onOpenHistory={() => navigate("/app/analyse")} />

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

        {/* Human annotations are explicit and are not presented as vision results. */}
        <div className="glass-card p-6">
          <h3 className="font-bold mb-2">Validation manuelle</h3>
          <p className="mb-3 text-xs leading-5 text-white/45">À utiliser uniquement si vous avez observé le résultat. Ces boutons ajoutent une annotation utilisateur, pas une détection IA.</p>

          <button
            onClick={() => scoreShot(true)}
            className="w-full py-3 bg-green-500 rounded-xl mb-2"
          >
            Annoter : réussi
          </button>

          <button
            onClick={() => scoreShot(false)}
            className="w-full py-3 bg-red-500 rounded-xl"
          >
            Annoter : manqué
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function MiniReport({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="text-[10px] font-black uppercase tracking-widest text-white/35">{label}</div>
      <div className="mt-1 text-lg font-black text-brand-neon">{value}</div>
    </div>
  );
}
