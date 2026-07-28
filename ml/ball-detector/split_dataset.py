from __future__ import annotations

import argparse
import hashlib
import shutil
from pathlib import Path


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def split_for_video(video_id: str) -> str:
    bucket = int(hashlib.sha256(video_id.encode("utf-8")).hexdigest()[:8], 16) % 100
    if bucket < 70:
        return "train"
    if bucket < 85:
        return "val"
    return "test"


def main() -> None:
    parser = argparse.ArgumentParser(description="Découpe le dataset par vidéo, jamais par image.")
    parser.add_argument("--raw", type=Path, default=Path("dataset/raw"))
    parser.add_argument("--output", type=Path, default=Path("dataset"))
    args = parser.parse_args()

    source_images = args.raw / "images"
    source_labels = args.raw / "labels"
    copied = {"train": 0, "val": 0, "test": 0}

    for image in sorted(source_images.glob("*")):
        if image.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        label = source_labels / f"{image.stem}.txt"
        if not label.exists():
            continue
        video_id = image.stem.split("__frame-", 1)[0]
        split = split_for_video(video_id)
        image_destination = args.output / "images" / split / image.name
        label_destination = args.output / "labels" / split / label.name
        image_destination.parent.mkdir(parents=True, exist_ok=True)
        label_destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(image, image_destination)
        shutil.copy2(label, label_destination)
        copied[split] += 1

    print(copied)


if __name__ == "__main__":
    main()
