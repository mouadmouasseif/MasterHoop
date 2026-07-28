import type { PoseMetrics } from "@/src/lib/poseDetection";
import type { CourtScanResult, CourtShotZone, Point2D } from "@/src/types/courtVision";
import { detectBallFromMetrics } from "@/src/services/ballDetectionService";

export function scanCourtFromMetrics(input: {
  width: number;
  height: number;
  metrics?: PoseMetrics | null;
  hoopPosition?: Point2D;
  previousTrail?: Point2D[];
  playerCenter?: Point2D;
}): CourtScanResult {
  const hoop = input.hoopPosition || { x: input.width * 0.5, y: input.height * 0.22 };
  const ball = detectBallFromMetrics({
    ballDetected: input.metrics?.ballDetected,
    ballPos: input.metrics?.ballPos,
    ballVelocity: input.metrics?.ballVelocity
      ? { x: input.metrics.ballVelocity.vx, y: input.metrics.ballVelocity.vy }
      : undefined,
    previousTrail: input.previousTrail,
  });
  const shotZone = estimateShotZone(input.metrics, hoop, input.width);
  const playerDetected = Boolean(input.playerCenter || input.metrics?.hasBall || input.metrics?.isDribbling || input.metrics?.isShooting);
  const cameraStatus = estimateCameraStatus(input.width, input.height, playerDetected, ball.detected);

  return {
    width: input.width,
    height: input.height,
    hoop: { detected: true, confidence: 0.72, position: hoop },
    player: {
      detected: playerDetected,
      confidence: playerDetected ? 0.68 : 0.2,
      center: input.playerCenter,
    },
    ball,
    shotZone,
    cameraStatus,
    message: buildCameraMessage(cameraStatus, shotZone, ball.detected),
  };
}

export function estimateShotZone(metrics: PoseMetrics | null | undefined, hoop: Point2D, width: number): CourtShotZone {
  if (!metrics) return "unknown";
  if (metrics.courtStatus?.in3PtRange) return "threePoint";
  if (metrics.courtStatus?.inPaint) return "near";
  if (metrics.ballPos) {
    const distance = Math.hypot(metrics.ballPos.x - hoop.x, metrics.ballPos.y - hoop.y);
    if (distance < width * 0.23) return "near";
    if (distance > width * 0.45) return "threePoint";
    return "midRange";
  }
  return "midRange";
}

function estimateCameraStatus(width: number, height: number, playerDetected: boolean, ballDetected: boolean): CourtScanResult["cameraStatus"] {
  if (width < 320 || height < 240) return "tooClose";
  if (!playerDetected && !ballDetected) return "unknown";
  if (!ballDetected && playerDetected) return "unstable";
  return "good";
}

function buildCameraMessage(status: CourtScanResult["cameraStatus"], zone: CourtShotZone, ballDetected: boolean) {
  if (status === "good") return `Scan stable: zone ${zoneLabel(zone)}, ballon ${ballDetected ? "detecte" : "a confirmer"}.`;
  if (status === "tooClose") return "Camera trop proche ou resolution trop faible. Recule le telephone si possible.";
  if (status === "unstable") return "Joueur detecte, ballon instable. Oriente la camera vers le dribble et le panier.";
  if (status === "tooDark") return "Scene trop sombre. Ajoute de la lumiere pour stabiliser l'IA.";
  return "Placement camera a verifier: garde joueur, ballon et panier dans le cadre.";
}

function zoneLabel(zone: CourtShotZone) {
  if (zone === "near") return "proche";
  if (zone === "midRange") return "mi-distance";
  if (zone === "threePoint") return "3 points";
  return "inconnue";
}
