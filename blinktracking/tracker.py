"""
BlinkTracker - Classe principal de rastreamento

Integra detecção, filtragem e métricas em uma API simples
"""

import cv2
import json
import csv
import numpy as np
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Callable
from dataclasses import asdict
import logging
from datetime import datetime

try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False
    print("Aviso: MediaPipe não instalado. Instale com: pip install mediapipe")

from .config import Config
from .filters import LandmarkStabilizer, RotationNormalizer
from .metrics import MetricsCalculator, BlinkMetrics


class BlinkTracker:
    """
    Tracker principal de piscadas
    
    Uso:
        tracker = BlinkTracker(config)
        results = tracker.process_video("video.mp4")
        tracker.save_results(results, "output/")
    """
    
    def __init__(
        self,
        config: Optional[Config] = None,
        log_level: int = logging.INFO
    ):
        self.config = config or Config()
        self.logger = self._setup_logger(log_level)
        
        # Validar configuração
        valid, errors = self.config.validate()
        if not valid:
            raise ValueError(f"Configuração inválida: {errors}")
        
        # Inicializar MediaPipe
        if MEDIAPIPE_AVAILABLE:
            self.mp_face_mesh = mp.solutions.face_mesh
            self.face_mesh = self.mp_face_mesh.FaceMesh(
                static_image_mode=self.config.detection.static_image_mode,
                max_num_faces=self.config.detection.max_num_faces,
                refine_landmarks=self.config.detection.refine_landmarks,
                min_detection_confidence=self.config.detection.min_detection_confidence,
                min_tracking_confidence=self.config.detection.min_tracking_confidence
            )
        else:
            self.face_mesh = None
        
        # Inicializar filtros
        self.stabilizer = LandmarkStabilizer(
            num_landmarks=68,
            use_kalman=self.config.filters.enable_kalman,
            use_moving_avg=self.config.filters.enable_moving_average,
            moving_avg_window=self.config.filters.moving_average_window,
            kalman_process_noise=self.config.filters.kalman_process_noise,
            kalman_measurement_noise=self.config.filters.kalman_measurement_noise
        )
        
        self.rotation_normalizer = RotationNormalizer(
            caruncula_idx=self.config.right_eye.caruncula
        )
        
        # Inicializar calculador de métricas
        self.metrics_calc = MetricsCalculator(self.config)
        
        # Estado
        self.frame_count = 0
        self.is_processing = False
        
        # Callbacks
        self.progress_callback: Optional[Callable[[int, int], None]] = None
        self.frame_callback: Optional[Callable[[np.ndarray, Dict], None]] = None
    
    def _setup_logger(self, level: int) -> logging.Logger:
        """Configura logger"""
        logger = logging.getLogger('BlinkTracker')
        logger.setLevel(level)
        
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
    
    def process_video(
        self,
        video_path: str,
        output_dir: Optional[str] = None,
        save_csv: bool = True,
        save_json: bool = True,
        save_debug_video: bool = False
    ) -> Dict:
        """
        Processa um vídeo completo
        
        Args:
            video_path: Caminho do vídeo de entrada
            output_dir: Diretório para salvar resultados
            save_csv: Salvar CSV com landmarks
            save_json: Salvar JSON com métricas
            save_debug_video: Salvar vídeo com anotações
            
        Returns:
            Dicionário com resultados da análise
        """
        if not MEDIAPIPE_AVAILABLE:
            raise RuntimeError("MediaPipe não está instalado")
        
        video_path = Path(video_path)
        if not video_path.exists():
            raise FileNotFoundError(f"Vídeo não encontrado: {video_path}")
        
        self.logger.info(f"Iniciando processamento: {video_path}")
        self.is_processing = True
        self.frame_count = 0
        
        # Abrir vídeo
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise RuntimeError(f"Não foi possível abrir o vídeo: {video_path}")
        
        # Informações do vídeo
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        self.logger.info(f"FPS: {fps}, Frames: {total_frames}, Resolução: {width}x{height}")
        
        # Atualizar FPS nos detectores
        self.metrics_calc.left_detector.fps = fps
        self.metrics_calc.right_detector.fps = fps
        
        # Preparar saídas
        if output_dir:
            output_dir = Path(output_dir)
            output_dir.mkdir(parents=True, exist_ok=True)
        
        # Preparar CSV
        csv_writer = None
        csv_file = None
        if save_csv and output_dir:
            csv_path = output_dir / f"{video_path.stem}.csv"
            csv_file = open(csv_path, 'w', newline='', encoding='utf-8')
            csv_writer = self._create_csv_writer(csv_file, fps)
        
        # Preparar vídeo de debug
        video_writer = None
        if save_debug_video and output_dir:
            debug_path = output_dir / f"{video_path.stem}_debug.mp4"
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            video_writer = cv2.VideoWriter(str(debug_path), fourcc, fps, (width, height))
        
        # Processar frames
        landmarks_history = []
        first_landmarks = None
        
        try:
            while self.is_processing:
                ret, frame = cap.read()
                if not ret:
                    break
                
                self.frame_count += 1
                
                # Reportar progresso
                if self.progress_callback:
                    self.progress_callback(self.frame_count, total_frames)
                
                if self.frame_count % 30 == 0:
                    progress = (self.frame_count / total_frames) * 100
                    self.logger.info(f"Progresso: {progress:.1f}%")
                
                # Processar frame
                results = self._process_frame(frame, first_landmarks)
                
                if results['landmarks']:
                    if first_landmarks is None:
                        first_landmarks = results['landmarks']
                    
                    landmarks_history.append({
                        'frame': self.frame_count,
                        'landmarks': results['landmarks'],
                        'openings': results['openings']
                    })
                    
                    # Salvar no CSV
                    if csv_writer:
                        self._write_csv_row(csv_writer, self.frame_count, results)
                
                # Atualizar métricas
                if results['openings']['left'] is not None:
                    self.metrics_calc.process_frame(
                        results['openings']['left'],
                        results['openings']['right'],
                        fps
                    )
                
                # Frame callback
                if self.frame_callback:
                    self.frame_callback(frame, results)
                
                # Salvar frame de debug
                if video_writer and results['debug_frame'] is not None:
                    video_writer.write(results['debug_frame'])
        
        finally:
            cap.release()
            if csv_file:
                csv_file.close()
            if video_writer:
                video_writer.release()
        
        # Calcular métricas finais
        metrics = self.metrics_calc.get_metrics()
        
        # Preparar resultados
        results = {
            'video_info': {
                'path': str(video_path),
                'fps': fps,
                'total_frames': total_frames,
                'width': width,
                'height': height,
                'duration_seconds': total_frames / fps
            },
            'metrics': {
                'left': metrics['left'].to_dict(),
                'right': metrics['right'].to_dict(),
                'combined': metrics['combined'].to_dict()
            },
            'processing_info': {
                'frames_processed': self.frame_count,
                'timestamp': datetime.now().isoformat(),
                'config_version': self.config.version
            }
        }
        
        # Salvar JSON
        if save_json and output_dir:
            json_path = output_dir / f"{video_path.stem}_metrics.json"
            with open(json_path, 'w') as f:
                json.dump(results, f, indent=2)
            self.logger.info(f"Métricas salvas em: {json_path}")
        
        self.logger.info(f"Processamento concluído: {self.frame_count} frames")
        self.logger.info(f"Total de piscadas detectadas: {metrics['combined'].total_blinks}")
        
        self.is_processing = False
        return results
    
    def _process_frame(
        self,
        frame: np.ndarray,
        first_landmarks: Optional[List[Tuple[float, float]]] = None
    ) -> Dict:
        """Processa um único frame"""
        results = {
            'landmarks': None,
            'openings': {'left': None, 'right': None},
            'debug_frame': None,
            'face_detected': False
        }
        
        height, width = frame.shape[:2]
        
        # Converter para RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_results = self.face_mesh.process(rgb_frame)
        
        if mp_results.multi_face_landmarks:
            results['face_detected'] = True
            landmarks = mp_results.multi_face_landmarks[0]
            
            # Extrair todos os landmarks
            points = []
            for lm in landmarks.landmark:
                x = int(lm.x * width)
                y = int(lm.y * height)
                points.append((x, y))
            
            # Estabilizar
            if self.config.filters.enable_kalman or self.config.filters.enable_moving_average:
                points = self.stabilizer.stabilize(points)
            
            # Normalizar rotação
            if first_landmarks is not None:
                points = self.rotation_normalizer.normalize(points, first_landmarks)
            
            results['landmarks'] = points
            
            # Calcular aberturas
            results['openings']['left'] = self._calculate_eye_opening(
                points, self.config.left_eye
            )
            results['openings']['right'] = self._calculate_eye_opening(
                points, self.config.right_eye
            )
            
            # Criar frame de debug
            if self.config.save_debug_video:
                results['debug_frame'] = self._create_debug_frame(
                    frame.copy(), points, results['openings']
                )
        
        return results
    
    def _calculate_eye_opening(
        self,
        landmarks: List[Tuple[float, float]],
        eye_config
    ) -> float:
        """Calcula percentual de abertura do olho"""
        if len(landmarks) <= max(eye_config.upper + eye_config.lower):
            return 0.0
        
        # Ponto central superior (meio da lista upper)
        upper_idx = eye_config.upper[len(eye_config.upper) // 2]
        # Ponto central inferior (meio da lista lower)
        lower_idx = eye_config.lower[len(eye_config.lower) // 2]
        
        if upper_idx >= len(landmarks) or lower_idx >= len(landmarks):
            return 0.0
        
        upper_point = landmarks[upper_idx]
        lower_point = landmarks[lower_idx]
        
        # Distância vertical em pixels
        distance = abs(upper_point[1] - lower_point[1])
        
        # Normalizar (assumindo que 50 pixels = 100% aberto)
        # Isso pode ser calibrado por paciente
        opening_percent = min(100.0, (distance / 50.0) * 100.0)
        
        return opening_percent
    
    def _create_debug_frame(
        self,
        frame: np.ndarray,
        landmarks: List[Tuple[float, float]],
        openings: Dict
    ) -> np.ndarray:
        """Cria frame com visualização debug"""
        # Desenhar landmarks dos olhos
        right_eye = self.config.right_eye
        left_eye = self.config.left_eye
        
        # Olho direito - verde
        for idx in right_eye.contour:
            if idx < len(landmarks):
                x, y = int(landmarks[idx][0]), int(landmarks[idx][1])
                cv2.circle(frame, (x, y), 2, (0, 255, 0), -1)
        
        # Olho esquerdo - verde
        for idx in left_eye.contour:
            if idx < len(landmarks):
                x, y = int(landmarks[idx][0]), int(landmarks[idx][1])
                cv2.circle(frame, (x, y), 2, (0, 255, 0), -1)
        
        # Íris - rosa
        for idx in right_eye.iris + left_eye.iris:
            if idx < len(landmarks):
                x, y = int(landmarks[idx][0]), int(landmarks[idx][1])
                cv2.circle(frame, (x, y), 2, (255, 192, 203), -1)
        
        # Métricas na tela
        text_x = frame.shape[1] - 300
        metrics = [
            f"Frame: {self.frame_count}",
            f"Left: {openings['left']:.1f}%" if openings['left'] else "Left: --",
            f"Right: {openings['right']:.1f}%" if openings['right'] else "Right: --"
        ]
        
        for i, text in enumerate(metrics):
            y = 30 + (i * 30)
            cv2.putText(frame, text, (text_x, y),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        return frame
    
    def _create_csv_writer(self, file, fps: float):
        """Cria writer para CSV"""
        file.write(f"# FPS: {fps}\n")
        
        fieldnames = ['frame', 'timestamp_ms']
        
        # Landmarks direito
        for i in range(len(self.config.right_eye.upper)):
            fieldnames.extend([f'right_upper_{i}_x', f'right_upper_{i}_y'])
        for i in range(len(self.config.right_eye.lower)):
            fieldnames.extend([f'right_lower_{i}_x', f'right_lower_{i}_y'])
        
        # Landmarks esquerdo
        for i in range(len(self.config.left_eye.upper)):
            fieldnames.extend([f'left_upper_{i}_x', f'left_upper_{i}_y'])
        for i in range(len(self.config.left_eye.lower)):
            fieldnames.extend([f'left_lower_{i}_x', f'left_lower_{i}_y'])
        
        # Aberturas
        fieldnames.extend(['opening_left', 'opening_right'])
        
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        
        return writer
    
    def _write_csv_row(self, writer, frame_num: int, results: Dict):
        """Escreve uma linha no CSV"""
        row = {
            'frame': frame_num,
            'timestamp_ms': frame_num * (1000.0 / 30.0),  # Assumindo 30fps
            'opening_left': results['openings']['left'],
            'opening_right': results['openings']['right']
        }
        
        if results['landmarks']:
            landmarks = results['landmarks']
            
            # Landmarks direito
            for i, idx in enumerate(self.config.right_eye.upper):
                if idx < len(landmarks):
                    row[f'right_upper_{i}_x'] = landmarks[idx][0]
                    row[f'right_upper_{i}_y'] = landmarks[idx][1]
            
            for i, idx in enumerate(self.config.right_eye.lower):
                if idx < len(landmarks):
                    row[f'right_lower_{i}_x'] = landmarks[idx][0]
                    row[f'right_lower_{i}_y'] = landmarks[idx][1]
            
            # Landmarks esquerdo
            for i, idx in enumerate(self.config.left_eye.upper):
                if idx < len(landmarks):
                    row[f'left_upper_{i}_x'] = landmarks[idx][0]
                    row[f'left_upper_{i}_y'] = landmarks[idx][1]
            
            for i, idx in enumerate(self.config.left_eye.lower):
                if idx < len(landmarks):
                    row[f'left_upper_{i}_x'] = landmarks[idx][0]
                    row[f'left_upper_{i}_y'] = landmarks[idx][1]
        
        writer.writerow(row)
    
    def stop(self):
        """Para o processamento"""
        self.is_processing = False
    
    def reset(self):
        """Reseta o tracker"""
        self.frame_count = 0
        self.stabilizer.reset()
        self.metrics_calc.reset()
        self.rotation_normalizer.baseline_caruncula = None
