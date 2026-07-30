import type {
  ShotFrameObservation,
  ShotPhase,
  ShotTimelineEvent,
} from "@/src/ai/types";
import { angleDegrees, averageConfidence, clamp01, keypoint } from "@/src/ai/pose/poseMath";

const MIN_EVENT_CONFIDENCE = 0.6;

export interface ShotPhaseDetectionResult {
  events: ShotTimelineEvent[];
  releaseFrameIndex: number | null;
  limitations: string[];
}

export class ShotPhaseDetector {
  detect(inputFrames: ShotFrameObservation[]): ShotPhaseDetectionResult {
    const frames = [...inputFrames].sort((left, right) => left.timestampMs - right.timestampMs);
    const candidates: ShotTimelineEvent[] = [];
    const limitations: string[] = [];

    if (frames.length < 3) {
      return {
        events: [],
        releaseFrameIndex: null,
        limitations: ["Séquence trop courte pour identifier les phases du tir."],
      };
    }

    let releaseFrameIndex: number | null = null;
    let lastPhase: ShotPhase | null = null;

    for (let index = 0; index < frames.length; index += 1) {
      const current = frames[index];
      const previous = frames[index - 1];
      const phase = inferPhase(current, previous, releaseFrameIndex !== null);
      if (!phase || phase.phase === lastPhase) continue;

      if (phase.phase === "release") releaseFrameIndex = current.frameIndex;
      if (phase.confidence < MIN_EVENT_CONFIDENCE) {
        limitations.push(`Phase ${phase.phase} ignorée : confiance ${phase.confidence.toFixed(2)} inférieure à 0,60.`);
        continue;
      }

      candidates.push({
        id: `${phase.phase}-${current.frameIndex}-${current.timestampMs}`,
        phase: phase.phase,
        frameIndex: current.frameIndex,
        timestampMs: current.timestampMs,
        confidence: phase.confidence,
        status: phase.status,
        evidence: phase.evidence,
        limitations: phase.limitations,
      });
      lastPhase = phase.phase;
    }

    const hasRelease = candidates.some((event) => event.phase === "release");
    if (!hasRelease) {
      releaseFrameIndex = null;
      limitations.push("Relâchement non observé avec une confiance suffisante ; le tir n’est pas confirmé.");
    }

    return { events: normalizeOrder(candidates), releaseFrameIndex, limitations: unique(limitations) };
  }
}

type PhaseCandidate = Pick<ShotTimelineEvent, "phase" | "confidence" | "status" | "evidence" | "limitations">;

function inferPhase(
  frame: ShotFrameObservation,
  previous: ShotFrameObservation | undefined,
  released: boolean,
): PhaseCandidate | null {
  const leftWrist = keypoint(frame, "left_wrist");
  const rightWrist = keypoint(frame, "right_wrist");
  const leftShoulder = keypoint(frame, "left_shoulder");
  const rightShoulder = keypoint(frame, "right_shoulder");
  const leftHip = keypoint(frame, "left_hip");
  const rightHip = keypoint(frame, "right_hip");
  const leftKnee = keypoint(frame, "left_knee");
  const rightKnee = keypoint(frame, "right_knee");
  const leftAnkle = keypoint(frame, "left_ankle");
  const rightAnkle = keypoint(frame, "right_ankle");
  const poseConfidence = averageConfidence([
    leftWrist,
    rightWrist,
    leftShoulder,
    rightShoulder,
    leftHip,
    rightHip,
    leftKnee,
    rightKnee,
  ]);
  const ball = frame.ball?.observed ? frame.ball : null;
  const ballConfidence = ball?.confidence ?? 0;
  const evidenceConfidence = clamp01(poseConfidence * 0.45 + ballConfidence * 0.55);

  if (previous?.hasBall && !frame.hasBall && ball && ball.velocity.y < 0) {
    return {
      phase: "release",
      confidence: evidenceConfidence,
      status: "observed",
      evidence: ["Transition ballon près des mains → ballon détaché.", "Ballon observé en mouvement ascendant."],
      limitations: ["Relâchement identifié en 2D ; l’instant exact dépend de la fréquence d’images."],
    };
  }

  if (released && !frame.hasBall && ball) {
    return {
      phase: "flight",
      confidence: clamp01(ballConfidence * 0.85 + frame.confidence * 0.15),
      status: "observed",
      evidence: ["Ballon observé après le relâchement et séparé des mains."],
      limitations: ["Le vol est suivi dans le plan 2D de la caméra."],
    };
  }

  if (released && landingVisible(frame, previous)) {
    return {
      phase: "landing",
      confidence: poseConfidence,
      status: "estimated",
      evidence: ["Retour vertical du bassin et appuis visibles après le relâchement."],
      limitations: ["Atterrissage estimé en 2D, sans mesure de force au sol."],
    };
  }

  if (!frame.hasBall || !ball) return null;

  const kneeAngle = bilateralJointAngle(
    [leftHip, rightHip],
    [leftKnee, rightKnee],
    [leftAnkle, rightAnkle],
  );
  const previousKneeAngle = previous
    ? bilateralJointAngle(
        [keypoint(previous, "left_hip"), keypoint(previous, "right_hip")],
        [keypoint(previous, "left_knee"), keypoint(previous, "right_knee")],
        [keypoint(previous, "left_ankle"), keypoint(previous, "right_ankle")],
      )
    : null;

  if (ball.velocity.y < -Math.max(8, frame.height * 0.025)) {
    return {
      phase: "upward_motion",
      confidence: evidenceConfidence,
      status: "observed",
      evidence: ["Ballon observé près des mains avec déplacement vertical ascendant."],
      limitations: ["Direction mesurée dans le plan image uniquement."],
    };
  }

  if (
    ball.velocity.y > Math.max(8, frame.height * 0.02) ||
    (kneeAngle !== null && previousKneeAngle !== null && kneeAngle < previousKneeAngle - 3)
  ) {
    return {
      phase: "dip",
      confidence: evidenceConfidence,
      status: "estimated",
      evidence: ["Descente du ballon ou augmentation observable de la flexion des genoux."],
      limitations: ["Phase estimée à partir d’un mouvement 2D."],
    };
  }

  return {
    phase: "preparation",
    confidence: evidenceConfidence,
    status: "estimated",
    evidence: ["Ballon observé près des mains avant un mouvement ascendant confirmé."],
    limitations: ["Une position préparatoire ne confirme pas à elle seule une tentative de tir."],
  };
}

function bilateralJointAngle(
  starts: Array<ReturnType<typeof keypoint>>,
  centers: Array<ReturnType<typeof keypoint>>,
  ends: Array<ReturnType<typeof keypoint>>,
): number | null {
  const values = starts.flatMap((start, index) => {
    const center = centers[index];
    const end = ends[index];
    return start && center && end ? [angleDegrees(start, center, end)] : [];
  });
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function landingVisible(frame: ShotFrameObservation, previous?: ShotFrameObservation): boolean {
  if (!previous) return false;
  const currentHip = [keypoint(frame, "left_hip"), keypoint(frame, "right_hip")].filter(Boolean);
  const previousHip = [keypoint(previous, "left_hip"), keypoint(previous, "right_hip")].filter(Boolean);
  const anklesVisible = Boolean(keypoint(frame, "left_ankle") && keypoint(frame, "right_ankle"));
  if (currentHip.length !== 2 || previousHip.length !== 2 || !anklesVisible) return false;
  const currentY = (currentHip[0]!.y + currentHip[1]!.y) / 2;
  const previousY = (previousHip[0]!.y + previousHip[1]!.y) / 2;
  return currentY - previousY > frame.height * 0.015;
}

function normalizeOrder(events: ShotTimelineEvent[]): ShotTimelineEvent[] {
  const order: ShotPhase[] = ["preparation", "dip", "upward_motion", "release", "flight", "landing", "result"];
  let greatestRank = -1;
  return events.filter((event) => {
    const rank = order.indexOf(event.phase);
    if (rank < greatestRank && event.phase !== "flight") return false;
    greatestRank = Math.max(greatestRank, rank);
    return true;
  });
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
