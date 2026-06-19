#!/usr/bin/env python3
"""Download videos from an rclone manifest, process them, and remove local copies.

The script is intentionally conservative:
- it only downloads paths present in the manifest;
- each video is copied to a temp directory before processing;
- cleanup refuses to delete anything outside that temp directory;
- Drive access can be read-only because deletion is local only.
"""

from __future__ import annotations

import argparse
import copy
import csv
import json
import logging
import math
import re
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable

import cv2

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from blinktracking.config import Config
from blinktracking.tracker import BlinkTracker


VIDEO_EXTENSIONS = {".mov", ".mp4", ".avi", ".mkv"}


@dataclass
class ManifestItem:
    remote_path: str
    patient_dir: str
    filename: str


def slugify(value: str) -> str:
    value = value.strip().replace("/", "_")
    value = re.sub(r"\s+", "_", value)
    value = re.sub(r"[^A-Za-z0-9_.-]+", "_", value)
    value = re.sub(r"_+", "_", value)
    return value.strip("._") or "item"


def read_manifest(path: Path) -> list[ManifestItem]:
    items: list[ManifestItem] = []
    seen: set[str] = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        remote_path = line.strip()
        if not remote_path or remote_path in seen:
            continue
        seen.add(remote_path)
        parts = remote_path.split("/")
        if len(parts) < 2:
            raise ValueError(f"Manifest path must include a folder: {remote_path}")
        if Path(parts[-1]).suffix.lower() not in VIDEO_EXTENSIONS:
            raise ValueError(f"Manifest path is not a supported video: {remote_path}")
        items.append(ManifestItem(remote_path, parts[0], parts[-1]))
    return items


def run_command(command: list[str]) -> None:
    subprocess.run(command, check=True)


def safe_unlink(path: Path, temp_root: Path) -> None:
    resolved_path = path.resolve()
    resolved_root = temp_root.resolve()
    if resolved_path == resolved_root or resolved_root not in resolved_path.parents:
        raise RuntimeError(f"Refusing to delete outside temp root: {resolved_path}")
    if path.exists():
        path.unlink()


def existing_success(output_dir: Path, video_stem: str) -> bool:
    return (output_dir / f"{video_stem}.csv").exists() and (
        output_dir / f"{video_stem}_metrics.json"
    ).exists()


def probe_fps(video_path: Path) -> float:
    cap = cv2.VideoCapture(str(video_path))
    try:
        fps = cap.get(cv2.CAP_PROP_FPS)
        return float(fps) if fps and fps > 0 else 30.0
    finally:
        cap.release()


def config_for_video(
    base_config: Config,
    video_path: Path,
    *,
    frame_skip: int,
    target_inference_fps: float,
    interpolate_skipped_frames: bool,
) -> Config:
    config = copy.deepcopy(base_config)
    chosen_skip = max(1, int(frame_skip))
    if chosen_skip == 1 and target_inference_fps > 0:
        fps = probe_fps(video_path)
        chosen_skip = max(1, int(math.ceil(fps / target_inference_fps)))

    config.detection.frame_skip = chosen_skip
    config.detection.interpolate_skipped_frames = interpolate_skipped_frames
    return config


def process_item(
    item: ManifestItem,
    *,
    remote: str,
    temp_root: Path,
    output_root: Path,
    config: Config,
    dry_run: bool,
    show_progress: bool,
    force: bool,
    frame_skip: int,
    target_inference_fps: float,
    interpolate_skipped_frames: bool,
) -> dict:
    patient_slug = slugify(item.patient_dir)
    video_stem = Path(item.filename).stem
    video_slug = slugify(video_stem)
    local_dir = temp_root / patient_slug
    local_video = local_dir / item.filename
    output_dir = output_root / patient_slug / video_slug
    output_dir.mkdir(parents=True, exist_ok=True)

    if not force and existing_success(output_dir, video_stem):
        return {
            "remote_path": item.remote_path,
            "status": "skipped_existing",
            "output_dir": str(output_dir),
        }

    if dry_run:
        return {
            "remote_path": item.remote_path,
            "status": "dry_run",
            "output_dir": str(output_dir),
        }

    local_dir.mkdir(parents=True, exist_ok=True)
    remote_spec = f"{remote.rstrip(':')}:{item.remote_path}"
    started_at = time.time()
    summary: dict = {
        "remote_path": item.remote_path,
        "local_video": str(local_video),
        "output_dir": str(output_dir),
        "started_at": datetime.now().isoformat(),
    }

    try:
        command = [
            "rclone",
            "copyto",
            remote_spec,
            str(local_video),
            "--tpslimit",
            "1",
            "--tpslimit-burst",
            "1",
            "--drive-pacer-min-sleep",
            "2s",
            "--retries",
            "10",
            "--low-level-retries",
            "20",
        ]
        if show_progress:
            command.append("--progress")
        run_command(command)
        download_size = local_video.stat().st_size if local_video.exists() else 0

        video_config = config_for_video(
            config,
            local_video,
            frame_skip=frame_skip,
            target_inference_fps=target_inference_fps,
            interpolate_skipped_frames=interpolate_skipped_frames,
        )
        tracker = BlinkTracker(video_config, log_level=logging.WARNING)
        results = tracker.process_video(
            str(local_video),
            str(output_dir),
            save_csv=True,
            save_json=True,
            save_debug_video=False,
        )

        elapsed = time.time() - started_at
        summary.update(
            {
                "status": "success",
                "elapsed_seconds": round(elapsed, 3),
                "download_size_bytes": download_size,
                "fps_video": results["video_info"]["fps"],
                "duration_seconds": results["video_info"]["duration_seconds"],
                "frames_processed": results["processing_info"]["frames_processed"],
                "inference_frames_processed": results["processing_info"].get(
                    "inference_frames_processed"
                ),
                "frame_skip": results["processing_info"].get("frame_skip"),
                "detections": results["processing_info"]["detections"],
                "total_blinks": results["metrics"]["combined"]["total_blinks"],
                "blink_rate_per_minute": results["metrics"]["combined"].get(
                    "blink_rate_per_minute"
                ),
                "mean_duration_ms": results["metrics"]["combined"].get(
                    "duration_ms", {}
                ).get("mean"),
            }
        )
        return summary
    except Exception as exc:
        summary.update({"status": "failed", "error": str(exc)})
        return summary
    finally:
        safe_unlink(local_video, temp_root)


def write_jsonl(path: Path, records: Iterable[dict]) -> None:
    with path.open("a", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def write_csv_summary(path: Path, records: list[dict]) -> None:
    if not records:
        return
    fields = [
        "remote_path",
        "status",
        "output_dir",
        "elapsed_seconds",
        "download_size_bytes",
        "fps_video",
        "duration_seconds",
        "frames_processed",
        "inference_frames_processed",
        "frame_skip",
        "detections",
        "total_blinks",
        "blink_rate_per_minute",
        "mean_duration_ms",
        "error",
    ]
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for record in records:
            writer.writerow({field: record.get(field) for field in fields})


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Process videos listed in an rclone manifest one by one."
    )
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--remote", default="blinkdrive:")
    parser.add_argument("--temp-root", required=True, type=Path)
    parser.add_argument("--output-root", required=True, type=Path)
    parser.add_argument("--limit", type=int, default=0, help="0 means all items")
    parser.add_argument("--start-at", type=int, default=1, help="1-based item index")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--progress", action="store_true", help="Show rclone progress")
    parser.add_argument("--force", action="store_true", help="Reprocess existing outputs")
    parser.add_argument(
        "--frame-skip",
        type=int,
        default=1,
        help="Run MediaPipe every N frames; default keeps every frame.",
    )
    parser.add_argument(
        "--target-inference-fps",
        type=float,
        default=0.0,
        help="If > 0 and --frame-skip is 1, choose frame_skip per video to cap inference FPS.",
    )
    parser.add_argument(
        "--no-interpolate",
        action="store_true",
        help="Do not interpolate skipped frames into the metrics time series.",
    )
    args = parser.parse_args(argv)

    temp_root = args.temp_root.resolve()
    output_root = args.output_root.resolve()
    temp_root.mkdir(parents=True, exist_ok=True)
    output_root.mkdir(parents=True, exist_ok=True)

    items = read_manifest(args.manifest)
    if args.start_at < 1:
        raise ValueError("--start-at must be >= 1")
    selected = items[args.start_at - 1 :]
    if args.limit:
        selected = selected[: args.limit]

    log_dir = output_root / "_logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    jsonl_path = log_dir / "process_rclone_manifest.jsonl"
    csv_path = log_dir / "process_rclone_manifest_latest.csv"

    config = Config()
    config.save_debug_video = False
    config.detection.refine_landmarks = False
    config.detection.extract_only_eye_landmarks = True
    config.detection.max_inference_res = 480
    config.detection.use_roi = False
    records: list[dict] = []

    total = len(selected)
    for offset, item in enumerate(selected, start=args.start_at):
        print(f"[{offset}/{len(items)}] {item.remote_path}", flush=True)
        record = process_item(
            item,
            remote=args.remote,
            temp_root=temp_root,
            output_root=output_root,
            config=config,
            dry_run=args.dry_run,
            show_progress=args.progress,
            force=args.force,
            frame_skip=args.frame_skip,
            target_inference_fps=args.target_inference_fps,
            interpolate_skipped_frames=not args.no_interpolate,
        )
        records.append(record)
        write_jsonl(jsonl_path, [record])
        print(f"  -> {record['status']}", flush=True)
        if total and record["status"] == "failed":
            print(f"     error: {record.get('error')}", file=sys.stderr, flush=True)

    write_csv_summary(csv_path, records)
    failed = sum(1 for record in records if record["status"] == "failed")
    print(f"Completed {len(records)} item(s), failed={failed}")
    print(f"Log: {jsonl_path}")
    print(f"CSV summary: {csv_path}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
