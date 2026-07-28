import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import type { AIMatchRecord } from "@/src/types";
import { activateMatch, createMatchInvitation, subscribeMatches } from "@/src/services/socialService";

export { activateMatch, createMatchInvitation, subscribeMatches };

export async function acceptMatchInvite(match: AIMatchRecord, userId: string) {
  if (!match.participantUids.includes(userId)) {
    throw new Error("Only match participants can accept this invite.");
  }
  await updateDoc(doc(db, "matches", match.id), {
    status: "match_ready",
    acceptedAt: serverTimestamp(),
    "aiAnalysis.state": "match_ready",
  });
}

export async function startLiveMatch(match: AIMatchRecord, userId: string) {
  if (match.userId !== userId && !match.participantUids.includes(userId)) {
    throw new Error("Only match participants can start this match.");
  }
  await updateDoc(doc(db, "matches", match.id), {
    status: "match_live",
    liveAt: serverTimestamp(),
    "aiAnalysis.state": "camera_live",
  });
}

export async function cancelMatchInvite(match: AIMatchRecord, userId: string) {
  if (match.userId !== userId) {
    throw new Error("Only the match owner can cancel this invite.");
  }
  await updateDoc(doc(db, "matches", match.id), {
    status: "match_cancelled",
    cancelledAt: serverTimestamp(),
  });
}
