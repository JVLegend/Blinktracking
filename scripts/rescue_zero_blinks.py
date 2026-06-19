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

    @property
    def depth_percent(self) -> float:
        if self.baseline_opening <= 0:
            return 0.0
        return float(np.clip((1.0 - self.min_opening / self.baseline_opening) * 100.0, 0, 100))


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

    rescue = {
        "enabled": True,
        "requires_manual_review": True,
        "method": "relaxed_baseline_runs",
        "primary_ratio": ratio,
        "ratio_used": ratio_used,
        "fallback_ratio": fallback_ratio,
        "baseline_quantile": baseline_quantile,
        "dominance_margin_percent": dominance_margin_percent,
        "min_duration_ms": min_duration_ms,
        "max_duration_ms": max_duration_ms,
        "onset_tolerance_ms": onset_tolerance_ms,
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
        "|idx|vídeo|status|principal|candidatos|bilaterais|unilaterais|dom E|dom D|",
        "|---|---|---|---:|---:|---:|---:|---:|---:|",
    ]
    for item in results:
        md_lines.append(
            "|{idx}|{remote}|{status}|{main}|{cand}|{bilat}|{uni}|{left_dom}|{right_dom}|".format(
                idx=item.get("idx"),
                remote=item.get("remote_path", "").replace("|", "/"),
                status=item.get("status"),
                main=item.get("reprocessed_total_blinks", 0),
                cand=item.get("rescue_candidate_count", 0),
                bilat=item.get("bilateral_candidate_count", 0),
                uni=item.get("unilateral_candidate_count", 0),
                left_dom=item.get("left_dominant_candidate_count", 0),
                right_dom=item.get("right_dominant_candidate_count", 0),
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
        f"<td>{item.get('bilateral_candidate_count', 0)}</td>"
        f"<td>{item.get('unilateral_candidate_count', 0)}</td>"
        f"<td>{item.get('left_dominant_candidate_count', 0)}</td>"
        f"<td>{item.get('right_dominant_candidate_count', 0)}</td>"
        "</tr>"
        for item in results
    )
    html_path.write_text(
        f"""<!doctype html><html lang=\"pt-br\"><meta charset=\"utf-8\"><title>Zero Blink Rescue</title>
<style>body{{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;margin:32px;background:#f7f7f4;color:#202124}}table{{border-collapse:collapse;width:100%;background:white}}td,th{{border-bottom:1px solid #ddd;padding:8px;text-align:left}}th{{background:#e9ece7}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}}.card{{background:white;border:1px solid #ddd;border-radius:8px;padding:16px}}.card b{{font-size:28px;display:block}}</style>
<h1>Zero Blink Rescue</h1>
<p>Relatório de reprocessamento dos vídeos originalmente zerados. Candidatos da passada relaxada exigem revisão manual.</p>
<div class=\"grid\"><div class=\"card\"><b>{total}</b>avaliados</div><div class=\"card\"><b>{success}</b>sucessos</div><div class=\"card\"><b>{reprocessed_nonzero}</b>com piscadas principais</div><div class=\"card\"><b>{with_rescue}</b>com candidatos</div></div>
<h2>Tabela</h2><table><tr><th>idx</th><th>vídeo</th><th>status</th><th>principal</th><th>candidatos</th><th>bilaterais</th><th>unilaterais</th><th>dom E</th><th>dom D</th></tr>{rows}</table>
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
