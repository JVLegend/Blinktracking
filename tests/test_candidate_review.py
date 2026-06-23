import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.rescue_zero_blinks import (
    _quality_context,
    detect_relaxed_candidates,
)


def _synthetic_df(
    left: np.ndarray,
    right: np.ndarray,
    *,
    fps: float = 30.0,
    shake_frame: int | None = None,
) -> pd.DataFrame:
    frames = np.arange(len(left), dtype=int)
    timestamps = frames * (1000.0 / fps)
    df = pd.DataFrame(
        {
            "frame": frames,
            "timestamp_ms": timestamps,
            "opening_left": left,
            "opening_right": right,
        }
    )
    for eye, x_offset in (("left", 130.0), ("right", 70.0)):
        for lid in ("upper", "lower"):
            for idx in range(9 if lid == "lower" else 7):
                df[f"{eye}_{lid}_{idx}_x"] = x_offset + idx
                df[f"{eye}_{lid}_{idx}_y"] = 100.0 + idx * 0.2

    if shake_frame is not None:
        for col in [c for c in df.columns if c.endswith("_x") or c.endswith("_y")]:
            df.loc[shake_frame:, col] += 80.0
    return df


def test_local_minima_adds_subtle_candidate():
    fps = 30.0
    left = np.full(90, 100.0)
    right = np.full(90, 100.0)
    left[28:33] = [96.0, 89.0, 82.0, 89.0, 96.0]
    right[28:33] = [97.0, 91.0, 84.0, 91.0, 97.0]
    df = _synthetic_df(left, right, fps=fps)

    candidates, _, _ = detect_relaxed_candidates(
        df,
        fps,
        ratio=0.78,
        fallback_ratio=0.0,
        min_duration_ms=60.0,
        max_duration_ms=500.0,
        onset_tolerance_ms=150.0,
        baseline_quantile=90.0,
        dominance_margin_percent=2.0,
        local_min_prominence_percent=10.0,
    )

    assert candidates
    best = candidates[0]
    assert best["source"] == "local_minimum"
    assert best["classification"] == "bilateral_candidate"
    assert best["confidence_score"] >= 50


def test_quality_artifact_lowers_candidate_priority():
    fps = 30.0
    left = np.full(90, 100.0)
    right = np.full(90, 100.0)
    left[30:35] = 70.0
    right[30:35] = 72.0
    clean_df = _synthetic_df(left, right, fps=fps)
    shaky_df = _synthetic_df(left, right, fps=fps, shake_frame=31)

    clean_candidates, _, _ = detect_relaxed_candidates(
        clean_df,
        fps,
        ratio=0.80,
        fallback_ratio=0.0,
        min_duration_ms=60.0,
        max_duration_ms=500.0,
        onset_tolerance_ms=150.0,
        baseline_quantile=90.0,
        dominance_margin_percent=2.0,
    )
    shaky_candidates, _, _ = detect_relaxed_candidates(
        shaky_df,
        fps,
        ratio=0.80,
        fallback_ratio=0.0,
        min_duration_ms=60.0,
        max_duration_ms=500.0,
        onset_tolerance_ms=150.0,
        baseline_quantile=90.0,
        dominance_margin_percent=2.0,
    )

    assert clean_candidates[0]["confidence_score"] > shaky_candidates[0]["confidence_score"]
    assert shaky_candidates[0]["artifact_risk"] == "high"
    assert "camera_shake" in shaky_candidates[0]["quality_flags"]


def test_chronic_closed_eye_context_detects_asymmetric_baseline():
    fps = 30.0
    left = np.full(90, 100.0)
    right = np.full(90, 90.0)
    right[30:35] = [88.0, 83.0, 78.0, 83.0, 88.0]
    df = _synthetic_df(left, right, fps=fps)

    quality = _quality_context(df, fps)
    candidates, _, quality = detect_relaxed_candidates(
        df,
        fps,
        ratio=0.78,
        fallback_ratio=0.0,
        min_duration_ms=60.0,
        max_duration_ms=500.0,
        onset_tolerance_ms=150.0,
        baseline_quantile=90.0,
        dominance_margin_percent=2.0,
        local_min_prominence_percent=14.0,
        chronic_min_prominence_percent=8.0,
    )

    assert quality.chronic_closed_eyes["right"]
    assert candidates
    assert "right" in candidates[0]["chronic_closed_eye_context"]
