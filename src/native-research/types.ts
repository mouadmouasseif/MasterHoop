export type NativeResearchStatus = "preview" | "experimental" | "requires_configuration" | "blocked";

export interface NativeTarget {
  id: string;
  name: string;
  platform: "pwa" | "mobile" | "desktop" | "wearable";
  preferredStack: string;
  status: NativeResearchStatus;
  capabilities: string[];
  requiredConfig: string[];
  limitations: string[];
}

export interface ResearchModule {
  id: string;
  title: string;
  status: NativeResearchStatus;
  category: "vision" | "explainability" | "privacy" | "learning" | "validation";
  description: string;
  requiredEvidence: string[];
  limitations: string[];
}

export interface DeviceBenchmarkPlan {
  id: string;
  name: string;
  metrics: string[];
  status: NativeResearchStatus;
  limitations: string[];
}

export interface NativeResearchDashboard {
  nativeTargets: NativeTarget[];
  researchModules: ResearchModule[];
  benchmarkPlan: DeviceBenchmarkPlan;
  readiness: {
    preview: number;
    experimental: number;
    requiresConfiguration: number;
    blocked: number;
  };
  limitations: string[];
}
