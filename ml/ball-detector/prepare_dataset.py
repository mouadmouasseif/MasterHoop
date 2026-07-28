from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2


VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv"}


def load_authorized_videos(manifest_path: Path) -> dict[str, dict]:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    authorized: dict[str, dict] = {}
    for item in manifest.get("videos", []):
        if item.get("allowsModelTraining") is True and item.get("consentId"):
            authorized[item["file"]] = item
    return authorized


def extract_video(video_path: Path, output_dir: Path, fps: float) -> int:
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise RuntimeError(f"Impossible d'ouvrir {video_path.name}")

    source_fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
    interval = max(1, round(source_fps / fps))
    frame_index = 0
    saved = 0
    video_id = video_path.stem.replace(" ", "-").lower()

    while True:
        ok, frame = capture.read()
        if not ok:
            break
        if frame_index % interval == 0:
            destination = output_dir / f"{video_id}__frame-{frame_index:07d}.jpg"
            cv2.imwrite(str(destination), frame, [cv2.IMWRITE_JPEG_QUALITY, 92])
            saved += 1
        frame_index += 1

    capture.release()
    return saved


def main() -> None:
    parser = argparse.ArgumentParser(description="Extrait des images de vidéos autorisées.")
    parser.add_argument("--videos", type=Path, required=True)
    parser.add_argument("--consent", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("dataset/raw/images"))
    parser.add_argument("--fps", type=float, default=2.0)
    args = parser.parse_args()

    if not 0.1 <= args.fps <= 10:
        raise SystemExit("--fps doit être compris entre 0.1 et 10.")

    authorized = load_authorized_videos(args.consent)
    args.output.mkdir(parents=True, exist_ok=True)
    extracted = 0
    skipped: list[str] = []

    for video in sorted(args.videos.iterdir()):
        if video.suffix.lower() not in VIDEO_EXTENSIONS:
            continue
        if video.name not in authorized:
            skipped.append(video.name)
            continue
        extracted += extract_video(video, args.output, args.fps)

    print(json.dumps({"framesExtracted": extracted, "videosSkippedWithoutConsent": skipped}, indent=2))


if __name__ == "__main__":
    main()
