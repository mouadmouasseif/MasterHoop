import type { BallDetection, VisionModelAdapter } from "@/src/ai/types";
import { HybridBasketballObjectDetector } from "@/src/services/basketballObjectDetector";

export interface BallModelInput {
  source: HTMLVideoElement | HTMLCanvasElement;
  frameIndex: number;
  timestampMs: number;
}

export class HybridBallModelAdapter implements VisionModelAdapter<BallModelInput, BallDetection[]> {
  readonly id = "hybrid-ball-detector";
  readonly version = "2.0.0";
  private detector: HybridBasketballObjectDetector | null = null;

  async load(): Promise<void> {
    this.detector = new HybridBasketballObjectDetector();
    await this.detector.initialize();
  }

  isAvailable(): boolean { return this.detector?.isAvailable() === true; }

  async predict(input: BallModelInput): Promise<BallDetection[]> {
    if (!this.detector) throw new Error("Le détecteur de ballon n’est pas chargé.");
    const objects = await this.detector.detect(input.source);
    return objects.map((object) => ({
      frameIndex: input.frameIndex,
      timestampMs: input.timestampMs,
      bbox: { x: object.bbox[0], y: object.bbox[1], width: object.bbox[2], height: object.bbox[3] },
      center: { x: object.bbox[0] + object.bbox[2] / 2, y: object.bbox[1] + object.bbox[3] / 2 },
      confidence: object.score,
      detector: object.source === "BasketMotion-Ai-model" ? "BasketMotion-Ai" : "coco_ssd",
    }));
  }

  async dispose(): Promise<void> {
    await this.detector?.dispose();
    this.detector = null;
  }
}
