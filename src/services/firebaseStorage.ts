import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
  type UploadTaskSnapshot,
} from "firebase/storage";

import { storage } from "@/src/lib/firebase";

export type UploadProgressHandler = (progress: number, snapshot?: UploadTaskSnapshot) => void;

export function getVideoExtension(blob: Blob | File) {
  if (blob.type.includes("mp4")) return "mp4";
  if (blob.type.includes("quicktime")) return "mov";
  if (blob.type.includes("webm")) return "webm";
  return "webm";
}

export async function uploadPrivateFile(
  userId: string,
  sessionId: string,
  file: Blob | File,
  folder: "videos" | "thumbnails",
  onProgress?: UploadProgressHandler,
) {
  const extension = folder === "thumbnails" ? "jpg" : getVideoExtension(file);
  const fileRef = ref(storage, `users/${userId}/sessions/${sessionId}/${folder}/source.${extension}`);
  const task = uploadBytesResumable(fileRef, file, {
    contentType: file.type || (folder === "thumbnails" ? "image/jpeg" : "video/webm"),
    customMetadata: { ownerId: userId, sessionId },
  });

  return new Promise<string>((resolve, reject) => {
    task.on(
      "state_changed",
      (snapshot) => {
        const progress = snapshot.totalBytes
          ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          : 0;
        onProgress?.(progress, snapshot);
      },
      reject,
      async () => resolve(await getDownloadURL(task.snapshot.ref)),
    );
  });
}

export async function retryUploadPrivateFile(
  userId: string,
  sessionId: string,
  file: Blob | File,
  folder: "videos" | "thumbnails",
  onProgress?: UploadProgressHandler,
  retries = 2,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await uploadPrivateFile(userId, sessionId, file, folder, onProgress);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => window.setTimeout(resolve, 600 * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function generateVideoThumbnail(videoBlob: Blob | File): Promise<Blob | null> {
  const objectUrl = URL.createObjectURL(videoBlob);
  const video = document.createElement("video");
  video.src = objectUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        video.currentTime = Math.min(0.5, Math.max(0, (video.duration || 1) / 3));
      };
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error("Unable to load video thumbnail"));
    });

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.78);
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
