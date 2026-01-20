#!/usr/bin/env python3
"""
Script de Geração de Gráficos Comparativos
==========================================
Gera gráficos para análise comparativa entre grupos (ex: Controle vs Paralisia).

Uso:
    python gerar_graficos_comparativos.py <csv_controle> <csv_paralisia> [--saida pasta_graficos]

    csv_controle: CSV consolidado do grupo controle
    csv_paralisia: CSV consolidado do grupo com paralisia
    --saida: Pasta para salvar os gráficos (padrão: ./graficos)

O CSV deve ter as colunas geradas pelo analisar_pasta_metricas.py:
    Arquivo, Piscadas Direito, Piscadas Esquerdo, Taxa Direito, Taxa Esquerdo,
    Vel Fech Media Direito, Vel Abert Media Direito, etc.
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import argparse
import os
import sys
from datetime import datetime

# Configuração de estilo
plt.style.use('seaborn-v0_8-whitegrid')
sns.set_palette("husl")

# Cores padrão
CORES = {
    'controle': '#2ecc71',      # Verde
    'paralisia': '#e74c3c',     # Vermelho
    'direito': '#3498db',       # Azul
    'esquerdo': '#f39c12',      # Laranja
    'hb1': '#27ae60',
    'hb2': '#2980b9',
    'hb3': '#8e44ad',
    'hb4': '#d35400',
    'hb5': '#c0392b',
    'hb6': '#7f8c8d'
}


def carregar_dados(csv_path, grupo_nome):
    """Carrega CSV e adiciona coluna de grupo."""
    # Tentar diferentes combinações de separador e decimal
    separadores = [';', ',', '\t']
    decimais = [',', '.']

    df = None
    for sep in separadores:
        for dec in decimais:
            try:
                df_temp = pd.read_csv(csv_path, sep=sep, decimal=dec, encoding='utf-8')
                # Verificar se carregou corretamente (mais de 1 coluna e dados numéricos)
                if len(df_temp.columns) > 5:
                    # Tentar converter uma coluna numérica para verificar
                    test_col = None
                    for col in df_temp.columns:
                        if 'Taxa' in col or 'Piscadas' in col:
                            test_col = col
                            break
                    if test_col:
                        # Verificar se os valores são numéricos
                        try:
                            pd.to_numeric(df_temp[test_col], errors='raise')
                            df = df_temp
                            print(f"   Formato detectado: sep='{sep}', decimal='{dec}'")
                            break
                        except:
                            continue
            except:
                continue
        if df is not None:
            break

    if df is None:
        # Fallback: tentar ler como está e converter depois
        df = pd.read_csv(csv_path, sep=';', decimal=',', encoding='utf-8')

    # Converter colunas numéricas
    colunas_numericas = [
        'Piscadas Direito', 'Piscadas Esquerdo',
        'Completas Direito', 'Completas Esquerdo',
        'Incompletas Direito', 'Incompletas Esquerdo',
        '% Completas Direito', '% Completas Esquerdo',
        'Taxa Direito', 'Taxa Esquerdo',
        'Amplitude Media Direito', 'Amplitude Media Esquerdo',
        'Vel Fech Media Direito', 'Vel Fech Media Esquerdo',
        'Vel Abert Media Direito', 'Vel Abert Media Esquerdo',
        'Baseline EAR Direito', 'Baseline EAR Esquerdo',
        'FPS', 'Duracao (min)', 'Total Frames'
    ]

    for col in colunas_numericas:
        if col in df.columns:
            # Substituir vírgula por ponto e converter
            if df[col].dtype == object:
                df[col] = df[col].astype(str).str.replace(',', '.').str.strip()
            df[col] = pd.to_numeric(df[col], errors='coerce')

    df['Grupo'] = grupo_nome
    return df


def grafico_razao_velocidade(df_controle, df_paralisia, output_dir):
    """
    Gráfico de barras: Razão Velocidade Fechamento/Abertura por grupo.
    """
    fig, ax = plt.subplots(figsize=(10, 6))

    # Calcular razões
    def calc_razao(df):
        vel_fech = (df['Vel Fech Media Direito'].mean() + df['Vel Fech Media Esquerdo'].mean()) / 2
        vel_abert = (df['Vel Abert Media Direito'].mean() + df['Vel Abert Media Esquerdo'].mean()) / 2
        return vel_fech / vel_abert if vel_abert > 0 else 0

    razao_controle = calc_razao(df_controle)
    razao_paralisia = calc_razao(df_paralisia)

    grupos = ['Controle', 'Paralisia']
    razoes = [razao_controle, razao_paralisia]
    cores = [CORES['controle'], CORES['paralisia']]

    bars = ax.bar(grupos, razoes, color=cores, edgecolor='black', linewidth=1.2)

    # Adicionar valores nas barras
    for bar, razao in zip(bars, razoes):
        height = bar.get_height()
        ax.annotate(f'{razao:.1f}',
                    xy=(bar.get_x() + bar.get_width() / 2, height),
                    xytext=(0, 3),
                    textcoords="offset points",
                    ha='center', va='bottom', fontsize=14, fontweight='bold')

    ax.set_ylabel('Razão Velocidade (Fechamento / Abertura)', fontsize=12)
    ax.set_title('Razão de Velocidade: Controle vs Paralisia\n(Maior = fechamento mais rápido que abertura)', fontsize=14)
    ax.set_ylim(0, max(razoes) * 1.2)

    # Linha de referência
    ax.axhline(y=1, color='gray', linestyle='--', alpha=0.5, label='Razão = 1')

    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, '01_razao_velocidade.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print("   ✅ 01_razao_velocidade.png")


def grafico_boxplot_velocidades(df_controle, df_paralisia, output_dir):
    """
    Boxplot comparativo das velocidades de fechamento e abertura.
    """
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))

    # Preparar dados
    vel_fech_controle = pd.concat([df_controle['Vel Fech Media Direito'],
                                    df_controle['Vel Fech Media Esquerdo']])
    vel_fech_paralisia = pd.concat([df_paralisia['Vel Fech Media Direito'],
                                     df_paralisia['Vel Fech Media Esquerdo']])

    vel_abert_controle = pd.concat([df_controle['Vel Abert Media Direito'],
                                     df_controle['Vel Abert Media Esquerdo']])
    vel_abert_paralisia = pd.concat([df_paralisia['Vel Abert Media Direito'],
                                      df_paralisia['Vel Abert Media Esquerdo']])

    # Boxplot Velocidade Fechamento
    data_fech = [vel_fech_controle.dropna(), vel_fech_paralisia.dropna()]
    bp1 = axes[0].boxplot(data_fech, labels=['Controle', 'Paralisia'], patch_artist=True)
    bp1['boxes'][0].set_facecolor(CORES['controle'])
    bp1['boxes'][1].set_facecolor(CORES['paralisia'])
    axes[0].set_ylabel('Velocidade (EAR/s)', fontsize=12)
    axes[0].set_title('Velocidade de Fechamento', fontsize=14)

    # Adicionar média
    for i, data in enumerate(data_fech):
        axes[0].scatter(i+1, data.mean(), color='white', s=100, zorder=5,
                       edgecolor='black', linewidth=2, marker='D')

    # Boxplot Velocidade Abertura
    data_abert = [vel_abert_controle.dropna(), vel_abert_paralisia.dropna()]
    bp2 = axes[1].boxplot(data_abert, labels=['Controle', 'Paralisia'], patch_artist=True)
    bp2['boxes'][0].set_facecolor(CORES['controle'])
    bp2['boxes'][1].set_facecolor(CORES['paralisia'])
    axes[1].set_ylabel('Velocidade (EAR/s)', fontsize=12)
    axes[1].set_title('Velocidade de Abertura', fontsize=14)

    for i, data in enumerate(data_abert):
        axes[1].scatter(i+1, data.mean(), color='white', s=100, zorder=5,
                       edgecolor='black', linewidth=2, marker='D')

    plt.suptitle('Distribuição das Velocidades por Grupo', fontsize=16, y=1.02)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, '02_boxplot_velocidades.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print("   ✅ 02_boxplot_velocidades.png")


def grafico_scatter_simetria(df_controle, df_paralisia, output_dir):
    """
    Scatter plot: Piscadas Olho Direito vs Esquerdo (simetria).
    """
    fig, ax = plt.subplots(figsize=(10, 10))

    # Plot controle
    ax.scatter(df_controle['Piscadas Direito'], df_controle['Piscadas Esquerdo'],
               c=CORES['controle'], s=100, alpha=0.7, label='Controle', edgecolor='black')

    # Plot paralisia
    ax.scatter(df_paralisia['Piscadas Direito'], df_paralisia['Piscadas Esquerdo'],
               c=CORES['paralisia'], s=100, alpha=0.7, label='Paralisia', edgecolor='black')

    # Linha de simetria perfeita (y = x)
    max_val = max(df_controle['Piscadas Direito'].max(), df_controle['Piscadas Esquerdo'].max(),
                  df_paralisia['Piscadas Direito'].max(), df_paralisia['Piscadas Esquerdo'].max())
    ax.plot([0, max_val], [0, max_val], 'k--', alpha=0.5, label='Simetria perfeita')

    # Região de tolerância (±20%)
    ax.fill_between([0, max_val], [0, max_val*0.8], [0, max_val*1.2],
                    alpha=0.1, color='gray', label='Tolerância ±20%')

    ax.set_xlabel('Piscadas Olho Direito', fontsize=12)
    ax.set_ylabel('Piscadas Olho Esquerdo', fontsize=12)
    ax.set_title('Simetria Bilateral: Piscadas Olho Direito vs Esquerdo', fontsize=14)
    ax.legend(loc='upper left')
    ax.set_aspect('equal')

    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, '03_scatter_simetria.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print("   ✅ 03_scatter_simetria.png")


def grafico_taxa_piscadas(df_controle, df_paralisia, output_dir):
    """
    Gráfico de barras: Taxa média de piscadas por grupo.
    """
    fig, ax = plt.subplots(figsize=(10, 6))

    # Calcular taxas médias
    taxa_controle_dir = df_controle['Taxa Direito'].mean()
    taxa_controle_esq = df_controle['Taxa Esquerdo'].mean()
    taxa_paralisia_dir = df_paralisia['Taxa Direito'].mean()
    taxa_paralisia_esq = df_paralisia['Taxa Esquerdo'].mean()

    x = np.arange(2)
    width = 0.35

    bars1 = ax.bar(x - width/2, [taxa_controle_dir, taxa_paralisia_dir], width,
                   label='Olho Direito', color=CORES['direito'], edgecolor='black')
    bars2 = ax.bar(x + width/2, [taxa_controle_esq, taxa_paralisia_esq], width,
                   label='Olho Esquerdo', color=CORES['esquerdo'], edgecolor='black')

    ax.set_ylabel('Taxa (piscadas/min)', fontsize=12)
    ax.set_title('Taxa de Piscadas por Grupo e Olho', fontsize=14)
    ax.set_xticks(x)
    ax.set_xticklabels(['Controle', 'Paralisia'])
    ax.legend()

    # Adicionar valores
    for bars in [bars1, bars2]:
        for bar in bars:
            height = bar.get_height()
            ax.annotate(f'{height:.1f}',
                        xy=(bar.get_x() + bar.get_width() / 2, height),
                        xytext=(0, 3),
                        textcoords="offset points",
                        ha='center', va='bottom', fontsize=10)

    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, '04_taxa_piscadas.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print("   ✅ 04_taxa_piscadas.png")


def grafico_scatter_velocidades(df_controle, df_paralisia, output_dir):
    """
    Scatter plot: Velocidade Fechamento vs Abertura.
    """
    fig, ax = plt.subplots(figsize=(12, 8))

    # Média das velocidades por paciente
    df_controle['Vel_Fech_Media'] = (df_controle['Vel Fech Media Direito'] + df_controle['Vel Fech Media Esquerdo']) / 2
    df_controle['Vel_Abert_Media'] = (df_controle['Vel Abert Media Direito'] + df_controle['Vel Abert Media Esquerdo']) / 2

    df_paralisia['Vel_Fech_Media'] = (df_paralisia['Vel Fech Media Direito'] + df_paralisia['Vel Fech Media Esquerdo']) / 2
    df_paralisia['Vel_Abert_Media'] = (df_paralisia['Vel Abert Media Direito'] + df_paralisia['Vel Abert Media Esquerdo']) / 2

    # Plot
    ax.scatter(df_controle['Vel_Fech_Media'], df_controle['Vel_Abert_Media'],
               c=CORES['controle'], s=150, alpha=0.7, label='Controle', edgecolor='black', linewidth=1.5)

    ax.scatter(df_paralisia['Vel_Fech_Media'], df_paralisia['Vel_Abert_Media'],
               c=CORES['paralisia'], s=150, alpha=0.7, label='Paralisia', edgecolor='black', linewidth=1.5)

    ax.set_xlabel('Velocidade de Fechamento (EAR/s)', fontsize=12)
    ax.set_ylabel('Velocidade de Abertura (EAR/s)', fontsize=12)
    ax.set_title('Relação entre Velocidade de Fechamento e Abertura', fontsize=14)
    ax.legend(fontsize=11)

    # Adicionar anotações de centróides
    centroide_ctrl = (df_controle['Vel_Fech_Media'].mean(), df_controle['Vel_Abert_Media'].mean())
    centroide_para = (df_paralisia['Vel_Fech_Media'].mean(), df_paralisia['Vel_Abert_Media'].mean())

    ax.scatter(*centroide_ctrl, c=CORES['controle'], s=400, marker='*', edgecolor='black', linewidth=2, zorder=5)
    ax.scatter(*centroide_para, c=CORES['paralisia'], s=400, marker='*', edgecolor='black', linewidth=2, zorder=5)

    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, '05_scatter_velocidades.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print("   ✅ 05_scatter_velocidades.png")


def grafico_histograma_assimetria(df_controle, df_paralisia, output_dir):
    """
    Histograma: Distribuição da assimetria bilateral.
    """
    fig, ax = plt.subplots(figsize=(10, 6))

    # Calcular assimetria (diferença percentual)
    def calc_assimetria(row):
        max_val = max(row['Piscadas Direito'], row['Piscadas Esquerdo'])
        if max_val == 0:
            return 0
        return abs(row['Piscadas Direito'] - row['Piscadas Esquerdo']) / max_val * 100

    assim_controle = df_controle.apply(calc_assimetria, axis=1)
    assim_paralisia = df_paralisia.apply(calc_assimetria, axis=1)

    # Histograma
    bins = np.arange(0, 105, 10)
    ax.hist(assim_controle, bins=bins, alpha=0.7, color=CORES['controle'],
            label=f'Controle (média: {assim_controle.mean():.1f}%)', edgecolor='black')
    ax.hist(assim_paralisia, bins=bins, alpha=0.7, color=CORES['paralisia'],
            label=f'Paralisia (média: {assim_paralisia.mean():.1f}%)', edgecolor='black')

    ax.set_xlabel('Assimetria Bilateral (%)', fontsize=12)
    ax.set_ylabel('Frequência', fontsize=12)
    ax.set_title('Distribuição da Assimetria entre Olhos', fontsize=14)
    ax.legend()
    ax.axvline(x=20, color='gray', linestyle='--', alpha=0.7, label='Limite tolerável (20%)')

    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, '06_histograma_assimetria.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print("   ✅ 06_histograma_assimetria.png")


def grafico_amplitude_media(df_controle, df_paralisia, output_dir):
    """
    Gráfico de barras: Amplitude média por grupo.
    """
    fig, ax = plt.subplots(figsize=(10, 6))

    # Calcular amplitudes médias
    amp_controle_dir = df_controle['Amplitude Media Direito'].mean()
    amp_controle_esq = df_controle['Amplitude Media Esquerdo'].mean()
    amp_paralisia_dir = df_paralisia['Amplitude Media Direito'].mean()
    amp_paralisia_esq = df_paralisia['Amplitude Media Esquerdo'].mean()

    x = np.arange(2)
    width = 0.35

    bars1 = ax.bar(x - width/2, [amp_controle_dir, amp_paralisia_dir], width,
                   label='Olho Direito', color=CORES['direito'], edgecolor='black')
    bars2 = ax.bar(x + width/2, [amp_controle_esq, amp_paralisia_esq], width,
                   label='Olho Esquerdo', color=CORES['esquerdo'], edgecolor='black')

    ax.set_ylabel('Amplitude Média (EAR)', fontsize=12)
    ax.set_title('Amplitude Média das Piscadas por Grupo', fontsize=14)
    ax.set_xticks(x)
    ax.set_xticklabels(['Controle', 'Paralisia'])
    ax.legend()

    # Adicionar valores
    for bars in [bars1, bars2]:
        for bar in bars:
            height = bar.get_height()
            ax.annotate(f'{height:.4f}',
                        xy=(bar.get_x() + bar.get_width() / 2, height),
                        xytext=(0, 3),
                        textcoords="offset points",
                        ha='center', va='bottom', fontsize=10)

    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, '07_amplitude_media.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print("   ✅ 07_amplitude_media.png")


def grafico_baseline_ear(df_controle, df_paralisia, output_dir):
    """
    Gráfico de barras: Baseline EAR por grupo.
    """
    fig, ax = plt.subplots(figsize=(10, 6))

    baseline_controle_dir = df_controle['Baseline EAR Direito'].mean()
    baseline_controle_esq = df_controle['Baseline EAR Esquerdo'].mean()
    baseline_paralisia_dir = df_paralisia['Baseline EAR Direito'].mean()
    baseline_paralisia_esq = df_paralisia['Baseline EAR Esquerdo'].mean()

    x = np.arange(2)
    width = 0.35

    bars1 = ax.bar(x - width/2, [baseline_controle_dir, baseline_paralisia_dir], width,
                   label='Olho Direito', color=CORES['direito'], edgecolor='black')
    bars2 = ax.bar(x + width/2, [baseline_controle_esq, baseline_paralisia_esq], width,
                   label='Olho Esquerdo', color=CORES['esquerdo'], edgecolor='black')

    ax.set_ylabel('Baseline EAR', fontsize=12)
    ax.set_title('Baseline EAR (Abertura em Repouso) por Grupo', fontsize=14)
    ax.set_xticks(x)
    ax.set_xticklabels(['Controle', 'Paralisia'])
    ax.legend()

    for bars in [bars1, bars2]:
        for bar in bars:
            height = bar.get_height()
            ax.annotate(f'{height:.3f}',
                        xy=(bar.get_x() + bar.get_width() / 2, height),
                        xytext=(0, 3),
                        textcoords="offset points",
                        ha='center', va='bottom', fontsize=10)

    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, '08_baseline_ear.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print("   ✅ 08_baseline_ear.png")


def grafico_resumo_comparativo(df_controle, df_paralisia, output_dir):
    """
    Gráfico radar comparativo das principais métricas (normalizadas).
    """
    fig, ax = plt.subplots(figsize=(10, 10), subplot_kw=dict(polar=True))

    # Métricas a comparar (normalizadas pelo máximo)
    metricas = ['Taxa', 'Vel. Fechamento', 'Vel. Abertura', 'Amplitude', 'Simetria']

    # Calcular valores
    taxa_ctrl = (df_controle['Taxa Direito'].mean() + df_controle['Taxa Esquerdo'].mean()) / 2
    taxa_para = (df_paralisia['Taxa Direito'].mean() + df_paralisia['Taxa Esquerdo'].mean()) / 2

    vel_fech_ctrl = (df_controle['Vel Fech Media Direito'].mean() + df_controle['Vel Fech Media Esquerdo'].mean()) / 2
    vel_fech_para = (df_paralisia['Vel Fech Media Direito'].mean() + df_paralisia['Vel Fech Media Esquerdo'].mean()) / 2

    vel_abert_ctrl = (df_controle['Vel Abert Media Direito'].mean() + df_controle['Vel Abert Media Esquerdo'].mean()) / 2
    vel_abert_para = (df_paralisia['Vel Abert Media Direito'].mean() + df_paralisia['Vel Abert Media Esquerdo'].mean()) / 2

    amp_ctrl = (df_controle['Amplitude Media Direito'].mean() + df_controle['Amplitude Media Esquerdo'].mean()) / 2
    amp_para = (df_paralisia['Amplitude Media Direito'].mean() + df_paralisia['Amplitude Media Esquerdo'].mean()) / 2

    # Simetria (inverso da assimetria média)
    def calc_simetria_media(df):
        def calc_assim(row):
            max_val = max(row['Piscadas Direito'], row['Piscadas Esquerdo'])
            if max_val == 0:
                return 100
            return 100 - abs(row['Piscadas Direito'] - row['Piscadas Esquerdo']) / max_val * 100
        return df.apply(calc_assim, axis=1).mean()

    sim_ctrl = calc_simetria_media(df_controle)
    sim_para = calc_simetria_media(df_paralisia)

    # Normalizar (0-100)
    max_taxa = max(taxa_ctrl, taxa_para)
    max_vel_fech = max(vel_fech_ctrl, vel_fech_para)
    max_vel_abert = max(vel_abert_ctrl, vel_abert_para)
    max_amp = max(amp_ctrl, amp_para)

    valores_ctrl = [
        taxa_ctrl / max_taxa * 100 if max_taxa > 0 else 0,
        vel_fech_ctrl / max_vel_fech * 100 if max_vel_fech > 0 else 0,
        vel_abert_ctrl / max_vel_abert * 100 if max_vel_abert > 0 else 0,
        amp_ctrl / max_amp * 100 if max_amp > 0 else 0,
        sim_ctrl
    ]

    valores_para = [
        taxa_para / max_taxa * 100 if max_taxa > 0 else 0,
        vel_fech_para / max_vel_fech * 100 if max_vel_fech > 0 else 0,
        vel_abert_para / max_vel_abert * 100 if max_vel_abert > 0 else 0,
        amp_para / max_amp * 100 if max_amp > 0 else 0,
        sim_para
    ]

    # Fechar o polígono
    valores_ctrl += valores_ctrl[:1]
    valores_para += valores_para[:1]

    # Ângulos
    angles = np.linspace(0, 2 * np.pi, len(metricas), endpoint=False).tolist()
    angles += angles[:1]

    # Plot
    ax.plot(angles, valores_ctrl, 'o-', linewidth=2, color=CORES['controle'], label='Controle')
    ax.fill(angles, valores_ctrl, alpha=0.25, color=CORES['controle'])

    ax.plot(angles, valores_para, 'o-', linewidth=2, color=CORES['paralisia'], label='Paralisia')
    ax.fill(angles, valores_para, alpha=0.25, color=CORES['paralisia'])

    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(metricas, fontsize=11)
    ax.set_ylim(0, 100)
    ax.legend(loc='upper right', bbox_to_anchor=(1.3, 1.0))
    ax.set_title('Comparação Multidimensional: Controle vs Paralisia\n(valores normalizados)', fontsize=14, y=1.08)

    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, '09_radar_comparativo.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print("   ✅ 09_radar_comparativo.png")


def grafico_perfil_piscada(output_dir):
    """
    Gráfico ilustrativo do perfil temporal de uma piscada (controle vs paralisia).
    """
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # Simular perfil de piscada - Controle
    t_ctrl = np.linspace(0, 0.4, 100)
    # Fechamento rápido (exponencial), abertura lenta (linear)
    ear_ctrl = np.piecewise(t_ctrl,
                            [t_ctrl < 0.1, t_ctrl >= 0.1],
                            [lambda t: 0.28 - 0.15 * (1 - np.exp(-t/0.02)),
                             lambda t: 0.13 + 0.15 * (t - 0.1) / 0.3])

    axes[0].plot(t_ctrl, ear_ctrl, linewidth=3, color=CORES['controle'])
    axes[0].fill_between(t_ctrl, ear_ctrl, alpha=0.3, color=CORES['controle'])
    axes[0].axhline(y=0.28, color='gray', linestyle='--', alpha=0.5, label='Baseline')
    axes[0].axvline(x=0.1, color='red', linestyle=':', alpha=0.5, label='Mínimo EAR')
    axes[0].set_xlabel('Tempo (s)', fontsize=12)
    axes[0].set_ylabel('EAR', fontsize=12)
    axes[0].set_title('Perfil Normal (Controle)\nFechamento RÁPIDO, Abertura LENTA', fontsize=12)
    axes[0].set_ylim(0.1, 0.32)
    axes[0].legend(loc='lower right')

    # Anotações
    axes[0].annotate('Fechamento\n(~25ms)', xy=(0.05, 0.20), fontsize=10, ha='center')
    axes[0].annotate('Abertura\n(~300ms)', xy=(0.25, 0.22), fontsize=10, ha='center')

    # Simular perfil de piscada - Paralisia
    t_para = np.linspace(0, 0.4, 100)
    # Fechamento lento (linear), abertura similar
    ear_para = np.piecewise(t_para,
                            [t_para < 0.2, t_para >= 0.2],
                            [lambda t: 0.28 - 0.10 * t / 0.2,
                             lambda t: 0.18 + 0.10 * (t - 0.2) / 0.2])

    axes[1].plot(t_para, ear_para, linewidth=3, color=CORES['paralisia'])
    axes[1].fill_between(t_para, ear_para, alpha=0.3, color=CORES['paralisia'])
    axes[1].axhline(y=0.28, color='gray', linestyle='--', alpha=0.5, label='Baseline')
    axes[1].axvline(x=0.2, color='red', linestyle=':', alpha=0.5, label='Mínimo EAR')
    axes[1].set_xlabel('Tempo (s)', fontsize=12)
    axes[1].set_ylabel('EAR', fontsize=12)
    axes[1].set_title('Perfil Alterado (Paralisia)\nFechamento LENTO, Abertura relativamente RÁPIDA', fontsize=12)
    axes[1].set_ylim(0.1, 0.32)
    axes[1].legend(loc='lower right')

    # Anotações
    axes[1].annotate('Fechamento\n(~200ms)', xy=(0.1, 0.22), fontsize=10, ha='center')
    axes[1].annotate('Abertura\n(~200ms)', xy=(0.3, 0.22), fontsize=10, ha='center')

    plt.suptitle('Perfil Temporal da Piscada: Controle vs Paralisia', fontsize=14, y=1.02)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, '10_perfil_piscada.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print("   ✅ 10_perfil_piscada.png")


def gerar_graficos_grupo_unico(df, grupo_nome, output_dir):
    """
    Gera gráficos para um único grupo (sem comparação).
    """
    print(f"\n🎨 Gerando gráficos para grupo único: {grupo_nome}...")

    # 1. Histograma de Taxa de Piscadas
    try:
        fig, ax = plt.subplots(figsize=(10, 6))
        taxa_media = (df['Taxa Direito'] + df['Taxa Esquerdo']) / 2
        ax.hist(taxa_media.dropna(), bins=15, color=CORES['paralisia'], edgecolor='black', alpha=0.7)
        ax.axvline(taxa_media.mean(), color='red', linestyle='--', linewidth=2, label=f'Média: {taxa_media.mean():.1f}')
        ax.set_xlabel('Taxa de Piscadas (piscadas/min)', fontsize=12)
        ax.set_ylabel('Frequência', fontsize=12)
        ax.set_title(f'Distribuição da Taxa de Piscadas - {grupo_nome}', fontsize=14)
        ax.legend()
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, '01_histograma_taxa.png'), dpi=150, bbox_inches='tight')
        plt.close()
        print("   ✅ 01_histograma_taxa.png")
    except Exception as e:
        print(f"   ❌ Erro em histograma_taxa: {e}")

    # 2. Scatter Simetria
    try:
        fig, ax = plt.subplots(figsize=(10, 10))
        ax.scatter(df['Piscadas Direito'], df['Piscadas Esquerdo'],
                   c=CORES['paralisia'], s=100, alpha=0.7, edgecolor='black')
        max_val = max(df['Piscadas Direito'].max(), df['Piscadas Esquerdo'].max())
        ax.plot([0, max_val], [0, max_val], 'k--', alpha=0.5, label='Simetria perfeita')
        ax.set_xlabel('Piscadas Olho Direito', fontsize=12)
        ax.set_ylabel('Piscadas Olho Esquerdo', fontsize=12)
        ax.set_title(f'Simetria Bilateral - {grupo_nome}', fontsize=14)
        ax.legend()
        ax.set_aspect('equal')
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, '02_scatter_simetria.png'), dpi=150, bbox_inches='tight')
        plt.close()
        print("   ✅ 02_scatter_simetria.png")
    except Exception as e:
        print(f"   ❌ Erro em scatter_simetria: {e}")

    # 3. Boxplot Velocidades
    try:
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))

        vel_fech = pd.concat([df['Vel Fech Media Direito'], df['Vel Fech Media Esquerdo']])
        vel_abert = pd.concat([df['Vel Abert Media Direito'], df['Vel Abert Media Esquerdo']])

        bp1 = axes[0].boxplot([vel_fech.dropna()], patch_artist=True)
        bp1['boxes'][0].set_facecolor(CORES['paralisia'])
        axes[0].set_ylabel('Velocidade (EAR/s)', fontsize=12)
        axes[0].set_title('Velocidade de Fechamento', fontsize=14)
        axes[0].set_xticklabels([grupo_nome])

        bp2 = axes[1].boxplot([vel_abert.dropna()], patch_artist=True)
        bp2['boxes'][0].set_facecolor(CORES['paralisia'])
        axes[1].set_ylabel('Velocidade (EAR/s)', fontsize=12)
        axes[1].set_title('Velocidade de Abertura', fontsize=14)
        axes[1].set_xticklabels([grupo_nome])

        plt.suptitle(f'Distribuição das Velocidades - {grupo_nome}', fontsize=16, y=1.02)
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, '03_boxplot_velocidades.png'), dpi=150, bbox_inches='tight')
        plt.close()
        print("   ✅ 03_boxplot_velocidades.png")
    except Exception as e:
        print(f"   ❌ Erro em boxplot_velocidades: {e}")

    # 4. Histograma Assimetria
    try:
        fig, ax = plt.subplots(figsize=(10, 6))

        def calc_assimetria(row):
            max_val = max(row['Piscadas Direito'], row['Piscadas Esquerdo'])
            if max_val == 0:
                return 0
            return abs(row['Piscadas Direito'] - row['Piscadas Esquerdo']) / max_val * 100

        assimetria = df.apply(calc_assimetria, axis=1)
        ax.hist(assimetria, bins=10, color=CORES['paralisia'], edgecolor='black', alpha=0.7)
        ax.axvline(assimetria.mean(), color='red', linestyle='--', linewidth=2,
                   label=f'Média: {assimetria.mean():.1f}%')
        ax.axvline(20, color='gray', linestyle=':', alpha=0.7, label='Limite tolerável (20%)')
        ax.set_xlabel('Assimetria Bilateral (%)', fontsize=12)
        ax.set_ylabel('Frequência', fontsize=12)
        ax.set_title(f'Distribuição da Assimetria - {grupo_nome}', fontsize=14)
        ax.legend()
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, '04_histograma_assimetria.png'), dpi=150, bbox_inches='tight')
        plt.close()
        print("   ✅ 04_histograma_assimetria.png")
    except Exception as e:
        print(f"   ❌ Erro em histograma_assimetria: {e}")

    # 5. Scatter Velocidades
    try:
        fig, ax = plt.subplots(figsize=(10, 8))

        df['Vel_Fech_Media'] = (df['Vel Fech Media Direito'] + df['Vel Fech Media Esquerdo']) / 2
        df['Vel_Abert_Media'] = (df['Vel Abert Media Direito'] + df['Vel Abert Media Esquerdo']) / 2

        ax.scatter(df['Vel_Fech_Media'], df['Vel_Abert_Media'],
                   c=CORES['paralisia'], s=100, alpha=0.7, edgecolor='black')
        ax.set_xlabel('Velocidade de Fechamento (EAR/s)', fontsize=12)
        ax.set_ylabel('Velocidade de Abertura (EAR/s)', fontsize=12)
        ax.set_title(f'Vel. Fechamento vs Abertura - {grupo_nome}', fontsize=14)
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, '05_scatter_velocidades.png'), dpi=150, bbox_inches='tight')
        plt.close()
        print("   ✅ 05_scatter_velocidades.png")
    except Exception as e:
        print(f"   ❌ Erro em scatter_velocidades: {e}")

    # 6. Barras por Olho
    try:
        fig, axes = plt.subplots(1, 3, figsize=(15, 5))

        # Taxa
        taxa = [df['Taxa Direito'].mean(), df['Taxa Esquerdo'].mean()]
        axes[0].bar(['Direito', 'Esquerdo'], taxa, color=[CORES['direito'], CORES['esquerdo']], edgecolor='black')
        axes[0].set_ylabel('Taxa (piscadas/min)')
        axes[0].set_title('Taxa de Piscadas')
        for i, v in enumerate(taxa):
            axes[0].text(i, v + 0.5, f'{v:.1f}', ha='center')

        # Amplitude
        amp = [df['Amplitude Media Direito'].mean(), df['Amplitude Media Esquerdo'].mean()]
        axes[1].bar(['Direito', 'Esquerdo'], amp, color=[CORES['direito'], CORES['esquerdo']], edgecolor='black')
        axes[1].set_ylabel('Amplitude (EAR)')
        axes[1].set_title('Amplitude Média')
        for i, v in enumerate(amp):
            axes[1].text(i, v + 0.002, f'{v:.4f}', ha='center')

        # Baseline
        baseline = [df['Baseline EAR Direito'].mean(), df['Baseline EAR Esquerdo'].mean()]
        axes[2].bar(['Direito', 'Esquerdo'], baseline, color=[CORES['direito'], CORES['esquerdo']], edgecolor='black')
        axes[2].set_ylabel('Baseline EAR')
        axes[2].set_title('Baseline EAR')
        for i, v in enumerate(baseline):
            axes[2].text(i, v + 0.005, f'{v:.3f}', ha='center')

        plt.suptitle(f'Métricas por Olho - {grupo_nome}', fontsize=14, y=1.02)
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, '06_metricas_por_olho.png'), dpi=150, bbox_inches='tight')
        plt.close()
        print("   ✅ 06_metricas_por_olho.png")
    except Exception as e:
        print(f"   ❌ Erro em metricas_por_olho: {e}")

    # 7. Histograma Razão de Velocidade
    try:
        fig, ax = plt.subplots(figsize=(10, 6))

        vel_fech = (df['Vel Fech Media Direito'] + df['Vel Fech Media Esquerdo']) / 2
        vel_abert = (df['Vel Abert Media Direito'] + df['Vel Abert Media Esquerdo']) / 2
        razao = vel_fech / vel_abert.replace(0, np.nan)
        razao = razao.dropna()
        razao = razao[razao < 100]  # Filtrar outliers extremos

        ax.hist(razao, bins=15, color=CORES['paralisia'], edgecolor='black', alpha=0.7)
        ax.axvline(razao.mean(), color='red', linestyle='--', linewidth=2,
                   label=f'Média: {razao.mean():.1f}')
        ax.set_xlabel('Razão Velocidade (Fechamento / Abertura)', fontsize=12)
        ax.set_ylabel('Frequência', fontsize=12)
        ax.set_title(f'Distribuição da Razão de Velocidade - {grupo_nome}', fontsize=14)
        ax.legend()
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, '07_histograma_razao_velocidade.png'), dpi=150, bbox_inches='tight')
        plt.close()
        print("   ✅ 07_histograma_razao_velocidade.png")
    except Exception as e:
        print(f"   ❌ Erro em histograma_razao_velocidade: {e}")

    print(f"\n✅ {7} gráficos gerados para grupo único")


def gerar_todos_graficos(csv_controle, csv_paralisia, output_dir):
    """
    Gera todos os gráficos comparativos.
    """
    print(f"\n{'='*60}")
    print("GERAÇÃO DE GRÁFICOS COMPARATIVOS")
    print(f"{'='*60}")

    # Criar pasta de saída
    os.makedirs(output_dir, exist_ok=True)
    print(f"\n📂 Pasta de saída: {os.path.abspath(output_dir)}")

    # Carregar dados
    print("\n📊 Carregando dados...")

    # Verificar se é modo grupo único ou comparativo
    if csv_controle is None or csv_controle == '':
        # Modo grupo único - só paralisia
        df_paralisia = carregar_dados(csv_paralisia, 'Estudo')
        print(f"   Grupo Estudo: {len(df_paralisia)} registros")
        print("\n⚠️  Modo grupo único (sem controle)")
        gerar_graficos_grupo_unico(df_paralisia, 'Estudo', output_dir)
        return

    df_controle = carregar_dados(csv_controle, 'Controle')
    df_paralisia = carregar_dados(csv_paralisia, 'Paralisia')
    print(f"   Controle: {len(df_controle)} registros")
    print(f"   Paralisia: {len(df_paralisia)} registros")

    # Gerar gráficos
    print("\n🎨 Gerando gráficos...")

    try:
        grafico_razao_velocidade(df_controle, df_paralisia, output_dir)
    except Exception as e:
        print(f"   ❌ Erro em razao_velocidade: {e}")

    try:
        grafico_boxplot_velocidades(df_controle, df_paralisia, output_dir)
    except Exception as e:
        print(f"   ❌ Erro em boxplot_velocidades: {e}")

    try:
        grafico_scatter_simetria(df_controle, df_paralisia, output_dir)
    except Exception as e:
        print(f"   ❌ Erro em scatter_simetria: {e}")

    try:
        grafico_taxa_piscadas(df_controle, df_paralisia, output_dir)
    except Exception as e:
        print(f"   ❌ Erro em taxa_piscadas: {e}")

    try:
        grafico_scatter_velocidades(df_controle, df_paralisia, output_dir)
    except Exception as e:
        print(f"   ❌ Erro em scatter_velocidades: {e}")

    try:
        grafico_histograma_assimetria(df_controle, df_paralisia, output_dir)
    except Exception as e:
        print(f"   ❌ Erro em histograma_assimetria: {e}")

    try:
        grafico_amplitude_media(df_controle, df_paralisia, output_dir)
    except Exception as e:
        print(f"   ❌ Erro em amplitude_media: {e}")

    try:
        grafico_baseline_ear(df_controle, df_paralisia, output_dir)
    except Exception as e:
        print(f"   ❌ Erro em baseline_ear: {e}")

    try:
        grafico_resumo_comparativo(df_controle, df_paralisia, output_dir)
    except Exception as e:
        print(f"   ❌ Erro em radar_comparativo: {e}")

    try:
        grafico_perfil_piscada(output_dir)
    except Exception as e:
        print(f"   ❌ Erro em perfil_piscada: {e}")

    print(f"\n{'='*60}")
    print(f"✅ Gráficos salvos em: {os.path.abspath(output_dir)}")
    print(f"{'='*60}")


def main():
    parser = argparse.ArgumentParser(
        description="Gera gráficos comparativos entre grupos ou para grupo único.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  # Modo comparativo (dois grupos)
  python gerar_graficos_comparativos.py controle.csv paralisia.csv
  python gerar_graficos_comparativos.py controle.csv paralisia.csv --saida ./graficos

  # Modo grupo único (apenas um CSV)
  python gerar_graficos_comparativos.py estudo.csv --saida ./graficos
        """
    )

    parser.add_argument(
        "csv_principal",
        help="CSV consolidado do grupo principal (ou único)"
    )

    parser.add_argument(
        "csv_secundario",
        nargs='?',
        default=None,
        help="CSV consolidado do segundo grupo (opcional - se omitido, gera gráficos para grupo único)"
    )

    parser.add_argument(
        "--saida",
        default="./graficos",
        help="Pasta para salvar os gráficos (padrão: ./graficos)"
    )

    args = parser.parse_args()

    # Verificar arquivo principal
    if not os.path.exists(args.csv_principal):
        print(f"❌ Arquivo não encontrado: {args.csv_principal}")
        sys.exit(1)

    # Modo grupo único ou comparativo?
    if args.csv_secundario is None:
        # Modo grupo único
        print("\n📊 Modo: Grupo Único")
        gerar_todos_graficos(None, args.csv_principal, args.saida)
    else:
        # Modo comparativo
        if not os.path.exists(args.csv_secundario):
            print(f"❌ Arquivo não encontrado: {args.csv_secundario}")
            sys.exit(1)
        print("\n📊 Modo: Comparativo (dois grupos)")
        gerar_todos_graficos(args.csv_principal, args.csv_secundario, args.saida)


if __name__ == "__main__":
    main()
