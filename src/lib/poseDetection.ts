import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export type PoseMetrics = {
  elbowAngle: number;
  kneeAngle: number;
  shoulderLevel: number;
  isShooting: boolean;
  isDribbling: boolean;
  ballDetected: boolean;
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
  shots: { x: number, y: number, z: number, shotType: string, outcome: 'made' | 'missed' }[];
  courtStatus: {
    in3PtRange: boolean;
    inPaint: boolean;
    isOutOfBounds: boolean;
  };
};

export class PoseAnalyzer {
  private detector: poseDetection.PoseDetector | null = null;
  private objectModel: cocoSsd.ObjectDetection | null = null;
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
  private shots: { x: number, y: number, z: number, shotType: string, outcome: 'made' | 'missed' }[] = [];
  
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
  private gravity: number = 980; // px/s^2 for prediction
  private friction: number = 0.98; // Damping during prediction
  private moveHistory: { metrics: any, timestamp: number }[] = [];
  private ballDetectionCount: number = 0;

  async initialize() {
    await tf.ready();
    this.detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
    );
    this.objectModel = await cocoSsd.load();
  }

  async analyzeFrame(video: HTMLVideoElement): Promise<{ 
    poses: poseDetection.Pose[], 
    objects: cocoSsd.DetectedObject[],
    metrics: PoseMetrics 
  } | null> {
    try {
      if (!this.detector || !this.objectModel) return null;
      
      // Ensure video is ready and has valid dimensions to avoid internal library errors (like yMin access on null)
      if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        return null;
      }

      const [poses, objects] = await Promise.all([
        this.detector.estimatePoses(video).catch(e => {
          console.warn("Pose detection failed:", e);
          return [] as poseDetection.Pose[];
        }),
        this.objectModel.detect(video).catch(e => {
          console.warn("Object detection failed:", e);
          return [] as cocoSsd.DetectedObject[];
        })
      ]);

      if (!poses || poses.length === 0) return null;

      const pose = poses[0];
      if (!pose || !pose.keypoints) return null;

      const metrics = this.calculateMetrics(pose, objects || [], video.videoWidth, video.videoHeight);

      return { poses, objects, metrics };
    } catch (error) {
      console.error("Error analyzing frame:", error);
      return null;
    }
  }

  private calculateMetrics(pose: poseDetection.Pose, objects: cocoSsd.DetectedObject[], width: number, height: number): PoseMetrics {
    const keypoints = pose.keypoints;
    const find = (name: string) => keypoints.find(k => k.name === name);

    const shoulder = find('right_shoulder');
    const elbow = find('right_elbow');
    const wrist = find('right_wrist');
    const hip = find('right_hip');
    const knee = find('right_knee');
    const ankle = find('right_ankle');
    const nose = find('nose');

    let elbowAngle = 0;
    if (shoulder && elbow && wrist && elbow.score! > 0.3) {
      elbowAngle = this.calculateAngle(shoulder, elbow, wrist);
    }

    let kneeAngle = 0;
    if (hip && knee && ankle && knee.score! > 0.3) {
      kneeAngle = this.calculateAngle(hip, knee, ankle);
    }

    // Robust Ball Detection & Tracking
    const now = Date.now();
    const ballDetections = objects
      .filter(obj => obj.class === 'sports ball' && obj.score > 0.45)
      .sort((a, b) => b.score - a.score);

    let bestBall = null;
    let ballDetected = false;

    if (ballDetections.length > 0) {
      if (this.lastBallPos) {
        // Find detection closest to predicted position
        const dt = (now - this.lastBallTime) / 1000;
        const predictedX = this.lastBallPos.x + this.ballVelocity.vx * dt;
        const predictedY = this.lastBallPos.y + this.ballVelocity.vy * dt + 0.5 * this.gravity * dt * dt;

        bestBall = ballDetections.reduce((best, current) => {
          const currentX = current.bbox[0] + current.bbox[2] / 2;
          const currentY = current.bbox[1] + current.bbox[3] / 2;
          const distToPredicted = Math.sqrt(Math.pow(currentX - predictedX, 2) + Math.pow(currentY - predictedY, 2));
          
          if (!best) return { ...current, dist: distToPredicted };
          return distToPredicted < (best as any).dist ? { ...current, dist: distToPredicted } : best;
        }, null as any);

        // Consistency Check: Size shouldn't change too abruptly
        if (this.lastBallSize && bestBall) {
          const sizeRatio = (bestBall.bbox[2] * bestBall.bbox[3]) / (this.lastBallSize.w * this.lastBallSize.h);
          if (sizeRatio < 0.4 || sizeRatio > 2.5) {
            bestBall = null; // Reject suspicious size jump
          }
        }
        
        // Consistency Check: Max speed sanity (ball shouldn't travel 2000px/s unless we are in a massive frame jump)
        if (bestBall && (bestBall as any).dist > width * 0.5 && dt < 0.2) {
          bestBall = null; // Likely false positive
        }
      } else {
        bestBall = ballDetections[0];
      }
    }

    let ballPos = null;
    if (bestBall) {
      const currentRawPos = { 
        x: bestBall.bbox[0] + bestBall.bbox[2] / 2, 
        y: bestBall.bbox[1] + bestBall.bbox[3] / 2 
      };

      if (this.lastBallPos && this.lastBallTime > 0) {
        const dt = Math.min((now - this.lastBallTime) / 1000, 0.1); 
        if (dt > 0) {
          const instantVx = (currentRawPos.x - this.lastBallPos.x) / dt;
          const instantVy = (currentRawPos.y - this.lastBallPos.y) / dt;
          
          // Adaptive Smoothing: Higher alpha when moving fast to reduce lag, lower when slow to reduce jitter
          const speedFactor = Math.min(Math.sqrt(instantVx * instantVx + instantVy * instantVy) / 1000, 1);
          const adaptiveAlpha = 0.3 + (speedFactor * 0.4);
          const adaptiveVelAlpha = 0.2 + (speedFactor * 0.3);

          this.ballVelocity = {
            vx: adaptiveVelAlpha * instantVx + (1 - adaptiveVelAlpha) * this.ballVelocity.vx,
            vy: adaptiveVelAlpha * instantVy + (1 - adaptiveVelAlpha) * this.ballVelocity.vy
          };

          ballPos = {
            x: adaptiveAlpha * currentRawPos.x + (1 - adaptiveAlpha) * (this.lastBallPos.x + this.ballVelocity.vx * dt),
            y: adaptiveAlpha * currentRawPos.y + (1 - adaptiveAlpha) * (this.lastBallPos.y + this.ballVelocity.vy * dt)
          };
        }
      } else {
        ballPos = currentRawPos;
        this.ballVelocity = { vx: 0, vy: 0 };
      }
      this.lastBallPos = ballPos;
      this.lastBallSize = { w: bestBall.bbox[2], h: bestBall.bbox[3] };
      this.lastBallTime = now;
      this.ballDetectionCount++;
      ballDetected = true;
    } else if (this.lastBallPos && (now - this.lastBallTime < this.persistenceTime)) {
      // Prediction mode
      const dt = (now - this.lastBallTime) / 1000;
      this.ballVelocity.vy += this.gravity * dt;
      this.ballVelocity.vx *= this.friction;
      this.ballVelocity.vy *= this.friction;

      ballPos = {
        x: this.lastBallPos.x + this.ballVelocity.vx * dt,
        y: this.lastBallPos.y + this.ballVelocity.vy * dt
      };

      this.lastBallPos = ballPos;
      this.lastBallTime = now;
      ballDetected = true;
    } else {
      this.lastBallPos = null;
      this.lastBallSize = null;
      this.ballVelocity = { vx: 0, vy: 0 };
      this.ballDetectionCount = 0;
    }

    // Check if person has ball (wrist close to ball)
    let hasBall = false;
    if (ballPos && wrist && wrist.score! > 0.5) {
      const dist = Math.sqrt(Math.pow(ballPos.x - wrist.x, 2) + Math.pow(ballPos.y - wrist.y, 2));
      // Buffer dist based on movement
      const threshold = 120; 
      if (dist < threshold) hasBall = true;
    }

    // Improved Shot detection: Wrist goes above head while elbow extends
    let isShooting = false;
    if (wrist && nose && wrist.score! > 0.5 && nose.score! > 0.5) {
      if (wrist.y < nose.y && elbowAngle > 140) {
        isShooting = true;
        if (!this.isProcessingShot) {
          this.isProcessingShot = true;
          this.shotStartTime = Date.now();
        }
      }
    }

    // Shot outcome simulation (Physics-based: track ball path vs logical hoop)
    const hoopX = width * this.hoopPos.x;
    const hoopY = height * this.hoopPos.y;
    const hoopTolerance = width * 0.08; // Successful radius

    if (this.isProcessingShot) {
      const timeInShot = Date.now() - this.shotStartTime;
      
      // If we detect a clear release (ball moving up away from hands)
      const isReleased = !hasBall && ballDetected && this.ballVelocity.vy < -100;
      
      if (isReleased || timeInShot > 2000) {
        // Project trajectory to find point nearest to hoop
        let predictedX = ballPos?.x || hoopX;
        let predictedY = ballPos?.y || hoopY;
        let v_x = this.ballVelocity.vx;
        let v_y = this.ballVelocity.vy;
        const g = this.gravity;
        const simDt = 0.05;
        let hitHoop = false;

        // Run mini simulation for 2 seconds (40 steps)
        for (let i = 0; i < 40; i++) {
          predictedX += v_x * simDt;
          predictedY += v_y * simDt + 0.5 * g * simDt * simDt;
          v_y += g * simDt;
          
          const distToHoop = Math.sqrt(Math.pow(predictedX - hoopX, 2) + Math.pow(predictedY - hoopY, 2));
          if (distToHoop < hoopTolerance) {
            hitHoop = true;
            break;
          }
          if (predictedY > height) break;
        }

        const distToHoopStart = Math.sqrt(Math.pow((ballPos?.x || hoopX) - hoopX, 2) + Math.pow((ballPos?.y || hoopY) - hoopY, 2));
        let shotType = 'Jump Shot';
        if (distToHoopStart < width * this.courtLines.keyWidth) shotType = 'Layup';
        else if (distToHoopStart > width * this.courtLines.threePtRadius) shotType = 'Three Pointer';
        
        const outcome = hitHoop ? 'made' : 'missed';
        
        // Auto-refine hoop position if we hit it with high confidence
        if (hitHoop && ballDetected) {
           this.hoopPos.x = (this.hoopPos.x + (bestBall.bbox[0] + bestBall.bbox[2]/2) / width) / 2;
           this.hoopPos.y = (this.hoopPos.y + (bestBall.bbox[1] + bestBall.bbox[3]/2) / height) / 2;
        }

        this.shots.push({
          x: Math.round(((ballPos?.x || 0) / width) * 100),
          y: Math.round(((ballPos?.y || 0) / height) * 100),
          z: 10,
          shotType,
          outcome
        });

        if (hitHoop) {
          this.madeShots++;
        } else {
          this.missedShots++;
        }
        this.isProcessingShot = false;
      }
    }

    // Court Status based on player feet
    let in3PtRange = false;
    let inPaint = false;
    let isOutOfBounds = false;

    if (ankle) {
      const distToHoop = Math.sqrt(Math.pow(ankle.x - hoopX, 2) + Math.pow(ankle.y - hoopY, 2));
      const normalizedAnkleX = ankle.x / width;
      const normalizedAnkleY = ankle.y / height;

      if (this.perspective === 'front') {
        in3PtRange = distToHoop > width * this.courtLines.threePtRadius;
        inPaint = Math.abs(normalizedAnkleX - this.hoopPos.x) < this.courtLines.keyWidth / 2 && 
                  normalizedAnkleY > this.hoopPos.y && 
                  normalizedAnkleY < this.courtLines.freeThrowLineY;
      } else if (this.perspective === 'side-left') {
        in3PtRange = distToHoop > width * this.courtLines.threePtRadius;
        inPaint = normalizedAnkleX < this.courtLines.keyWidth && 
                  Math.abs(normalizedAnkleY - this.hoopPos.y) < 0.15;
      } else if (this.perspective === 'side-right') {
        in3PtRange = distToHoop > width * this.courtLines.threePtRadius;
        inPaint = normalizedAnkleX > (1 - this.courtLines.keyWidth) && 
                  Math.abs(normalizedAnkleY - this.hoopPos.y) < 0.15;
      }

      const oobXPadding = this.courtLines.sidelinePadding;
      const oobYPadding = this.courtLines.baselineY;
      
      isOutOfBounds = normalizedAnkleX < oobXPadding || 
                      normalizedAnkleX > (1 - oobXPadding) || 
                      normalizedAnkleY < oobYPadding || 
                      normalizedAnkleY > this.courtLines.outOfBounds;
    }

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

    const currentMetrics = {
      elbowAngle: Math.round(elbowAngle),
      kneeAngle: Math.round(kneeAngle),
      shoulderLevel: shoulder ? Math.round(shoulder.y) : 0,
      isShooting,
      isDribbling,
      ballDetected,
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
