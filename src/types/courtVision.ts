export type Point2D = { x: number; y: number };

export type CourtShotZone = "near" | "midRange" | "threePoint" | "unknown";

export type CourtScanResult = {
  width: number;
  height: number;
  hoop: { detected: boolean; confidence: number; position: Point2D };
  player: { detected: boolean; confidence: number; center?: Point2D; bounds?: DOMRectLike };
  ball: { detected: boolean; confidence: number; position?: Point2D; velocity?: Point2D; trail: Point2D[] };
  shotZone: CourtShotZone;
  cameraStatus: "good" | "tooClose" | "tooDark" | "unstable" | "unknown";
  message: string;
};

export type DOMRectLike = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CourtOverlayOptions = {
  showDebug?: boolean;
  timestamp?: number;
};
