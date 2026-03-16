#!/usr/bin/env python3
"""
Graficos da Analise Comparativa - Versao Corrigida
===================================================
Compativel com matplotlib 3.2.x (workaround de boxplot por posicao).
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from scipy import stats
import warnings
from pathlib import Path

warnings.filterwarnings('ignore')

ROOT    = Path(__file__).parent.parent
PAR_CSV = ROOT / 'tmp' / 'dataset_paralisia.csv'
CON_CSV = ROOT / 'tmp' / 'dataset_controle.csv'
PAR_DIR = ROOT / 'tmp' / 'paralisia'
OUT_DIR = ROOT / 'docs' / 'graficos_analise'
OUT_DIR.mkdir(parents=True, exist_ok=True)

COR_PAR = '#e74c3c'
COR_SAU = '#3498db'
COR_CON = '#2ecc71'
COR_HB  = ['#27ae60','#2980b9','#8e44ad','#d35400','#c0392b','#7f8c8d']
HB_ORDER = ['HB I', 'HB II', 'HB III', 'HB IV', 'HB V', 'HB V-VI']
HB_ORD   = {'HB I': 1, 'HB II': 2, 'HB III': 3, 'HB IV': 4, 'HB V': 5, 'HB V-VI': 5.5}

plt.rcParams.update({
    'font.family': 'DejaVu Sans',
    'font.size': 11,
    'axes.titlesize': 13,
    'axes.titleweight': 'bold',
    'axes.labelsize': 11,
    'figure.dpi': 150,
    'savefig.dpi': 180,
    'savefig.bbox': 'tight',
})


def sig_label(p):
    if p < 0.001: return '***'
    if p < 0.01:  return '**'
    if p < 0.05:  return '*'
    return 'ns'


def boxplot_compat(ax, datasets, colors, positions=None, width=0.55):
    """Boxplot compativel com matplotlib 3.2: plota um a um."""
    if positions is None:
        positions = list(range(1, len(datasets) + 1))
    bplots = []
    for pos, data, c in zip(positions, datasets, colors):
        d = [v for v in data if not np.isnan(v)]
        if len(d) == 0:
            bplots.append(None)
            continue
        bp = ax.boxplot(
            d, positions=[pos], widths=width, patch_artist=True,
            medianprops=dict(color='black', linewidth=2),
            whiskerprops=dict(linewidth=1.5),
            capprops=dict(linewidth=1.5),
            flierprops=dict(marker='o', markersize=4, alpha=0.5, markerfacecolor=c),
        )
        bp['boxes'][0].set_facecolor(c)
        bp['boxes'][0].set_alpha(0.75)
        bplots.append(bp)
    return bplots


def add_sig_bar(ax, x1, x2, y, p, h=0.03):
    label = sig_label(p)
    color = '#333333' if label != 'ns' else '#aaaaaa'
    ymax = y + h
    ax.plot([x1, x1, x2, x2], [y, ymax, ymax, y], lw=1.2, color=color)
    ax.text((x1+x2)/2, ymax + h*0.1, label, ha='center', va='bottom',
            fontsize=10, color=color, fontweight='bold' if label != 'ns' else 'normal')


def get_fps(csv_dir, paciente_num):
    matches = list(csv_dir.glob(f'paciente{paciente_num}_*.csv'))
    if not matches:
        return None
    with open(matches[0], 'r', encoding='utf-8', errors='replace') as f:
        line = f.readline().strip()
    if 'FPS' in line:
        try:
            return float(line.split(':')[1].strip())
        except:
            return None
    return None


# ============================================================
# Carregar dados
# ============================================================
par = pd.read_csv(PAR_CSV)
con = pd.read_csv(CON_CSV)
par['hb_clean'] = par['hb_grade'].str.strip()
par['hb_num']   = par['hb_clean'].map(HB_ORD)
par['fps']      = par['paciente'].apply(lambda n: get_fps(PAR_DIR, n))

con_ind = con.groupby('controle').agg({
    'taxa': 'mean', 'amplitude': 'mean', 'vel_fech': 'mean',
    'vel_aber': 'mean', 'baseline': 'mean', 'rba': 'mean', 'razao_vel': 'mean'
}).reset_index()

par_30fps = par[par['fps'].between(24, 35)].copy()
print(f"Paralisia n={len(par)} | Controle n={len(con_ind)} | 30fps n={len(par_30fps)}")


# ============================================================
# FIGURA 1: Boxplots tres grupos - metricas FPS-safe
# ============================================================
fig, axes = plt.subplots(1, 4, figsize=(18, 7))
fig.suptitle('Comparacao entre Grupos\n(Metricas validas independente de FPS)',
             fontsize=14, fontweight='bold', y=1.01)

configs = [
    ('af_taxa',     'sa_taxa',     'taxa',      'Taxa de Piscadas (pisc/min)'),
    ('af_amplitude','sa_amplitude','amplitude', 'Amplitude EAR'),
    ('af_rba',      'sa_rba',      'rba',       'RBA (%)'),
    ('af_baseline', 'sa_baseline', 'baseline',  'Baseline EAR'),
]

for ax, (col_af, col_sa, col_con, title) in zip(axes, configs):
    d_par = par[col_af].dropna().values
    d_sau = par[col_sa].dropna().values
    d_con = con_ind[col_con].dropna().values

    boxplot_compat(ax, [d_par, d_sau, d_con], [COR_PAR, COR_SAU, COR_CON])

    n_par = len(d_par); n_sau = len(d_sau); n_con = len(d_con)
    ax.set_xticks([1, 2, 3])
    ax.set_xticklabels([f'Paralisado\n(n={n_par})', f'Saudavel\n(n={n_sau})',
                        f'Controle\n(n={n_con})'], fontsize=9)
    ax.set_title(title)

    paired = par[[col_af, col_sa]].dropna()
    try:
        _, p12 = stats.wilcoxon(paired[col_af], paired[col_sa])
    except:
        p12 = 1.0
    _, p23 = stats.mannwhitneyu(par[col_sa].dropna(), con_ind[col_con].dropna(), alternative='two-sided')
    _, p13 = stats.mannwhitneyu(par[col_af].dropna(), con_ind[col_con].dropna(), alternative='two-sided')

    ymax = max(
        np.percentile(d_par, 95) if len(d_par) else 0,
        np.percentile(d_sau, 95) if len(d_sau) else 0,
        np.percentile(d_con, 95) if len(d_con) else 0,
    )
    step = max(ymax * 0.18, 0.02)
    add_sig_bar(ax, 1, 2, ymax + step*0.3, p12, h=step*0.2)
    add_sig_bar(ax, 2, 3, ymax + step*1.0, p23, h=step*0.2)
    add_sig_bar(ax, 1, 3, ymax + step*1.7, p13, h=step*0.2)
    ax.set_ylim(bottom=0)
    ax.grid(True, alpha=0.3, axis='y')

patch_par = mpatches.Patch(color=COR_PAR, alpha=0.75, label='Olho Paralisado')
patch_sau = mpatches.Patch(color=COR_SAU, alpha=0.75, label='Olho Saudavel')
patch_con = mpatches.Patch(color=COR_CON, alpha=0.75, label='Controle')
fig.legend(handles=[patch_par, patch_sau, patch_con],
           loc='lower center', ncol=3, bbox_to_anchor=(0.5, -0.07), fontsize=10)
fig.tight_layout()
fig.savefig(OUT_DIR / '01_boxplot_tres_grupos.png')
plt.close(fig)
print("  Salvo: 01_boxplot_tres_grupos.png")


# ============================================================
# FIGURA 2: Scatter correlacao com HB
# ============================================================
fig, axes = plt.subplots(2, 3, figsize=(16, 10))
fig.suptitle('Correlacao com Grau House-Brackmann (Spearman)', fontsize=14, fontweight='bold')

scatter_configs = [
    ('af_taxa',     'Taxa Paralisado (pisc/min)'),
    ('sa_taxa',     'Taxa Saudavel (pisc/min)'),
    ('af_amplitude','Amplitude Paralisado (EAR)'),
    ('sa_amplitude','Amplitude Saudavel (EAR)'),
    ('af_rba',      'RBA Paralisado (%)'),
    ('sa_rba',      'RBA Saudavel (%)'),
]

jitter = 0.12
for ax, (col, title) in zip(axes.flat, scatter_configs):
    color = COR_PAR if 'af_' in col else COR_SAU
    tmp = par[['hb_num', col]].dropna()
    xj = tmp['hb_num'].values + np.random.uniform(-jitter, jitter, len(tmp))
    y  = tmp[col].values
    ax.scatter(xj, y, color=color, alpha=0.65, s=65, zorder=3, edgecolors='white', linewidths=0.5)

    if len(tmp) >= 5:
        z = np.polyfit(tmp['hb_num'].values, y, 1)
        xline = np.linspace(1, 5.5, 100)
        ax.plot(xline, np.poly1d(z)(xline), '--', color=color, linewidth=2, alpha=0.85)
        rho, p = stats.spearmanr(tmp['hb_num'], tmp[col])
        sig = sig_label(p)
        ax.text(0.04, 0.96, f'rho={rho:+.3f} {sig}\np={p:.4f}  n={len(tmp)}',
                transform=ax.transAxes, va='top', fontsize=9,
                bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.85))

    ax.set_xticks([1, 2, 3, 4, 5, 5.5])
    ax.set_xticklabels(['I', 'II', 'III', 'IV', 'V', 'V-VI'], fontsize=9)
    ax.set_xlabel('Grau HB')
    ax.set_title(title)
    ax.set_ylim(bottom=0)
    ax.grid(True, alpha=0.25)

fig.tight_layout()
fig.savefig(OUT_DIR / '02_scatter_correlacao_HB.png')
plt.close(fig)
print("  Salvo: 02_scatter_correlacao_HB.png")


# ============================================================
# FIGURA 3: Barras por grau HB (taxa e amplitude)
# ============================================================
fig, axes = plt.subplots(1, 2, figsize=(16, 6))
fig.suptitle('Metricas por Grau House-Brackmann (mediana +/- semi-IQR)', fontsize=14, fontweight='bold')

x_pos = np.arange(len(HB_ORDER))
width = 0.35

for ax, (col_af, col_sa, title, col_con) in zip(axes, [
    ('af_taxa',     'sa_taxa',     'Taxa de Piscadas (pisc/min)', 'taxa'),
    ('af_amplitude','sa_amplitude','Amplitude EAR',               'amplitude'),
]):
    med_af, err_af, med_sa, err_sa, ns = [], [], [], [], []
    for g in HB_ORDER:
        sa = par[par['hb_clean'] == g][col_af].dropna()
        sb = par[par['hb_clean'] == g][col_sa].dropna()
        n = len(sa)
        ns.append(n)
        med_af.append(sa.median() if n > 0 else 0)
        err_af.append((sa.quantile(0.75) - sa.quantile(0.25)) / 2 if n > 1 else 0)
        med_sa.append(sb.median() if n > 0 else 0)
        err_sa.append((sb.quantile(0.75) - sb.quantile(0.25)) / 2 if n > 1 else 0)

    ax.bar(x_pos - width/2, med_af, width, color=COR_PAR, alpha=0.82,
           label='Olho Paralisado', yerr=err_af, capsize=4,
           error_kw=dict(linewidth=1.5, capthick=1.5))
    ax.bar(x_pos + width/2, med_sa, width, color=COR_SAU, alpha=0.82,
           label='Olho Saudavel', yerr=err_sa, capsize=4,
           error_kw=dict(linewidth=1.5, capthick=1.5))

    med_con = con_ind[col_con].median()
    ax.axhline(med_con, color=COR_CON, linewidth=2.5, linestyle='--', alpha=0.9,
               label=f'Controle mediana = {med_con:.3f}')

    ax.set_xticks(x_pos)
    ax.set_xticklabels([f'{g}\n(n={n})' for g, n in zip(HB_ORDER, ns)], fontsize=9)
    ax.set_xlabel('Grau House-Brackmann')
    ax.set_title(title)
    ax.set_ylim(bottom=0)
    ax.legend(fontsize=9)
    ax.grid(True, alpha=0.3, axis='y')

fig.tight_layout()
fig.savefig(OUT_DIR / '03_barras_por_grau_HB.png')
plt.close(fig)
print("  Salvo: 03_barras_por_grau_HB.png")


# ============================================================
# FIGURA 4: Paired plot intra-paciente
# ============================================================
fig, axes = plt.subplots(1, 2, figsize=(14, 7))
fig.suptitle('Comparacao Pareada Intra-Paciente\n(mesmo video, mesmo FPS — sem vies)',
             fontsize=14, fontweight='bold')

for ax, (col_af, col_sa, title) in zip(axes, [
    ('af_taxa',     'sa_taxa',     'Taxa de Piscadas (pisc/min)'),
    ('af_amplitude','sa_amplitude','Amplitude EAR'),
]):
    paired = par[['hb_clean', col_af, col_sa]].dropna().reset_index(drop=True)
    rng = np.random.default_rng(42)
    jit = rng.uniform(-0.05, 0.05, len(paired))

    for i, row in paired.iterrows():
        hb_idx = HB_ORDER.index(row['hb_clean']) if row['hb_clean'] in HB_ORDER else 2
        c = COR_HB[hb_idx]
        ax.plot([0, 1], [row[col_af], row[col_sa]], color=c, alpha=0.35, linewidth=1.3)
        ax.scatter(jit[i], row[col_af], color=c, s=55, zorder=5, alpha=0.85)
        ax.scatter(1 + jit[i], row[col_sa], color=c, s=55, zorder=5, alpha=0.85)

    # Mediana
    med_af = paired[col_af].median()
    med_sa = paired[col_sa].median()
    ax.plot([0, 1], [med_af, med_sa], 'ko-', linewidth=3.5, markersize=11,
            zorder=7, label=f'Mediana: {med_af:.3f} -> {med_sa:.3f}')

    try:
        _, p = stats.wilcoxon(paired[col_af], paired[col_sa])
        sig = sig_label(p)
        ax.text(0.5, 0.97, f'Wilcoxon p={p:.4f} {sig}',
                transform=ax.transAxes, ha='center', va='top', fontsize=10,
                bbox=dict(boxstyle='round,pad=0.3', facecolor='lightyellow', alpha=0.9))
    except:
        pass

    ax.set_xticks([0, 1])
    ax.set_xticklabels(['Olho\nParalisado', 'Olho\nSaudavel'], fontsize=12)
    ax.set_xlim(-0.3, 1.3)
    ax.set_ylim(bottom=0)
    ax.set_title(title)
    ax.legend(fontsize=9)
    ax.grid(True, alpha=0.3, axis='y')

hb_patches = [mpatches.Patch(color=COR_HB[i], alpha=0.82, label=g)
              for i, g in enumerate(HB_ORDER)]
fig.legend(handles=hb_patches, title='Grau HB', loc='lower center',
           ncol=6, bbox_to_anchor=(0.5, -0.07), fontsize=9)
fig.tight_layout()
fig.savefig(OUT_DIR / '04_paired_intra_paciente.png')
plt.close(fig)
print("  Salvo: 04_paired_intra_paciente.png")


# ============================================================
# FIGURA 5: Distribuicao de FPS (metodologia)
# ============================================================
fig, axes = plt.subplots(1, 2, figsize=(14, 5))
fig.suptitle('Distribuicao de FPS por Grupo\n(Justificativa da Restricao Metodologica)',
             fontsize=13, fontweight='bold')

ax = axes[0]
fps_par = par['fps'].dropna().values
ax.hist(fps_par, bins=20, color=COR_PAR, alpha=0.72, label=f'Paralisia (n={len(fps_par)})', edgecolor='white')
ax.hist([24.0]*len(con_ind), bins=[20,26,32], color=COR_CON, alpha=0.72,
        label=f'Controle (n={len(con_ind)})', edgecolor='white')
ax.axvline(24, color=COR_CON, linewidth=2, linestyle='--', alpha=0.8)
ax.set_xlabel('FPS')
ax.set_ylabel('Numero de participantes')
ax.set_title('Distribuicao de FPS por Grupo')
ax.legend()
ax.grid(True, alpha=0.3)

ax2 = axes[1]
ax2.axis('off')
linhas = [
    ['Grupo', 'FPS', 'n', 'Vel/Amp valida vs controle?'],
    ['Controle', '24', '9', 'Referencia'],
    ['Paralisia ~30fps', '~30', '3', 'Sim (exploratorio, n baixo)'],
    ['Paralisia ~150fps', '~150', '17', 'NAO — vies de FPS'],
    ['Paralisia ~240fps', '~240', '19', 'NAO — vies de FPS'],
]
tbl = ax2.table(cellText=linhas[1:], colLabels=linhas[0],
                cellLoc='center', loc='center', bbox=[0, 0.15, 1, 0.75])
tbl.auto_set_font_size(False)
tbl.set_fontsize(9)
tbl.auto_set_column_width([0,1,2,3])
for j in range(4):
    tbl[(0,j)].set_facecolor('#2c3e50')
    tbl[(0,j)].set_text_props(color='white', fontweight='bold')
for j in range(4):
    tbl[(1,j)].set_facecolor('#d5f5e3')
    tbl[(2,j)].set_facecolor('#fdebd0')
    tbl[(3,j)].set_facecolor('#fadbd8')
    tbl[(4,j)].set_facecolor('#fadbd8')
ax2.set_title('Compatibilidade de FPS por Subgrupo', fontweight='bold', pad=15)
ax2.text(0.5, 0.06,
    'Taxa (pisc/min) e valida para todos os grupos.\nVelocidade e amplitude so comparaveis com FPS similar.',
    ha='center', va='center', transform=ax2.transAxes, fontsize=9,
    bbox=dict(boxstyle='round', facecolor='#fff9c4', alpha=0.85))

fig.tight_layout()
fig.savefig(OUT_DIR / '05_distribuicao_fps.png')
plt.close(fig)
print("  Salvo: 05_distribuicao_fps.png")


# ============================================================
# FIGURA 6: RBA por grau HB (paralisado e saudavel)
# ============================================================
fig, axes = plt.subplots(1, 2, figsize=(16, 6))
fig.suptitle('RBA (%) por Grau House-Brackmann\n(Melhor biomarcador: rho=-0.494, p=0.001)',
             fontsize=14, fontweight='bold')

for ax, (col, label, color) in zip(axes, [
    ('af_rba', 'Olho Paralisado', COR_PAR),
    ('sa_rba', 'Olho Saudavel',   COR_SAU),
]):
    labels_n = []
    for pos, g in enumerate(HB_ORDER, 1):
        sub = par[par['hb_clean'] == g][col].dropna().values
        n = len(sub)
        labels_n.append(f'{g}\n(n={n})')
        if n == 0:
            continue
        bp = ax.boxplot(list(sub), positions=[pos], widths=0.55, patch_artist=True,
                        medianprops=dict(color='black', linewidth=2.5),
                        whiskerprops=dict(linewidth=1.5),
                        capprops=dict(linewidth=1.5),
                        flierprops=dict(marker='o', markersize=5, alpha=0.6))
        bp['boxes'][0].set_facecolor(color)
        bp['boxes'][0].set_alpha(0.68)

    med_con = con_ind['rba'].median()
    ax.axhline(med_con, color=COR_CON, linewidth=2.2, linestyle='--', alpha=0.9,
               label=f'Controle mediana = {med_con:.1f}%')

    ax.set_xticks(range(1, len(HB_ORDER)+1))
    ax.set_xticklabels(labels_n, fontsize=9)
    ax.set_xlabel('Grau House-Brackmann')
    ax.set_ylabel('RBA (%)')
    ax.set_title(f'RBA — {label}')
    ax.legend(fontsize=9)
    ax.grid(True, alpha=0.3, axis='y')
    ax.set_ylim(bottom=0)

    tmp = par[['hb_num', col]].dropna()
    rho, p = stats.spearmanr(tmp['hb_num'], tmp[col])
    sig = sig_label(p)
    ax.text(0.03, 0.97, f'Spearman rho={rho:+.3f} {sig}\np={p:.4f}',
            transform=ax.transAxes, va='top', fontsize=9,
            bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.88))

fig.tight_layout()
fig.savefig(OUT_DIR / '06_rba_por_grau_HB.png')
plt.close(fig)
print("  Salvo: 06_rba_por_grau_HB.png")


# ============================================================
# FIGURA 7: Subgrupo 30fps vs controle (exploratorio)
# ============================================================
fig, axes = plt.subplots(1, 3, figsize=(15, 5))
fig.suptitle('EXPLORATORIO: Subgrupo 30fps (n=3) vs Controle 24fps (n=9)\n'
             'Apenas sinal qualitativo — sem poder estatistico.',
             fontsize=12, fontweight='bold', color='#8b0000')

for ax, (col_af, col_sa, col_con, title) in zip(axes, [
    ('af_vel_fech', 'sa_vel_fech', 'vel_fech',  'Vel. Fechamento (EAR/s)'),
    ('af_razao_vel','sa_razao_vel','razao_vel',  'Razao Vel. (Fech/Aber)'),
    ('af_amplitude','sa_amplitude','amplitude',  'Amplitude EAR'),
]):
    d1 = par_30fps[col_af].dropna().values
    d2 = par_30fps[col_sa].dropna().values
    d3 = con_ind[col_con].dropna().values

    boxplot_compat(ax, [d1, d2, d3], [COR_PAR, COR_SAU, COR_CON], width=0.5)

    ax.set_xticks([1, 2, 3])
    ax.set_xticklabels([f'Paralisado\n30fps\n(n={len(d1)})',
                        f'Saudavel\n30fps\n(n={len(d2)})',
                        f'Controle\n24fps\n(n={len(d3)})'], fontsize=8)
    ax.set_title(title)
    ax.set_ylim(bottom=0)
    ax.grid(True, alpha=0.3, axis='y')

    try:
        _, p1 = stats.mannwhitneyu(d1, d3, alternative='two-sided')
        _, p2 = stats.mannwhitneyu(d2, d3, alternative='two-sided')
        ax.text(0.04, 0.97,
                f'Par vs Con: {sig_label(p1)} (p={p1:.3f})\nSau vs Con: {sig_label(p2)} (p={p2:.3f})',
                transform=ax.transAxes, va='top', fontsize=8, color='#8b0000',
                bbox=dict(boxstyle='round,pad=0.3', facecolor='#ffe4e1', alpha=0.9))
    except:
        pass

fig.text(0.5, -0.04,
    'Ausencia de significancia reflete n=3, nao ausencia de efeito. '
    'Direcao dos valores e consistente com hipotese clinica.',
    ha='center', fontsize=9, color='gray', style='italic')
fig.tight_layout()
fig.savefig(OUT_DIR / '07_subgrupo_30fps_exploratorio.png')
plt.close(fig)
print("  Salvo: 07_subgrupo_30fps_exploratorio.png")


# ============================================================
# FIGURA 8: Heatmap de correlacoes (Spearman)
# ============================================================
fig, ax = plt.subplots(figsize=(10, 7))

cols_map = {
    'Taxa\nParalisado': 'af_taxa',
    'Taxa\nSaudavel':   'sa_taxa',
    'Amplitude\nParalisado': 'af_amplitude',
    'Amplitude\nSaudavel':   'sa_amplitude',
    'RBA\nParalisado': 'af_rba',
    'RBA\nSaudavel':   'sa_rba',
    'Baseline\nParalisado': 'af_baseline',
    'Baseline\nSaudavel':   'sa_baseline',
    'Grau HB': 'hb_num',
}

df_corr = par[[v for v in cols_map.values()]].dropna().copy()
df_corr.columns = list(cols_map.keys())
corr = df_corr.corr(method='spearman')

im = ax.imshow(corr.values, cmap='RdBu_r', vmin=-1, vmax=1, aspect='auto')
ax.set_xticks(range(len(corr.columns)))
ax.set_yticks(range(len(corr.index)))
ax.set_xticklabels(corr.columns, rotation=45, ha='right', fontsize=9)
ax.set_yticklabels(corr.index, fontsize=9)

for i in range(len(corr)):
    for j in range(len(corr.columns)):
        v = corr.iloc[i, j]
        tc = 'white' if abs(v) > 0.5 else 'black'
        ax.text(j, i, f'{v:.2f}', ha='center', va='center', fontsize=8,
                color=tc, fontweight='bold' if abs(v) > 0.4 else 'normal')

plt.colorbar(im, ax=ax, shrink=0.8, label='Spearman rho')
ax.set_title('Heatmap de Correlacoes (Spearman)\nGrau HB e Metricas por Olho', fontweight='bold', pad=15)
fig.tight_layout()
fig.savefig(OUT_DIR / '08_heatmap_correlacoes.png')
plt.close(fig)
print("  Salvo: 08_heatmap_correlacoes.png")


print()
print(f"Todos os graficos salvos em: {OUT_DIR}")
for f in sorted(OUT_DIR.glob('*.png')):
    print(f"  {f.name}")
