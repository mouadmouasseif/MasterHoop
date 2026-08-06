import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertCanWrite,
  backendCollectionPath,
  clearQueuedBackendSync,
  createSyncEnvelope,
  makeClubSnapshotEnvelope,
  makeCoachPlanEnvelope,
  readQueuedBackendSync,
  syncBackendDocument,
} from "@/src/backend-sync/backendSyncService";
import type { SyncActor } from "@/src/backend-sync/types";
import type { TrainingPlan } from "@/src/coaches/types";
import type { ClubDashboardSnapshot } from "@/src/clubs/types";

const setDocMock = vi.fn();

vi.mock("@/src/lib/firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, path) => ({ path })),
  doc: vi.fn((_db, path, id) => ({ path, id })),
  getDocs: vi.fn(),
  limit: vi.fn((value) => ({ type: "limit", value })),
  query: vi.fn((ref, ...constraints) => ({ ref, constraints })),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  where: vi.fn((field, op, value) => ({ field, op, value })),
}));

describe("backendSyncService", () => {
  beforeEach(() => {
    setDocMock.mockReset();
    const store = new Map<string, string>();
    const localStorageMock = {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => { store.set(key, value); }),
      removeItem: vi.fn((key: string) => { store.delete(key); }),
      clear: vi.fn(() => { store.clear(); }),
    };
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("window", { localStorage: localStorageMock });
  });

  it("builds scoped collection paths", () => {
    expect(backendCollectionPath("clubSnapshots", "club-a")).toBe("clubs/club-a/snapshots");
    expect(backendCollectionPath("trainingPlans")).toBe("trainingPlans");
  });

  it("allows coaches to sync their training plans", async () => {
    setDocMock.mockResolvedValue(undefined);
    const actor: SyncActor = { uid: "coach-1", role: "coach", clubId: "club-a" };
    const envelope = makeCoachPlanEnvelope(actor, plan({ coachId: "coach-1" }));
    const result = await syncBackendDocument(actor, "trainingPlans", envelope);

    expect(result.status).toBe("synced");
    expect(setDocMock).toHaveBeenCalledOnce();
  });

  it("rejects coach writes for another coach ownership", () => {
    const actor: SyncActor = { uid: "coach-1", role: "coach", clubId: "club-a" };
    const envelope = makeCoachPlanEnvelope(actor, plan({ coachId: "coach-2" }));

    expect(() => assertCanWrite(actor, "trainingPlans", envelope)).toThrow("PERMISSION_DENIED");
  });

  it("queues an offline fallback when Firestore fails", async () => {
    setDocMock.mockRejectedValue(new Error("unavailable"));
    const actor: SyncActor = { uid: "club-admin", role: "club_admin", clubId: "club-a" };
    const envelope = makeClubSnapshotEnvelope(actor, clubSnapshot());
    const result = await syncBackendDocument(actor, "clubSnapshots", envelope);

    expect(result.status).toBe("offline_fallback");
    expect(readQueuedBackendSync()).toHaveLength(1);
    clearQueuedBackendSync();
    expect(readQueuedBackendSync()).toHaveLength(0);
  });

  it("creates generic envelopes with stable owner and status", () => {
    const envelope = createSyncEnvelope({ uid: "athlete-1", role: "athlete" }, { id: "doc-1", payload: plan({ coachId: "coach-1" }) });

    expect(envelope.ownerId).toBe("athlete-1");
    expect(envelope.status).toBe("draft");
  });
});

function plan(overrides: Partial<TrainingPlan> = {}): TrainingPlan {
  return {
    id: "plan-1",
    coachId: overrides.coachId || "coach-1",
    title: "Week plan",
    weekStart: "2026-08-03",
    athleteIds: ["athlete-1"],
    days: [{ day: "Monday", drillIds: ["release"] }],
    status: "draft",
  };
}

function clubSnapshot(): ClubDashboardSnapshot {
  return { clubId: "club-a", players: [], coaches: [], teams: [], matches: [], reports: [] };
}
