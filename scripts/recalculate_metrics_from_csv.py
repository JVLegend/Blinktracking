#!/usr/bin/env python3
"""Recalcula aberturas e métricas a partir dos CSVs já extraídos."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from blinktracking.config import Config
from blinktracking.metrics import MetricsCalculator


def _comment_header(path: Path) -> list[str]:
    comments: list[str] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.startswith("#"):
                break
            comments.append(line)
    return comments


def _fps_from_csv(path: Path, df: pd.DataFrame, metrics_payload: dict) -> float:
    for line in _comment_header(path):
        if line.lower().startswith("# fps:"):
            try:
                fps = float(line.split(":", 1)[1].strip())
                if fps > 0:
                    return fps
            except ValueError:
                pass

    if "timestamp_ms" in df.columns and len(df) > 2:
        diffs = df["timestamp_ms"].diff().dropna()
        diffs = diffs[diffs > 0]
        if not diffs.empty:
            fps = 1000.0 / float(diffs.median())
            if fps > 0:
                return fps

    return float(metrics_payload.get("video_info", {}).get("fps") or 30.0)


def _opening_from_ear(df: pd.DataFrame, side: str, config: Config) -> pd.Series:
    eye = config.left_eye if side == "left" else config.right_eye
    ref = config.thresholds.ear_open_reference or 0.25
    required = [
        f"{side}_lower_0_x",
        f"{side}_lower_0_y",
        f"{side}_lower_{len(eye.lower) - 1}_x",
        f"{side}_lower_{len(eye.lower) - 1}_y",
        f"{side}_upper_2_x",
        f"{side}_upper_2_y",
        f"{side}_upper_4_x",
        f"{side}_upper_4_y",
        f"{side}_lower_3_x",
        f"{side}_lower_3_y",
        f"{side}_lower_5_x",
        f"{side}_lower_5_y",
    ]
    if any(column not in df.columns for column in required):
        return pd.Series(np.nan, index=df.index)

    lower_last = len(eye.lower) - 1
    horizontal = np.hypot(
        df[f"{side}_lower_0_x"] - df[f"{side}_lower_{lower_last}_x"],
        df[f"{side}_lower_0_y"] - df[f"{side}_lower_{lower_last}_y"],
    )
    vertical_1 = np.hypot(
        df[f"{side}_upper_2_x"] - df[f"{side}_lower_3_x"],
        df[f"{side}_upper_2_y"] - df[f"{side}_lower_3_y"],
    )
    vertical_2 = np.hypot(
        df[f"{side}_upper_4_x"] - df[f"{side}_lower_5_x"],
        df[f"{side}_upper_4_y"] - df[f"{side}_lower_5_y"],
    )
    vertical = (vertical_1 + vertical_2) / 2.0

    opening = (vertical / horizontal.replace(0, np.nan) / ref) * 100.0
    return opening.replace([np.inf, -np.inf], np.nan)


def _write_csv(path: Path, df: pd.DataFrame) -> None:
    comments = _comment_header(path)
    with path.open("w", encoding="utf-8", newline="") as handle:
        handle.writelines(comments)
        df.to_csv(handle, index=False)


def _metrics_from_openings(df: pd.DataFrame, fps: float, config: Config) -> dict:
    calc = MetricsCalculator(config)
    valid = df["opening_left"].notna() & df["opening_right"].notna()
    for left, right in df.loc[valid, ["opening_left", "opening_right"]].itertuples(index=False):
        calc.process_frame(float(left), float(right), fps=fps)
    metrics = calc.get_metrics()
    return {
        "left": metrics["left"].to_dict(),
        "right": metrics["right"].to_dict(),
        "combined": metrics["combined"].to_dict(),
    }


def _find_csvs(paths: Iterable[Path]) -> list[Path]:
    csvs: list[Path] = []
    for path in paths:
        if path.is_file() and path.suffix.lower() == ".csv":
            csvs.append(path)
        elif path.is_dir():
            csvs.extend(
                csv_path
                for csv_path in path.rglob("*.csv")
                if "_logs" not in csv_path.parts
            )
    return sorted(set(csvs))


def recalculate_csv(csv_path: Path, dry_run: bool = False) -> dict | None:
    metrics_path = csv_path.with_name(f"{csv_path.stem}_metrics.json")
    if not metrics_path.exists():
        return None

    config = Config()
    payload = json.loads(metrics_path.read_text(encoding="utf-8"))
    df = pd.read_csv(csv_path, comment="#")
    if "opening_left" not in df.columns or "opening_right" not in df.columns:
        return None

    old_total = payload.get("metrics", {}).get("combined", {}).get("total_blinks")
    fps = _fps_from_csv(csv_path, df, payload)
    df["opening_left"] = _opening_from_ear(df, "left", config)
    df["opening_right"] = _opening_from_ear(df, "right", config)
    payload["metrics"] = _metrics_from_openings(df, fps, config)
    payload.setdefault("processing_info", {})["metrics_recalculated_from_csv"] = True
    payload["processing_info"]["metrics_recalculated_at"] = datetime.now().isoformat()
    payload["processing_info"]["opening_method"] = "ear_6_point"

    new_total = payload["metrics"]["combined"]["total_blinks"]
    if not dry_run:
        _write_csv(csv_path, df)
        metrics_path.write_text(
            json.dumps(payload, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    return {
        "csv": str(csv_path),
        "old_total": old_total,
        "new_total": new_total,
        "left": payload["metrics"]["left"]["total_blinks"],
        "right": payload["metrics"]["right"]["total_blinks"],
        "fps": round(fps, 2),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="+", type=Path)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    results = [
        result
        for csv_path in _find_csvs(args.paths)
        if (result := recalculate_csv(csv_path, dry_run=args.dry_run)) is not None
    ]

    print("csv\told_total\tnew_total\tleft\tright\tfps")
    for result in results:
        print(
            f"{result['csv']}\t{result['old_total']}\t{result['new_total']}"
            f"\t{result['left']}\t{result['right']}\t{result['fps']}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
