import type { DOMRectLike, Point2D } from "@/src/types/courtVision";

export type PlayerDetectionInput = {
  keypoints?: Array<{ x: number; y: number; score?: number }>;
  width: number;
  height: number;
};

export function detectPlayer(input: PlayerDetectionInput) {
  const confident = (input.keypoints || []).filter((point) => (point.score ?? 1) >= 0.3);
  if (!confident.length) {
    return { detected: false, confidence: 0 };
  }

  const xs = confident.map((point) => point.x);
  const ys = confident.map((point) => point.y);
  const bounds: DOMRectLike = {
    x: Math.max(0, Math.min(...xs)),
    y: Math.max(0, Math.min(...ys)),
    width: Math.min(input.width, Math.max(...xs) - Math.min(...xs)),
    height: Math.min(input.height, Math.max(...ys) - Math.min(...ys)),
  };
  const center: Point2D = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const confidence = Math.min(0.98, confident.length / Math.max(1, input.keypoints?.length || confident.length));

  return { detected: true, confidence, center, bounds };
}
