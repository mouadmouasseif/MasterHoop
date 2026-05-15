import { useState } from 'react';
import type { PoseMetrics } from '@/src/lib/poseDetection';
export function usePoseDetection() { const [liveMetrics, setLiveMetrics] = useState<PoseMetrics | null>(null); return { liveMetrics, setLiveMetrics }; }
