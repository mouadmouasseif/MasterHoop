/// <reference lib="webworker" />

import type {
  OpenCVFrameResult,
  OpenCVWorkerRequest,
  OpenCVWorkerResponse,
} from "@/src/services/opencvWorkerTypes";

type OpenCVRuntime = typeof import("@techstark/opencv-js") & {
  onRuntimeInitialized?: () => void;
};

let runtimePromise: Promise<OpenCVRuntime> | null = null;
let previousGray: InstanceType<OpenCVRuntime["Mat"]> | null = null;

async function loadOpenCV(): Promise<OpenCVRuntime> {
  if (!runtimePromise) {
    runtimePromise = import("@techstark/opencv-js").then(async (module) => {
      const exported = "default" in module ? module.default : module;
      const candidate = await Promise.resolve(exported as unknown as OpenCVRuntime);
      if (candidate.Mat) return candidate;
      await new Promise<void>((resolve) => {
        candidate.onRuntimeInitialized = resolve;
      });
      return candidate;
    });
  }
  return runtimePromise;
}

function processFrame(cv: OpenCVRuntime, image: ImageData) {
  const source = cv.matFromImageData(image);
  const rgb = new cv.Mat();
  const lab = new cv.Mat();
  const enhancedLab = new cv.Mat();
  const enhancedRgb = new cv.Mat();
  const enhancedRgba = new cv.Mat();
  const gray = new cv.Mat();
  const laplacian = new cv.Mat();
  const mean = new cv.Mat();
  const deviation = new cv.Mat();
  const channels = new cv.MatVector();
  const outputChannels = new cv.MatVector();
  const enhancedLightness = new cv.Mat();
  const clahe = cv.createCLAHE(2.0, new cv.Size(8, 8));
  let warp: InstanceType<OpenCVRuntime["Mat"]> | null = null;
  let eccMask: InstanceType<OpenCVRuntime["Mat"]> | null = null;
  let output: InstanceType<OpenCVRuntime["Mat"]> = enhancedRgba;
  let stabilized = false;
  let cameraMotion = 0;

  try {
    cv.cvtColor(source, rgb, cv.COLOR_RGBA2RGB);
    cv.cvtColor(rgb, lab, cv.COLOR_RGB2Lab);
    cv.split(lab, channels);
    clahe.apply(channels.get(0), enhancedLightness);
    outputChannels.push_back(enhancedLightness);
    outputChannels.push_back(channels.get(1));
    outputChannels.push_back(channels.get(2));
    cv.merge(outputChannels, enhancedLab);
    cv.cvtColor(enhancedLab, enhancedRgb, cv.COLOR_Lab2RGB);
    cv.cvtColor(enhancedRgb, enhancedRgba, cv.COLOR_RGB2RGBA);
    cv.cvtColor(enhancedRgba, gray, cv.COLOR_RGBA2GRAY);

    cv.Laplacian(gray, laplacian, cv.CV_64F);
    cv.meanStdDev(laplacian, mean, deviation);
    const laplacianSharpness = Number(deviation.data64F[0] || 0);
    const contrastGain = calculateContrastGain(channels.get(0), enhancedLightness, cv);

    if (previousGray && previousGray.rows === gray.rows && previousGray.cols === gray.cols) {
      warp = cv.Mat.eye(2, 3, cv.CV_32F);
      eccMask = new cv.Mat();
      try {
        cv.findTransformECC(
          previousGray,
          gray,
          warp,
          cv.MOTION_EUCLIDEAN,
          new cv.TermCriteria(cv.TermCriteria_EPS | cv.TermCriteria_COUNT, 30, 0.001),
          eccMask,
        );
        const dx = Number(warp.data32F[2] || 0);
        const dy = Number(warp.data32F[5] || 0);
        cameraMotion = Number(Math.hypot(dx, dy).toFixed(2));
        const stabilizedFrame = new cv.Mat();
        cv.warpAffine(
          enhancedRgba,
          stabilizedFrame,
          warp,
          new cv.Size(enhancedRgba.cols, enhancedRgba.rows),
          cv.INTER_LINEAR | cv.WARP_INVERSE_MAP,
          cv.BORDER_REPLICATE,
        );
        output = stabilizedFrame;
        stabilized = true;
      } catch {
        stabilized = false;
      }
    }

    previousGray?.delete();
    previousGray = gray.clone();
    const outputData = new Uint8ClampedArray(output.data.length);
    outputData.set(output.data);
    const processedImage = new ImageData(outputData, output.cols, output.rows);
    const result: OpenCVFrameResult = {
      used: true,
      stabilized,
      cameraMotion,
      laplacianSharpness: Number(laplacianSharpness.toFixed(1)),
      contrastGain: Number(contrastGain.toFixed(1)),
    };
    return { image: processedImage, result };
  } finally {
    if (output !== enhancedRgba) output.delete();
    warp?.delete();
    eccMask?.delete();
    clahe.delete();
    source.delete();
    rgb.delete();
    lab.delete();
    enhancedLab.delete();
    enhancedRgb.delete();
    enhancedRgba.delete();
    gray.delete();
    laplacian.delete();
    mean.delete();
    deviation.delete();
    channels.delete();
    outputChannels.delete();
    enhancedLightness.delete();
  }
}

function calculateContrastGain(
  original: InstanceType<OpenCVRuntime["Mat"]>,
  enhanced: InstanceType<OpenCVRuntime["Mat"]>,
  cv: OpenCVRuntime,
) {
  const originalMean = new cv.Mat();
  const originalDeviation = new cv.Mat();
  const enhancedMean = new cv.Mat();
  const enhancedDeviation = new cv.Mat();
  try {
    cv.meanStdDev(original, originalMean, originalDeviation);
    cv.meanStdDev(enhanced, enhancedMean, enhancedDeviation);
    return Number(enhancedDeviation.data64F[0] || 0) - Number(originalDeviation.data64F[0] || 0);
  } finally {
    originalMean.delete();
    originalDeviation.delete();
    enhancedMean.delete();
    enhancedDeviation.delete();
  }
}

function respond(response: OpenCVWorkerResponse, transfer: Transferable[] = []) {
  self.postMessage(response, { transfer });
}

self.onmessage = async (event: MessageEvent<OpenCVWorkerRequest>) => {
  const request = event.data;
  try {
    if (request.type === "initialize") {
      await loadOpenCV();
      respond({ id: request.id, ok: true, type: "initialized" });
      return;
    }
    if (request.type === "dispose") {
      previousGray?.delete();
      previousGray = null;
      respond({ id: request.id, ok: true, type: "disposed" });
      return;
    }
    const cv = await loadOpenCV();
    const processed = processFrame(cv, request.image);
    respond(
      {
        id: request.id,
        ok: true,
        type: "processed",
        image: processed.image,
        result: processed.result,
      },
      [processed.image.data.buffer],
    );
  } catch (error) {
    respond({
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : "Erreur OpenCV dans le Web Worker.",
    });
  }
};

export {};
