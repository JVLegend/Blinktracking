"""
Exemplo: Processar um único vídeo
"""

import sys
from pathlib import Path

# Adicionar blinktracking ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

from blinktracking import BlinkTracker, Config


def main():
    # Usar configuração padrão
    config = Config()
    
    # Criar tracker
    tracker = BlinkTracker(config)
    
    # Definir callback de progresso
    def on_progress(current, total):
        percent = (current / total) * 100
        print(f"\rProgresso: {percent:.1f}% ({current}/{total})", end='')
    
    tracker.progress_callback = on_progress
    
    # Processar vídeo
    video_path = sys.argv[1] if len(sys.argv) > 1 else "video.mp4"
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "output"
    
    print(f"Processando: {video_path}")
    print(f"Saída: {output_dir}")
    print("-" * 50)
    
    results = tracker.process_video(
        video_path=video_path,
        output_dir=output_dir,
        save_csv=True,
        save_json=True,
        save_debug_video=True
    )
    
    print("\n" + "=" * 50)
    print("RESULTADOS")
    print("=" * 50)
    
    # Métricas
    metrics = results['metrics']['combined']
    print(f"Total de piscadas: {metrics['total_blinks']}")
    print(f"Taxa: {metrics['blink_rate_per_minute']:.1f} piscadas/min")
    print(f"Duração média: {metrics['duration_ms']['mean']:.1f}ms")
    print(f"Piscadas completas: {metrics['completeness']['complete_ratio']*100:.1f}%")
    
    print(f"\nArquivos salvos em: {output_dir}")


if __name__ == "__main__":
    main()
