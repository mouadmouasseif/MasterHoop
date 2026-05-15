import type { PoseMetrics } from '@/src/lib/poseDetection';

export default function PoseOverlay({ metrics }: { metrics: PoseMetrics | null }) {
  if (!metrics) return null;
  return <div className="pointer-events-none absolute inset-x-4 top-4 z-30 rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-xs text-white/70 backdrop-blur-md">{metrics.isShooting ? 'Tir detecte' : metrics.isDribbling ? 'Dribble detecte' : 'Analyse en cours'}</div>;
}
