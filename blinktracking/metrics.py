"""
Sistema de métricas e análise de piscadas

Calcula automaticamente:
- Frequência de piscadas
- Completude das piscadas
- Duração das piscadas
- Padrões temporais
"""

import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from collections import deque
from enum import Enum


class BlinkState(Enum):
    """Estados possíveis do olho"""
    OPEN = "open"
    CLOSING = "closing"
    CLOSED = "closed"
    OPENING = "opening"


@dataclass
class BlinkEvent:
    """Representa uma piscada detectada"""
    start_frame: int
    end_frame: int
    min_opening: float
    start_time_ms: float
    end_time_ms: float
    eye: str  # 'left' ou 'right'
    
    @property
    def duration_ms(self) -> float:
        return self.end_time_ms - self.start_time_ms
    
    @property
    def is_complete(self) -> bool:
        """Piscada é completa se fechou > 90%"""
        return self.min_opening < 10.0  # Menos de 10% de abertura


@dataclass
class BlinkMetrics:
    """Métricas calculadas para um período de análise"""
    # Contagens
    total_blinks: int = 0
    complete_blinks: int = 0
    incomplete_blinks: int = 0
    
    # Taxas
    blink_rate_per_minute: float = 0.0
    
    # Durações
    mean_duration_ms: float = 0.0
    std_duration_ms: float = 0.0
    min_duration_ms: float = 0.0
    max_duration_ms: float = 0.0
    
    # Completude
    mean_completeness: float = 0.0
    complete_blink_ratio: float = 0.0
    
    # Interpiscadas (tempo entre piscadas)
    mean_interblink_interval_ms: float = 0.0
    std_interblink_interval_ms: float = 0.0
    
    # Eventos detectados
    blink_events: List[BlinkEvent] = field(default_factory=list)
    
    # Metadados
    total_frames: int = 0
    duration_seconds: float = 0.0
    fps: float = 0.0
    
    def to_dict(self) -> Dict:
        """Converte para dicionário"""
        return {
            'total_blinks': self.total_blinks,
            'complete_blinks': self.complete_blinks,
            'incomplete_blinks': self.incomplete_blinks,
            'blink_rate_per_minute': round(self.blink_rate_per_minute, 2),
            'duration_ms': {
                'mean': round(self.mean_duration_ms, 2),
                'std': round(self.std_duration_ms, 2),
                'min': round(self.min_duration_ms, 2),
                'max': round(self.max_duration_ms, 2)
            },
            'completeness': {
                'mean': round(self.mean_completeness, 2),
                'complete_ratio': round(self.complete_blink_ratio, 2)
            },
            'interblink_interval_ms': {
                'mean': round(self.mean_interblink_interval_ms, 2),
                'std': round(self.std_interblink_interval_ms, 2)
            },
            'metadata': {
                'total_frames': self.total_frames,
                'duration_seconds': round(self.duration_seconds, 2),
                'fps': round(self.fps, 2)
            }
        }


class BlinkDetector:
    """
    Detector de piscadas em tempo real
    
    Analisa a série temporal de abertura ocular e detecta piscadas
    """
    
    def __init__(
        self,
        blink_threshold: float = 30.0,
        complete_blink_threshold: float = 90.0,
        min_duration_ms: float = 100.0,
        max_duration_ms: float = 400.0,
        fps: float = 30.0
    ):
        self.blink_threshold = blink_threshold
        self.complete_blink_threshold = complete_blink_threshold
        self.min_duration_ms = min_duration_ms
        self.max_duration_ms = max_duration_ms
        self.fps = fps
        self.ms_per_frame = 1000.0 / fps
        
        # Estado atual
        self.state = BlinkState.OPEN
        self.current_blink: Optional[BlinkEvent] = None
        self.blink_history: List[BlinkEvent] = []
        
        # Buffer para suavização
        self.opening_buffer: deque[float] = deque(maxlen=3)
        
        # Contadores
        self.frame_count = 0
    
    def update(self, opening_percent: float, eye: str = 'left') -> Optional[BlinkEvent]:
        """
        Atualiza o detector com nova medição
        
        Args:
            opening_percent: Percentual de abertura do olho (0-100)
            eye: Qual olho ('left' ou 'right')
            
        Returns:
            BlinkEvent se uma piscada foi completada, None caso contrário
        """
        self.frame_count += 1
        current_time_ms = self.frame_count * self.ms_per_frame
        
        # Suavizar medição
        self.opening_buffer.append(opening_percent)
        smoothed_opening = np.mean(self.opening_buffer)
        
        blink_completed = None
        
        # Máquina de estados
        if self.state == BlinkState.OPEN:
            if smoothed_opening < self.blink_threshold:
                # Iniciou piscada
                self.state = BlinkState.CLOSING
                self.current_blink = BlinkEvent(
                    start_frame=self.frame_count,
                    end_frame=self.frame_count,
                    min_opening=smoothed_opening,
                    start_time_ms=current_time_ms,
                    end_time_ms=current_time_ms,
                    eye=eye
                )
        
        elif self.state == BlinkState.CLOSING:
            if self.current_blink:
                self.current_blink.min_opening = min(
                    self.current_blink.min_opening,
                    smoothed_opening
                )
            
            if smoothed_opening >= self.blink_threshold:
                # Olho abrindo
                self.state = BlinkState.OPENING
        
        elif self.state == BlinkState.OPENING:
            if smoothed_opening >= self.blink_threshold:
                # Piscada completada
                if self.current_blink:
                    self.current_blink.end_frame = self.frame_count
                    self.current_blink.end_time_ms = current_time_ms
                    
                    # Validar duração
                    duration = self.current_blink.duration_ms
                    if self.min_duration_ms <= duration <= self.max_duration_ms:
                        blink_completed = self.current_blink
                        self.blink_history.append(blink_completed)
                
                self.state = BlinkState.OPEN
                self.current_blink = None
        
        return blink_completed
    
    def calculate_metrics(self) -> BlinkMetrics:
        """Calcula métricas baseadas no histórico de piscadas"""
        if not self.blink_history:
            return BlinkMetrics(
                total_frames=self.frame_count,
                duration_seconds=self.frame_count * self.ms_per_frame / 1000.0,
                fps=self.fps
            )
        
        # Contagens
        total_blinks = len(self.blink_history)
        complete_blinks = sum(1 for b in self.blink_history if b.is_complete)
        incomplete_blinks = total_blinks - complete_blinks
        
        # Taxa por minuto
        duration_seconds = self.frame_count * self.ms_per_frame / 1000.0
        duration_minutes = duration_seconds / 60.0
        blink_rate = total_blinks / duration_minutes if duration_minutes > 0 else 0
        
        # Durações
        durations = [b.duration_ms for b in self.blink_history]
        
        # Completude
        completeness = [
            100 - b.min_opening for b in self.blink_history
        ]
        
        # Interpiscadas
        if len(self.blink_history) > 1:
            intervals = []
            for i in range(1, len(self.blink_history)):
                interval = (
                    self.blink_history[i].start_time_ms
                    - self.blink_history[i-1].end_time_ms
                )
                intervals.append(interval)
        else:
            intervals = []
        
        return BlinkMetrics(
            total_blinks=total_blinks,
            complete_blinks=complete_blinks,
            incomplete_blinks=incomplete_blinks,
            blink_rate_per_minute=blink_rate,
            mean_duration_ms=np.mean(durations) if durations else 0,
            std_duration_ms=np.std(durations) if durations else 0,
            min_duration_ms=min(durations) if durations else 0,
            max_duration_ms=max(durations) if durations else 0,
            mean_completeness=np.mean(completeness) if completeness else 0,
            complete_blink_ratio=complete_blinks / total_blinks if total_blinks > 0 else 0,
            mean_interblink_interval_ms=np.mean(intervals) if intervals else 0,
            std_interblink_interval_ms=np.std(intervals) if intervals else 0,
            blink_events=self.blink_history,
            total_frames=self.frame_count,
            duration_seconds=duration_seconds,
            fps=self.fps
        )
    
    def reset(self):
        """Reseta o detector"""
        self.state = BlinkState.OPEN
        self.current_blink = None
        self.blink_history.clear()
        self.opening_buffer.clear()
        self.frame_count = 0


class MetricsCalculator:
    """
    Calculador geral de métricas para análise completa
    """
    
    def __init__(self, config):
        self.config = config
        self.left_detector = BlinkDetector(
            blink_threshold=config.thresholds.blink_threshold_percent,
            complete_blink_threshold=config.thresholds.complete_blink_threshold,
            min_duration_ms=config.thresholds.min_blink_duration_ms,
            max_duration_ms=config.thresholds.max_blink_duration_ms
        )
        self.right_detector = BlinkDetector(
            blink_threshold=config.thresholds.blink_threshold_percent,
            complete_blink_threshold=config.thresholds.complete_blink_threshold,
            min_duration_ms=config.thresholds.min_blink_duration_ms,
            max_duration_ms=config.thresholds.max_blink_duration_ms
        )
    
    def process_frame(
        self,
        left_opening: float,
        right_opening: float,
        fps: float = 30.0
    ) -> Tuple[Optional[BlinkEvent], Optional[BlinkEvent]]:
        """Processa um frame e detecta piscadas"""
        self.left_detector.fps = fps
        self.right_detector.fps = fps
        
        left_blink = self.left_detector.update(left_opening, 'left')
        right_blink = self.right_detector.update(right_opening, 'right')
        
        return left_blink, right_blink
    
    def get_metrics(self) -> Dict[str, BlinkMetrics]:
        """Retorna métricas para ambos os olhos"""
        return {
            'left': self.left_detector.calculate_metrics(),
            'right': self.right_detector.calculate_metrics(),
            'combined': self._combine_metrics(
                self.left_detector.calculate_metrics(),
                self.right_detector.calculate_metrics()
            )
        }
    
    def _combine_metrics(
        self,
        left: BlinkMetrics,
        right: BlinkMetrics
    ) -> BlinkMetrics:
        """Combina métricas dos dois olhos"""
        total_blinks = left.total_blinks + right.total_blinks
        
        # Calcular médias ponderadas
        if total_blinks > 0:
            mean_duration = (
                left.mean_duration_ms * left.total_blinks
                + right.mean_duration_ms * right.total_blinks
            ) / total_blinks
        else:
            mean_duration = 0
        
        return BlinkMetrics(
            total_blinks=total_blinks,
            complete_blinks=left.complete_blinks + right.complete_blinks,
            incomplete_blinks=left.incomplete_blinks + right.incomplete_blinks,
            blink_rate_per_minute=(left.blink_rate_per_minute + right.blink_rate_per_minute) / 2,
            mean_duration_ms=mean_duration,
            total_frames=max(left.total_frames, right.total_frames)
        )
    
    def reset(self):
        """Reseta calculadores"""
        self.left_detector.reset()
        self.right_detector.reset()
