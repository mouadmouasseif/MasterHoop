from __future__ import annotations

import argparse
import json
from pathlib import Path


Box = tuple[float, float, float, float]


def xywh_to_xyxy(box: list[float]) -> Box:
    center_x, center_y, width, height = box
    return (
        center_x - width / 2,
        center_y - height / 2,
        center_x + width / 2,
        center_y + height / 2,
    )


def iou(left: Box, right: Box) -> float:
    intersection_width = max(0.0, min(left[2], right[2]) - max(left[0], right[0]))
    intersection_height = max(0.0, min(left[3], right[3]) - max(left[1], right[1]))
    intersection = intersection_width * intersection_height
    left_area = max(0.0, left[2] - left[0]) * max(0.0, left[3] - left[1])
    right_area = max(0.0, right[2] - right[0]) * max(0.0, right[3] - right[1])
    union = left_area + right_area - intersection
    return intersection / union if union else 0.0


def load_ground_truth(labels_dir: Path) -> dict[str, list[Box]]:
    ground_truth: dict[str, list[Box]] = {}
    for label in labels_dir.glob("*.txt"):
        boxes: list[Box] = []
        for line in label.read_text(encoding="utf-8").splitlines():
            values = line.split()
            if len(values) == 5 and values[0] == "0":
                boxes.append(xywh_to_xyxy([float(value) for value in values[1:]]))
        ground_truth[label.stem] = boxes
    return ground_truth


def evaluate(
    ground_truth: dict[str, list[Box]],
    predictions: dict,
    score_threshold: float,
    iou_threshold: float,
) -> dict[str, float | int]:
    true_positive = 0
    false_positive = 0
    false_negative = 0

    for image_id, expected in ground_truth.items():
        candidates = [
            item
            for item in predictions.get(image_id, [])
            if float(item.get("score", 0)) >= score_threshold
        ]
        candidates.sort(key=lambda item: float(item["score"]), reverse=True)
        unmatched = set(range(len(expected)))

        for candidate in candidates:
            predicted = xywh_to_xyxy(candidate["bbox"])
            matches = sorted(
                ((iou(predicted, expected[index]), index) for index in unmatched),
                reverse=True,
            )
            if matches and matches[0][0] >= iou_threshold:
                true_positive += 1
                unmatched.remove(matches[0][1])
            else:
                false_positive += 1
        false_negative += len(unmatched)

    precision = true_positive / (true_positive + false_positive) if true_positive + false_positive else 0
    recall = true_positive / (true_positive + false_negative) if true_positive + false_negative else 0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0
    return {
        "truePositive": true_positive,
        "falsePositive": false_positive,
        "falseNegative": false_negative,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare des prédictions avec les annotations de test.")
    parser.add_argument("--labels", type=Path, default=Path("dataset/labels/test"))
    parser.add_argument("--specialized", type=Path, required=True)
    parser.add_argument("--coco", type=Path, required=True)
    parser.add_argument("--score-threshold", type=float, default=0.35)
    parser.add_argument("--iou-threshold", type=float, default=0.5)
    args = parser.parse_args()

    ground_truth = load_ground_truth(args.labels)
    specialized = json.loads(args.specialized.read_text(encoding="utf-8"))
    coco = json.loads(args.coco.read_text(encoding="utf-8"))
    report = {
        "images": len(ground_truth),
        "scoreThreshold": args.score_threshold,
        "iouThreshold": args.iou_threshold,
        "masterHoop": evaluate(ground_truth, specialized, args.score_threshold, args.iou_threshold),
        "cocoSsd": evaluate(ground_truth, coco, args.score_threshold, args.iou_threshold),
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
