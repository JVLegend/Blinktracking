"""
Exemplo: Usar configuração customizada
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from blinktracking import BlinkTracker, Config


def main():
    # Carregar configuração de arquivo
    # config = Config.from_yaml("meu_config.yaml")
    
    # Ou criar programaticamente
    config = Config()
    
    # Ajustar thresholds para detecção mais sensível
    config.thresholds.blink_threshold_percent = 25.0  # Mais sensível
    config.thresholds.min_blink_duration_ms = 80      # Piscadas mais curtas
    
    # Ajustar filtros
    config.filters.enable_kalman = True
    config.filters.enable_moving_average = True
    config.filters.moving_average_window = 7  # Janela maior = mais suave
    
    # Salvar config para uso futuro
    config.to_yaml("minha_config.yaml")
    print("Configuração salva em: minha_config.yaml")
    
    # Usar no tracker
    tracker = BlinkTracker(config)
    print("Tracker criado com configuração customizada!")
    print(f"Threshold: {config.thresholds.blink_threshold_percent}%")
    print(f"Kalman: {config.filters.enable_kalman}")
    print(f"Moving Average: {config.filters.enable_moving_average}")


if __name__ == "__main__":
    main()
