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
import warnings


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
    baseline_opening: float = 100.0
    lateral_classification: str = ""
    left_completeness_percent: Optional[float] = None
    right_completeness_percent: Optional[float] = None
    
    @property
    def duration_ms(self) -> float:
        return self.end_time_ms - self.start_time_ms
    
    @property
    def is_complete(self) -> bool:
        """Piscada é completa se fechou > 90%"""
        if self.baseline_opening <= 0:
            return self.min_opening < 10.0
        return self.min_opening <= self.baseline_opening * 0.10

    @property
    def completeness_percent(self) -> float:
        """Percentual de fechamento relativo à abertura basal."""
        if self.baseline_opening <= 0:
            return max(0.0, 100.0 - self.min_opening)
        return float(np.clip((1.0 - self.min_opening / self.baseline_opening) * 100.0, 0.0, 100.0))


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

    # Contagens clínicas combinadas
    bilateral_blinks: int = 0
    unilateral_left_blinks: int = 0
    unilateral_right_blinks: int = 0
    raw_eye_blinks: int = 0
    bilateral_symmetric_blinks: int = 0
    left_dominant_blinks: int = 0
    right_dominant_blinks: int = 0
    
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
            'clinical_counts': {
                'bilateral_blinks': self.bilateral_blinks,
                'unilateral_left_blinks': self.unilateral_left_blinks,
                'unilateral_right_blinks': self.unilateral_right_blinks,
                'raw_eye_blinks': self.raw_eye_blinks,
                'bilateral_symmetric_blinks': self.bilateral_symmetric_blinks,
                'left_dominant_blinks': self.left_dominant_blinks,
                'right_dominant_blinks': self.right_dominant_blinks
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
        max_duration_ms: float = 800.0,
        fps: float = 30.0,
        adaptive_threshold_ratio: float = 0.75,
        baseline_window_frames: int = 300
    ):
        self.blink_threshold = blink_threshold
        self.complete_blink_threshold = complete_blink_threshold
        self.min_duration_ms = min_duration_ms
        self.max_duration_ms = max_duration_ms
        self.adaptive_threshold_ratio = adaptive_threshold_ratio
        self.set_fps(fps)
        
        # Estado atual
        self.state = BlinkState.OPEN
        self.current_blink: Optional[BlinkEvent] = None
        self.blink_history: List[BlinkEvent] = []
        
        # Buffer para suavização
        self.opening_buffer: deque[float] = deque(maxlen=3)
        self.baseline_buffer: deque[float] = deque(maxlen=baseline_window_frames)
        
        # Contadores
        self.frame_count = 0

    def _current_baseline(self, smoothed_opening: float) -> float:
        """Estima a abertura basal recente de forma robusta."""
        if self.baseline_buffer:
            values = np.asarray(self.baseline_buffer, dtype=float)
            values = values[np.isfinite(values)]
            if values.size:
                return max(float(np.percentile(values, 90)), smoothed_opening)
        return smoothed_opening

    def _current_threshold(self, baseline_opening: float) -> float:
        """Limiar de piscada relativo ao baseline individual."""
        if baseline_opening > 0 and self.adaptive_threshold_ratio > 0:
            return baseline_opening * self.adaptive_threshold_ratio
        return self.blink_threshold

    def set_fps(self, fps: float):
        """Atualiza FPS e protege contra valores inválidos."""
        if fps is None or fps <= 0:
            warnings.warn("FPS inválido; usando fallback de 30 FPS.", RuntimeWarning)
            fps = 30.0
        self.fps = fps
        self.ms_per_frame = 1000.0 / fps
    
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
        baseline_opening = self._current_baseline(smoothed_opening)
        threshold = self._current_threshold(baseline_opening)
        if self.state == BlinkState.OPEN or smoothed_opening >= threshold:
            self.baseline_buffer.append(smoothed_opening)
        
        blink_completed = None
        
        # Máquina de estados
        if self.state == BlinkState.OPEN:
            if smoothed_opening < threshold:
                # Iniciou piscada
                self.state = BlinkState.CLOSING
                self.current_blink = BlinkEvent(
                    start_frame=self.frame_count,
                    end_frame=self.frame_count,
                    min_opening=smoothed_opening,
                    start_time_ms=current_time_ms,
                    end_time_ms=current_time_ms,
                    eye=eye,
                    baseline_opening=baseline_opening
                )
        
        elif self.state == BlinkState.CLOSING:
            if self.current_blink:
                self.current_blink.min_opening = min(
                    self.current_blink.min_opening,
                    smoothed_opening
                )
            
            if smoothed_opening >= threshold:
                # Olho abrindo
                self.state = BlinkState.OPENING
        
        elif self.state == BlinkState.OPENING:
            if smoothed_opening >= threshold:
                # Piscada completada
                if self.current_blink:
                    self.current_blink.end_frame = self.frame_count
                    self.current_blink.end_time_ms = current_time_ms
                    self.current_blink.baseline_opening = max(
                        self.current_blink.baseline_opening,
                        baseline_opening
                    )
                    
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
        completeness = [b.completeness_percent for b in self.blink_history]
        
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
        self.baseline_buffer.clear()
        self.frame_count = 0


class MetricsCalculator:
    """
    Calculador geral de métricas para análise completa
    """

    CLINICAL_SYNC_TOLERANCE_MS = 150.0
    LATERAL_DOMINANCE_MARGIN_PERCENT = 2.0
    
    def __init__(self, config):
        self.config = config
        self.left_detector = BlinkDetector(
            blink_threshold=config.thresholds.blink_threshold_percent,
            complete_blink_threshold=config.thresholds.complete_blink_threshold,
            min_duration_ms=config.thresholds.min_blink_duration_ms,
            max_duration_ms=config.thresholds.max_blink_duration_ms,
            adaptive_threshold_ratio=config.thresholds.adaptive_threshold_ratio,
            baseline_window_frames=config.thresholds.baseline_window_frames
        )
        self.right_detector = BlinkDetector(
            blink_threshold=config.thresholds.blink_threshold_percent,
            complete_blink_threshold=config.thresholds.complete_blink_threshold,
            min_duration_ms=config.thresholds.min_blink_duration_ms,
            max_duration_ms=config.thresholds.max_blink_duration_ms,
            adaptive_threshold_ratio=config.thresholds.adaptive_threshold_ratio,
            baseline_window_frames=config.thresholds.baseline_window_frames
        )
    
    def process_frame(
        self,
        left_opening: float,
        right_opening: float,
        fps: float = 30.0
    ) -> Tuple[Optional[BlinkEvent], Optional[BlinkEvent]]:
        """Processa um frame e detecta piscadas"""
        self.left_detector.set_fps(fps)
        self.right_detector.set_fps(fps)
        
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
        """Combina eventos dos dois olhos como piscadas clínicas únicas."""
        clinical_blinks = self._synchronize_blinks(
            left.blink_events,
            right.blink_events,
            self.CLINICAL_SYNC_TOLERANCE_MS
        )
        total_blinks = len(clinical_blinks)
        duration_seconds = max(left.duration_seconds, right.duration_seconds)
        duration_minutes = duration_seconds / 60.0
        durations = [blink.duration_ms for blink in clinical_blinks]
        completeness = [blink.completeness_percent for blink in clinical_blinks]
        intervals = [
            clinical_blinks[i].start_time_ms - clinical_blinks[i - 1].end_time_ms
            for i in range(1, len(clinical_blinks))
        ]
        complete_blinks = sum(1 for blink in clinical_blinks if blink.is_complete)
        bilateral_blinks = sum(1 for blink in clinical_blinks if blink.eye == 'bilateral')
        unilateral_left_blinks = sum(1 for blink in clinical_blinks if blink.eye == 'left')
        unilateral_right_blinks = sum(1 for blink in clinical_blinks if blink.eye == 'right')
        bilateral_symmetric_blinks = sum(
            1 for blink in clinical_blinks
            if blink.lateral_classification == 'bilateral_symmetric'
        )
        left_dominant_blinks = sum(
            1 for blink in clinical_blinks
            if blink.lateral_classification == 'left_dominant'
        )
        right_dominant_blinks = sum(
            1 for blink in clinical_blinks
            if blink.lateral_classification == 'right_dominant'
        )
        
        return BlinkMetrics(
            total_blinks=total_blinks,
            complete_blinks=complete_blinks,
            incomplete_blinks=total_blinks - complete_blinks,
            blink_rate_per_minute=total_blinks / duration_minutes if duration_minutes > 0 else 0,
            mean_duration_ms=np.mean(durations) if durations else 0,
            std_duration_ms=np.std(durations) if durations else 0,
            min_duration_ms=min(durations) if durations else 0,
            max_duration_ms=max(durations) if durations else 0,
            mean_completeness=np.mean(completeness) if completeness else 0,
            complete_blink_ratio=(
                complete_blinks / total_blinks
                if total_blinks > 0 else 0
            ),
            mean_interblink_interval_ms=np.mean(intervals) if intervals else 0,
            std_interblink_interval_ms=np.std(intervals) if intervals else 0,
            blink_events=clinical_blinks,
            bilateral_blinks=bilateral_blinks,
            unilateral_left_blinks=unilateral_left_blinks,
            unilateral_right_blinks=unilateral_right_blinks,
            raw_eye_blinks=left.total_blinks + right.total_blinks,
            bilateral_symmetric_blinks=bilateral_symmetric_blinks,
            left_dominant_blinks=left_dominant_blinks,
            right_dominant_blinks=right_dominant_blinks,
            total_frames=max(left.total_frames, right.total_frames),
            duration_seconds=duration_seconds,
            fps=left.fps or right.fps
        )

    def _synchronize_blinks(
        self,
        left_events: List[BlinkEvent],
        right_events: List[BlinkEvent],
        tolerance_ms: float
    ) -> List[BlinkEvent]:
        """Pareia piscadas esquerda/direita próximas em uma linha temporal clínica."""
        left_sorted = sorted(left_events, key=lambda blink: blink.start_time_ms)
        right_sorted = sorted(right_events, key=lambda blink: blink.start_time_ms)
        synchronized: List[BlinkEvent] = []
        i = 0
        j = 0

        while i < len(left_sorted) or j < len(right_sorted):
            if i >= len(left_sorted):
                synchronized.append(right_sorted[j])
                j += 1
                continue
            if j >= len(right_sorted):
                synchronized.append(left_sorted[i])
                i += 1
                continue

            left_blink = left_sorted[i]
            right_blink = right_sorted[j]
            if self._blinks_are_synchronized(left_blink, right_blink, tolerance_ms):
                synchronized.append(self._merge_blink_pair(left_blink, right_blink))
                i += 1
                j += 1
            elif left_blink.start_time_ms <= right_blink.start_time_ms:
                synchronized.append(left_blink)
                i += 1
            else:
                synchronized.append(right_blink)
                j += 1

        return sorted(synchronized, key=lambda blink: blink.start_time_ms)

    @staticmethod
    def _blinks_are_synchronized(
        left_blink: BlinkEvent,
        right_blink: BlinkEvent,
        tolerance_ms: float
    ) -> bool:
        gap_ms = max(left_blink.start_time_ms, right_blink.start_time_ms) - min(
            left_blink.end_time_ms,
            right_blink.end_time_ms
        )
        onset_delta_ms = abs(left_blink.start_time_ms - right_blink.start_time_ms)
        return gap_ms <= tolerance_ms or onset_delta_ms <= tolerance_ms

    @staticmethod
    def _merge_blink_pair(left_blink: BlinkEvent, right_blink: BlinkEvent) -> BlinkEvent:
        left_completeness = left_blink.completeness_percent
        right_completeness = right_blink.completeness_percent
        completeness = max(left_completeness, right_completeness)
        delta = left_completeness - right_completeness
        if delta >= MetricsCalculator.LATERAL_DOMINANCE_MARGIN_PERCENT:
            lateral_classification = 'left_dominant'
        elif delta <= -MetricsCalculator.LATERAL_DOMINANCE_MARGIN_PERCENT:
            lateral_classification = 'right_dominant'
        else:
            lateral_classification = 'bilateral_symmetric'
        return BlinkEvent(
            start_frame=min(left_blink.start_frame, right_blink.start_frame),
            end_frame=max(left_blink.end_frame, right_blink.end_frame),
            min_opening=max(0.0, 100.0 - completeness),
            start_time_ms=min(left_blink.start_time_ms, right_blink.start_time_ms),
            end_time_ms=max(left_blink.end_time_ms, right_blink.end_time_ms),
            eye='bilateral',
            baseline_opening=100.0,
            lateral_classification=lateral_classification,
            left_completeness_percent=left_completeness,
            right_completeness_percent=right_completeness
        )
    
    def reset(self):
        """Reseta calculadores"""
        self.left_detector.reset()
        self.right_detector.reset()
