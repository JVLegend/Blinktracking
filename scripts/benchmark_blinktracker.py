#!/usr/bin/env python3
"""Benchmark acumulativo do BlinkTracker em um vídeo real."""

import argparse
import json
import logging
import math
import time
from pathlib import Path

import cv2

from blinktracking import BlinkTracker, Config


def configure_stage(stage_name: str, max_res: int) -> Config:
    config = Config()

    if stage_name == "baseline":
        config.detection.max_inference_res = 0
        config.detection.refine_landmarks = True
        config.detection.extract_only_eye_landmarks = False
        config.filters.vectorized_kalman = False
    elif stage_name == "downscale":
        config.detection.max_inference_res = max_res
        config.detection.refine_landmarks = True
        config.detection.extract_only_eye_landmarks = False
        config.filters.vectorized_kalman = False
    elif stage_name == "vectorized_kalman":
        config.detection.max_inference_res = max_res
        config.detection.refine_landmarks = True
        config.detection.extract_only_eye_landmarks = False
        config.filters.vectorized_kalman = True
    elif stage_name == "final":
        config.detection.max_inference_res = max_res
        config.detection.refine_landmarks = True
        config.detection.extract_only_eye_landmarks = True
        config.filters.vectorized_kalman = True
    elif stage_name == "skip2_interpolated":
        config.detection.max_inference_res = max_res
        config.detection.refine_landmarks = True
        config.detection.extract_only_eye_landmarks = True
        config.detection.frame_skip = 2
        config.detection.interpolate_skipped_frames = True
        config.filters.vectorized_kalman = True
    else:
        raise ValueError(f"Stage desconhecido: {stage_name}")

    return config


def run_stage(video_path: Path, stage_name: str, max_frames: int, max_res: int) -> dict:
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Não foi possível abrir o vídeo: {video_path}")

    video_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    config = configure_stage(stage_name, max_res)
    start = time.perf_counter()
    if max_frames > 0:
        frames = 0
        detections = 0
        first_landmarks = None
        tracker = BlinkTracker(config, log_level=logging.ERROR)
        tracker.metrics_calc.left_detector.set_fps(video_fps)
        tracker.metrics_calc.right_detector.set_fps(video_fps)
        frame_skip = max(1, int(config.detection.frame_skip))
        interpolate_skipped = config.detection.interpolate_skipped_frames and frame_skip > 1
        metrics_fps = video_fps if interpolate_skipped or frame_skip == 1 else video_fps / frame_skip
        previous_metric_frame = None
        previous_metric_openings = None

        while frames < max_frames:
            ok, frame = cap.read()
            if not ok:
                break

            tracker.frame_count += 1
            frames += 1
            if (tracker.frame_count - 1) % frame_skip != 0:
                continue

            result = tracker._process_frame(frame, first_landmarks)
            if result["landmarks"] is not None:
                detections += 1
                if first_landmarks is None:
                    first_landmarks = result["landmarks"]

            if interpolate_skipped and previous_metric_frame is not None:
                tracker._process_interpolated_openings(
                    previous_metric_frame,
                    previous_metric_openings,
                    tracker.frame_count,
                    result["openings"],
                    metrics_fps
                )
            tracker._process_openings(result["openings"], metrics_fps)
            if result["openings"]["left"] is not None and result["openings"]["right"] is not None:
                previous_metric_frame = tracker.frame_count
                previous_metric_openings = result["openings"].copy()

        if interpolate_skipped and previous_metric_frame is not None:
            tracker._process_trailing_openings(
                previous_metric_frame,
                previous_metric_openings,
                frames,
                metrics_fps
            )
        elapsed = time.perf_counter() - start
        processing_info = {
            "frames_processed": frames,
            "inference_frames_processed": math.ceil(frames / max(1, int(config.detection.frame_skip))),
            "detections": detections,
            "frame_skip": frame_skip,
        }
        metrics = tracker.metrics_calc.get_metrics()
    else:
        cap.release()
        tracker = BlinkTracker(config, log_level=logging.ERROR)
        result = tracker.process_video(
            str(video_path),
            output_dir=None,
            save_csv=False,
            save_json=False,
            save_debug_video=False
        )
        elapsed = time.perf_counter() - start
        processing_info = result["processing_info"]
        metrics = tracker.metrics_calc.get_metrics()

    elapsed = time.perf_counter() - start
    if cap.isOpened():
        cap.release()
    if getattr(tracker, "face_mesh", None):
        tracker.face_mesh.close()

    combined = metrics["combined"].to_dict()
    frames = processing_info["frames_processed"]
    inference_frames = processing_info["inference_frames_processed"]
    detections = processing_info["detections"]

    return {
        "stage": stage_name,
        "frames_tested": frames,
        "inference_frames": inference_frames,
        "video_total_frames": total_frames,
        "video_fps": video_fps,
        "video_resolution": f"{width}x{height}",
        "elapsed_s": round(elapsed, 3),
        "processing_fps": round(frames / elapsed, 2) if elapsed > 0 else 0,
        "inference_fps": round(inference_frames / elapsed, 2) if elapsed > 0 else 0,
        "detections": detections,
        "detection_rate": round(detections / inference_frames, 4) if inference_frames else 0,
        "config": {
            "max_inference_res": config.detection.max_inference_res,
            "refine_landmarks": config.detection.refine_landmarks,
            "extract_only_eye_landmarks": config.detection.extract_only_eye_landmarks,
            "vectorized_kalman": config.filters.vectorized_kalman,
            "frame_skip": config.detection.frame_skip,
            "interpolate_skipped_frames": config.detection.interpolate_skipped_frames,
        },
        "metrics": {
            "total_blinks": combined["total_blinks"],
            "blink_rate_per_minute": combined["blink_rate_per_minute"],
            "mean_duration_ms": combined["duration_ms"]["mean"],
        },
    }


def write_markdown(report: dict, output_path: Path):
    rows = []
    for item in report["stages"]:
        rows.append(
            "| {stage} | {elapsed_s:.3f} | {processing_fps:.2f} | {inference_fps:.2f} | {inference_frames} | {detection_rate:.1%} | "
            "{total_blinks} | {blink_rate_per_minute} | {mean_duration_ms} |".format(
                stage=item["stage"],
                elapsed_s=item["elapsed_s"],
                processing_fps=item["processing_fps"],
                inference_fps=item["inference_fps"],
                inference_frames=item["inference_frames"],
                detection_rate=item["detection_rate"],
                **item["metrics"],
            )
        )

    text = "\n".join([
        "# Benchmark BlinkTracker",
        "",
        f"Vídeo: `{report['video']}`",
        f"Frames testados por estágio: {report['max_frames'] or 'todos'}",
        "",
        "| Estágio | Tempo (s) | FPS vídeo | FPS inferência | Inferências | Detecção | Piscadas | Taxa/min | Duração média (ms) |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
        *rows,
        "",
    ])
    output_path.write_text(text, encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="Benchmark acumulativo do BlinkTracker.")
    parser.add_argument("video", type=Path)
    parser.add_argument("--frames", type=int, default=600, help="Frames por estágio; 0 = vídeo inteiro")
    parser.add_argument("--max-res", type=int, default=480)
    parser.add_argument("--output", type=Path, default=None)
    args = parser.parse_args()

    stages = ["baseline", "downscale", "vectorized_kalman", "final", "skip2_interpolated"]
    results = []
    for stage in stages:
        print(f"\nRodando estágio: {stage}")
        item = run_stage(args.video, stage, args.frames, args.max_res)
        results.append(item)
        print(
            f"  {item['elapsed_s']}s | {item['processing_fps']} fps | "
            f"detecção {item['detection_rate']:.1%}"
        )

    report = {
        "video": str(args.video),
        "max_frames": args.frames,
        "max_res": args.max_res,
        "stages": results,
    }

    output = args.output or (args.video.parent / f"{args.video.stem}_blinktracker_benchmark.json")
    output.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    write_markdown(report, output.with_suffix(".md"))
    print(f"\nRelatórios salvos em:\n  {output}\n  {output.with_suffix('.md')}")


if __name__ == "__main__":
    main()
