#!/usr/bin/env python3
"""Atualiza o resumo consolidado do Drive a partir dos *_metrics.json."""

from __future__ import annotations

import argparse
import csv
import json
import statistics
from pathlib import Path
from typing import Any


def _num(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _quantile(values: list[float], q: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    pos = (len(ordered) - 1) * q
    lo = int(pos)
    hi = min(lo + 1, len(ordered) - 1)
    frac = pos - lo
    return ordered[lo] * (1 - frac) + ordered[hi] * frac


def _apply_metrics(row: dict, metrics_payload: dict) -> None:
    metrics = metrics_payload.get("metrics", {})
    combined = metrics.get("combined", {})
    left = metrics.get("left", {})
    right = metrics.get("right", {})
    duration = combined.get("duration_ms", {})
    completeness = combined.get("completeness", {})
    clinical = combined.get("clinical_counts", {})
    metadata = combined.get("metadata", {})
    processing = metrics_payload.get("processing_info", {})
    video_info = metrics_payload.get("video_info", {})

    row["fps"] = video_info.get("fps", metadata.get("fps", row.get("fps")))
    row["duration_seconds"] = video_info.get(
        "duration_seconds",
        metadata.get("duration_seconds", row.get("duration_seconds")),
    )
    row["frames_processed"] = processing.get("frames_processed", row.get("frames_processed"))
    row["detections"] = processing.get("detections", row.get("detections"))
    frames_processed = _num(row.get("frames_processed"))
    row["detection_ratio"] = _num(row.get("detections")) / frames_processed if frames_processed else 0.0
    row["total_blinks"] = combined.get("total_blinks", row.get("total_blinks"))
    row["left_blinks"] = left.get("total_blinks", row.get("left_blinks"))
    row["right_blinks"] = right.get("total_blinks", row.get("right_blinks"))
    row["blink_rate_per_minute"] = combined.get(
        "blink_rate_per_minute",
        row.get("blink_rate_per_minute"),
    )
    row["mean_duration_ms"] = duration.get("mean", row.get("mean_duration_ms"))
    row["mean_completeness"] = completeness.get("mean", row.get("mean_completeness"))
    row["complete_blinks"] = combined.get("complete_blinks", row.get("complete_blinks"))
    row["incomplete_blinks"] = combined.get("incomplete_blinks", row.get("incomplete_blinks"))
    row["bilateral_blinks"] = clinical.get("bilateral_blinks", 0)
    row["unilateral_left_blinks"] = clinical.get("unilateral_left_blinks", 0)
    row["unilateral_right_blinks"] = clinical.get("unilateral_right_blinks", 0)
    row["raw_eye_blinks"] = clinical.get(
        "raw_eye_blinks",
        _num(row.get("left_blinks")) + _num(row.get("right_blinks")),
    )
    row["bilateral_symmetric_blinks"] = clinical.get("bilateral_symmetric_blinks", 0)
    row["left_dominant_blinks"] = clinical.get("left_dominant_blinks", 0)
    row["right_dominant_blinks"] = clinical.get("right_dominant_blinks", 0)
    row["recalculated_from_csv"] = bool(
        processing.get("metrics_recalculated_from_csv", row.get("recalculated_from_csv", False))
    )
    row["opening_method"] = processing.get("opening_method", row.get("opening_method"))


def update_summary(summary_path: Path) -> dict:
    payload = json.loads(summary_path.read_text(encoding="utf-8"))
    rows = payload["rows"]
    for row in rows:
        metrics_path = Path(row["metrics_file"])
        if not metrics_path.exists():
            continue
        _apply_metrics(row, json.loads(metrics_path.read_text(encoding="utf-8")))

    rates = [_num(row.get("blink_rate_per_minute")) for row in rows]
    counts = [int(_num(row.get("total_blinks"))) for row in rows]
    durations = [_num(row.get("duration_seconds")) for row in rows]
    elapsed = [_num(row.get("elapsed_seconds")) for row in rows]

    stats = payload.setdefault("stats", {})
    stats.update(
        {
            "videos_manifest": len(rows),
            "videos_with_metrics": len(rows),
            "missing_metrics": 0,
            "total_blinks": int(sum(counts)),
            "raw_eye_blinks": int(sum(int(_num(row.get("raw_eye_blinks"))) for row in rows)),
            "bilateral_blinks": int(sum(int(_num(row.get("bilateral_blinks"))) for row in rows)),
            "unilateral_left_blinks": int(sum(int(_num(row.get("unilateral_left_blinks"))) for row in rows)),
            "unilateral_right_blinks": int(sum(int(_num(row.get("unilateral_right_blinks"))) for row in rows)),
            "bilateral_symmetric_blinks": int(sum(int(_num(row.get("bilateral_symmetric_blinks"))) for row in rows)),
            "left_dominant_blinks": int(sum(int(_num(row.get("left_dominant_blinks"))) for row in rows)),
            "right_dominant_blinks": int(sum(int(_num(row.get("right_dominant_blinks"))) for row in rows)),
            "zero_count": sum(1 for count in counts if count == 0),
            "nonzero_count": sum(1 for count in counts if count > 0),
            "high_review_count": sum(
                1 for row in rows
                if _num(row.get("blink_rate_per_minute")) >= 30
                or int(_num(row.get("total_blinks"))) >= 100
            ),
            "low_detection_count": sum(1 for row in rows if _num(row.get("detection_ratio")) < 0.9),
            "duration_hours": sum(durations) / 3600.0,
            "processing_hours": sum(elapsed) / 3600.0,
            "median_rate": statistics.median(rates) if rates else 0,
            "mean_rate": statistics.mean(rates) if rates else 0,
            "median_blinks": statistics.median(counts) if counts else 0,
            "max_rate": max(rates) if rates else 0,
            "max_blinks": max(counts) if counts else 0,
            "q25_rate": _quantile(rates, 0.25),
            "q75_rate": _quantile(rates, 0.75),
            "q25_blinks": _quantile([float(count) for count in counts], 0.25),
            "q75_blinks": _quantile([float(count) for count in counts], 0.75),
        }
    )

    summary_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    csv_path = summary_path.with_suffix(".csv")
    if rows:
        with csv_path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
    return payload


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("summary_json", type=Path)
    args = parser.parse_args()
    payload = update_summary(args.summary_json)
    stats = payload["stats"]
    print(f"Vídeos: {stats['videos_with_metrics']}")
    print(f"Piscadas clínicas: {stats['total_blinks']}")
    print(f"Eventos crus por olho: {stats['raw_eye_blinks']}")
    print(f"Dominantes E/D: {stats.get('left_dominant_blinks', 0)}/{stats.get('right_dominant_blinks', 0)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
