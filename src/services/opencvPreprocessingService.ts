import type {
  OpenCVFrameResult,
  OpenCVWorkerRequest,
  OpenCVWorkerResponse,
} from "@/src/services/opencvWorkerTypes";

export type { OpenCVFrameResult } from "@/src/services/opencvWorkerTypes";

type PendingRequest = {
  resolve: (response: OpenCVWorkerResponse) => void;
  reject: (error: Error) => void;
  timeout: number;
};

type OpenCVWorkerPayload =
  OpenCVWorkerRequest extends infer Request
    ? Request extends { id: number }
      ? Omit<Request, "id">
      : never
    : never;

const REQUEST_TIMEOUT = 45_000;

export class OpenCVFramePreprocessor {
  private worker: Worker | null = null;
  private requestId = 0;
  private pending = new Map<number, PendingRequest>();

  async initialize() {
    if (typeof Worker === "undefined") {
      throw new Error("Web Worker indisponible.");
    }
    this.worker = new Worker(
      new URL("../workers/opencvPreprocessing.worker.ts", import.meta.url),
      { type: "module", name: "masterhoop-opencv" },
    );
    this.worker.onmessage = (event: MessageEvent<OpenCVWorkerResponse>) => {
      const response = event.data;
      const request = this.pending.get(response.id);
      if (!request) return;
      window.clearTimeout(request.timeout);
      this.pending.delete(response.id);
      if (response.ok === true) request.resolve(response);
      else request.reject(new Error(response.error));
    };
    this.worker.onerror = () => {
      this.rejectAll(new Error("Le Web Worker OpenCV s’est arrêté."));
    };
    await this.send({ type: "initialize" });
  }

  async process(canvas: HTMLCanvasElement): Promise<OpenCVFrameResult> {
    if (!this.worker) {
      return { used: false, stabilized: false, cameraMotion: 0, laplacianSharpness: 0, contrastGain: 0 };
    }
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas 2D indisponible.");
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const response = await this.send({ type: "process", image }, [image.data.buffer]);
    if (!response.ok || response.type !== "processed") {
      throw new Error("Réponse OpenCV invalide.");
    }
    context.putImageData(response.image, 0, 0);
    return response.result;
  }

  dispose() {
    if (!this.worker) return;
    void this.send({ type: "dispose" }).finally(() => {
      this.worker?.terminate();
      this.worker = null;
      this.rejectAll(new Error("Web Worker OpenCV fermé."));
    });
  }

  private send(
    payload: OpenCVWorkerPayload,
    transfer: Transferable[] = [],
  ): Promise<OpenCVWorkerResponse> {
    if (!this.worker) return Promise.reject(new Error("Web Worker OpenCV non initialisé."));
    const id = ++this.requestId;
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("Délai dépassé dans le Web Worker OpenCV."));
      }, REQUEST_TIMEOUT);
      this.pending.set(id, { resolve, reject, timeout });
      this.worker?.postMessage({ ...payload, id } as OpenCVWorkerRequest, transfer);
    });
  }

  private rejectAll(error: Error) {
    for (const request of this.pending.values()) {
      window.clearTimeout(request.timeout);
      request.reject(error);
    }
    this.pending.clear();
  }
}
