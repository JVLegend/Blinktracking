import pandas as pd
import numpy as np
import sys
import os
from scipy.spatial import distance
import argparse
from tqdm import tqdm

def calculate_ear(eye_points):
    """
    Calcula o Eye Aspect Ratio (EAR).
    EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
    """
    if not eye_points: return 0
    A = distance.euclidean(eye_points[1], eye_points[5])
    B = distance.euclidean(eye_points[2], eye_points[4])
    C = distance.euclidean(eye_points[0], eye_points[3])
    
    if C == 0: return 0
    ear = (A + B) / (2.0 * C)
    return ear

def get_eye_points_from_row(row, side):
    """
    Extrai coordenadas (x,y) dos 6 pontos chave do olho para cálculo do EAR.
    Focado no formato 'eyes_only' (padrão antigo/simplificado).
    """
    points = []
    
    # Mapeamento para o formato simplificado
    if side == 'right':
        cols = [
            ('right_lower_1_x', 'right_lower_1_y'), # P1 (Canto)
            ('right_upper_3_x', 'right_upper_3_y'), # P2 
            ('right_upper_5_x', 'right_upper_5_y'), # P3 
            ('right_lower_9_x', 'right_lower_9_y'), # P4 (Canto)
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
        # Se não encontrar a coluna ou valor for nulo, falha
        if val_x is None or val_y is None or pd.isna(val_x): return None
        points.append((val_x, val_y))
    
    return points

def analyze_single_csv(csv_path, default_fps=30):
    """Processa um único CSV e retorna um dicionário com o resumo e um DataFrame com os detalhes."""
    fps = default_fps
    
    # Tentar ler metadado FPS da primeira linha
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            first_line = f.readline()
            if first_line.startswith('# FPS:'):
                val = float(first_line.split(':')[1].strip())
                if val > 0:
                    fps = val
    except:
        pass # Mantém o default_fps se falhar

    try:
        df = pd.read_csv(csv_path, comment='#')
    except:
        return None, None

    # Validação rápida de colunas
    if 'right_upper_1_x' not in df.columns:
        return None, None  # Ignora arquivos que não sejam do formato esperado

    # Calcular EAR
    ear_values = []
    for _, row in df.iterrows():
        right_pts = get_eye_points_from_row(row, 'right')
        left_pts = get_eye_points_from_row(row, 'left')
        
        if right_pts and left_pts:
            ear_right = calculate_ear(right_pts)
            ear_left = calculate_ear(left_pts)
            ear_values.append((ear_right + ear_left) / 2.0)
        else:
            ear_values.append(None)

    df['EAR'] = ear_values
    df['EAR'] = df['EAR'].interpolate(method='linear', limit=3)
    df['EAR_Smooth'] = df['EAR'].rolling(window=3, center=True).mean().fillna(df['EAR'])

    # Detecção de Piscadas
    valid_ears = df['EAR_Smooth'].dropna()
    if len(valid_ears) == 0: return None, None
    
    baseline_ear = np.percentile(valid_ears, 90)
    EAR_THRESHOLD = baseline_ear * 0.75
    EAR_COMPLETE_LIMIT = baseline_ear * 0.50
    MIN_FRAMES = 2
    
    blinks = []
    in_blink = False
    start_frame = 0
    min_ear_in_blink = 1.0

    MIN_INTER_BLINK_TIME_SEC = 0.5  # Periodo Refratário 500ms
    last_blink_end_frame = -9999

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
                end_frame = i
                duration_frames = end_frame - start_frame
                
                # Critério 1: Duração Mínima
                if duration_frames >= MIN_FRAMES:
                    
                    # Critério 2: Período Refratário (Fisiológico)
                    time_since_last = (start_frame - last_blink_end_frame) / fps
                    
                    if time_since_last >= MIN_INTER_BLINK_TIME_SEC:
                        category = "Completa" if min_ear_in_blink <= EAR_COMPLETE_LIMIT else "Incompleta"
                        start_time = start_frame / fps
                        
                        blinks.append({
                            'Arquivo': os.path.basename(csv_path),
                            'Frame Inicio': start_frame,
                            'Frame Fim': end_frame,
                            'Tempo Inicio (s)': round(start_time, 3),
                            'Duracao (s)': round((end_frame - start_frame) / fps, 3),
                            'EAR Minimo': round(min_ear_in_blink, 3),
                            'Classificacao': category
                        })
                        last_blink_end_frame = end_frame # Atualiza último evento válido

                in_blink = False
                min_ear_in_blink = 1.0

    # Resumo do Vídeo
    total = len(blinks)
    completas = len([b for b in blinks if b['Classificacao'] == 'Completa'])
    incompletas = len([b for b in blinks if b['Classificacao'] == 'Incompleta'])
    duration_min = (len(df) / fps) / 60
    
    summary = {
        'Arquivo': os.path.basename(csv_path),
        'Total Piscadas': total,
        'Completas': completas,
        'Incompletas': incompletas,
        '% Completas': round((completas/total)*100, 1) if total > 0 else 0,
        'Frequência (ap/min)': round(total / duration_min, 2) if duration_min > 0 else 0,
        'Duração Vídeo (min)': round(duration_min, 2)
    }
    
    return summary, blinks

def process_folder_blinks(folder_path, fps=30):
    print(f"\n📂 Processando pasta: {folder_path}")
    print("ℹ️ Ignorando arquivos com '_all_points' no nome.\n")
    
    all_summaries = []
    all_blinks_detailed = []
    
    csv_files = [f for f in os.listdir(folder_path) if f.lower().endswith('.csv')]
    # Filtro: Ignorar 'all_points'
    csv_files = [f for f in csv_files if '_all_points' not in f]
    
    if not csv_files:
        print("❌ Nenhum arquivo CSV válido encontrado.")
        return

    output_file = os.path.join(folder_path, "Relatorio_Consolidado_Piscadas.xlsx")

    with tqdm(total=len(csv_files), desc="Processando") as pbar:
        for csv_file in csv_files:
            full_path = os.path.join(folder_path, csv_file)
            summary, blinks = analyze_single_csv(full_path, fps)
            
            if summary:
                all_summaries.append(summary)
                if blinks:
                    all_blinks_detailed.extend(blinks)
            
            pbar.update(1)

    print("\n💾 Salvando relatório unificado...")
    
    if all_summaries:
        df_summary = pd.DataFrame(all_summaries)
        # Reordenar colunas
        cols = ['Arquivo', 'Total Piscadas', 'Frequência (ap/min)', 'Completas', 'Incompletas', '% Completas', 'Duração Vídeo (min)']
        df_summary = df_summary[cols]
        
        df_details = pd.DataFrame(all_blinks_detailed)
        
        try:
            with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
                df_summary.to_excel(writer, sheet_name='Resumo Consolidado', index=False)
                if not df_details.empty:
                    df_details.to_excel(writer, sheet_name='Todas as Piscadas (Detalhado)', index=False)
            
            # Ajustar largura das colunas (estético)
            print(f"✅ Relatório criado com sucesso: {output_file}")
            print(f"📊 Total de vídeos analisados: {len(df_summary)}")
        except Exception as e:
            print(f"❌ Erro ao salvar Excel: {e}")
    else:
        print("⚠️ Nenhum dado foi processado com sucesso.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python analisar_pasta_piscadas.py <caminho_da_pasta> [fps]")
        sys.exit(1)
        
    folder = sys.argv[1]
    fps_val = float(sys.argv[2]) if len(sys.argv) > 2 else 30.0
    
    if os.path.exists(folder):
        process_folder_blinks(folder, fps_val)
    else:
        print("Pasta não encontrada.")
