import type { PoseMetrics } from "@/src/lib/poseDetection";
import type { ShotSequenceAnalysis } from "@/src/ai/types";
import {
  OpenCVFramePreprocessor,
  type OpenCVFrameResult,
} from "@/src/services/opencvPreprocessingService";

export type VideoQualityReport = {
  score: number;
  analysisPossible: boolean;
  width: number;
  height: number;
  duration: number;
  sampledFrames: number;
  poseFrames: number;
  ballFrames: number;
  brightness: number;
  contrast: number;
  sharpness: number;
  issues: string[];
  recommendations: string[];
  preprocessing: {
    engine: "opencv" | "canvas";
    stabilizedFrames: number;
    averageCameraMotion: number;
    laplacianSharpness: number;
    averageContrastGain: number;
  };
};

export type ExtractedVideoMetrics = {
  metrics: Partial<PoseMetrics> | null;
  quality: VideoQualityReport;
  shotAnalysis: ShotSequenceAnalysis;
};

type FrameVisualStats = {
  brightness: number;
  contrast: number;
  sharpness: number;
};

const SAMPLE_COUNT = 10;
const ANALYSIS_WIDTH = 640;

export async function extractVideoMetrics(file: File): Promise<ExtractedVideoMetrics> {
  const { video, url } = await loadVideo(file);
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, ANALYSIS_WIDTH / video.videoWidth);
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    URL.revokeObjectURL(url);
    throw new Error("Canvas 2D indisponible pour l’analyse vidéo.");
  }

  const visualStats: FrameVisualStats[] = [];
  const openCVStats: OpenCVFrameResult[] = [];
  const observedMetrics: PoseMetrics[] = [];
  const preprocessor = new OpenCVFramePreprocessor();

  try {
    let openCVReady = false;
    try {
      await preprocessor.initialize();
      openCVReady = true;
    } catch (error) {
      console.warn("OpenCV preprocessing unavailable, Canvas fallback enabled:", error);
    }
    const { PoseAnalyzer } = await import("@/src/lib/poseDetection");
    const analyzer = new PoseAnalyzer();
    await analyzer.initialize();
    const sampleTimes = buildSampleTimes(video.duration, SAMPLE_COUNT);

    const shootingCandidateTimes: number[] = [];
    for (const [index, time] of sampleTimes.entries()) {
      await seekVideo(video, time);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const originalImage = context.getImageData(0, 0, canvas.width, canvas.height);
      visualStats.push(
        calculateFrameVisualStats(originalImage),
      );
      if (openCVReady) {
        try {
          openCVStats.push(await preprocessor.process(canvas));
        } catch (error) {
          console.warn("OpenCV worker frame failed, original frame preserved:", error);
          openCVReady = false;
        }
      }

      const frameAnalysis = await analyzer.analyzeFrame(canvas, { frameIndex: index, timestampMs: time * 1000 });
      if (frameAnalysis?.metrics) {
        observedMetrics.push(frameAnalysis.metrics);
        if (frameAnalysis.metrics.isShooting) shootingCandidateTimes.push(time);
      }
    }

    if (shootingCandidateTimes.length) {
      analyzer.resetShotSequenceAnalysis();
      const denseTimes = buildDenseShotTimes(video.duration, shootingCandidateTimes);
      for (const [index, time] of denseTimes.entries()) {
        await seekVideo(video, time);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        await analyzer.analyzeFrame(canvas, { frameIndex: index, timestampMs: time * 1000 });
      }
    }

    const quality = buildQualityReport({
      width: video.videoWidth,
      height: video.videoHeight,
      duration: video.duration,
      visualStats,
      openCVStats,
      observedMetrics,
    });

    return {
      metrics: aggregatePoseMetrics(observedMetrics),
      quality,
      shotAnalysis: analyzer.getShotSequenceAnalysis(),
    };
  } finally {
    preprocessor.dispose();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

export function calculateFrameVisualStats(image: ImageData): FrameVisualStats {
  const pixels = image.data;
  const luminance = new Float32Array(image.width * image.height);
  let sum = 0;
  let sumSquares = 0;

  for (let pixel = 0, index = 0; pixel < pixels.length; pixel += 4, index += 1) {
    const value = pixels[pixel] * 0.2126 + pixels[pixel + 1] * 0.7152 + pixels[pixel + 2] * 0.0722;
    luminance[index] = value;
    sum += value;
    sumSquares += value * value;
  }

  const brightness = sum / luminance.length;
  const variance = Math.max(0, sumSquares / luminance.length - brightness * brightness);
  let edgeSum = 0;
  let edgeCount = 0;

  for (let y = 1; y < image.height; y += 2) {
    for (let x = 1; x < image.width; x += 2) {
      const index = y * image.width + x;
      edgeSum += Math.abs(luminance[index] - luminance[index - 1]);
      edgeSum += Math.abs(luminance[index] - luminance[index - image.width]);
      edgeCount += 2;
    }
  }

  return {
    brightness: Math.round(brightness),
    contrast: Math.round(Math.sqrt(variance)),
    sharpness: Math.round(edgeCount ? edgeSum / edgeCount : 0),
  };
}

function loadVideo(file: File) {
  return new Promise<{ video: HTMLVideoElement; url: string }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.onloadeddata = () => {
      if (!Number.isFinite(video.duration) || video.videoWidth === 0 || video.videoHeight === 0) {
        URL.revokeObjectURL(url);
        reject(new Error("Métadonnées vidéo invalides."));
        return;
      }
      resolve({ video, url });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de décoder cette vidéo."));
    };
    video.src = url;
  });
}

function seekVideo(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve, reject) => {
    if (Math.abs(video.currentTime - time) < 0.01 && video.readyState >= 2) {
      resolve();
      return;
    }
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Délai dépassé pendant l’extraction d’une image."));
    }, 8_000);
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("error", handleError);
    };
    const handleSeeked = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("Impossible d’extraire une image de la vidéo."));
    };
    video.addEventListener("seeked", handleSeeked, { once: true });
    video.addEventListener("error", handleError, { once: true });
    video.currentTime = time;
  });
}

function buildSampleTimes(duration: number, count: number) {
  const safeEnd = Math.max(0, duration - 0.05);
  if (duration <= 0.1) return [0];
  return Array.from({ length: count }, (_, index) =>
    Math.min(safeEnd, ((index + 1) / (count + 1)) * duration),
  );
}

export function buildDenseShotTimes(duration: number, candidates: number[]): number[] {
  const times = new Set<number>();
  for (const candidate of candidates.slice(0, 3)) {
    const start = Math.max(0, candidate - 1.2);
    const end = Math.min(Math.max(0, duration - 0.05), candidate + 1.8);
    for (let time = start; time <= end + 0.001; time += 0.1) {
      times.add(Number(time.toFixed(3)));
    }
  }
  return [...times].sort((left, right) => left - right).slice(0, 90);
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function averageMetric(metrics: PoseMetrics[], key: keyof PoseMetrics) {
  const values = metrics
    .map((metric) => metric[key])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0);
  return values.length ? average(values) : undefined;
}

function aggregatePoseMetrics(frames: PoseMetrics[]): Partial<PoseMetrics> | null {
  if (!frames.length) return null;
  const lastFrame = frames[frames.length - 1];
  return {
    elbowAngle: averageMetric(frames, "elbowAngle"),
    kneeAngle: averageMetric(frames, "kneeAngle"),
    shoulderLevel: averageMetric(frames, "shoulderLevel"),
    dribblePower: averageMetric(frames, "dribblePower"),
    dribbleRhythm: averageMetric(frames, "dribbleRhythm"),
    madeShots: Math.max(...frames.map((frame) => frame.madeShots || 0)),
    missedShots: Math.max(...frames.map((frame) => frame.missedShots || 0)),
    dribbleCount: Math.max(...frames.map((frame) => frame.dribbleCount || 0)),
    ballDetected: frames.some((frame) => frame.ballDetected),
    ballConfidence: averageMetric(frames, "ballConfidence"),
    ballDetectorSource:
      frames.find((frame) => frame.ballDetectorSource === "BasketMotion-Ai-model")?.ballDetectorSource ||
      "coco-ssd",
    ballPos: lastFrame.ballPos,
    ballVelocity: lastFrame.ballVelocity,
    isShooting: frames.some((frame) => frame.isShooting),
  };
}

function buildQualityReport(input: {
  width: number;
  height: number;
  duration: number;
  visualStats: FrameVisualStats[];
  openCVStats: OpenCVFrameResult[];
  observedMetrics: PoseMetrics[];
}): VideoQualityReport {
  const brightness = Math.round(average(input.visualStats.map((frame) => frame.brightness)));
  const contrast = Math.round(average(input.visualStats.map((frame) => frame.contrast)));
  const sharpness = Math.round(average(input.visualStats.map((frame) => frame.sharpness)));
  const poseFrames = input.observedMetrics.length;
  const ballFrames = input.observedMetrics.filter((frame) => frame.ballDetected).length;
  const openCVFrames = input.openCVStats.filter((frame) => frame.used);
  const laplacianSharpness = Math.round(average(openCVFrames.map((frame) => frame.laplacianSharpness)));
  const averageCameraMotion = Number(
    average(openCVFrames.map((frame) => frame.cameraMotion)).toFixed(2),
  );
  const issues: string[] = [];
  const recommendations: string[] = [];

  if (input.width < 640 || input.height < 360) {
    issues.push("Résolution trop faible.");
    recommendations.push("Utilisez une vidéo d’au moins 720p lorsque cela est possible.");
  }
  if (brightness < 55) {
    issues.push("Vidéo trop sombre.");
    recommendations.push("Améliorez l’éclairage du terrain.");
  } else if (brightness > 215) {
    issues.push("Vidéo surexposée.");
    recommendations.push("Évitez de filmer directement face à une source lumineuse.");
  }
  if (contrast < 22) {
    issues.push("Contraste insuffisant.");
    recommendations.push("Choisissez un arrière-plan qui distingue mieux le joueur.");
  }
  if ((openCVFrames.length && laplacianSharpness < 12) || (!openCVFrames.length && sharpness < 7)) {
    issues.push("Image floue ou trop peu détaillée.");
    recommendations.push("Stabilisez le téléphone et nettoyez l’objectif.");
  }
  if (poseFrames < Math.ceil(input.visualStats.length * 0.6)) {
    issues.push("Corps insuffisamment visible.");
    recommendations.push("Cadrez le corps entier pendant tout le mouvement.");
  }
  if (ballFrames < Math.ceil(input.visualStats.length * 0.3)) {
    issues.push("Ballon rarement détecté.");
    recommendations.push("Rapprochez la caméra ou améliorez le contraste du ballon.");
  }

  const resolutionScore = input.width >= 1280 && input.height >= 720 ? 100 : input.width >= 640 ? 70 : 35;
  const exposureScore = Math.max(0, 100 - Math.abs(130 - brightness) * 0.8);
  const contrastScore = Math.min(100, contrast * 2.5);
  const sharpnessScore = Math.min(100, sharpness * 7);
  const poseScore = input.visualStats.length ? (poseFrames / input.visualStats.length) * 100 : 0;
  const score = Math.round(
    resolutionScore * 0.15 +
      exposureScore * 0.2 +
      contrastScore * 0.15 +
      sharpnessScore * 0.15 +
      poseScore * 0.35,
  );

  return {
    score,
    analysisPossible: score >= 55 && poseFrames > 0,
    width: input.width,
    height: input.height,
    duration: Number(input.duration.toFixed(1)),
    sampledFrames: input.visualStats.length,
    poseFrames,
    ballFrames,
    brightness,
    contrast,
    sharpness,
    issues,
    recommendations,
    preprocessing: {
      engine: openCVFrames.length ? "opencv" : "canvas",
      stabilizedFrames: openCVFrames.filter((frame) => frame.stabilized).length,
      averageCameraMotion,
      laplacianSharpness,
      averageContrastGain: Number(
        average(openCVFrames.map((frame) => frame.contrastGain)).toFixed(1),
      ),
    },
  };
}
