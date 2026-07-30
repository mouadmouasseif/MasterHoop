import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import type { BasketballDetectedObject } from "@/src/services/basketballObjectDetector";
import { BallTemporalTracker } from "@/src/ai/tracking/BallTemporalTracker";
import type { BallDetection, VisionModelAdapter } from "@/src/ai/types";
import type { BallModelInput } from "@/src/ai/adapters/HybridBallModelAdapter";
import { modelManager } from "@/src/ai/core/defaultModels";
import { ShotAnalysisEngine } from "@/src/ai/shot/ShotAnalysisEngine";
import type { CourtGeometry, ShotSequenceAnalysis } from "@/src/ai/types";

export type PoseMetrics = {
  elbowAngle: number;
  kneeAngle: number;
  shoulderLevel: number;
  isShooting: boolean;
  isDribbling: boolean;
  ballDetected: boolean;
  ballConfidence: number;
  ballDetectorSource: "BasketMotion-Ai-model" | "coco-ssd";
  ballPos: { x: number, y: number } | null;
  ballVelocity: { vx: number, vy: number };
  hasBall: boolean;
  madeShots: number;
  missedShots: number;
  isCrossover: boolean;
  isFadeaway: boolean;
  isPassing: boolean;
  isRebounding: boolean;
  isHesitation: boolean;
  isEuroStep: boolean;
  dribbleCount: number;
  dribblePower: number;
  dribbleRhythm: number;
  shots: { x?: number, y?: number, shotType?: string, outcome: 'made' | 'missed' | 'unknown', confidence: number, source: string }[];
  courtStatus: {
    in3PtRange: boolean;
    inPaint: boolean;
    isOutOfBounds: boolean;
  };
};

export class PoseAnalyzer {
  private detector: poseDetection.PoseDetector | null = null;
  private objectModel: VisionModelAdapter<BallModelInput, BallDetection[]> | null = null;
  private lastWristY: number | null = null;
  private madeShots: number = 0;
  private missedShots: number = 0;
  private dribbleCount: number = 0;
  private peakDownVy: number = 0;
  private currentDribblePower: number = 0;
  private currentDribbleRhythm: number = 0;
  private isProcessingShot: boolean = false;
  private shotStartTime: number = 0;
  private lastDribbleTime: number = 0;
  private lastBallDirUp: boolean = false;
  private wasPossessing: boolean = false;
  private lastPossessionTime: number = 0;
  private highBallPeakDetected: boolean = false;
  private lastStepX: number | null = null;
  private lateralSwings: number[] = [];
  private driveStartTime: number = 0;
  private shots: { x?: number, y?: number, shotType?: string, outcome: 'made' | 'missed' | 'unknown', confidence: number, source: string }[] = [];
  private readonly temporalBallTracker = new BallTemporalTracker(3, 60);
  private readonly shotAnalysisEngine = new ShotAnalysisEngine(240);
  private frameIndex = 0;
  
  // Court Configuration (normalized 0-1)
  public perspective: 'front' | 'side-left' | 'side-right' = 'front';
  public hoopPos = { x: 0.5, y: 0.22 };
  public courtLines = {
    threePtRadius: 0.45,
    keyWidth: 0.25,
    outOfBounds: 0.95,
    baselineY: 0.15,
    sidelinePadding: 0.05,
    freeThrowLineY: 0.42
  };
  
  // Advanced Ball Tracking
  private lastBallPos: { x: number, y: number } | null = null;
  private lastBallSize: { w: number, h: number } | null = null;
  private ballVelocity: { vx: number, vy: number } = { vx: 0, vy: 0 };
  private lastBallTime: number = 0;
  private persistenceTime: number = 800; // Keep ball active for 0.8s after loss
  private alpha: number = 0.5; // Base smoothing factor for ball position
  private velAlpha: number = 0.4; // Base velocity smoothing factor
  private moveHistory: { metrics: any, timestamp: number }[] = [];
  private ballDetectionCount: number = 0;

  async initialize() {
    await tf.ready();
    this.detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
    );
    await modelManager.load("hybrid-ball-detector");
    this.objectModel = modelManager.getAdapter<BallModelInput, BallDetection[]>("hybrid-ball-detector");
    if (!this.objectModel) throw new Error("Le détecteur de ballon n’a pas pu être initialisé.");
  }

  async analyzeFrame(
    video: HTMLVideoElement | HTMLCanvasElement,
    context?: { frameIndex?: number; timestampMs?: number },
  ): Promise<{
    poses: poseDetection.Pose[], 
    objects: BasketballDetectedObject[],
    metrics: PoseMetrics 
  } | null> {
    try {
      if (!this.detector || !this.objectModel) return null;
      
      // Ensure video is ready and has valid dimensions to avoid internal library errors (like yMin access on null)
      const isVideo = video instanceof HTMLVideoElement;
      if (
        (isVideo && (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0)) ||
        (!isVideo && (video.width === 0 || video.height === 0))
      ) {
        return null;
      }

      const analysisFrameIndex = context?.frameIndex ?? this.frameIndex;
      const analysisTimestampMs = context?.timestampMs ?? Date.now();
      const [poses, objects] = await Promise.all([
        this.detector.estimatePoses(video).catch(e => {
          console.warn("Pose detection failed:", e);
          return [] as poseDetection.Pose[];
        }),
        this.objectModel.predict({ source: video, frameIndex: analysisFrameIndex, timestampMs: analysisTimestampMs })
          .then((detections) => detections.map((detection): BasketballDetectedObject => ({
            bbox: [detection.bbox.x, detection.bbox.y, detection.bbox.width, detection.bbox.height],
            class: "sports ball",
            score: detection.confidence,
            source: detection.detector === "BasketMotion-Ai" ? "BasketMotion-Ai-model" : "coco-ssd",
          })))
          .catch(e => {
            console.warn("Object detection failed:", e);
            return [] as BasketballDetectedObject[];
          })
      ]);

      if (!poses || poses.length === 0) return null;

      const pose = poses[0];
      if (!pose || !pose.keypoints) return null;

      const width = isVideo ? video.videoWidth : video.width;
      const height = isVideo ? video.videoHeight : video.height;
      const metrics = this.calculateMetrics(
        pose,
        objects || [],
        width,
        height,
        analysisFrameIndex,
        analysisTimestampMs,
      );
      this.frameIndex = Math.max(this.frameIndex + 1, analysisFrameIndex + 1);

      return { poses, objects, metrics };
    } catch (error) {
      console.error("Error analyzing frame:", error);
      return null;
    }
  }

  getShotSequenceAnalysis(): ShotSequenceAnalysis {
    return this.shotAnalysisEngine.analyze();
  }

  setCourtCalibration(calibration: CourtGeometry | null): void {
    this.shotAnalysisEngine.setCourtCalibration(calibration);
  }

  resetShotSequenceAnalysis(): void {
    this.temporalBallTracker.reset();
    this.shotAnalysisEngine.reset();
  }

  private calculateMetrics(
    pose: poseDetection.Pose,
    objects: BasketballDetectedObject[],
    width: number,
    height: number,
    frameIndex: number,
    timestampMs: number,
  ): PoseMetrics {
    const keypoints = pose.keypoints;
    const find = (name: string) => keypoints.find(k => k.name === name);

    const shoulder = find('right_shoulder');
    const elbow = find('right_elbow');
    const wrist = find('right_wrist');
    const hip = find('right_hip');
    const knee = find('right_knee');
    const ankle = find('right_ankle');
    const nose = find('nose');
    const leftWristForBall = find('left_wrist');

    let elbowAngle = 0;
    if (shoulder && elbow && wrist && elbow.score! > 0.3) {
      elbowAngle = this.calculateAngle(shoulder, elbow, wrist);
    }

    let kneeAngle = 0;
    if (hip && knee && ankle && knee.score! > 0.3) {
      kneeAngle = this.calculateAngle(hip, knee, ankle);
    }

    // Ball detection and temporal tracking. Predicted points remain explicitly
    // distinct from observed detections and never validate a shot outcome.
    const now = timestampMs;
    const ballDetections = objects
      .filter(obj => obj.class === 'sports ball' && obj.score > 0.45)
      .sort((a, b) => {
        const rank = (object: BasketballDetectedObject) => {
          const centerX = object.bbox[0] + object.bbox[2] / 2;
          const centerY = object.bbox[1] + object.bbox[3] / 2;
          const wristDistances = [wrist, leftWristForBall]
            .filter((point): point is NonNullable<typeof point> => Boolean(point && (point.score ?? 0) > 0.25))
            .map((point) => Math.hypot(centerX - point.x, centerY - point.y));
          const nearestWrist = wristDistances.length ? Math.min(...wristDistances) : width;
          const proximityBonus = Math.max(0, 1 - nearestWrist / Math.max(width * 0.45, 1)) * 0.18;
          const specializedBonus = object.source === "BasketMotion-Ai-model" ? 0.12 : 0;
          return object.score + proximityBonus + specializedBonus;
        };
        return rank(b) - rank(a);
      });

    const trackerCandidates: BallDetection[] = ballDetections.map((object) => ({
      frameIndex,
      timestampMs: now,
      bbox: { x: object.bbox[0], y: object.bbox[1], width: object.bbox[2], height: object.bbox[3] },
      center: { x: object.bbox[0] + object.bbox[2] / 2, y: object.bbox[1] + object.bbox[3] / 2 },
      confidence: object.score,
      detector: object.source === "BasketMotion-Ai-model" ? "BasketMotion-Ai" : "coco_ssd",
    }));
    const ballTrack = this.temporalBallTracker.update(trackerCandidates, now);
    const trackedBall = ballTrack.detections.at(-1);
    const ballDetected = trackedBall?.observed === true;
    const ballPos = trackedBall?.center || null;
    this.ballVelocity = trackedBall
      ? { vx: trackedBall.velocity.x, vy: trackedBall.velocity.y }
      : { vx: 0, vy: 0 };
    this.lastBallPos = ballPos;
    this.lastBallTime = trackedBall?.timestampMs || 0;
    this.ballDetectionCount = ballTrack.detections.filter((point) => point.observed).length;

    // Check if person has ball (wrist close to ball)
    let hasBall = false;
    if (ballPos) {
      const visibleWrists = [wrist, leftWristForBall]
        .filter((point): point is NonNullable<typeof point> => Boolean(point && (point.score ?? 0) > 0.5));
      const threshold = Math.max(trackedBall?.bbox.width ? trackedBall.bbox.width * 2.2 : 0, width * 0.12);
      hasBall = visibleWrists.some((point) => Math.hypot(ballPos.x - point.x, ballPos.y - point.y) < threshold);
    }

    // Improved Shot detection: Wrist goes above head while elbow extends
    let isShooting = false;
    if (wrist && nose && wrist.score! > 0.5 && nose.score! > 0.5) {
      if (wrist.y < nose.y && elbowAngle > 140) {
        isShooting = true;
        if (!this.isProcessingShot) {
          this.isProcessingShot = true;
          this.shotStartTime = now;
        }
      }
    }

    // The hoop overlay is a user-adjustable normalized reference, not a detected
    // basket. It must never be used to infer made/missed without visual evidence.
    if (this.isProcessingShot) {
      const timeInShot = now - this.shotStartTime;
      
      // If we detect a clear release (ball moving up away from hands)
      const isReleased = !hasBall && ballDetected && this.ballVelocity.vy < -100;
      
      if (isReleased) {
        this.shots.push({
          x: ballPos ? Math.round((ballPos.x / width) * 100) : undefined,
          y: ballPos ? Math.round((ballPos.y / height) * 100) : undefined,
          shotType: "unknown",
          outcome: "unknown",
          confidence: trackedBall?.confidence || 0,
          source: "release-event-without-hoop-detection",
        });
        this.isProcessingShot = false;
      } else if (timeInShot > 2000) {
        this.isProcessingShot = false;
      }
    }

    // Les zones terrain restent indisponibles jusqu’à une calibration valide (Sprint 4).
    const in3PtRange = false;
    const inPaint = false;
    const isOutOfBounds = false;

    // Robust Dribble detection & Counting: Ball bounce detection
    let isDribbling = false;
    if (ballPos && ballDetected && hasBall) {
      const currentVy = this.ballVelocity.vy;
      
      // Track peak downward velocity for power analysis
      if (currentVy > 0) {
        this.peakDownVy = Math.max(this.peakDownVy, currentVy);
      }

      // If ball was moving down and now moving up (bounce)
      if (currentVy < -100 && !this.lastBallDirUp) {
        if (now - this.lastDribbleTime > 300) { // Debounce
          this.dribbleCount++;
          
          // Analyze Power (scale of 0-100, assuming 1200 px/s is high power)
          this.currentDribblePower = Math.min(Math.round((this.peakDownVy / 1200) * 100), 100);
          this.peakDownVy = 0; // Reset

          // Analyze Rhythm (BPM)
          const interval = now - this.lastDribbleTime;
          if (this.lastDribbleTime > 0 && interval < 2000) {
            this.currentDribbleRhythm = Math.round(60000 / interval);
          }

          this.lastDribbleTime = now;
          isDribbling = true;
        }
      }
      this.lastBallDirUp = currentVy < 0;
    }

    // Advanced Move: Crossover
    let isCrossover = false;
    const leftWrist = find('left_wrist');
    if (ballPos && nose && leftWrist && wrist) {
      // Check if ball crossed the midline (nose.x) recently
      const history = this.moveHistory.slice(-10); // last ~300ms
      const wasOnLeft = history.some(h => h.metrics.ballPos && h.metrics.ballPos.x < nose.x);
      const wasOnRight = history.some(h => h.metrics.ballPos && h.metrics.ballPos.x > nose.x);
      
      if (wasOnLeft && wasOnRight && ballPos.y > hip?.y!) {
        isCrossover = true;
      }
    }

    // Advanced Move: Fadeaway
    let isFadeaway = false;
    if (isShooting && nose && hip && ankle) {
      // Lean detection: Horizontal offset between nose and base of support
      const leanOffset = Math.abs(nose.x - hip.x);
      const verticalHeight = Math.abs(nose.y - ankle.y);
      if (leanOffset > verticalHeight * 0.2) { // Roughly 11 degrees lean
        isFadeaway = true;
      }
    }

    // Advanced Move: Hesitation Dribble (Hesi)
    // Pattern: Rapid dribble -> Pause/Slow rhythm -> Shoulder lift
    let isHesitation = false;
    if (wrist && shoulder) {
      const history = this.moveHistory.slice(-20); // ~0.6s
      const previousRhythms = history
        .map(h => h.metrics.dribbleRhythm)
        .filter(r => r > 0);
      
      const avgRhythm = previousRhythms.length > 0 
        ? previousRhythms.reduce((a, b) => a + b, 0) / previousRhythms.length 
        : 0;

      // Detect "Hang" time: Ball is high and person is standing up slightly
      const isHighDribble = hasBall && ballPos && ballPos.y < (hip?.y || height);
      const shoulderLift = shoulder.y < (history[0]?.metrics.shoulderLevel || shoulder.y);
      
      if (avgRhythm > 140 && this.currentDribbleRhythm < 80 && isHighDribble && shoulderLift) {
        isHesitation = true;
      }
    }

    // Advanced Move: Euro Step
    // Pattern: No dribble -> Two rapid directional lateral changes while drive
    let isEuroStep = false;
    const leftAnkle = find('left_ankle');
    const rightAnkle = find('right_ankle');
    if (!isDribbling && hasBall && leftAnkle && rightAnkle) {
      const currentStepX = (leftAnkle.x + rightAnkle.x) / 2;
      if (this.lastStepX !== null) {
        const dx = currentStepX - this.lastStepX;
        // Significant lateral movement detected
        if (Math.abs(dx) > width * 0.05) {
          const nowDrive = Date.now();
          if (nowDrive - this.driveStartTime > 1500) {
            this.driveStartTime = nowDrive;
            this.lateralSwings = [];
          }
          this.lateralSwings.push(dx);
          
          // Check for "Zig-Zag" pattern (direction change)
          if (this.lateralSwings.length >= 2) {
            const last = this.lateralSwings[this.lateralSwings.length - 1];
            const prev = this.lateralSwings[this.lateralSwings.length - 2];
            if ((last > 0 && prev < 0) || (last < 0 && prev > 0)) {
              isEuroStep = true;
              this.lateralSwings = []; // Reset
            }
          }
        }
      }
      this.lastStepX = currentStepX;
    } else if (isDribbling) {
      this.lastStepX = null;
      this.lateralSwings = [];
    }

    // Pass detection
    let isPassing = false;
    if (this.wasPossessing && !hasBall && !isShooting) {
      if (Math.abs(this.ballVelocity.vx) > 400 && now - this.lastPossessionTime < 300) {
        isPassing = true;
      }
    }

    // Rebound detection
    let isRebounding = false;
    if (!this.wasPossessing && hasBall) {
      const timeSincePossession = now - this.lastPossessionTime;
      // If we caught it after a significant time (it was in the air)
      if (timeSincePossession > 500 && shoulder && ballPos && ballPos.y < shoulder.y + 100) {
        isRebounding = true;
      }
    }

    // Update possession trackers
    if (hasBall) {
      this.lastPossessionTime = now;
      this.wasPossessing = true;
    } else if (now - this.lastPossessionTime > 200) {
      this.wasPossessing = false;
    }

    const currentMetrics: PoseMetrics = {
      elbowAngle: Math.round(elbowAngle),
      kneeAngle: Math.round(kneeAngle),
      shoulderLevel: shoulder ? Math.round(shoulder.y) : 0,
      isShooting,
      isDribbling,
      ballDetected,
      ballConfidence: trackedBall ? Math.round(trackedBall.confidence * 100) : 0,
      ballDetectorSource: trackedBall?.detector === "BasketMotion-Ai" ? "BasketMotion-Ai-model" : "coco-ssd",
      ballPos,
      ballVelocity: { ...this.ballVelocity },
      hasBall,
      madeShots: this.madeShots,
      missedShots: this.missedShots,
      isCrossover,
      isFadeaway,
      isPassing,
      isRebounding,
      isHesitation,
      isEuroStep,
      dribbleCount: this.dribbleCount,
      dribblePower: this.currentDribblePower,
      dribbleRhythm: this.currentDribbleRhythm,
      shots: [...this.shots],
      courtStatus: {
        in3PtRange,
        inPaint,
        isOutOfBounds
      }
    };

    const poseConfidence = pose.score ?? (
      keypoints.length
        ? keypoints.reduce((sum, point) => sum + (point.score ?? 0), 0) / keypoints.length
        : 0
    );
    this.shotAnalysisEngine.addFrame({
      frameIndex,
      timestampMs,
      width,
      height,
      confidence: Math.max(0, Math.min(1, poseConfidence)),
      keypoints: keypoints.flatMap((point) => point.name ? [{
        name: point.name,
        x: point.x,
        y: point.y,
        confidence: Math.max(0, Math.min(1, point.score ?? 0)),
      }] : []),
      ball: trackedBall ? { ...trackedBall } : null,
      hasBall,
    });

    // Update history
    this.moveHistory.push({ metrics: currentMetrics, timestamp: now });
    if (this.moveHistory.length > 50) this.moveHistory.shift();

    return currentMetrics;
  }

  private calculateAngle(a: poseDetection.Keypoint, b: poseDetection.Keypoint, c: poseDetection.Keypoint): number {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
  }
}
