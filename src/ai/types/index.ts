export type MetricStatus = "measured" | "estimated" | "unavailable";

export interface MetricResult {
  value: number | null;
  unit?: string;
  confidence: number;
  source: string;
  status: MetricStatus;
  limitations?: string[];
}

export type AnalysisExecutionMode = "realtime" | "uploaded_video" | "offline" | "cloud";

export interface VisionModelAdapter<Input, Output> {
  id: string;
  version: string;
  load(): Promise<void>;
  isAvailable(): boolean;
  predict(input: Input): Promise<Output>;
  dispose(): Promise<void>;
}

export interface AnalysisEngineMetadata {
  engineVersion: string;
  poseModel: string;
  poseModelVersion?: string;
  ballModel: string;
  ballModelVersion?: string;
  courtModel?: string;
  preprocessingVersion: string;
  rulesVersion: string;
  createdAt: unknown;
}

export interface ModelRegistryEntry {
  id: string;
  name: string;
  task: string;
  version: string;
  format: "tfjs" | "onnx" | "tflite" | "other";
  url?: string;
  status: "testing" | "active" | "disabled" | "deprecated";
  evaluation?: {
    precision?: number;
    recall?: number;
    f1?: number;
    map?: number;
    inferenceMs?: number;
  };
  minimumAppVersion?: string;
  createdAt: unknown;
}

export type ModelLifecycleState = "idle" | "loading" | "ready" | "error" | "disabled";

export interface ModelStatus {
  id: string;
  state: ModelLifecycleState;
  version?: string;
  error?: string;
  loadedAt?: number;
}

export interface ModelManager {
  load(modelId: string): Promise<void>;
  unload(modelId: string): Promise<void>;
  preloadCriticalModels(): Promise<void>;
  getStatus(modelId: string): ModelStatus;
  clearModelCache(modelId?: string): Promise<void>;
}

export interface MediaValidationResult { valid: boolean; limitations: string[]; }
export interface QualityAssessment { score: number; confidence: number; accepted: boolean; limitations: string[]; }
export interface ProcessedFrame { frameIndex: number; timestampMs: number; source: CanvasImageSource; }
export interface Point2D { x: number; y: number; }
export interface PoseKeypointObservation extends Point2D { name: string; confidence: number; }
export interface PoseFrameObservation {
  frameIndex: number;
  timestampMs: number;
  width: number;
  height: number;
  confidence: number;
  keypoints: PoseKeypointObservation[];
}
export interface PoseSequence { frames: PoseFrameObservation[]; confidence: number; }
export interface BallTrack { detections: BallDetection[]; confidence: number; status: "tracked" | "predicted" | "lost"; }
export type CourtCalibrationStatus =
  | "calibrated"
  | "insufficient_points"
  | "invalid_geometry"
  | "low_confidence";

export type CourtCalibrationSource = "manual_reference" | "validated_vision_model";

export interface CourtCalibrationReference {
  id: string;
  imagePoint: Point2D;
  courtPointMeters: Point2D;
  confidence: number;
  source: CourtCalibrationSource;
}

export interface CourtGeometry {
  calibrationId: string;
  confidence: number;
  status: CourtCalibrationStatus;
  source: CourtCalibrationSource;
  homography: [number, number, number, number, number, number, number, number, number] | null;
  imageSize: { width: number; height: number };
  referenceCount: number;
  reprojectionErrorPx: number | null;
  coverage: number;
  basketCourtPointMeters?: Point2D;
  limitations: string[];
}
export interface MovementEvent { type: string; timestampMs: number; confidence: number; }
export type ShotPhase = "preparation" | "dip" | "upward_motion" | "release" | "flight" | "result" | "landing";
export type ShotType = "catch_and_shoot" | "pull_up" | "step_back" | "fadeaway" | "floater" | "layup" | "dunk" | "free_throw" | "hook_shot" | "unknown";
export type ShotOutcome = "made" | "missed" | "unknown";

export interface HoopFrameObservation {
  frameIndex: number;
  timestampMs: number;
  center: Point2D;
  rimWidthPx: number;
  confidence: number;
  observed: boolean;
  source: "manual_annotation" | "validated_vision_model";
}

export interface BallFrameObservation extends BallDetection {
  observed: boolean;
  velocity: Point2D;
  acceleration: Point2D;
}

export interface ShotFrameObservation extends PoseFrameObservation {
  ball: BallFrameObservation | null;
  hoop?: HoopFrameObservation | null;
  hasBall: boolean;
}

export interface ShotOutcomeObservation {
  outcome: ShotOutcome;
  confidence: number;
  status: "observed" | "unavailable";
  source: "ball_hoop_temporal_crossing" | "unavailable";
  evidenceFrameIndexes: number[];
  evidence: string[];
  limitations: string[];
}

export interface ShotTimelineEvent {
  id: string;
  phase: ShotPhase;
  frameIndex: number;
  timestampMs: number;
  confidence: number;
  status: "observed" | "estimated" | "unavailable";
  evidence: string[];
  limitations: string[];
}

export interface TrajectoryPoint extends Point2D {
  frameIndex: number;
  timestampMs: number;
  confidence: number;
  coordinateSpace: "normalized_2d";
}

export interface ShotTrajectoryReport {
  points: TrajectoryPoint[];
  releaseAngle: MetricResult;
  apexHeight: MetricResult;
  horizontalDisplacement: MetricResult;
  observedDuration: MetricResult;
  confidence: number;
  limitations: string[];
}

export interface BiomechanicalObservation {
  id: string;
  category: "balance" | "timing" | "stability" | "alignment";
  message: string;
  confidence: number;
  source: string;
  frameIndex?: number;
  limitations: string[];
}

export interface BiomechanicsReport {
  efficiency: MetricResult;
  balance: MetricResult;
  timing: MetricResult;
  powerTransfer: MetricResult;
  stability: MetricResult;
  observations: BiomechanicalObservation[];
  limitations: string[];
}

export interface AnalysisExplanation {
  subject: string;
  confidence: number;
  evidence: string[];
  limitations: string[];
}

export interface HighlightSegment {
  id: string;
  startMs: number;
  endMs: number;
  confidence: number;
  phases: ShotPhase[];
  source: "observed_timeline";
  evidenceEventIds: string[];
}

export interface ShotSequenceAnalysis {
  outcome: ShotOutcome;
  outcomeObservation: ShotOutcomeObservation;
  shotType: ShotType;
  courtCalibration: CourtGeometry | null;
  shotDistance: MetricResult;
  timeline: ShotTimelineEvent[];
  highlights: HighlightSegment[];
  trajectory: ShotTrajectoryReport;
  biomechanics: BiomechanicsReport;
  confidence: ConfidenceReport;
  explanations: AnalysisExplanation[];
  limitations: string[];
}

export interface ShotMetricComparison {
  key: "shotDistance" | "releaseAngle" | "balance" | "timing" | "stability";
  baseline: MetricResult;
  current: MetricResult;
  delta: MetricResult;
}

export interface ShotAnalysisComparison {
  status: "comparable" | "partial" | "unavailable";
  confidence: number;
  metrics: ShotMetricComparison[];
  limitations: string[];
}

export interface ShotAnalysis { outcome: ShotOutcome; confidence: number; metrics: Record<string, MetricResult>; }
export interface ConfidenceReport { global: number; metrics: Record<string, number>; limitations: string[]; }
export interface Recommendation { id: string; text: string; confidence: number; sources: string[]; }

export interface AnalysisPipeline {
  validateMedia(): Promise<MediaValidationResult>;
  assessQuality(): Promise<QualityAssessment>;
  preprocessFrames(): Promise<ProcessedFrame[]>;
  detectPose(): Promise<PoseSequence>;
  detectBall(): Promise<BallTrack>;
  detectCourt(): Promise<CourtGeometry | null>;
  recognizeMovements(): Promise<MovementEvent[]>;
  calculateBiomechanics(): Promise<BiomechanicsReport>;
  calculateShotMetrics(): Promise<ShotAnalysis[]>;
  calculateConfidence(): Promise<ConfidenceReport>;
  generateRecommendations(): Promise<Recommendation[]>;
  persist(): Promise<void>;
}

export interface BallDetection {
  frameIndex: number;
  timestampMs: number;
  bbox: { x: number; y: number; width: number; height: number };
  center: { x: number; y: number };
  confidence: number;
  detector: "BasketMotion-Ai" | "coco_ssd";
}

export interface BallSpinEstimate {
  rpm: number | null;
  confidence: number;
  method: "visual_feature_tracking" | "high_fps_texture_tracking" | "unavailable";
  experimental: true;
  limitations: string[];
}
