import pandas as pd
import numpy as np
import sys
import os
from scipy.spatial import distance
import argparse
from datetime import datetime

def calculate_ear(eye_points):
    """
    Calcula o Eye Aspect Ratio (EAR) dado os marcos do olho.
    EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
    """
    # Pontos verticais
    A = distance.euclidean(eye_points[1], eye_points[5])
    B = distance.euclidean(eye_points[2], eye_points[4])
    # Ponto horizontal
    C = distance.euclidean(eye_points[0], eye_points[3])
    
    if C == 0: return 0
    ear = (A + B) / (2.0 * C)
    return ear

def get_eye_points_from_row(row, side, csv_type):
    """
    Extrai coordenadas (x,y) dos 6 pontos chave do olho para cálculo do EAR.
    Retorna lista de tuplas [(x,y), ...]
    """
    points = []
    
    # Índices dos pontos chave no MediaPipe (padrão EAR de 6 pontos)
    # Ordem: Canto Esq, Sup1, Sup2, Canto Dir, Inf2, Inf1
    
    if csv_type == 'all_points':
        # Índices oficiais MediaPipe (468/478 points) para EAR
        # Right Eye: [33, 160, 158, 133, 153, 144]
        # Left Eye:  [362, 385, 387, 263, 373, 380]
        indices = {
            'right': [33, 160, 158, 133, 153, 144], 
            'left':  [362, 385, 387, 263, 373, 380]
        }
        
        current_indices = indices[side]
        for idx in current_indices:
            x = row.get(f'point_{idx}_x')
            y = row.get(f'point_{idx}_y')
            if pd.isna(x) or pd.isna(y): return None
            points.append((x, y))
            
    elif csv_type == 'eyes_only':
        # Mapeamento para o formato simplificado antigo (baseado na ordem salva)
        # O script antigo salva: upper (canto->meio->canto) e lower.
        # Precisamos adaptar. Vamos usar índices aproximados dos arrays salvos.
        # Right Upper: 1..7 (4 é o centro). Right Lower: 1..9 (5 é o centro)
        # Vamos pegar pontos que correspondem geometricamente ao EAR.
        
        if side == 'right':
            # P1(CantoEsq=33/Lower1/Upper?): Vamos usar right_lower_1 (33)
            # P4(CantoDir=133/Lower9): right_lower_9 (133)
            # P2(Sup1): right_upper_3 
            # P3(Sup2): right_upper_5
            # P5(Inf2): right_lower_6
            # P6(Inf1): right_lower_4
            cols = [
                ('right_lower_1_x', 'right_lower_1_y'), # P1
                ('right_upper_3_x', 'right_upper_3_y'), # P2
                ('right_upper_5_x', 'right_upper_5_y'), # P3
                ('right_lower_9_x', 'right_lower_9_y'), # P4
                ('right_lower_6_x', 'right_lower_6_y'), # P5
                ('right_lower_4_x', 'right_lower_4_y'), # P6
            ]
        else: # Left
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
            if pd.isna(val_x): return None
            points.append((val_x, val_y))
    
    return points

def analyze_blinks(csv_path, output_xlsx_path, fps=30):
    print(f"📊 Lendo arquivo: {csv_path}")
    
    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        print(f"❌ Erro ao ler CSV: {e}")
        return

    # 1. Detectar tipo de CSV
    if 'point_0_x' in df.columns:
        csv_type = 'all_points'
        print("ℹ️ Tipo detectado: Full Mesh (478 pontos)")
    elif 'right_upper_1_x' in df.columns:
        csv_type = 'eyes_only'
        print("ℹ️ Tipo detectado: Eyes Only")
    else:
        print("❌ Tipo de CSV desconhecido.")
        return

    # 2. Calcular EAR para cada frame
    print("🧮 Calculando EAR frame a frame...")
    ear_values = []
    
    for _, row in df.iterrows():
        right_pts = get_eye_points_from_row(row, 'right', csv_type)
        left_pts = get_eye_points_from_row(row, 'left', csv_type)
        
        if right_pts and left_pts:
            ear_right = calculate_ear(right_pts)
            ear_left = calculate_ear(left_pts)
            avg_ear = (ear_right + ear_left) / 2.0
            ear_values.append(avg_ear)
        else:
            ear_values.append(None) # Frame perdido/sem face

    df['EAR'] = ear_values
    
    # Preencher falhas (interpolação simples para frames perdidos curtos)
    df['EAR'] = df['EAR'].interpolate(method='linear', limit=3)
    
    # Suavização (opcional, ajuda a reduzir ruído)
    df['EAR_Smooth'] = df['EAR'].rolling(window=3, center=True).mean().fillna(df['EAR'])

    # 3. Detectar Eventos de Piscada
    # Parâmetros (podem precisar de ajuste fino dependendo da câmera)
    EAR_THRESHOLD = 0.22      # Abaixo disso, considera que começou a fechar
    EAR_COMPLETE_LIMIT = 0.16 # Abaixo disso, considera fechamento total (piscada completa)
    MIN_FRAMES = 2            # Duração mínima (filtra ruído rápido)
    
    blinks = []
    in_blink = False
    start_frame = 0
    min_ear_in_blink = 1.0
    
    print("🔎 Detectando eventos...")
    
    valid_ears = df['EAR_Smooth'].dropna()
    # Calcular baseline dinâmico (média dos 10% maiores valores = olhos bem abertos)
    if len(valid_ears) > 0:
        baseline_ear = np.percentile(valid_ears, 90)
        # Ajustar threshold relativo ao baseline
        EAR_THRESHOLD = baseline_ear * 0.75 # 75% do aberto = começa a fechar
        EAR_COMPLETE_LIMIT = baseline_ear * 0.50 # 50% do aberto = fechado
        print(f"ℹ️ Baseline EAR estimado: {baseline_ear:.3f}")
        print(f"ℹ️ Threshold Fechamento: {EAR_THRESHOLD:.3f}")
        print(f"ℹ️ Threshold Completa: {EAR_COMPLETE_LIMIT:.3f}")

    for i in range(len(df)):
        ear = df.loc[i, 'EAR_Smooth']
        if pd.isna(ear): continue
        
        if not in_blink:
            if ear < EAR_THRESHOLD:
                in_blink = True
                start_frame = i
                min_ear_in_blink = ear
        else:
            if ear < min_ear_in_blink:
                min_ear_in_blink = ear
                
            if ear >= EAR_THRESHOLD:
                # Fim da piscada
                end_frame = i
                duration_frames = end_frame - start_frame
                
                if duration_frames >= MIN_FRAMES:
                    # Classificar
                    category = "Completa" if min_ear_in_blink <= EAR_COMPLETE_LIMIT else "Incompleta"
                    
                    # Calcular tempos
                    start_time = start_frame / fps
                    end_time = end_frame / fps
                    
                    blink_data = {
                        'ID': len(blinks) + 1,
                        'Frame Inicio': start_frame,
                        'Frame Fim': end_frame,
                        'Tempo Inicio (s)': round(start_time, 3),
                        'Tempo Fim (s)': round(end_time, 3),
                        'Duracao (s)': round((end_frame - start_frame) / fps, 3),
                        'Duracao (frames)': duration_frames,
                        'EAR Minimo': round(min_ear_in_blink, 4),
                        'Classificacao': category,
                        'Minuto': int(start_time // 60) + 1
                    }
                    blinks.append(blink_data)
                
                in_blink = False
                min_ear_in_blink = 1.0

    # 4. Agregar Dados
    df_blinks = pd.DataFrame(blinks)
    
    if blinks:
        # Agrupamento por minuto
        report_per_minute = df_blinks.groupby('Minuto')['Classificacao'].value_counts().unstack(fill_value=0)
        
        # Totais
        total_piscadas = len(blinks)
        completas = len(df_blinks[df_blinks['Classificacao'] == 'Completa'])
        incompletas = len(df_blinks[df_blinks['Classificacao'] == 'Incompleta'])
        
        # Calculo de Frequência
        video_duration_minutes = (len(df) / fps) / 60
        freq_bpm = total_piscadas / video_duration_minutes if video_duration_minutes > 0 else 0
        
        summary_data = {
            'Métrica': [
                'Total de Piscadas',
                'Piscadas Completas', 
                'Piscadas Incompletas',
                'Duração Vídeo (min)',
                'Frequência Média (piscadas/min)',
                '% Completas'
            ],
            'Valor': [
                total_piscadas,
                completas,
                incompletas,
                round(video_duration_minutes, 2),
                round(freq_bpm, 1),
                f"{round((completas/total_piscadas)*100, 1) if total_piscadas > 0 else 0}%"
            ]
        }
        df_summary = pd.DataFrame(summary_data)
        
    else:
        print("⚠️ Nenhuma piscada detectada.")
        df_summary = pd.DataFrame({'Status': ['Nenhuma piscada detectada']})
        df_blinks = pd.DataFrame(columns=['ID', 'Frame Inicio', 'Frame Fim', 'Classificacao'])
        report_per_minute = pd.DataFrame()

    # 5. Salvar Excel com múltiplas abas
    try:
        with pd.ExcelWriter(output_xlsx_path, engine='openpyxl') as writer:
            df_summary.to_excel(writer, sheet_name='Resumo Geral', index=False)
            df_blinks.to_excel(writer, sheet_name='Detalhamento', index=False)
            if not report_per_minute.empty:
                report_per_minute.to_excel(writer, sheet_name='Por Minuto')
                
        print(f"✅ Relatório salvo com sucesso: {output_xlsx_path}")
        
    except Exception as e:
        print(f"❌ Erro ao salvar Excel. Verifique se o arquivo está aberto. Erro: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Analisa piscadas a partir de CSV de coordenadas faciais.")
    parser.add_argument("csv_entrada", help="Caminho do arquivo CSV")
    parser.add_argument("--saida", help="Caminho do arquivo Excel de saída (opcional)")
    parser.add_argument("--fps", type=float, default=30.0, help="FPS do vídeo original (padrão: 30)")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.csv_entrada):
        print(f"❌ Arquivo não encontrado: {args.csv_entrada}")
        sys.exit(1)
        
    output = args.saida
    if not output:
        output = os.path.splitext(args.csv_entrada)[0] + "_relatorio_piscadas.xlsx"
        
    analyze_blinks(args.csv_entrada, output, args.fps)
