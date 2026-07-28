import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import type { SessionLike, UserLearningProfile } from "@/src/types/aiAssistant";
import {
  buildTrainingRecommendations,
  calculateTrainingProgress,
  detectTrainingLevel,
  generateTrainingObjectives,
} from "@/src/services/trainingProgressService";

export function buildUserLearningProfile(userId: string, sessions: SessionLike[], previous?: UserLearningProfile | null): UserLearningProfile {
  const progression = calculateTrainingProgress(sessions);
  const recommendations = buildTrainingRecommendations(progression);
  const proposedGoals = generateTrainingObjectives(progression);
  const estimatedLevel = detectTrainingLevel(progression);

  return {
    userId,
    strengths: inferStrengths(progression),
    weaknesses: inferWeaknesses(progression),
    progression,
    recommendations,
    proposedGoals,
    estimatedLevel,
    adviceHistory: previous?.adviceHistory || [],
    updatedAt: new Date().toISOString(),
  };
}

export async function loadUserLearningProfile(userId: string): Promise<UserLearningProfile | null> {
  const snap = await getDoc(doc(db, "userProfiles", userId));
  return snap.exists() ? (snap.data() as UserLearningProfile) : null;
}

export async function saveUserLearningProfile(profile: UserLearningProfile) {
  await setDoc(doc(db, "userProfiles", profile.userId), {
    ...profile,
    serverUpdatedAt: serverTimestamp(),
  }, { merge: true });
}

function inferStrengths(progress: UserLearningProfile["progression"]) {
  const strengths: string[] = [];
  if (progress.shootingAccuracy >= 70) strengths.push("Reussite au tir fiable sur les donnees recentes");
  if ((progress.closeAccuracy ?? 0) >= 70) strengths.push("Bonne efficacite pres du cercle");
  if (progress.dribbleStability >= 72) strengths.push("Rythme de dribble stable");
  if (progress.trend === "improving") strengths.push("Progression positive dans le temps");
  return strengths.length ? strengths : ["Base de travail mesurable et exploitable"];
}

function inferWeaknesses(progress: UserLearningProfile["progression"]) {
  const weaknesses: string[] = [];
  if (progress.shootingAccuracy && progress.shootingAccuracy < 60) weaknesses.push("Regularite au tir");
  if ((progress.threePointAccuracy ?? 100) < 45) weaknesses.push("Tir a 3 points");
  if (progress.dribbleStability < 65) weaknesses.push("Controle du dribble sous rythme");
  if (progress.trend === "declining") weaknesses.push("Precision en baisse, fatigue possible");
  return weaknesses.length ? weaknesses : ["Aucune faiblesse forte detectee dans les donnees disponibles"];
}
