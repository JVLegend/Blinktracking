#!/usr/bin/env python3
"""Atualiza o rescue dos videos zerados usando CSVs ja processados localmente."""

from __future__ import annotations

import argparse
from pathlib import Path

from rescue_zero_blinks import (
    _find_metrics_json,
    _find_output_csv,
    _load_zero_rows,
    _write_reports,
    rescue_csv,
)


def update_from_existing(
    source_summary: Path,
    output_root: Path,
    *,
    ratio: float,
    fallback_ratio: float,
    min_duration_ms: float,
    max_duration_ms: float,
    onset_tolerance_ms: float,
    baseline_quantile: float,
    dominance_margin_percent: float,
) -> list[dict]:
    results: list[dict] = []
    for row in _load_zero_rows(source_summary):
        idx = row.get("idx")
        output_dir = Path(row["output_dir"])
        remote_path = row.get("remote_path", "")
        try:
            csv_path = _find_output_csv(output_dir)
            metrics_path = _find_metrics_json(output_dir)
            if metrics_path is None:
                raise FileNotFoundError(f"metrics json não encontrado em {output_dir}")
            rescue = rescue_csv(
                csv_path,
                metrics_path,
                ratio=ratio,
                fallback_ratio=fallback_ratio,
                min_duration_ms=min_duration_ms,
                max_duration_ms=max_duration_ms,
                onset_tolerance_ms=onset_tolerance_ms,
                baseline_quantile=baseline_quantile,
                dominance_margin_percent=dominance_margin_percent,
            )
            results.append(
                {
                    "idx": idx,
                    "remote_path": remote_path,
                    "status": "success",
                    "original_total_blinks": row.get("total_blinks", 0),
                    "reprocessed_total_blinks": row.get("total_blinks", 0),
                    "rescue_candidate_count": rescue["candidate_count"],
                    "bilateral_candidate_count": rescue["bilateral_candidate_count"],
                    "unilateral_candidate_count": rescue["unilateral_candidate_count"],
                    "left_dominant_candidate_count": rescue["left_dominant_candidate_count"],
                    "right_dominant_candidate_count": rescue["right_dominant_candidate_count"],
                    "high_confidence_candidate_count": rescue["high_confidence_candidate_count"],
                    "artifact_risk_candidate_count": rescue["artifact_risk_candidate_count"],
                    "max_confidence_score": rescue["max_confidence_score"],
                    "mean_confidence_score": rescue["mean_confidence_score"],
                    "requires_manual_review": rescue["candidate_count"] > 0,
                    "output_dir": str(output_dir),
                    "error": "",
                }
            )
        except Exception as exc:  # noqa: BLE001 - reportar falhas por paciente sem abortar lote.
            results.append(
                {
                    "idx": idx,
                    "remote_path": remote_path,
                    "status": "failed",
                    "original_total_blinks": row.get("total_blinks", 0),
                    "reprocessed_total_blinks": 0,
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
                    "output_dir": str(output_dir),
                    "error": str(exc),
                }
            )

    _write_reports(results, output_root / "_reports")
    return results


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-summary", required=True, type=Path)
    parser.add_argument(
        "--output-root",
        type=Path,
        default=Path("/Users/iaparamedicos/Documents/Blinktracking_Zero_Blink_Rescue"),
    )
    parser.add_argument("--ratio", type=float, default=0.80)
    parser.add_argument("--fallback-ratio", type=float, default=0.88)
    parser.add_argument("--min-duration-ms", type=float, default=80.0)
    parser.add_argument("--max-duration-ms", type=float, default=1000.0)
    parser.add_argument("--onset-tolerance-ms", type=float, default=150.0)
    parser.add_argument("--baseline-quantile", type=float, default=90.0)
    parser.add_argument("--dominance-margin-percent", type=float, default=1.5)
    args = parser.parse_args()

    results = update_from_existing(
        args.source_summary,
        args.output_root,
        ratio=args.ratio,
        fallback_ratio=args.fallback_ratio,
        min_duration_ms=args.min_duration_ms,
        max_duration_ms=args.max_duration_ms,
        onset_tolerance_ms=args.onset_tolerance_ms,
        baseline_quantile=args.baseline_quantile,
        dominance_margin_percent=args.dominance_margin_percent,
    )
    success = sum(1 for item in results if item["status"] == "success")
    candidates = sum(int(item["rescue_candidate_count"]) for item in results)
    high_confidence = sum(int(item["high_confidence_candidate_count"]) for item in results)
    left_dom = sum(int(item["left_dominant_candidate_count"]) for item in results)
    right_dom = sum(int(item["right_dominant_candidate_count"]) for item in results)
    print(f"Zerados atualizados: {success}/{len(results)}")
    print(f"Candidatos relaxados: {candidates}")
    print(f"Candidatos de alta confiança: {high_confidence}")
    print(f"Candidatos dominantes E/D: {left_dom}/{right_dom}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
