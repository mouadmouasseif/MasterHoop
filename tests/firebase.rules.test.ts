import { readFileSync } from "node:fs";
import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";

let environment: RulesTestEnvironment;

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: "BasketMotion-Ai-rules-test",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
    storage: { rules: readFileSync("storage.rules", "utf8") },
  });
}, 60_000);

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.clearStorage();
  await environment.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore();
    await Promise.all([
      setDoc(doc(database, "users", "athlete-a"), { userId: "athlete-a", role: "athlete", accountStatus: "active", clubId: "club-a" }),
      setDoc(doc(database, "users", "athlete-b"), { userId: "athlete-b", role: "athlete", accountStatus: "active", clubId: "club-b" }),
      setDoc(doc(database, "coachAthleteLinks", "coach-a_athlete-a"), { coachId: "coach-a", athleteId: "athlete-a", clubId: "club-a", status: "active" }),
      setDoc(doc(database, "analyses", "analysis-a"), { ownerId: "athlete-a", athleteId: "athlete-a", clubId: "club-a", status: "completed" }),
      setDoc(doc(database, "analyses", "analysis-b"), { ownerId: "athlete-b", athleteId: "athlete-b", clubId: "club-b", status: "completed" }),
      setDoc(doc(database, "invitations", "expired"), { senderId: "coach-a", recipientId: "athlete-a", coachId: "coach-a", status: "pending", expiresAt: Timestamp.fromMillis(Date.now() - 60_000) }),
    ]);
  });
}, 60_000);

afterAll(async () => environment?.cleanup(), 30_000);

describe("Firestore role isolation", () => {
  it("allows an athlete to read their own analysis only", async () => {
    const database = environment.authenticatedContext("athlete-a").firestore();
    await assertSucceeds(getDoc(doc(database, "analyses", "analysis-a")));
    await assertFails(getDoc(doc(database, "analyses", "analysis-b")));
  });

  it("allows only an assigned coach", async () => {
    const assigned = environment.authenticatedContext("coach-a", { role: "coach", accountStatus: "active" }).firestore();
    const unassigned = environment.authenticatedContext("coach-b", { role: "coach", accountStatus: "active" }).firestore();
    await assertSucceeds(getDoc(doc(assigned, "analyses", "analysis-a")));
    await assertFails(getDoc(doc(unassigned, "analyses", "analysis-a")));
  });

  it("isolates club administrators", async () => {
    const clubA = environment.authenticatedContext("admin-a", { role: "club_admin", clubId: "club-a", accountStatus: "active" }).firestore();
    await assertSucceeds(getDoc(doc(clubA, "analyses", "analysis-a")));
    await assertFails(getDoc(doc(clubA, "analyses", "analysis-b")));
  });

  it("rejects a suspended account", async () => {
    const database = environment.authenticatedContext("athlete-a", { accountStatus: "suspended" }).firestore();
    await assertFails(getDoc(doc(database, "analyses", "analysis-a")));
  });

  it("prevents ownership changes", async () => {
    const database = environment.authenticatedContext("athlete-a").firestore();
    await assertFails(updateDoc(doc(database, "analyses", "analysis-a"), { ownerId: "athlete-b", athleteId: "athlete-b" }));
  });

  it("rejects acceptance of an expired invitation", async () => {
    const database = environment.authenticatedContext("athlete-a").firestore();
    await assertFails(updateDoc(doc(database, "invitations", "expired"), { status: "accepted" }));
  });

  it("allows an assigned coach to add only coach review fields", async () => {
    const assigned = environment.authenticatedContext("coach-a", { role: "coach", accountStatus: "active" }).firestore();
    await assertSucceeds(updateDoc(doc(assigned, "analyses", "analysis-a"), {
      coachComment: "Observation technique confirmée.",
      coachValidation: true,
      updatedAt: Timestamp.now(),
    }));
    await assertFails(updateDoc(doc(assigned, "analyses", "analysis-a"), { status: "failed" }));
  });
});

describe("Storage private uploads", () => {
  it("rejects an invalid MIME type", async () => {
    const storage = environment.authenticatedContext("athlete-a").storage();
    const upload = uploadBytes(
      ref(storage, "users/athlete-a/sessions/session-a/videos/source.exe"),
      new Uint8Array([1, 2, 3]),
      { contentType: "application/x-msdownload", customMetadata: { ownerId: "athlete-a" } },
    );
    await assertFails(upload);
  });

  it("accepts a private video owned by the athlete", async () => {
    const storage = environment.authenticatedContext("athlete-a").storage();
    const result = await assertSucceeds(uploadBytes(
      ref(storage, "users/athlete-a/sessions/session-a/videos/source.webm"),
      new Uint8Array([1, 2, 3]),
      { contentType: "video/webm", customMetadata: { ownerId: "athlete-a" } },
    ));
    expect(result.metadata.customMetadata?.ownerId).toBe("athlete-a");
  });

  it("rejects an upload whose owner metadata does not match the path", async () => {
    const storage = environment.authenticatedContext("athlete-a").storage();
    await assertFails(uploadBytes(
      ref(storage, "users/athlete-a/sessions/session-a/videos/source.webm"),
      new Uint8Array([1, 2, 3]),
      { contentType: "video/webm", customMetadata: { ownerId: "athlete-b" } },
    ));
  });
});
