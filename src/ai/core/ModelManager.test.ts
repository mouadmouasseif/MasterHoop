import { describe, expect, it, vi } from "vitest";
import { ModelRegistry } from "@/src/ai/core/ModelRegistry";
import { CentralModelManager } from "@/src/ai/core/ModelManager";

describe("CentralModelManager", () => {
  it("charge une seule fois un adaptateur et le libère", async () => {
    const load = vi.fn(async () => undefined);
    const dispose = vi.fn(async () => undefined);
    const registry = new ModelRegistry();
    registry.register({
      metadata: { id: "test", name: "Test", task: "test", version: "1", format: "other", status: "active", createdAt: 0 },
      createAdapter: () => ({ id: "test", version: "1", load, dispose, isAvailable: () => true, predict: async () => true }),
    });
    const manager = new CentralModelManager(registry, 1000);
    await Promise.all([manager.load("test"), manager.load("test")]);
    expect(load).toHaveBeenCalledTimes(1);
    expect(manager.getStatus("test").state).toBe("ready");
    await manager.unload("test");
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
