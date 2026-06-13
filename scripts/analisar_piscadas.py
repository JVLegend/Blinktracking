import pandas as pd
import numpy as np
import sys
import os
import argparse
from datetime import datetime
from blinktracking.eye_metrics import (
    calculate_ear,
    calculate_ear_series,
    detect_blinks_single_eye,
    detect_csv_type,
    get_eye_points_from_row,
    smooth_ear_series,
)

def analyze_blinks(csv_path, output_xlsx_path, fps=30):
    print(f"📊 Lendo arquivo: {csv_path}")
    
    # 0. Tentar detectar FPS do Metadata
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            first_line = f.readline()
            if first_line.startswith('# FPS:'):
                val = float(first_line.split(':')[1].strip())
                if val > 0:
                    fps = val
                    print(f"ℹ️ FPS detectado via metadata: {fps}")
    except:
        pass

    try:
        df = pd.read_csv(csv_path, comment='#')
    except Exception as e:
        print(f"❌ Erro ao ler CSV: {e}")
        return

    # 1. Detectar tipo de CSV
    csv_type = detect_csv_type(df)
    if not csv_type:
        print("❌ Tipo de CSV desconhecido.")
        return
    print(f"ℹ️ Tipo detectado: {'Full Mesh (478 pontos)' if csv_type == 'all_points' else 'Eyes Only'}")

    # 2. Calcular EAR para cada frame
    print("🧮 Calculando EAR vetorizado...")
    ear_right, ear_left = calculate_ear_series(df, csv_type)
    df['EAR'] = np.nanmean(np.vstack([ear_right, ear_left]), axis=0)
    
    # Preencher falhas (interpolação simples para frames perdidos curtos)
    df['EAR_Smooth'] = smooth_ear_series(df['EAR'].values)

    # 3. Detectar Eventos de Piscada
    # Parâmetros (podem precisar de ajuste fino dependendo da câmera)
    EAR_THRESHOLD = 0.22      # Abaixo disso, considera que começou a fechar
    EAR_COMPLETE_LIMIT = 0.16 # Abaixo disso, considera fechamento total (piscada completa)
    MIN_FRAMES = 2            # Duração mínima (filtra ruído rápido)
    
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

    blinks = detect_blinks_single_eye(df['EAR_Smooth'].values, fps, baseline_ear, 'Ambos')

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
