import type { Point2D, PoseFrameObservation, PoseKeypointObservation } from "@/src/ai/types";

export const keypoint = (
  frame: PoseFrameObservation,
  name: string,
  minimumConfidence = 0.35,
): PoseKeypointObservation | undefined =>
  frame.keypoints.find((point) => point.name === name && point.confidence >= minimumConfidence);

export function midpoint(left: Point2D, right: Point2D): Point2D {
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
}

export function angleDegrees(a: Point2D, vertex: Point2D, c: Point2D): number {
  const radians = Math.atan2(c.y - vertex.y, c.x - vertex.x) -
    Math.atan2(a.y - vertex.y, a.x - vertex.x);
  const raw = Math.abs((radians * 180) / Math.PI);
  return raw > 180 ? 360 - raw : raw;
}

export function averageConfidence(points: Array<PoseKeypointObservation | undefined>): number {
  const observed = points.filter((point): point is PoseKeypointObservation => Boolean(point));
  return observed.length
    ? observed.reduce((sum, point) => sum + point.confidence, 0) / observed.length
    : 0;
}

export function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
