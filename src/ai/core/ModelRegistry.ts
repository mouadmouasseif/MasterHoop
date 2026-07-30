import type { ModelRegistryEntry, VisionModelAdapter } from "@/src/ai/types";

export interface RegisteredModel<Input = unknown, Output = unknown> {
  metadata: ModelRegistryEntry;
  critical?: boolean;
  createAdapter(): VisionModelAdapter<Input, Output>;
}

export class ModelRegistry {
  private readonly models = new Map<string, RegisteredModel<any, any>>();

  register<Input, Output>(model: RegisteredModel<Input, Output>): void {
    if (this.models.has(model.metadata.id)) throw new Error(`Modèle déjà enregistré : ${model.metadata.id}`);
    this.models.set(model.metadata.id, model);
  }

  get(modelId: string): RegisteredModel | undefined { return this.models.get(modelId); }
  list(): RegisteredModel[] { return [...this.models.values()]; }
  listCritical(): RegisteredModel[] { return this.list().filter((model) => model.critical && model.metadata.status === "active"); }
}
