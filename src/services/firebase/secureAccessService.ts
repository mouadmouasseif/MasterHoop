import { addDoc, collection, doc, getDoc, getDocs, limit, query, runTransaction, serverTimestamp, Timestamp, where, type DocumentData, type QueryConstraint } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import type { Invitation, InvitationType, ResolvedUserProfile } from "@/src/auth/types";
import { canAccessAnalysis, hasPermission } from "@/src/permissions/permissions";
import type { AnalysisAccessRecord } from "@/src/permissions/types";

export interface AnalysisDocument extends AnalysisAccessRecord {
  id: string;
  ownerId: string;
  athleteId: string;
  source: "camera" | "upload";
  executionMode: "realtime" | "uploaded_video" | "offline" | "cloud";
  status: "draft" | "validating" | "processing" | "completed" | "rejected" | "failed";
  createdAt: unknown;
  updatedAt: unknown;
  [key: string]: unknown;
}

export async function getAnalysisSecure(actor: ResolvedUserProfile, analysisId: string): Promise<AnalysisDocument | null> {
  const snapshot = await getDoc(doc(db, "analyses", analysisId));
  if (!snapshot.exists()) return null;
  const analysis = normalizeAnalysis(snapshot.id, snapshot.data());
  if (!canAccessAnalysis(actor, analysis)) throw new Error("PERMISSION_DENIED");
  return analysis;
}

export async function listAccessibleAnalyses(actor: ResolvedUserProfile): Promise<AnalysisDocument[]> {
  const constraints: QueryConstraint[] = [];
  if (actor.role === "athlete") constraints.push(where("ownerId", "==", actor.id));
  else if (actor.role === "coach") {
    if (!actor.athleteIds.length) return [];
    constraints.push(where("athleteId", "in", actor.athleteIds.slice(0, 30)));
  } else if (actor.role === "club_admin") {
    if (!actor.clubId) return [];
    constraints.push(where("clubId", "==", actor.clubId));
  }
  constraints.push(limit(50));
  const snapshot = await getDocs(query(collection(db, "analyses"), ...constraints));
  return snapshot.docs.map((item) => normalizeAnalysis(item.id, item.data())).filter((analysis) => canAccessAnalysis(actor, analysis));
}

export async function createInvitation(actor: ResolvedUserProfile, input: {
  type: InvitationType;
  email?: string;
  recipientId?: string;
  clubId?: string;
  coachId?: string;
  expiresInHours?: number;
}): Promise<string> {
  assertCanInvite(actor, input.type, input.clubId);
  const expiresInHours = Math.min(168, Math.max(1, input.expiresInHours || 72));
  const invitation = {
    type: input.type,
    email: input.email?.trim().toLowerCase() || null,
    senderId: actor.id,
    recipientId: input.recipientId || null,
    clubId: input.clubId || actor.clubId || null,
    coachId: input.coachId || (actor.role === "coach" ? actor.id : null),
    status: "pending",
    expiresAt: Timestamp.fromMillis(Date.now() + expiresInHours * 60 * 60 * 1000),
    createdAt: serverTimestamp(),
  } satisfies Omit<Invitation, "id">;
  const reference = await addDoc(collection(db, "invitations"), invitation);
  return reference.id;
}

export async function respondToInvitation(
  actor: ResolvedUserProfile,
  invitationId: string,
  decision: "accepted" | "declined",
): Promise<void> {
  if (actor.accountStatus !== "active") throw new Error("PERMISSION_DENIED");
  await runTransaction(db, async (transaction) => {
    const invitationReference = doc(db, "invitations", invitationId);
    const snapshot = await transaction.get(invitationReference);
    if (!snapshot.exists()) throw new Error("INVITATION_NOT_FOUND");
    const invitation = snapshot.data() as Omit<Invitation, "id">;
    if (invitation.recipientId !== actor.id) throw new Error("PERMISSION_DENIED");
    if (invitation.status !== "pending") throw new Error("INVITATION_NOT_PENDING");
    const expiresAt = invitation.expiresAt as Timestamp;
    if (!expiresAt?.toMillis || expiresAt.toMillis() <= Date.now()) throw new Error("INVITATION_EXPIRED");

    transaction.update(invitationReference, { status: decision, updatedAt: serverTimestamp() });
    if (decision === "accepted" && invitation.type === "coach_athlete") {
      if (!invitation.coachId) throw new Error("INVITATION_INVALID");
      const linkId = `${invitation.coachId}_${actor.id}`;
      transaction.set(doc(db, "coachAthleteLinks", linkId), {
        coachId: invitation.coachId,
        athleteId: actor.id,
        clubId: invitation.clubId || actor.clubId || null,
        status: "active",
        invitationId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  });
}

function assertCanInvite(actor: ResolvedUserProfile, type: InvitationType, clubId?: string) {
  if (actor.accountStatus !== "active") throw new Error("PERMISSION_DENIED");
  if (actor.role === "super_admin") return;
  if (actor.role === "club_admin" && actor.clubId && actor.clubId === (clubId || actor.clubId)) return;
  if (actor.role === "coach" && type === "coach_athlete") return;
  if (type === "athlete" && hasPermission(actor, "manage_club_users")) return;
  throw new Error("PERMISSION_DENIED");
}

function normalizeAnalysis(id: string, data: DocumentData): AnalysisDocument {
  const ownerId = String(data.ownerId || data.userId || "");
  return {
    ...data,
    id,
    ownerId,
    athleteId: String(data.athleteId || ownerId),
    source: data.source === "upload" ? "upload" : "camera",
    executionMode: data.executionMode || (data.source === "upload" ? "uploaded_video" : "realtime"),
    status: data.status || "completed",
    createdAt: data.createdAt,
    updatedAt: data.updatedAt || data.createdAt,
  } as AnalysisDocument;
}
