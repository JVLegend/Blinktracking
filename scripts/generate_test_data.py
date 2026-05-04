#!/usr/bin/env python3
"""
Gerador de dados sinteticos para teste do BlinkTracking
Gera CSV com pontos de olhos simulando piscadas realistas
"""

import numpy as np
import pandas as pd
import os

def generate_synthetic_blink_data(
    duration_sec=30,
    fps=30,
    n_blinks=20,
    output_path='test_data.csv',
    seed=42
):
    """
    Gera dados sinteticos de piscadas para teste.
    
    Simula:
    - Olho aberto: EAR ~0.28-0.32
    - Piscada completa: EAR cai ate ~0.08-0.12
    - Piscada incompleta: EAR cai ate ~0.15-0.20
    - Ruido leve nos pontos
    """
    np.random.seed(seed)
    
    total_frames = duration_sec * fps
    times = np.arange(total_frames) / fps
    
    # Baseline EAR (olho aberto)
    baseline_ear = 0.30
    
    # Gerar momentos das piscadas (distribuidos ao longo do video)
    blink_times = np.sort(np.random.uniform(2, duration_sec - 2, n_blinks))
    
    # Classificar como completa (70%) ou incompleta (30%)
    blink_types = np.random.choice(['completa', 'incompleta'], n_blinks, p=[0.7, 0.3])
    
    # EAR para cada frame
    ear_right = np.ones(total_frames) * baseline_ear
    ear_left = np.ones(total_frames) * baseline_ear
    
    # Adicionar ruido de fundo
    ear_right += np.random.normal(0, 0.01, total_frames)
    ear_left += np.random.normal(0, 0.01, total_frames)
    
    for i, (bt, btype) in enumerate(zip(blink_times, blink_types)):
        # Duracao da piscada: 150-350ms
        duration = np.random.uniform(0.15, 0.35)
        
        # Amplitude minima
        if btype == 'completa':
            min_ear = np.random.uniform(0.08, 0.12)
        else:
            min_ear = np.random.uniform(0.15, 0.20)
        
        # Frame de inicio e fim
        start_frame = int(bt * fps)
        end_frame = int((bt + duration) * fps)
        
        # Perfil temporal da piscada (fechamento rapido, abertura lenta)
        n_frames_blink = end_frame - start_frame
        if n_frames_blink < 2:
            continue
            
        t_blink = np.linspace(0, 1, n_frames_blink)
        # Fechamento rapido (primeiros 30%), abertura lenta (ultimos 70%)
        profile = np.piecewise(
            t_blink,
            [t_blink < 0.3, t_blink >= 0.3],
            [
                lambda t: baseline_ear - (baseline_ear - min_ear) * (t / 0.3),
                lambda t: min_ear + (baseline_ear - min_ear) * ((t - 0.3) / 0.7)
            ]
        )
        
        # Aplicar ao EAR
        if end_frame < total_frames:
            ear_right[start_frame:end_frame] = profile
            ear_left[start_frame:end_frame] = profile
    
    # Adicionar algumas piscadas assimetricas (apenas um olho)
    n_asymmetric = 3
    for _ in range(n_asymmetric):
        bt = np.random.uniform(2, duration_sec - 2)
        duration = np.random.uniform(0.15, 0.25)
        min_ear = np.random.uniform(0.10, 0.15)
        
        start_frame = int(bt * fps)
        end_frame = int((bt + duration) * fps)
        n_frames_blink = end_frame - start_frame
        
        if n_frames_blink < 2 or end_frame >= total_frames:
            continue
            
        t_blink = np.linspace(0, 1, n_frames_blink)
        profile = np.piecewise(
            t_blink,
            [t_blink < 0.3, t_blink >= 0.3],
            [
                lambda t: baseline_ear - (baseline_ear - min_ear) * (t / 0.3),
                lambda t: min_ear + (baseline_ear - min_ear) * ((t - 0.3) / 0.7)
            ]
        )
        
        # Apenas olho direito
        ear_right[start_frame:end_frame] = profile
    
    # Converter EAR para coordenadas dos pontos
    # EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
    # Vamos manter |p1-p4| constante (largura do olho) e variar distancias verticais
    
    eye_width = 50  # pixels (distancia entre cantos)
    
    data = {
        'frame': range(total_frames),
        'method': ['mediapipe'] * total_frames,
    }
    
    # Para cada olho, gerar 16 pontos (7 superior + 9 inferior)
    for side, ear_series in [('right', ear_right), ('left', ear_left)]:
        # Cantos do olho (fixos)
        left_corner_x = 100 if side == 'right' else 300
        left_corner_y = 150
        right_corner_x = left_corner_x + eye_width
        right_corner_y = 150
        
        # Centro do olho
        center_x = (left_corner_x + right_corner_x) / 2
        
        # Altura da palpebra baseada no EAR
        # EAR = (vert1 + vert2) / (2 * horiz)
        # vert = EAR * 2 * horiz / 2 = EAR * horiz
        eyelid_height = ear_series * eye_width
        
        # Gerar pontos superiores
        for i in range(1, 8):
            t = (i - 1) / 6  # 0 a 1
            x = left_corner_x + t * eye_width + np.random.normal(0, 1, total_frames)
            y = left_corner_y - eyelid_height * np.sin(np.pi * t) + np.random.normal(0, 1, total_frames)
            data[f'{side}_upper_{i}_x'] = x.astype(int)
            data[f'{side}_upper_{i}_y'] = y.astype(int)
        
        # Gerar pontos inferiores
        for i in range(1, 10):
            t = (i - 1) / 8  # 0 a 1
            x = left_corner_x + t * eye_width + np.random.normal(0, 1, total_frames)
            y = left_corner_y + eyelid_height * 0.3 * np.sin(np.pi * t) + np.random.normal(0, 1, total_frames)
            data[f'{side}_lower_{i}_x'] = x.astype(int)
            data[f'{side}_lower_{i}_y'] = y.astype(int)
    
    # Criar DataFrame e salvar
    df = pd.DataFrame(data)
    
    # Adicionar metadados de FPS
    with open(output_path, 'w', newline='') as f:
        f.write(f"# FPS: {fps:.2f}\n")
        df.to_csv(f, index=False)
    
    print(f"Dados sinteticos gerados: {output_path}")
    print(f"  Duracao: {duration_sec}s ({total_frames} frames)")
    print(f"  Piscadas simuladas: {n_blinks} ({np.sum(blink_types == 'completa')} completas, {np.sum(blink_types == 'incompleta')} incompletas)")
    print(f"  Piscadas assimetricas: {n_asymmetric}")
    print(f"  EAR baseline: {baseline_ear:.2f}")
    
    return output_path

if __name__ == "__main__":
    import sys
    
    output = sys.argv[1] if len(sys.argv) > 1 else "test_data.csv"
    generate_synthetic_blink_data(output_path=output)
    print(f"\nPara testar: python scripts/analisar_metricas_completas.py {output}")
