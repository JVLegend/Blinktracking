"""
BlinkTracking - Sistema de Análise de Piscadas
==============================================

Sistema avançado para análise e visualização de dados de piscadas oculares
detectadas através de vídeos, desenvolvido para pesquisa oftalmológica.

Uso:
    from blinktracking import BlinkTracker
    
    tracker = BlinkTracker(config_path="config.yaml")
    results = tracker.process_video("video.mp4")
    tracker.save_results(results, "output.json")

Autor: João Victor Dias
Orientador: Dr. Pedro Carricondo
Instituição: HC-FMUSP
"""

__version__ = "2.0.0"
__author__ = "João Victor Dias"

from .tracker import BlinkTracker
from .config import Config
from .metrics import BlinkMetrics
from .filters import KalmanFilter, MovingAverageFilter
from .pipeline import BatchProcessor

__all__ = [
    "BlinkTracker",
    "Config", 
    "BlinkMetrics",
    "KalmanFilter",
    "MovingAverageFilter",
    "BatchProcessor",
]
