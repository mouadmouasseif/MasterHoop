from __future__ import annotations

import argparse
from pathlib import Path

from ultralytics import YOLO


def main() -> None:
    parser = argparse.ArgumentParser(description="Exporte le meilleur modèle au format TensorFlow.js.")
    parser.add_argument("--weights", type=Path, default=Path("runs/basketball-detector/weights/best.pt"))
    parser.add_argument("--image-size", type=int, default=640)
    args = parser.parse_args()

    if not args.weights.exists():
        raise SystemExit(f"Poids absents: {args.weights}")
    model = YOLO(str(args.weights))
    output = model.export(format="tfjs", imgsz=args.image_size)
    print(f"Modèle exporté: {output}")


if __name__ == "__main__":
    main()
