import type { ModelManager as ModelManagerContract, ModelStatus, VisionModelAdapter } from "@/src/ai/types";
import { ModelRegistry } from "@/src/ai/core/ModelRegistry";
import { CURRENT_MODEL_CACHE_PREFIX, LEGACY_MODEL_CACHE_PREFIXES } from "@/src/shared/brand";

export class CentralModelManager implements ModelManagerContract {
  private readonly adapters = new Map<string, VisionModelAdapter<unknown, unknown>>();
  private readonly loading = new Map<string, Promise<void>>();
  private readonly statuses = new Map<string, ModelStatus>();

  constructor(private readonly registry: ModelRegistry, private readonly timeoutMs = 30_000) {}

  async load(modelId: string): Promise<void> {
    if (this.getStatus(modelId).state === "ready") return;
    const inFlight = this.loading.get(modelId);
    if (inFlight) return inFlight;
    const registered = this.registry.get(modelId);
    if (!registered) throw new Error(`Modèle inconnu : ${modelId}`);
    if (registered.metadata.status === "disabled" || registered.metadata.status === "deprecated") {
      this.statuses.set(modelId, { id: modelId, state: "disabled", version: registered.metadata.version });
      throw new Error(`Modèle désactivé : ${modelId}`);
    }

    const adapter = registered.createAdapter();
    this.adapters.set(modelId, adapter);
    this.statuses.set(modelId, { id: modelId, state: "loading", version: adapter.version });
    const promise = withTimeout(adapter.load(), this.timeoutMs, `Délai de chargement dépassé : ${modelId}`)
      .then(() => {
        if (!adapter.isAvailable()) throw new Error(`Modèle indisponible après chargement : ${modelId}`);
        this.statuses.set(modelId, { id: modelId, state: "ready", version: adapter.version, loadedAt: Date.now() });
      })
      .catch(async (error) => {
        this.statuses.set(modelId, { id: modelId, state: "error", version: adapter.version, error: error instanceof Error ? error.message : String(error) });
        await adapter.dispose().catch(() => undefined);
        this.adapters.delete(modelId);
        throw error;
      })
      .finally(() => this.loading.delete(modelId));
    this.loading.set(modelId, promise);
    return promise;
  }

  async unload(modelId: string): Promise<void> {
    const adapter = this.adapters.get(modelId);
    if (adapter) await adapter.dispose();
    this.adapters.delete(modelId);
    this.statuses.set(modelId, { id: modelId, state: "idle" });
  }

  async preloadCriticalModels(): Promise<void> {
    await Promise.all(this.registry.listCritical().map((model) => this.load(model.metadata.id)));
  }

  getStatus(modelId: string): ModelStatus {
    return this.statuses.get(modelId) || { id: modelId, state: "idle" };
  }

  getAdapter<Input, Output>(modelId: string): VisionModelAdapter<Input, Output> | null {
    return (this.adapters.get(modelId) as VisionModelAdapter<Input, Output> | undefined) || null;
  }

  async clearModelCache(modelId?: string): Promise<void> {
    if (modelId) return this.unload(modelId);
    await Promise.all([...this.adapters.keys()].map((id) => this.unload(id)));
    if (typeof caches !== "undefined") {
      const names = await caches.keys();
      const prefixes = [CURRENT_MODEL_CACHE_PREFIX, ...LEGACY_MODEL_CACHE_PREFIXES];
      await Promise.all(names.filter((name) => prefixes.some((prefix) => name.startsWith(prefix))).map((name) => caches.delete(name)));
    }
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(resolve, reject).finally(() => globalThis.clearTimeout(timeout));
  });
}
