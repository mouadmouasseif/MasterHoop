import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";

import { db } from "@/src/lib/firebase";
import type { PoseMetrics } from "@/src/lib/poseDetection";
import type { ShotSequenceAnalysis } from "@/src/ai/types";
import { analyzeBasketballSession, type AIAnalysisResult } from "@/src/services/aiAnalysisService";
import { buildAdvancedVideoAnalysis, type AdvancedVideoAnalysis } from "@/src/services/aiVisionEngine";
import { recommendDrills, type TrainingDrill } from "@/src/services/drillRecommendationService";
import {
  generateVideoThumbnail,
  retryUploadPrivateFile,
  type UploadProgressHandler,
} from "@/src/services/firebaseStorage";

export type TrainingSession = {
  id: string;
  userId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  createdAt: unknown;
  duration: number;
  drillName: string;
  score: number;
  confidenceScore: number;
  confidenceLabel: AIAnalysisResult["confidenceLabel"];
  analysisEngine: AIAnalysisResult["engine"];
  aiFeedback: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  recommendations: string[];
  recommendedDrills: TrainingDrill[];
  playerName?: string;
  notes?: string;
  reportUrl?: string;
  advancedAnalysis?: AdvancedVideoAnalysis;
  metrics: AIAnalysisResult["metrics"] & Record<string, unknown>;
  shotAnalysis?: ShotSequenceAnalysis;
};

export type SaveSessionInput = {
  userId: string;
  videoBlob: Blob | File;
  duration: number;
  drillName?: string;
  metrics?: Partial<PoseMetrics> | null;
  shotAnalysis?: ShotSequenceAnalysis;
  playerName?: string;
  notes?: string;
  onProgress?: UploadProgressHandler;
};

const sessionsCollection = (userId: string) => collection(db, "users", userId, "sessions");

export async function saveTrainingSession({
  userId,
  videoBlob,
  duration,
  drillName = "Freestyle",
  metrics,
  shotAnalysis,
  playerName = "John",
  notes = "",
  onProgress,
}: SaveSessionInput) {
  const sessionRef = collection(db, "users", userId, "sessions");
  const draft = await addDoc(sessionRef, {
    userId,
    createdAt: serverTimestamp(),
    duration,
    drillName,
    score: 0,
    aiFeedback: "Upload in progress",
    strengths: [],
    weaknesses: [],
    suggestions: [],
    recommendations: [],
    recommendedDrills: [],
    playerName,
    notes,
    reportUrl: "",
    advancedAnalysis: {},
    metrics: {},
    videoUrl: "",
    thumbnailUrl: "",
    uploadStatus: "uploading",
  });

  const analysis = analyzeBasketballSession(metrics);
  const advancedAnalysis = buildAdvancedVideoAnalysis(metrics, playerName);
  const recommendedDrills = recommendDrills(advancedAnalysis.report.weaknesses);
  const missionReport = (metrics as Record<string, unknown> | null | undefined)?.trainingMissionReport || null;
  const missionProgress = (metrics as Record<string, unknown> | null | undefined)?.trainingMissionProgress || null;
  const missionBadges = (metrics as Record<string, unknown> | null | undefined)?.trainingBadges || [];
  const temporalShotAnalysis = shotAnalysis || (
    (metrics as Record<string, unknown> | null | undefined)?.shotAnalysis as ShotSequenceAnalysis | undefined
  );
  const videoUrl = await retryUploadPrivateFile(userId, draft.id, videoBlob, "videos", onProgress);
  const thumbnailBlob = await generateVideoThumbnail(videoBlob);
  const thumbnailUrl = thumbnailBlob
    ? await retryUploadPrivateFile(userId, draft.id, thumbnailBlob, "thumbnails")
    : "";
  const reportBlob = new Blob([JSON.stringify({
    sessionId: draft.id,
    analysis,
    advancedAnalysis,
    missionReport,
    missionProgress,
    missionBadges,
    shotAnalysis: temporalShotAnalysis,
    recommendations: advancedAnalysis.report.recommendations,
    recommendedDrills,
  }, null, 2)], { type: "application/json" });
  const reportUrl = await retryUploadPrivateFile(userId, draft.id, reportBlob, "reports");

  const sessionPayload = {
    videoUrl,
    thumbnailUrl,
    duration,
    drillName,
    score: analysis.score,
    confidenceScore: analysis.confidenceScore,
    confidenceLabel: analysis.confidenceLabel,
    analysisEngine: analysis.engine,
    aiFeedback: analysis.aiFeedback,
    strengths: analysis.strengths,
    weaknesses: analysis.weaknesses,
    suggestions: analysis.suggestions,
    recommendations: advancedAnalysis.report.recommendations,
    recommendedDrills,
    playerName,
    notes,
    reportUrl,
    advancedAnalysis,
    shotAnalysis: temporalShotAnalysis,
    missionReport,
    missionProgress,
    missionBadges,
    metrics: {
      ...analysis.metrics,
      metricConfidence: analysis.metricConfidence,
      analysisLimitations: analysis.limitations,
      madeShots: metrics?.madeShots ?? 0,
      missedShots: metrics?.missedShots ?? 0,
      dribbleCount: metrics?.dribbleCount ?? 0,
      ballConfidence: metrics?.ballConfidence ?? 0,
      ballDetectorSource: metrics?.ballDetectorSource ?? "coco-ssd",
      trainingMissionReport: missionReport,
      trainingMissionProgress: missionProgress,
      trainingBadges: missionBadges,
    },
    uploadStatus: "complete",
  };

  await updateDoc(doc(db, "users", userId, "sessions", draft.id), sessionPayload);

  await Promise.all([
    addDoc(collection(db, "trainings"), { userId, sessionId: draft.id, createdAt: serverTimestamp(), ...sessionPayload }),
    addDoc(collection(db, "analyses"), { userId, sessionId: draft.id, createdAt: serverTimestamp(), analysis, advancedAnalysis, shotAnalysis: temporalShotAnalysis || null }),
    addDoc(collection(db, "videos"), { userId, sessionId: draft.id, createdAt: serverTimestamp(), videoUrl, thumbnailUrl }),
    addDoc(collection(db, "reports"), { userId, sessionId: draft.id, createdAt: serverTimestamp(), reportUrl, report: advancedAnalysis.report }),
  ]).catch((error) => {
    console.warn("Secondary analytics collections write failed:", error);
  });

  return { id: draft.id, videoUrl, thumbnailUrl, reportUrl, advancedAnalysis, recommendedDrills, ...analysis };
}

export async function listTrainingSessions(userId: string): Promise<TrainingSession[]> {
  const q = query(sessionsCollection(userId), orderBy("createdAt", "desc"), limit(60));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as DocumentData;
    return {
      id: docSnap.id,
      userId,
      videoUrl: data.videoUrl || "",
      thumbnailUrl: data.thumbnailUrl || "",
      createdAt: data.createdAt,
      duration: Number(data.duration || 0),
      drillName: data.drillName || "Freestyle",
      score: Number(data.score || 0),
      confidenceScore: Number(data.confidenceScore || 0),
      confidenceLabel: data.confidenceLabel || "unreliable",
      analysisEngine: data.analysisEngine || "BasketMotion-Ai-local-v1",
      aiFeedback: data.aiFeedback || "",
      strengths: data.strengths || [],
      weaknesses: data.weaknesses || [],
      suggestions: data.suggestions || [],
      recommendations: data.recommendations || data.suggestions || [],
      recommendedDrills: data.recommendedDrills || [],
      playerName: data.playerName || "John",
      notes: data.notes || "",
      reportUrl: data.reportUrl || "",
      advancedAnalysis: data.advancedAnalysis,
      shotAnalysis: data.shotAnalysis,
      metrics: data.metrics || {},
    };
  });
}
