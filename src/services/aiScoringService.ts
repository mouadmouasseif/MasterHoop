import type { PoseMetrics } from '@/src/lib/poseDetection';
export function calculateSessionAccuracy(metrics: PoseMetrics) { return metrics.elbowAngle ? Math.min(100, metrics.elbowAngle) : 72; }
