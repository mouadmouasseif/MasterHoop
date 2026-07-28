from __future__ import annotations

import argparse
import json
from pathlib import Path


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def validate_label(label_path: Path) -> list[str]:
    errors: list[str] = []
    for line_number, line in enumerate(label_path.read_text(encoding="utf-8").splitlines(), start=1):
        parts = line.split()
        if len(parts) != 5:
            errors.append(f"{label_path}:{line_number}: 5 valeurs attendues")
            continue
        try:
            class_id = int(parts[0])
            coordinates = [float(value) for value in parts[1:]]
        except ValueError:
            errors.append(f"{label_path}:{line_number}: valeurs non numériques")
            continue
        if class_id != 0:
            errors.append(f"{label_path}:{line_number}: seule la classe 0 est autorisée")
        if any(value < 0 or value > 1 for value in coordinates):
            errors.append(f"{label_path}:{line_number}: coordonnées hors de [0, 1]")
        if coordinates[2] <= 0 or coordinates[3] <= 0:
            errors.append(f"{label_path}:{line_number}: largeur/hauteur invalides")
    return errors


def main() -> None:
    parser = argparse.ArgumentParser(description="Valide les images et annotations YOLO.")
    parser.add_argument("--dataset", type=Path, default=Path("dataset"))
    args = parser.parse_args()

    errors: list[str] = []
    counts: dict[str, int] = {}
    for split in ("train", "val", "test"):
        image_dir = args.dataset / "images" / split
        label_dir = args.dataset / "labels" / split
        images = [path for path in image_dir.glob("*") if path.suffix.lower() in IMAGE_EXTENSIONS]
        counts[split] = len(images)
        for image in images:
            label = label_dir / f"{image.stem}.txt"
            if not label.exists():
                errors.append(f"Annotation absente: {image}")
            else:
                errors.extend(validate_label(label))

    report = {"images": counts, "errors": errors, "valid": not errors and counts.get("train", 0) > 0}
    print(json.dumps(report, indent=2, ensure_ascii=False))
    if not report["valid"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
