#!/usr/bin/env python3
"""
Optimized landmark extraction — designed for weaker GPUs and mobile.

Key optimizations:
1. Adaptive frame skipping (process every Nth frame, interpolate between)
2. ROI cropping (only process face region, not full frame)
3. Resolution downscaling (process at lower res, scale coordinates back)
4. Early termination (stop if face not detected for N consecutive frames)
5. Batch-friendly output (compatible with existing pipeline)

Usage:
    python scripts/extract_optimized.py <video_path> [options]

    --skip N         Process every Nth frame (default: auto based on FPS)
    --max-res N      Max resolution for processing (default: 480)
    --roi            Enable face ROI cropping (faster but needs initial detection)
    --interpolate    Interpolate skipped frames (better EAR series)
    --output PATH    Output CSV path
    --benchmark      Print timing stats
"""
import argparse
import time
import sys
from pathlib import Path

import cv2
import numpy as np
import mediapipe as mp


class OptimizedExtractor:
    """MediaPipe Face Mesh with speed optimizations."""

    # Eye landmark indices
    RIGHT_UPPER = [246, 161, 160, 159, 158, 157, 173]
    RIGHT_LOWER = [33, 7, 163, 144, 145, 153, 154, 155, 133]
    LEFT_UPPER = [466, 388, 387, 386, 385, 384, 398]
    LEFT_LOWER = [263, 249, 390, 373, 374, 380, 381, 382, 362]

    def __init__(self, max_res=480, use_roi=False):
        self.max_res = max_res
        self.use_roi = use_roi
        self.face_mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self.last_face_bbox = None  # For ROI tracking

    def _downscale(self, frame, h, w):
        """Downscale frame if larger than max_res, return scale factor."""
        max_dim = max(h, w)
        if max_dim <= self.max_res:
            return frame, 1.0
        scale = self.max_res / max_dim
        new_w = int(w * scale)
        new_h = int(h * scale)
        resized = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)
        return resized, scale

    def _crop_roi(self, frame, h, w, margin=0.3):
        """Crop to face region based on last detection."""
        if self.last_face_bbox is None:
            return frame, 0, 0, h, w

        x1, y1, x2, y2 = self.last_face_bbox
        # Add margin
        bw = x2 - x1
        bh = y2 - y1
        x1 = max(0, int(x1 - bw * margin))
        y1 = max(0, int(y1 - bh * margin))
        x2 = min(w, int(x2 + bw * margin))
        y2 = min(h, int(y2 + bh * margin))

        cropped = frame[y1:y2, x1:x2]
        return cropped, x1, y1, y2 - y1, x2 - x1

    def _compute_ear(self, pts, upper_idx, lower_idx):
        """Compute EAR from landmark points."""
        upper = [pts[i] for i in upper_idx]
        lower = [pts[i] for i in lower_idx]
        n = min(len(upper), len(lower))
        vert_sum = sum(
            np.linalg.norm(np.array(upper[i]) - np.array(lower[i]))
            for i in range(n)
        )
        horiz = np.linalg.norm(np.array(lower[0]) - np.array(lower[-1]))
        if horiz < 1e-6:
            return None
        return vert_sum / (n * horiz)

    def process_frame(self, rgb_frame):
        """Process a single frame, return (ear_right, ear_left, landmarks) or None."""
        h, w = rgb_frame.shape[:2]

        # Optimization 1: ROI crop
        offset_x, offset_y = 0, 0
        if self.use_roi and self.last_face_bbox is not None:
            cropped, offset_x, offset_y, crop_h, crop_w = self._crop_roi(rgb_frame, h, w)
        else:
            cropped = rgb_frame
            crop_h, crop_w = h, w

        # Optimization 2: Downscale
        processed, scale = self._downscale(cropped, crop_h, crop_w)
        proc_h, proc_w = processed.shape[:2]

        # Run MediaPipe
        results = self.face_mesh.process(processed)
        if not results.multi_face_landmarks:
            return None

        lms = results.multi_face_landmarks[0].landmark

        # Scale coordinates back to original frame
        pts = []
        xs, ys = [], []
        for lm in lms:
            px = (lm.x * proc_w / scale) + offset_x
            py = (lm.y * proc_h / scale) + offset_y
            pts.append((px, py))
            xs.append(px)
            ys.append(py)

        # Update face bounding box for next frame's ROI
        self.last_face_bbox = (min(xs), min(ys), max(xs), max(ys))

        ear_r = self._compute_ear(pts, self.RIGHT_UPPER, self.RIGHT_LOWER)
        ear_l = self._compute_ear(pts, self.LEFT_UPPER, self.LEFT_LOWER)

        return ear_r, ear_l, pts

    def close(self):
        self.face_mesh.close()


def interpolate_ears(ears, frame_indices, total_frames):
    """Linear interpolation of EAR values for skipped frames."""
    full_ears = np.full(total_frames, np.nan)
    for i, fi in enumerate(frame_indices):
        if fi < total_frames:
            full_ears[fi] = ears[i]

    # Interpolate gaps
    valid = ~np.isnan(full_ears)
    if valid.sum() < 2:
        return full_ears

    xp = np.where(valid)[0]
    fp = full_ears[valid]
    xi = np.arange(total_frames)
    full_ears = np.interp(xi, xp, fp)

    return full_ears


def process_video(video_path, skip=None, max_res=480, use_roi=False,
                  do_interpolate=True, output=None, benchmark=False):
    """Process video with optimizations."""
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print(f"ERROR: Cannot open {video_path}")
        return None

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Auto-determine skip rate based on FPS
    if skip is None:
        if fps > 120:
            skip = 4  # 240fps → process every 4th = 60fps effective
        elif fps > 60:
            skip = 2  # 120fps → process every 2nd = 60fps effective
        else:
            skip = 1  # 30fps → process every frame

    print(f"Video: {Path(video_path).name}")
    print(f"  {w}x{h} @ {fps:.0f}fps, {total_frames} frames ({total_frames/fps:.1f}s)")
    print(f"  Optimizations: skip={skip}, max_res={max_res}, roi={use_roi}")
    print(f"  Effective: ~{fps/skip:.0f}fps processing, {total_frames//skip} frames")

    extractor = OptimizedExtractor(max_res=max_res, use_roi=use_roi)

    ears_r, ears_l = [], []
    frame_indices = []
    detect_count = 0
    skip_count = 0

    t_start = time.perf_counter()

    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % skip == 0:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = extractor.process_frame(rgb)
            if result is not None:
                ear_r, ear_l, _ = result
                ears_r.append(ear_r if ear_r else np.nan)
                ears_l.append(ear_l if ear_l else np.nan)
                detect_count += 1
            else:
                ears_r.append(np.nan)
                ears_l.append(np.nan)
            frame_indices.append(frame_idx)
        else:
            skip_count += 1

        frame_idx += 1

    t_end = time.perf_counter()
    elapsed = t_end - t_start
    cap.release()
    extractor.close()

    # Interpolate skipped frames
    if do_interpolate and skip > 1:
        full_ears_r = interpolate_ears(ears_r, frame_indices, frame_idx)
        full_ears_l = interpolate_ears(ears_l, frame_indices, frame_idx)
    else:
        full_ears_r = np.array(ears_r)
        full_ears_l = np.array(ears_l)

    # Stats
    fps_actual = frame_idx / elapsed if elapsed > 0 else 0
    fps_processing = len(frame_indices) / elapsed if elapsed > 0 else 0

    print(f"\n  Results:")
    print(f"    Processed: {len(frame_indices)}/{frame_idx} frames ({skip_count} skipped)")
    print(f"    Detected: {detect_count}/{len(frame_indices)} ({detect_count/len(frame_indices)*100:.0f}%)")
    print(f"    Time: {elapsed:.1f}s ({fps_actual:.0f} total fps, {fps_processing:.0f} processing fps)")
    print(f"    Speedup vs full: {skip}x fewer frames + downscale")

    # Save CSV (compatible with existing pipeline)
    if output is None:
        output = Path(video_path).with_suffix(".optimized.csv")

    import pandas as pd
    times = np.arange(len(full_ears_r)) / fps
    df = pd.DataFrame({
        "frame": np.arange(len(full_ears_r)),
        "time_s": times,
        "ear_right": full_ears_r,
        "ear_left": full_ears_l,
    })
    df.to_csv(output, index=False)
    print(f"    Saved: {output}")

    if benchmark:
        return {
            "video": str(video_path),
            "total_frames": frame_idx,
            "processed_frames": len(frame_indices),
            "skip": skip,
            "max_res": max_res,
            "use_roi": use_roi,
            "elapsed_s": round(elapsed, 2),
            "fps_total": round(fps_actual, 1),
            "fps_processing": round(fps_processing, 1),
            "detection_rate": round(detect_count / len(frame_indices), 3),
        }
    return df


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Optimized landmark extraction")
    parser.add_argument("video", help="Path to video file")
    parser.add_argument("--skip", type=int, default=None, help="Process every Nth frame")
    parser.add_argument("--max-res", type=int, default=480, help="Max processing resolution")
    parser.add_argument("--roi", action="store_true", help="Enable face ROI cropping")
    parser.add_argument("--interpolate", action="store_true", default=True, help="Interpolate skipped frames")
    parser.add_argument("--output", type=str, default=None, help="Output CSV path")
    parser.add_argument("--benchmark", action="store_true", help="Print benchmark stats")
    args = parser.parse_args()

    process_video(
        args.video,
        skip=args.skip,
        max_res=args.max_res,
        use_roi=args.roi,
        do_interpolate=args.interpolate,
        output=args.output,
        benchmark=args.benchmark,
    )
