from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from evaluate_predictions import evaluate, evaluate_conditions, passes_baseline


class EvaluatePredictionsTests(unittest.TestCase):
    def test_metrics_include_map_and_false_positives(self) -> None:
        ground_truth = {"frame-a": [(0.4, 0.4, 0.6, 0.6)]}
        predictions = {"frame-a": [{"bbox": [0.5, 0.5, 0.2, 0.2], "score": 0.9}]}
        report = evaluate(ground_truth, predictions, 0.35, 0.5)
        self.assertEqual(report["truePositive"], 1)
        self.assertEqual(report["falsePositive"], 0)
        self.assertEqual(report["map50"], 1.0)

    def test_conditions_are_reported_separately(self) -> None:
        ground_truth = {"dark": [(0.4, 0.4, 0.6, 0.6)], "bright": []}
        predictions = {"dark": [], "bright": []}
        result = evaluate_conditions(ground_truth, predictions, {"dark": "low_light", "bright": "daylight"}, 0.35, 0.5)
        self.assertEqual(result["low_light"]["detectionRate"], 0.0)
        self.assertEqual(result["daylight"]["images"], 1)

    def test_baseline_blocks_an_inferior_model(self) -> None:
        specialized = {"precision": 0.7, "recall": 0.6, "f1": 0.64, "map50": 0.55}
        coco = {"precision": 0.75, "recall": 0.65, "f1": 0.69, "map50": 0.5}
        config = {"minimumPrecisionVsCoco": 0, "minimumRecallVsCoco": 0, "minimumF1Improvement": 0.1, "minimumMap50": 0.5}
        deployable, reasons = passes_baseline(specialized, coco, {}, config)
        self.assertFalse(deployable)
        self.assertTrue(reasons)


if __name__ == "__main__":
    unittest.main()
