import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs-core";
import { loadGraphModel, type GraphModel } from "@tensorflow/tfjs-converter";

export type DetectionSource = "masterhoop-model" | "coco-ssd";

export type BasketballDetectedObject = {
  bbox: [number, number, number, number];
  class: string;
  score: number;
  source: DetectionSource;
};

export type BasketballDetectorStatus = {
  source: DetectionSource;
  specializedModelConfigured: boolean;
  fallbackReason?: string;
};

export interface BasketballObjectDetector {
  initialize(): Promise<void>;
  detect(input: HTMLVideoElement | HTMLCanvasElement): Promise<BasketballDetectedObject[]>;
  getStatus(): BasketballDetectorStatus;
}

const MODEL_URL = import.meta.env.VITE_BALL_MODEL_URL?.trim();
const MIN_CONFIDENCE = 0.35;
const IOU_THRESHOLD = 0.45;

export class HybridBasketballObjectDetector implements BasketballObjectDetector {
  private specializedModel: GraphModel | null = null;
  private fallbackModel: cocoSsd.ObjectDetection | null = null;
  private status: BasketballDetectorStatus = {
    source: "coco-ssd",
    specializedModelConfigured: Boolean(MODEL_URL),
  };

  async initialize() {
    await tf.ready();
    if (MODEL_URL) {
      try {
        this.specializedModel = await loadGraphModel(MODEL_URL);
        this.status = { source: "masterhoop-model", specializedModelConfigured: true };
        return;
      } catch (error) {
        this.status = {
          source: "coco-ssd",
          specializedModelConfigured: true,
          fallbackReason: error instanceof Error ? error.message : "Chargement du modèle spécialisé impossible.",
        };
      }
    }
    this.fallbackModel = await cocoSsd.load();
  }

  async detect(input: HTMLVideoElement | HTMLCanvasElement) {
    if (this.specializedModel) return this.detectWithSpecializedModel(input);
    if (!this.fallbackModel) return [];
    const objects = await this.fallbackModel.detect(input);
    return objects.map((object) => ({
      bbox: object.bbox as [number, number, number, number],
      class: object.class,
      score: object.score,
      source: "coco-ssd" as const,
    }));
  }

  getStatus() {
    return this.status;
  }

  private async detectWithSpecializedModel(input: HTMLVideoElement | HTMLCanvasElement) {
    const model = this.specializedModel;
    if (!model) return [];
    const inputShape = model.inputs[0]?.shape || [];
    const height = positiveDimension(inputShape[1], 640);
    const width = positiveDimension(inputShape[2], 640);
    const sourceWidth = input instanceof HTMLVideoElement ? input.videoWidth : input.width;
    const sourceHeight = input instanceof HTMLVideoElement ? input.videoHeight : input.height;

    const tensor = tf.tidy(() => {
      const resized = tf.image.resizeBilinear(tf.browser.fromPixels(input), [height, width]);
      return tf.expandDims(tf.div(tf.cast(resized, "float32"), 255), 0);
    });

    try {
      const rawOutput = await model.executeAsync(tensor);
      const outputs = Array.isArray(rawOutput) ? rawOutput : [rawOutput];
      try {
        const candidates = await parseModelOutput(outputs[0], width, height, sourceWidth, sourceHeight);
        return nonMaximumSuppression(candidates, IOU_THRESHOLD).slice(0, 5);
      } finally {
        outputs.forEach((output) => output.dispose());
      }
    } finally {
      tensor.dispose();
    }
  }
}

function positiveDimension(value: number | null | undefined, fallback: number) {
  return typeof value === "number" && value > 0 ? value : fallback;
}

async function parseModelOutput(
  output: tf.Tensor,
  modelWidth: number,
  modelHeight: number,
  sourceWidth: number,
  sourceHeight: number,
): Promise<BasketballDetectedObject[]> {
  const shape = output.shape;
  const data = await output.data();
  return decodeBasketballPredictions(data, shape, modelWidth, modelHeight, sourceWidth, sourceHeight);
}

export function decodeBasketballPredictions(
  data: ArrayLike<number>,
  shape: number[],
  modelWidth: number,
  modelHeight: number,
  sourceWidth: number,
  sourceHeight: number,
): BasketballDetectedObject[] {
  if (shape.length !== 3 || shape[0] !== 1) return [];

  const rowsFirst = shape[1] >= 5 && shape[1] <= 256 && shape[2] > shape[1];
  const featureCount = rowsFirst ? shape[1] : shape[2];
  const detectionCount = rowsFirst ? shape[2] : shape[1];
  if (featureCount < 5) return [];

  const valueAt = (detection: number, feature: number) =>
    Number(rowsFirst ? data[feature * detectionCount + detection] : data[detection * featureCount + feature]);
  const detections: BasketballDetectedObject[] = [];

  for (let index = 0; index < detectionCount; index += 1) {
    const values = Array.from({ length: featureCount }, (_, feature) => valueAt(index, feature));
    const isCornerFormat = featureCount === 6 && values[2] > values[0] && values[3] > values[1];
    const score = isCornerFormat
      ? values[4]
      : featureCount === 5
        ? values[4]
        : Math.max(...values.slice(4));
    const classId = isCornerFormat ? Math.round(values[5]) : Math.max(0, values.slice(4).indexOf(score));
    if (!Number.isFinite(score) || score < MIN_CONFIDENCE || classId !== 0) continue;

    let x1: number;
    let y1: number;
    let x2: number;
    let y2: number;
    if (isCornerFormat) {
      [x1, y1, x2, y2] = values;
    } else {
      const [centerX, centerY, boxWidth, boxHeight] = values;
      x1 = centerX - boxWidth / 2;
      y1 = centerY - boxHeight / 2;
      x2 = centerX + boxWidth / 2;
      y2 = centerY + boxHeight / 2;
    }

    const normalized = Math.max(Math.abs(x1), Math.abs(y1), Math.abs(x2), Math.abs(y2)) <= 2;
    if (normalized) {
      x1 *= modelWidth;
      x2 *= modelWidth;
      y1 *= modelHeight;
      y2 *= modelHeight;
    }
    const scaleX = sourceWidth / modelWidth;
    const scaleY = sourceHeight / modelHeight;
    const boxX = clamp(x1 * scaleX, 0, sourceWidth);
    const boxY = clamp(y1 * scaleY, 0, sourceHeight);
    const boxWidth = clamp((x2 - x1) * scaleX, 0, sourceWidth - boxX);
    const boxHeight = clamp((y2 - y1) * scaleY, 0, sourceHeight - boxY);
    if (boxWidth < 2 || boxHeight < 2) continue;

    detections.push({
      bbox: [boxX, boxY, boxWidth, boxHeight],
      class: "sports ball",
      score,
      source: "masterhoop-model",
    });
  }
  return detections;
}

export function nonMaximumSuppression(detections: BasketballDetectedObject[], threshold: number) {
  const sorted = [...detections].sort((left, right) => right.score - left.score);
  const selected: BasketballDetectedObject[] = [];
  for (const candidate of sorted) {
    if (selected.every((current) => intersectionOverUnion(candidate.bbox, current.bbox) < threshold)) {
      selected.push(candidate);
    }
  }
  return selected;
}

function intersectionOverUnion(
  left: BasketballDetectedObject["bbox"],
  right: BasketballDetectedObject["bbox"],
) {
  const x1 = Math.max(left[0], right[0]);
  const y1 = Math.max(left[1], right[1]);
  const x2 = Math.min(left[0] + left[2], right[0] + right[2]);
  const y2 = Math.min(left[1] + left[3], right[1] + right[3]);
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = left[2] * left[3] + right[2] * right[3] - intersection;
  return union > 0 ? intersection / union : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
