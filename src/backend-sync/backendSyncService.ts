import { collection, doc, getDocs, limit, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import type { AICoachRecommendationV4, GeneratedTrainingPlan } from "@/src/ai-coach/types";
import type { TrainingPlan, VideoComment, VideoDrawing } from "@/src/coaches/types";
import type { ClubDashboardSnapshot, ClubReport } from "@/src/clubs/types";
import type { MarketplaceItem, TournamentSnapshot } from "@/src/ecosystem/types";
import type { EliteAnalyticsReport, ScoutingReport } from "@/src/elite/types";
import type { MatchIntelligenceDashboard } from "@/src/match-intelligence/types";
import type { BackendSyncCollection, BackendSyncEnvelope, BackendSyncResult, SyncActor, SyncablePayload } from "@/src/backend-sync/types";
import { CURRENT_LOCAL_PREFIX } from "@/src/shared/brand";

const FALLBACK_KEY = `${CURRENT_LOCAL_PREFIX}:backend-sync:queue`;

export function backendCollectionPath(collectionName: BackendSyncCollection, scopeId?: string): string {
  if (collectionName === "clubSnapshots") return `clubs/${requiredScope(scopeId, collectionName)}/snapshots`;
  if (collectionName === "clubReports") return `clubs/${requiredScope(scopeId, collectionName)}/reports`;
  if (collectionName === "tournaments") return "tournaments";
  if (collectionName === "marketplaceDrafts") return "marketplaceDrafts";
  return collectionName;
}

export function createSyncEnvelope<T extends SyncablePayload>(actor: SyncActor, input: {
  id: string;
  payload: T;
  athleteId?: string;
  coachId?: string;
  clubId?: string;
  status?: BackendSyncEnvelope<T>["status"];
}): BackendSyncEnvelope<T> {
  return {
    id: input.id,
    ownerId: actor.uid,
    athleteId: input.athleteId,
    coachId: input.coachId || (actor.role === "coach" ? actor.uid : undefined),
    clubId: input.clubId || actor.clubId,
    status: input.status || "draft",
    payload: input.payload,
  };
}

export async function syncBackendDocument<T extends SyncablePayload>(
  actor: SyncActor,
  collectionName: BackendSyncCollection,
  envelope: BackendSyncEnvelope<T>,
): Promise<BackendSyncResult> {
  try {
    assertCanWrite(actor, collectionName, envelope);
    const path = backendCollectionPath(collectionName, envelope.clubId);
    await setDoc(doc(db, path, envelope.id), {
      ...envelope,
      updatedAt: serverTimestamp(),
      createdAt: envelope.createdAt || serverTimestamp(),
    }, { merge: true });
    return { status: "synced", collection: collectionName, id: envelope.id };
  } catch (error) {
    const code = normalizeErrorCode(error);
    if (code === "PERMISSION_DENIED") return { status: "permission_denied", collection: collectionName, id: envelope.id, errorCode: code };
    queueOfflineFallback(collectionName, envelope);
    return { status: "offline_fallback", collection: collectionName, id: envelope.id, fallbackKey: FALLBACK_KEY, errorCode: code };
  }
}

export async function listBackendDocuments<T extends SyncablePayload>(
  actor: SyncActor,
  collectionName: BackendSyncCollection,
  scopeId?: string,
): Promise<Array<BackendSyncEnvelope<T>>> {
  const path = backendCollectionPath(collectionName, scopeId || actor.clubId);
  const constraints = actor.role === "super_admin"
    ? [limit(50)]
    : collectionName === "clubSnapshots" || collectionName === "clubReports"
      ? [limit(50)]
      : [where("ownerId", "==", actor.uid), limit(50)];
  const snapshot = await getDocs(query(collection(db, path), ...constraints));
  return snapshot.docs.map((item) => item.data() as BackendSyncEnvelope<T>);
}

export function readQueuedBackendSync(): Array<{ collection: BackendSyncCollection; envelope: BackendSyncEnvelope<SyncablePayload> }> {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(FALLBACK_KEY) || "[]");
  } catch {
    return [];
  }
}

export function clearQueuedBackendSync() {
  if (typeof window !== "undefined") window.localStorage.removeItem(FALLBACK_KEY);
}

export function assertCanWrite<T extends SyncablePayload>(actor: SyncActor, collectionName: BackendSyncCollection, envelope: BackendSyncEnvelope<T>) {
  if (!actor.uid) throw new Error("PERMISSION_DENIED");
  if (actor.role === "super_admin") return;
  if ((collectionName === "clubSnapshots" || collectionName === "clubReports" || collectionName === "tournaments") && actor.role === "club_admin" && actor.clubId && actor.clubId === envelope.clubId) return;
  if ((collectionName === "coachComments" || collectionName === "coachDrawings" || collectionName === "trainingPlans" || collectionName === "aiCoachPlans") && actor.role === "coach" && envelope.coachId === actor.uid) return;
  if ((collectionName === "aiCoachPlans" || collectionName === "scoutingReports" || collectionName === "eliteReports" || collectionName === "matchReports") && envelope.ownerId === actor.uid) return;
  if (collectionName === "marketplaceDrafts" && (actor.role === "coach" || actor.role === "club_admin")) return;
  throw new Error("PERMISSION_DENIED");
}

export function makeCoachPlanEnvelope(actor: SyncActor, plan: TrainingPlan) {
  return createSyncEnvelope(actor, { id: plan.id, payload: plan, athleteId: plan.athleteIds[0], coachId: plan.coachId, status: plan.status === "draft" ? "draft" : "pending_validation" });
}

export function makeAICoachPlanEnvelope(actor: SyncActor, recommendation: AICoachRecommendationV4, plan?: GeneratedTrainingPlan) {
  return createSyncEnvelope(actor, {
    id: plan ? `ai-plan-${recommendation.id}` : recommendation.id,
    payload: plan || recommendation,
    athleteId: recommendation.athleteId,
    status: recommendation.status === "ready" ? "pending_validation" : "draft",
  });
}

export function makeScoutingReportEnvelope(actor: SyncActor, report: ScoutingReport | EliteAnalyticsReport) {
  const athleteId = "scouting" in report ? report.scouting.athleteName : report.athleteName;
  return createSyncEnvelope(actor, {
    id: `scouting-${slugify(athleteId)}-${Date.now()}`,
    payload: report,
    athleteId,
    status: "pending_validation",
  });
}

export function makeMatchReportEnvelope(actor: SyncActor, dashboard: MatchIntelligenceDashboard) {
  return createSyncEnvelope(actor, {
    id: dashboard.setup.matchId,
    payload: dashboard,
    clubId: actor.clubId,
    status: dashboard.validationQueue.length ? "pending_validation" : "validated",
  });
}

export function makeClubSnapshotEnvelope(actor: SyncActor, snapshot: ClubDashboardSnapshot) {
  return createSyncEnvelope(actor, { id: `${snapshot.clubId}-latest`, payload: snapshot, clubId: snapshot.clubId, status: "validated" });
}

export function makeClubReportEnvelope(actor: SyncActor, report: ClubReport) {
  return createSyncEnvelope(actor, { id: report.id, payload: report, clubId: report.clubId, status: report.status === "draft" ? "draft" : "validated" });
}

export function makeTournamentEnvelope(actor: SyncActor, tournament: TournamentSnapshot) {
  return createSyncEnvelope(actor, { id: tournament.id, payload: tournament, clubId: actor.clubId, status: "draft" });
}

export function makeMarketplaceDraftEnvelope(actor: SyncActor, item: MarketplaceItem) {
  return createSyncEnvelope(actor, { id: item.id, payload: item, clubId: actor.clubId, status: item.status === "active" ? "published" : "draft" });
}

function queueOfflineFallback<T extends SyncablePayload>(collectionName: BackendSyncCollection, envelope: BackendSyncEnvelope<T>) {
  if (typeof window === "undefined") return;
  const next = [...readQueuedBackendSync(), { collection: collectionName, envelope }].slice(-100);
  window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(next));
}

function requiredScope(scopeId: string | undefined, collectionName: BackendSyncCollection) {
  if (!scopeId) throw new Error(`Missing scope for ${collectionName}`);
  return scopeId;
}

function normalizeErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("PERMISSION_DENIED")) return "PERMISSION_DENIED";
  return message || "SYNC_FAILED";
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "athlete";
}
