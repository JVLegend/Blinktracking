#!/usr/bin/env python3
"""Ferramenta OpenCV para anotação manual de piscadas."""

import argparse
import json
from pathlib import Path

import cv2


RIGHT_KEYS = {83, 2555904, 65363}
LEFT_KEYS = {81, 2424832, 65361}


def format_time(ms: float) -> str:
    total_s = ms / 1000.0
    minutes = int(total_s // 60)
    seconds = total_s - minutes * 60
    return f"{minutes:02d}:{seconds:06.3f}"


def draw_overlay(frame, frame_idx, fps, annotations, pending_start, playing):
    overlay = frame.copy()
    timestamp_ms = frame_idx * 1000.0 / fps
    lines = [
        f"Frame: {frame_idx} | Tempo: {format_time(timestamp_ms)}",
        f"Piscadas marcadas: {len(annotations)} | Estado: {'play' if playing else 'pause'}",
        "B=inicio  N=fim  U=desfazer  espaco=play/pause  setas=+/-1  A/D=+/-10  Q=salvar",
    ]
    if pending_start is None:
        lines.append("Proxima marca: inicio (B)")
    else:
        lines.append(f"Inicio pendente no frame {pending_start}; marque fim com N")

    y = 28
    for line in lines:
        cv2.putText(overlay, line, (18, y), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 0, 0), 4, cv2.LINE_AA)
        cv2.putText(overlay, line, (18, y), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 1, cv2.LINE_AA)
        y += 28
    return overlay


def save_annotations(path: Path, annotations, fps: float):
    data = []
    for i, item in enumerate(annotations, start=1):
        start_frame, end_frame = item
        data.append({
            "blink_id": i,
            "frame_inicio": int(start_frame),
            "frame_fim": int(end_frame),
            "timestamp_inicio_ms": start_frame * 1000.0 / fps,
            "timestamp_fim_ms": end_frame * 1000.0 / fps,
        })
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="Anotar piscadas manualmente frame a frame.")
    parser.add_argument("video", type=Path)
    parser.add_argument("--saida", type=Path, default=None)
    args = parser.parse_args()

    output = args.saida or args.video.with_name(f"{args.video.stem}_anotacoes_piscadas.json")
    cap = cv2.VideoCapture(str(args.video))
    if not cap.isOpened():
        raise RuntimeError(f"Não foi possível abrir o vídeo: {args.video}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_idx = 0
    playing = False
    annotations = []
    pending_start = None

    cv2.namedWindow("Anotar piscadas", cv2.WINDOW_NORMAL)

    while True:
        frame_idx = max(0, min(frame_idx, total_frames - 1))
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ok, frame = cap.read()
        if not ok:
            break

        shown = draw_overlay(frame, frame_idx, fps, annotations, pending_start, playing)
        cv2.imshow("Anotar piscadas", shown)
        key = cv2.waitKey(1 if playing else 0)

        if key in {-1, 255}:
            if playing:
                frame_idx += 1
                if frame_idx >= total_frames:
                    playing = False
            continue

        key_char = chr(key & 0xFF).lower() if key >= 0 else ""
        if key_char == "q":
            save_annotations(output, annotations, fps)
            break
        if key_char == " ":
            playing = not playing
        elif key in RIGHT_KEYS:
            playing = False
            frame_idx += 1
        elif key in LEFT_KEYS:
            playing = False
            frame_idx -= 1
        elif key_char == "d":
            playing = False
            frame_idx += 10
        elif key_char == "a":
            playing = False
            frame_idx -= 10
        elif key_char == "b":
            playing = False
            pending_start = frame_idx
        elif key_char == "n" and pending_start is not None:
            playing = False
            start = min(pending_start, frame_idx)
            end = max(pending_start, frame_idx)
            annotations.append((start, end))
            pending_start = None
        elif key_char == "u":
            playing = False
            if pending_start is not None:
                pending_start = None
            elif annotations:
                annotations.pop()

        if playing:
            frame_idx += 1

    cap.release()
    cv2.destroyAllWindows()
    save_annotations(output, annotations, fps)
    print(f"Anotações salvas em: {output}")


if __name__ == "__main__":
    main()
