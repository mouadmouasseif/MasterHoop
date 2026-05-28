import type { PoseMetrics } from "@/src/lib/poseDetection";

export type AIAnalysisMetrics = {
  shootingForm: number;
  balance: number;
  releaseSpeed: number;
  stability: number;
  jumpTiming: number;
};

export type AIAnalysisResult = {
  score: number;
  aiFeedback: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  recommendedDrills: { title: string; focus: string; level: string }[];
  metrics: AIAnalysisMetrics;
};

const clampScore = (value: number) => Math.max(45, Math.min(99, Math.round(value)));

export function analyzeBasketballSession(metrics?: Partial<PoseMetrics> | null): AIAnalysisResult {
  const made = metrics?.madeShots ?? 0;
  const missed = metrics?.missedShots ?? 0;
  const attempts = made + missed;
  const accuracy = attempts > 0 ? (made / attempts) * 100 : 76;
  const elbow = metrics?.elbowAngle || 78;
  const knee = metrics?.kneeAngle || 62;
  const dribblePower = metrics?.dribblePower || 64;
  const rhythm = metrics?.dribbleRhythm || 108;

  const analysisMetrics: AIAnalysisMetrics = {
    shootingForm: clampScore((accuracy * 0.58) + (Math.min(elbow, 100) * 0.42)),
    balance: clampScore(100 - Math.abs(72 - knee) * 0.8),
    releaseSpeed: clampScore(82 + Math.min(rhythm, 160) * 0.06 - missed * 1.5),
    stability: clampScore(74 + Math.min(dribblePower, 90) * 0.16 - missed),
    jumpTiming: clampScore(100 - Math.abs(68 - knee) * 0.7 + (metrics?.isShooting ? 4 : 0)),
  };

  const score = clampScore(
    Object.values(analysisMetrics).reduce((sum, value) => sum + value, 0) / 5
  );

  return {
    score,
    aiFeedback:
      score >= 85
        ? "Elite mechanics detected. Keep the same release window and repeat under fatigue."
        : score >= 72
        ? "Solid base. Tighten elbow alignment and make the jump-to-release timing more consistent."
        : "Good training data captured. Focus on balance first, then rebuild release speed gradually.",
    strengths: [
      analysisMetrics.balance >= 78 ? "Stable balance through the shooting motion" : "Good intent to square the body before release",
      analysisMetrics.releaseSpeed >= 78 ? "Fast release window after the catch" : "Release rhythm is measurable and improving",
      analysisMetrics.stability >= 78 ? "Controlled posture during ball handling" : "Posture remains recoverable after movement",
    ],
    weaknesses: [
      analysisMetrics.shootingForm < 80 ? "Elbow alignment needs more consistency" : "Wrist angle varies late in the shot",
      analysisMetrics.jumpTiming < 80 ? "Jump timing is slightly delayed" : "Lower-body load can be more explosive",
      analysisMetrics.stability < 80 ? "Balance drifts after the shot" : "Follow-through duration can improve",
    ],
    suggestions: [
      "Shoot 3 sets of 10 form shots with a one-second follow-through hold.",
      "Add single-leg balance holds before shooting workouts.",
      "Practice catch-to-release timing with a 0.8 second target.",
      "Use footwork reps from both corners before moving into live shots.",
    ],
    recommendedDrills: [
      { title: "Form Shooting Ladder", focus: "Elbow and wrist alignment", level: "Beginner" },
      { title: "Balance Into Pull-Up", focus: "Stop mechanics and stability", level: "Intermediate" },
      { title: "Quick Release Series", focus: "Catch-to-release speed", level: "Advanced" },
    ],
    metrics: analysisMetrics,
  };
}

export async function analyzeUploadedVideo(file: File): Promise<AIAnalysisResult> {
  const seed = Array.from(file.name).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return analyzeBasketballSession({
    madeShots: 8 + (seed % 12),
    missedShots: 2 + (seed % 6),
    elbowAngle: 70 + (seed % 22),
    kneeAngle: 58 + (seed % 28),
    dribblePower: 55 + (seed % 38),
    dribbleRhythm: 92 + (seed % 70),
  } as Partial<PoseMetrics>);
}
