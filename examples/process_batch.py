"""
Exemplo: Processamento em lote (batch)
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from blinktracking import BatchProcessor, Config


def main():
    # Configuração
    config = Config()
    config.save_debug_video = False  # Desligar para processamento mais rápido
    
    # Criar processor
    processor = BatchProcessor(config, max_workers=4)
    
    # Callback de progresso
    def on_progress(current, total, video):
        print(f"[{current}/{total}] {Path(video).name}")
    
    processor.progress_callback = on_progress
    
    # Pastas
    input_folder = sys.argv[1] if len(sys.argv) > 1 else "videos"
    output_folder = sys.argv[2] if len(sys.argv) > 2 else "batch_output"
    
    print(f"Processando vídeos de: {input_folder}")
    print(f"Salvando em: {output_folder}")
    print("-" * 50)
    
    # Processar
    results = processor.process_folder(
        input_folder=input_folder,
        output_folder=output_folder,
        extensions=['.mp4', '.avi', '.mov'],
        recursive=True,
        parallel=True
    )
    
    # Resumo
    successful = sum(1 for r in results if r.success)
    failed = len(results) - successful
    
    print("\n" + "=" * 50)
    print("RESUMO DO PROCESSAMENTO")
    print("=" * 50)
    print(f"Total: {len(results)}")
    print(f"Sucesso: {successful}")
    print(f"Falhas: {failed}")
    
    if failed > 0:
        print("\nFalhas:")
        for r in results:
            if not r.success:
                print(f"  - {Path(r.video_path).name}: {r.error}")


if __name__ == "__main__":
    main()
