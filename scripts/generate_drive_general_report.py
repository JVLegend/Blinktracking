#!/usr/bin/env python3
"""Gera o relatorio geral HTML/Markdown dos resultados do Drive."""

from __future__ import annotations

import argparse
import csv
import html
import json
from datetime import datetime
from pathlib import Path
from typing import Any


def _num(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _fmt(value: Any, digits: int = 2) -> str:
    number = _num(value)
    if abs(number - round(number)) < 1e-9:
        return str(int(round(number)))
    return f"{number:.{digits}f}"


def _load_csv(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def generate_report(
    summary_json: Path,
    rescue_csv: Path,
    candidate_review_csv: Path,
    output_dir: Path,
) -> dict[str, Path]:
    payload = json.loads(summary_json.read_text(encoding="utf-8"))
    stats = payload["stats"]
    rows = payload["rows"]
    rescue_rows = _load_csv(rescue_csv)
    candidate_rows = _load_csv(candidate_review_csv)
    generated = datetime.now().strftime("%Y-%m-%d %H:%M")

    high_rows = [
        row for row in rows
        if _num(row.get("blink_rate_per_minute")) >= 30 or _num(row.get("total_blinks")) >= 100
    ]
    zero_rows = [row for row in rows if int(_num(row.get("total_blinks"))) == 0]
    rescue_with_candidates = [
        row for row in rescue_rows
        if int(_num(row.get("rescue_candidate_count"))) > 0
    ]
    candidate_with_review = [
        row for row in candidate_rows
        if int(_num(row.get("candidate_count"))) > 0
    ]
    candidate_total = sum(int(_num(row.get("candidate_count"))) for row in candidate_rows)
    candidate_left = sum(int(_num(row.get("left_dominant_candidate_count"))) for row in candidate_rows)
    candidate_right = sum(int(_num(row.get("right_dominant_candidate_count"))) for row in candidate_rows)

    output_dir.mkdir(parents=True, exist_ok=True)
    html_path = output_dir / "relatorio_geral_blinktracking_v2_drive.html"
    md_path = output_dir / "relatorio_geral_blinktracking_v2_drive.md"

    md_lines = [
        "# Relatório Geral BlinkTracking Drive v2",
        "",
        f"Gerado em: {generated}",
        "",
        "## Resumo",
        "",
        f"- Vídeos com métricas: {stats.get('videos_with_metrics', len(rows))}",
        f"- Piscadas clínicas: {stats.get('total_blinks', 0)}",
        f"- Eventos crus por olho: {stats.get('raw_eye_blinks', 0)}",
        f"- Bilaterais sincronizadas: {stats.get('bilateral_blinks', 0)}",
        f"- Dominantes E/D: {stats.get('left_dominant_blinks', 0)}/{stats.get('right_dominant_blinks', 0)}",
        f"- Zerados: {stats.get('zero_count', len(zero_rows))}",
        f"- Com candidatos relaxados: {len(rescue_with_candidates)}",
        f"- Candidatos clínicos para revisão em todos os vídeos: {candidate_total}",
        f"- Candidatos clínicos dominantes E/D: {candidate_left}/{candidate_right}",
        "",
        "## Calibração manual recente",
        "",
        "- Paciente 30 / IMG_6086: revisão manual marcou 00:01, 00:04 e 00:06, com dominância clínica do olho direito. A camada de candidatos recupera os três tempos como revisão.",
        "- Paciente 15 / IMG_3976: revisão manual marcou 00:07, alinhado ao candidato relaxado direito em 6,614 s.",
        "- Decisão: manter o desfecho principal conservador e usar candidatos clínicos como fila de revisão manual.",
        "",
        "## Vídeos de alta frequência para revisão",
        "",
        "|idx|paciente|vídeo|piscadas|taxa/min|",
        "|---:|---|---|---:|---:|",
    ]
    for row in high_rows:
        md_lines.append(
            f"|{row.get('idx')}|{row.get('patient_dir')}|{row.get('video_file')}|"
            f"{_fmt(row.get('total_blinks'))}|{_fmt(row.get('blink_rate_per_minute'))}|"
        )
    md_lines.extend(
        [
            "",
            "## Vídeos zerados",
            "",
            "|idx|paciente|vídeo|candidatos relaxados|dom E|dom D|",
            "|---:|---|---|---:|---:|---:|",
        ]
    )
    rescue_by_idx = {str(row.get("idx")): row for row in rescue_rows}
    for row in zero_rows:
        rescue = rescue_by_idx.get(str(row.get("idx")), {})
        md_lines.append(
            f"|{row.get('idx')}|{row.get('patient_dir')}|{row.get('video_file')}|"
            f"{_fmt(rescue.get('rescue_candidate_count'))}|"
            f"{_fmt(rescue.get('left_dominant_candidate_count'))}|"
            f"{_fmt(rescue.get('right_dominant_candidate_count'))}|"
        )
    md_path.write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    def card(label: str, value: Any) -> str:
        return f"<div class='card'><b>{html.escape(str(value))}</b><span>{html.escape(label)}</span></div>"

    high_table = "".join(
        "<tr>"
        f"<td>{row.get('idx')}</td>"
        f"<td>{html.escape(str(row.get('patient_dir', '')))}</td>"
        f"<td>{html.escape(str(row.get('video_file', '')))}</td>"
        f"<td>{_fmt(row.get('total_blinks'))}</td>"
        f"<td>{_fmt(row.get('blink_rate_per_minute'))}</td>"
        "</tr>"
        for row in high_rows
    )
    zero_table = "".join(
        "<tr>"
        f"<td>{row.get('idx')}</td>"
        f"<td>{html.escape(str(row.get('patient_dir', '')))}</td>"
        f"<td>{html.escape(str(row.get('video_file', '')))}</td>"
        f"<td>{_fmt(rescue_by_idx.get(str(row.get('idx')), {}).get('rescue_candidate_count'))}</td>"
        f"<td>{_fmt(rescue_by_idx.get(str(row.get('idx')), {}).get('left_dominant_candidate_count'))}</td>"
        f"<td>{_fmt(rescue_by_idx.get(str(row.get('idx')), {}).get('right_dominant_candidate_count'))}</td>"
        "</tr>"
        for row in zero_rows
    )
    html_path.write_text(
        f"""<!doctype html>
<html lang="pt-br">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Relatório Geral BlinkTracking Drive v2</title>
<style>
body{{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;background:#f6f7f2;color:#1f2933}}
main{{max-width:1180px;margin:0 auto;padding:36px 20px 64px}}
h1{{font-size:34px;margin:0 0 8px}} h2{{margin-top:34px}}
.muted{{color:#667085}} .grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:24px 0}}
.card{{background:#fff;border:1px solid #dfe3dc;border-radius:8px;padding:16px}} .card b{{display:block;font-size:28px;line-height:1.1}} .card span{{color:#667085}}
table{{width:100%;border-collapse:collapse;background:#fff;border:1px solid #dfe3dc;border-radius:8px;overflow:hidden}}
th,td{{padding:9px 10px;border-bottom:1px solid #e5e7eb;text-align:left}} th{{background:#eef1eb;font-size:13px}} td:nth-child(1),td:nth-child(4),td:nth-child(5),td:nth-child(6){{text-align:right}}
.note{{background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px 16px}}
</style>
<main>
<h1>Relatório Geral BlinkTracking Drive v2</h1>
<p class="muted">Atualizado em {generated}. Contagem principal usa eventos clínicos sincronizados; eventos bilaterais agora carregam lateralidade.</p>
<div class="grid">
{card("vídeos com métricas", stats.get("videos_with_metrics", len(rows)))}
{card("piscadas clínicas", stats.get("total_blinks", 0))}
{card("eventos crus por olho", stats.get("raw_eye_blinks", 0))}
{card("bilaterais sincronizadas", stats.get("bilateral_blinks", 0))}
{card("dominantes E/D", f"{stats.get('left_dominant_blinks', 0)}/{stats.get('right_dominant_blinks', 0)}")}
{card("vídeos zerados", stats.get("zero_count", len(zero_rows)))}
{card("candidatos clínicos", candidate_total)}
{card("cand. dominantes E/D", f"{candidate_left}/{candidate_right}")}
</div>
<div class="note">A recuperação relaxada identificou {sum(int(_num(row.get('rescue_candidate_count'))) for row in rescue_rows)} candidatos em {len(rescue_with_candidates)} vídeos zerados; estes são itens para revisão manual, não substituem o desfecho primário.</div>
<div class="note">A nova camada de candidatos clínicos avaliou todos os vídeos e encontrou {candidate_total} candidatos em {len(candidate_with_review)} vídeos. É uma fila sensível para revisão manual, não uma nova contagem automática.</div>
<h2>Calibração Manual Recente</h2>
<div class="note">Paciente 30 / IMG_6086: 00:01, 00:04 e 00:06 com dominância clínica direita; a camada de candidatos recupera os três tempos. Paciente 15 / IMG_3976: 00:07 alinhado ao candidato direito em 6,614 s.</div>
<h2>Alta Frequência Para Revisão</h2>
<table><tr><th>idx</th><th>paciente</th><th>vídeo</th><th>piscadas</th><th>taxa/min</th></tr>{high_table}</table>
<h2>Vídeos Zerados</h2>
<table><tr><th>idx</th><th>paciente</th><th>vídeo</th><th>candidatos</th><th>dom E</th><th>dom D</th></tr>{zero_table}</table>
</main>
</html>
""",
        encoding="utf-8",
    )
    return {"html": html_path, "md": md_path}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--summary-json",
        type=Path,
        default=Path("/Users/iaparamedicos/Documents/Blinktracking_Resultados_Drive/_reports/resumo_processamento_drive_71_videos.json"),
    )
    parser.add_argument(
        "--rescue-csv",
        type=Path,
        default=Path("/Users/iaparamedicos/Documents/Blinktracking_Zero_Blink_Rescue/_reports/zero_blink_rescue_report.csv"),
    )
    parser.add_argument(
        "--candidate-review-csv",
        type=Path,
        default=Path("/Users/iaparamedicos/Documents/Blinktracking_Resultados_Drive/_reports/clinical_candidate_review/clinical_candidate_review_report.csv"),
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("/Users/iaparamedicos/Documents/Blinktracking_Resultados_Drive/_reports"),
    )
    args = parser.parse_args()
    paths = generate_report(args.summary_json, args.rescue_csv, args.candidate_review_csv, args.output_dir)
    print(f"HTML: {paths['html']}")
    print(f"Markdown: {paths['md']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
