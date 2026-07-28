export type OpenCVFrameResult = {
  used: boolean;
  stabilized: boolean;
  cameraMotion: number;
  laplacianSharpness: number;
  contrastGain: number;
};

export type OpenCVWorkerRequest =
  | { id: number; type: "initialize" }
  | { id: number; type: "process"; image: ImageData }
  | { id: number; type: "dispose" };

export type OpenCVWorkerResponse =
  | { id: number; ok: true; type: "initialized" | "disposed" }
  | {
      id: number;
      ok: true;
      type: "processed";
      image: ImageData;
      result: OpenCVFrameResult;
    }
  | { id: number; ok: false; error: string };
