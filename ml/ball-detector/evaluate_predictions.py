from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


Box = tuple[float, float, float, float]


def xywh_to_xyxy(box: list[float]) -> Box:
    center_x, center_y, width, height = box
    return center_x - width / 2, center_y - height / 2, center_x + width / 2, center_y + height / 2


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


def evaluate(ground_truth: dict[str, list[Box]], predictions: dict[str, list[dict]], score_threshold: float, iou_threshold: float) -> dict[str, float | int]:
    true_positive = false_positive = false_negative = 0
    ranked: list[tuple[float, bool]] = []

    for image_id, expected in ground_truth.items():
        candidates = [item for item in predictions.get(image_id, []) if float(item.get("score", 0)) >= score_threshold]
        candidates.sort(key=lambda item: float(item["score"]), reverse=True)
        unmatched = set(range(len(expected)))
        for candidate in candidates:
            predicted = xywh_to_xyxy(candidate["bbox"])
            matches = sorted(((iou(predicted, expected[index]), index) for index in unmatched), reverse=True)
            matched = bool(matches and matches[0][0] >= iou_threshold)
            ranked.append((float(candidate["score"]), matched))
            if matched:
                true_positive += 1
                unmatched.remove(matches[0][1])
            else:
                false_positive += 1
        false_negative += len(unmatched)

    precision = true_positive / (true_positive + false_positive) if true_positive + false_positive else 0
    recall = true_positive / (true_positive + false_negative) if true_positive + false_negative else 0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0
    map50 = average_precision(ranked, sum(len(items) for items in ground_truth.values()))
    return {
        "truePositive": true_positive,
        "falsePositive": false_positive,
        "falseNegative": false_negative,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "map50": round(map50, 4),
    }


def average_precision(ranked: list[tuple[float, bool]], ground_truth_count: int) -> float:
    if ground_truth_count == 0:
        return 0.0
    true_positives = false_positives = 0
    points: list[tuple[float, float]] = []
    for _, matched in sorted(ranked, reverse=True):
        true_positives += int(matched)
        false_positives += int(not matched)
        points.append((true_positives / ground_truth_count, true_positives / (true_positives + false_positives)))
    return sum(max((precision for recall, precision in points if recall >= threshold), default=0.0) for threshold in [index / 100 for index in range(101)]) / 101


def evaluate_conditions(ground_truth: dict[str, list[Box]], predictions: dict[str, list[dict]], conditions: dict[str, str], score_threshold: float, iou_threshold: float) -> dict[str, dict[str, float | int]]:
    result: dict[str, dict[str, float | int]] = {}
    for condition in sorted(set(conditions.values())):
        ids = [image_id for image_id, value in conditions.items() if value == condition and image_id in ground_truth]
        subset = {image_id: ground_truth[image_id] for image_id in ids}
        metrics = evaluate(subset, predictions, score_threshold, iou_threshold)
        positives = sum(1 for image_id in ids if ground_truth[image_id])
        detected = sum(1 for image_id in ids if ground_truth[image_id] and predictions.get(image_id))
        result[condition] = {**metrics, "images": len(ids), "detectionRate": round(detected / positives, 4) if positives else 0.0}
    return result


def passes_baseline(specialized: dict[str, Any], coco: dict[str, Any], metadata: dict[str, Any], config: dict[str, Any]) -> tuple[bool, list[str]]:
    reasons: list[str] = []
    if specialized["precision"] < coco["precision"] + config.get("minimumPrecisionVsCoco", 0): reasons.append("precision sous le baseline")
    if specialized["recall"] < coco["recall"] + config.get("minimumRecallVsCoco", 0): reasons.append("rappel sous le baseline")
    if specialized["f1"] < coco["f1"] + config.get("minimumF1Improvement", 0): reasons.append("gain F1 insuffisant")
    if specialized["map50"] < config.get("minimumMap50", 0): reasons.append("mAP@0.50 insuffisante")
    if metadata.get("inferenceMs") is not None and metadata["inferenceMs"] > config.get("maximumInferenceMs", float("inf")): reasons.append("inférence trop lente")
    if metadata.get("modelSizeBytes") is not None and metadata["modelSizeBytes"] > config.get("maximumModelSizeBytes", float("inf")): reasons.append("modèle trop lourd")
    return not reasons, reasons


def load_json(path: Path | None, fallback: dict | None = None) -> dict:
    return json.loads(path.read_text(encoding="utf-8")) if path else (fallback or {})


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare le modèle spécialisé au baseline COCO-SSD.")
    parser.add_argument("--labels", type=Path, default=Path("dataset/labels/test"))
    parser.add_argument("--specialized", type=Path, required=True)
    parser.add_argument("--coco", type=Path, required=True)
    parser.add_argument("--specialized-metadata", type=Path)
    parser.add_argument("--conditions", type=Path)
    parser.add_argument("--baseline", type=Path, default=Path("configs/baseline.json"))
    parser.add_argument("--output", type=Path, default=Path("outputs/evaluation-report.json"))
    parser.add_argument("--score-threshold", type=float, default=0.35)
    parser.add_argument("--iou-threshold", type=float, default=0.5)
    args = parser.parse_args()

    ground_truth = load_ground_truth(args.labels)
    specialized_predictions = load_json(args.specialized)
    coco_predictions = load_json(args.coco)
    specialized = evaluate(ground_truth, specialized_predictions, args.score_threshold, args.iou_threshold)
    coco = evaluate(ground_truth, coco_predictions, args.score_threshold, args.iou_threshold)
    metadata = load_json(args.specialized_metadata)
    deployable, reasons = passes_baseline(specialized, coco, metadata, load_json(args.baseline))
    report = {
        "images": len(ground_truth), "scoreThreshold": args.score_threshold, "iouThreshold": args.iou_threshold,
        "BasketMotion-Ai": specialized, "cocoSsd": coco, "metadata": metadata,
        "byCondition": evaluate_conditions(ground_truth, specialized_predictions, load_json(args.conditions), args.score_threshold, args.iou_threshold) if args.conditions else {},
        "deployable": deployable, "deploymentBlockers": reasons,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))
    if not deployable:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
