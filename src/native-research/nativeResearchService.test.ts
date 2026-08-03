import { describe, expect, it } from "vitest";
import { buildNativeResearchDashboard, canPromoteResearchModule, evaluateNativeTarget } from "@/src/native-research/nativeResearchService";
import type { NativeTarget, ResearchModule } from "@/src/native-research/types";

describe("nativeResearchService", () => {
  it("keeps mobile and desktop wrappers behind configuration", () => {
    const dashboard = buildNativeResearchDashboard();
    const mobile = dashboard.nativeTargets.find((target) => target.id === "mobile-capacitor");
    const desktop = dashboard.nativeTargets.find((target) => target.id === "desktop-tauri");

    expect(mobile?.status).toBe("requires_configuration");
    expect(desktop?.status).toBe("requires_configuration");
    expect(dashboard.limitations.join(" ")).toContain("No fake wearable telemetry");
  });

  it("does not promote research modules while evidence is missing", () => {
    const module: ResearchModule = {
      id: "markerless",
      title: "Markerless 3D pose",
      status: "experimental",
      category: "vision",
      description: "test",
      requiredEvidence: ["validated dataset"],
      limitations: [],
    };

    expect(canPromoteResearchModule(module)).toBe(false);
  });

  it("evaluates native target readiness from required config", () => {
    const target: NativeTarget = {
      id: "pwa",
      name: "PWA",
      platform: "pwa",
      preferredStack: "React",
      status: "preview",
      capabilities: [],
      requiredConfig: [],
      limitations: [],
    };

    expect(evaluateNativeTarget(target)).toBe("preview");
    expect(evaluateNativeTarget({ ...target, requiredConfig: ["SIGNING"] })).toBe("requires_configuration");
  });
});
