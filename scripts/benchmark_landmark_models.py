#!/usr/bin/env python3
"""
Benchmark: compare face landmark extraction models.
Tests MediaPipe vs dlib vs ONNX (when available) for speed and EAR accuracy.

Usage:
    python scripts/benchmark_landmark_models.py <video_path> [--frames 300]

Outputs a JSON report with timing and concordance metrics.
"""
import argparse
import json
import time
import sys
from pathlib import Path

import cv2
import numpy as np

# ── EAR calculation (shared across all models) ─────────────────────────
def ear_from_points(upper_pts, lower_pts):
    """
    Compute Eye Aspect Ratio from upper and lower eyelid points.
    EAR = mean(vertical_distances) / horizontal_distance
    """
    if len(upper_pts) < 2 or len(lower_pts) < 2:
        return None
    # Vertical distances (pair upper with lower)
    n = min(len(upper_pts), len(lower_pts))
    vert_sum = 0.0
    for i in range(n):
        vert_sum += np.linalg.norm(np.array(upper_pts[i]) - np.array(lower_pts[i]))
    vert_mean = vert_sum / n
    # Horizontal distance (first of lower to last of lower, or corners)
    horiz = np.linalg.norm(np.array(lower_pts[0]) - np.array(lower_pts[-1]))
    if horiz < 1e-6:
        return None
    return vert_mean / (horiz)


# ── Model: MediaPipe Face Mesh ─────────────────────────────────────────
class MediaPipeModel:
    name = "mediapipe"

    # MediaPipe eye landmark indices
    RIGHT_UPPER = [246, 161, 160, 159, 158, 157, 173]
    RIGHT_LOWER = [33, 7, 163, 144, 145, 153, 154, 155, 133]
    LEFT_UPPER = [466, 388, 387, 386, 385, 384, 398]
    LEFT_LOWER = [263, 249, 390, 373, 374, 380, 381, 382, 362]

    def __init__(self):
        import mediapipe as mp
        self.face_mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

    def process_frame(self, rgb_frame, h, w):
        """Returns (ear_right, ear_left, all_landmarks_478) or None."""
        results = self.face_mesh.process(rgb_frame)
        if not results.multi_face_landmarks:
            return None

        lms = results.multi_face_landmarks[0].landmark
        pts = [(lm.x * w, lm.y * h) for lm in lms]

        r_upper = [pts[i] for i in self.RIGHT_UPPER]
        r_lower = [pts[i] for i in self.RIGHT_LOWER]
        l_upper = [pts[i] for i in self.LEFT_UPPER]
        l_lower = [pts[i] for i in self.LEFT_LOWER]

        ear_r = ear_from_points(r_upper, r_lower)
        ear_l = ear_from_points(l_upper, l_lower)
        return ear_r, ear_l, pts

    def close(self):
        self.face_mesh.close()


# ── Model: dlib (68 landmarks) ─────────────────────────────────────────
class DlibModel:
    name = "dlib"

    # dlib 68-point eye indices
    RIGHT_UPPER = [43, 44, 45]  # Upper right eye
    RIGHT_LOWER = [47, 46]  # Lower right eye
    RIGHT_CORNERS = [42, 45]
    LEFT_UPPER = [37, 38]  # Upper left eye
    LEFT_LOWER = [41, 40]  # Lower left eye
    LEFT_CORNERS = [36, 39]

    def __init__(self):
        import dlib
        self.detector = dlib.get_frontal_face_detector()
        # Try to find shape predictor
        predictor_paths = [
            Path.home() / "jv-teste/shape_predictor_68_face_landmarks.dat",
            Path("shape_predictor_68_face_landmarks.dat"),
            Path("/tmp/shape_predictor_68_face_landmarks.dat"),
        ]
        self.predictor = None
        for p in predictor_paths:
            if p.exists():
                self.predictor = dlib.shape_predictor(str(p))
                break
        if self.predictor is None:
            raise FileNotFoundError(
                "dlib shape_predictor_68_face_landmarks.dat not found. "
                "Download from: http://dlib.net/files/shape_predictor_68_face_landmarks_GTN_net.dat.bz2"
            )

    def process_frame(self, rgb_frame, h, w):
        gray = cv2.cvtColor(rgb_frame, cv2.COLOR_RGB2GRAY)
        faces = self.detector(gray, 0)
        if len(faces) == 0:
            return None

        shape = self.predictor(gray, faces[0])
        pts = [(shape.part(i).x, shape.part(i).y) for i in range(68)]

        # EAR for right eye (points 42-47)
        def eye_ear(p, upper_idx, lower_idx, corner_idx):
            upper = [pts[i] for i in upper_idx]
            lower = [pts[i] for i in lower_idx]
            v1 = np.linalg.norm(np.array(pts[upper_idx[0]]) - np.array(pts[lower_idx[-1]]))
            v2 = np.linalg.norm(np.array(pts[upper_idx[-1]]) - np.array(pts[lower_idx[0]]))
            horiz = np.linalg.norm(np.array(pts[corner_idx[0]]) - np.array(pts[corner_idx[1]]))
            if horiz < 1e-6:
                return None
            return (v1 + v2) / (2.0 * horiz)

        ear_r = eye_ear(pts, [43, 44], [47, 46], [42, 45])
        ear_l = eye_ear(pts, [37, 38], [41, 40], [36, 39])
        return ear_r, ear_l, pts

    def close(self):
        pass


# ── Model: ONNX Runtime (MediaPipe exported) ──────────────────────────
class ONNXModel:
    name = "onnx"

    def __init__(self):
        try:
            import onnxruntime as ort
        except ImportError:
            raise ImportError("onnxruntime not installed. pip install onnxruntime-gpu")

        model_paths = [
            Path.home() / "jv-teste/face_landmark.onnx",
            Path("face_landmark.onnx"),
        ]
        self.session = None
        for p in model_paths:
            if p.exists():
                providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
                self.session = ort.InferenceSession(str(p), providers=providers)
                break
        if self.session is None:
            raise FileNotFoundError("ONNX face landmark model not found")

    def process_frame(self, rgb_frame, h, w):
        # Placeholder — real implementation depends on model format
        return None

    def close(self):
        pass


# ── Benchmark runner ───────────────────────────────────────────────────
def run_benchmark(video_path: str, max_frames: int = 300):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"ERROR: Cannot open {video_path}")
        sys.exit(1)

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    print(f"Video: {video_path}")
    print(f"  {w}x{h} @ {fps:.1f}fps, {total_frames} frames")
    print(f"  Benchmarking first {max_frames} frames\n")

    # Try to initialize each model
    models = []
    for ModelClass in [MediaPipeModel, DlibModel, ONNXModel]:
        try:
            model = ModelClass()
            models.append(model)
            print(f"  ✓ {model.name} initialized")
        except Exception as e:
            print(f"  ✗ {ModelClass.name} not available: {e}")

    if not models:
        print("No models available!")
        sys.exit(1)

    # Read frames
    frames = []
    for i in range(min(max_frames, total_frames)):
        ret, frame = cap.read()
        if not ret:
            break
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        frames.append(rgb)
    cap.release()
    print(f"  Read {len(frames)} frames\n")

    results = {}

    for model in models:
        print(f"  Running {model.name}...")
        ears_right = []
        ears_left = []
        detections = 0
        failures = 0

        t_start = time.perf_counter()
        for frame in frames:
            result = model.process_frame(frame, h, w)
            if result is not None:
                ear_r, ear_l, _ = result
                ears_right.append(ear_r if ear_r else np.nan)
                ears_left.append(ear_l if ear_l else np.nan)
                detections += 1
            else:
                ears_right.append(np.nan)
                ears_left.append(np.nan)
                failures += 1
        t_end = time.perf_counter()

        elapsed = t_end - t_start
        fps_model = len(frames) / elapsed if elapsed > 0 else 0

        results[model.name] = {
            "total_frames": len(frames),
            "detections": detections,
            "failures": failures,
            "detection_rate": detections / len(frames) if frames else 0,
            "total_time_s": round(elapsed, 3),
            "fps": round(fps_model, 1),
            "ms_per_frame": round(elapsed / len(frames) * 1000, 2) if frames else 0,
            "ear_right_mean": round(float(np.nanmean(ears_right)), 4) if ears_right else None,
            "ear_left_mean": round(float(np.nanmean(ears_left)), 4) if ears_left else None,
            "ear_right_series": [round(float(e), 4) if not np.isnan(e) else None for e in ears_right],
            "ear_left_series": [round(float(e), 4) if not np.isnan(e) else None for e in ears_left],
        }

        print(f"    {model.name}: {fps_model:.1f} fps, {detections}/{len(frames)} detected, "
              f"{elapsed:.1f}s total, EAR_R={results[model.name]['ear_right_mean']}")

        model.close()

    # ── Concordance with MediaPipe (reference) ──────────────────────
    if "mediapipe" in results and len(results) > 1:
        ref_r = np.array(results["mediapipe"]["ear_right_series"], dtype=float)
        ref_l = np.array(results["mediapipe"]["ear_left_series"], dtype=float)

        for name, data in results.items():
            if name == "mediapipe":
                continue
            test_r = np.array(data["ear_right_series"], dtype=float)
            test_l = np.array(data["ear_left_series"], dtype=float)

            # Pearson correlation on valid frames
            valid = ~(np.isnan(ref_r) | np.isnan(test_r))
            if valid.sum() > 10:
                corr_r = float(np.corrcoef(ref_r[valid], test_r[valid])[0, 1])
                mae_r = float(np.mean(np.abs(ref_r[valid] - test_r[valid])))
            else:
                corr_r = None
                mae_r = None

            data["concordance_vs_mediapipe"] = {
                "pearson_r_right": round(corr_r, 4) if corr_r else None,
                "mae_right": round(mae_r, 4) if mae_r else None,
                "valid_frames": int(valid.sum()),
            }

    # ── Save report ─────────────────────────────────────────────────
    report = {
        "video": str(video_path),
        "video_fps": fps,
        "video_resolution": f"{w}x{h}",
        "frames_tested": len(frames),
        "models": results,
    }

    out_path = Path(video_path).parent / "benchmark_report.json"
    with open(out_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\n  Report saved: {out_path}")

    # Print summary table
    print(f"\n{'='*60}")
    print(f"  BENCHMARK SUMMARY ({len(frames)} frames)")
    print(f"{'='*60}")
    print(f"  {'Model':<15} {'FPS':>8} {'Det%':>8} {'ms/frame':>10} {'EAR_R':>8}")
    print(f"  {'-'*15} {'-'*8} {'-'*8} {'-'*10} {'-'*8}")
    for name, data in results.items():
        print(f"  {name:<15} {data['fps']:>8.1f} {data['detection_rate']*100:>7.1f}% "
              f"{data['ms_per_frame']:>9.2f} {data.get('ear_right_mean', 'N/A'):>8}")
    print(f"{'='*60}")

    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Benchmark face landmark models")
    parser.add_argument("video", help="Path to video file")
    parser.add_argument("--frames", type=int, default=300, help="Max frames to test")
    args = parser.parse_args()
    run_benchmark(args.video, args.frames)
