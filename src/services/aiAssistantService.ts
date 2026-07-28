import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import type { AssistantReport, SessionLike, UserLearningProfile } from "@/src/types/aiAssistant";
import { buildUserLearningProfile, loadUserLearningProfile, saveUserLearningProfile } from "@/src/services/userLearningProfileService";

export function generateAssistantReport(profile: UserLearningProfile, sessions: SessionLike[]): AssistantReport {
  const sourceSessionIds = sessions.map((session) => session.id).filter(Boolean);
  const progress = profile.progression;
  const summary = progress.sessionsAnalyzed === 0
    ? "Aucune session exploitable pour le moment. Lance une analyse live ou importe une video pour construire ton profil IA."
    : `Analyse basee sur ${progress.sessionsAnalyzed} session(s): ${progress.shootingAccuracy}% au tir, tendance ${translateTrend(progress.trend)}, niveau estime ${profile.estimatedLevel}.`;

  return {
    summary,
    level: profile.estimatedLevel,
    recommendations: profile.recommendations,
    goals: profile.proposedGoals,
    evidence: {
      sessionIds: sourceSessionIds,
      sessionsAnalyzed: progress.sessionsAnalyzed,
      shotsAttempted: progress.shotsAttempted,
    },
  };
}

export async function refreshAssistantForUser(userId: string, sessions: SessionLike[]) {
  const previous = await loadUserLearningProfile(userId);
  const profile = buildUserLearningProfile(userId, sessions, previous);
  const report = generateAssistantReport(profile, sessions);
  const advice = report.recommendations[0]?.reason || report.summary;

  const nextProfile: UserLearningProfile = {
    ...profile,
    adviceHistory: [
      {
        id: `advice-${Date.now()}`,
        createdAt: new Date().toISOString(),
        advice,
        sourceSessionIds: report.evidence.sessionIds,
      },
      ...(previous?.adviceHistory || []),
    ].slice(0, 30),
  };

  await saveUserLearningProfile(nextProfile);
  await addDoc(collection(db, "aiReports"), {
    userId,
    report,
    createdAt: serverTimestamp(),
    sourceSessionIds: report.evidence.sessionIds,
  });

  return { profile: nextProfile, report };
}

function translateTrend(trend: UserLearningProfile["progression"]["trend"]) {
  if (trend === "improving") return "en progression";
  if (trend === "declining") return "en baisse";
  return "stable";
}
