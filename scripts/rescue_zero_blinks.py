#!/usr/bin/env python3
"""Reprocessa vídeos zerados e salva candidatos de piscada com limiares relaxados."""

from __future__ import annotations

import argparse
import csv
import html
import json
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from blinktracking.config import Config
from scripts.process_rclone_manifest import process_item, read_manifest
from scripts.recalculate_metrics_from_csv import recalculate_csv


@dataclass
class EyeRun:
    eye: str
    ratio: float
    start_frame: int
    end_frame: int
    start_time_ms: float
    end_time_ms: float
    duration_ms: float
    baseline_opening: float
    min_opening: float
    source: str = "threshold_run"

    @property
    def depth_percent(self) -> float:
        if self.baseline_opening <= 0:
            return 0.0
        return float(np.clip((1.0 - self.min_opening / self.baseline_opening) * 100.0, 0, 100))


@dataclass
class QualityContext:
    events: list[tuple[float, str]]
    chronic_closed_eyes: dict[str, bool]
    tracking_loss_ratio: float


def _load_zero_rows(summary_path: Path) -> list[dict]:
    payload = json.loads(summary_path.read_text(encoding="utf-8"))
    return [row for row in payload["rows"] if row.get("total_blinks", 0) == 0]


def _write_manifest(rows: list[dict], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "\n".join(row["remote_path"] for row in rows) + "\n",
        encoding="utf-8",
    )


def _fps_from_csv(df: pd.DataFrame, fallback: float) -> float:
    if "timestamp_ms" in df.columns and len(df) > 2:
        diffs = df["timestamp_ms"].diff().dropna()
        diffs = diffs[diffs > 0]
        if not diffs.empty:
            fps = 1000.0 / float(diffs.median())
            if fps > 0:
                return fps
    return fallback if fallback > 0 else 30.0


def _find_output_csv(output_dir: Path) -> Path | None:
    csvs = [path for path in output_dir.glob("*.csv") if not path.name.startswith("_")]
    return csvs[0] if csvs else None


def _find_metrics_json(output_dir: Path) -> Path | None:
    metrics = list(output_dir.glob("*_metrics.json"))
    return metrics[0] if metrics else None


def _runs_for_eye(
    df: pd.DataFrame,
    eye: str,
    fps: float,
    *,
    ratio: float,
    min_duration_ms: float,
    max_duration_ms: float,
    baseline_quantile: float,
) -> list[EyeRun]:
    opening_col = f"opening_{eye}"
    if opening_col not in df.columns:
        return []

    values = df[opening_col].to_numpy(dtype=float)
    valid_values = values[np.isfinite(values)]
    if valid_values.size < 10:
        return []

    baseline = float(np.nanpercentile(valid_values, baseline_quantile))
    if baseline <= 0:
        return []

    frame_values = (
        df["frame"].to_numpy(dtype=int)
        if "frame" in df.columns
        else np.arange(1, len(values) + 1, dtype=int)
    )
    timestamps = (
        df["timestamp_ms"].to_numpy(dtype=float)
        if "timestamp_ms" in df.columns
        else frame_values * (1000.0 / fps)
    )
    threshold = baseline * ratio
    mask = np.isfinite(values) & (values < threshold)
    runs: list[EyeRun] = []
    i = 0
    while i < len(mask):
        if not mask[i]:
            i += 1
            continue
        j = i + 1
        while j < len(mask) and mask[j]:
            j += 1

        start_time = float(timestamps[i])
        end_time = float(timestamps[j - 1])
        duration = max(0.0, end_time - start_time + (1000.0 / fps))
        min_opening = float(np.nanmin(values[i:j]))
        if min_duration_ms <= duration <= max_duration_ms:
            runs.append(
                EyeRun(
                    eye=eye,
                    ratio=ratio,
                    start_frame=int(frame_values[i]),
                    end_frame=int(frame_values[j - 1]),
                    start_time_ms=start_time,
                    end_time_ms=end_time,
                    duration_ms=duration,
                    baseline_opening=baseline,
                    min_opening=min_opening,
                )
            )
        i = j
    return runs


def _frame_arrays(df: pd.DataFrame, fps: float) -> tuple[np.ndarray, np.ndarray]:
    frame_values = (
        df["frame"].to_numpy(dtype=int)
        if "frame" in df.columns
        else np.arange(1, len(df) + 1, dtype=int)
    )
    timestamps = (
        df["timestamp_ms"].to_numpy(dtype=float)
        if "timestamp_ms" in df.columns
        else frame_values * (1000.0 / fps)
    )
    return frame_values, timestamps


def _robust_threshold(values: np.ndarray, *, floor: float, multiplier: float = 8.0) -> float:
    finite = values[np.isfinite(values)]
    if finite.size == 0:
        return floor
    median = float(np.nanmedian(finite))
    mad = float(np.nanmedian(np.abs(finite - median)))
    return max(floor, median + multiplier * max(mad, 1e-6))


def _eye_center(df: pd.DataFrame, eye: str) -> np.ndarray | None:
    x_cols = [col for col in df.columns if col.startswith(f"{eye}_") and col.endswith("_x")]
    y_cols = [col for col in df.columns if col.startswith(f"{eye}_") and col.endswith("_y")]
    if not x_cols or not y_cols:
        return None
    x = df[x_cols].to_numpy(dtype=float)
    y = df[y_cols].to_numpy(dtype=float)
    return np.column_stack((np.nanmean(x, axis=1), np.nanmean(y, axis=1)))


def _quality_context(df: pd.DataFrame, fps: float) -> QualityContext:
    _, timestamps = _frame_arrays(df, fps)
    events: list[tuple[float, str]] = []

    if len(timestamps) > 2:
        dt = np.diff(timestamps)
        positive_dt = dt[np.isfinite(dt) & (dt > 0)]
        expected_dt = float(np.nanmedian(positive_dt)) if positive_dt.size else 1000.0 / fps
        for idx in np.where(dt > expected_dt * 2.5)[0]:
            events.append((float(timestamps[idx + 1]), "tracking_gap"))

    for eye in ("left", "right"):
        col = f"opening_{eye}"
        if col not in df.columns:
            continue
        values = df[col].to_numpy(dtype=float)
        diffs = np.abs(np.diff(values))
        threshold = _robust_threshold(diffs, floor=12.0, multiplier=7.0)
        for idx in np.where(diffs > threshold)[0]:
            events.append((float(timestamps[idx + 1]), f"{eye}_opening_jump"))

    left_center = _eye_center(df, "left")
    right_center = _eye_center(df, "right")
    if left_center is not None and right_center is not None and len(left_center) > 2:
        face_scale = np.linalg.norm(left_center - right_center, axis=1)
        valid_scale = np.isfinite(face_scale) & (face_scale > 1)
        if valid_scale.any():
            center = (left_center + right_center) / 2.0
            motion = np.linalg.norm(np.diff(center, axis=0), axis=1)
            scale_ref = np.nanmedian(face_scale[valid_scale])
            normalized_motion = motion / max(float(scale_ref), 1.0)
            motion_threshold = _robust_threshold(normalized_motion, floor=0.06, multiplier=6.0)
            for idx in np.where(normalized_motion > motion_threshold)[0]:
                events.append((float(timestamps[idx + 1]), "camera_shake"))

            scale_change = np.abs(np.diff(face_scale)) / np.maximum(face_scale[:-1], 1.0)
            scale_threshold = _robust_threshold(scale_change, floor=0.08, multiplier=6.0)
            for idx in np.where(scale_change > scale_threshold)[0]:
                events.append((float(timestamps[idx + 1]), "scale_jump"))

    chronic_closed_eyes: dict[str, bool] = {"left": False, "right": False}
    openings: dict[str, np.ndarray] = {}
    for eye in ("left", "right"):
        col = f"opening_{eye}"
        if col in df.columns:
            values = df[col].to_numpy(dtype=float)
            openings[eye] = values[np.isfinite(values)]
    if all(eye in openings and openings[eye].size >= 20 for eye in ("left", "right")):
        stats = {
            eye: {
                "median": float(np.nanmedian(openings[eye])),
                "p90": float(np.nanpercentile(openings[eye], 90)),
            }
            for eye in ("left", "right")
        }
        for eye, other in (("left", "right"), ("right", "left")):
            chronic_closed_eyes[eye] = (
                stats[eye]["p90"] <= stats[other]["p90"] - 4.0
                and stats[eye]["median"] <= stats[other]["median"] - 3.0
            )

    tracked_cols = [col for col in ("opening_left", "opening_right") if col in df.columns]
    if tracked_cols:
        tracked = df[tracked_cols].notna().all(axis=1)
        tracking_loss_ratio = 1.0 - float(tracked.mean())
    else:
        tracking_loss_ratio = 1.0

    return QualityContext(
        events=sorted(events, key=lambda item: item[0]),
        chronic_closed_eyes=chronic_closed_eyes,
        tracking_loss_ratio=tracking_loss_ratio,
    )


def _quality_flags_near(
    context: QualityContext,
    start_time_ms: float,
    end_time_ms: float,
    *,
    buffer_ms: float = 250.0,
) -> list[str]:
    flags = {
        flag
        for event_time, flag in context.events
        if start_time_ms - buffer_ms <= event_time <= end_time_ms + buffer_ms
    }
    return sorted(flags)


def _nearest_quality_distance_ms(context: QualityContext, start_time_ms: float, end_time_ms: float) -> float | None:
    if not context.events:
        return None
    center = (start_time_ms + end_time_ms) / 2.0
    return min(abs(center - event_time) for event_time, _ in context.events)


def _local_minima_runs_for_eye(
    df: pd.DataFrame,
    eye: str,
    fps: float,
    *,
    min_duration_ms: float,
    max_duration_ms: float,
    baseline_quantile: float,
    min_prominence_percent: float,
) -> list[EyeRun]:
    opening_col = f"opening_{eye}"
    if opening_col not in df.columns:
        return []

    values = df[opening_col].to_numpy(dtype=float)
    valid_values = values[np.isfinite(values)]
    if valid_values.size < 10:
        return []

    frame_values, timestamps = _frame_arrays(df, fps)
    smooth = (
        pd.Series(values)
        .interpolate(limit_direction="both")
        .rolling(window=3, center=True, min_periods=1)
        .mean()
        .to_numpy(dtype=float)
    )
    global_baseline = float(np.nanpercentile(valid_values, baseline_quantile))
    if global_baseline <= 0:
        return []

    search_radius = max(2, int(round(fps * 0.12)))
    baseline_radius = max(search_radius + 1, int(round(fps * 0.75)))
    runs: list[EyeRun] = []
    i = search_radius
    while i < len(smooth) - search_radius:
        value = smooth[i]
        if not np.isfinite(value):
            i += 1
            continue

        local_window = smooth[i - search_radius : i + search_radius + 1]
        if value > np.nanmin(local_window):
            i += 1
            continue

        left_base = smooth[max(0, i - baseline_radius) : max(0, i - search_radius)]
        right_base = smooth[min(len(smooth), i + search_radius + 1) : min(len(smooth), i + baseline_radius + 1)]
        local_base_values = np.concatenate(
            [arr[np.isfinite(arr)] for arr in (left_base, right_base) if arr.size]
        )
        if local_base_values.size < 3:
            i += 1
            continue

        local_baseline = max(global_baseline, float(np.nanpercentile(local_base_values, 80)))
        if local_baseline <= 0:
            i += 1
            continue

        prominence = (1.0 - value / local_baseline) * 100.0
        if prominence < min_prominence_percent:
            i += 1
            continue

        half_level = value + (local_baseline - value) * 0.45
        start = i
        while start > 0 and np.isfinite(smooth[start - 1]) and smooth[start - 1] < half_level:
            start -= 1
        end = i
        while end + 1 < len(smooth) and np.isfinite(smooth[end + 1]) and smooth[end + 1] < half_level:
            end += 1

        duration = max(0.0, float(timestamps[end] - timestamps[start] + (1000.0 / fps)))
        if min_duration_ms <= duration <= max_duration_ms:
            runs.append(
                EyeRun(
                    eye=eye,
                    ratio=0.0,
                    start_frame=int(frame_values[start]),
                    end_frame=int(frame_values[end]),
                    start_time_ms=float(timestamps[start]),
                    end_time_ms=float(timestamps[end]),
                    duration_ms=duration,
                    baseline_opening=local_baseline,
                    min_opening=float(value),
                    source="local_minimum",
                )
            )
            i = end + search_radius + 1
        else:
            i += 1
    return runs


def _overlap_ms(a: EyeRun, b: EyeRun, tolerance_ms: float) -> float:
    start = max(a.start_time_ms, b.start_time_ms - tolerance_ms)
    end = min(a.end_time_ms, b.end_time_ms + tolerance_ms)
    return max(0.0, end - start)


def _merge_candidates(
    left_runs: list[EyeRun],
    right_runs: list[EyeRun],
    *,
    onset_tolerance_ms: float,
    dominance_margin_percent: float = 1.5,
) -> list[dict]:
    candidates: list[dict] = []
    used_right: set[int] = set()
    blink_id = 1

    for left in left_runs:
        best_idx = None
        best_score = -1.0
        for idx, right in enumerate(right_runs):
            if idx in used_right:
                continue
            onset_delta = abs(left.start_time_ms - right.start_time_ms)
            overlap = _overlap_ms(left, right, onset_tolerance_ms)
            if onset_delta <= onset_tolerance_ms or overlap > 0:
                score = overlap - onset_delta * 0.01
                if score > best_score:
                    best_score = score
                    best_idx = idx

        if best_idx is not None:
            right = right_runs[best_idx]
            used_right.add(best_idx)
            start = min(left.start_time_ms, right.start_time_ms)
            end = max(left.end_time_ms, right.end_time_ms)
            lateral_classification = _lateral_classification(
                left.depth_percent,
                right.depth_percent,
                dominance_margin_percent,
            )
            candidates.append(
                {
                    "blink_id": blink_id,
                    "classification": "bilateral_candidate",
                    "lateral_classification": lateral_classification,
                    "dominant_eye": _dominant_eye(lateral_classification),
                    "confidence": "medium",
                    "start_time_ms": round(start, 2),
                    "end_time_ms": round(end, 2),
                    "duration_ms": round(end - start, 2),
                    "left": _run_dict(left),
                    "right": _run_dict(right),
                }
            )
            blink_id += 1
        else:
            candidates.append(
                {
                    "blink_id": blink_id,
                    "classification": "unilateral_candidate",
                    "lateral_classification": "left_only_candidate",
                    "dominant_eye": "left",
                    "confidence": "low",
                    "start_time_ms": round(left.start_time_ms, 2),
                    "end_time_ms": round(left.end_time_ms, 2),
                    "duration_ms": round(left.duration_ms, 2),
                    "left": _run_dict(left),
                    "right": None,
                }
            )
            blink_id += 1

    for idx, right in enumerate(right_runs):
        if idx in used_right:
            continue
        candidates.append(
            {
                "blink_id": blink_id,
                "classification": "unilateral_candidate",
                "lateral_classification": "right_only_candidate",
                "dominant_eye": "right",
                "confidence": "low",
                "start_time_ms": round(right.start_time_ms, 2),
                "end_time_ms": round(right.end_time_ms, 2),
                "duration_ms": round(right.duration_ms, 2),
                "left": None,
                "right": _run_dict(right),
            }
        )
        blink_id += 1

    return sorted(candidates, key=lambda item: item["start_time_ms"])


def _lateral_classification(
    left_depth_percent: float,
    right_depth_percent: float,
    dominance_margin_percent: float,
) -> str:
    delta = left_depth_percent - right_depth_percent
    if delta >= dominance_margin_percent:
        return "left_dominant_candidate"
    if delta <= -dominance_margin_percent:
        return "right_dominant_candidate"
    return "bilateral_symmetric_candidate"


def _dominant_eye(lateral_classification: str) -> str:
    if lateral_classification.startswith("left"):
        return "left"
    if lateral_classification.startswith("right"):
        return "right"
    return "none"


def _candidate_overlap(a: dict, b: dict, tolerance_ms: float) -> float:
    start = max(float(a["start_time_ms"]), float(b["start_time_ms"]) - tolerance_ms)
    end = min(float(a["end_time_ms"]), float(b["end_time_ms"]) + tolerance_ms)
    return max(0.0, end - start)


def _combine_candidate_sets(
    primary: list[dict],
    fallback: list[dict],
    *,
    onset_tolerance_ms: float,
) -> list[dict]:
    """Adiciona candidatos do fallback sem duplicar eventos já detectados."""
    combined = list(primary)
    for candidate in fallback:
        is_duplicate = any(
            abs(float(candidate["start_time_ms"]) - float(existing["start_time_ms"])) <= onset_tolerance_ms
            or _candidate_overlap(candidate, existing, onset_tolerance_ms) > 0
            for existing in combined
        )
        if not is_duplicate:
            combined.append(candidate)

    combined = sorted(combined, key=lambda item: float(item["start_time_ms"]))
    for blink_id, candidate in enumerate(combined, 1):
        candidate["blink_id"] = blink_id
    return combined


def _run_dict(run: EyeRun) -> dict:
    return {
        "eye": run.eye,
        "source": run.source,
        "ratio": run.ratio,
        "start_frame": run.start_frame,
        "end_frame": run.end_frame,
        "start_time_ms": round(run.start_time_ms, 2),
        "end_time_ms": round(run.end_time_ms, 2),
        "duration_ms": round(run.duration_ms, 2),
        "baseline_opening": round(run.baseline_opening, 3),
        "min_opening": round(run.min_opening, 3),
        "depth_percent": round(run.depth_percent, 2),
    }


def _candidate_depths(candidate: dict) -> list[float]:
    depths: list[float] = []
    for side in ("left", "right"):
        run = candidate.get(side)
        if run:
            depths.append(float(run.get("depth_percent", 0.0)))
    return depths


def _candidate_sources(candidate: dict) -> list[str]:
    sources: set[str] = set()
    for side in ("left", "right"):
        run = candidate.get(side)
        if run:
            sources.add(str(run.get("source") or "threshold_run"))
    return sorted(sources)


def _score_candidates(candidates: list[dict], context: QualityContext) -> list[dict]:
    for candidate in candidates:
        depths = _candidate_depths(candidate)
        avg_depth = float(np.mean(depths)) if depths else 0.0
        max_depth = max(depths) if depths else 0.0
        duration = float(candidate.get("duration_ms", 0.0))
        is_bilateral = candidate.get("classification") == "bilateral_candidate"
        sources = _candidate_sources(candidate)
        quality_flags = _quality_flags_near(
            context,
            float(candidate["start_time_ms"]),
            float(candidate["end_time_ms"]),
        )
        nearest_artifact_ms = _nearest_quality_distance_ms(
            context,
            float(candidate["start_time_ms"]),
            float(candidate["end_time_ms"]),
        )

        score = 18.0
        if 100 <= duration <= 450:
            score += 18.0
        elif 70 <= duration <= 700:
            score += 10.0
        else:
            score += 3.0

        if max_depth >= 35:
            score += 22.0
        elif max_depth >= 25:
            score += 17.0
        elif max_depth >= 15:
            score += 11.0
        elif max_depth >= 8:
            score += 6.0

        score += 18.0 if is_bilateral else 7.0
        if is_bilateral and len(depths) == 2:
            delta = abs(depths[0] - depths[1])
            if delta <= 4:
                score += 12.0
            elif delta <= 10:
                score += 8.0
            else:
                score += 4.0

        if candidate.get("dominant_eye") in {"left", "right"}:
            score += 5.0
        if "threshold_run" in sources:
            score += 7.0
        if "local_minimum" in sources:
            score += 5.0

        chronic_hits = [
            eye
            for eye in ("left", "right")
            if candidate.get(eye) and context.chronic_closed_eyes.get(eye)
        ]
        if chronic_hits and "local_minimum" in sources:
            score += 7.0
        elif chronic_hits:
            score += 3.0

        high_artifact_flags = {"camera_shake", "scale_jump", "tracking_gap"}
        has_high_artifact = any(flag in quality_flags for flag in high_artifact_flags)
        if quality_flags:
            penalty = 45.0 if has_high_artifact else 18.0
            score -= penalty + min(12.0, 4.0 * (len(quality_flags) - 1))
            if has_high_artifact:
                score = min(score, 49.0)
        elif nearest_artifact_ms is not None and nearest_artifact_ms > 600:
            score += 5.0

        if context.tracking_loss_ratio > 0.10:
            score -= min(15.0, context.tracking_loss_ratio * 100.0)

        score = float(np.clip(score, 0, 100))
        if score >= 80:
            confidence = "high"
            review_priority = "review_first"
        elif score >= 55:
            confidence = "medium"
            review_priority = "review"
        else:
            confidence = "low"
            review_priority = "low_priority"

        if has_high_artifact:
            artifact_risk = "high"
        elif quality_flags:
            artifact_risk = "medium"
        else:
            artifact_risk = "low"

        candidate.update(
            {
                "confidence_score": round(score, 1),
                "confidence": confidence,
                "review_priority": review_priority,
                "artifact_risk": artifact_risk,
                "quality_flags": quality_flags,
                "nearest_artifact_ms": None if nearest_artifact_ms is None else round(nearest_artifact_ms, 1),
                "source": "+".join(sources),
                "max_depth_percent": round(max_depth, 2),
                "mean_depth_percent": round(avg_depth, 2),
                "chronic_closed_eye_context": chronic_hits,
            }
        )
    return sorted(candidates, key=lambda item: (-float(item.get("confidence_score", 0)), float(item["start_time_ms"])))


def _candidate_counts(candidates: list[dict]) -> dict[str, int | float]:
    scores = [float(item.get("confidence_score", 0.0)) for item in candidates]
    return {
        "candidate_count": len(candidates),
        "bilateral_candidate_count": sum(
            1 for item in candidates if item["classification"] == "bilateral_candidate"
        ),
        "unilateral_candidate_count": sum(
            1 for item in candidates if item["classification"] == "unilateral_candidate"
        ),
        "left_dominant_candidate_count": sum(
            1 for item in candidates if item.get("dominant_eye") == "left"
        ),
        "right_dominant_candidate_count": sum(
            1 for item in candidates if item.get("dominant_eye") == "right"
        ),
        "high_confidence_candidate_count": sum(
            1 for item in candidates if item.get("confidence") == "high"
        ),
        "artifact_risk_candidate_count": sum(
            1 for item in candidates if item.get("artifact_risk") in {"medium", "high"}
        ),
        "max_confidence_score": round(max(scores), 1) if scores else 0.0,
        "mean_confidence_score": round(float(np.mean(scores)), 1) if scores else 0.0,
    }


def detect_relaxed_candidates(
    df: pd.DataFrame,
    fps: float,
    *,
    ratio: float,
    fallback_ratio: float,
    min_duration_ms: float,
    max_duration_ms: float,
    onset_tolerance_ms: float,
    baseline_quantile: float,
    dominance_margin_percent: float,
    local_min_prominence_percent: float = 14.0,
    chronic_min_prominence_percent: float = 8.0,
) -> tuple[list[dict], float, QualityContext]:
    context = _quality_context(df, fps)
    left = _runs_for_eye(
        df,
        "left",
        fps,
        ratio=ratio,
        min_duration_ms=min_duration_ms,
        max_duration_ms=max_duration_ms,
        baseline_quantile=baseline_quantile,
    )
    right = _runs_for_eye(
        df,
        "right",
        fps,
        ratio=ratio,
        min_duration_ms=min_duration_ms,
        max_duration_ms=max_duration_ms,
        baseline_quantile=baseline_quantile,
    )
    primary_candidates = _merge_candidates(
        left,
        right,
        onset_tolerance_ms=onset_tolerance_ms,
        dominance_margin_percent=dominance_margin_percent,
    )
    candidates = primary_candidates
    ratio_used = ratio

    if fallback_ratio > ratio:
        left = _runs_for_eye(
            df,
            "left",
            fps,
            ratio=fallback_ratio,
            min_duration_ms=min_duration_ms,
            max_duration_ms=max_duration_ms,
            baseline_quantile=baseline_quantile,
        )
        right = _runs_for_eye(
            df,
            "right",
            fps,
            ratio=fallback_ratio,
            min_duration_ms=min_duration_ms,
            max_duration_ms=max_duration_ms,
            baseline_quantile=baseline_quantile,
        )
        fallback_candidates = _merge_candidates(
            left,
            right,
            onset_tolerance_ms=onset_tolerance_ms,
            dominance_margin_percent=dominance_margin_percent,
        )
        candidates = _combine_candidate_sets(
            primary=primary_candidates,
            fallback=fallback_candidates,
            onset_tolerance_ms=onset_tolerance_ms,
        )
        ratio_used = fallback_ratio

    left_prominence = (
        chronic_min_prominence_percent if context.chronic_closed_eyes.get("left") else local_min_prominence_percent
    )
    right_prominence = (
        chronic_min_prominence_percent if context.chronic_closed_eyes.get("right") else local_min_prominence_percent
    )
    local_left = _local_minima_runs_for_eye(
        df,
        "left",
        fps,
        min_duration_ms=min_duration_ms,
        max_duration_ms=max_duration_ms,
        baseline_quantile=baseline_quantile,
        min_prominence_percent=left_prominence,
    )
    local_right = _local_minima_runs_for_eye(
        df,
        "right",
        fps,
        min_duration_ms=min_duration_ms,
        max_duration_ms=max_duration_ms,
        baseline_quantile=baseline_quantile,
        min_prominence_percent=right_prominence,
    )
    local_candidates = _merge_candidates(
        local_left,
        local_right,
        onset_tolerance_ms=onset_tolerance_ms,
        dominance_margin_percent=dominance_margin_percent,
    )
    candidates = _combine_candidate_sets(
        primary=candidates,
        fallback=local_candidates,
        onset_tolerance_ms=onset_tolerance_ms,
    )
    candidates = _score_candidates(candidates, context)
    for blink_id, candidate in enumerate(sorted(candidates, key=lambda item: float(item["start_time_ms"])), 1):
        candidate["blink_id"] = blink_id
    return candidates, ratio_used, context


def rescue_csv(
    csv_path: Path,
    metrics_path: Path,
    *,
    ratio: float,
    fallback_ratio: float,
    min_duration_ms: float,
    max_duration_ms: float,
    onset_tolerance_ms: float,
    baseline_quantile: float,
    dominance_margin_percent: float = 1.5,
) -> dict:
    payload = json.loads(metrics_path.read_text(encoding="utf-8"))
    df = pd.read_csv(csv_path, comment="#")
    fps = _fps_from_csv(df, float(payload.get("video_info", {}).get("fps") or 30.0))
    candidates, ratio_used, quality = detect_relaxed_candidates(
        df,
        fps,
        ratio=ratio,
        fallback_ratio=fallback_ratio,
        min_duration_ms=min_duration_ms,
        max_duration_ms=max_duration_ms,
        onset_tolerance_ms=onset_tolerance_ms,
        baseline_quantile=baseline_quantile,
        dominance_margin_percent=dominance_margin_percent,
    )
    counts = _candidate_counts(candidates)

    rescue = {
        "enabled": True,
        "requires_manual_review": True,
        "method": "relaxed_baseline_runs+local_minima+quality_score",
        "primary_ratio": ratio,
        "ratio_used": ratio_used,
        "fallback_ratio": fallback_ratio,
        "baseline_quantile": baseline_quantile,
        "dominance_margin_percent": dominance_margin_percent,
        "min_duration_ms": min_duration_ms,
        "max_duration_ms": max_duration_ms,
        "onset_tolerance_ms": onset_tolerance_ms,
        **counts,
        "quality_event_count": len(quality.events),
        "tracking_loss_ratio": round(quality.tracking_loss_ratio, 4),
        "chronic_closed_eyes": quality.chronic_closed_eyes,
        "candidates": candidates,
        "generated_at": datetime.now().isoformat(),
    }
    payload.setdefault("processing_info", {})["zero_blink_rescue"] = rescue
    metrics_path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return rescue


def _write_reports(results: list[dict], report_dir: Path) -> dict[str, Path]:
    report_dir.mkdir(parents=True, exist_ok=True)
    csv_path = report_dir / "zero_blink_rescue_report.csv"
    json_path = report_dir / "zero_blink_rescue_report.json"
    html_path = report_dir / "zero_blink_rescue_report.html"
    md_path = report_dir / "zero_blink_rescue_report.md"

    fields = [
        "idx",
        "remote_path",
        "status",
        "original_total_blinks",
        "reprocessed_total_blinks",
        "rescue_candidate_count",
        "bilateral_candidate_count",
        "unilateral_candidate_count",
        "left_dominant_candidate_count",
        "right_dominant_candidate_count",
        "high_confidence_candidate_count",
        "artifact_risk_candidate_count",
        "max_confidence_score",
        "mean_confidence_score",
        "requires_manual_review",
        "output_dir",
        "error",
    ]
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for result in results:
            writer.writerow({field: result.get(field) for field in fields})

    json_path.write_text(
        json.dumps({"generated_at": datetime.now().isoformat(), "results": results}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    total = len(results)
    success = sum(1 for item in results if item.get("status") == "success")
    with_rescue = sum(1 for item in results if item.get("rescue_candidate_count", 0) > 0)
    reprocessed_nonzero = sum(1 for item in results if item.get("reprocessed_total_blinks", 0) > 0)

    md_lines = [
        "# Zero Blink Rescue Report",
        "",
        f"Gerado em: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        "",
        f"- Vídeos zerados avaliados: **{total}**",
        f"- Reprocessados com sucesso: **{success}**",
        f"- Passaram a ter piscadas confirmadas no detector principal: **{reprocessed_nonzero}**",
        f"- Tiveram candidatos na passada relaxada: **{with_rescue}**",
        "",
        "## Tabela",
        "",
        "|idx|vídeo|status|principal|candidatos|alta conf.|score máx.|artefatos|bilaterais|unilaterais|",
        "|---|---|---|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for item in results:
        md_lines.append(
            "|{idx}|{remote}|{status}|{main}|{cand}|{high}|{score}|{artifact}|{bilat}|{uni}|".format(
                idx=item.get("idx"),
                remote=item.get("remote_path", "").replace("|", "/"),
                status=item.get("status"),
                main=item.get("reprocessed_total_blinks", 0),
                cand=item.get("rescue_candidate_count", 0),
                high=item.get("high_confidence_candidate_count", 0),
                score=item.get("max_confidence_score", 0),
                artifact=item.get("artifact_risk_candidate_count", 0),
                bilat=item.get("bilateral_candidate_count", 0),
                uni=item.get("unilateral_candidate_count", 0),
            )
        )
    md_path.write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    rows = "".join(
        "<tr>"
        f"<td>{html.escape(str(item.get('idx')))}</td>"
        f"<td>{html.escape(item.get('remote_path', ''))}</td>"
        f"<td>{html.escape(item.get('status', ''))}</td>"
        f"<td>{item.get('reprocessed_total_blinks', 0)}</td>"
        f"<td>{item.get('rescue_candidate_count', 0)}</td>"
        f"<td>{item.get('high_confidence_candidate_count', 0)}</td>"
        f"<td>{item.get('max_confidence_score', 0)}</td>"
        f"<td>{item.get('artifact_risk_candidate_count', 0)}</td>"
        f"<td>{item.get('bilateral_candidate_count', 0)}</td>"
        f"<td>{item.get('unilateral_candidate_count', 0)}</td>"
        "</tr>"
        for item in results
    )
    html_path.write_text(
        f"""<!doctype html><html lang=\"pt-br\"><meta charset=\"utf-8\"><title>Zero Blink Rescue</title>
<style>body{{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;margin:32px;background:#f7f7f4;color:#202124}}table{{border-collapse:collapse;width:100%;background:white}}td,th{{border-bottom:1px solid #ddd;padding:8px;text-align:left}}th{{background:#e9ece7}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}}.card{{background:white;border:1px solid #ddd;border-radius:8px;padding:16px}}.card b{{font-size:28px;display:block}}</style>
<h1>Zero Blink Rescue</h1>
<p>Relatório de reprocessamento dos vídeos originalmente zerados. Candidatos da passada relaxada exigem revisão manual e agora são priorizados por score de confiança.</p>
<div class=\"grid\"><div class=\"card\"><b>{total}</b>avaliados</div><div class=\"card\"><b>{success}</b>sucessos</div><div class=\"card\"><b>{reprocessed_nonzero}</b>com piscadas principais</div><div class=\"card\"><b>{with_rescue}</b>com candidatos</div></div>
<h2>Tabela</h2><table><tr><th>idx</th><th>vídeo</th><th>status</th><th>principal</th><th>candidatos</th><th>alta conf.</th><th>score máx.</th><th>artefatos</th><th>bilaterais</th><th>unilaterais</th></tr>{rows}</table>
""",
        encoding="utf-8",
    )
    return {"csv": csv_path, "json": json_path, "html": html_path, "md": md_path}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-summary", required=True, type=Path)
    parser.add_argument("--output-root", required=True, type=Path)
    parser.add_argument("--temp-root", required=True, type=Path)
    parser.add_argument("--remote", default="blinkdrive:")
    parser.add_argument("--manifest-out", type=Path)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--start-at", type=int, default=1)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--skip-download", action="store_true")
    parser.add_argument("--ratio", type=float, default=0.80)
    parser.add_argument("--fallback-ratio", type=float, default=0.88)
    parser.add_argument("--min-duration-ms", type=float, default=80.0)
    parser.add_argument("--max-duration-ms", type=float, default=1000.0)
    parser.add_argument("--onset-tolerance-ms", type=float, default=150.0)
    parser.add_argument("--baseline-quantile", type=float, default=90.0)
    parser.add_argument("--dominance-margin-percent", type=float, default=1.5)
    args = parser.parse_args()

    zero_rows = _load_zero_rows(args.source_summary)
    if args.start_at < 1:
        raise ValueError("--start-at must be >= 1")
    selected_rows = zero_rows[args.start_at - 1 :]
    if args.limit:
        selected_rows = selected_rows[: args.limit]

    manifest_path = args.manifest_out or (args.output_root / "_manifests" / "zero_blinks.txt")
    _write_manifest(selected_rows, manifest_path)
    if args.dry_run:
        print(f"Manifest escrito: {manifest_path}")
        print(f"Vídeos selecionados: {len(selected_rows)}")
        return 0

    args.output_root.mkdir(parents=True, exist_ok=True)
    args.temp_root.mkdir(parents=True, exist_ok=True)
    config = Config()
    config.save_debug_video = False
    config.detection.refine_landmarks = False
    config.detection.extract_only_eye_landmarks = True
    config.detection.max_inference_res = 480
    config.detection.use_roi = False

    items = read_manifest(manifest_path)
    results: list[dict] = []
    for idx, (source_row, item) in enumerate(zip(selected_rows, items), 1):
        print(f"[{idx}/{len(items)}] {item.remote_path}", flush=True)
        if args.skip_download:
            record = {
                "remote_path": item.remote_path,
                "status": "skipped_download",
                "output_dir": source_row["output_dir"],
                "total_blinks": source_row.get("total_blinks", 0),
            }
        else:
            record = process_item(
                item,
                remote=args.remote,
                temp_root=args.temp_root,
                output_root=args.output_root,
                config=config,
                dry_run=False,
                show_progress=False,
                force=True,
            )

        result = {
            "idx": source_row["idx"],
            "remote_path": item.remote_path,
            "status": record.get("status"),
            "original_total_blinks": source_row.get("total_blinks", 0),
            "reprocessed_total_blinks": record.get("total_blinks", 0),
            "output_dir": record.get("output_dir"),
            "error": record.get("error"),
        }

        if record.get("status") == "success":
            output_dir = Path(record["output_dir"])
            csv_path = _find_output_csv(output_dir)
            metrics_path = _find_metrics_json(output_dir)
            if csv_path and metrics_path:
                recalculate_csv(csv_path)
                payload = json.loads(metrics_path.read_text(encoding="utf-8"))
                result["reprocessed_total_blinks"] = payload["metrics"]["combined"]["total_blinks"]
                if result["reprocessed_total_blinks"] == 0:
                    rescue = rescue_csv(
                        csv_path,
                        metrics_path,
                        ratio=args.ratio,
                        fallback_ratio=args.fallback_ratio,
                        min_duration_ms=args.min_duration_ms,
                        max_duration_ms=args.max_duration_ms,
                        onset_tolerance_ms=args.onset_tolerance_ms,
                        baseline_quantile=args.baseline_quantile,
                        dominance_margin_percent=args.dominance_margin_percent,
                    )
                    result.update(
                        {
                            "rescue_candidate_count": rescue["candidate_count"],
                            "bilateral_candidate_count": rescue["bilateral_candidate_count"],
                            "unilateral_candidate_count": rescue["unilateral_candidate_count"],
                            "left_dominant_candidate_count": rescue["left_dominant_candidate_count"],
                            "right_dominant_candidate_count": rescue["right_dominant_candidate_count"],
                            "high_confidence_candidate_count": rescue["high_confidence_candidate_count"],
                            "artifact_risk_candidate_count": rescue["artifact_risk_candidate_count"],
                            "max_confidence_score": rescue["max_confidence_score"],
                            "mean_confidence_score": rescue["mean_confidence_score"],
                            "requires_manual_review": rescue["requires_manual_review"],
                        }
                    )
                else:
                    result.update(
                        {
                            "rescue_candidate_count": 0,
                            "bilateral_candidate_count": 0,
                            "unilateral_candidate_count": 0,
                            "left_dominant_candidate_count": 0,
                            "right_dominant_candidate_count": 0,
                            "high_confidence_candidate_count": 0,
                            "artifact_risk_candidate_count": 0,
                            "max_confidence_score": 0,
                            "mean_confidence_score": 0,
                            "requires_manual_review": False,
                        }
                    )
        results.append(result)

        report_paths = _write_reports(results, args.output_root / "_reports")
        print(
            "  -> {status}, principal={main}, candidatos={cand}".format(
                status=result.get("status"),
                main=result.get("reprocessed_total_blinks", 0),
                cand=result.get("rescue_candidate_count", 0),
            ),
            flush=True,
        )
        print(f"  relatório: {report_paths['html']}", flush=True)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
