#!/usr/bin/env python3
"""
Script de Análise em Lote de Métricas de Piscadas
=================================================
Analisa todos os CSVs de uma pasta, podendo filtrar por tipo (all_points ou eyes_only).

Uso:
    python analisar_pasta_metricas.py [pasta] [--tipo all_points|eyes_only|todos]

    pasta: Diretório com os CSVs (padrão: diretório atual)

    --tipo: Filtro de tipo de CSV
            all_points: Apenas CSVs com sufixo _all_points (478 pontos)
            eyes_only:  Apenas CSVs sem sufixo _all_points (32 pontos)
            todos:      Todos os CSVs (padrão)

Exemplos:
    python analisar_pasta_metricas.py
    python analisar_pasta_metricas.py ./videos --tipo eyes_only
    python analisar_pasta_metricas.py C:\\dados --tipo all_points
"""

import os
import sys
import glob
import argparse
import pandas as pd
from datetime import datetime

# Importar funções do script principal
from analisar_metricas_completas import (
    analyze_complete,
    read_fps_from_csv,
    detect_csv_type,
    calculate_ear_series,
    smooth_ear_series,
    detect_blinks_single_eye,
    calculate_summary_stats
)


def find_csv_files(folder, tipo_filtro):
    """
    Encontra arquivos CSV na pasta baseado no filtro de tipo.

    Args:
        folder: Caminho da pasta
        tipo_filtro: 'all_points', 'eyes_only', ou 'todos'

    Returns:
        Lista de caminhos de arquivos CSV
    """
    all_csvs = glob.glob(os.path.join(folder, "*.csv"))

    if tipo_filtro == 'all_points':
        # Apenas arquivos que terminam com _all_points.csv
        return [f for f in all_csvs if f.endswith('_all_points.csv')]

    elif tipo_filtro == 'eyes_only':
        # Apenas arquivos que NÃO terminam com _all_points.csv
        return [f for f in all_csvs if not f.endswith('_all_points.csv')]

    else:  # todos
        return all_csvs


def analyze_folder(folder, tipo_filtro, output_folder=None):
    """
    Analisa todos os CSVs de uma pasta e gera relatório consolidado.

    Args:
        folder: Pasta com os CSVs
        tipo_filtro: 'all_points', 'eyes_only', ou 'todos'
        output_folder: Pasta de saída (padrão: mesma pasta)
    """
    print(f"{'='*70}")
    print(f"ANÁLISE EM LOTE DE MÉTRICAS DE PISCADAS")
    print(f"{'='*70}")
    print(f"\n📂 Pasta: {os.path.abspath(folder)}")
    print(f"🔍 Filtro: {tipo_filtro}")

    # Encontrar arquivos
    csv_files = find_csv_files(folder, tipo_filtro)

    if not csv_files:
        print(f"\n❌ Nenhum arquivo CSV encontrado com o filtro '{tipo_filtro}'")
        return

    print(f"📄 Arquivos encontrados: {len(csv_files)}")

    # Pasta de saída
    if output_folder is None:
        output_folder = folder

    os.makedirs(output_folder, exist_ok=True)

    # Processar cada arquivo
    all_summaries = []
    all_blinks = []
    processed = 0
    errors = []

    for i, csv_path in enumerate(csv_files, 1):
        filename = os.path.basename(csv_path)
        print(f"\n{'─'*70}")
        print(f"[{i}/{len(csv_files)}] Processando: {filename}")

        try:
            # Gerar saída individual
            base = os.path.splitext(csv_path)[0]
            if base.endswith('_all_points'):
                base = base[:-11]
            output_xlsx = f"{base}_metricas.xlsx"

            # Analisar arquivo
            result = analyze_single_for_batch(csv_path, filename)

            if result:
                all_summaries.append(result['summary'])
                all_blinks.extend(result['blinks'])
                processed += 1

                # Salvar relatório individual
                analyze_complete(
                    csv_path=csv_path,
                    output_path=output_xlsx,
                    fps_override=None,
                    csv_type_override=None
                )
            else:
                errors.append((filename, "Dados insuficientes"))

        except Exception as e:
            errors.append((filename, str(e)))
            print(f"   ❌ Erro: {e}")

    # Gerar relatório consolidado
    print(f"\n{'='*70}")
    print("GERANDO RELATÓRIO CONSOLIDADO")
    print(f"{'='*70}")

    if all_summaries:
        # DataFrame de resumo
        df_summary = pd.DataFrame(all_summaries)

        # DataFrame de todas as piscadas
        df_all_blinks = pd.DataFrame(all_blinks) if all_blinks else pd.DataFrame()

        # Estatísticas gerais
        total_blinks_right = df_summary['Piscadas Direito'].sum()
        total_blinks_left = df_summary['Piscadas Esquerdo'].sum()
        total_complete_right = df_summary['Completas Direito'].sum()
        total_complete_left = df_summary['Completas Esquerdo'].sum()

        general_stats = {
            'Métrica': [
                'Total de Arquivos Processados',
                'Total de Arquivos com Erro',
                'Total Piscadas (Direito)',
                'Total Piscadas (Esquerdo)',
                'Total Completas (Direito)',
                'Total Completas (Esquerdo)',
                '% Completas (Direito)',
                '% Completas (Esquerdo)',
                'Média Piscadas/min (Direito)',
                'Média Piscadas/min (Esquerdo)',
                'Data da Análise'
            ],
            'Valor': [
                processed,
                len(errors),
                int(total_blinks_right),
                int(total_blinks_left),
                int(total_complete_right),
                int(total_complete_left),
                f"{(total_complete_right/total_blinks_right*100):.1f}%" if total_blinks_right > 0 else "N/A",
                f"{(total_complete_left/total_blinks_left*100):.1f}%" if total_blinks_left > 0 else "N/A",
                f"{df_summary['Taxa Direito'].mean():.1f}" if 'Taxa Direito' in df_summary else "N/A",
                f"{df_summary['Taxa Esquerdo'].mean():.1f}" if 'Taxa Esquerdo' in df_summary else "N/A",
                datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            ]
        }
        df_general = pd.DataFrame(general_stats)

        # Erros
        df_errors = pd.DataFrame(errors, columns=['Arquivo', 'Erro']) if errors else pd.DataFrame()

        # Salvar relatório consolidado
        consolidated_path = os.path.join(output_folder, f"Relatorio_Consolidado_{tipo_filtro}.xlsx")

        try:
            with pd.ExcelWriter(consolidated_path, engine='openpyxl') as writer:
                df_general.to_excel(writer, sheet_name='Resumo Geral', index=False)
                df_summary.to_excel(writer, sheet_name='Por Arquivo', index=False)

                if not df_all_blinks.empty:
                    df_all_blinks.to_excel(writer, sheet_name='Todas Piscadas', index=False)

                if not df_errors.empty:
                    df_errors.to_excel(writer, sheet_name='Erros', index=False)

            print(f"\n✅ Relatório consolidado salvo: {consolidated_path}")

        except Exception as e:
            print(f"\n❌ Erro ao salvar relatório consolidado: {e}")

    # Resumo final
    print(f"\n{'='*70}")
    print("RESUMO FINAL")
    print(f"{'='*70}")
    print(f"✅ Processados com sucesso: {processed}/{len(csv_files)}")
    if errors:
        print(f"❌ Com erro: {len(errors)}")
        for filename, error in errors:
            print(f"   - {filename}: {error}")


def analyze_single_for_batch(csv_path, filename):
    """
    Analisa um único CSV e retorna dados para consolidação.

    Returns:
        Dict com 'summary' e 'blinks' ou None se falhar
    """
    import numpy as np

    # Ler FPS
    fps = read_fps_from_csv(csv_path)
    if fps is None:
        fps = 30.0

    # Ler CSV
    try:
        df = pd.read_csv(csv_path, comment='#')
    except:
        return None

    # Detectar tipo
    csv_type = detect_csv_type(df)
    if csv_type is None:
        return None

    # Calcular EAR
    ear_right_raw, ear_left_raw = calculate_ear_series(df, csv_type)
    ear_right = smooth_ear_series(ear_right_raw)
    ear_left = smooth_ear_series(ear_left_raw)

    # Baselines
    valid_right = ear_right[~np.isnan(ear_right)]
    valid_left = ear_left[~np.isnan(ear_left)]

    if len(valid_right) == 0 or len(valid_left) == 0:
        return None

    baseline_right = np.percentile(valid_right, 90)
    baseline_left = np.percentile(valid_left, 90)

    # Detectar piscadas
    blinks_right = detect_blinks_single_eye(ear_right, fps, baseline_right, 'Direito')
    blinks_left = detect_blinks_single_eye(ear_left, fps, baseline_left, 'Esquerdo')

    # Calcular estatísticas
    total_frames = len(df)
    stats_right = calculate_summary_stats(blinks_right, fps, total_frames, 'Direito', baseline_right)
    stats_left = calculate_summary_stats(blinks_left, fps, total_frames, 'Esquerdo', baseline_left)

    # Resumo para consolidação
    video_duration_min = (total_frames / fps) / 60

    summary = {
        'Arquivo': filename,
        'Tipo CSV': csv_type,
        'FPS': fps,
        'Duracao (min)': round(video_duration_min, 2),
        'Total Frames': total_frames,
        'Piscadas Direito': stats_right['Total Piscadas'],
        'Completas Direito': stats_right['Completas'],
        'Incompletas Direito': stats_right['Incompletas'],
        '% Completas Direito': stats_right['% Completas'],
        'Taxa Direito': stats_right['Taxa (piscadas/min)'],
        'Amplitude Media Direito': stats_right['Amplitude Média'],
        'Vel Fech Media Direito': stats_right['Vel. Fechamento Média'],
        'Vel Abert Media Direito': stats_right['Vel. Abertura Média'],
        'Piscadas Esquerdo': stats_left['Total Piscadas'],
        'Completas Esquerdo': stats_left['Completas'],
        'Incompletas Esquerdo': stats_left['Incompletas'],
        '% Completas Esquerdo': stats_left['% Completas'],
        'Taxa Esquerdo': stats_left['Taxa (piscadas/min)'],
        'Amplitude Media Esquerdo': stats_left['Amplitude Média'],
        'Vel Fech Media Esquerdo': stats_left['Vel. Fechamento Média'],
        'Vel Abert Media Esquerdo': stats_left['Vel. Abertura Média'],
        'Baseline EAR Direito': stats_right['Baseline EAR'],
        'Baseline EAR Esquerdo': stats_left['Baseline EAR']
    }

    # Adicionar arquivo às piscadas
    all_blinks = []
    for b in blinks_right:
        b_copy = b.copy()
        b_copy['Arquivo'] = filename
        all_blinks.append(b_copy)
    for b in blinks_left:
        b_copy = b.copy()
        b_copy['Arquivo'] = filename
        all_blinks.append(b_copy)

    print(f"   ✅ Direito: {stats_right['Total Piscadas']} piscadas | Esquerdo: {stats_left['Total Piscadas']} piscadas")

    return {
        'summary': summary,
        'blinks': all_blinks
    }


def main():
    parser = argparse.ArgumentParser(
        description="Análise em lote de métricas de piscadas para todos os CSVs de uma pasta.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  # Analisar todos os CSVs do diretório atual
  python analisar_pasta_metricas.py

  # Analisar apenas CSVs eyes_only de uma pasta específica
  python analisar_pasta_metricas.py ./videos --tipo eyes_only

  # Analisar apenas CSVs all_points
  python analisar_pasta_metricas.py ./dados --tipo all_points

  # Especificar pasta de saída
  python analisar_pasta_metricas.py ./videos --saida ./resultados
        """
    )

    parser.add_argument(
        "pasta",
        nargs='?',
        default='.',
        help="Pasta com os arquivos CSV (padrão: diretório atual)"
    )

    parser.add_argument(
        "--tipo",
        choices=['all_points', 'eyes_only', 'todos'],
        default='todos',
        help="Filtro de tipo de CSV (padrão: todos)"
    )

    parser.add_argument(
        "--saida",
        default=None,
        help="Pasta de saída para os relatórios (padrão: mesma pasta de entrada)"
    )

    args = parser.parse_args()

    # Verificar se pasta existe
    if not os.path.isdir(args.pasta):
        print(f"❌ Pasta não encontrada: {args.pasta}")
        sys.exit(1)

    # Executar análise
    analyze_folder(
        folder=args.pasta,
        tipo_filtro=args.tipo,
        output_folder=args.saida
    )


if __name__ == "__main__":
    main()
