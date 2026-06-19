#!/usr/bin/env python3
"""Gera a página estática de resultados BlinkTracking para o site do doutorado."""

from __future__ import annotations

import argparse
import csv
import html
import json
from datetime import datetime
from pathlib import Path


def _fmt(value: float, digits: int = 2) -> str:
    return f"{float(value):.{digits}f}".replace(".", ",")


def _num(value: float | int) -> str:
    return f"{int(round(float(value))):,}".replace(",", ".")


def _esc(value) -> str:
    return html.escape(str(value if value is not None else ""))


def _table_rows_high(rows: list[dict]) -> str:
    parts: list[str] = []
    for row in rows:
        parts.append(
            f"""
        <tr>
          <td>{_esc(row['idx'])}</td>
          <td>{_esc(row['paciente'])}<span>{_esc(row['video'])}</span></td>
          <td class="num">{_num(row['total_blinks'])}</td>
          <td class="num muted">{_num(row.get('raw_eye_blinks', 0))}</td>
          <td class="num">{_fmt(row['blink_rate_per_minute'])}</td>
          <td class="num">{_num(row.get('bilateral_blinks', 0))}</td>
          <td class="num">{_num(row.get('left_dominant_blinks', 0))}/{_num(row.get('right_dominant_blinks', 0))}</td>
        </tr>"""
        )
    return "\n".join(parts)


def _table_rows_zero(rows: list[dict]) -> str:
    parts: list[str] = []
    for row in rows:
        parts.append(
            f"""
        <tr>
          <td>{_esc(row['idx'])}</td>
          <td>{_esc(row['paciente'])}<span>{_esc(row['video'])}</span></td>
          <td class="num">{_fmt(row['duration_seconds'])}</td>
          <td class="num">{_num(row.get('detections', 0))}</td>
        </tr>"""
        )
    return "\n".join(parts)


def _table_rows_rescue(rows: list[dict]) -> str:
    parts: list[str] = []
    for row in rows[:12]:
        remote = row.get("remote_path", "")
        patient, _, video = remote.partition("/")
        parts.append(
            f"""
        <tr>
          <td>{_esc(row.get('idx'))}</td>
          <td>{_esc(patient)}<span>{_esc(video)}</span></td>
          <td class="num">{_num(row.get('rescue_candidate_count') or 0)}</td>
          <td class="num">{_num(row.get('bilateral_candidate_count') or 0)}</td>
          <td class="num">{_num(row.get('left_dominant_candidate_count') or 0)}/{_num(row.get('right_dominant_candidate_count') or 0)}</td>
        </tr>"""
        )
    return "\n".join(parts)


def build_page(summary_path: Path, rescue_path: Path | None, candidate_review_path: Path | None) -> str:
    payload = json.loads(summary_path.read_text(encoding="utf-8"))
    stats = payload["stats"]
    rows = payload["rows"]
    high = sorted(
        [
            row for row in rows
            if float(row.get("blink_rate_per_minute") or 0) >= 30
            or int(row.get("total_blinks") or 0) >= 100
        ],
        key=lambda row: (
            float(row.get("blink_rate_per_minute") or 0),
            int(row.get("total_blinks") or 0),
        ),
        reverse=True,
    )
    zeros = sorted(
        [row for row in rows if int(row.get("total_blinks") or 0) == 0],
        key=lambda row: float(row.get("duration_seconds") or 0),
        reverse=True,
    )
    rescue_rows: list[dict] = []
    if rescue_path and rescue_path.exists():
        with rescue_path.open(encoding="utf-8") as handle:
            rescue_rows = list(csv.DictReader(handle))
    candidate_rows: list[dict] = []
    if candidate_review_path and candidate_review_path.exists():
        with candidate_review_path.open(encoding="utf-8") as handle:
            candidate_rows = list(csv.DictReader(handle))
    rescue_rows = sorted(
        rescue_rows,
        key=lambda row: (
            int(row.get("rescue_candidate_count") or 0),
            int(row.get("bilateral_candidate_count") or 0),
        ),
        reverse=True,
    )

    clinical_ratio = stats["total_blinks"] / stats["raw_eye_blinks"] * 100
    bilateral_ratio = stats["bilateral_blinks"] / stats["total_blinks"] * 100
    nonzero_ratio = stats["nonzero_count"] / stats["videos_with_metrics"] * 100
    candidate_total = sum(int(row.get("candidate_count") or 0) for row in candidate_rows)
    candidate_videos = sum(1 for row in candidate_rows if int(row.get("candidate_count") or 0) > 0)
    candidate_left = sum(int(row.get("left_dominant_candidate_count") or 0) for row in candidate_rows)
    candidate_right = sum(int(row.get("right_dominant_candidate_count") or 0) for row in candidate_rows)

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BlinkTracking — Resultados Drive · SmartBlinking</title>
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
  <style>
    :root {{ --bg:#faf6f0; --surface:#ffffff; --surface2:#f5f0e8; --border:#e2d9ce; --cardinal:#8C1515; --blue:#006CB8; --purple:#53284F; --teal:#279989; --green:#175E54; --orange:#E98300; --text:#2E2D29; --muted:#544948; --muted2:#4D4F53; }}
    * {{ box-sizing:border-box; margin:0; padding:0; }}
    body {{ font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif; background:var(--bg); color:var(--text); line-height:1.62; font-size:15px; }}
    a {{ color:inherit; }}
    .hero {{ background:linear-gradient(135deg,#fdf8f2 0%,#f8ede0 55%,#f2e6dc 100%); border-bottom:1px solid var(--border); padding:42px 28px 34px; }}
    .wrap, main {{ max-width:1180px; margin:0 auto; }}
    .badge {{ display:inline-flex; align-items:center; gap:7px; background:#f9e8e8; border:1px solid #e8b0b0; color:var(--cardinal); font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; padding:5px 12px; border-radius:999px; margin-bottom:16px; }}
    h1 {{ font-size:clamp(30px,5vw,48px); line-height:1.08; letter-spacing:-.035em; margin-bottom:12px; }}
    h1 span {{ color:var(--cardinal); }}
    .sub {{ color:var(--muted2); max-width:850px; font-size:16px; }}
    .nav {{ display:flex; flex-wrap:wrap; gap:10px; margin-top:24px; }}
    .nav a {{ text-decoration:none; border:1px solid var(--border); background:rgba(255,255,255,.7); border-radius:999px; padding:8px 13px; font-weight:700; font-size:13px; }}
    main {{ padding:32px 20px 70px; }}
    section {{ margin-bottom:34px; }}
    .section-label {{ display:flex; align-items:center; gap:7px; font-size:11px; text-transform:uppercase; letter-spacing:.12em; color:var(--cardinal); font-weight:800; margin-bottom:7px; }}
    h2 {{ font-size:22px; margin-bottom:16px; letter-spacing:-.02em; }}
    .stat-grid {{ display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }}
    .stat,.card,.bar-card {{ background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:18px; box-shadow:0 1px 3px rgba(46,45,41,.05); }}
    .stat .value {{ display:block; font-size:30px; line-height:1; font-weight:850; letter-spacing:-.03em; margin-bottom:6px; }}
    .stat .label {{ color:var(--muted); font-size:12px; }}
    .note {{ border-left:4px solid var(--cardinal); }}
    .two {{ display:grid; grid-template-columns:1.05fr .95fr; gap:16px; }}
    .finding {{ display:flex; gap:10px; margin:10px 0; color:var(--muted2); }}
    .finding i {{ color:var(--cardinal); width:18px; height:18px; flex:0 0 auto; margin-top:3px; }}
    .pill-row {{ display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; }}
    .pill {{ background:var(--surface2); border:1px solid var(--border); border-radius:999px; padding:5px 10px; color:var(--muted2); font-size:12px; }}
    .table-wrap {{ overflow-x:auto; background:var(--surface); border:1px solid var(--border); border-radius:12px; box-shadow:0 1px 3px rgba(46,45,41,.05); }}
    table {{ width:100%; border-collapse:collapse; min-width:820px; }}
    th {{ text-align:left; background:var(--surface2); color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.08em; padding:12px 14px; }}
    td {{ border-top:1px solid var(--border); padding:12px 14px; color:var(--muted2); vertical-align:top; }}
    td span {{ display:block; font-size:12px; color:var(--muted); margin-top:2px; }}
    .num {{ text-align:right; font-weight:750; color:var(--text); white-space:nowrap; }}
    .muted {{ color:var(--muted2); font-weight:650; }}
    .bar-grid {{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }}
    .bar-title {{ font-size:13px; font-weight:800; margin-bottom:10px; }}
    .track {{ height:10px; background:var(--surface2); border-radius:999px; overflow:hidden; border:1px solid var(--border); }}
    .fill {{ height:100%; background:var(--cardinal); }} .fill.green {{ background:var(--green); }} .fill.blue {{ background:var(--blue); }}
    footer {{ border-top:1px solid var(--border); padding:24px 20px; color:var(--muted); font-size:12px; text-align:center; }}
    @media(max-width:850px) {{ .stat-grid,.two,.bar-grid {{ grid-template-columns:1fr; }} .hero {{ padding:30px 18px; }} main {{ padding:24px 14px 56px; }} }}
  </style>
</head>
<body>
  <header class="hero"><div class="wrap">
    <div class="badge"><i data-lucide="activity"></i> BlinkTracking · relatório Drive</div>
    <h1>Resultados clínicos atualizados da análise de <span>piscadas</span></h1>
    <p class="sub">Consolidação dos 71 vídeos do Drive após correção da métrica combinada e calibração por anotação manual. Eventos esquerdo/direito sincronizados contam como uma piscada clínica; candidatos relaxados são preservados para revisão.</p>
    <nav class="nav"><a href="./">← Visão geral SmartBlinking</a><a href="#estatisticas">Estatísticas</a><a href="#validacao">Validação manual</a><a href="#tabelas">Tabelas</a></nav>
  </div></header>
  <main>
    <section id="estatisticas"><div class="section-label"><i data-lucide="bar-chart-3"></i> Estatísticas principais</div><h2>Coorte processada e métrica clínica</h2>
      <div class="stat-grid">
        <div class="stat"><span class="value" style="color:var(--cardinal)">{_num(stats['videos_with_metrics'])}</span><span class="label">vídeos com métricas</span></div>
        <div class="stat"><span class="value" style="color:var(--blue)">{_num(stats['total_blinks'])}</span><span class="label">piscadas clínicas</span></div>
        <div class="stat"><span class="value" style="color:var(--purple)">{_num(stats['raw_eye_blinks'])}</span><span class="label">eventos crus por olho</span></div>
        <div class="stat"><span class="value" style="color:var(--green)">{_num(stats['bilateral_blinks'])}</span><span class="label">bilaterais sincronizadas</span></div>
        <div class="stat"><span class="value" style="color:var(--orange)">{_num(stats['zero_count'])}</span><span class="label">vídeos com zero evento</span></div>
        <div class="stat"><span class="value" style="color:var(--teal)">{_fmt(stats['median_rate'])}/min</span><span class="label">taxa mediana</span></div>
        <div class="stat"><span class="value" style="color:var(--cardinal)">{_fmt(stats['max_rate'])}/min</span><span class="label">maior taxa clínica</span></div>
        <div class="stat"><span class="value" style="color:var(--blue)">{_num(stats.get('left_dominant_blinks', 0))}/{_num(stats.get('right_dominant_blinks', 0))}</span><span class="label">dominantes E/D</span></div>
        <div class="stat"><span class="value" style="color:var(--purple)">{_num(candidate_total)}</span><span class="label">candidatos clínicos</span></div>
        <div class="stat"><span class="value" style="color:var(--teal)">{_num(candidate_left)}/{_num(candidate_right)}</span><span class="label">cand. dominantes E/D</span></div>
      </div>
    </section>
    <section class="two">
      <div class="card note"><div class="section-label"><i data-lucide="shield-check"></i> Correção metodológica</div><h2>O que mudou nesta versão</h2>
        <div class="finding"><i data-lucide="check-circle-2"></i><p>A métrica <strong>combined</strong> representa piscadas clínicas únicas, não soma simples de olho esquerdo + direito.</p></div>
        <div class="finding"><i data-lucide="check-circle-2"></i><p>Eventos bilaterais agora carregam lateralidade: simétrico, dominante esquerdo ou dominante direito.</p></div>
        <div class="finding"><i data-lucide="check-circle-2"></i><p>O total cru permanece disponível: <strong>{_num(stats['raw_eye_blinks'])}</strong> eventos crus versus <strong>{_num(stats['total_blinks'])}</strong> piscadas clínicas.</p></div>
      </div>
      <div class="card" id="validacao"><div class="section-label"><i data-lucide="microscope"></i> Validação manual</div><h2>Casos anotados</h2>
        <div class="finding"><i data-lucide="eye"></i><p><strong>Paciente 7</strong>: três eventos detectados batem com a revisão manual; visualmente há dominância do olho esquerdo.</p></div>
        <div class="finding"><i data-lucide="eye-off"></i><p><strong>Paciente 16</strong>: detector principal zerou; a passada relaxada encontrou dois candidatos. Visualmente há dominância do olho direito.</p></div>
        <div class="finding"><i data-lucide="eye"></i><p><strong>Paciente 30</strong>: revisão marcou 00:01, 00:04 e 00:06 com dominância direita; a camada sensível recupera os três tempos para revisão.</p></div>
        <div class="finding"><i data-lucide="eye-off"></i><p><strong>Paciente 15</strong>: revisão marcou 00:07; a passada relaxada encontrou candidato direito em 6,614 s.</p></div>
        <div class="finding"><i data-lucide="eye"></i><p><strong>Paciente 10</strong>: revisão marcou 00:03, 00:11 e 00:13; a camada sensível aponta 2,704 s, 11,183 s e 13,261 s, sem promover o artefato após 00:17.</p></div>
        <div class="finding"><i data-lucide="clipboard-list"></i><p>Camada sensível: {_num(candidate_total)} candidatos em {_num(candidate_videos)} vídeos. Estes candidatos não alteram o desfecho principal.</p></div>
      </div>
    </section>
    <section><div class="section-label"><i data-lucide="git-compare"></i> Relação cru × clínico</div><h2>Impacto da sincronização bilateral</h2>
      <div class="bar-grid">
        <div class="bar-card"><div class="bar-title">Piscadas clínicas / eventos crus</div><div class="track"><div class="fill" style="width:{clinical_ratio:.1f}%"></div></div><p class="pill-row"><span class="pill">{_fmt(clinical_ratio)}% do total cru</span></p></div>
        <div class="bar-card"><div class="bar-title">Bilaterais entre eventos clínicos</div><div class="track"><div class="fill green" style="width:{bilateral_ratio:.1f}%"></div></div><p class="pill-row"><span class="pill">{_fmt(bilateral_ratio)}% bilaterais</span></p></div>
        <div class="bar-card"><div class="bar-title">Vídeos não-zero</div><div class="track"><div class="fill blue" style="width:{nonzero_ratio:.1f}%"></div></div><p class="pill-row"><span class="pill">{_num(stats['nonzero_count'])}/{_num(stats['videos_with_metrics'])} vídeos</span></p></div>
      </div>
    </section>
    <section id="tabelas"><div class="section-label"><i data-lucide="alert-triangle"></i> Revisão prioritária</div><h2>Casos de alto volume clínico</h2><div class="table-wrap"><table><thead><tr><th>#</th><th>Paciente / vídeo</th><th class="num">Clínicas</th><th class="num">Cru por olho</th><th class="num">Taxa/min</th><th class="num">Bilaterais</th><th class="num">Dom. E/D</th></tr></thead><tbody>{_table_rows_high(high)}</tbody></table></div></section>
    <section><div class="section-label"><i data-lucide="circle-dot-dashed"></i> Zeros</div><h2>Vídeos sem eventos no detector principal</h2><div class="table-wrap"><table><thead><tr><th>#</th><th>Paciente / vídeo</th><th class="num">Duração (s)</th><th class="num">Frames detectados</th></tr></thead><tbody>{_table_rows_zero(zeros)}</tbody></table></div></section>
    <section><div class="section-label"><i data-lucide="search-check"></i> Recuperação relaxada</div><h2>Candidatos nos vídeos zero</h2><div class="table-wrap"><table><thead><tr><th>#</th><th>Paciente / vídeo</th><th class="num">Candidatos</th><th class="num">Bilaterais</th><th class="num">Dom. E/D</th></tr></thead><tbody>{_table_rows_rescue(rescue_rows)}</tbody></table></div></section>
  </main>
  <footer>SmartBlinking · HC-FMUSP · Página gerada em {datetime.now().strftime('%d/%m/%Y %H:%M')}</footer>
  <script>lucide.createIcons();</script>
</body>
</html>
"""


def ensure_home_link(index_path: Path) -> None:
    text = index_path.read_text(encoding="utf-8")
    if "blinktracking-resultados.html" in text:
        return
    css_anchor = ".hero-meta-value { font-size: 14px; font-weight: 600; color: var(--text); }"
    css_insert = css_anchor + """
    .hero-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
    .hero-link { display: inline-flex; align-items: center; gap: 8px; text-decoration: none; background: var(--cardinal); color: white; border: 1px solid var(--cardinal); border-radius: 999px; padding: 9px 14px; font-size: 13px; font-weight: 700; box-shadow: 0 2px 8px rgba(140,21,21,0.18); }
    .hero-link.secondary { background: rgba(255,255,255,0.72); color: var(--cardinal); }"""
    text = text.replace(css_anchor, css_insert)
    html_anchor = """    </div>
  </div>
</div>
"""
    html_insert = """    </div>
    <div class="hero-actions">
      <a class="hero-link" href="./blinktracking-resultados.html"><i data-lucide="bar-chart-3" class="ic"></i>Relatório BlinkTracking Drive</a>
      <a class="hero-link secondary" href="./blinktracking-resultados.html#validacao"><i data-lucide="microscope" class="ic"></i>Validação manual</a>
    </div>
  </div>
</div>
"""
    text = text.replace(html_anchor, html_insert, 1)
    index_path.write_text(text, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--summary-json", required=True, type=Path)
    parser.add_argument("--rescue-csv", type=Path)
    parser.add_argument("--candidate-review-csv", type=Path)
    parser.add_argument("--site-dir", required=True, type=Path)
    args = parser.parse_args()

    args.site_dir.mkdir(parents=True, exist_ok=True)
    output = args.site_dir / "blinktracking-resultados.html"
    output.write_text(
        build_page(args.summary_json, args.rescue_csv, args.candidate_review_csv),
        encoding="utf-8",
    )
    index_path = args.site_dir / "index.html"
    if index_path.exists():
        ensure_home_link(index_path)
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
