#!/usr/bin/env python3
"""
Gráfico: Taxa de Piscadas por Olho vs Grau House-Brackmann
==========================================================
Gera dois gráficos (olho direito e esquerdo) com a taxa de piscadas
de cada paciente plotada contra seu grau House-Brackmann.

Pontos coloridos por status do olho:
  - Vermelho: olho paralisado
  - Verde:    olho são
  - Roxo:     paralisia bilateral

Uso:
    python gerar_grafico_taxa_por_hb.py <csv_metricas> <excel_hb> [--saida pasta]

Exemplo:
    python gerar_grafico_taxa_por_hb.py paralisia.csv "../Downloads/TABELA TESE.xlsx" --saida ./graficos
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import argparse
import os
import re
import sys

plt.style.use('seaborn-v0_8-whitegrid')

# Ordem e valor numérico dos graus HB para o eixo X
HB_ORDER = ['HB I', 'HB II', 'HB III', 'HB IV', 'HB V', 'HB V-VI']
HB_NUMERIC = {'HB I': 1, 'HB II': 2, 'HB III': 3, 'HB IV': 4, 'HB V': 5, 'HB V-VI': 5.7}

CORES = {
    'paralisado': '#e74c3c',  # vermelho
    'normal':     '#2ecc71',  # verde
    'bilateral':  '#9b59b6',  # roxo
}

# Média do grupo controle do relatório
MEDIA_CONTROLE = 8.4


def normalizar_hb(hb_str):
    """Normaliza string HB para formato padrão (ex: 'HB V-VI')."""
    if pd.isna(hb_str):
        return None
    s = str(hb_str).strip().upper()
    # Procura padrão HB X ou HB X-Y, pega o primeiro
    match = re.search(r'HB\s*(V-VI|VI|V|IV|III|II|I)', s)
    if match:
        g = match.group(1)
        if g == 'VI':
            return 'HB V-VI'
        return f'HB {g}'
    return None


def normalizar_lado(lado_str):
    """Normaliza lado paralisado para 'direito', 'esquerdo' ou 'bilateral'."""
    if pd.isna(lado_str):
        return 'desconhecido'
    s = str(lado_str).strip().upper()
    tem_esq = 'ESQ' in s
    tem_dir = 'DIR' in s
    if tem_esq and tem_dir:
        return 'bilateral'
    if tem_esq:
        return 'esquerdo'
    if tem_dir:
        return 'direito'
    return 'desconhecido'


def extrair_numero_paciente(arquivo_str):
    """Extrai o número N de nomes como 'pacienteN' ou 'paciente_N'."""
    if pd.isna(arquivo_str):
        return None
    match = re.search(r'paciente[\s_-]?(\d+)', str(arquivo_str), re.IGNORECASE)
    if match:
        return int(match.group(1))
    return None


def carregar_metricas(csv_path):
    """Carrega CSV de métricas, tentando diferentes separadores/decimais."""
    separadores = [';', ',', '\t']
    decimais = [',', '.']
    df = None
    for sep in separadores:
        for dec in decimais:
            try:
                df_temp = pd.read_csv(csv_path, sep=sep, decimal=dec, encoding='utf-8')
                if len(df_temp.columns) > 5:
                    for col in df_temp.columns:
                        if 'Taxa' in col:
                            try:
                                pd.to_numeric(df_temp[col].astype(str).str.replace(',', '.'), errors='raise')
                                df = df_temp
                                break
                            except Exception:
                                continue
                if df is not None:
                    break
            except Exception:
                continue
        if df is not None:
            break

    if df is None:
        df = pd.read_csv(csv_path, sep=';', decimal=',', encoding='utf-8')

    for col in ['Taxa Direito', 'Taxa Esquerdo']:
        if col in df.columns:
            if df[col].dtype == object:
                df[col] = df[col].astype(str).str.replace(',', '.').str.strip()
            df[col] = pd.to_numeric(df[col], errors='coerce')

    return df


def carregar_hb(excel_path):
    """Carrega Excel clínico. Assume sem cabeçalho, colunas A-H."""
    df = pd.read_excel(excel_path, header=None)
    df.columns = ['Nome', 'Sexo', 'Idade', 'Lado', 'Etiologia', 'HB', 'Evolucao', 'Tratamento']
    df['HB_norm'] = df['HB'].apply(normalizar_hb)
    df['Lado_norm'] = df['Lado'].apply(normalizar_lado)
    # paciente1 = linha 0, paciente2 = linha 1, ...
    df['Paciente_num'] = range(1, len(df) + 1)
    return df


def cor_ponto(lado_paciente, olho_plotado):
    """Retorna cor do ponto com base em qual olho está sendo plotado."""
    if lado_paciente == 'bilateral':
        return CORES['bilateral']
    if (olho_plotado == 'Direito' and lado_paciente == 'direito') or \
       (olho_plotado == 'Esquerdo' and lado_paciente == 'esquerdo'):
        return CORES['paralisado']
    return CORES['normal']


def gerar_graficos(csv_metricas, excel_hb, output_dir):
    os.makedirs(output_dir, exist_ok=True)

    print('\n' + '='*60)
    print('TAXA DE PISCADAS POR OLHO vs HOUSE-BRACKMANN')
    print('='*60)

    print('\n📊 Carregando dados...')
    df_metricas = carregar_metricas(csv_metricas)
    df_hb = carregar_hb(excel_hb)

    print(f'   Métricas: {len(df_metricas)} registros')
    print(f'   HB (Excel): {len(df_hb)} pacientes')

    # Extrair número do paciente do nome do arquivo
    df_metricas['Paciente_num'] = df_metricas['Arquivo'].apply(extrair_numero_paciente)

    n_sem_num = df_metricas['Paciente_num'].isna().sum()
    if n_sem_num > 0:
        print(f'   ⚠️  {n_sem_num} arquivo(s) sem número de paciente reconhecido')
        print(f'      Exemplos: {df_metricas[df_metricas["Paciente_num"].isna()]["Arquivo"].head(3).tolist()}')

    # Merge por número do paciente
    df = df_metricas.merge(
        df_hb[['Paciente_num', 'Nome', 'HB_norm', 'Lado_norm', 'HB']],
        on='Paciente_num',
        how='inner'
    )

    df = df[df['HB_norm'].notna()].copy()
    df['HB_order'] = df['HB_norm'].map(HB_NUMERIC)
    df = df.sort_values('HB_order')

    print(f'   Após merge: {len(df)} pacientes com HB + métricas')

    if len(df) == 0:
        print('\n❌ Nenhum paciente com dados completos. Verifique o padrão de nomes nos arquivos CSV.')
        print('   Esperado: "paciente1", "paciente2", ...')
        sys.exit(1)

    np.random.seed(42)

    for olho in ['Direito', 'Esquerdo']:
        col_taxa = f'Taxa {olho}'
        if col_taxa not in df.columns:
            print(f'   ⚠️  Coluna "{col_taxa}" não encontrada no CSV, pulando.')
            continue

        fig, ax = plt.subplots(figsize=(13, 7))

        cores_pts = [cor_ponto(row['Lado_norm'], olho) for _, row in df.iterrows()]
        jitter = np.random.uniform(-0.18, 0.18, size=len(df))
        x_vals = df['HB_order'].values + jitter

        scatter = ax.scatter(
            x_vals, df[col_taxa],
            c=cores_pts, s=90,
            edgecolor='black', linewidth=0.7,
            zorder=3, alpha=0.88
        )

        # Linha de média por grau HB
        for hb_label, hb_num in HB_NUMERIC.items():
            subset = df[df['HB_norm'] == hb_label][col_taxa].dropna()
            if len(subset) > 0:
                ax.hlines(
                    subset.mean(),
                    hb_num - 0.28, hb_num + 0.28,
                    colors='black', linewidth=2.5, zorder=4
                )
                ax.text(
                    hb_num + 0.31, subset.mean(),
                    f'{subset.mean():.1f}',
                    va='center', fontsize=9, color='black'
                )

        # Linha de referência do controle
        ax.axhline(
            MEDIA_CONTROLE, color='steelblue', linestyle='--',
            linewidth=1.5, alpha=0.8, zorder=2
        )
        ax.text(
            6.0, MEDIA_CONTROLE + 0.3,
            f'Controle\n({MEDIA_CONTROLE} pisc/min)',
            color='steelblue', fontsize=9, va='bottom', ha='right'
        )

        # Eixo X com labels dos graus HB
        ax.set_xticks(list(HB_NUMERIC.values()))
        ax.set_xticklabels(list(HB_NUMERIC.keys()), fontsize=12)
        ax.set_xlim(0.55, 6.35)
        ax.set_ylim(bottom=-0.5)

        ax.set_xlabel('Grau House-Brackmann', fontsize=13, labelpad=8)
        ax.set_ylabel('Taxa de Piscadas (pisc/min)', fontsize=13, labelpad=8)
        ax.set_title(
            f'Taxa de Piscadas — Olho {olho} vs Grau House-Brackmann\n'
            f'(n={df[col_taxa].notna().sum()} pacientes)',
            fontsize=14, pad=12
        )

        # Legenda
        patch_par = mpatches.Patch(color=CORES['paralisado'], label='Olho paralisado')
        patch_nor = mpatches.Patch(color=CORES['normal'],     label='Olho são')
        patch_bil = mpatches.Patch(color=CORES['bilateral'],  label='Bilateral')
        linha_med = plt.Line2D([0], [0], color='black',    linewidth=2.5, label='Média por grau HB')
        linha_ctrl= plt.Line2D([0], [0], color='steelblue', linewidth=1.5, linestyle='--', label='Média controle')

        ax.legend(
            handles=[patch_par, patch_nor, patch_bil, linha_med, linha_ctrl],
            fontsize=10, loc='upper right', framealpha=0.9
        )

        plt.tight_layout()
        nome_arquivo = f'taxa_hb_olho_{olho.lower()}.png'
        caminho = os.path.join(output_dir, nome_arquivo)
        plt.savefig(caminho, dpi=150, bbox_inches='tight')
        plt.close()
        print(f'\n   ✅ {nome_arquivo}')

    print(f'\n✅ Gráficos salvos em: {os.path.abspath(output_dir)}')
    print('='*60)


def main():
    parser = argparse.ArgumentParser(
        description='Gera gráficos de Taxa de Piscadas por Olho vs House-Brackmann.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  python gerar_grafico_taxa_por_hb.py paralisia.csv tabela_hb.xlsx
  python gerar_grafico_taxa_por_hb.py paralisia.csv tabela_hb.xlsx --saida ./graficos
        """
    )
    parser.add_argument('csv_metricas', help='CSV consolidado de métricas (saída do analisar_pasta_metricas.py)')
    parser.add_argument('excel_hb', help='Excel com dados clínicos (nome, lado paralisado, HB)')
    parser.add_argument('--saida', default='./graficos', help='Pasta de saída para os gráficos (padrão: ./graficos)')

    args = parser.parse_args()

    if not os.path.exists(args.csv_metricas):
        print(f'❌ CSV não encontrado: {args.csv_metricas}')
        sys.exit(1)
    if not os.path.exists(args.excel_hb):
        print(f'❌ Excel não encontrado: {args.excel_hb}')
        sys.exit(1)

    gerar_graficos(args.csv_metricas, args.excel_hb, args.saida)


if __name__ == '__main__':
    main()
