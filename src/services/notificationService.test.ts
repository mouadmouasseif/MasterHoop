import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/firebase", () => ({ db: {} }));

import { createNotificationPayload } from "@/src/services/notificationService";

describe("notificationService", () => {
  it("creates unread user-scoped notification payloads", () => {
    const payload = createNotificationPayload("u1", "Titre", "Message", { matchId: "m1" });

    expect(payload.userId).toBe("u1");
    expect(payload.read).toBe(false);
    expect(payload.matchId).toBe("m1");
  });
});
