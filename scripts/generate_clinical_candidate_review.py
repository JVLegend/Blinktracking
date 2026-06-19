#!/usr/bin/env python3
"""Gera candidatos relaxados para revisão clínica em todos os vídeos processados."""

from __future__ import annotations

import argparse
import csv
import html
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.rescue_zero_blinks import (
    _combine_candidate_sets,
    _find_output_csv,
    _fps_from_csv,
    _merge_candidates,
    _runs_for_eye,
)


def _num(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _candidate_counts(candidates: list[dict]) -> dict[str, int]:
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
    }


def _detect_candidates(
    csv_path: Path,
    *,
    fps_fallback: float,
    ratio: float,
    fallback_ratio: float,
    min_duration_ms: float,
    max_duration_ms: float,
    onset_tolerance_ms: float,
    baseline_quantile: float,
    dominance_margin_percent: float,
) -> tuple[list[dict], float]:
    df = pd.read_csv(csv_path, comment="#")
    fps = _fps_from_csv(df, fps_fallback)
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
    candidates = _merge_candidates(
        left,
        right,
        onset_tolerance_ms=onset_tolerance_ms,
        dominance_margin_percent=dominance_margin_percent,
    )
    ratio_used = ratio
    primary_candidates = candidates
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
    return candidates, ratio_used


def build_review(
    summary_json: Path,
    *,
    nonzero_ratio: float,
    zero_ratio: float,
    zero_fallback_ratio: float,
    min_duration_ms: float,
    max_duration_ms: float,
    onset_tolerance_ms: float,
    baseline_quantile: float,
    dominance_margin_percent: float,
) -> list[dict]:
    payload = json.loads(summary_json.read_text(encoding="utf-8"))
    results: list[dict] = []
    for row in payload["rows"]:
        output_dir = Path(row["output_dir"])
        csv_path = _find_output_csv(output_dir)
        total_blinks = int(_num(row.get("total_blinks")))
        profile = "zero_rescue" if total_blinks == 0 else "nonzero_review"
        ratio = zero_ratio if total_blinks == 0 else nonzero_ratio
        fallback_ratio = zero_fallback_ratio if total_blinks == 0 else 0.0
        result = {
            "idx": row.get("idx"),
            "remote_path": row.get("remote_path"),
            "paciente": row.get("paciente"),
            "video": row.get("video"),
            "total_blinks": total_blinks,
            "profile": profile,
            "ratio": ratio,
            "fallback_ratio": fallback_ratio,
            "ratio_used": ratio,
            "status": "missing_csv",
            "output_dir": str(output_dir),
            "candidates": [],
        }
        if csv_path is not None:
            try:
                candidates, ratio_used = _detect_candidates(
                    csv_path,
                    fps_fallback=_num(row.get("fps"), 30.0),
                    ratio=ratio,
                    fallback_ratio=fallback_ratio,
                    min_duration_ms=min_duration_ms,
                    max_duration_ms=max_duration_ms,
                    onset_tolerance_ms=onset_tolerance_ms,
                    baseline_quantile=baseline_quantile,
                    dominance_margin_percent=dominance_margin_percent,
                )
                result.update(
                    {
                        "status": "success",
                        "ratio_used": ratio_used,
                        "candidates": candidates,
                        **_candidate_counts(candidates),
                    }
                )
            except Exception as exc:  # noqa: BLE001 - manter lote completo mesmo com falha isolada.
                result.update({"status": "failed", "error": str(exc), **_candidate_counts([])})
        else:
            result.update(_candidate_counts([]))
        results.append(result)
    return results


def _write_reports(results: list[dict], output_dir: Path) -> dict[str, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    generated_at = datetime.now().isoformat()
    csv_path = output_dir / "clinical_candidate_review_report.csv"
    json_path = output_dir / "clinical_candidate_review_report.json"
    md_path = output_dir / "clinical_candidate_review_report.md"
    html_path = output_dir / "clinical_candidate_review_report.html"
    fields = [
        "idx",
        "remote_path",
        "status",
        "profile",
        "total_blinks",
        "ratio_used",
        "candidate_count",
        "bilateral_candidate_count",
        "unilateral_candidate_count",
        "left_dominant_candidate_count",
        "right_dominant_candidate_count",
        "first_candidate_seconds",
        "output_dir",
        "error",
    ]
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for item in results:
            candidates = item.get("candidates") or []
            first_seconds = ""
            if candidates:
                first_seconds = "; ".join(
                    f"{float(candidate['start_time_ms']) / 1000.0:.3f}"
                    for candidate in candidates[:8]
                )
            writer.writerow(
                {
                    field: item.get(field, "")
                    for field in fields
                    if field != "first_candidate_seconds"
                }
                | {"first_candidate_seconds": first_seconds}
            )

    json_path.write_text(
        json.dumps({"generated_at": generated_at, "results": results}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    success = sum(1 for item in results if item.get("status") == "success")
    with_candidates = sum(1 for item in results if int(item.get("candidate_count", 0)) > 0)
    total_candidates = sum(int(item.get("candidate_count", 0)) for item in results)
    zero_candidates = sum(
        int(item.get("candidate_count", 0))
        for item in results
        if item.get("profile") == "zero_rescue"
    )
    nonzero_candidates = total_candidates - zero_candidates
    left_dom = sum(int(item.get("left_dominant_candidate_count", 0)) for item in results)
    right_dom = sum(int(item.get("right_dominant_candidate_count", 0)) for item in results)

    top = sorted(
        results,
        key=lambda item: (int(item.get("candidate_count", 0)), int(item.get("total_blinks", 0))),
        reverse=True,
    )[:25]
    md_lines = [
        "# Clinical Candidate Review",
        "",
        f"Gerado em: {generated_at}",
        "",
        f"- Vídeos avaliados: **{len(results)}**",
        f"- Sucessos: **{success}**",
        f"- Vídeos com candidatos: **{with_candidates}**",
        f"- Candidatos totais: **{total_candidates}**",
        f"- Candidatos em vídeos zero/não-zero: **{zero_candidates}/{nonzero_candidates}**",
        f"- Candidatos dominantes E/D: **{left_dom}/{right_dom}**",
        "",
        "## Top 25 para revisão",
        "",
        "|idx|perfil|vídeo|principal|candidatos|dom E|dom D|primeiros tempos (s)|",
        "|---:|---|---|---:|---:|---:|---:|---|",
    ]
    for item in top:
        first_seconds = "; ".join(
            f"{float(candidate['start_time_ms']) / 1000.0:.3f}"
            for candidate in (item.get("candidates") or [])[:8]
        )
        md_lines.append(
            f"|{item.get('idx')}|{item.get('profile')}|{str(item.get('remote_path', '')).replace('|', '/')}|"
            f"{item.get('total_blinks', 0)}|{item.get('candidate_count', 0)}|"
            f"{item.get('left_dominant_candidate_count', 0)}|"
            f"{item.get('right_dominant_candidate_count', 0)}|{first_seconds}|"
        )
    md_path.write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    rows = []
    for item in top:
        first_seconds = "; ".join(
            f"{float(candidate['start_time_ms']) / 1000.0:.3f}"
            for candidate in (item.get("candidates") or [])[:8]
        )
        rows.append(
            "<tr>"
            f"<td>{html.escape(str(item.get('idx')))}</td>"
            f"<td>{html.escape(str(item.get('profile')))}</td>"
            f"<td>{html.escape(str(item.get('remote_path')))}</td>"
            f"<td>{int(item.get('total_blinks', 0))}</td>"
            f"<td>{int(item.get('candidate_count', 0))}</td>"
            f"<td>{int(item.get('left_dominant_candidate_count', 0))}</td>"
            f"<td>{int(item.get('right_dominant_candidate_count', 0))}</td>"
            f"<td>{html.escape(first_seconds)}</td>"
            "</tr>"
        )
    html_path.write_text(
        f"""<!doctype html><html lang="pt-br"><meta charset="utf-8">
<title>Clinical Candidate Review</title>
<style>
body{{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;margin:32px;background:#f8fafc;color:#172033}}
.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:18px 0}}
.card{{background:white;border:1px solid #d8dee9;border-radius:8px;padding:16px}}.card b{{display:block;font-size:28px}}
table{{border-collapse:collapse;width:100%;background:white;border:1px solid #d8dee9}}td,th{{padding:8px;border-bottom:1px solid #e5e7eb;text-align:left}}th{{background:#edf2f7}}
</style>
<h1>Clinical Candidate Review</h1>
<p>Camada relaxada para revisão manual. Estes candidatos não substituem o desfecho principal.</p>
<div class="grid">
<div class="card"><b>{len(results)}</b>vídeos</div>
<div class="card"><b>{with_candidates}</b>com candidatos</div>
<div class="card"><b>{total_candidates}</b>candidatos</div>
<div class="card"><b>{left_dom}/{right_dom}</b>dominantes E/D</div>
</div>
<h2>Top 25 para revisão</h2>
<table><tr><th>idx</th><th>perfil</th><th>vídeo</th><th>principal</th><th>candidatos</th><th>dom E</th><th>dom D</th><th>primeiros tempos (s)</th></tr>{''.join(rows)}</table>
""",
        encoding="utf-8",
    )
    return {"csv": csv_path, "json": json_path, "md": md_path, "html": html_path}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--summary-json",
        type=Path,
        default=Path("/Users/iaparamedicos/Documents/Blinktracking_Resultados_Drive/_reports/resumo_processamento_drive_71_videos.json"),
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("/Users/iaparamedicos/Documents/Blinktracking_Resultados_Drive/_reports/clinical_candidate_review"),
    )
    parser.add_argument("--nonzero-ratio", type=float, default=0.78)
    parser.add_argument("--zero-ratio", type=float, default=0.80)
    parser.add_argument("--zero-fallback-ratio", type=float, default=0.88)
    parser.add_argument("--min-duration-ms", type=float, default=80.0)
    parser.add_argument("--max-duration-ms", type=float, default=1000.0)
    parser.add_argument("--onset-tolerance-ms", type=float, default=150.0)
    parser.add_argument("--baseline-quantile", type=float, default=90.0)
    parser.add_argument("--dominance-margin-percent", type=float, default=2.0)
    args = parser.parse_args()

    results = build_review(
        args.summary_json,
        nonzero_ratio=args.nonzero_ratio,
        zero_ratio=args.zero_ratio,
        zero_fallback_ratio=args.zero_fallback_ratio,
        min_duration_ms=args.min_duration_ms,
        max_duration_ms=args.max_duration_ms,
        onset_tolerance_ms=args.onset_tolerance_ms,
        baseline_quantile=args.baseline_quantile,
        dominance_margin_percent=args.dominance_margin_percent,
    )
    paths = _write_reports(results, args.output_dir)
    print(f"Vídeos avaliados: {len(results)}")
    print(f"Candidatos: {sum(int(item.get('candidate_count', 0)) for item in results)}")
    print(f"HTML: {paths['html']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
