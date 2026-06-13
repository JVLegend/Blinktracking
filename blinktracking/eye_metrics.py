"""Utilitários compartilhados para métricas EAR e detecção de piscadas."""

from typing import Optional

import numpy as np
import pandas as pd
from scipy.spatial import distance


def calculate_ear(eye_points):
    """Calcula o Eye Aspect Ratio (EAR) para 6 pontos de um olho."""
    if eye_points is None or len(eye_points) != 6:
        return None

    a = distance.euclidean(eye_points[1], eye_points[5])
    b = distance.euclidean(eye_points[2], eye_points[4])
    c = distance.euclidean(eye_points[0], eye_points[3])

    if c == 0:
        return 0
    return (a + b) / (2.0 * c)


def get_eye_points_from_row(row, side: str, csv_type: str) -> Optional[list[tuple[float, float]]]:
    """Extrai os 6 pontos usados no EAR para uma linha de DataFrame."""
    points = []

    if csv_type == "all_points":
        indices = {
            "right": [33, 160, 158, 133, 153, 144],
            "left": [362, 385, 387, 263, 373, 380],
        }

        for idx in indices[side]:
            x = row.get(f"point_{idx}_x")
            y = row.get(f"point_{idx}_y")
            if pd.isna(x) or pd.isna(y):
                return None
            points.append((x, y))

    elif csv_type == "eyes_only":
        if side == "right":
            cols = [
                ("right_lower_1_x", "right_lower_1_y"),
                ("right_upper_3_x", "right_upper_3_y"),
                ("right_upper_5_x", "right_upper_5_y"),
                ("right_lower_9_x", "right_lower_9_y"),
                ("right_lower_6_x", "right_lower_6_y"),
                ("right_lower_4_x", "right_lower_4_y"),
            ]
        else:
            cols = [
                ("left_lower_1_x", "left_lower_1_y"),
                ("left_upper_3_x", "left_upper_3_y"),
                ("left_upper_5_x", "left_upper_5_y"),
                ("left_lower_9_x", "left_lower_9_y"),
                ("left_lower_6_x", "left_lower_6_y"),
                ("left_lower_4_x", "left_lower_4_y"),
            ]

        for cx, cy in cols:
            x = row.get(cx)
            y = row.get(cy)
            if pd.isna(x) or pd.isna(y):
                return None
            points.append((x, y))

    return points


def detect_csv_type(df):
    """Detecta automaticamente o tipo de CSV de landmarks."""
    if "point_0_x" in df.columns:
        return "all_points"
    if "right_upper_1_x" in df.columns:
        return "eyes_only"
    return None


def calculate_ear_series(df, csv_type):
    """Calcula séries EAR direita e esquerda com operações vetorizadas."""
    n_frames = len(df)
    ear_right = np.full(n_frames, np.nan, dtype=float)
    ear_left = np.full(n_frames, np.nan, dtype=float)

    if csv_type == "all_points":
        right_indices = [33, 160, 158, 133, 153, 144]
        left_indices = [362, 385, 387, 263, 373, 380]

        right_x = np.array([df[f"point_{idx}_x"].values for idx in right_indices]).T
        right_y = np.array([df[f"point_{idx}_y"].values for idx in right_indices]).T
        left_x = np.array([df[f"point_{idx}_x"].values for idx in left_indices]).T
        left_y = np.array([df[f"point_{idx}_y"].values for idx in left_indices]).T

    elif csv_type == "eyes_only":
        right_cols = [
            ("right_lower_1_x", "right_lower_1_y"),
            ("right_upper_3_x", "right_upper_3_y"),
            ("right_upper_5_x", "right_upper_5_y"),
            ("right_lower_9_x", "right_lower_9_y"),
            ("right_lower_6_x", "right_lower_6_y"),
            ("right_lower_4_x", "right_lower_4_y"),
        ]
        left_cols = [
            ("left_lower_1_x", "left_lower_1_y"),
            ("left_upper_3_x", "left_upper_3_y"),
            ("left_upper_5_x", "left_upper_5_y"),
            ("left_lower_9_x", "left_lower_9_y"),
            ("left_lower_6_x", "left_lower_6_y"),
            ("left_lower_4_x", "left_lower_4_y"),
        ]

        right_x = np.array([df[cx].values for cx, _ in right_cols]).T
        right_y = np.array([df[cy].values for _, cy in right_cols]).T
        left_x = np.array([df[cx].values for cx, _ in left_cols]).T
        left_y = np.array([df[cy].values for _, cy in left_cols]).T
    else:
        return ear_right, ear_left

    a_right = np.sqrt((right_x[:, 1] - right_x[:, 5])**2 + (right_y[:, 1] - right_y[:, 5])**2)
    b_right = np.sqrt((right_x[:, 2] - right_x[:, 4])**2 + (right_y[:, 2] - right_y[:, 4])**2)
    c_right = np.sqrt((right_x[:, 0] - right_x[:, 3])**2 + (right_y[:, 0] - right_y[:, 3])**2)

    a_left = np.sqrt((left_x[:, 1] - left_x[:, 5])**2 + (left_y[:, 1] - left_y[:, 5])**2)
    b_left = np.sqrt((left_x[:, 2] - left_x[:, 4])**2 + (left_y[:, 2] - left_y[:, 4])**2)
    c_left = np.sqrt((left_x[:, 0] - left_x[:, 3])**2 + (left_y[:, 0] - left_y[:, 3])**2)

    valid_right = c_right > 0
    valid_left = c_left > 0
    ear_right[valid_right] = (a_right[valid_right] + b_right[valid_right]) / (2.0 * c_right[valid_right])
    ear_left[valid_left] = (a_left[valid_left] + b_left[valid_left]) / (2.0 * c_left[valid_left])

    return ear_right, ear_left


def smooth_ear_series(ear_series):
    """Interpola gaps curtos e suaviza uma série EAR."""
    s = pd.Series(ear_series)
    s = s.interpolate(method="linear", limit=3)
    s_smooth = s.rolling(window=3, center=True).mean()
    return s_smooth.fillna(s).values


def detect_blinks_single_eye(ear_smooth, fps, baseline_ear, eye_name):
    """Detecta piscadas em uma série EAR suavizada."""
    ear_threshold = baseline_ear * 0.75
    ear_complete_limit = baseline_ear * 0.50
    min_frames = 2
    min_inter_blink_time_sec = 0.5

    valid_mask = ~np.isnan(ear_smooth)
    below_threshold = (ear_smooth < ear_threshold) & valid_mask
    if not np.any(below_threshold):
        return []

    diff = np.diff(below_threshold.astype(int))
    start_indices = np.where(diff == 1)[0] + 1
    end_indices = np.where(diff == -1)[0] + 1

    if below_threshold[0]:
        start_indices = np.concatenate([[0], start_indices])
    if below_threshold[-1]:
        end_indices = np.concatenate([end_indices, [len(ear_smooth)]])

    blinks = []
    last_blink_end_frame = -9999

    for start_frame, end_frame in zip(start_indices, end_indices):
        duration_frames = end_frame - start_frame
        if duration_frames < min_frames:
            continue

        time_since_last = (start_frame - last_blink_end_frame) / fps
        if time_since_last < min_inter_blink_time_sec:
            continue

        segment = ear_smooth[start_frame:end_frame]
        valid_segment = segment[~np.isnan(segment)]
        if len(valid_segment) == 0:
            continue

        min_ear_in_blink = np.min(valid_segment)
        min_ear_frame_idx = start_frame + np.argmin(segment)
        category = "Completa" if min_ear_in_blink <= ear_complete_limit else "Incompleta"

        start_time = start_frame / fps
        end_time = end_frame / fps
        duration_sec = duration_frames / fps
        amplitude = baseline_ear - min_ear_in_blink

        closing_frames = min_ear_frame_idx - start_frame
        closing_duration = closing_frames / fps if closing_frames > 0 else 0.001
        opening_frames = end_frame - min_ear_frame_idx
        opening_duration = opening_frames / fps if opening_frames > 0 else 0.001

        blinks.append({
            "ID": len(blinks) + 1,
            "Olho": eye_name,
            "Frame Inicio": int(start_frame),
            "Frame Minimo": int(min_ear_frame_idx),
            "Frame Fim": int(end_frame),
            "Tempo Inicio (s)": round(start_time, 3),
            "Tempo Fim (s)": round(end_time, 3),
            "Duracao (s)": round(duration_sec, 3),
            "Duracao (frames)": int(duration_frames),
            "EAR Minimo": round(min_ear_in_blink, 4),
            "EAR Baseline": round(baseline_ear, 4),
            "Amplitude": round(amplitude, 4),
            "RBA (%)": round((amplitude / baseline_ear) * 100 if baseline_ear > 0 else 0, 1),
            "Vel. Fechamento (EAR/s)": round(amplitude / closing_duration if closing_duration > 0 else 0, 4),
            "Vel. Abertura (EAR/s)": round(amplitude / opening_duration if opening_duration > 0 else 0, 4),
            "Tempo Fechamento (s)": round(closing_duration, 3),
            "Tempo Abertura (s)": round(opening_duration, 3),
            "Classificacao": category,
            "Minuto": int(start_time // 60) + 1,
        })
        last_blink_end_frame = end_frame

    return blinks
