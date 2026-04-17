"""
Configuração centralizada do BlinkTracking
"""

import yaml
import json
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Tuple


@dataclass
class EyeLandmarks:
    """Configuração dos landmarks dos olhos"""
    upper: List[int]
    lower: List[int]
    iris: List[int]
    contour: List[int]
    caruncula: int  # Ponto de referência para normalização


@dataclass
class DetectionParams:
    """Parâmetros de detecção facial"""
    static_image_mode: bool = False
    max_num_faces: int = 1
    refine_landmarks: bool = True
    min_detection_confidence: float = 0.5
    min_tracking_confidence: float = 0.5


@dataclass
class FilterParams:
    """Parâmetros de filtragem e estabilização"""
    enable_kalman: bool = True
    enable_moving_average: bool = True
    moving_average_window: int = 5
    kalman_process_noise: float = 1e-4
    kalman_measurement_noise: float = 1e-2


@dataclass
class BlinkThresholds:
    """Limites para detecção de piscadas"""
    blink_threshold_percent: float = 30.0
    complete_blink_threshold: float = 90.0
    min_blink_duration_ms: int = 100
    max_blink_duration_ms: int = 400


@dataclass
class Config:
    """Configuração global do sistema"""
    
    # Versão
    version: str = "2.0.0"
    
    # Landmarks
    right_eye: EyeLandmarks = field(default_factory=lambda: EyeLandmarks(
        upper=[246, 161, 160, 159, 158, 157, 173],
        lower=[33, 7, 163, 144, 145, 153, 154, 155, 133],
        iris=[469, 470, 471, 472],
        contour=[33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
        caruncula=39
    ))
    
    left_eye: EyeLandmarks = field(default_factory=lambda: EyeLandmarks(
        upper=[466, 388, 387, 386, 385, 384, 398],
        lower=[263, 249, 390, 373, 374, 380, 381, 382, 362],
        iris=[474, 475, 476, 477],
        contour=[362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398],
        caruncula=42
    ))
    
    # Parâmetros
    detection: DetectionParams = field(default_factory=DetectionParams)
    filters: FilterParams = field(default_factory=FilterParams)
    thresholds: BlinkThresholds = field(default_factory=BlinkThresholds)
    
    # Processamento
    output_format: str = "csv"  # csv, json, parquet
    save_debug_video: bool = False
    save_landmarks: bool = True
    
    @classmethod
    def from_yaml(cls, path: str) -> "Config":
        """Carrega configuração de arquivo YAML"""
        with open(path, 'r') as f:
            data = yaml.safe_load(f)
        return cls(**data)
    
    @classmethod
    def from_json(cls, path: str) -> "Config":
        """Carrega configuração de arquivo JSON"""
        with open(path, 'r') as f:
            data = json.load(f)
        return cls(**data)
    
    def to_yaml(self, path: str):
        """Salva configuração em YAML"""
        with open(path, 'w') as f:
            yaml.dump(asdict(self), f, default_flow_style=False)
    
    def to_json(self, path: str):
        """Salva configuração em JSON"""
        with open(path, 'w') as f:
            json.dump(asdict(self), f, indent=2)
    
    def validate(self) -> Tuple[bool, List[str]]:
        """Valida a configuração"""
        errors = []
        
        # Validar thresholds
        if not (0 < self.thresholds.blink_threshold_percent < 100):
            errors.append("blink_threshold_percent deve estar entre 0 e 100")
        
        if not (0 < self.thresholds.complete_blink_threshold < 100):
            errors.append("complete_blink_threshold deve estar entre 0 e 100")
        
        # Validar confiança
        if not (0 <= self.detection.min_detection_confidence <= 1):
            errors.append("min_detection_confidence deve estar entre 0 e 1")
        
        if not (0 <= self.detection.min_tracking_confidence <= 1):
            errors.append("min_tracking_confidence deve estar entre 0 e 1")
        
        # Validar janela de média móvel
        if self.filters.moving_average_window < 1:
            errors.append("moving_average_window deve ser >= 1")
        
        return len(errors) == 0, errors


def get_default_config() -> Config:
    """Retorna configuração padrão"""
    return Config()
