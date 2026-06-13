#!/usr/bin/env python3
"""Compara anotações manuais de piscadas contra detecções do algoritmo."""

import argparse
import json
import math
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from blinktracking.eye_metrics import (
    calculate_ear_series,
    detect_blinks_single_eye,
    detect_csv_type,
    smooth_ear_series,
)


def parse_time_to_ms(value: str) -> float:
    parts = value.strip().split(":")
    if len(parts) == 2:
        minutes, seconds = parts
        return (int(minutes) * 60 + float(seconds)) * 1000.0
    return float(value) * 1000.0


def read_fps_from_csv(csv_path: Path, fallback=30.0) -> float:
    with csv_path.open("r", encoding="utf-8") as f:
        first = f.readline()
    if first.startswith("# FPS:"):
        try:
            fps = float(first.split(":", 1)[1].strip())
            return fps if fps > 0 else fallback
        except ValueError:
            return fallback
    return fallback


def manual_from_times(times, fps: float, duration_ms: float) -> list[dict]:
    annotations = []
    for i, item in enumerate(times, start=1):
        start_ms = parse_time_to_ms(item)
        end_ms = start_ms + duration_ms
        annotations.append({
            "blink_id": i,
            "frame_inicio": int(round(start_ms * fps / 1000.0)),
            "frame_fim": int(round(end_ms * fps / 1000.0)),
            "timestamp_inicio_ms": start_ms,
            "timestamp_fim_ms": end_ms,
        })
    return annotations


def load_manual(path: Path | None, times, fps: float, duration_ms: float) -> list[dict]:
    if path:
        return json.loads(path.read_text(encoding="utf-8"))
    if times:
        return manual_from_times(times, fps, duration_ms)
    raise ValueError("Informe --manual-json ou --manual-times.")


def detect_from_csv(csv_path: Path, fps: float):
    df = pd.read_csv(csv_path, comment="#")
    csv_type = detect_csv_type(df)
    if csv_type is None:
        raise ValueError(f"Tipo de CSV não reconhecido: {csv_path}")

    ear_right_raw, ear_left_raw = calculate_ear_series(df, csv_type)
    ear_right = smooth_ear_series(ear_right_raw)
    ear_left = smooth_ear_series(ear_left_raw)

    baseline_right = np.nanpercentile(ear_right, 90)
    baseline_left = np.nanpercentile(ear_left, 90)
    right = detect_blinks_single_eye(ear_right, fps, baseline_right, "Direito")
    left = detect_blinks_single_eye(ear_left, fps, baseline_left, "Esquerdo")
    detected = right + left
    detected.sort(key=lambda item: item["Tempo Inicio (s)"])

    avg_ear = np.nanmean(np.vstack([ear_right, ear_left]), axis=0)
    time_s = np.arange(len(avg_ear)) / fps
    return detected, time_s, avg_ear


def load_detected_from_xlsx(xlsx_path: Path):
    df = pd.read_excel(xlsx_path, sheet_name="Todas Piscadas")
    detected = df.to_dict("records")
    return detected


def event_interval_ms(event: dict, detected=False):
    if detected:
        return event["Tempo Inicio (s)"] * 1000.0, event["Tempo Fim (s)"] * 1000.0
    return event["timestamp_inicio_ms"], event["timestamp_fim_ms"]


def pair_events(manual, detected, tolerance_ms: float):
    pairs = []
    used_detected = set()

    for manual_idx, manual_event in enumerate(manual):
        manual_start, manual_end = event_interval_ms(manual_event)
        best = None
        for detected_idx, detected_event in enumerate(detected):
            if detected_idx in used_detected:
                continue
            detected_start, detected_end = event_interval_ms(detected_event, detected=True)
            onset_error = detected_start - manual_start
            overlap = max(0.0, min(manual_end, detected_end) - max(manual_start, detected_start))
            if abs(onset_error) <= tolerance_ms or overlap > 0:
                score = (abs(onset_error), -overlap)
                if best is None or score < best[0]:
                    best = (score, detected_idx, onset_error, detected_end - manual_end)
        if best is not None:
            _, detected_idx, onset_error, offset_error = best
            used_detected.add(detected_idx)
            pairs.append((manual_idx, detected_idx, onset_error, offset_error))

    false_negatives = [i for i in range(len(manual)) if i not in {p[0] for p in pairs}]
    false_positives = [i for i in range(len(detected)) if i not in used_detected]
    return pairs, false_positives, false_negatives


def summarize(manual, detected, pairs, false_positives, false_negatives):
    tp = len(pairs)
    fp = len(false_positives)
    fn = len(false_negatives)
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0

    onset_errors = np.array([p[2] for p in pairs], dtype=float)
    offset_errors = np.array([p[3] for p in pairs], dtype=float)
    manual_durations = []
    detected_durations = []
    for manual_idx, detected_idx, *_ in pairs:
        m0, m1 = event_interval_ms(manual[manual_idx])
        d0, d1 = event_interval_ms(detected[detected_idx], detected=True)
        manual_durations.append(m1 - m0)
        detected_durations.append(d1 - d0)

    if len(manual_durations) >= 2 and np.std(manual_durations) > 0 and np.std(detected_durations) > 0:
        duration_corr = float(np.corrcoef(manual_durations, detected_durations)[0, 1])
    else:
        duration_corr = math.nan

    return {
        "true_positives": tp,
        "false_positives": fp,
        "false_negatives": fn,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "onset_error_mean_ms": float(np.mean(onset_errors)) if len(onset_errors) else math.nan,
        "onset_error_median_ms": float(np.median(onset_errors)) if len(onset_errors) else math.nan,
        "offset_error_mean_ms": float(np.mean(offset_errors)) if len(offset_errors) else math.nan,
        "offset_error_median_ms": float(np.median(offset_errors)) if len(offset_errors) else math.nan,
        "manual_duration_mean_ms": float(np.mean(manual_durations)) if manual_durations else math.nan,
        "detected_duration_mean_ms": float(np.mean(detected_durations)) if detected_durations else math.nan,
        "duration_correlation": duration_corr,
    }


def make_plot(path: Path, time_s, ear, manual, detected, false_positives, false_negatives):
    fig, ax = plt.subplots(figsize=(14, 5))
    ax.plot(time_s, ear, color="black", linewidth=0.8, label="EAR médio")

    for event in manual:
        start, end = event_interval_ms(event)
        ax.axvspan(start / 1000.0, end / 1000.0, color="green", alpha=0.2)
    for event in detected:
        start, end = event_interval_ms(event, detected=True)
        ax.axvspan(start / 1000.0, end / 1000.0, color="blue", alpha=0.14)
    for idx in false_negatives:
        start, end = event_interval_ms(manual[idx])
        ax.axvspan(start / 1000.0, end / 1000.0, color="red", alpha=0.35)
    for idx in false_positives:
        start, end = event_interval_ms(detected[idx], detected=True)
        ax.axvspan(start / 1000.0, end / 1000.0, color="red", alpha=0.18)

    ax.set_xlabel("Tempo (s)")
    ax.set_ylabel("EAR médio")
    ax.set_title("Piscadas manuais (verde), detectadas (azul) e discordâncias (vermelho)")
    ax.grid(alpha=0.2)
    ax.legend(loc="upper right")
    fig.tight_layout()
    fig.savefig(path, dpi=160)
    plt.close(fig)


def write_markdown(path: Path, summary, manual, detected, pairs, false_positives, false_negatives, plot_path):
    lines = [
        "# Comparação de Piscadas",
        "",
        "## Métricas",
        "",
        f"- Verdadeiros positivos: {summary['true_positives']}",
        f"- Falsos positivos: {summary['false_positives']}",
        f"- Falsos negativos: {summary['false_negatives']}",
        f"- Precisão: {summary['precision']:.3f}",
        f"- Recall: {summary['recall']:.3f}",
        f"- F1: {summary['f1']:.3f}",
        f"- Erro médio de onset: {summary['onset_error_mean_ms']:.1f} ms",
        f"- Erro mediano de onset: {summary['onset_error_median_ms']:.1f} ms",
        f"- Erro médio de offset: {summary['offset_error_mean_ms']:.1f} ms",
        f"- Erro mediano de offset: {summary['offset_error_median_ms']:.1f} ms",
        f"- Duração média manual: {summary['manual_duration_mean_ms']:.1f} ms",
        f"- Duração média detectada: {summary['detected_duration_mean_ms']:.1f} ms",
        f"- Correlação de durações: {summary['duration_correlation']:.3f}",
        "",
        f"![Série EAR]({plot_path.name})",
        "",
        "## Pareamentos",
        "",
        "| Manual | Detectada | Erro onset (ms) | Erro offset (ms) |",
        "|---:|---:|---:|---:|",
    ]
    for manual_idx, detected_idx, onset_error, offset_error in pairs:
        manual_id = manual[manual_idx].get("blink_id", manual_idx + 1)
        detected_id = detected[detected_idx].get("ID", detected_idx + 1)
        lines.append(f"| {manual_id} | {detected_id} | {onset_error:.1f} | {offset_error:.1f} |")

    lines.extend([
        "",
        f"Falsos negativos manuais: {false_negatives}",
        f"Falsos positivos detectados: {false_positives}",
        "",
    ])
    path.write_text("\n".join(lines), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="Compara anotações manuais com detecção automática.")
    parser.add_argument("--video", type=Path, required=False, help="Usado apenas para nomear saídas quando necessário.")
    parser.add_argument("--csv", type=Path, required=True, help="CSV de pontos all_points ou eyes_only.")
    parser.add_argument("--xlsx", type=Path, default=None, help="Opcional: usa aba 'Todas Piscadas' como detecção.")
    parser.add_argument("--manual-json", type=Path, default=None)
    parser.add_argument("--manual-times", nargs="*", default=None, help="Tempos aproximados mm:ss ou segundos.")
    parser.add_argument("--manual-duration-ms", type=float, default=200.0)
    parser.add_argument("--tolerance-ms", type=float, default=150.0)
    parser.add_argument("--saida-dir", type=Path, default=None)
    args = parser.parse_args()

    fps = read_fps_from_csv(args.csv)
    manual = load_manual(args.manual_json, args.manual_times, fps, args.manual_duration_ms)
    detected, time_s, ear = detect_from_csv(args.csv, fps)
    if args.xlsx:
        detected = load_detected_from_xlsx(args.xlsx)

    pairs, false_positives, false_negatives = pair_events(manual, detected, args.tolerance_ms)
    summary = summarize(manual, detected, pairs, false_positives, false_negatives)

    output_dir = args.saida_dir or args.csv.parent
    output_dir.mkdir(parents=True, exist_ok=True)
    stem = (args.video.stem if args.video else args.csv.stem) + "_comparacao_piscadas"
    plot_path = output_dir / f"{stem}.png"
    md_path = output_dir / f"{stem}.md"
    json_path = output_dir / f"{stem}.json"

    make_plot(plot_path, time_s, ear, manual, detected, false_positives, false_negatives)
    write_markdown(md_path, summary, manual, detected, pairs, false_positives, false_negatives, plot_path)
    json_path.write_text(json.dumps({
        "summary": summary,
        "pairs": pairs,
        "false_positives": false_positives,
        "false_negatives": false_negatives,
    }, indent=2, ensure_ascii=False), encoding="utf-8")

    print(json.dumps(summary, indent=2, ensure_ascii=False))
    print(f"Relatórios salvos em:\n  {md_path}\n  {plot_path}\n  {json_path}")


if __name__ == "__main__":
    main()
