import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Download,
  Maximize2,
  MoreHorizontal,
  Pause,
  Play,
  Save,
  Share2,
  SkipBack,
  SkipForward,
  Target,
} from "lucide-react";
import {
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAppShell } from "@/src/routes/AppShellContext";
import {
  loadBasketballAnalysis,
  saveCoachNote,
  type AnalysisMetric,
  type BasketballAnalysis,
  type MetricQuality,
  type ShotAttempt,
} from "@/src/services/basketballAnalysisService";

const phaseLabels = [
  { key: "preparation", label: "Prise d'élan" },
  { key: "dip", label: "Montée" },
  { key: "upward_motion", label: "Montée" },
  { key: "release", label: "Libération" },
  { key: "flight", label: "Suivi" },
  { key: "landing", label: "Fin" },
];

const typeLabels: Record<BasketballAnalysis["analysisType"], string> = {
  shooting: "TIR À 3 POINTS",
  dribbling: "DRIBBLE",
  passing: "PASSE",
  finishing: "FINITION",
  movement: "MOUVEMENT",
  defense: "DÉFENSE",
};

const statusColor: Record<MetricQuality, string> = {
  Excellent: "#21E58B",
  Bon: "#21E58B",
  Optimal: "#21E58B",
  "A ameliorer": "#FFC43D",
  Critique: "#FF4D4F",
  "Non disponible": "#667481",
};

export default function BasketballVideoAnalysis() {
  const { analysisId = "" } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAppShell();
  const [analysis, setAnalysis] = useState<BasketballAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user || !analysisId) return;
      setLoading(true);
      const result = await loadBasketballAnalysis(analysisId, user.uid);
      if (cancelled) return;
      setAnalysis(result.analysis);
      setSelectedShotId(result.analysis?.shots[0]?.id || null);
      setMessage(result.message || "");
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [analysisId, user]);

  const selectedShot = useMemo(
    () => analysis?.shots.find((shot) => shot.id === selectedShotId) || analysis?.shots[0] || null,
    [analysis, selectedShotId],
  );

  const handleSavedNote = (note: string) => {
    setAnalysis((current) => current ? { ...current, coachNotes: note } : current);
  };

  if (loading) {
    return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-white/60">Chargement de l'analyse...</div>;
  }

  if (!analysis) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#08131C] p-8">
        <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-2 text-sm text-white/60"><ChevronLeft size={16} /> Retour</button>
        <h1 className="text-2xl font-black uppercase">Analyse introuvable</h1>
        <p className="mt-3 text-sm text-[#A8B3C0]">{message || "Le document demande n'existe pas ou n'est pas accessible."}</p>
      </div>
    );
  }

  return (
    <div className="bm-analysis min-h-screen bg-[#020609] p-3 text-white md:p-5">
      <AnalysisHeader analysis={analysis} profileName={profile?.name || profile?.displayName} />
      <AnalysisProgress analysis={analysis} />
      <AnalysisKPIs analysis={analysis} />
      <div className="mt-3 grid gap-3 xl:grid-cols-[1.35fr_0.95fr]">
        <VideoPoseAnalyzer
          analysis={analysis}
          selectedShot={selectedShot}
          onTimeChange={setCurrentTime}
          onSelectShot={setSelectedShotId}
        />
        <div className="grid gap-3">
          <ShotPhaseTimeline analysis={analysis} currentTime={currentTime} selectedShot={selectedShot} />
          <BiomechanicsPanel analysis={analysis} />
        </div>
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        <BallTrajectoryChart analysis={analysis} selectedShot={selectedShot} />
        <ShotZoneMap analysis={analysis} />
        <MuscleActivationPanel analysis={analysis} />
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        <VelocityAccelerationChart analysis={analysis} currentTime={currentTime} />
        <MovementSequence analysis={analysis} />
        <ConsistencyAnalysis analysis={analysis} />
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        <DetailedAnalysis analysis={analysis} />
        <AIRecommendations analysis={analysis} />
        <PerformanceComparison analysis={analysis} />
      </div>
      <ShotTimeline analysis={analysis} selectedShotId={selectedShot?.id || null} onSelect={setSelectedShotId} />
      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        <DataSources analysis={analysis} />
        <CoachNotes analysis={analysis} userId={user.uid} onSaved={handleSavedNote} />
        <KeyIndicators analysis={analysis} />
      </div>
    </div>
  );
}

function AnalysisHeader({ analysis, profileName }: { analysis: BasketballAnalysis; profileName?: string }) {
  const title = `ANALYSE VIDÉO • ${typeLabels[analysis.analysisType]}`;
  return (
    <div className="bm-topbar mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <h1 className="text-xl font-black uppercase tracking-[0.08em] text-white md:text-2xl">{title}</h1>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#A8B3C0]">
          <span>{formatDate(analysis.createdAt)}</span>
          <span>{formatDuration(analysis.duration)}</span>
          <span>{analysis.sessionName || "Session non disponible"}</span>
          {analysis.teamName && <span>{analysis.teamName}</span>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="hidden text-right md:block">
          <div className="text-sm font-bold">{analysis.athleteName || profileName || "Mouad Athlete"}</div>
          <div className="text-[11px] text-white/55">Saison 2024-2025</div>
        </div>
        <button onClick={() => window.print()} className="bm-button"><Download size={15} /> Exporter PDF</button>
        <button onClick={() => navigator.share?.({ title, url: window.location.href })} className="bm-button"><Share2 size={15} /> Partager</button>
        <button className="bm-icon-button" title="Plus d'actions"><MoreHorizontal size={18} /></button>
      </div>
    </div>
  );
}

function AnalysisProgress({ analysis }: { analysis: BasketballAnalysis }) {
  if (analysis.state === "completed") return null;
  const progress = analysis.progress ?? 0;
  return (
    <section className="bm-card mb-3 p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold">{analysis.progressLabel || stateLabel(analysis.state)}</span>
        <span className="text-[#A8B3C0]">{progress}%</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-white/10">
        <div className="h-full rounded-full bg-[#FF6B00]" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
      </div>
    </section>
  );
}

function AnalysisKPIs({ analysis }: { analysis: BasketballAnalysis }) {
  const attempts = analysis.totals.attempts;
  const made = analysis.totals.made;
  const success = attempts && made !== null && made !== undefined ? Math.round((made / attempts) * 100) : null;
  const release = firstAvailable(analysis.shots.map((shot) => shot.releaseTime));
  const releaseHeight = firstAvailable(analysis.shots.map((shot) => shot.releaseHeight));
  const releaseSpeed = firstAvailable(analysis.shots.map((shot) => shot.releaseSpeed));
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      <Kpi title="Score global" value={formatNumber(analysis.score, 1)} unit="/10" sub={qualityFromScore(analysis.score)} />
      <Kpi title="% réussite" value={formatPercent(success)} sub={made !== null && attempts !== null ? `${made} / ${attempts}` : "Non disponible"} />
      <Kpi title="Temps de libération" value={formatNumber(release, 2)} unit="s" sub={release === null ? "Non disponible" : "Optimal"} />
      <Kpi title="Hauteur du tir" value={formatNumber(releaseHeight, 2)} unit="m" sub={releaseHeight === null ? "Non disponible" : "Depuis trajectoire"} />
      <Kpi title="Vitesse du tir" value={formatNumber(releaseSpeed, 1)} unit="m/s" sub={releaseSpeed === null ? "Non disponible" : "Très rapide"} />
      <Kpi title="Volume" value={formatNumber(attempts, 0)} sub={attempts === null ? "Non disponible" : "Tirs analysés"} />
    </div>
  );
}

function Kpi({ title, value, unit, sub }: { title: string; value: string; unit?: string; sub: string }) {
  return (
    <div className="bm-card p-4">
      <div className="text-[10px] font-bold uppercase tracking-wide text-[#A8B3C0]">{title}</div>
      <div className="mt-2 flex items-end gap-1">
        <span className="text-3xl font-black text-white">{value}</span>
        {unit && <span className="mb-1 text-sm text-white">{unit}</span>}
      </div>
      <div className={`mt-2 text-xs ${sub.includes("Non") ? "text-[#667481]" : "text-[#21E58B]"}`}>{sub}</div>
    </div>
  );
}

function VideoPoseAnalyzer({
  analysis,
  selectedShot,
  onTimeChange,
  onSelectShot,
}: {
  analysis: BasketballAnalysis;
  selectedShot: ShotAttempt | null;
  onTimeChange: (time: number) => void;
  onSelectShot: (id: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    let frame = 0;
    const draw = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      const rect = video.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width));
      canvas.height = Math.max(1, Math.round(rect.height));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      drawTrajectoryOverlay(context, canvas, selectedShot);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [selectedShot]);

  const seek = useCallback((next: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, next));
  }, []);

  const frameStep = (direction: -1 | 1) => {
    const fps = analysis.videoQuality?.fps || 30;
    seek(time + direction / fps);
  };

  const selectedStart = selectedShot?.startTime ?? 0;

  return (
    <section className="bm-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="bm-section-title">Vidéo & détection IA</h2>
        <select value={selectedShot?.id || ""} onChange={(event) => onSelectShot(event.target.value)} className="bm-select">
          {analysis.shots.length ? analysis.shots.map((shot, index) => <option key={shot.id} value={shot.id}>Tir {index + 1}</option>) : <option>Aucun tir détecté</option>}
        </select>
      </div>
      <div className="relative bg-black">
        {analysis.videoUrl ? (
          <video
            ref={videoRef}
            src={analysis.videoUrl}
            className="aspect-video w-full bg-black object-contain"
            playsInline
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(event) => {
              const next = event.currentTarget.currentTime;
              setTime(next);
              onTimeChange(next);
            }}
            onError={() => setPlaying(false)}
          />
        ) : (
          <div className="flex aspect-video items-center justify-center text-sm text-[#667481]">Vidéo non disponible</div>
        )}
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
        <div className="absolute left-3 top-3 grid gap-2 text-xs">
          <DetectionBadge label="Détection IA" value={analysis.poseConfidence ?? analysis.detectionConfidence} />
          <DetectionBadge label="Suivi osseux" value={analysis.poseConfidence ? 25 : null} suffix="Points clés" />
          <DetectionBadge label="Ballon" value={analysis.ballConfidence} />
          <DetectionBadge label="Qualité vidéo" value={analysis.videoQuality?.score ? analysis.videoQuality.score / 100 : null} suffix={analysis.videoQuality?.label || "Non disponible"} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-white/10 px-4 py-3">
        <button className="bm-icon-button" onClick={() => playing ? videoRef.current?.pause() : videoRef.current?.play()} title={playing ? "Pause" : "Lecture"}>
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button className="bm-icon-button" onClick={() => frameStep(-1)} title="Frame précédente"><SkipBack size={16} /></button>
        <button className="bm-icon-button" onClick={() => frameStep(1)} title="Frame suivante"><SkipForward size={16} /></button>
        <input className="min-w-[160px] flex-1 accent-[#FF6B00]" type="range" min={0} max={duration || 0} step={0.01} value={time} onChange={(event) => seek(Number(event.target.value))} />
        <span className="text-xs text-[#A8B3C0]">{formatClock(time)} / {formatClock(duration)}</span>
        <select value={speed} onChange={(event) => { const next = Number(event.target.value); setSpeed(next); if (videoRef.current) videoRef.current.playbackRate = next; }} className="bm-select">
          {[0.25, 0.5, 1, 1.5, 2].map((value) => <option key={value} value={value}>{value}x</option>)}
        </select>
        <button className="bm-icon-button" onClick={() => videoRef.current?.requestFullscreen()} title="Plein écran"><Maximize2 size={16} /></button>
        {selectedShot && <button className="bm-button" onClick={() => seek(selectedStart)}>Aller au tir</button>}
      </div>
    </section>
  );
}

function DetectionBadge({ label, value, suffix }: { label: string; value?: number | null; suffix?: string }) {
  const display = value === null || value === undefined ? "Non disponible" : value <= 1 ? `${Math.round(value * 100)}%` : String(Math.round(value));
  return (
    <div className="rounded-xl border border-white/10 bg-[#08131C]/85 p-3 backdrop-blur">
      <div className="text-[10px] uppercase text-[#A8B3C0]">{label}</div>
      <div className={`mt-1 text-xl font-black ${display.includes("Non") ? "text-[#667481]" : "text-[#21E58B]"}`}>{display}</div>
      {suffix && <div className="text-[10px] text-[#A8B3C0]">{suffix}</div>}
    </div>
  );
}

function ShotPhaseTimeline({ analysis, currentTime, selectedShot }: { analysis: BasketballAnalysis; currentTime: number; selectedShot: ShotAttempt | null }) {
  const events = analysis.raw?.shotAnalysis?.timeline || [];
  const active = [...events].reverse().find((event: { timestampMs?: number }) => currentTime >= (event.timestampMs || 0) / 1000)?.phase;
  return (
    <section className="bm-card p-4">
      <h2 className="bm-section-title">Phases du tir</h2>
      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {phaseLabels.map((phase, index) => {
          const event = events.find((item: { phase?: string }) => item.phase === phase.key);
          const isActive = active === phase.key || (!active && selectedShot && index === 0);
          return (
            <button key={phase.key} onClick={() => seekGlobal(event?.timestampMs)} className={`rounded-2xl border p-3 text-center transition ${isActive ? "border-[#FF6B00] bg-[#FF6B00]/15 text-[#FF8A00]" : "border-white/10 bg-white/[0.03] text-[#A8B3C0]"}`}>
              <Target className="mx-auto mb-2" size={22} />
              <div className="text-[11px] font-bold">{phase.label}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function BiomechanicsPanel({ analysis }: { analysis: BasketballAnalysis }) {
  const metrics = [
    analysis.biomechanics.elbow,
    analysis.biomechanics.knee,
    analysis.biomechanics.trunk,
    analysis.biomechanics.shoulderAlignment,
    analysis.biomechanics.wrist,
  ].filter(Boolean) as AnalysisMetric[];
  return (
    <section className="bm-card p-4">
      <h2 className="bm-section-title">Biomécanique clé</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_120px]">
        <div className="space-y-3">
          {metrics.map((metric) => <div key={metric.label}><MetricRow metric={metric} /></div>)}
        </div>
        <PoseFigure />
      </div>
    </section>
  );
}

function MetricRow({ metric }: { metric: AnalysisMetric }) {
  const color = statusColor[metric.quality];
  const value = metric.value === null ? "Non disponible" : `${formatNumber(metric.value, metric.unit === "deg" ? 0 : 2)} ${metric.unit || ""}`;
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-white">{metric.label}</span>
        <span className="font-bold">{value}</span>
        <span style={{ color }}>{metric.quality}</span>
      </div>
      <div className="mt-1 h-1 rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${metric.confidence * 100}%`, background: color }} />
      </div>
    </div>
  );
}

function BallTrajectoryChart({ analysis, selectedShot }: { analysis: BasketballAnalysis; selectedShot: ShotAttempt | null }) {
  const points = selectedShot?.trajectory?.length ? selectedShot.trajectory : analysis.trajectory?.points || [];
  return (
    <section className="bm-card p-4">
      <h2 className="bm-section-title">Trajectoire du ballon</h2>
      <div className="relative mt-4 aspect-[1.55] rounded-xl border border-white/10 bg-[#050A0F]">
        <svg viewBox="0 0 320 205" className="h-full w-full">
          <path d="M20 175 H300 M20 175 C70 150 110 150 160 175 C205 150 250 150 300 175" fill="none" stroke="rgba(255,255,255,.25)" />
          <path d="M250 112 h48 v42 h-48z M274 154 v21" fill="none" stroke="rgba(255,255,255,.45)" />
          {points.length ? <TrajectoryPath points={points} /> : <text x="160" y="98" textAnchor="middle" fill="#667481" fontSize="12">Non disponible</text>}
        </svg>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
        <MiniMetric label="Distance" value={metricValue(analysis.trajectory?.horizontalDisplacement, "m")} />
        <MiniMetric label="Hauteur max" value={metricValue(analysis.trajectory?.apexHeight, "m")} />
        <MiniMetric label="Angle" value={metricValue(analysis.trajectory?.releaseAngle, "deg")} />
        <MiniMetric label="Entrée" value="Non disponible" />
      </div>
    </section>
  );
}

function ShotZoneMap({ analysis }: { analysis: BasketballAnalysis }) {
  const zones = analysis.shotZones || [];
  return (
    <section className="bm-card p-4">
      <h2 className="bm-section-title">Zones de réussite</h2>
      <div className="relative mt-4 aspect-square max-h-[320px] w-full">
        <svg viewBox="0 0 260 260" className="h-full w-full">
          <rect x="25" y="10" width="210" height="235" fill="#071019" stroke="rgba(255,255,255,.25)" />
          <path d="M25 245 A105 105 0 0 0 235 245 M90 10 v60 h80 v-60 M110 70 A20 20 0 0 0 150 70" fill="none" stroke="rgba(255,255,255,.28)" />
          <circle cx="130" cy="78" r="48" fill="rgba(255,107,0,.18)" />
          <circle cx="130" cy="98" r="72" fill="rgba(33,229,139,.08)" />
          {zones.length ? zones.slice(0, 5).map((zone, index) => (
            <text key={zone.id} x={[62, 130, 198, 130, 130][index] || 130} y={[115, 62, 115, 150, 210][index] || 130} textAnchor="middle" fill={zone.percentage === null || zone.percentage === undefined ? "#667481" : zone.percentage >= 70 ? "#21E58B" : zone.percentage >= 50 ? "#FF8A00" : "#FF4D4F"} fontSize="14" fontWeight="800">
              {zone.percentage === null || zone.percentage === undefined ? "ND" : `${zone.percentage}%`}
            </text>
          )) : <text x="130" y="135" textAnchor="middle" fill="#667481" fontSize="12">Calibration non disponible</text>}
        </svg>
      </div>
    </section>
  );
}

function MuscleActivationPanel({ analysis }: { analysis: BasketballAnalysis }) {
  const measurable = Boolean(analysis.biomechanics.elbow?.value || analysis.biomechanics.knee?.value || analysis.biomechanics.balance?.value);
  const groups = ["Deltoides", "Pectoraux", "Triceps", "Biceps", "Avant-bras", "Core", "Quadriceps", "Mollets"];
  return (
    <section className="bm-card p-4">
      <h2 className="bm-section-title">Utilisation musculaire</h2>
      <div className="mt-1 text-xs text-[#A8B3C0]">Principaux muscles sollicités</div>
      <div className="mt-4 grid grid-cols-[120px_1fr] gap-4">
        <AnatomyFigure active={measurable} />
        <div className="space-y-2 text-xs">
          {groups.map((group) => (
            <div key={group} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#FF6B00]" />{group}</span>
              <span className="text-[#667481]">{measurable ? "Estime" : "Non mesure"}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function VelocityAccelerationChart({ analysis, currentTime }: { analysis: BasketballAnalysis; currentTime: number }) {
  const data = analysis.movement?.velocitySeries || [];
  return (
    <section className="bm-card p-4">
      <h2 className="bm-section-title">Vitesse & accélération</h2>
      <ChartShell empty={!data.length}>
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={data}>
            <XAxis dataKey="time" stroke="#667481" tick={{ fontSize: 11 }} />
            <YAxis stroke="#667481" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#08131C", border: "1px solid rgba(255,255,255,.12)" }} />
            <Line type="monotone" dataKey="speed" stroke="#FF6B00" dot={false} />
            <Line type="monotone" dataKey="acceleration" stroke="#B25CFF" dot={false} />
            <Line data={[{ time: currentTime, cursor: 0 }, { time: currentTime, cursor: 10 }]} dataKey="cursor" stroke="#fff" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>
    </section>
  );
}

function MovementSequence({ analysis }: { analysis: BasketballAnalysis }) {
  const sequence = analysis.movement?.sequence || [];
  return (
    <section className="bm-card p-4">
      <h2 className="bm-section-title">Séquence de mouvement</h2>
      <div className="mt-6 grid grid-cols-4 gap-2">
        {sequence.map((item) => (
          <div key={item.label} className="text-center">
            <div className="text-sm text-[#A8B3C0]">{item.label}</div>
            <div className="mt-1 text-lg font-black text-[#21E58B]">{item.time === null || item.time === undefined ? "ND" : `${formatNumber(item.time, 2)}s`}</div>
            <div className="text-[11px]" style={{ color: statusColor[item.quality] }}>{item.quality}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 h-2 rounded-full bg-white/10">
        <div className="h-full rounded-full bg-[#FF6B00]" style={{ width: sequence.some((item) => item.time) ? "70%" : "0%" }} />
      </div>
    </section>
  );
}

function ConsistencyAnalysis({ analysis }: { analysis: BasketballAnalysis }) {
  const data = analysis.consistency?.series || [];
  return (
    <section className="bm-card p-4">
      <h2 className="bm-section-title">Régularité</h2>
      <div className="mt-5 flex items-end justify-between">
        <div className="text-sm">Consistance du tir</div>
        <div className="text-2xl font-black text-[#21E58B]">{formatNumber(analysis.consistency?.score ?? null, 1)} <span className="text-xs text-white">/10</span></div>
      </div>
      <ChartShell empty={!data.length}>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={data}>
            <XAxis dataKey="label" hide />
            <YAxis hide />
            <Line type="monotone" dataKey="value" stroke="#FF6B00" />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <MiniMetric label="Écart type" value={formatNumber(analysis.consistency?.standardDeviation ?? null, 2)} />
        <MiniMetric label="Répétabilité" value={formatPercent(analysis.consistency?.repeatability ?? null)} />
      </div>
    </section>
  );
}

function DetailedAnalysis({ analysis }: { analysis: BasketballAnalysis }) {
  return (
    <section className="bm-card p-4">
      <h2 className="bm-section-title">Analyse détaillée</h2>
      <div className="mt-4 space-y-2">
        {(analysis.detailed || []).map((item) => (
          <div key={item.category} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold">{item.category}</span>
              <span className="font-black text-[#FF8A00]">{formatNumber(item.score ?? null, 1)} /10</span>
            </div>
            <div className="mt-1 text-xs text-[#A8B3C0]">{item.issue || "Non disponible"}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AIRecommendations({ analysis }: { analysis: BasketballAnalysis }) {
  const recommendations = analysis.aiRecommendations;
  return (
    <section className="bm-card p-4">
      <h2 className="bm-section-title">Recommandations IA</h2>
      <div className="mt-4 space-y-2">
        {recommendations.length ? recommendations.map((item) => (
          <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
            <div>{item.text}</div>
            <div className="mt-1 text-xs text-[#667481]">Base sur: {item.sources.join(", ")}</div>
          </div>
        )) : <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-[#667481]">Analyse insuffisante pour generer des recommandations mesurees.</div>}
      </div>
      <button className="mt-3 w-full rounded-md bg-gradient-to-r from-[#ff4d00] to-[#ff8a00] px-4 py-3 text-sm font-black text-white">Voir exercices recommandés</button>
    </section>
  );
}

function PerformanceComparison({ analysis }: { analysis: BasketballAnalysis }) {
  const data = [
    { subject: "Posture", current: analysis.detailed?.find((item) => item.category === "Posture")?.score ?? 0 },
    { subject: "Equilibre", current: analysis.detailed?.find((item) => item.category === "Equilibre")?.score ?? 0 },
    { subject: "Liberation", current: analysis.detailed?.find((item) => item.category === "Liberation")?.score ?? 0 },
    { subject: "Puissance", current: analysis.movement?.speed?.value ?? 0 },
    { subject: "Regularite", current: analysis.consistency?.score ?? 0 },
    { subject: "Precision", current: accuracyScore(analysis) ?? 0 },
  ];
  const hasData = data.some((item) => item.current > 0);
  return (
    <section className="bm-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="bm-section-title">Comparaison</h2>
        <select className="bm-select"><option>Saison dernière</option><option>Analyse précédente</option><option>Session précédente</option><option>Mois dernier</option><option>Moyenne saison</option><option>Record personnel</option></select>
      </div>
      <ChartShell empty={!hasData}>
        <ResponsiveContainer width="100%" height={250}>
          <RadarChart data={data}>
            <PolarGrid stroke="rgba(255,255,255,.18)" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "#A8B3C0", fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
            <Radar dataKey="current" stroke="#FF6B00" fill="#FF6B00" fillOpacity={0.22} />
          </RadarChart>
        </ResponsiveContainer>
      </ChartShell>
    </section>
  );
}

function ShotTimeline({ analysis, selectedShotId, onSelect }: { analysis: BasketballAnalysis; selectedShotId: string | null; onSelect: (id: string) => void }) {
  return (
    <section className="bm-card mt-3 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="bm-section-title">Timeline des tirs</h2>
        <div className="text-sm text-[#A8B3C0]">Réussite {formatPercent(accuracyPercent(analysis))}</div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {analysis.shots.length ? analysis.shots.map((shot, index) => (
          <button key={shot.id} onClick={() => onSelect(shot.id)} className={`min-w-[120px] rounded-xl border bg-[#050A0F] p-2 text-left ${shot.id === selectedShotId ? "border-[#FF6B00]" : "border-white/10"}`}>
            <div className="aspect-video rounded-lg bg-black">
              {shot.thumbnailUrl ? <img src={shot.thumbnailUrl} alt="" className="h-full w-full rounded-lg object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-[#667481]">Frame</div>}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span>{formatClock(shot.startTime)}</span>
              <span className={shot.result === "made" ? "text-[#21E58B]" : shot.result === "missed" ? "text-[#FF4D4F]" : "text-[#667481]"}>{shot.result === "made" ? "RÉUSSI" : shot.result === "missed" ? "RATÉ" : "INCONNU"}</span>
            </div>
          </button>
        )) : <div className="text-sm text-[#667481]">Aucune tentative detectee.</div>}
      </div>
    </section>
  );
}

function DataSources({ analysis }: { analysis: BasketballAnalysis }) {
  return (
    <section className="bm-card p-4">
      <h2 className="bm-section-title">Origine des données</h2>
      <div className="mt-4 space-y-2 text-sm text-[#A8B3C0]">
        {analysis.dataSources.map((source) => <div key={source}>{source}</div>)}
        {analysis.limitations.map((item) => <div key={item} className="text-[#667481]">{item}</div>)}
      </div>
    </section>
  );
}

function CoachNotes({ analysis, userId, onSaved }: { analysis: BasketballAnalysis; userId: string; onSaved: (note: string) => void }) {
  const [note, setNote] = useState(analysis.coachNotes || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const save = async () => {
    setSaving(true);
    setSaved(false);
    await saveCoachNote({ analysis, userId, note });
    onSaved(note);
    setSaved(true);
    setSaving(false);
  };
  return (
    <section className="bm-card p-4">
      <h2 className="bm-section-title">Note coach</h2>
      <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ajouter votre commentaire technique..." className="mt-4 min-h-[130px] w-full resize-none rounded-md border border-white/10 bg-[#050A0F] p-3 text-sm outline-none focus:border-[#FF6B00]" />
      <button onClick={save} disabled={saving} className="mt-3 inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-[#ff4d00] to-[#ff8a00] px-5 py-2.5 text-sm font-bold disabled:opacity-50"><Save size={15} /> {saving ? "Enregistrement..." : "Enregistrer"}</button>
      {saved && <span className="ml-3 text-xs text-[#21E58B]">Note enregistrée</span>}
    </section>
  );
}

function KeyIndicators({ analysis }: { analysis: BasketballAnalysis }) {
  return (
    <section className="bm-card p-4">
      <h2 className="bm-section-title">Indicateurs clés</h2>
      <div className="mt-4 space-y-2 text-sm">
        <Indicator label="Score technique" value={`${formatNumber(analysis.score ?? null, 1)} / 10`} />
        <Indicator label="Puissance moyenne" value={valueWithUnit(analysis.movement?.speed)} />
        <Indicator label="Régularité" value={`${formatNumber(analysis.consistency?.repeatability ?? null, 0)}%`} />
        <Indicator label="Volume analysé" value={analysis.totals.attempts === null || analysis.totals.attempts === undefined ? "Non disponible" : `${analysis.totals.attempts} tirs`} />
      </div>
    </section>
  );
}

function Indicator({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"><span className="text-[#A8B3C0]">{label}</span><span>{value}</span></div>;
}

function ChartShell({ empty, children }: { empty: boolean; children: ReactNode }) {
  return <div className="relative mt-4 min-h-[150px]">{empty ? <div className="flex min-h-[150px] items-center justify-center rounded-xl border border-white/10 text-sm text-[#667481]">Non disponible</div> : children}</div>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[#667481]">{label}</div><div className="mt-1 font-black">{value}</div></div>;
}

function PoseFigure() {
  return (
    <svg viewBox="0 0 100 180" className="h-[180px] w-full">
      <circle cx="50" cy="18" r="11" fill="none" stroke="#A8B3C0" />
      <path d="M50 30 L43 72 L38 115 L35 160 M50 30 L60 72 L66 115 L72 160 M43 50 L20 72 L18 102 M57 50 L82 35 L88 10 M43 72 L60 72" fill="none" stroke="#A8B3C0" strokeWidth="4" strokeLinecap="round" />
      {[50,43,60,38,66,35,72,20,18,82,88].map((x, index) => <circle key={index} cx={x} cy={[18,50,50,115,115,160,160,72,102,35,10][index]} r="3.5" fill="#FF6B00" />)}
    </svg>
  );
}

function AnatomyFigure({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 100 180" className="h-[180px] w-full">
      <circle cx="50" cy="18" r="11" fill="none" stroke="#A8B3C0" />
      <path d="M38 36 h24 l8 52 -10 72 H40 L30 88z" fill={active ? "rgba(255,107,0,.38)" : "rgba(255,255,255,.06)"} stroke="#A8B3C0" />
      <path d="M35 45 L18 95 M65 45 L82 95 M42 160 L37 178 M58 160 L63 178" stroke={active ? "#FF6B00" : "#667481"} strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

function TrajectoryPath({ points }: { points: Array<{ x: number; y: number }> }) {
  const normalized = points.map((point) => ({
    x: 30 + clamp(point.x, 0, 1) * 250,
    y: 25 + clamp(point.y, 0, 1) * 145,
  }));
  const path = normalized.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  return <>
    <path d={path} fill="none" stroke="#FF6B00" strokeWidth="4" strokeDasharray="6 5" />
    {normalized.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={index === 0 ? 4 : 2.5} fill="#FF8A00" />)}
  </>;
}

function drawTrajectoryOverlay(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, shot: ShotAttempt | null) {
  if (!shot?.trajectory?.length) return;
  context.save();
  context.strokeStyle = "#FF6B00";
  context.lineWidth = 3;
  context.setLineDash([8, 7]);
  context.beginPath();
  shot.trajectory.forEach((point, index) => {
    const x = clamp(point.x, 0, 1) * canvas.width;
    const y = clamp(point.y, 0, 1) * canvas.height;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
  context.restore();
}

function seekGlobal(timestampMs?: number) {
  const videos = document.querySelectorAll("video");
  const video = videos[0] as HTMLVideoElement | undefined;
  if (!video || timestampMs === undefined) return;
  video.currentTime = timestampMs / 1000;
}

function formatDate(value: unknown) {
  if (!value) return "Date non disponible";
  const date = typeof value === "object" && value && "toDate" in value ? (value as { toDate: () => Date }).toDate() : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "Date non disponible" : date.toLocaleString("fr-FR");
}

function formatDuration(value?: number) {
  return value ? `${formatClock(value)}` : "Duree non disponible";
}

function formatClock(value?: number) {
  const seconds = Math.max(0, Math.floor(value || 0));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatNumber(value: number | null | undefined, digits: number) {
  return value === null || value === undefined || !Number.isFinite(value) ? "Non disponible" : value.toFixed(digits);
}

function formatPercent(value: number | null | undefined) {
  return value === null || value === undefined || !Number.isFinite(value) ? "Non disponible" : `${Math.round(value)}%`;
}

function metricValue(metric: { value: number | null; unit?: string } | undefined, fallbackUnit: string) {
  if (!metric || metric.value === null) return "Non disponible";
  return `${formatNumber(metric.value, fallbackUnit === "deg" ? 0 : 2)} ${metric.unit || fallbackUnit}`;
}

function valueWithUnit(metric?: AnalysisMetric) {
  if (!metric || metric.value === null) return "Non disponible";
  return `${formatNumber(metric.value, 1)} ${metric.unit || ""}`;
}

function firstAvailable(values: Array<number | null | undefined>) {
  return values.find((value): value is number => typeof value === "number" && Number.isFinite(value)) ?? null;
}

function accuracyPercent(analysis: BasketballAnalysis) {
  const attempts = analysis.totals.attempts;
  const made = analysis.totals.made;
  return attempts && made !== null && made !== undefined ? Math.round((made / attempts) * 100) : null;
}

function accuracyScore(analysis: BasketballAnalysis) {
  const percent = accuracyPercent(analysis);
  return percent === null ? null : percent / 10;
}

function qualityFromScore(score?: number | null) {
  if (score === null || score === undefined) return "Non disponible";
  if (score >= 8.5) return "Excellent";
  if (score >= 7) return "Bon";
  if (score >= 5) return "A ameliorer";
  return "Critique";
}

function stateLabel(state: BasketballAnalysis["state"]) {
  return {
    uploading: "Upload video",
    processing_video: "Traitement video",
    detecting_pose: "Detection de pose",
    detecting_ball: "Detection du ballon",
    detecting_shots: "Detection des tirs",
    calculating_biomechanics: "Analyse biomecanique",
    generating_recommendations: "Recommendations IA",
    completed: "Analyse terminee",
    failed: "Analyse echouee",
  }[state];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
