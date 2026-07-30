import { describe, expect, it } from "vitest";
import { canAccessAnalysis, canAccessAthlete, canAccessClub, hasPermission } from "@/src/permissions/permissions";
import type { PermissionUser } from "@/src/permissions/types";

const user = (overrides: Partial<PermissionUser>): PermissionUser => ({
  id: "athlete-a", userId: "athlete-a", role: "athlete", athleteIds: [], accountStatus: "active", ...overrides,
});

describe("permissions", () => {
  it("autorise un athlète à lire sa propre analyse seulement", () => {
    const athlete = user({});
    expect(canAccessAnalysis(athlete, { athleteId: "athlete-a" })).toBe(true);
    expect(canAccessAnalysis(athlete, { athleteId: "athlete-b" })).toBe(false);
  });

  it("autorise uniquement le coach associé", () => {
    const coach = user({ id: "coach-a", userId: "coach-a", role: "coach", athleteIds: ["athlete-a"] });
    expect(canAccessAthlete(coach, "athlete-a")).toBe(true);
    expect(canAccessAnalysis(coach, { athleteId: "athlete-a" })).toBe(true);
    expect(canAccessAnalysis(coach, { athleteId: "athlete-b" })).toBe(false);
  });

  it("isole les administrateurs par club", () => {
    const admin = user({ id: "admin-a", userId: "admin-a", role: "club_admin", clubId: "club-a" });
    expect(canAccessClub(admin, "club-a")).toBe(true);
    expect(canAccessClub(admin, "club-b")).toBe(false);
    expect(canAccessAnalysis(admin, { athleteId: "athlete-a", clubId: "club-a" })).toBe(true);
    expect(canAccessAnalysis(admin, { athleteId: "athlete-b", clubId: "club-b" })).toBe(false);
  });

  it("refuse tout accès à un compte suspendu", () => {
    const suspended = user({ accountStatus: "suspended" });
    expect(hasPermission(suspended, "run_analysis")).toBe(false);
    expect(canAccessAnalysis(suspended, { athleteId: "athlete-a" })).toBe(false);
  });
});
