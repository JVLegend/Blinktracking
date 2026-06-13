"""
Filtros de estabilização para rastreamento de landmarks faciais

Resolve problemas de:
- Tremor ao fechar olhos
- Perda temporária de landmarks
- Ruído no sinal
"""

import numpy as np
from collections import deque
from typing import List, Tuple, Optional
from dataclasses import dataclass


@dataclass
class Point2D:
    """Representa um ponto 2D"""
    x: float
    y: float
    
    def to_array(self) -> np.ndarray:
        return np.array([self.x, self.y])
    
    @classmethod
    def from_array(cls, arr: np.ndarray) -> "Point2D":
        return cls(x=float(arr[0]), y=float(arr[1]))


class KalmanFilter:
    """
    Filtro de Kalman para suavização de landmarks
    
    O filtro de Kalman é um estimador ótimo que minimiza o erro quadrático médio.
    É ideal para rastreamento porque:
    - Prediz posição baseada em movimento anterior
    - Lida bem com ruído de medição
    - Suaviza transições bruscas
    """
    
    def __init__(
        self,
        process_noise: float = 1e-4,
        measurement_noise: float = 1e-2,
        initial_error: float = 1.0
    ):
        # Estado: [x, y, vx, vy] - posição e velocidade
        self.state = np.zeros(4)
        
        # Matriz de covariância do erro
        self.error_cov = np.eye(4) * initial_error
        
        # Matriz de transição de estado (modelo de movimento)
        self.transition_matrix = np.array([
            [1, 0, 1, 0],  # x = x + vx
            [0, 1, 0, 1],  # y = y + vy
            [0, 0, 1, 0],  # vx = vx
            [0, 0, 0, 1]   # vy = vy
        ])
        
        # Matriz de observação (medimos apenas posição)
        self.observation_matrix = np.array([
            [1, 0, 0, 0],
            [0, 1, 0, 0]
        ])
        
        # Ruído do processo
        self.process_noise = process_noise
        self.Q = np.eye(4) * process_noise
        
        # Ruído da medição
        self.measurement_noise = measurement_noise
        self.R = np.eye(2) * measurement_noise
        
        self.initialized = False
    
    def predict(self) -> Point2D:
        """Prediz o próximo estado"""
        self.state = self.transition_matrix @ self.state
        self.error_cov = (
            self.transition_matrix @ self.error_cov @ self.transition_matrix.T
            + self.Q
        )
        return Point2D(self.state[0], self.state[1])
    
    def update(self, measurement: Point2D) -> Point2D:
        """Atualiza com nova medição"""
        measurement_array = measurement.to_array()
        
        if not self.initialized:
            self.state[:2] = measurement_array
            self.initialized = True
            return measurement
        
        # Predição
        self.predict()
        
        # Ganho de Kalman
        S = (
            self.observation_matrix @ self.error_cov @ self.observation_matrix.T
            + self.R
        )
        K = self.error_cov @ self.observation_matrix.T @ np.linalg.inv(S)
        
        # Atualização
        innovation = measurement_array - self.observation_matrix @ self.state
        self.state = self.state + K @ innovation
        self.error_cov = (np.eye(4) - K @ self.observation_matrix) @ self.error_cov
        
        return Point2D(self.state[0], self.state[1])
    
    def reset(self):
        """Reseta o filtro"""
        self.state = np.zeros(4)
        self.error_cov = np.eye(4)
        self.initialized = False


class MovingAverageFilter:
    """
    Filtro de média móvel para suavização simples
    
    Mais rápido que Kalman, mas menos preciso.
    Bom para suavizar ruído de alta frequência.
    """
    
    def __init__(self, window_size: int = 5):
        self.window_size = window_size
        self.buffer: deque[Point2D] = deque(maxlen=window_size)
    
    def update(self, point: Point2D) -> Point2D:
        """Adiciona ponto e retorna média"""
        self.buffer.append(point)
        
        if len(self.buffer) == 0:
            return point
        
        avg_x = sum(p.x for p in self.buffer) / len(self.buffer)
        avg_y = sum(p.y for p in self.buffer) / len(self.buffer)
        
        return Point2D(avg_x, avg_y)
    
    def reset(self):
        """Limpa o buffer"""
        self.buffer.clear()


class LandmarkStabilizer:
    """
    Estabilizador completo para landmarks faciais
    
    Combina Kalman e Moving Average para melhor resultado
    """
    
    def __init__(
        self,
        num_landmarks: int = 68,
        use_kalman: bool = True,
        use_moving_avg: bool = True,
        moving_avg_window: int = 5,
        kalman_process_noise: float = 1e-4,
        kalman_measurement_noise: float = 1e-2,
        vectorized_kalman: bool = True
    ):
        self.num_landmarks = num_landmarks
        self.use_kalman = use_kalman
        self.use_moving_avg = use_moving_avg
        self.vectorized_kalman = vectorized_kalman
        self.kalman_process_noise = kalman_process_noise
        self.kalman_measurement_noise = kalman_measurement_noise
        
        # Inicializar filtros para cada landmark
        self.kalman_filters: List[KalmanFilter] = []
        self.ma_filters: List[MovingAverageFilter] = []
        self.kalman_states = np.zeros((num_landmarks, 4), dtype=float)
        self.kalman_error_cov = np.eye(4, dtype=float)
        self.kalman_transition = np.array([
            [1, 0, 1, 0],
            [0, 1, 0, 1],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ], dtype=float)
        self.kalman_observation = np.array([
            [1, 0, 0, 0],
            [0, 1, 0, 0]
        ], dtype=float)
        self.kalman_q = np.eye(4, dtype=float) * kalman_process_noise
        self.kalman_r = np.eye(2, dtype=float) * kalman_measurement_noise
        self.kalman_initialized = False
        
        for _ in range(num_landmarks):
            if use_kalman and not vectorized_kalman:
                self.kalman_filters.append(
                    KalmanFilter(kalman_process_noise, kalman_measurement_noise)
                )
            if use_moving_avg:
                self.ma_filters.append(
                    MovingAverageFilter(moving_avg_window)
                )

    def _ensure_size(self, num_landmarks: int):
        """Redimensiona buffers quando a quantidade de landmarks muda."""
        if num_landmarks == self.num_landmarks:
            return

        self.num_landmarks = num_landmarks
        self.kalman_states = np.zeros((num_landmarks, 4), dtype=float)
        self.kalman_error_cov = np.eye(4, dtype=float)
        self.kalman_initialized = False

        if self.use_kalman and not self.vectorized_kalman:
            self.kalman_filters = [
                KalmanFilter(self.kalman_process_noise, self.kalman_measurement_noise)
                for _ in range(num_landmarks)
            ]

        if self.use_moving_avg:
            window_size = self.ma_filters[0].window_size if self.ma_filters else 5
            self.ma_filters = [MovingAverageFilter(window_size) for _ in range(num_landmarks)]

    def _apply_vectorized_kalman(self, measurements: np.ndarray) -> np.ndarray:
        """Aplica um banco vetorizado de Kalman com covariância compartilhada."""
        if measurements.size == 0:
            return measurements

        if not self.kalman_initialized:
            self.kalman_states[:, :2] = measurements
            self.kalman_states[:, 2:] = 0.0
            self.kalman_error_cov = np.eye(4, dtype=float)
            self.kalman_initialized = True
            return measurements

        t = self.kalman_transition
        h = self.kalman_observation

        self.kalman_states = self.kalman_states @ t.T
        self.kalman_error_cov = t @ self.kalman_error_cov @ t.T + self.kalman_q

        s = h @ self.kalman_error_cov @ h.T + self.kalman_r
        k = self.kalman_error_cov @ h.T @ np.linalg.inv(s)

        predicted_measurements = self.kalman_states @ h.T
        innovations = measurements - predicted_measurements
        self.kalman_states += innovations @ k.T
        self.kalman_error_cov = (np.eye(4) - k @ h) @ self.kalman_error_cov

        return self.kalman_states[:, :2]
    
    def stabilize(
        self,
        landmarks: List[Tuple[float, float]]
    ) -> List[Tuple[float, float]]:
        """
        Estabiliza uma lista de landmarks
        
        Args:
            landmarks: Lista de (x, y) para cada landmark
            
        Returns:
            Lista estabilizada de (x, y)
        """
        if self.vectorized_kalman:
            self._ensure_size(len(landmarks))
        points_array = np.asarray(landmarks, dtype=float)

        if self.use_kalman and self.vectorized_kalman:
            points_array = self._apply_vectorized_kalman(points_array)

        stabilized = []
        
        for i, (x, y) in enumerate(points_array):
            point = Point2D(x, y)
            
            # Aplicar Kalman primeiro
            if self.use_kalman and not self.vectorized_kalman and i < len(self.kalman_filters):
                point = self.kalman_filters[i].update(point)
            
            # Aplicar média móvel depois
            if self.use_moving_avg and i < len(self.ma_filters):
                point = self.ma_filters[i].update(point)
            
            stabilized.append((point.x, point.y))
        
        return stabilized
    
    def reset(self):
        """Reseta todos os filtros"""
        for kf in self.kalman_filters:
            kf.reset()
        for maf in self.ma_filters:
            maf.reset()
        self.kalman_states = np.zeros((self.num_landmarks, 4), dtype=float)
        self.kalman_error_cov = np.eye(4, dtype=float)
        self.kalman_initialized = False


class RotationNormalizer:
    """
    Normaliza landmarks compensando rotação da cabeça
    
    Usa a carúncula como ponto de referência fixo
    """
    
    def __init__(self, caruncula_idx: int = 39):
        self.caruncula_idx = caruncula_idx
        self.baseline_caruncula: Optional[Point2D] = None
    
    def normalize(
        self,
        landmarks: List[Tuple[float, float]],
        reference_landmarks: Optional[List[Tuple[float, float]]] = None
    ) -> List[Tuple[float, float]]:
        """
        Normaliza landmarks subtraindo posição da carúncula
        
        Args:
            landmarks: Lista de (x, y)
            reference_landmarks: Landmarks de referência (primeiro frame)
            
        Returns:
            Landmarks normalizados
        """
        if len(landmarks) <= self.caruncula_idx or np.isnan(landmarks[self.caruncula_idx]).any():
            return landmarks
        
        # Obter posição atual da carúncula
        caruncula = Point2D(
            landmarks[self.caruncula_idx][0],
            landmarks[self.caruncula_idx][1]
        )
        
        # Se temos referência, calcular offset
        if (
            reference_landmarks is not None
            and len(reference_landmarks) > self.caruncula_idx
            and not np.isnan(reference_landmarks[self.caruncula_idx]).any()
        ):
            ref_caruncula = Point2D(
                reference_landmarks[self.caruncula_idx][0],
                reference_landmarks[self.caruncula_idx][1]
            )
            offset_x = caruncula.x - ref_caruncula.x
            offset_y = caruncula.y - ref_caruncula.y
        else:
            # Usar carúncula como origem
            offset_x = caruncula.x
            offset_y = caruncula.y
        
        # Subtrair offset de todos os pontos
        normalized = []
        for x, y in landmarks:
            normalized.append((x - offset_x, y - offset_y))
        
        return normalized
    
    def set_baseline(self, landmarks: List[Tuple[float, float]]):
        """Define baseline para normalização futura"""
        if len(landmarks) > self.caruncula_idx:
            self.baseline_caruncula = Point2D(
                landmarks[self.caruncula_idx][0],
                landmarks[self.caruncula_idx][1]
            )
