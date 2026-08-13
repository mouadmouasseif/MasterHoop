import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
} from "firebase/firestore";

import type {
  BiomechanicsReport,
  MetricResult,
  ShotOutcome,
  ShotTrajectoryReport,
  TrajectoryPoint,
} from "@/src/ai/types";
import { db } from "@/src/lib/firebase";
import type { PoseMetrics } from "@/src/lib/poseDetection";
import { getLocalAnalyses } from "@/src/services/localAnalysisService";
import type { TrainingSession } from "@/src/services/sessionService";

export type AnalysisState =
  | "uploading"
  | "processing_video"
  | "detecting_pose"
  | "detecting_ball"
  | "detecting_shots"
  | "calculating_biomechanics"
  | "generating_recommendations"
  | "completed"
  | "failed";

export type AnalysisType =
  | "shooting"
  | "dribbling"
  | "passing"
  | "finishing"
  | "movement"
  | "defense";

export type MetricQuality =
  | "Excellent"
  | "Bon"
  | "Optimal"
  | "A ameliorer"
  | "Critique"
  | "Non disponible";

export interface AnalysisMetric {
  value: number | null;
  unit?: string;
  label?: string;
  quality: MetricQuality;
  confidence: number;
  referenceRange?: string;
  source?: string;
}

export interface ShotAttempt {
  id: string;
  startTime: number;
  releaseTime?: number;
  endTime: number;
  result?: "made" | "missed" | "unknown";
  type?: "free_throw" | "2pt" | "3pt";
  releaseAngle?: number;
  releaseHeight?: number;
  releaseSpeed?: number;
  trajectory?: TrajectoryPoint[];
  confidence: number;
  zone?: string;
  thumbnailUrl?: string;
}

export interface Recommendation {
  id: string;
  text: string;
  exerciseId?: string;
  confidence: number;
  sources: string[];
}

export interface BasketballAnalysis {
  id: string;
  userId?: string;
  athleteId: string;
  athleteName?: string;
  teamName?: string;
  sessionId?: string;
  sessionName?: string;
  videoId?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  createdAt?: unknown;
  duration?: number;
  analysisType: AnalysisType;
  state: AnalysisState;
  progress?: number;
  progressLabel?: string;
  score?: number | null;
  detectionConfidence?: number | null;
  poseConfidence?: number | null;
  ballConfidence?: number | null;
  videoQuality?: {
    label?: string;
    score?: number | null;
    width?: number;
    height?: number;
    fps?: number | null;
    issues?: string[];
  };
  totals: {
    attempts?: number | null;
    made?: number | null;
    missed?: number | null;
  };
  shots: ShotAttempt[];
  biomechanics: {
    elbow?: AnalysisMetric;
    shoulder?: AnalysisMetric;
    wrist?: AnalysisMetric;
    hip?: AnalysisMetric;
    knee?: AnalysisMetric;
    ankle?: AnalysisMetric;
    trunk?: AnalysisMetric;
    shoulderAlignment?: AnalysisMetric;
    hipAlignment?: AnalysisMetric;
    shootingArmAlignment?: AnalysisMetric;
    balance?: AnalysisMetric;
    timing?: AnalysisMetric;
    stability?: AnalysisMetric;
  };
  movement?: {
    speed?: AnalysisMetric;
    acceleration?: AnalysisMetric;
    deceleration?: AnalysisMetric;
    jumpHeight?: AnalysisMetric;
    balance?: AnalysisMetric;
    velocitySeries?: Array<{ time: number; speed?: number | null; acceleration?: number | null }>;
    sequence?: Array<{ label: string; time?: number | null; quality: MetricQuality }>;
  };
  trajectory?: ShotTrajectoryReport;
  shotZones?: Array<{ id: string; label: string; attempts?: number | null; makes?: number | null; percentage?: number | null }>;
  consistency?: {
    score?: number | null;
    repeatability?: number | null;
    releaseAngleVariation?: number | null;
    releaseTimeVariation?: number | null;
    releaseHeightVariation?: number | null;
    standardDeviation?: number | null;
    series?: Array<{ label: string; value?: number | null }>;
  };
  detailed?: Array<{
    category: "Posture" | "Equilibre" | "Alignement" | "Liberation" | "Suivi";
    score?: number | null;
    status: MetricQuality;
    issue?: string;
    confidence: number;
  }>;
  aiRecommendations: Recommendation[];
  dataSources: string[];
  coachNotes?: string;
  limitations: string[];
  raw?: DocumentData;
}

export interface AnalysisLoadResult {
  analysis: BasketballAnalysis | null;
  error?: "missing" | "permission" | "network" | "unknown";
  message?: string;
}

export interface PoseDetectionProvider {
  id: string;
  detect(input: HTMLVideoElement | HTMLCanvasElement): Promise<unknown>;
}

export class PoseDetectionService {
  constructor(private readonly provider?: PoseDetectionProvider) {}

  async detect(input: HTMLVideoElement | HTMLCanvasElement) {
    if (!this.provider) {
      return { status: "unavailable", reason: "Aucun fournisseur de pose charge." };
    }
    return this.provider.detect(input);
  }
}

export interface BasketballDetectionProvider {
  id: string;
  detect(input: HTMLVideoElement | HTMLCanvasElement): Promise<unknown>;
}

export class BasketballDetectionService {
  constructor(private readonly provider?: BasketballDetectionProvider) {}

  async detect(input: HTMLVideoElement | HTMLCanvasElement) {
    if (!this.provider) {
      return { status: "unavailable", reason: "Aucun detecteur de ballon charge." };
    }
    return this.provider.detect(input);
  }
}

export class ShotDetectionEngine {
  detectFromSequence(sequence?: BasketballAnalysis["raw"]): ShotAttempt[] {
    const shotAnalysis = sequence?.shotAnalysis || sequence?.analysis?.shotAnalysis;
    return shotAttemptsFromShotAnalysis(shotAnalysis);
  }
}

export async function loadBasketballAnalysis(
  analysisId: string,
  userId: string,
): Promise<AnalysisLoadResult> {
  try {
    const direct = await readAnalysisDocument(analysisId, userId);
    if (direct) return { analysis: direct };

    const sessionSnap = await getDoc(doc(db, "users", userId, "sessions", analysisId));
    if (sessionSnap.exists()) {
      return { analysis: normalizeSession(sessionSnap.id, userId, sessionSnap.data()) };
    }

    const bySession = await getDocs(
      query(collection(db, "analyses"), where("sessionId", "==", analysisId), limit(1)),
    );
    if (!bySession.empty) {
      return { analysis: normalizeAnalysisDoc(bySession.docs[0].id, userId, bySession.docs[0].data()) };
    }

    const local = getLocalAnalyses().find((item) => item.id === analysisId);
    if (local) return { analysis: normalizeLocalAnalysis(local, userId) };

    return { analysis: null, error: "missing", message: "Document d'analyse introuvable." };
  } catch (error) {
    console.warn("Basketball analysis load failed:", error);
    const local = getLocalAnalyses().find((item) => item.id === analysisId);
    if (local) return { analysis: normalizeLocalAnalysis(local, userId) };
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
    if (code.includes("permission")) {
      return { analysis: null, error: "permission", message: "Acces refuse pour cette analyse." };
    }
    if (code.includes("unavailable") || code.includes("deadline")) {
      return { analysis: null, error: "network", message: "Connexion a la base de donnees indisponible." };
    }
    return { analysis: null, error: "unknown", message: "Impossible de charger cette analyse." };
  }
}

export async function saveCoachNote(input: {
  analysis: BasketballAnalysis;
  userId: string;
  note: string;
}) {
  if (input.analysis.raw?.localOnly) {
    const items = getLocalAnalyses();
    const next = items.map((item) =>
      item.id === input.analysis.id ? { ...item, notes: input.note } : item,
    );
    localStorage.setItem("basketmotion:analyses", JSON.stringify(next));
    return;
  }

  const ownerId = input.analysis.userId || input.analysis.athleteId || input.userId;
  const sessionId = input.analysis.sessionId || input.analysis.id;
  await updateDoc(doc(db, "users", ownerId, "sessions", sessionId), {
    notes: input.note,
    updatedAt: serverTimestamp(),
  });
}

async function readAnalysisDocument(analysisId: string, userId: string) {
  const snap = await getDoc(doc(db, "analyses", analysisId));
  if (!snap.exists()) return null;
  const data = snap.data();
  const ownerId = data.userId || data.athleteId || userId;
  if (data.sessionId && (!data.videoUrl || !data.thumbnailUrl || !data.duration)) {
    try {
      const sessionSnap = await getDoc(doc(db, "users", ownerId, "sessions", data.sessionId));
      if (sessionSnap.exists()) {
        return normalizeAnalysisDoc(snap.id, ownerId, { ...data, session: { id: sessionSnap.id, ...sessionSnap.data() } });
      }
    } catch (error) {
      console.warn("Linked session load skipped:", error);
    }
  }
  return normalizeAnalysisDoc(snap.id, ownerId, data);
}

function normalizeAnalysisDoc(id: string, userId: string, data: DocumentData): BasketballAnalysis {
  const sessionLike = data.session || data.trainingSession || {};
  const analysis = data.analysis || data;
  const advanced = data.advancedAnalysis || analysis.advancedAnalysis || {};
  const metrics = analysis.metrics || data.metrics || {};
  const shotAnalysis = data.shotAnalysis || analysis.shotAnalysis;
  const fromShot = shotAttemptsFromShotAnalysis(shotAnalysis);
  const attempts = Array.isArray(data.shots) ? normalizeShotAttempts(data.shots) : fromShot;

  return {
    id,
    userId: data.userId || userId,
    athleteId: data.athleteId || data.userId || userId,
    athleteName: data.athleteName || data.playerName || sessionLike.playerName,
    teamName: data.teamName || sessionLike.teamName,
    sessionId: data.sessionId || sessionLike.id,
    sessionName: data.sessionName || sessionLike.drillName || data.drillName,
    videoId: data.videoId || data.sessionId,
    videoUrl: data.videoUrl || sessionLike.videoUrl,
    thumbnailUrl: data.thumbnailUrl || sessionLike.thumbnailUrl,
    createdAt: data.createdAt || analysis.createdAt,
    duration: numberOrNull(data.duration ?? sessionLike.duration) ?? undefined,
    analysisType: normalizeAnalysisType(data.analysisType || data.type || sessionLike.drillName),
    state: normalizeState(data.state || data.status || "completed"),
    progress: numberOrNull(data.progress),
    progressLabel: data.progressLabel,
    score: scoreToTen(analysis.score ?? data.score),
    detectionConfidence: percentToUnit(analysis.confidenceScore ?? data.confidenceScore ?? shotAnalysis?.confidence?.global),
    poseConfidence: percentToUnit(data.poseConfidence ?? metrics.poseConfidence),
    ballConfidence: percentToUnit(metrics.ballConfidence ?? data.ballConfidence),
    videoQuality: normalizeVideoQuality(data.videoQuality || analysis.videoQuality || sessionLike.videoQuality),
    totals: shotTotals(data, analysis, metrics, attempts),
    shots: attempts,
    biomechanics: normalizeBiomechanics(metrics, shotAnalysis?.biomechanics),
    movement: normalizeMovement(data.movement || advanced.movement || metrics),
    trajectory: shotAnalysis?.trajectory,
    shotZones: normalizeShotZones(data.shotZones || metrics.shotZones || attempts),
    consistency: normalizeConsistency(data.consistency || analysis.consistency, attempts),
    detailed: normalizeDetailed(data.detailed, shotAnalysis?.biomechanics),
    aiRecommendations: normalizeRecommendations(data.aiRecommendations || data.recommendations || analysis.suggestions || advanced.report?.recommendations),
    dataSources: normalizeSources(data, analysis, shotAnalysis),
    coachNotes: data.coachNotes || data.notes || sessionLike.notes,
    limitations: unique([...(analysis.limitations || []), ...(shotAnalysis?.limitations || [])]),
    raw: data,
  };
}

function normalizeSession(id: string, userId: string, data: DocumentData): BasketballAnalysis {
  return normalizeAnalysisDoc(id, userId, {
    ...data,
    sessionId: id,
    session: data,
    analysis: {
      score: data.score,
      confidenceScore: data.confidenceScore,
      metrics: data.metrics,
      suggestions: data.suggestions,
      limitations: data.metrics?.analysisLimitations || [],
    },
    shotAnalysis: data.shotAnalysis,
  });
}

function normalizeLocalAnalysis(data: ReturnType<typeof getLocalAnalyses>[number], userId: string): BasketballAnalysis {
  const shots = shotAttemptsFromShotAnalysis(data.shotAnalysis);
  return {
    id: data.id,
    userId,
    athleteId: userId,
    athleteName: undefined,
    sessionName: data.drill || data.title,
    videoId: data.id,
    videoUrl: data.videoUrl,
    createdAt: data.createdAt,
    analysisType: normalizeAnalysisType(data.drill || data.title),
    state: "completed",
    progress: 100,
    score: scoreToTen(data.score),
    detectionConfidence: percentToUnit(data.confidenceScore),
    videoQuality: { score: data.qualityScore, label: data.qualityScore ? `${data.qualityScore}/100` : undefined },
    totals: {
      attempts: data.madeShots + data.missedShots || null,
      made: data.madeShots || null,
      missed: data.missedShots || null,
    },
    shots,
    biomechanics: normalizeBiomechanics({}, data.shotAnalysis?.biomechanics),
    movement: normalizeMovement({}),
    trajectory: data.shotAnalysis?.trajectory,
    shotZones: normalizeShotZones(shots),
    consistency: normalizeConsistency(undefined, shots),
    detailed: normalizeDetailed(undefined, data.shotAnalysis?.biomechanics),
    aiRecommendations: normalizeRecommendations(data.recommendations),
    dataSources: ["Historique local BasketMotion AI", data.shotAnalysis ? "Analyse temporelle du tir" : "Mesures non persistantes"],
    coachNotes: data.notes,
    limitations: data.shotAnalysis?.limitations || ["Analyse locale: certaines donnees detaillees ne sont pas persistantes."],
    raw: { localOnly: true },
  };
}

function normalizeShotAttempts(value: unknown): ShotAttempt[] {
  if (!Array.isArray(value)) return [];
  return value.map((shot, index) => ({
    id: String(shot.id || `shot-${index + 1}`),
    startTime: seconds(shot.startTime ?? shot.startMs),
    releaseTime: optionalSeconds(shot.releaseTime ?? shot.releaseMs),
    endTime: seconds(shot.endTime ?? shot.endMs ?? shot.releaseTime ?? shot.releaseMs),
    result: normalizeOutcome(shot.result || shot.outcome),
    type: normalizeShotType(shot.type || shot.shotType),
    releaseAngle: numberOrUndefined(shot.releaseAngle),
    releaseHeight: numberOrUndefined(shot.releaseHeight),
    releaseSpeed: numberOrUndefined(shot.releaseSpeed),
    trajectory: Array.isArray(shot.trajectory) ? shot.trajectory : undefined,
    confidence: clamp01(Number(shot.confidence || 0)),
    zone: shot.zone,
    thumbnailUrl: shot.thumbnailUrl,
  }));
}

function shotAttemptsFromShotAnalysis(shotAnalysis: DocumentData | undefined): ShotAttempt[] {
  if (!shotAnalysis) return [];
  const highlights = Array.isArray(shotAnalysis.highlights) ? shotAnalysis.highlights : [];
  if (!highlights.length && !shotAnalysis.timeline?.length) return [];
  const release = shotAnalysis.timeline?.find((event: DocumentData) => event.phase === "release");
  const start = highlights[0]?.startMs ?? shotAnalysis.timeline?.[0]?.timestampMs ?? 0;
  const end = highlights[0]?.endMs ?? shotAnalysis.timeline?.at?.(-1)?.timestampMs ?? release?.timestampMs ?? start;
  return [{
    id: "shot-1",
    startTime: seconds(start),
    releaseTime: release ? seconds(release.timestampMs) : undefined,
    endTime: seconds(end),
    result: normalizeOutcome(shotAnalysis.outcome),
    type: normalizeShotType(shotAnalysis.shotType),
    releaseAngle: metricNumber(shotAnalysis.trajectory?.releaseAngle),
    releaseHeight: nullToUndefined(metricNumber(shotAnalysis.trajectory?.apexHeight)),
    releaseSpeed: undefined,
    trajectory: shotAnalysis.trajectory?.points || [],
    confidence: clamp01(Number(shotAnalysis.confidence?.global ?? 0) / 100 || Number(release?.confidence || 0)),
  }];
}

function normalizeBiomechanics(metrics: DocumentData, report?: BiomechanicsReport): BasketballAnalysis["biomechanics"] {
  return {
    elbow: metricFromValue(metrics.elbowAngle, "deg", "Angle du coude", "Optimal", "40-55 deg"),
    shoulder: metricFromValue(metrics.shoulderAngle, "deg", "Angle epaule", "Non disponible"),
    wrist: metricFromValue(metrics.wristAngle, "deg", "Poignet", "Non disponible"),
    hip: metricFromValue(metrics.hipAngle, "deg", "Angle hanche", "Non disponible"),
    knee: metricFromValue(metrics.kneeAngle, "deg", "Angle du genou", "Bon", "95-125 deg"),
    ankle: metricFromValue(metrics.ankleAngle, "deg", "Angle cheville", "Non disponible"),
    trunk: metricFromValue(metrics.trunkInclination, "deg", "Angle du tronc", "Bon"),
    shoulderAlignment: metricFromValue(metrics.shoulderLevel, "px", "Alignement epaules", "Excellent"),
    hipAlignment: metricFromValue(metrics.hipAlignment, "deg", "Alignement hanches", "Non disponible"),
    shootingArmAlignment: metricFromValue(metrics.shootingArmAlignment, "deg", "Bras tireur", "Non disponible"),
    balance: metricFromResult(report?.balance, "Equilibre"),
    timing: metricFromResult(report?.timing, "Timing"),
    stability: metricFromResult(report?.stability, "Stabilite"),
  };
}

function normalizeMovement(value: DocumentData): BasketballAnalysis["movement"] {
  const speed = numberOrNull(value.speed ?? value.avgSpeed ?? value.ballVelocity?.vx);
  const acceleration = numberOrNull(value.acceleration);
  return {
    speed: metricFromValue(speed, "m/s", "Vitesse", speed === null ? "Non disponible" : "Bon"),
    acceleration: metricFromValue(acceleration, "m/s2", "Acceleration", acceleration === null ? "Non disponible" : "Bon"),
    deceleration: metricFromValue(value.deceleration, "m/s2", "Deceleration", "Non disponible"),
    jumpHeight: metricFromValue(value.jumpHeight, "m", "Hauteur saut", "Non disponible"),
    balance: metricFromValue(value.balance, "/10", "Equilibre", "Non disponible"),
    velocitySeries: Array.isArray(value.velocitySeries) ? value.velocitySeries : [],
    sequence: Array.isArray(value.sequence) ? value.sequence : [
      { label: "Jambes", quality: "Non disponible" },
      { label: "Tronc", quality: "Non disponible" },
      { label: "Bras", quality: "Non disponible" },
      { label: "Poignet", quality: "Non disponible" },
    ],
  };
}

function normalizeShotZones(value: unknown, maybeAttempts?: ShotAttempt[]) {
  if (Array.isArray(value) && value.length && "label" in (value[0] || {})) return value as BasketballAnalysis["shotZones"];
  const attempts = Array.isArray(value) ? value as ShotAttempt[] : maybeAttempts || [];
  if (!attempts.length) return [];
  const grouped = new Map<string, ShotAttempt[]>();
  attempts.forEach((shot) => grouped.set(shot.zone || "Zone non calibree", [...(grouped.get(shot.zone || "Zone non calibree") || []), shot]));
  return [...grouped.entries()].map(([id, shots]) => {
    const makes = shots.filter((shot) => shot.result === "made").length;
    return {
      id,
      label: id,
      attempts: shots.length,
      makes,
      percentage: shots.some((shot) => shot.result === "unknown") ? null : Math.round((makes / shots.length) * 100),
    };
  });
}

function normalizeConsistency(value: DocumentData | undefined, shots: ShotAttempt[]): BasketballAnalysis["consistency"] {
  if (value) return value;
  if (shots.length < 2) {
    return {
      score: null,
      repeatability: null,
      standardDeviation: null,
      releaseAngleVariation: null,
      releaseTimeVariation: null,
      releaseHeightVariation: null,
      series: [],
    };
  }
  return {
    score: null,
    repeatability: null,
    standardDeviation: standardDeviation(shots.map((shot) => shot.releaseAngle).filter(isNumber)),
    releaseAngleVariation: standardDeviation(shots.map((shot) => shot.releaseAngle).filter(isNumber)),
    releaseTimeVariation: standardDeviation(shots.map((shot) => shot.releaseTime).filter(isNumber)),
    releaseHeightVariation: standardDeviation(shots.map((shot) => shot.releaseHeight).filter(isNumber)),
    series: shots.map((shot, index) => ({ label: String(index + 1), value: shot.releaseAngle ?? null })),
  };
}

function normalizeDetailed(value: unknown, report?: BiomechanicsReport): BasketballAnalysis["detailed"] {
  if (Array.isArray(value)) return value as BasketballAnalysis["detailed"];
  const observations = report?.observations || [];
  return [
    detail("Posture", null, "Non disponible", "Posture globale non calculee.", 0),
    detail("Equilibre", metricNumber(report?.balance), qualityFromMetric(report?.balance), observations.find((item) => item.category === "balance")?.message, report?.balance.confidence || 0),
    detail("Alignement", null, "Non disponible", observations.find((item) => item.category === "alignment")?.message || "Alignement non calcule.", 0),
    detail("Liberation", metricNumber(report?.timing), qualityFromMetric(report?.timing), "Timing de liberation base sur les phases detectees.", report?.timing.confidence || 0),
    detail("Suivi", metricNumber(report?.stability), qualityFromMetric(report?.stability), observations.find((item) => item.category === "stability")?.message, report?.stability.confidence || 0),
  ];
}

function normalizeRecommendations(value: unknown): Recommendation[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    if (typeof item === "string") {
      return { id: `rec-${index + 1}`, text: item, confidence: 0, sources: ["analysis_results"] };
    }
    return {
      id: String(item.id || `rec-${index + 1}`),
      text: String(item.text || item.title || item.description || ""),
      exerciseId: item.exerciseId,
      confidence: clamp01(Number(item.confidence || 0)),
      sources: Array.isArray(item.sources) ? item.sources : ["analysis_results"],
    };
  }).filter((item) => item.text);
}

function normalizeSources(data: DocumentData, analysis: DocumentData, shotAnalysis?: DocumentData): string[] {
  return unique([
    data.videoUrl || data.session?.videoUrl ? "Video analysee" : "",
    analysis.engine || data.analysisEngine || "BasketMotion AI",
    shotAnalysis ? "Moteur temporel tir / pose / ballon" : "",
    data.reportUrl ? "Rapport persiste" : "",
  ].filter(Boolean));
}

function shotTotals(data: DocumentData, analysis: DocumentData, metrics: DocumentData, shots: ShotAttempt[]) {
  const made = numberOrNull(data.madeShots ?? analysis.madeShots ?? metrics.madeShots);
  const missed = numberOrNull(data.missedShots ?? analysis.missedShots ?? metrics.missedShots);
  const attempts = numberOrNull(data.attempts ?? analysis.attempts ?? metrics.attempts) ?? (made !== null || missed !== null ? (made || 0) + (missed || 0) : shots.length || null);
  return { attempts, made, missed };
}

function normalizeVideoQuality(value: DocumentData | undefined): BasketballAnalysis["videoQuality"] {
  if (!value) return undefined;
  const width = numberOrNull(value.width);
  const height = numberOrNull(value.height);
  return {
    label: width && height ? `${width}p source` : value.label,
    score: numberOrNull(value.score),
    width: width ?? undefined,
    height: height ?? undefined,
    fps: numberOrNull(value.fps),
    issues: value.issues || [],
  };
}

function metricFromValue(value: unknown, unit: string, label: string, fallbackQuality: MetricQuality, referenceRange?: string): AnalysisMetric {
  const numeric = numberOrNull(value);
  return {
    value: numeric,
    unit,
    label,
    quality: numeric === null ? "Non disponible" : fallbackQuality,
    confidence: numeric === null ? 0 : 0.5,
    referenceRange,
  };
}

function metricFromResult(metric: MetricResult | undefined, label: string): AnalysisMetric {
  if (!metric) return metricFromValue(null, "", label, "Non disponible");
  return {
    value: metric.value,
    unit: metric.unit,
    label,
    quality: qualityFromMetric(metric),
    confidence: metric.confidence,
    source: metric.source,
  };
}

function qualityFromMetric(metric?: MetricResult): MetricQuality {
  if (!metric || metric.value === null || metric.status === "unavailable") return "Non disponible";
  if (metric.confidence >= 0.8) return "Excellent";
  if (metric.confidence >= 0.6) return "Bon";
  return "A ameliorer";
}

function detail(category: BasketballAnalysis["detailed"][number]["category"], score: number | null, status: MetricQuality, issue = "Non disponible", confidence = 0) {
  return { category, score, status, issue, confidence };
}

function normalizeAnalysisType(value: unknown): AnalysisType {
  const text = String(value || "").toLowerCase();
  if (text.includes("drib")) return "dribbling";
  if (text.includes("pass")) return "passing";
  if (text.includes("finish") || text.includes("layup") || text.includes("finition")) return "finishing";
  if (text.includes("def")) return "defense";
  if (text.includes("move") || text.includes("foot") || text.includes("accel")) return "movement";
  return "shooting";
}

function normalizeState(value: unknown): AnalysisState {
  const allowed: AnalysisState[] = ["uploading", "processing_video", "detecting_pose", "detecting_ball", "detecting_shots", "calculating_biomechanics", "generating_recommendations", "completed", "failed"];
  return allowed.includes(value as AnalysisState) ? value as AnalysisState : "completed";
}

function normalizeOutcome(value: unknown): ShotOutcome {
  if (value === "made" || value === "missed") return value;
  return "unknown";
}

function normalizeShotType(value: unknown): ShotAttempt["type"] {
  const text = String(value || "").toLowerCase();
  if (text.includes("free")) return "free_throw";
  if (text.includes("3")) return "3pt";
  if (text.includes("2")) return "2pt";
  return undefined;
}

function scoreToTen(value: unknown) {
  const numeric = numberOrNull(value);
  if (numeric === null) return null;
  return numeric > 10 ? Number((numeric / 10).toFixed(1)) : Number(numeric.toFixed(1));
}

function percentToUnit(value: unknown) {
  const numeric = numberOrNull(value);
  if (numeric === null) return null;
  return numeric > 1 ? Number((numeric / 100).toFixed(2)) : numeric;
}

function metricNumber(metric?: MetricResult): number | null {
  return numberOrNull(metric?.value);
}

function numberOrNull(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function numberOrUndefined(value: unknown): number | undefined {
  return nullToUndefined(numberOrNull(value));
}

function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

function seconds(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return numeric > 60 ? numeric / 1000 : numeric;
}

function optionalSeconds(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return seconds(numeric);
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return null;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Number(Math.sqrt(variance).toFixed(2));
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export type { TrainingSession, PoseMetrics };
