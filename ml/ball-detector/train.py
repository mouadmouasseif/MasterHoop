from __future__ import annotations

import argparse
from pathlib import Path

from ultralytics import YOLO


def main() -> None:
    parser = argparse.ArgumentParser(description="Entraîne le détecteur de ballon MasterHoop.")
    parser.add_argument("--base-model", default="yolo11n.pt")
    parser.add_argument("--epochs", type=int, default=80)
    parser.add_argument("--image-size", type=int, default=640)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--device", default="0")
    args = parser.parse_args()

    if not Path("dataset/images/train").exists():
        raise SystemExit("Dataset absent. Exécutez prepare_dataset.py, annotez, découpez et validez d'abord.")

    model = YOLO(args.base_model)
    model.train(
        data="data.yaml",
        epochs=args.epochs,
        imgsz=args.image_size,
        batch=args.batch,
        device=args.device,
        project="runs",
        name="basketball-detector",
        seed=42,
        deterministic=True,
        patience=20,
    )


if __name__ == "__main__":
    main()
