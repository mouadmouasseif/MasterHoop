import { HybridBallModelAdapter } from "@/src/ai/adapters/HybridBallModelAdapter";
import { ModelRegistry } from "@/src/ai/core/ModelRegistry";
import { CentralModelManager } from "@/src/ai/core/ModelManager";

export function createDefaultModelRegistry(): ModelRegistry {
  const registry = new ModelRegistry();
  registry.register({
    metadata: {
      id: "hybrid-ball-detector",
      name: "BasketMotion-Ai Hybrid Ball Detector",
      task: "basketball-detection",
      version: "2.0.0",
      format: "tfjs",
      url: import.meta.env.VITE_BALL_MODEL_URL?.trim() || undefined,
      status: "active",
      createdAt: "2026-07-30",
    },
    critical: false,
    createAdapter: () => new HybridBallModelAdapter(),
  });
  return registry;
}

export const modelRegistry = createDefaultModelRegistry();
export const modelManager = new CentralModelManager(modelRegistry);
