#!/usr/bin/env python3
"""Gera relatório científico consolidado a partir dos resultados do Drive."""

from __future__ import annotations

import argparse
import html
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import pandas as pd


def _read_main(path: Path) -> pd.DataFrame:
    payload = json.loads(path.read_text(encoding="utf-8"))
    rows = payload["rows"] if isinstance(payload, dict) else payload
    df = pd.DataFrame(rows)
    numeric_cols = [
        "fps",
        "duration_seconds",
        "frames_processed",
        "detections",
        "detection_ratio",
        "total_blinks",
        "left_blinks",
        "right_blinks",
        "blink_rate_per_minute",
        "mean_duration_ms",
        "mean_completeness",
        "complete_blinks",
        "incomplete_blinks",
        "bilateral_blinks",
        "unilateral_left_blinks",
        "unilateral_right_blinks",
        "raw_eye_blinks",
        "bilateral_symmetric_blinks",
        "left_dominant_blinks",
        "right_dominant_blinks",
        "elapsed_seconds",
        "download_size_mb",
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    df["grupo"] = df["grupo"].fillna("Indefinido")
    return df


def _read_rescue(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    if df.empty:
        return df
    for col in [
        "idx",
        "original_total_blinks",
        "reprocessed_total_blinks",
        "rescue_candidate_count",
        "bilateral_candidate_count",
        "unilateral_candidate_count",
    ]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)
    df["paciente"] = df["remote_path"].str.split("/").str[0]
    df["video"] = df["remote_path"].str.split("/").str[-1]
    return df


def _read_candidate_review(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    if df.empty:
        return df
    for col in [
        "idx",
        "total_blinks",
        "candidate_count",
        "bilateral_candidate_count",
        "unilateral_candidate_count",
        "left_dominant_candidate_count",
        "right_dominant_candidate_count",
    ]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)
    return df


def _format_float(value: float, digits: int = 2) -> str:
    if pd.isna(value):
        return ""
    return f"{value:.{digits}f}".replace(".", ",")


def _group_summary(df: pd.DataFrame) -> pd.DataFrame:
    grouped = (
        df.groupby("grupo", dropna=False)
        .agg(
            videos=("video", "count"),
            total_blinks=("total_blinks", "sum"),
            raw_eye_blinks=("raw_eye_blinks", "sum"),
            median_rate=("blink_rate_per_minute", "median"),
            mean_rate=("blink_rate_per_minute", "mean"),
            median_duration_ms=("mean_duration_ms", "median"),
            median_completeness=("mean_completeness", "median"),
            zero_videos=("total_blinks", lambda s: int((s == 0).sum())),
            median_detection_ratio=("detection_ratio", "median"),
            video_hours=("duration_seconds", lambda s: s.sum() / 3600.0),
        )
        .reset_index()
    )
    return grouped


def _save_figures(df: pd.DataFrame, rescue: pd.DataFrame, output_dir: Path) -> dict[str, str]:
    figures: dict[str, str] = {}

    fig, ax = plt.subplots(figsize=(9, 5))
    ax.hist(df["blink_rate_per_minute"].dropna(), bins=24, color="#0ea5e9", alpha=0.78, edgecolor="white")
    ax.axvline(df["blink_rate_per_minute"].median(), color="#111827", linestyle="--", label="Mediana")
    ax.set_title("Distribuição da taxa de piscadas")
    ax.set_xlabel("Piscadas por minuto")
    ax.set_ylabel("Vídeos")
    ax.legend()
    fig.tight_layout()
    path = output_dir / "taxa_piscadas_histograma.png"
    fig.savefig(path, dpi=160)
    plt.close(fig)
    figures["hist_rate"] = path.name

    fig, ax = plt.subplots(figsize=(8, 5))
    groups = [group["blink_rate_per_minute"].dropna().to_numpy() for _, group in df.groupby("grupo")]
    labels = [str(label) for label in df.groupby("grupo").groups.keys()]
    ax.boxplot(groups, tick_labels=labels, showfliers=True)
    ax.set_title("Taxa de piscadas por grupo")
    ax.set_ylabel("Piscadas por minuto")
    fig.tight_layout()
    path = output_dir / "taxa_piscadas_por_grupo.png"
    fig.savefig(path, dpi=160)
    plt.close(fig)
    figures["box_rate"] = path.name

    fig, ax = plt.subplots(figsize=(9, 5))
    scatter = ax.scatter(
        df["duration_seconds"],
        df["blink_rate_per_minute"],
        s=(df["total_blinks"].fillna(0) + 8).clip(8, 160),
        c=df["total_blinks"],
        cmap="viridis",
        alpha=0.75,
    )
    high = df[(df["blink_rate_per_minute"] >= 30) | (df["total_blinks"] >= 100)]
    for _, row in high.iterrows():
        ax.annotate(str(row["idx"]), (row["duration_seconds"], row["blink_rate_per_minute"]), fontsize=8)
    ax.set_title("Duração do vídeo vs taxa de piscadas")
    ax.set_xlabel("Duração do vídeo (s)")
    ax.set_ylabel("Piscadas por minuto")
    fig.colorbar(scatter, ax=ax, label="Total de piscadas")
    fig.tight_layout()
    path = output_dir / "duracao_vs_taxa.png"
    fig.savefig(path, dpi=160)
    plt.close(fig)
    figures["scatter_duration_rate"] = path.name

    if not rescue.empty:
        rescue_sorted = rescue.sort_values("rescue_candidate_count", ascending=False)
        fig, ax = plt.subplots(figsize=(10, 6))
        labels = rescue_sorted["idx"].astype(str) + " - " + rescue_sorted["video"].astype(str)
        ax.barh(labels, rescue_sorted["rescue_candidate_count"], color="#f59e0b")
        ax.invert_yaxis()
        ax.set_title("Candidatos relaxados nos vídeos com zero eventos")
        ax.set_xlabel("Candidatos")
        fig.tight_layout()
        path = output_dir / "zero_blinks_candidatos.png"
        fig.savefig(path, dpi=160)
        plt.close(fig)
        figures["rescue_candidates"] = path.name

    return figures


def _table_markdown(df: pd.DataFrame, columns: list[str]) -> str:
    if df.empty:
        return "_Sem registros._"
    selected = df[columns].fillna("")
    header = "| " + " | ".join(columns) + " |"
    separator = "| " + " | ".join("---" for _ in columns) + " |"
    rows = [
        "| " + " | ".join(str(row[col]).replace("|", "/") for col in columns) + " |"
        for _, row in selected.iterrows()
    ]
    return "\n".join([header, separator, *rows])


def _html_table(df: pd.DataFrame, columns: list[str]) -> str:
    if df.empty:
        return "<p>Sem registros.</p>"
    return df[columns].to_html(index=False, escape=True, classes="data-table")


def build_report(
    main_df: pd.DataFrame,
    rescue_df: pd.DataFrame,
    candidate_df: pd.DataFrame,
    output_dir: Path,
) -> tuple[str, str]:
    output_dir.mkdir(parents=True, exist_ok=True)
    figures = _save_figures(main_df, rescue_df, output_dir)

    total_videos = len(main_df)
    total_blinks = int(main_df["total_blinks"].sum())
    raw_eye_blinks = int(main_df["raw_eye_blinks"].sum()) if "raw_eye_blinks" in main_df else total_blinks
    bilateral_blinks = int(main_df["bilateral_blinks"].sum()) if "bilateral_blinks" in main_df else 0
    unilateral_left = int(main_df["unilateral_left_blinks"].sum()) if "unilateral_left_blinks" in main_df else 0
    unilateral_right = int(main_df["unilateral_right_blinks"].sum()) if "unilateral_right_blinks" in main_df else 0
    bilateral_symmetric = int(main_df["bilateral_symmetric_blinks"].sum()) if "bilateral_symmetric_blinks" in main_df else 0
    left_dominant = int(main_df["left_dominant_blinks"].sum()) if "left_dominant_blinks" in main_df else 0
    right_dominant = int(main_df["right_dominant_blinks"].sum()) if "right_dominant_blinks" in main_df else 0
    zero_count = int((main_df["total_blinks"] == 0).sum())
    high_review = main_df[
        (main_df["blink_rate_per_minute"] >= 30) | (main_df["total_blinks"] >= 100)
    ].sort_values(["blink_rate_per_minute", "total_blinks"], ascending=False)
    group_summary = _group_summary(main_df)
    rescue_candidates = int(rescue_df["rescue_candidate_count"].sum()) if not rescue_df.empty else 0
    rescue_with_candidates = int((rescue_df["rescue_candidate_count"] > 0).sum()) if not rescue_df.empty else 0
    review_candidates = int(candidate_df["candidate_count"].sum()) if not candidate_df.empty else 0
    review_with_candidates = int((candidate_df["candidate_count"] > 0).sum()) if not candidate_df.empty else 0
    review_left_dominant = int(candidate_df["left_dominant_candidate_count"].sum()) if not candidate_df.empty else 0
    review_right_dominant = int(candidate_df["right_dominant_candidate_count"].sum()) if not candidate_df.empty else 0

    group_table = group_summary.copy()
    for col in ["median_rate", "mean_rate", "median_duration_ms", "median_completeness", "median_detection_ratio", "video_hours"]:
        group_table[col] = group_table[col].map(lambda x: _format_float(x, 2))

    high_table = high_review[
        [
            "idx",
            "paciente",
            "video",
            "total_blinks",
            "blink_rate_per_minute",
            "mean_duration_ms",
            "detection_ratio",
        ]
    ].copy()
    for col in ["blink_rate_per_minute", "mean_duration_ms", "detection_ratio"]:
        high_table[col] = high_table[col].map(lambda x: _format_float(x, 2))

    rescue_table = rescue_df[
        [
            "idx",
            "paciente",
            "video",
            "rescue_candidate_count",
            "bilateral_candidate_count",
            "unilateral_candidate_count",
        ]
    ].sort_values("rescue_candidate_count", ascending=False) if not rescue_df.empty else rescue_df

    md = "\n".join(
        [
            "# Relatório científico consolidado - BlinkTracking Drive",
            "",
            "## Resumo",
            "",
            f"- Vídeos analisados: {total_videos}",
            f"- Piscadas clínicas confirmadas pelo detector principal: {total_blinks}",
            f"- Eventos crus por olho antes da sincronização clínica: {raw_eye_blinks}",
            f"- Eventos bilaterais sincronizados: {bilateral_blinks}",
            f"- Bilaterais simétricos/dominantes E/D: {bilateral_symmetric}/{left_dominant}/{right_dominant}",
            f"- Eventos unilaterais esquerdos/direitos: {unilateral_left}/{unilateral_right}",
            f"- Vídeos com zero eventos: {zero_count}",
            f"- Vídeos zero com candidatos relaxados: {rescue_with_candidates}",
            f"- Candidatos relaxados totais: {rescue_candidates}",
            f"- Candidatos clínicos para revisão em todos os vídeos: {review_candidates}",
            f"- Vídeos com candidatos clínicos: {review_with_candidates}",
            f"- Candidatos clínicos dominantes E/D: {review_left_dominant}/{review_right_dominant}",
            f"- Taxa mediana: {_format_float(main_df['blink_rate_per_minute'].median(), 2)} piscadas/min",
            f"- Taxa média: {_format_float(main_df['blink_rate_per_minute'].mean(), 2)} piscadas/min",
            "",
            "## Síntese por grupo",
            "",
            _table_markdown(group_table, list(group_table.columns)),
            "",
            "## Casos para revisão visual",
            "",
            "Critério: taxa >= 30/min ou total >= 100 piscadas.",
            "",
            _table_markdown(high_table, list(high_table.columns)),
            "",
            "## Recuperação dos zeros",
            "",
            _table_markdown(rescue_table, list(rescue_table.columns)) if not rescue_df.empty else "_Sem relatório de recuperação._",
            "",
            "## Calibração manual recente",
            "",
            "- Paciente 7 / IMG_3616: três piscadas percebidas no player como 00:10, 00:20 e 00:31 correspondem aos eventos técnicos em 3,998 s, 6,612 s e 9,447 s. A revisão visual sugere fechamento dominante do olho esquerdo.",
            "- Paciente 16 / IMG_4220: o detector principal permaneceu em zero, mas a passada relaxada encontrou dois candidatos técnicos em 3,392 s e 10,265 s. A revisão visual sugere olho direito completo e esquerdo parcial.",
            "- Paciente 30 / IMG_6086: revisão manual marcou 00:01, 00:04 e 00:06 com dominância clínica direita. O detector principal captou 00:01 e 00:06; a camada sensível recupera também o vale de 00:04.",
            "- Paciente 15 / IMG_3976: revisão manual marcou 00:07 com dominância direita; a passada relaxada encontrou candidato direito em 6,614 s.",
            "- Paciente 10 / IMG_3745: revisão manual marcou 00:03, 00:11 e 00:13. A camada sensível encontrou 2,704 s, 11,183 s e 13,261 s; o detector principal confirmou o evento de 00:11. Após 00:17 há artefato por movimento de câmera.",
            "- Interpretação: manter o desfecho primário conservador e usar candidatos relaxados com lateralidade para revisão manual/calibração.",
            "",
            "## Figuras",
            "",
            *[f"- {name}: `{filename}`" for name, filename in figures.items()],
            "",
            "## Interpretação operacional",
            "",
            "- Os candidatos relaxados não devem ser somados automaticamente ao desfecho primário.",
            "- A contagem principal agora representa piscadas clínicas únicas, sincronizando eventos esquerdo/direito próximos.",
            "- Eventos bilaterais carregam uma classificação de lateralidade: simétrico, dominante esquerdo ou dominante direito.",
            "- Os zeros sem candidato e os outliers de taxa devem formar o primeiro conjunto de anotação manual.",
            "- A comparação manual deve orientar o uso de `frame_skip`/FPS-alvo em vídeos de 150-240 fps.",
            "",
            "## Próximas melhorias técnicas",
            "",
            "- Criar escore de confiança para candidatos clínicos, mantendo o desfecho principal conservador.",
            "- Adicionar filtro de qualidade temporal para trechos com sacudida de câmera, rosto saindo do quadro ou perda de rastreamento.",
            "- Implementar modo especial para olho cronicamente fechado/semi-fechado, baseado em variação local e proeminência, não apenas abertura absoluta.",
            "- Adicionar detector complementar por mínimos locais para piscadas incompletas sutis.",
            "- Persistir eventos confirmados e candidatos com timestamps, profundidade por olho e razão de aceite/rejeição.",
            "- Calcular precisão, recall e F1 contra as anotações manuais por padrão clínico de paciente.",
            "",
        ]
    )

    figure_html = "\n".join(
        f'<figure><img src="{html.escape(filename)}" alt="{html.escape(name)}"><figcaption>{html.escape(name)}</figcaption></figure>'
        for name, filename in figures.items()
    )
    css = """
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
    main { max-width: 1180px; margin: 0 auto; padding: 32px; }
    section { background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 22px; margin: 18px 0; }
    h1 { margin-bottom: 6px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    .metric { background: #f1f5f9; border-radius: 8px; padding: 14px; }
    .metric strong { display: block; font-size: 26px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table th, .data-table td { border-bottom: 1px solid #e2e8f0; padding: 8px; text-align: left; }
    img { max-width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; background: white; }
    figure { margin: 18px 0; }
    figcaption { color: #475569; font-size: 13px; margin-top: 6px; }
    """
    html_text = f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Relatório científico consolidado - BlinkTracking Drive</title>
<style>{css}</style>
</head>
<body>
<main>
<h1>Relatório científico consolidado - BlinkTracking Drive</h1>
<p>Relatório gerado a partir dos resultados já processados, sem reprocessar vídeos.</p>
<section class="grid">
  <div class="metric"><span>Vídeos</span><strong>{total_videos}</strong></div>
  <div class="metric"><span>Piscadas clínicas</span><strong>{total_blinks}</strong></div>
  <div class="metric"><span>Eventos crus por olho</span><strong>{raw_eye_blinks}</strong></div>
  <div class="metric"><span>Dominantes E/D</span><strong>{left_dominant}/{right_dominant}</strong></div>
  <div class="metric"><span>Zeros</span><strong>{zero_count}</strong></div>
  <div class="metric"><span>Candidatos relaxados</span><strong>{rescue_candidates}</strong></div>
  <div class="metric"><span>Candidatos clínicos</span><strong>{review_candidates}</strong></div>
</section>
<section>
<h2>Síntese por grupo</h2>
{_html_table(group_table, list(group_table.columns))}
</section>
<section>
<h2>Casos para revisão visual</h2>
<p>Critério: taxa >= 30/min ou total >= 100 piscadas.</p>
{_html_table(high_table, list(high_table.columns))}
</section>
<section>
<h2>Recuperação dos zeros</h2>
{_html_table(rescue_table, list(rescue_table.columns)) if not rescue_df.empty else "<p>Sem relatório de recuperação.</p>"}
</section>
<section>
<h2>Calibração manual recente</h2>
<ul>
  <li>Paciente 7 / IMG_3616: três piscadas percebidas no player como 00:10, 00:20 e 00:31 correspondem aos eventos técnicos em 3,998 s, 6,612 s e 9,447 s. A revisão visual sugere fechamento dominante do olho esquerdo.</li>
  <li>Paciente 16 / IMG_4220: o detector principal permaneceu em zero, mas a passada relaxada encontrou dois candidatos técnicos em 3,392 s e 10,265 s. A revisão visual sugere olho direito completo e esquerdo parcial.</li>
  <li>Paciente 30 / IMG_6086: revisão manual marcou 00:01, 00:04 e 00:06 com dominância clínica direita. O detector principal captou 00:01 e 00:06; a camada sensível recupera também o vale de 00:04.</li>
  <li>Paciente 15 / IMG_3976: revisão manual marcou 00:07 com dominância direita; a passada relaxada encontrou candidato direito em 6,614 s.</li>
  <li>Paciente 10 / IMG_3745: revisão manual marcou 00:03, 00:11 e 00:13. A camada sensível encontrou 2,704 s, 11,183 s e 13,261 s; o detector principal confirmou o evento de 00:11. Após 00:17 há artefato por movimento de câmera.</li>
  <li>Interpretação: manter o desfecho primário conservador e usar candidatos relaxados com lateralidade para revisão manual/calibração.</li>
</ul>
</section>
<section>
<h2>Figuras</h2>
{figure_html}
</section>
<section>
<h2>Interpretação operacional</h2>
<ul>
  <li>Os candidatos relaxados não devem ser somados automaticamente ao desfecho primário.</li>
  <li>A contagem principal agora representa piscadas clínicas únicas, sincronizando eventos esquerdo/direito próximos.</li>
  <li>Eventos bilaterais carregam classificação de lateralidade: simétrico, dominante esquerdo ou dominante direito.</li>
  <li>Os zeros sem candidato e os outliers de taxa devem formar o primeiro conjunto de anotação manual.</li>
  <li>A comparação manual deve orientar o uso de frame_skip/FPS-alvo em vídeos de 150-240 fps.</li>
</ul>
</section>
<section>
<h2>Próximas melhorias técnicas</h2>
<ul>
  <li>Criar escore de confiança para candidatos clínicos, mantendo o desfecho principal conservador.</li>
  <li>Adicionar filtro de qualidade temporal para trechos com sacudida de câmera, rosto saindo do quadro ou perda de rastreamento.</li>
  <li>Implementar modo especial para olho cronicamente fechado/semi-fechado, baseado em variação local e proeminência, não apenas abertura absoluta.</li>
  <li>Adicionar detector complementar por mínimos locais para piscadas incompletas sutis.</li>
  <li>Persistir eventos confirmados e candidatos com timestamps, profundidade por olho e razão de aceite/rejeição.</li>
  <li>Calcular precisão, recall e F1 contra as anotações manuais por padrão clínico de paciente.</li>
</ul>
</section>
</main>
</body>
</html>
"""
    return md, html_text


def main() -> int:
    parser = argparse.ArgumentParser(description="Gera relatório científico dos resultados do Drive.")
    parser.add_argument(
        "--main-json",
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
        default=Path("/Users/iaparamedicos/Documents/Blinktracking_Resultados_Drive/_reports/scientific"),
    )
    args = parser.parse_args()

    main_df = _read_main(args.main_json)
    rescue_df = _read_rescue(args.rescue_csv) if args.rescue_csv.exists() else pd.DataFrame()
    candidate_df = _read_candidate_review(args.candidate_review_csv) if args.candidate_review_csv.exists() else pd.DataFrame()
    md, html_text = build_report(main_df, rescue_df, candidate_df, args.output_dir)

    md_path = args.output_dir / "relatorio_cientifico_drive.md"
    html_path = args.output_dir / "relatorio_cientifico_drive.html"
    md_path.write_text(md, encoding="utf-8")
    html_path.write_text(html_text, encoding="utf-8")
    print(f"Relatórios salvos:\n  {md_path}\n  {html_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
