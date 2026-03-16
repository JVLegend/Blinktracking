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
    Calcula sries de EAR para olho direito, esquerdo e mdia.

    Returns:
        Tuple de (ear_right, ear_left, ear_avg) como arrays numpy
    """
    ear_right = []
    ear_left = []

    for _, row in df.iterrows():
        right_pts = get_eye_points_from_row(row, 'right', csv_type)
        left_pts = get_eye_points_from_row(row, 'left', csv_type)

        if right_pts:
            ear_right.append(calculate_ear(right_pts))
        else:
            ear_right.append(None)

        if left_pts:
            ear_left.append(calculate_ear(left_pts))
        else:
            ear_left.append(None)

    return np.array(ear_right, dtype=float), np.array(ear_left, dtype=float)


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
    Detecta piscadas em uma srie EAR de um nico olho.

    Args:
        ear_smooth: Array de valores EAR suavizados
        fps: Frames por segundo
        baseline_ear: Valor de referncia EAR (olho aberto)
        eye_name: 'Direito' ou 'Esquerdo' para identificao

    Returns:
        Lista de dicionrios com dados de cada piscada
    """
    # Thresholds dinmicos baseados no baseline
    EAR_THRESHOLD = baseline_ear * 0.75      # 75% = incio do fechamento
    EAR_COMPLETE_LIMIT = baseline_ear * 0.50  # 50% = fechamento completo
    MIN_FRAMES = 2
    MIN_INTER_BLINK_TIME_SEC = 0.5

    blinks = []
    in_blink = False
    start_frame = 0
    min_ear_in_blink = 1.0
    min_ear_frame_idx = 0
    last_blink_end_frame = -9999

    for i in range(len(ear_smooth)):
        ear = ear_smooth[i]
        if np.isnan(ear):
            continue

        if not in_blink:
            if ear < EAR_THRESHOLD:
                in_blink = True
                start_frame = i
                min_ear_in_blink = ear
                min_ear_frame_idx = i
        else:
            if ear < min_ear_in_blink:
                min_ear_in_blink = ear
                min_ear_frame_idx = i

            if ear >= EAR_THRESHOLD:
                # Fim da piscada
                end_frame = i
                duration_frames = end_frame - start_frame

                if duration_frames >= MIN_FRAMES:
                    time_since_last = (start_frame - last_blink_end_frame) / fps

                    if time_since_last >= MIN_INTER_BLINK_TIME_SEC:
                        # Classificar
                        category = "Completa" if min_ear_in_blink <= EAR_COMPLETE_LIMIT else "Incompleta"

                        # Calcular tempos e cinemtica
                        start_time = start_frame / fps
                        end_time = end_frame / fps
                        duration_sec = (end_frame - start_frame) / fps

                        # Amplitude = diferena entre baseline e mnimo
                        amplitude = baseline_ear - min_ear_in_blink

                        # Fase de fechamento: do incio at o mnimo
                        closing_frames = min_ear_frame_idx - start_frame
                        closing_duration = closing_frames / fps if closing_frames > 0 else 0.001

                        # Fase de abertura: do mnimo at o fim
                        opening_frames = end_frame - min_ear_frame_idx
                        opening_duration = opening_frames / fps if opening_frames > 0 else 0.001

                        # Velocidades (EAR/segundo)
                        closing_speed = amplitude / closing_duration if closing_duration > 0 else 0
                        opening_speed = amplitude / opening_duration if opening_duration > 0 else 0

                        # RBA - Relative Blink Amplitude (%)
                        rba = (amplitude / baseline_ear) * 100 if baseline_ear > 0 else 0

                        blink_data = {
                            'ID': len(blinks) + 1,
                            'Olho': eye_name,
                            'Frame Inicio': start_frame,
                            'Frame Minimo': min_ear_frame_idx,
                            'Frame Fim': end_frame,
                            'Tempo Inicio (s)': round(start_time, 3),
                            'Tempo Fim (s)': round(end_time, 3),
                            'Duracao (s)': round(duration_sec, 3),
                            'Duracao (frames)': duration_frames,
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
                        }
                        blinks.append(blink_data)
                        last_blink_end_frame = end_frame

                in_blink = False
                min_ear_in_blink = 1.0

    return blinks


def find_synchronized_blinks(blinks_right, blinks_left, fps, tolerance_frames=5):
    """
    Identifica piscadas sincronizadas (binoculares) entre os dois olhos.

    Args:
        blinks_right: Lista de piscadas do olho direito
        blinks_left: Lista de piscadas do olho esquerdo
        fps: Frames por segundo
        tolerance_frames: Tolerncia em frames para considerar sincronizado

    Returns:
        Lista de tuplas (blink_right, blink_left) sincronizadas
    """
    synchronized = []
    used_left = set()

    for br in blinks_right:
        for i, bl in enumerate(blinks_left):
            if i in used_left:
                continue

            # Verifica sobreposio temporal
            start_diff = abs(br['Frame Inicio'] - bl['Frame Inicio'])

            if start_diff <= tolerance_frames:
                synchronized.append((br, bl))
                used_left.add(i)
                break

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

    # Estatsticas combinadas
    video_duration_min = (total_frames / fps) / 60
    total_blinks = len(blinks_right) + len(blinks_left)

    stats_combined = {
        'Durao do Vdeo (s)': round(total_frames / fps, 2),
        'Durao do Vdeo (min)': round(video_duration_min, 2),
        'FPS': fps,
        'Total de Frames': total_frames,
        'Tipo CSV': csv_type,
        'Piscadas Sincronizadas': len(synchronized)
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
                'direito': stats_right,
                'esquerdo': stats_left,
                'piscadas_sincronizadas': len(synchronized)
            },
            'piscadas_direito': blinks_right,
            'piscadas_esquerdo': blinks_left,
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

                # Resumo por olho
                summary_df.to_excel(writer, sheet_name='Resumo por Olho', index=False)

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

    print(f"\n Olho Esquerdo:")
    print(f"   Total: {stats_left['Total Piscadas']} piscadas")
    print(f"   Completas: {stats_left['Completas']} ({stats_left['% Completas']}%)")
    print(f"   Incompletas: {stats_left['Incompletas']}")
    print(f"   Taxa: {stats_left['Taxa (piscadas/min)']} piscadas/min")
    print(f"   Amplitude Mdia: {stats_left['Amplitude Mdia']}")
    print(f"   Vel. Fechamento Mdia: {stats_left['Vel. Fechamento Mdia']} EAR/s")
    print(f"   Vel. Abertura Mdia: {stats_left['Vel. Abertura Mdia']} EAR/s")

    print(f"\n Piscadas Sincronizadas: {len(synchronized)}")
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
