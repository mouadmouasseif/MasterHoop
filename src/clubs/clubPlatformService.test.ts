import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildClubCsv,
  buildClubJson,
  buildClubMetrics,
  buildDefaultClubSnapshot,
  createClubReport,
  filterClubPlayers,
  getClubDashboardSnapshot,
  saveClubDashboardSnapshot,
} from "@/src/clubs/clubPlatformService";

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  Object.defineProperty(globalThis, "window", { value: {}, configurable: true });
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    },
    configurable: true,
  });
  vi.useRealTimers();
});

describe("clubPlatformService", () => {
  it("builds club dashboard metrics from active players and coaches", () => {
    const snapshot = buildDefaultClubSnapshot("club-a");
    const metrics = buildClubMetrics(snapshot);

    expect(metrics.players).toBe(4);
    expect(metrics.coaches).toBe(2);
    expect(metrics.teams).toBe(2);
    expect(metrics.averagePerformance).toBe(79);
    expect(metrics.attendance).toBe(87);
  });

  it("filters players by name, position, level, or status", () => {
    const snapshot = buildDefaultClubSnapshot("club-a");

    expect(filterClubPlayers(snapshot.players, "guard")).toHaveLength(1);
    expect(filterClubPlayers(snapshot.players, "elite")).toHaveLength(2);
    expect(filterClubPlayers(snapshot.players, "")).toHaveLength(snapshot.players.length);
  });

  it("persists a generated club report", () => {
    const snapshot = buildDefaultClubSnapshot("club-a");
    saveClubDashboardSnapshot(snapshot);

    const next = createClubReport(snapshot, "season");

    expect(next.reports[0].type).toBe("season");
    expect(getClubDashboardSnapshot("club-a").reports[0].type).toBe("season");
  });

  it("exports CSV and JSON payloads", () => {
    const snapshot = buildDefaultClubSnapshot("club-a");
    const csv = buildClubCsv(snapshot);
    const json = JSON.parse(buildClubJson(snapshot));

    expect(csv).toContain("\"player\"");
    expect(csv).toContain("\"coach\"");
    expect(json.clubId).toBe("club-a");
    expect(json.metrics.players).toBe(4);
  });
});
