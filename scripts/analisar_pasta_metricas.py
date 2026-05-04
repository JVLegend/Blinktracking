#!/usr/bin/env python3
"""
Script de Analise em Lote de Metricas de Piscadas
=================================================
Analisa todos os CSVs de uma pasta, podendo filtrar por tipo (all_points ou eyes_only).
OTIMIZADO: Processamento paralelo e novas metricas avancadas.

Uso:
    python analisar_pasta_metricas.py [pasta] [--tipo all_points|eyes_only|todos] [--sequential]

    pasta: Diretorio com os CSVs (padrao: diretorio atual)

    --tipo: Filtro de tipo de CSV
            all_points: Apenas CSVs com sufixo _all_points (478 pontos)
            eyes_only:  Apenas CSVs sem sufixo _all_points (32 pontos)
            todos:      Todos os CSVs (padrao)

    --sequential: Forcar processamento sequencial (padrao: paralelo)

Novas metricas incluidas:
    - IBI (Inter-Blink Interval) com estatisticas
    - Deteccao de bursts (clusters de piscadas)
    - Assimetria entre olhos
    - Indice de fadiga
    - Percentis de velocidade (P10, P50, P90)
    - Latencia pos-piscada
    - Score composto de saude ocular

Exemplos:
    python analisar_pasta_metricas.py
    python analisar_pasta_metricas.py ./videos --tipo eyes_only
    python analisar_pasta_metricas.py C:\dados --tipo all_points
    python analisar_pasta_metricas.py ./videos --sequential
"""

import os
import sys
import glob
import argparse
import pandas as pd
import numpy as np
from datetime import datetime
from concurrent.futures import ProcessPoolExecutor, as_completed

# Importar funções do script principal
from analisar_metricas_completas import (
    analyze_complete,
    read_fps_from_csv,
    detect_csv_type,
    calculate_ear_series,
    smooth_ear_series,
    detect_blinks_single_eye,
    calculate_summary_stats,
    calculate_ibi_stats,
    detect_blink_bursts,
    calculate_amplitude_asymmetry,
    calculate_fatigue_index,
    calculate_velocity_percentiles,
    calculate_post_blink_latency,
    calculate_eye_health_score,
    find_synchronized_blinks
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


def analyze_folder(folder, tipo_filtro, output_folder=None, parallel=True):
    """
    Analisa todos os CSVs de uma pasta e gera relatório consolidado.
    OTIMIZADO: Suporte a processamento paralelo com multiprocessing.

    Args:
        folder: Pasta com os CSVs
        tipo_filtro: 'all_points', 'eyes_only', ou 'todos'
        output_folder: Pasta de saída (padrão: mesma pasta)
        parallel: Usar processamento paralelo (padrão: True)
    """
    print(f"{'='*70}")
    print(f"ANÁLISE EM LOTE DE MÉTRICAS DE PISCADAS")
    print(f"{'='*70}")
    print(f"\n📂 Pasta: {os.path.abspath(folder)}")
    print(f"🔍 Filtro: {tipo_filtro}")
    print(f"⚡ Processamento: {'Paralelo' if parallel else 'Sequencial'}")

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

    if parallel and len(csv_files) > 1:
        # Processamento paralelo
        print(f"\n🚀 Iniciando processamento paralelo (workers: {min(os.cpu_count(), len(csv_files))})...")

        with ProcessPoolExecutor(max_workers=min(os.cpu_count(), len(csv_files))) as executor:
            # Submeter tarefas
            future_to_file = {}
            for csv_path in csv_files:
                filename = os.path.basename(csv_path)
                base = os.path.splitext(csv_path)[0]
                if base.endswith('_all_points'):
                    base = base[:-11]
                output_xlsx = f"{base}_metricas.xlsx"

                future = executor.submit(process_single_file_parallel, csv_path, filename, output_xlsx)
                future_to_file[future] = (csv_path, filename, output_xlsx)

            # Coletar resultados
            for future in as_completed(future_to_file):
                csv_path, filename, output_xlsx = future_to_file[future]
                try:
                    result = future.result()
                    if result:
                        all_summaries.append(result['summary'])
                        all_blinks.extend(result['blinks'])
                        processed += 1
                        print(f"   ✅ {filename}: {result['summary']['Piscadas Direito']}D / {result['summary']['Piscadas Esquerdo']}E piscadas")
                    else:
                        errors.append((filename, "Dados insuficientes"))
                except Exception as e:
                    errors.append((filename, str(e)))
                    print(f"   ❌ {filename}: {e}")
    else:
        # Processamento sequencial
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

        # Calcular médias das novas métricas
        avg_health = df_summary['Score Saude Ocular'].mean() if 'Score Saude Ocular' in df_summary else 0
        avg_fatigue = df_summary['Indice Fadiga'].mean() if 'Indice Fadiga' in df_summary else 0
        avg_asymmetry = df_summary['Assimetria Amplitude (%)'].mean() if 'Assimetria Amplitude (%)' in df_summary else 0
        avg_ibi_right = df_summary['IBI Medio Direito (s)'].mean() if 'IBI Medio Direito (s)' in df_summary else 0
        avg_ibi_left = df_summary['IBI Medio Esquerdo (s)'].mean() if 'IBI Medio Esquerdo (s)' in df_summary else 0

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
                'Média Score Saúde Ocular',
                'Média Índice Fadiga',
                'Média Assimetria Amplitude (%)',
                'Média IBI Direito (s)',
                'Média IBI Esquerdo (s)',
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
                f"{avg_health:.1f}" if avg_health > 0 else "N/A",
                f"{avg_fatigue:.1f}" if avg_fatigue > 0 else "N/A",
                f"{avg_asymmetry:.1f}" if avg_asymmetry > 0 else "N/A",
                f"{avg_ibi_right:.2f}" if avg_ibi_right > 0 else "N/A",
                f"{avg_ibi_left:.2f}" if avg_ibi_left > 0 else "N/A",
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


def process_single_file_parallel(csv_path, filename, output_xlsx):
    """
    Processa um arquivo em paralelo (para uso com ProcessPoolExecutor).
    """
    try:
        result = analyze_single_for_batch(csv_path, filename)
        if result:
            # Salvar relatório individual
            analyze_complete(
                csv_path=csv_path,
                output_path=output_xlsx,
                fps_override=None,
                csv_type_override=None
            )
        return result
    except Exception as e:
        raise Exception(f"{filename}: {str(e)}")


def analyze_single_for_batch(csv_path, filename):
    """
    Analisa um único CSV e retorna dados para consolidação.
    ATUALIZADO: Inclui novas métricas avancadas.

    Returns:
        Dict com 'summary' e 'blinks' ou None se falhar
    """
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

    # Piscadas sincronizadas
    synchronized = find_synchronized_blinks(blinks_right, blinks_left, fps)

    # Calcular estatísticas
    total_frames = len(df)
    stats_right = calculate_summary_stats(blinks_right, fps, total_frames, 'Direito', baseline_right)
    stats_left = calculate_summary_stats(blinks_left, fps, total_frames, 'Esquerdo', baseline_left)

    # NOVAS METRICAS AVANCADAS
    ibi_right = calculate_ibi_stats(blinks_right, fps)
    ibi_left = calculate_ibi_stats(blinks_left, fps)

    bursts_right = detect_blink_bursts(blinks_right, fps)
    bursts_left = detect_blink_bursts(blinks_left, fps)

    asymmetry = calculate_amplitude_asymmetry(blinks_right, blinks_left)

    all_blinks_sorted = sorted(blinks_right + blinks_left, key=lambda b: b['Tempo Inicio (s)'])
    fatigue = calculate_fatigue_index(all_blinks_sorted, ear_right, fps, total_frames)

    vel_pct_right = calculate_velocity_percentiles(blinks_right)
    vel_pct_left = calculate_velocity_percentiles(blinks_left)

    latency_right = calculate_post_blink_latency(ear_right, blinks_right, fps, baseline_right)
    latency_left = calculate_post_blink_latency(ear_left, blinks_left, fps, baseline_left)

    health_score = calculate_eye_health_score(stats_right, stats_left, asymmetry, fatigue)

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
        'Amplitude Media Direito': stats_right['Amplitude Mdia'],
        'Vel Fech Media Direito': stats_right['Vel. Fechamento Mdia'],
        'Vel Abert Media Direito': stats_right['Vel. Abertura Mdia'],
        'Piscadas Esquerdo': stats_left['Total Piscadas'],
        'Completas Esquerdo': stats_left['Completas'],
        'Incompletas Esquerdo': stats_left['Incompletas'],
        '% Completas Esquerdo': stats_left['% Completas'],
        'Taxa Esquerdo': stats_left['Taxa (piscadas/min)'],
        'Amplitude Media Esquerdo': stats_left['Amplitude Mdia'],
        'Vel Fech Media Esquerdo': stats_left['Vel. Fechamento Mdia'],
        'Vel Abert Media Esquerdo': stats_left['Vel. Abertura Mdia'],
        'Baseline EAR Direito': stats_right['Baseline EAR'],
        'Baseline EAR Esquerdo': stats_left['Baseline EAR'],
        # Novas métricas
        'Piscadas Sincronizadas': len(synchronized),
        'Score Saude Ocular': health_score['Score Saude Ocular'],
        'Indice Fadiga': fatigue['Indice Fadiga'],
        'Assimetria Amplitude (%)': asymmetry['Assimetria Amplitude (%)'],
        'IBI Medio Direito (s)': ibi_right['IBI Medio (s)'],
        'IBI Medio Esquerdo (s)': ibi_left['IBI Medio (s)'],
        'IBI CV Direito (%)': ibi_right['IBI CV (%)'],
        'IBI CV Esquerdo (%)': ibi_left['IBI CV (%)'],
        'Bursts Direito': len(bursts_right),
        'Bursts Esquerdo': len(bursts_left),
        'Latencia Media Direito (ms)': latency_right['Latencia Media (ms)'],
        'Latencia Media Esquerdo (ms)': latency_left['Latencia Media (ms)'],
        'Vel Fech P50 Direito': vel_pct_right['Vel Fech P50'],
        'Vel Fech P50 Esquerdo': vel_pct_left['Vel Fech P50'],
        'Tendencia Taxa': fatigue['Tendencia Taxa (piscadas/min/min)']
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

    return {
        'summary': summary,
        'blinks': all_blinks
    }


def main():
    parser = argparse.ArgumentParser(
        description="Analise em lote de metricas de piscadas para todos os CSVs de uma pasta.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  # Analisar todos os CSVs do diretorio atual (paralelo)
  python analisar_pasta_metricas.py

  # Analisar apenas CSVs eyes_only de uma pasta especifica
  python analisar_pasta_metricas.py ./videos --tipo eyes_only

  # Analisar apenas CSVs all_points
  python analisar_pasta_metricas.py ./dados --tipo all_points

  # Processamento sequencial (para debug)
  python analisar_pasta_metricas.py ./videos --sequential

  # Especificar pasta de saida
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

    parser.add_argument(
        "--parallel",
        action='store_true',
        default=True,
        help="Usar processamento paralelo (padrão: True)"
    )

    parser.add_argument(
        "--sequential",
        action='store_true',
        default=False,
        help="Forçar processamento sequencial"
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
        output_folder=args.saida,
        parallel=not args.sequential
    )


if __name__ == "__main__":
    main()
