import type {
  DeviceBenchmarkPlan,
  NativeResearchDashboard,
  NativeResearchStatus,
  NativeTarget,
  ResearchModule,
} from "@/src/native-research/types";

export function buildNativeResearchDashboard(): NativeResearchDashboard {
  const nativeTargets = seedNativeTargets();
  const researchModules = seedResearchModules();
  const statuses = [...nativeTargets, ...researchModules].map((item) => item.status);
  return {
    nativeTargets,
    researchModules,
    benchmarkPlan: buildDeviceBenchmarkPlan(),
    readiness: {
      preview: countStatus(statuses, "preview"),
      experimental: countStatus(statuses, "experimental"),
      requiresConfiguration: countStatus(statuses, "requires_configuration"),
      blocked: countStatus(statuses, "blocked"),
    },
    limitations: [
      "Native wrappers reuse the current web AI services; no duplicated AI engine is planned.",
      "Research features remain preview or experimental until validated datasets and review workflows exist.",
      "No fake wearable telemetry, 3D reconstruction, federated learning, or production native bridge is simulated.",
    ],
  };
}

export function evaluateNativeTarget(target: NativeTarget): NativeResearchStatus {
  if (target.requiredConfig.length > 0) return "requires_configuration";
  return target.status;
}

export function canPromoteResearchModule(module: ResearchModule): boolean {
  return module.status === "experimental" && module.requiredEvidence.length === 0;
}

function seedNativeTargets(): NativeTarget[] {
  return [
    {
      id: "pwa",
      name: "PWA install",
      platform: "pwa",
      preferredStack: "React + Vite PWA",
      status: "preview",
      capabilities: ["Installable app shell", "Camera workflow", "Offline-ready asset cache"],
      requiredConfig: [],
      limitations: ["Push notifications and deep native APIs still require additional platform setup."],
    },
    {
      id: "mobile-capacitor",
      name: "Mobile wrapper",
      platform: "mobile",
      preferredStack: "Capacitor",
      status: "requires_configuration",
      capabilities: ["Camera permissions", "Native notifications", "Offline sync bridge"],
      requiredConfig: ["CAPACITOR_PROJECT", "MOBILE_SIGNING_CONFIG", "NATIVE_CAMERA_TEST_MATRIX"],
      limitations: ["No native package is generated until signing, permissions, and device tests are configured."],
    },
    {
      id: "desktop-tauri",
      name: "Desktop workstation",
      platform: "desktop",
      preferredStack: "Tauri",
      status: "requires_configuration",
      capabilities: ["Local video files", "Large-screen review", "Export workflows"],
      requiredConfig: ["TAURI_PROJECT", "DESKTOP_SIGNING_CONFIG"],
      limitations: ["Desktop packaging is not active until a Tauri project and signing pipeline are configured."],
    },
    {
      id: "wearable-bridge",
      name: "Wearable bridge",
      platform: "wearable",
      preferredStack: "Provider OAuth + native health bridges",
      status: "requires_configuration",
      capabilities: ["Provider readiness", "Consent boundary", "Telemetry import contract"],
      requiredConfig: ["WEARABLE_PROVIDER_KEYS", "USER_CONSENT_FLOW"],
      limitations: ["No heart rate, workload, sleep, or sensor data is generated without a real provider."],
    },
  ];
}

function seedResearchModules(): ResearchModule[] {
  return [
    {
      id: "multi-camera-3d",
      title: "Multi-camera 3D reconstruction",
      status: "experimental",
      category: "vision",
      description: "Research preview for synchronized multi-view reconstruction.",
      requiredEvidence: ["Synchronized camera calibration", "Validated 3D reference dataset", "Error bounds"],
      limitations: ["Current app remains 2D; no 3D joint depth is claimed."],
    },
    {
      id: "markerless-3d-pose",
      title: "Markerless 3D pose estimation",
      status: "experimental",
      category: "vision",
      description: "Future 3D pose model track for biomechanics research.",
      requiredEvidence: ["Validated model", "Device benchmarks", "Clinical wording review"],
      limitations: ["No medical diagnosis, force, center of mass, or injury prediction is produced."],
    },
    {
      id: "explainable-ai",
      title: "Explainable AI",
      status: "preview",
      category: "explainability",
      description: "Expose evidence, confidence, and limitations for every recommendation.",
      requiredEvidence: [],
      limitations: ["Explanations must remain tied to observed metrics and confidence."],
    },
    {
      id: "coach-validation-mode",
      title: "Coach validation mode",
      status: "preview",
      category: "validation",
      description: "Review queue for AI suggestions before reports become official.",
      requiredEvidence: [],
      limitations: ["Automatic publication remains disabled."],
    },
    {
      id: "anonymized-analytics",
      title: "Anonymized analytics",
      status: "requires_configuration",
      category: "privacy",
      description: "Aggregate team and research analytics without direct identifiers.",
      requiredEvidence: ["Privacy policy approval", "Aggregation thresholds", "Backend anonymization service"],
      limitations: ["No research export is active without privacy and backend controls."],
    },
    {
      id: "federated-learning",
      title: "Federated learning",
      status: "blocked",
      category: "learning",
      description: "Architecture-only track for decentralized learning.",
      requiredEvidence: ["Federated runtime", "Secure aggregation", "Model governance", "Opt-in consent"],
      limitations: ["No federated training is implemented or simulated."],
    },
  ];
}

function buildDeviceBenchmarkPlan(): DeviceBenchmarkPlan {
  return {
    id: "device-benchmark-plan",
    name: "Native and mobile performance benchmark",
    metrics: ["FPS after warmup", "Inference time", "Memory when available", "Model load time", "Battery/thermal notes from real devices", "Crash and abandonment rate"],
    status: "preview",
    limitations: ["Benchmark values must be measured on real devices; no device performance numbers are invented."],
  };
}

function countStatus(statuses: NativeResearchStatus[], status: NativeResearchStatus) {
  return statuses.filter((item) => item === status).length;
}
