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
import { analyzeBasketballSession, type AIAnalysisResult } from "@/src/services/aiAnalysisService";
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
  aiFeedback: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  metrics: AIAnalysisResult["metrics"] & Record<string, unknown>;
};

export type SaveSessionInput = {
  userId: string;
  videoBlob: Blob | File;
  duration: number;
  drillName?: string;
  metrics?: Partial<PoseMetrics> | null;
  onProgress?: UploadProgressHandler;
};

const sessionsCollection = (userId: string) => collection(db, "users", userId, "sessions");

export async function saveTrainingSession({
  userId,
  videoBlob,
  duration,
  drillName = "Freestyle",
  metrics,
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
    metrics: {},
    videoUrl: "",
    thumbnailUrl: "",
    uploadStatus: "uploading",
  });

  const analysis = analyzeBasketballSession(metrics);
  const videoUrl = await retryUploadPrivateFile(userId, draft.id, videoBlob, "videos", onProgress);
  const thumbnailBlob = await generateVideoThumbnail(videoBlob);
  const thumbnailUrl = thumbnailBlob
    ? await retryUploadPrivateFile(userId, draft.id, thumbnailBlob, "thumbnails")
    : "";

  await updateDoc(doc(db, "users", userId, "sessions", draft.id), {
    videoUrl,
    thumbnailUrl,
    duration,
    drillName,
    score: analysis.score,
    aiFeedback: analysis.aiFeedback,
    strengths: analysis.strengths,
    weaknesses: analysis.weaknesses,
    suggestions: analysis.suggestions,
    metrics: {
      ...analysis.metrics,
      madeShots: metrics?.madeShots ?? 0,
      missedShots: metrics?.missedShots ?? 0,
      dribbleCount: metrics?.dribbleCount ?? 0,
    },
    uploadStatus: "complete",
  });

  return { id: draft.id, videoUrl, thumbnailUrl, ...analysis };
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
      aiFeedback: data.aiFeedback || "",
      strengths: data.strengths || [],
      weaknesses: data.weaknesses || [],
      suggestions: data.suggestions || [],
      metrics: data.metrics || {},
    };
  });
}
