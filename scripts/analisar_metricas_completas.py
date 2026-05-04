#!/usr/bin/env python3
"""
Script de Anlise Completa de Mtricas de Piscadas
==================================================
L CSVs gerados pelo Blinktracking e calcula todas as mtricas disponveis no site:
- Deteco de piscadas completas e incompletas por olho
- Frame exato de cada evento
- Amplitude mdia
- Cinemtica (velocidade de fechamento e abertura)
- Distribuio de velocidade binocular
- Timeline de piscadas por olho
- Mtrica EAR (Eye Aspect Ratio)

Uso:
    python analisar_metricas_completas.py <arquivo.csv> [--tipo all_points|eyes_only] [--saida output.xlsx]

    O FPS  lido automaticamente da primeira linha do CSV (formato: # FPS: <valor>)

    --tipo: Fora o tipo de CSV (auto-detectado se no especificado)
            all_points: CSV com 478 pontos faciais completos
            eyes_only: CSV com apenas 32 pontos dos olhos
    --fps:  Override manual do FPS (opcional)
"""

import pandas as pd
import numpy as np
import sys
import os
import json
import argparse
from scipy.spatial import distance
from datetime import datetime


def calculate_ear(eye_points):
    """
    Calcula o Eye Aspect Ratio (EAR) dado os marcos do olho.
    EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)

    Args:
        eye_points: Lista de 6 tuplas (x, y) na ordem:
                   [P1(canto_esq), P2(sup1), P3(sup2), P4(canto_dir), P5(inf2), P6(inf1)]

    Returns:
        float: Valor EAR ou 0 se invlido
    """
    if eye_points is None or len(eye_points) != 6:
        return None

    # Distncias verticais
    A = distance.euclidean(eye_points[1], eye_points[5])  # |p2-p6|
    B = distance.euclidean(eye_points[2], eye_points[4])  # |p3-p5|
    # Distncia horizontal
    C = distance.euclidean(eye_points[0], eye_points[3])  # |p1-p4|

    if C == 0:
        return 0

    ear = (A + B) / (2.0 * C)
    return ear


def get_eye_points_from_row(row, side, csv_type):
    """
    Extrai coordenadas (x,y) dos 6 pontos chave do olho para clculo do EAR.

    Args:
        row: Linha do DataFrame
        side: 'right' ou 'left'
        csv_type: 'all_points' ou 'eyes_only'

    Returns:
        Lista de 6 tuplas [(x,y), ...] ou None se dados invlidos
    """
    points = []

    if csv_type == 'all_points':
        # ndices oficiais MediaPipe (478 points) para EAR
        indices = {
            'right': [33, 160, 158, 133, 153, 144],
            'left':  [362, 385, 387, 263, 373, 380]
        }

        current_indices = indices[side]
        for idx in current_indices:
            x = row.get(f'point_{idx}_x')
            y = row.get(f'point_{idx}_y')
            if pd.isna(x) or pd.isna(y):
                return None
            points.append((x, y))

    elif csv_type == 'eyes_only':
        # Mapeamento para formato simplificado (32 pontos)
        if side == 'right':
            cols = [
                ('right_lower_1_x', 'right_lower_1_y'),   # P1 - Canto esquerdo
                ('right_upper_3_x', 'right_upper_3_y'),   # P2 - Superior 1
                ('right_upper_5_x', 'right_upper_5_y'),   # P3 - Superior 2
                ('right_lower_9_x', 'right_lower_9_y'),   # P4 - Canto direito
                ('right_lower_6_x', 'right_lower_6_y'),   # P5 - Inferior 2
                ('right_lower_4_x', 'right_lower_4_y'),   # P6 - Inferior 1
            ]
        else:  # left
            cols = [
                ('left_lower_1_x', 'left_lower_1_y'),
                ('left_upper_3_x', 'left_upper_3_y'),
                ('left_upper_5_x', 'left_upper_5_y'),
                ('left_lower_9_x', 'left_lower_9_y'),
                ('left_lower_6_x', 'left_lower_6_y'),
                ('left_lower_4_x', 'left_lower_4_y'),
            ]

        for cx, cy in cols:
            val_x = row.get(cx)
            val_y = row.get(cy)
            if pd.isna(val_x) or pd.isna(val_y):
                return None
            points.append((val_x, val_y))

    return points


def detect_csv_type(df):
    """
    Detecta automaticamente o tipo de CSV baseado nas colunas.

    Returns:
        'all_points', 'eyes_only', ou None se desconhecido
    """
    if 'point_0_x' in df.columns:
        return 'all_points'
    elif 'right_upper_1_x' in df.columns:
        return 'eyes_only'
    return None


def calculate_ear_series(df, csv_type):
    """
    Calcula series de EAR para olho direito, esquerdo e media.
    VETORIZADO - usa operacoes numpy em vez de iterrows (10-50x mais rapido).

    Returns:
        Tuple de (ear_right, ear_left, ear_avg) como arrays numpy
    """
    n_frames = len(df)
    ear_right = np.full(n_frames, np.nan, dtype=float)
    ear_left = np.full(n_frames, np.nan, dtype=float)

    if csv_type == 'all_points':
        # Indices oficiais MediaPipe (478 points) para EAR
        right_indices = [33, 160, 158, 133, 153, 144]
        left_indices = [362, 385, 387, 263, 373, 380]

        # Extrair coordenadas como arrays numpy (n_frames, 6, 2)
        right_x = np.array([df[f'point_{idx}_x'].values for idx in right_indices]).T
        right_y = np.array([df[f'point_{idx}_y'].values for idx in right_indices]).T
        left_x = np.array([df[f'point_{idx}_x'].values for idx in left_indices]).T
        left_y = np.array([df[f'point_{idx}_y'].values for idx in left_indices]).T

    elif csv_type == 'eyes_only':
        # Mapeamento para formato simplificado (32 pontos)
        right_cols = [
            ('right_lower_1_x', 'right_lower_1_y'),
            ('right_upper_3_x', 'right_upper_3_y'),
            ('right_upper_5_x', 'right_upper_5_y'),
            ('right_lower_9_x', 'right_lower_9_y'),
            ('right_lower_6_x', 'right_lower_6_y'),
            ('right_lower_4_x', 'right_lower_4_y'),
        ]
        left_cols = [
            ('left_lower_1_x', 'left_lower_1_y'),
            ('left_upper_3_x', 'left_upper_3_y'),
            ('left_upper_5_x', 'left_upper_5_y'),
            ('left_lower_9_x', 'left_lower_9_y'),
            ('left_lower_6_x', 'left_lower_6_y'),
            ('left_lower_4_x', 'left_lower_4_y'),
        ]

        right_x = np.array([df[cx].values for cx, cy in right_cols]).T
        right_y = np.array([df[cy].values for cx, cy in right_cols]).T
        left_x = np.array([df[cx].values for cx, cy in left_cols]).T
        left_y = np.array([df[cy].values for cx, cy in left_cols]).T

    else:
        return ear_right, ear_left

    # Calcular EAR vetorizado para ambos os olhos
    # EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)

    # Distancias verticais
    A_right = np.sqrt((right_x[:, 1] - right_x[:, 5])**2 + (right_y[:, 1] - right_y[:, 5])**2)
    B_right = np.sqrt((right_x[:, 2] - right_x[:, 4])**2 + (right_y[:, 2] - right_y[:, 4])**2)
    C_right = np.sqrt((right_x[:, 0] - right_x[:, 3])**2 + (right_y[:, 0] - right_y[:, 3])**2)

    A_left = np.sqrt((left_x[:, 1] - left_x[:, 5])**2 + (left_y[:, 1] - left_y[:, 5])**2)
    B_left = np.sqrt((left_x[:, 2] - left_x[:, 4])**2 + (left_y[:, 2] - left_y[:, 4])**2)
    C_left = np.sqrt((left_x[:, 0] - left_x[:, 3])**2 + (left_y[:, 0] - left_y[:, 3])**2)

    # Evitar divisao por zero
    valid_right = C_right > 0
    valid_left = C_left > 0

    ear_right[valid_right] = (A_right[valid_right] + B_right[valid_right]) / (2.0 * C_right[valid_right])
    ear_left[valid_left] = (A_left[valid_left] + B_left[valid_left]) / (2.0 * C_left[valid_left])

    return ear_right, ear_left


def smooth_ear_series(ear_series):
    """
    Aplica interpolao e suavizao  srie EAR.

    Args:
        ear_series: Array numpy com valores EAR (pode conter NaN)

    Returns:
        Array numpy suavizado
    """
    # Converter para Series para usar mtodos pandas
    s = pd.Series(ear_series)

    # Interpolao linear para gaps curtos (max 3 frames)
    s = s.interpolate(method='linear', limit=3)

    # Suavizao com mdia mvel (janela de 3)
    s_smooth = s.rolling(window=3, center=True).mean()

    # Preencher bordas com valores originais
    s_smooth = s_smooth.fillna(s)

    return s_smooth.values


def detect_blinks_single_eye(ear_smooth, fps, baseline_ear, eye_name):
    """
    Detecta piscadas em uma serie EAR de um unico olho.
    OTIMIZADO: Usa operacoes vetorizadas numpy para deteccao rapida.

    Args:
        ear_smooth: Array de valores EAR suavizados
        fps: Frames por segundo
        baseline_ear: Valor de referencia EAR (olho aberto)
        eye_name: 'Direito' ou 'Esquerdo' para identificacao

    Returns:
        Lista de dicionarios com dados de cada piscada
    """
    # Thresholds dinamicos baseados no baseline
    EAR_THRESHOLD = baseline_ear * 0.75
    EAR_COMPLETE_LIMIT = baseline_ear * 0.50
    MIN_FRAMES = 2
    MIN_INTER_BLINK_TIME_SEC = 0.5

    # Criar mascara de piscada (EAR abaixo do threshold)
    valid_mask = ~np.isnan(ear_smooth)
    below_threshold = (ear_smooth < EAR_THRESHOLD) & valid_mask

    if not np.any(below_threshold):
        return []

    # Encontrar segmentos continuos abaixo do threshold
    # diff encontra as transicoes: inicio=1, fim=-1
    diff = np.diff(below_threshold.astype(int))
    start_indices = np.where(diff == 1)[0] + 1
    end_indices = np.where(diff == -1)[0] + 1

    # Ajustar bordas
    if below_threshold[0]:
        start_indices = np.concatenate([[0], start_indices])
    if below_threshold[-1]:
        end_indices = np.concatenate([end_indices, [len(ear_smooth)]])

    blinks = []
    last_blink_end_frame = -9999

    for start_frame, end_frame in zip(start_indices, end_indices):
        duration_frames = end_frame - start_frame

        if duration_frames < MIN_FRAMES:
            continue

        # Periodo refratario
        time_since_last = (start_frame - last_blink_end_frame) / fps
        if time_since_last < MIN_INTER_BLINK_TIME_SEC:
            continue

        # Encontrar minimo EAR no segmento
        segment = ear_smooth[start_frame:end_frame]
        valid_segment = segment[~np.isnan(segment)]
        if len(valid_segment) == 0:
            continue

        min_ear_in_blink = np.min(valid_segment)
        min_ear_frame_idx = start_frame + np.argmin(segment)

        # Classificar
        category = "Completa" if min_ear_in_blink <= EAR_COMPLETE_LIMIT else "Incompleta"

        # Tempos
        start_time = start_frame / fps
        end_time = end_frame / fps
        duration_sec = duration_frames / fps

        # Amplitude
        amplitude = baseline_ear - min_ear_in_blink

        # Fases
        closing_frames = min_ear_frame_idx - start_frame
        closing_duration = closing_frames / fps if closing_frames > 0 else 0.001

        opening_frames = end_frame - min_ear_frame_idx
        opening_duration = opening_frames / fps if opening_frames > 0 else 0.001

        # Velocidades
        closing_speed = amplitude / closing_duration if closing_duration > 0 else 0
        opening_speed = amplitude / opening_duration if opening_duration > 0 else 0

        # RBA
        rba = (amplitude / baseline_ear) * 100 if baseline_ear > 0 else 0

        blinks.append({
            'ID': len(blinks) + 1,
            'Olho': eye_name,
            'Frame Inicio': int(start_frame),
            'Frame Minimo': int(min_ear_frame_idx),
            'Frame Fim': int(end_frame),
            'Tempo Inicio (s)': round(start_time, 3),
            'Tempo Fim (s)': round(end_time, 3),
            'Duracao (s)': round(duration_sec, 3),
            'Duracao (frames)': int(duration_frames),
            'EAR Minimo': round(min_ear_in_blink, 4),
            'EAR Baseline': round(baseline_ear, 4),
            'Amplitude': round(amplitude, 4),
            'RBA (%)': round(rba, 1),
            'Vel. Fechamento (EAR/s)': round(closing_speed, 4),
            'Vel. Abertura (EAR/s)': round(opening_speed, 4),
            'Tempo Fechamento (s)': round(closing_duration, 3),
            'Tempo Abertura (s)': round(opening_duration, 3),
            'Classificacao': category,
            'Minuto': int(start_time // 60) + 1
        })

        last_blink_end_frame = end_frame

    return blinks


def find_synchronized_blinks(blinks_right, blinks_left, fps, tolerance_frames=5):
    """
    Identifica piscadas sincronizadas (binoculares) entre os dois olhos.
    OTIMIZADO: O(n log n) com busca binaria em vez de O(n^2).

    Args:
        blinks_right: Lista de piscadas do olho direito
        blinks_left: Lista de piscadas do olho esquerdo
        fps: Frames por segundo
        tolerance_frames: Tolerancia em frames para considerar sincronizado

    Returns:
        Lista de tuplas (blink_right, blink_left) sincronizadas
    """
    if not blinks_right or not blinks_left:
        return []

    # Ordenar piscadas pelo frame de inicio
    left_sorted = sorted(enumerate(blinks_left), key=lambda x: x[1]['Frame Inicio'])
    left_starts = np.array([bl['Frame Inicio'] for _, bl in left_sorted])

    synchronized = []
    used_left = set()

    for br in blinks_right:
        br_start = br['Frame Inicio']

        # Buscar piscadas do olho esquerdo dentro da tolerancia usando busca binaria
        idx = np.searchsorted(left_starts, br_start)

        # Verificar vizinhos proximos
        candidates = []
        for offset in [-1, 0, 1]:
            check_idx = idx + offset
            if 0 <= check_idx < len(left_sorted) and check_idx not in used_left:
                actual_idx, bl = left_sorted[check_idx]
                start_diff = abs(br_start - bl['Frame Inicio'])
                if start_diff <= tolerance_frames:
                    candidates.append((start_diff, actual_idx, bl))

        if candidates:
            # Escolher a piscada mais proxima
            candidates.sort(key=lambda x: x[0])
            _, best_idx, best_bl = candidates[0]
            synchronized.append((br, best_bl))
            used_left.add(best_idx)

    return synchronized


def generate_timeline_data(blinks_right, blinks_left, total_frames, fps):
    """
    Gera dados de timeline para visualizao de piscadas por olho.

    Returns:
        DataFrame com colunas: Tempo, Direito, Esquerdo, Ambos
    """
    # Criar array binrio para cada olho
    right_timeline = np.zeros(total_frames)
    left_timeline = np.zeros(total_frames)

    for b in blinks_right:
        start = b['Frame Inicio']
        end = min(b['Frame Fim'], total_frames - 1)
        right_timeline[start:end+1] = 1

    for b in blinks_left:
        start = b['Frame Inicio']
        end = min(b['Frame Fim'], total_frames - 1)
        left_timeline[start:end+1] = 1

    # Ambos = onde os dois esto piscando simultaneamente
    both_timeline = (right_timeline == 1) & (left_timeline == 1)

    # Criar DataFrame amostrado (a cada 0.1s para no ficar muito grande)
    sample_interval = max(1, int(fps / 10))  # ~10 amostras por segundo
    indices = list(range(0, total_frames, sample_interval))

    timeline_df = pd.DataFrame({
        'Frame': indices,
        'Tempo (s)': [i / fps for i in indices],
        'Direito': right_timeline[indices].astype(int),
        'Esquerdo': left_timeline[indices].astype(int),
        'Ambos': both_timeline[indices].astype(int)
    })

    return timeline_df


def generate_velocity_distribution(blinks_right, blinks_left):
    """
    Gera dados de distribuio de velocidade binocular.

    Returns:
        DataFrame com velocidades de fechamento e abertura por olho
    """
    data = []

    for b in blinks_right:
        data.append({
            'Olho': 'Direito',
            'ID Piscada': b['ID'],
            'Tempo (s)': b['Tempo Inicio (s)'],
            'Vel. Fechamento': b['Vel. Fechamento (EAR/s)'],
            'Vel. Abertura': b['Vel. Abertura (EAR/s)'],
            'Amplitude': b['Amplitude']
        })

    for b in blinks_left:
        data.append({
            'Olho': 'Esquerdo',
            'ID Piscada': b['ID'],
            'Tempo (s)': b['Tempo Inicio (s)'],
            'Vel. Fechamento': b['Vel. Fechamento (EAR/s)'],
            'Vel. Abertura': b['Vel. Abertura (EAR/s)'],
            'Amplitude': b['Amplitude']
        })

    return pd.DataFrame(data)


def calculate_ibi_stats(blinks, fps):
    """
    Calcula estatisticas do Inter-Blink Interval (IBI).
    IBI eh o tempo entre piscadas consecutivas.

    Returns:
        Dicionario com metricas de IBI
    """
    if not blinks or len(blinks) < 2:
        return {
            'IBI Medio (s)': 0,
            'IBI Mediana (s)': 0,
            'IBI Desvio Padrao (s)': 0,
            'IBI Minimo (s)': 0,
            'IBI Maximo (s)': 0,
            'IBI CV (%)': 0,
            'IBI P10 (s)': 0,
            'IBI P90 (s)': 0
        }

    # Extrair frames de inicio e calcular intervalos
    start_frames = sorted([b['Frame Inicio'] for b in blinks])
    ibi_frames = np.diff(start_frames)
    ibi_seconds = ibi_frames / fps

    return {
        'IBI Medio (s)': round(np.mean(ibi_seconds), 3),
        'IBI Mediana (s)': round(np.median(ibi_seconds), 3),
        'IBI Desvio Padrao (s)': round(np.std(ibi_seconds), 3),
        'IBI Minimo (s)': round(np.min(ibi_seconds), 3),
        'IBI Maximo (s)': round(np.max(ibi_seconds), 3),
        'IBI CV (%)': round((np.std(ibi_seconds) / np.mean(ibi_seconds)) * 100, 1) if np.mean(ibi_seconds) > 0 else 0,
        'IBI P10 (s)': round(np.percentile(ibi_seconds, 10), 3),
        'IBI P90 (s)': round(np.percentile(ibi_seconds, 90), 3)
    }


def detect_blink_bursts(blinks, fps, max_interval_sec=2.0, min_blinks=3):
    """
    Detecta clusters/bursts de piscadas (piscadas rapidas em sequencia).

    Args:
        blinks: Lista de piscadas
        fps: Frames por segundo
        max_interval_sec: Intervalo maximo entre piscadas no burst
        min_blinks: Minimo de piscadas para considerar burst

    Returns:
        Lista de dicionarios com dados de cada burst
    """
    if not blinks or len(blinks) < min_blinks:
        return []

    # Ordenar piscadas por tempo
    sorted_blinks = sorted(blinks, key=lambda b: b['Tempo Inicio (s)'])

    bursts = []
    current_burst = [sorted_blinks[0]]

    for i in range(1, len(sorted_blinks)):
        interval = sorted_blinks[i]['Tempo Inicio (s)'] - sorted_blinks[i-1]['Tempo Inicio (s)']

        if interval <= max_interval_sec:
            current_burst.append(sorted_blinks[i])
        else:
            if len(current_burst) >= min_blinks:
                burst_data = {
                    'Inicio (s)': round(current_burst[0]['Tempo Inicio (s)'], 3),
                    'Fim (s)': round(current_burst[-1]['Tempo Fim (s)'], 3),
                    'Duracao (s)': round(current_burst[-1]['Tempo Fim (s)'] - current_burst[0]['Tempo Inicio (s)'], 3),
                    'Numero Piscadas': len(current_burst),
                    'Taxa no Burst (piscadas/min)': round(len(current_burst) / ((current_burst[-1]['Tempo Fim (s)'] - current_burst[0]['Tempo Inicio (s)']) / 60), 1) if (current_burst[-1]['Tempo Fim (s)'] - current_burst[0]['Tempo Inicio (s)']) > 0 else 0,
                    'Amplitude Media': round(np.mean([b['Amplitude'] for b in current_burst]), 4),
                    '% Completas': round(sum(1 for b in current_burst if b['Classificacao'] == 'Completa') / len(current_burst) * 100, 1)
                }
                bursts.append(burst_data)
            current_burst = [sorted_blinks[i]]

    # Verificar ultimo burst
    if len(current_burst) >= min_blinks:
        burst_data = {
            'Inicio (s)': round(current_burst[0]['Tempo Inicio (s)'], 3),
            'Fim (s)': round(current_burst[-1]['Tempo Fim (s)'], 3),
            'Duracao (s)': round(current_burst[-1]['Tempo Fim (s)'] - current_burst[0]['Tempo Inicio (s)'], 3),
            'Numero Piscadas': len(current_burst),
            'Taxa no Burst (piscadas/min)': round(len(current_burst) / ((current_burst[-1]['Tempo Fim (s)'] - current_burst[0]['Tempo Inicio (s)']) / 60), 1) if (current_burst[-1]['Tempo Fim (s)'] - current_burst[0]['Tempo Inicio (s)']) > 0 else 0,
            'Amplitude Media': round(np.mean([b['Amplitude'] for b in current_burst]), 4),
            '% Completas': round(sum(1 for b in current_burst if b['Classificacao'] == 'Completa') / len(current_burst) * 100, 1)
        }
        bursts.append(burst_data)

    return bursts


def calculate_amplitude_asymmetry(blinks_right, blinks_left):
    """
    Calcula assimetria de amplitude entre olhos.

    Returns:
        Dicionario com metricas de assimetria
    """
    if not blinks_right or not blinks_left:
        return {
            'Assimetria Amplitude (%)': 0,
            'Assimetria Velocidade Fechamento (%)': 0,
            'Assimetria Velocidade Abertura (%)': 0,
            'Assimetria Duracao (%)': 0,
            'Correlacao Amplitude': 0
        }

    # Amplitudes medias
    amp_right = np.mean([b['Amplitude'] for b in blinks_right])
    amp_left = np.mean([b['Amplitude'] for b in blinks_left])
    max_amp = max(amp_right, amp_left)

    # Velocidades medias
    vel_fech_right = np.mean([b['Vel. Fechamento (EAR/s)'] for b in blinks_right])
    vel_fech_left = np.mean([b['Vel. Fechamento (EAR/s)'] for b in blinks_left])
    max_vel_fech = max(vel_fech_right, vel_fech_left)

    vel_abert_right = np.mean([b['Vel. Abertura (EAR/s)'] for b in blinks_right])
    vel_abert_left = np.mean([b['Vel. Abertura (EAR/s)'] for b in blinks_left])
    max_vel_abert = max(vel_abert_right, vel_abert_left)

    # Durações médias
    dur_right = np.mean([b['Duracao (s)'] for b in blinks_right])
    dur_left = np.mean([b['Duracao (s)'] for b in blinks_left])
    max_dur = max(dur_right, dur_left)

    # Correlacao de amplitude (se houver piscadas sincronizadas suficientes)
    corr_amp = 0
    if len(blinks_right) > 2 and len(blinks_left) > 2:
        try:
            # Usar as primeiras N piscadas de cada olho (ate o minimo)
            n = min(len(blinks_right), len(blinks_left), 20)
            amps_r = [blinks_right[i]['Amplitude'] for i in range(n)]
            amps_l = [blinks_left[i]['Amplitude'] for i in range(n)]
            corr_amp = round(float(np.corrcoef(amps_r, amps_l)[0, 1]), 3)
        except:
            corr_amp = 0

    return {
        'Assimetria Amplitude (%)': round(abs(amp_right - amp_left) / max_amp * 100, 1) if max_amp > 0 else 0,
        'Assimetria Velocidade Fechamento (%)': round(abs(vel_fech_right - vel_fech_left) / max_vel_fech * 100, 1) if max_vel_fech > 0 else 0,
        'Assimetria Velocidade Abertura (%)': round(abs(vel_abert_right - vel_abert_left) / max_vel_abert * 100, 1) if max_vel_abert > 0 else 0,
        'Assimetria Duracao (%)': round(abs(dur_right - dur_left) / max_dur * 100, 1) if max_dur > 0 else 0,
        'Correlacao Amplitude': corr_amp
    }


def calculate_fatigue_index(blinks, ear_series, fps, total_frames):
    """
    Calcula indice de fadiga baseado na tendencia temporal das piscadas.
    Fadiga tipica: aumento da taxa de piscadas incompletas, aumento da duracao,
    diminuicao da amplitude ao longo do tempo.

    Returns:
        Dicionario com metricas de fadiga
    """
    if not blinks or len(blinks) < 5:
        return {
            'Indice Fadiga': 0,
            'Tendencia Taxa (piscadas/min/min)': 0,
            'Tendencia Amplitude': 0,
            'Tendencia Duracao': 0,
            'Razao Incompletas Final/Inicial': 0
        }

    df = pd.DataFrame(blinks)

    # Dividir em duas metades
    mid_time = df['Tempo Inicio (s)'].median()
    first_half = df[df['Tempo Inicio (s)'] <= mid_time]
    second_half = df[df['Tempo Inicio (s)'] > mid_time]

    if len(first_half) == 0 or len(second_half) == 0:
        return {
            'Indice Fadiga': 0,
            'Tendencia Taxa (piscadas/min/min)': 0,
            'Tendencia Amplitude': 0,
            'Tendencia Duracao': 0,
            'Razao Incompletas Final/Inicial': 0
        }

    # Metricas por metade
    taxa_first = len(first_half) / (mid_time / 60) if mid_time > 0 else 0
    taxa_second = len(second_half) / ((total_frames / fps - mid_time) / 60) if (total_frames / fps - mid_time) > 0 else 0

    amp_first = first_half['Amplitude'].mean()
    amp_second = second_half['Amplitude'].mean()

    dur_first = first_half['Duracao (s)'].mean()
    dur_second = second_half['Duracao (s)'].mean()

    incompleta_first = len(first_half[first_half['Classificacao'] == 'Incompleta']) / len(first_half) if len(first_half) > 0 else 0
    incompleta_second = len(second_half[second_half['Classificacao'] == 'Incompleta']) / len(second_half) if len(second_half) > 0 else 0

    # Tendencias (coeficiente angular simples)
    # Para taxa: dividir em quartos
    df_sorted = df.sort_values('Tempo Inicio (s)')
    n = len(df_sorted)
    if n >= 4:
        chunk_size = n // 4
        taxas_quartis = []
        for i in range(4):
            start_idx = i * chunk_size
            end_idx = (i + 1) * chunk_size if i < 3 else n
            chunk = df_sorted.iloc[start_idx:end_idx]
            if len(chunk) > 0:
                duracao_min = (chunk['Tempo Fim (s)'].max() - chunk['Tempo Inicio (s)'].min()) / 60
                if duracao_min > 0:
                    taxas_quartis.append(len(chunk) / duracao_min)
                else:
                    taxas_quartis.append(0)
            else:
                taxas_quartis.append(0)
        tendencia_taxa = np.polyfit(range(4), taxas_quartis, 1)[0] if len([t for t in taxas_quartis if t > 0]) >= 2 else 0
    else:
        tendencia_taxa = 0

    # Indice composto de fadiga (0-100)
    # Aumento de incompletas = +40, diminuicao de amplitude = +30, aumento duracao = +20, aumento taxa = +10
    fatores = []
    if incompleta_first > 0:
        fatores.append(min(40, (incompleta_second / incompleta_first - 1) * 40))
    if amp_first > 0:
        fatores.append(min(30, (1 - amp_second / amp_first) * 30))
    if dur_first > 0:
        fatores.append(min(20, (dur_second / dur_first - 1) * 20))
    if taxa_first > 0:
        fatores.append(min(10, (taxa_second / taxa_first - 1) * 10))

    fatigue_index = sum(fatores)

    return {
        'Indice Fadiga': round(fatigue_index, 1),
        'Tendencia Taxa (piscadas/min/min)': round(tendencia_taxa, 3),
        'Tendencia Amplitude': round(amp_second - amp_first, 4),
        'Tendencia Duracao': round(dur_second - dur_first, 3),
        'Razao Incompletas Final/Inicial': round(incompleta_second / incompleta_first, 2) if incompleta_first > 0 else 0
    }


def calculate_velocity_percentiles(blinks):
    """
    Calcula percentis das velocidades de fechamento e abertura.

    Returns:
        Dicionario com percentis P10, P50, P90
    """
    if not blinks:
        return {
            'Vel Fech P10': 0, 'Vel Fech P50': 0, 'Vel Fech P90': 0,
            'Vel Abert P10': 0, 'Vel Abert P50': 0, 'Vel Abert P90': 0
        }

    vel_fech = [b['Vel. Fechamento (EAR/s)'] for b in blinks]
    vel_abert = [b['Vel. Abertura (EAR/s)'] for b in blinks]

    return {
        'Vel Fech P10': round(np.percentile(vel_fech, 10), 4),
        'Vel Fech P50': round(np.percentile(vel_fech, 50), 4),
        'Vel Fech P90': round(np.percentile(vel_fech, 90), 4),
        'Vel Abert P10': round(np.percentile(vel_abert, 10), 4),
        'Vel Abert P50': round(np.percentile(vel_abert, 50), 4),
        'Vel Abert P90': round(np.percentile(vel_abert, 90), 4)
    }


def calculate_post_blink_latency(ear_series, blinks, fps, baseline_ear):
    """
    Calcula latencia para estabilizacao do EAR apos cada piscada.
    Tempo ate o EAR retornar a 95% do baseline.

    Returns:
        Lista de latencias e estatisticas
    """
    if not blinks or len(ear_series) == 0:
        return {'Latencia Media (ms)': 0, 'Latencia Mediana (ms)': 0}

    latencies = []
    target_ear = baseline_ear * 0.95

    for blink in blinks:
        end_frame = blink['Frame Fim']
        # Procurar ate 30 frames (1s a 30fps) apos o fim
        for offset in range(1, min(31, len(ear_series) - end_frame)):
            if ear_series[end_frame + offset] >= target_ear:
                latencies.append(offset / fps * 1000)  # ms
                break
        else:
            # Nao estabilizou no periodo
            latencies.append(30 / fps * 1000)

    return {
        'Latencia Media (ms)': round(np.mean(latencies), 1) if latencies else 0,
        'Latencia Mediana (ms)': round(np.median(latencies), 1) if latencies else 0,
        'Latencia Max (ms)': round(np.max(latencies), 1) if latencies else 0
    }


def calculate_eye_health_score(stats_right, stats_left, asymmetry, fatigue):
    """
    Calcula score composto de saude ocular (0-100).
    Baseado em: taxa normal, simetria, baixa fadiga, amplitude adequada.

    Returns:
        Score (0-100) e componentes
    """
    score = 100

    # Taxa ideal: 10-20 piscadas/min
    taxa_media = (stats_right['Taxa (piscadas/min)'] + stats_left['Taxa (piscadas/min)']) / 2
    if taxa_media < 5:
        score -= 20
    elif taxa_media < 10:
        score -= 10
    elif taxa_media > 25:
        score -= 15

    # Simetria: ideal < 20%
    assimetria_amp = asymmetry.get('Assimetria Amplitude (%)', 0)
    if assimetria_amp > 30:
        score -= 20
    elif assimetria_amp > 20:
        score -= 10

    # Fadiga: ideal < 30
    indice_fadiga = fatigue.get('Indice Fadiga', 0)
    if indice_fadiga > 50:
        score -= 20
    elif indice_fadiga > 30:
        score -= 10

    # Amplitude: ideal > 0.1
    amp_media = (stats_right['Amplitude Mdia'] + stats_left['Amplitude Mdia']) / 2
    if amp_media < 0.05:
        score -= 15
    elif amp_media < 0.08:
        score -= 5

    # Completude: ideal > 80%
    comp_media = (stats_right['% Completas'] + stats_left['% Completas']) / 2
    if comp_media < 50:
        score -= 15
    elif comp_media < 70:
        score -= 5

    return {
        'Score Saude Ocular': round(max(0, score), 1),
        'Componente Taxa': round(max(0, 100 - abs(taxa_media - 15) * 2), 1),
        'Componente Simetria': round(max(0, 100 - assimetria_amp * 2), 1),
        'Componente Fadiga': round(max(0, 100 - indice_fadiga * 1.5), 1),
        'Componente Amplitude': round(min(100, amp_media * 1000), 1),
        'Componente Completude': round(comp_media, 1)
    }


def calculate_summary_stats(blinks, fps, total_frames, eye_name, baseline_ear):
    """
    Calcula estatsticas resumidas para um olho.

    Returns:
        Dicionrio com mtricas resumidas
    """
    if not blinks:
        return {
            'Olho': eye_name,
            'Total Piscadas': 0,
            'Completas': 0,
            'Incompletas': 0,
            '% Completas': 0,
            'Durao Mdia (s)': 0,
            'Taxa (piscadas/min)': 0,
            'Amplitude Mdia': 0,
            'RBA Mdio (%)': 0,
            'Vel. Fechamento Mdia': 0,
            'Vel. Abertura Mdia': 0,
            'Baseline EAR': round(baseline_ear, 4)
        }

    df = pd.DataFrame(blinks)
    total = len(df)
    completas = len(df[df['Classificacao'] == 'Completa'])
    incompletas = total - completas

    video_duration_min = (total_frames / fps) / 60
    taxa = total / video_duration_min if video_duration_min > 0 else 0

    return {
        'Olho': eye_name,
        'Total Piscadas': total,
        'Completas': completas,
        'Incompletas': incompletas,
        '% Completas': round((completas / total) * 100, 1) if total > 0 else 0,
        'Durao Mdia (s)': round(df['Duracao (s)'].mean(), 3),
        'Taxa (piscadas/min)': round(taxa, 1),
        'Amplitude Mdia': round(df['Amplitude'].mean(), 4),
        'RBA Mdio (%)': round(df['RBA (%)'].mean(), 1),
        'Vel. Fechamento Mdia': round(df['Vel. Fechamento (EAR/s)'].mean(), 4),
        'Vel. Abertura Mdia': round(df['Vel. Abertura (EAR/s)'].mean(), 4),
        'Baseline EAR': round(baseline_ear, 4)
    }


def generate_per_minute_report(blinks_right, blinks_left):
    """
    Gera relatrio de distribuio por minuto para cada olho.

    Returns:
        DataFrame com contagem por minuto e olho
    """
    data = []

    # Agrupar por minuto - Direito
    if blinks_right:
        df_r = pd.DataFrame(blinks_right)
        for minuto, group in df_r.groupby('Minuto'):
            completas = len(group[group['Classificacao'] == 'Completa'])
            incompletas = len(group[group['Classificacao'] == 'Incompleta'])
            data.append({
                'Minuto': minuto,
                'Olho': 'Direito',
                'Completas': completas,
                'Incompletas': incompletas,
                'Total': completas + incompletas
            })

    # Agrupar por minuto - Esquerdo
    if blinks_left:
        df_l = pd.DataFrame(blinks_left)
        for minuto, group in df_l.groupby('Minuto'):
            completas = len(group[group['Classificacao'] == 'Completa'])
            incompletas = len(group[group['Classificacao'] == 'Incompleta'])
            data.append({
                'Minuto': minuto,
                'Olho': 'Esquerdo',
                'Completas': completas,
                'Incompletas': incompletas,
                'Total': completas + incompletas
            })

    if data:
        df = pd.DataFrame(data)
        df = df.sort_values(['Minuto', 'Olho'])
        return df

    return pd.DataFrame(columns=['Minuto', 'Olho', 'Completas', 'Incompletas', 'Total'])


def generate_ear_timeseries(ear_right, ear_left, fps):
    """
    Gera srie temporal de EAR para exportao.

    Returns:
        DataFrame com EAR por frame/tempo
    """
    frames = list(range(len(ear_right)))
    times = [f / fps for f in frames]

    # Amostrar para no ficar muito grande (a cada 0.05s)
    sample_interval = max(1, int(fps / 20))
    indices = list(range(0, len(frames), sample_interval))

    return pd.DataFrame({
        'Frame': [frames[i] for i in indices],
        'Tempo (s)': [round(times[i], 3) for i in indices],
        'EAR Direito': [round(ear_right[i], 4) if not np.isnan(ear_right[i]) else None for i in indices],
        'EAR Esquerdo': [round(ear_left[i], 4) if not np.isnan(ear_left[i]) else None for i in indices]
    })


def read_fps_from_csv(csv_path):
    """
    L o FPS da primeira linha do CSV.
    Formato esperado: # FPS: <valor>

    Returns:
        float: Valor do FPS ou None se no encontrado
    """
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            first_line = f.readline().strip()
            if first_line.startswith('# FPS:'):
                val = float(first_line.split(':')[1].strip())
                if val > 0:
                    return val
    except:
        pass
    return None


def analyze_complete(csv_path, output_path, fps_override=None, csv_type_override=None):
    """
    Funo principal de anlise completa.

    Args:
        csv_path: Caminho do arquivo CSV
        output_path: Caminho do arquivo de sada (Excel ou JSON)
        fps_override: FPS manual (se None, l automaticamente do CSV)
        csv_type_override: Forar tipo de CSV ('all_points' ou 'eyes_only')
    """
    print(f"{'='*60}")
    print(f"ANLISE COMPLETA DE MTRICAS DE PISCADAS")
    print(f"{'='*60}")
    print(f"\n Arquivo: {csv_path}")

    # 1. Detectar FPS automaticamente do CSV ou usar override
    fps = read_fps_from_csv(csv_path)

    if fps_override is not None:
        fps = fps_override
        print(f"  FPS manual: {fps}")
    elif fps is not None:
        print(f"  FPS detectado do CSV: {fps}")
    else:
        fps = 30.0
        print(f"  FPS no encontrado no CSV, usando padro: {fps}")

    # 2. Ler CSV
    try:
        df = pd.read_csv(csv_path, comment='#')
        print(f"  Total de frames: {len(df)}")
    except Exception as e:
        print(f" Erro ao ler CSV: {e}")
        return

    # 3. Detectar tipo de CSV
    if csv_type_override:
        csv_type = csv_type_override
        print(f"  Tipo forado: {csv_type}")
    else:
        csv_type = detect_csv_type(df)
        if csv_type is None:
            print(" Tipo de CSV desconhecido. Use --tipo para especificar.")
            return
        print(f"  Tipo detectado: {'Full Mesh (478 pontos)' if csv_type == 'all_points' else 'Eyes Only (32 pontos)'}")

    # 4. Calcular EAR para cada olho
    print("\n Calculando EAR frame a frame...")
    ear_right_raw, ear_left_raw = calculate_ear_series(df, csv_type)

    # Suavizar
    ear_right = smooth_ear_series(ear_right_raw)
    ear_left = smooth_ear_series(ear_left_raw)

    # 5. Calcular baselines
    valid_right = ear_right[~np.isnan(ear_right)]
    valid_left = ear_left[~np.isnan(ear_left)]

    if len(valid_right) == 0 or len(valid_left) == 0:
        print(" Dados insuficientes para anlise.")
        return

    baseline_right = np.percentile(valid_right, 90)
    baseline_left = np.percentile(valid_left, 90)

    print(f"\n Baselines calculados:")
    print(f"   Olho Direito: {baseline_right:.4f}")
    print(f"   Olho Esquerdo: {baseline_left:.4f}")

    # 6. Detectar piscadas por olho
    print("\n Detectando piscadas...")
    blinks_right = detect_blinks_single_eye(ear_right, fps, baseline_right, 'Direito')
    blinks_left = detect_blinks_single_eye(ear_left, fps, baseline_left, 'Esquerdo')

    print(f"   Olho Direito: {len(blinks_right)} piscadas")
    print(f"   Olho Esquerdo: {len(blinks_left)} piscadas")

    # 7. Encontrar piscadas sincronizadas
    synchronized = find_synchronized_blinks(blinks_right, blinks_left, fps)
    print(f"   Sincronizadas (binoculares): {len(synchronized)}")

    # 8. Gerar estatsticas resumidas
    total_frames = len(df)
    stats_right = calculate_summary_stats(blinks_right, fps, total_frames, 'Direito', baseline_right)
    stats_left = calculate_summary_stats(blinks_left, fps, total_frames, 'Esquerdo', baseline_left)

    # NOVAS METRICAS AVANCADAS
    print("\n Calculando metricas avancadas...")

    # IBI (Inter-Blink Interval)
    ibi_right = calculate_ibi_stats(blinks_right, fps)
    ibi_left = calculate_ibi_stats(blinks_left, fps)
    print(f"   IBI medio - Direito: {ibi_right['IBI Medio (s)']}s | Esquerdo: {ibi_left['IBI Medio (s)']}s")

    # Bursts (clusters de piscadas)
    bursts_right = detect_blink_bursts(blinks_right, fps)
    bursts_left = detect_blink_bursts(blinks_left, fps)
    print(f"   Bursts detectados - Direito: {len(bursts_right)} | Esquerdo: {len(bursts_left)}")

    # Assimetria entre olhos
    asymmetry = calculate_amplitude_asymmetry(blinks_right, blinks_left)
    print(f"   Assimetria amplitude: {asymmetry['Assimetria Amplitude (%)']}%")

    # Fadiga
    all_blinks_sorted = sorted(blinks_right + blinks_left, key=lambda b: b['Tempo Inicio (s)'])
    fatigue = calculate_fatigue_index(all_blinks_sorted, ear_right, fps, total_frames)
    print(f"   Indice de fadiga: {fatigue['Indice Fadiga']}/100")

    # Percentis de velocidade
    vel_percentiles_right = calculate_velocity_percentiles(blinks_right)
    vel_percentiles_left = calculate_velocity_percentiles(blinks_left)

    # Latencia pos-piscada
    latency_right = calculate_post_blink_latency(ear_right, blinks_right, fps, baseline_right)
    latency_left = calculate_post_blink_latency(ear_left, blinks_left, fps, baseline_left)

    # Score de saude ocular
    health_score = calculate_eye_health_score(stats_right, stats_left, asymmetry, fatigue)
    print(f"   Score de saude ocular: {health_score['Score Saude Ocular']}/100")

    # Estatsticas combinadas
    video_duration_min = (total_frames / fps) / 60
    total_blinks = len(blinks_right) + len(blinks_left)

    stats_combined = {
        'Durao do Vdeo (s)': round(total_frames / fps, 2),
        'Durao do Vdeo (min)': round(video_duration_min, 2),
        'FPS': fps,
        'Total de Frames': total_frames,
        'Tipo CSV': csv_type,
        'Piscadas Sincronizadas': len(synchronized),
        'Score Saude Ocular': health_score['Score Saude Ocular'],
        'Indice Fadiga': fatigue['Indice Fadiga']
    }

    # 9. Gerar relatrios
    print("\n Gerando relatrios...")

    # Combinar todas as piscadas para detalhamento
    all_blinks = blinks_right + blinks_left
    all_blinks_df = pd.DataFrame(all_blinks) if all_blinks else pd.DataFrame()

    # Separar por olho
    blinks_right_df = pd.DataFrame(blinks_right) if blinks_right else pd.DataFrame()
    blinks_left_df = pd.DataFrame(blinks_left) if blinks_left else pd.DataFrame()

    # Resumo por olho
    summary_df = pd.DataFrame([stats_right, stats_left])

    # Informaes gerais
    info_df = pd.DataFrame([stats_combined])

    # Timeline
    timeline_df = generate_timeline_data(blinks_right, blinks_left, total_frames, fps)

    # Distribuio de velocidade
    velocity_df = generate_velocity_distribution(blinks_right, blinks_left)

    # Por minuto
    per_minute_df = generate_per_minute_report(blinks_right, blinks_left)

    # Srie temporal EAR
    ear_series_df = generate_ear_timeseries(ear_right, ear_left, fps)

    # NOVOS DATAFRAMES
    # IBI
    ibi_data = {'Mtrica': list(ibi_right.keys())}
    ibi_data['Direito'] = list(ibi_right.values())
    ibi_data['Esquerdo'] = [ibi_left[k] for k in ibi_right.keys()]
    ibi_df = pd.DataFrame(ibi_data)

    # Bursts
    bursts_df = pd.DataFrame(bursts_right + bursts_left) if (bursts_right or bursts_left) else pd.DataFrame()
    if not bursts_df.empty:
        bursts_df['Olho'] = ['Direito'] * len(bursts_right) + ['Esquerdo'] * len(bursts_left)

    # Assimetria
    asymmetry_df = pd.DataFrame([asymmetry])

    # Fadiga
    fatigue_df = pd.DataFrame([fatigue])

    # Percentis de velocidade
    vel_pct_data = {'Mtrica': list(vel_percentiles_right.keys())}
    vel_pct_data['Direito'] = list(vel_percentiles_right.values())
    vel_pct_data['Esquerdo'] = [vel_percentiles_left[k] for k in vel_percentiles_right.keys()]
    vel_pct_df = pd.DataFrame(vel_pct_data)

    # Latencia
    latency_data = {'Mtrica': list(latency_right.keys())}
    latency_data['Direito'] = list(latency_right.values())
    latency_data['Esquerdo'] = [latency_left[k] for k in latency_right.keys()]
    latency_df = pd.DataFrame(latency_data)

    # Score saude
    health_df = pd.DataFrame([health_score])

    # 10. Salvar resultados
    output_ext = os.path.splitext(output_path)[1].lower()

    if output_ext == '.json':
        # Exportar como JSON
        result = {
            'metadata': {
                'arquivo': os.path.basename(csv_path),
                'data_analise': datetime.now().isoformat(),
                'fps': fps,
                'total_frames': total_frames,
                'duracao_segundos': round(total_frames / fps, 2),
                'tipo_csv': csv_type
            },
            'resumo': {
                'direito': {**stats_right, **ibi_right, **vel_percentiles_right, **latency_right},
                'esquerdo': {**stats_left, **ibi_left, **vel_percentiles_left, **latency_left},
                'piscadas_sincronizadas': len(synchronized),
                'assimetria': asymmetry,
                'fadiga': fatigue,
                'score_saude_ocular': health_score
            },
            'piscadas_direito': blinks_right,
            'piscadas_esquerdo': blinks_left,
            'bursts': bursts_df.to_dict('records') if not bursts_df.empty else [],
            'por_minuto': per_minute_df.to_dict('records') if not per_minute_df.empty else [],
            'timeline': timeline_df.to_dict('records'),
            'distribuicao_velocidade': velocity_df.to_dict('records') if not velocity_df.empty else []
        }

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        print(f"\n Resultados salvos em JSON: {output_path}")

    else:
        # Exportar como Excel
        try:
            with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
                # Informaes gerais
                info_df.to_excel(writer, sheet_name='Info', index=False)

                # Score de Saude Ocular
                health_df.to_excel(writer, sheet_name='Score Saude Ocular', index=False)

                # Resumo por olho
                summary_df.to_excel(writer, sheet_name='Resumo por Olho', index=False)

                # IBI
                ibi_df.to_excel(writer, sheet_name='IBI', index=False)

                # Percentis Velocidade
                vel_pct_df.to_excel(writer, sheet_name='Percentis Velocidade', index=False)

                # Latencia Pos-Piscada
                latency_df.to_excel(writer, sheet_name='Latencia', index=False)

                # Assimetria
                asymmetry_df.to_excel(writer, sheet_name='Assimetria', index=False)

                # Fadiga
                fatigue_df.to_excel(writer, sheet_name='Fadiga', index=False)

                # Bursts
                if not bursts_df.empty:
                    bursts_df.to_excel(writer, sheet_name='Bursts', index=False)

                # Detalhamento - Direito
                if not blinks_right_df.empty:
                    blinks_right_df.to_excel(writer, sheet_name='Piscadas Direito', index=False)

                # Detalhamento - Esquerdo
                if not blinks_left_df.empty:
                    blinks_left_df.to_excel(writer, sheet_name='Piscadas Esquerdo', index=False)

                # Todas as piscadas
                if not all_blinks_df.empty:
                    all_blinks_df.to_excel(writer, sheet_name='Todas Piscadas', index=False)

                # Por minuto
                if not per_minute_df.empty:
                    per_minute_df.to_excel(writer, sheet_name='Por Minuto', index=False)

                # Distribuio de velocidade
                if not velocity_df.empty:
                    velocity_df.to_excel(writer, sheet_name='Velocidades', index=False)

                # Timeline (limitado para no ficar muito grande)
                timeline_df.to_excel(writer, sheet_name='Timeline', index=False)

                # Srie EAR
                ear_series_df.to_excel(writer, sheet_name='Serie EAR', index=False)

            print(f"\n Relatrio Excel salvo: {output_path}")

        except Exception as e:
            print(f" Erro ao salvar Excel: {e}")
            return

    # 11. Imprimir resumo no console
    print(f"\n{'='*60}")
    print("RESUMO DA ANLISE")
    print(f"{'='*60}")
    print(f"\n Olho Direito:")
    print(f"   Total: {stats_right['Total Piscadas']} piscadas")
    print(f"   Completas: {stats_right['Completas']} ({stats_right['% Completas']}%)")
    print(f"   Incompletas: {stats_right['Incompletas']}")
    print(f"   Taxa: {stats_right['Taxa (piscadas/min)']} piscadas/min")
    print(f"   Amplitude Mdia: {stats_right['Amplitude Mdia']}")
    print(f"   Vel. Fechamento Mdia: {stats_right['Vel. Fechamento Mdia']} EAR/s")
    print(f"   Vel. Abertura Mdia: {stats_right['Vel. Abertura Mdia']} EAR/s")
    print(f"   IBI Mdio: {ibi_right['IBI Medio (s)']}s")

    print(f"\n Olho Esquerdo:")
    print(f"   Total: {stats_left['Total Piscadas']} piscadas")
    print(f"   Completas: {stats_left['Completas']} ({stats_left['% Completas']}%)")
    print(f"   Incompletas: {stats_left['Incompletas']}")
    print(f"   Taxa: {stats_left['Taxa (piscadas/min)']} piscadas/min")
    print(f"   Amplitude Mdia: {stats_left['Amplitude Mdia']}")
    print(f"   Vel. Fechamento Mdia: {stats_left['Vel. Fechamento Mdia']} EAR/s")
    print(f"   Vel. Abertura Mdia: {stats_left['Vel. Abertura Mdia']} EAR/s")
    print(f"   IBI Mdio: {ibi_left['IBI Medio (s)']}s")

    print(f"\n Metricas Avancadas:")
    print(f"   Piscadas Sincronizadas: {len(synchronized)}")
    print(f"   Assimetria Amplitude: {asymmetry['Assimetria Amplitude (%)']}%")
    print(f"   Indice de Fadiga: {fatigue['Indice Fadiga']}/100")
    print(f"   Score Saude Ocular: {health_score['Score Saude Ocular']}/100")
    print(f"\n{'='*60}")


def main():
    parser = argparse.ArgumentParser(
        description="Anlise completa de mtricas de piscadas a partir de CSV.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  # Bsico (FPS lido automaticamente do CSV)
  python analisar_metricas_completas.py video.csv

  # Forar tipo all_points
  python analisar_metricas_completas.py video_all_points.csv --tipo all_points

  # Override manual do FPS
  python analisar_metricas_completas.py video.csv --fps 60

  # Exportar como JSON
  python analisar_metricas_completas.py video.csv --saida resultado.json
        """
    )

    parser.add_argument(
        "csv_entrada",
        help="Caminho do arquivo CSV de entrada"
    )

    parser.add_argument(
        "--tipo",
        choices=['all_points', 'eyes_only'],
        default=None,
        help="Tipo de CSV (auto-detectado se no especificado)"
    )

    parser.add_argument(
        "--fps",
        type=float,
        default=None,
        help="FPS do vdeo (opcional - lido automaticamente da primeira linha do CSV)"
    )

    parser.add_argument(
        "--saida",
        default=None,
        help="Caminho do arquivo de sada (.xlsx ou .json). Padro: <entrada>_metricas.xlsx"
    )

    args = parser.parse_args()

    # Verificar se arquivo existe
    if not os.path.exists(args.csv_entrada):
        print(f" Arquivo no encontrado: {args.csv_entrada}")
        sys.exit(1)

    # Definir sada padro
    if args.saida is None:
        base = os.path.splitext(args.csv_entrada)[0]
        # Remover sufixo _all_points se existir para nome mais limpo
        if base.endswith('_all_points'):
            base = base[:-11]
        args.saida = f"{base}_metricas.xlsx"

    # Executar anlise
    analyze_complete(
        csv_path=args.csv_entrada,
        output_path=args.saida,
        fps_override=args.fps,
        csv_type_override=args.tipo
    )


if __name__ == "__main__":
    main()
