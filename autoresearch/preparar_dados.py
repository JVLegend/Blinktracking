"""
autoresearch/preparar_dados.py
================================
PRÉ-REQUISITO: rode este script UMA VEZ antes de iniciar o loop.

O que faz:
  1. Lê tabela_HB.xlsx para saber quais pacientes usar
  2. Para cada paciente, espera um CSV em tmp/paralisia/<id>*.csv
  3. Roda analisar_metricas_completas.py em cada CSV
  4. Salva o Excel de métricas em tmp/resultados_paralisia/<id>.xlsx
  5. Faz o mesmo para controles em tmp/controle/ → tmp/resultados_controle/

Convenção de nome de arquivo CSV:
  - tmp/paralisia/<ID_ou_NOME>.csv  (ou qualquer nome único por paciente)
  - O script associa pelo nome do arquivo ao paciente na tabela_HB.xlsx

Usage:
  python autoresearch/preparar_dados.py
  python autoresearch/preparar_dados.py --force   # reprocessa mesmo se Excel já existe
"""

import subprocess
import argparse
import sys
from pathlib import Path

ROOT           = Path(__file__).parent.parent
TMP            = ROOT / "tmp"
PARALISIA_DIR  = TMP / "paralisia"
CONTROLE_DIR   = TMP / "controle"
OUT_PARALISIA  = TMP / "resultados_paralisia"
OUT_CONTROLE   = TMP / "resultados_controle"
SCRIPT         = ROOT / "scripts" / "analisar_metricas_completas.py"


def process_folder(input_dir: Path, output_dir: Path, group_label: str, force: bool):
    output_dir.mkdir(exist_ok=True)

    csvs = list(input_dir.glob("*.csv"))
    if not csvs:
        print(f"  [WARN] Nenhum CSV encontrado em {input_dir}")
        return

    print(f"\n  Processando {len(csvs)} CSVs de {group_label}...")

    for csv_file in sorted(csvs):
        patient_id = csv_file.stem
        out_excel  = output_dir / f"{patient_id}.xlsx"

        if out_excel.exists() and not force:
            print(f"    [SKIP] {patient_id} — Excel já existe")
            continue

        print(f"    → {patient_id} ... ", end="", flush=True)
        ret = subprocess.run(
            [sys.executable, str(SCRIPT), str(csv_file), str(out_excel)],
            capture_output=True, text=True
        )

        if ret.returncode == 0:
            print("OK")
        else:
            print(f"ERRO\n      {ret.stderr.strip()[:200]}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Reprocessa mesmo se Excel já existe")
    args = parser.parse_args()

    print("\n" + "="*60)
    print("  PREPARAR DADOS — BlinkTracking Autoresearch")
    print("="*60)

    if not PARALISIA_DIR.exists():
        print(f"\n  [ERRO] Pasta não encontrada: {PARALISIA_DIR}")
        print("  Crie a pasta e coloque os CSVs dos pacientes de paralisia.")
        sys.exit(1)

    process_folder(PARALISIA_DIR, OUT_PARALISIA, "paralisia", args.force)

    if CONTROLE_DIR.exists():
        process_folder(CONTROLE_DIR, OUT_CONTROLE, "controle", args.force)
    else:
        print(f"\n  [INFO] Pasta controle não encontrada ({CONTROLE_DIR}) — pulando.")

    print("\n  Preparação concluída.")
    print(f"  Resultados paralisia: {OUT_PARALISIA}")
    print(f"  Resultados controle:  {OUT_CONTROLE}")
    print("\n  Próximo passo:")
    print("    python autoresearch/research.py --run 1")
    print("    # ou para o loop completo:")
    print("    python autoresearch/run_loop.py --runs 20")


if __name__ == "__main__":
    main()
