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
import warnings
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
        
        self.required_landmark_indices = self._get_required_landmark_indices()
        stabilizer_landmarks = (
            len(self.required_landmark_indices)
            if self.config.detection.extract_only_eye_landmarks
            else (478 if self.config.filters.vectorized_kalman else 68)
        )

        # Inicializar filtros
        self.stabilizer = LandmarkStabilizer(
            num_landmarks=stabilizer_landmarks,
            use_kalman=self.config.filters.enable_kalman,
            vectorized_kalman=self.config.filters.vectorized_kalman,
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
        self.last_face_bbox = None
        
        # Callbacks
        self.progress_callback: Optional[Callable[[int, int], None]] = None
        self.frame_callback: Optional[Callable[[np.ndarray, Dict], None]] = None

    def _get_required_landmark_indices(self) -> List[int]:
        """Retorna os índices necessários para métricas, CSV e debug dos olhos."""
        indices = set()
        for eye in (self.config.right_eye, self.config.left_eye):
            indices.update(eye.upper)
            indices.update(eye.lower)
            indices.update(eye.contour)
            indices.add(eye.caruncula)
            if self.config.detection.refine_landmarks:
                indices.update(eye.iris)
        return sorted(indices)
    
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
        self.last_face_bbox = None
        self.stabilizer.reset()
        self.metrics_calc.reset()
        self.rotation_normalizer.baseline_caruncula = None
        
        # Abrir vídeo
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise RuntimeError(f"Não foi possível abrir o vídeo: {video_path}")
        
        # Informações do vídeo
        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps is None or fps <= 0:
            warnings.warn("FPS inválido no vídeo; usando fallback de 30 FPS.", RuntimeWarning)
            fps = 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        self.logger.info(f"FPS: {fps}, Frames: {total_frames}, Resolução: {width}x{height}")
        
        frame_skip = max(1, int(self.config.detection.frame_skip))
        interpolate_skipped = self.config.detection.interpolate_skipped_frames and frame_skip > 1
        metrics_fps = fps if interpolate_skipped or frame_skip == 1 else fps / frame_skip

        # Atualizar FPS nos detectores
        self.metrics_calc.left_detector.set_fps(metrics_fps)
        self.metrics_calc.right_detector.set_fps(metrics_fps)
        
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
        inference_frames_processed = 0
        detections = 0
        previous_metric_frame = None
        previous_metric_openings = None
        
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

                should_run_inference = (self.frame_count - 1) % frame_skip == 0
                if not should_run_inference:
                    continue
                
                # Processar frame
                results = self._process_frame(frame, first_landmarks)
                inference_frames_processed += 1
                
                if results['landmarks'] is not None:
                    detections += 1
                    if first_landmarks is None:
                        first_landmarks = results['landmarks']
                    
                    landmarks_history.append({
                        'frame': self.frame_count,
                        'landmarks': results['landmarks'],
                        'openings': results['openings']
                    })
                    
                    # Salvar no CSV
                    if csv_writer:
                        self._write_csv_row(csv_writer, self.frame_count, results, fps)
                
                # Atualizar métricas
                if interpolate_skipped and previous_metric_frame is not None:
                    self._process_interpolated_openings(
                        previous_metric_frame,
                        previous_metric_openings,
                        self.frame_count,
                        results['openings'],
                        metrics_fps
                    )

                self._process_openings(results['openings'], metrics_fps)
                if results['openings']['left'] is not None and results['openings']['right'] is not None:
                    previous_metric_frame = self.frame_count
                    previous_metric_openings = results['openings'].copy()

                # Frame callback
                if self.frame_callback:
                    self.frame_callback(frame, results)
                
                # Salvar frame de debug
                if video_writer and results['debug_frame'] is not None:
                    video_writer.write(results['debug_frame'])

            if interpolate_skipped and previous_metric_frame is not None:
                self._process_trailing_openings(
                    previous_metric_frame,
                    previous_metric_openings,
                    self.frame_count,
                    metrics_fps
                )
        
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
                'inference_frames_processed': inference_frames_processed,
                'detections': detections,
                'frame_skip': frame_skip,
                'interpolate_skipped_frames': interpolate_skipped,
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

    def _process_openings(self, openings: Dict, fps: float):
        """Envia aberturas de um frame ao calculador de métricas."""
        if openings['left'] is not None and openings['right'] is not None:
            self.metrics_calc.process_frame(
                openings['left'],
                openings['right'],
                fps
            )

    def _interpolate_openings(self, start_openings: Dict, end_openings: Dict, alpha: float) -> Dict:
        """Interpola linearmente aberturas entre dois frames inferidos."""
        if (
            start_openings is None
            or end_openings is None
            or start_openings['left'] is None
            or start_openings['right'] is None
            or end_openings['left'] is None
            or end_openings['right'] is None
        ):
            return {'left': None, 'right': None}

        return {
            'left': start_openings['left'] + (end_openings['left'] - start_openings['left']) * alpha,
            'right': start_openings['right'] + (end_openings['right'] - start_openings['right']) * alpha,
        }

    def _process_interpolated_openings(
        self,
        start_frame: int,
        start_openings: Dict,
        end_frame: int,
        end_openings: Dict,
        fps: float
    ):
        """Processa frames intermediários usando abertura interpolada."""
        gap = end_frame - start_frame
        if gap <= 1:
            return

        for frame_num in range(start_frame + 1, end_frame):
            alpha = (frame_num - start_frame) / gap
            self._process_openings(
                self._interpolate_openings(start_openings, end_openings, alpha),
                fps
            )

    def _process_trailing_openings(
        self,
        start_frame: int,
        start_openings: Dict,
        end_frame: int,
        fps: float
    ):
        """Preenche frames finais sem nova inferência com a última abertura válida."""
        if start_openings is None or start_frame >= end_frame:
            return

        for _ in range(start_frame + 1, end_frame + 1):
            self._process_openings(start_openings, fps)
    
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
        processed_frame, offset_x, offset_y, scale = self._prepare_inference_frame(frame)
        proc_height, proc_width = processed_frame.shape[:2]

        rgb_frame = cv2.cvtColor(processed_frame, cv2.COLOR_BGR2RGB)
        mp_results = self.face_mesh.process(rgb_frame)
        
        if mp_results.multi_face_landmarks:
            results['face_detected'] = True
            landmarks = mp_results.multi_face_landmarks[0]
            points = self._extract_landmark_points(
                landmarks.landmark,
                width,
                height,
                proc_width,
                proc_height,
                offset_x,
                offset_y,
                scale
            )
            
            # Estabilizar
            if self.config.filters.enable_kalman or self.config.filters.enable_moving_average:
                points = self._stabilize_landmark_points(points)
            
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

    def _downscale(self, frame: np.ndarray) -> Tuple[np.ndarray, float]:
        """Reduz a resolução do frame para inferência e retorna o fator de escala."""
        max_res = self.config.detection.max_inference_res
        if not max_res or max_res <= 0:
            return frame, 1.0

        height, width = frame.shape[:2]
        max_dim = max(height, width)
        if max_dim <= max_res:
            return frame, 1.0

        scale = max_res / max_dim
        resized = cv2.resize(
            frame,
            (int(width * scale), int(height * scale)),
            interpolation=cv2.INTER_AREA
        )
        return resized, scale

    def _crop_roi(self, frame: np.ndarray, margin: float = 0.3) -> Tuple[np.ndarray, int, int]:
        """Recorta ROI baseada na face detectada no frame anterior."""
        if not self.config.detection.use_roi or self.last_face_bbox is None:
            return frame, 0, 0

        height, width = frame.shape[:2]
        x1, y1, x2, y2 = self.last_face_bbox
        box_width = x2 - x1
        box_height = y2 - y1
        x1 = max(0, int(x1 - box_width * margin))
        y1 = max(0, int(y1 - box_height * margin))
        x2 = min(width, int(x2 + box_width * margin))
        y2 = min(height, int(y2 + box_height * margin))

        if x2 <= x1 or y2 <= y1:
            return frame, 0, 0

        return frame[y1:y2, x1:x2], x1, y1

    def _prepare_inference_frame(self, frame: np.ndarray) -> Tuple[np.ndarray, int, int, float]:
        """Aplica ROI opcional e downscale antes da inferência."""
        cropped, offset_x, offset_y = self._crop_roi(frame)
        processed, scale = self._downscale(cropped)
        return processed, offset_x, offset_y, scale

    def _extract_landmark_points(
        self,
        landmarks,
        width: int,
        height: int,
        proc_width: int,
        proc_height: int,
        offset_x: int,
        offset_y: int,
        scale: float
    ):
        """Extrai landmarks em coordenadas da resolução original."""
        total_landmarks = len(landmarks)
        extract_only = self.config.detection.extract_only_eye_landmarks
        indices = self.required_landmark_indices if extract_only else range(total_landmarks)

        points = np.full((total_landmarks, 2), np.nan, dtype=float)
        bbox_x = []
        bbox_y = []

        if self.config.detection.use_roi:
            bbox_indices = range(total_landmarks)
        else:
            bbox_indices = indices

        for idx in bbox_indices:
            if idx >= total_landmarks:
                continue
            lm = landmarks[idx]
            x = (lm.x * proc_width / scale) + offset_x
            y = (lm.y * proc_height / scale) + offset_y
            if idx in indices:
                points[idx] = (x, y)
            bbox_x.append(x)
            bbox_y.append(y)

        if bbox_x and bbox_y:
            self.last_face_bbox = (min(bbox_x), min(bbox_y), max(bbox_x), max(bbox_y))

        return points

    def _has_landmark(self, landmarks, idx: int) -> bool:
        """Verifica se um landmark existe e tem coordenadas finitas."""
        return idx < len(landmarks) and not np.isnan(landmarks[idx]).any()

    def _stabilize_landmark_points(self, points):
        """Estabiliza todos os landmarks ou apenas os pontos necessários."""
        if self.config.detection.extract_only_eye_landmarks:
            valid_indices = [
                idx for idx in self.required_landmark_indices
                if idx < len(points) and not np.isnan(points[idx]).any()
            ]
            if not valid_indices:
                return points
            stabilized = self.stabilizer.stabilize(points[valid_indices].tolist())
            points = points.copy()
            points[valid_indices] = np.asarray(stabilized, dtype=float)
            return points

        return self.stabilizer.stabilize(points.tolist())
    
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
        if np.isnan(upper_point).any() or np.isnan(lower_point).any():
            return 0.0
        
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
            if self._has_landmark(landmarks, idx):
                x, y = int(landmarks[idx][0]), int(landmarks[idx][1])
                cv2.circle(frame, (x, y), 2, (0, 255, 0), -1)
        
        # Olho esquerdo - verde
        for idx in left_eye.contour:
            if self._has_landmark(landmarks, idx):
                x, y = int(landmarks[idx][0]), int(landmarks[idx][1])
                cv2.circle(frame, (x, y), 2, (0, 255, 0), -1)
        
        # Íris - rosa
        for idx in right_eye.iris + left_eye.iris:
            if self._has_landmark(landmarks, idx):
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
    
    def _write_csv_row(self, writer, frame_num: int, results: Dict, fps: float = 30.0):
        """Escreve uma linha no CSV"""
        if fps is None or fps <= 0:
            warnings.warn("FPS inválido; usando fallback de 30 FPS.", RuntimeWarning)
            fps = 30.0
        row = {
            'frame': frame_num,
            'timestamp_ms': frame_num * (1000.0 / fps),
            'opening_left': results['openings']['left'],
            'opening_right': results['openings']['right']
        }
        
        if results['landmarks'] is not None:
            landmarks = results['landmarks']
            
            # Landmarks direito
            for i, idx in enumerate(self.config.right_eye.upper):
                if self._has_landmark(landmarks, idx):
                    row[f'right_upper_{i}_x'] = landmarks[idx][0]
                    row[f'right_upper_{i}_y'] = landmarks[idx][1]
            
            for i, idx in enumerate(self.config.right_eye.lower):
                if self._has_landmark(landmarks, idx):
                    row[f'right_lower_{i}_x'] = landmarks[idx][0]
                    row[f'right_lower_{i}_y'] = landmarks[idx][1]
            
            # Landmarks esquerdo
            for i, idx in enumerate(self.config.left_eye.upper):
                if self._has_landmark(landmarks, idx):
                    row[f'left_upper_{i}_x'] = landmarks[idx][0]
                    row[f'left_upper_{i}_y'] = landmarks[idx][1]
            
            for i, idx in enumerate(self.config.left_eye.lower):
                if self._has_landmark(landmarks, idx):
                    row[f'left_lower_{i}_x'] = landmarks[idx][0]
                    row[f'left_lower_{i}_y'] = landmarks[idx][1]
        
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
