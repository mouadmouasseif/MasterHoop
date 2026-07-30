import { clamp01, mean } from "@/src/ai/pose/poseMath";
import type {
  HoopFrameObservation,
  ShotFrameObservation,
  ShotOutcomeObservation,
} from "@/src/ai/types";

const MIN_CONFIDENCE = 0.6;

type JointObservation = {
  frame: ShotFrameObservation;
  hoop: HoopFrameObservation;
  ballX: number;
  ballY: number;
  confidence: number;
};

export class ShotOutcomeDetector {
  detect(frames: ShotFrameObservation[]): ShotOutcomeObservation {
    const observations = frames
      .filter((frame): frame is ShotFrameObservation & { hoop: HoopFrameObservation } =>
        Boolean(
          frame.ball?.observed &&
          frame.ball.confidence >= MIN_CONFIDENCE &&
          frame.hoop?.observed &&
          frame.hoop.confidence >= MIN_CONFIDENCE &&
          frame.hoop.rimWidthPx > 0,
        ),
      )
      .map((frame): JointObservation => ({
        frame,
        hoop: frame.hoop,
        ballX: frame.ball!.center.x,
        ballY: frame.ball!.center.y,
        confidence: Math.min(frame.ball!.confidence, frame.hoop.confidence),
      }))
      .sort((left, right) => left.frame.timestampMs - right.frame.timestampMs);

    if (observations.length < 3) {
      return unavailable("Ballon et panier doivent être observés ensemble sur au moins trois images.");
    }

    const made = findMadeCrossing(observations);
    if (made) return result("made", made, "Passage descendant observé dans le cylindre du cercle.");

    const missed = findClearMiss(observations);
    if (missed) return result("missed", missed, "Passage descendant observé hors du cylindre du cercle.");

    return unavailable("La trajectoire près du cercle reste ambiguë ; le résultat est conservé à unknown.");
  }
}

function findMadeCrossing(observations: JointObservation[]): JointObservation[] | null {
  for (let index = 1; index < observations.length - 1; index += 1) {
    const before = observations[index - 1];
    const near = observations[index];
    const after = observations[index + 1];
    if (!sameShortSequence(before, after)) continue;
    const halfRim = near.hoop.rimWidthPx / 2;
    const withinCylinder = [before, near, after].every((observation) =>
      Math.abs(observation.ballX - observation.hoop.center.x) <= halfRim * 0.9,
    );
    const crossesDownward =
      before.ballY < before.hoop.center.y - before.hoop.rimWidthPx * 0.12 &&
      Math.abs(near.ballY - near.hoop.center.y) <= near.hoop.rimWidthPx * 0.45 &&
      after.ballY > after.hoop.center.y + after.hoop.rimWidthPx * 0.12 &&
      after.ballY > before.ballY;
    if (withinCylinder && crossesDownward) return [before, near, after];
  }
  return null;
}

function findClearMiss(observations: JointObservation[]): JointObservation[] | null {
  for (let index = 1; index < observations.length - 1; index += 1) {
    const before = observations[index - 1];
    const near = observations[index];
    const after = observations[index + 1];
    if (!sameShortSequence(before, after)) continue;
    const rimWidth = near.hoop.rimWidthPx;
    const nearRimHeight = Math.abs(near.ballY - near.hoop.center.y) <= rimWidth * 0.55;
    const clearlyOutside = Math.abs(near.ballX - near.hoop.center.x) >= rimWidth * 0.7;
    const descendsPastRim =
      before.ballY < before.hoop.center.y &&
      after.ballY > after.hoop.center.y + rimWidth * 0.1 &&
      after.ballY > before.ballY;
    const remainsOutside = Math.abs(after.ballX - after.hoop.center.x) >= rimWidth * 0.65;
    if (nearRimHeight && clearlyOutside && descendsPastRim && remainsOutside) {
      return [before, near, after];
    }
  }
  return null;
}

function sameShortSequence(first: JointObservation, last: JointObservation): boolean {
  return last.frame.timestampMs > first.frame.timestampMs &&
    last.frame.timestampMs - first.frame.timestampMs <= 700;
}

function result(
  outcome: "made" | "missed",
  evidence: JointObservation[],
  message: string,
): ShotOutcomeObservation {
  const confidence = clamp01(mean(evidence.map((item) => item.confidence)) * 0.9);
  if (confidence < MIN_CONFIDENCE) return unavailable("Le passage est visible mais sa confiance est insuffisante.");
  return {
    outcome,
    confidence,
    status: "observed",
    source: "ball_hoop_temporal_crossing",
    evidenceFrameIndexes: evidence.map((item) => item.frame.frameIndex),
    evidence: [message],
    limitations: [],
  };
}

function unavailable(message: string): ShotOutcomeObservation {
  return {
    outcome: "unknown",
    confidence: 0,
    status: "unavailable",
    source: "unavailable",
    evidenceFrameIndexes: [],
    evidence: [],
    limitations: [message],
  };
}
