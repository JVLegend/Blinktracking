import os
import sys
import subprocess
import argparse
from pathlib import Path
import time

def run_command(command, description):
    """Executa um comando no shell e trata erros basicos."""
    print(f"\n🚀 Iniciando: {description}...")
    try:
        # Usamos shell=True para garantir que funcione bem no Windows com paths
        result = subprocess.run(command, shell=True, check=True)
        if result.returncode == 0:
            print(f"✅ Sucesso: {description}")
            return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Erro ao executar {description}: {e}")
        return False
    return False

def process_folder(folder_path):
    # Extensões de vídeo suportadas
    video_extensions = {'.mp4', '.mov', '.avi', '.mkv'}
    
    # Converter para objeto Path para facilitar manipulação
    folder = Path(folder_path)
    
    if not folder.exists():
        print(f"❌ Erro: A pasta '{folder_path}' não existe.")
        return

    # Listar todos os arquivos de vídeo
    videos = [f for f in folder.iterdir() if f.suffix.lower() in video_extensions]
    
    if not videos:
        print(f"⚠️ Nenhum vídeo encontrado na pasta '{folder_path}' com as extensões: {video_extensions}")
        return

    print(f"📂 Pasta: {folder}")
    print(f"🎬 Vídeos encontrados: {len(videos)}")
    print("-" * 50)

    # Diretório dos scripts (assume que este script está na mesma pasta 'scripts/')
    scripts_dir = Path(__file__).parent
    
    # Caminhos absolutos dos scripts
    script_extract_points = scripts_dir / "extract_points_to_csv.py"
    script_process_video = scripts_dir / "process_video_mediapipe.py"
    script_extract_all = scripts_dir / "extract_all_points_to_csv.py"

    success_count = 0
    
    for i, video in enumerate(videos, 1):
        print(f"\n[{i}/{len(videos)}] Processando vídeo: {video.name}")
        print("=" * 50)
        
        # 1. Extrair pontos simplificados (CSV)
        cmd1 = f'python "{script_extract_points}" "{video}"'
        if not run_command(cmd1, "Extração de Pontos Simplificados"):
            continue

        # 2. Processar vídeo visual (Desenhar landmarks)
        # O script original pede um diretório de saída temporário como 2º argumento
        # Vamos salvar na mesma pasta do vídeo original por padrão
        # cmd2 = f'python "{script_process_video}" "{video}" "{folder}"'
        # if not run_command(cmd2, "Geração de Vídeo Visual (Landmarks)"):
        #     continue

        # 3. Extrair TODOS os pontos (CSV Completo - 478 pts)
        cmd3 = f'python "{script_extract_all}" "{video}"'
        if not run_command(cmd3, "Extração Completa (478 pontos)"):
            continue

        success_count += 1
        print(f"✨ Vídeo '{video.name}' finalizado com sucesso!")

    print("\n" + "=" * 50)
    print(f"🏁 Processamento Geral Concluído!")
    print(f"📈 Total processado com sucesso: {success_count} / {len(videos)}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Processa todos os vídeos de uma pasta usando os 3 scripts de análise do Blinktracking.")
    parser.add_argument("pasta", help="Caminho da pasta contendo os vídeos")
    
    args = parser.parse_args()
    
    process_folder(args.pasta)
