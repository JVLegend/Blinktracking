"""
Pipeline de processamento batch

Processa múltiplos vídeos automaticamente com:
- Paralelização
- Resume em caso de falha
- Relatório consolidado
"""

import json
import logging
from pathlib import Path
from typing import List, Dict, Optional, Callable
from dataclasses import dataclass, field
from datetime import datetime
from concurrent.futures import ProcessPoolExecutor, as_completed
import multiprocessing as mp

from .tracker import BlinkTracker
from .config import Config


@dataclass
class ProcessingResult:
    """Resultado do processamento de um vídeo"""
    video_path: str
    success: bool
    metrics: Optional[Dict] = None
    error: Optional[str] = None
    processing_time: float = 0.0
    output_files: List[str] = field(default_factory=list)


class BatchProcessor:
    """
    Processador em lote de vídeos
    
    Uso:
        processor = BatchProcessor(config)
        results = processor.process_folder("videos/", "output/")
    """
    
    def __init__(
        self,
        config: Optional[Config] = None,
        max_workers: Optional[int] = None,
        log_level: int = logging.INFO
    ):
        self.config = config or Config()
        self.max_workers = max_workers or mp.cpu_count()
        self.logger = self._setup_logger(log_level)
        
        self.results: List[ProcessingResult] = []
        self.progress_callback: Optional[Callable[[int, int, str], None]] = None
    
    def _setup_logger(self, level: int) -> logging.Logger:
        """Configura logger"""
        logger = logging.getLogger('BatchProcessor')
        logger.setLevel(level)
        
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
    
    def process_folder(
        self,
        input_folder: str,
        output_folder: str,
        extensions: List[str] = None,
        recursive: bool = False,
        parallel: bool = True
    ) -> List[ProcessingResult]:
        """
        Processa todos os vídeos em uma pasta
        
        Args:
            input_folder: Pasta com vídeos
            output_folder: Pasta para salvar resultados
            extensions: Lista de extensões (ex: ['.mp4', '.avi'])
            recursive: Buscar em subpastas
            parallel: Processar em paralelo
            
        Returns:
            Lista de resultados
        """
        input_folder = Path(input_folder)
        output_folder = Path(output_folder)
        output_folder.mkdir(parents=True, exist_ok=True)
        
        extensions = extensions or ['.mp4', '.avi', '.mov', '.mkv']
        
        # Encontrar vídeos
        if recursive:
            video_files = [
                f for f in input_folder.rglob('*')
                if f.suffix.lower() in extensions
            ]
        else:
            video_files = [
                f for f in input_folder.iterdir()
                if f.suffix.lower() in extensions
            ]
        
        if not video_files:
            self.logger.warning(f"Nenhum vídeo encontrado em: {input_folder}")
            return []
        
        self.logger.info(f"Encontrados {len(video_files)} vídeos")
        
        # Verificar checkpoint (vídeos já processados)
        checkpoint_file = output_folder / 'checkpoint.json'
        processed = self._load_checkpoint(checkpoint_file)
        
        videos_to_process = [
            v for v in video_files
            if str(v) not in processed
        ]
        
        if len(videos_to_process) < len(video_files):
            self.logger.info(
                f"Pulando {len(video_files) - len(videos_to_process)} vídeos já processados"
            )
        
        # Processar
        self.results = []
        total = len(videos_to_process)
        
        if parallel and total > 1:
            self._process_parallel(videos_to_process, output_folder, checkpoint_file)
        else:
            self._process_sequential(videos_to_process, output_folder, checkpoint_file)
        
        # Gerar relatório
        self._generate_report(output_folder)
        
        return self.results
    
    def _process_sequential(
        self,
        videos: List[Path],
        output_folder: Path,
        checkpoint_file: Path
    ):
        """Processa vídeos sequencialmente"""
        for i, video_path in enumerate(videos):
            self.logger.info(f"[{i+1}/{len(videos)}] Processando: {video_path.name}")
            
            if self.progress_callback:
                self.progress_callback(i + 1, len(videos), str(video_path))
            
            result = self._process_single_video(video_path, output_folder)
            self.results.append(result)
            
            # Salvar checkpoint
            if result.success:
                self._save_checkpoint(checkpoint_file, str(video_path))
    
    def _process_parallel(
        self,
        videos: List[Path],
        output_folder: Path,
        checkpoint_file: Path
    ):
        """Processa vídeos em paralelo"""
        self.logger.info(f"Processando em paralelo com {self.max_workers} workers")
        
        completed = 0
        with ProcessPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_video = {
                executor.submit(self._process_single_video, v, output_folder): v
                for v in videos
            }
            
            for future in as_completed(future_to_video):
                video_path = future_to_video[future]
                completed += 1
                
                try:
                    result = future.result()
                    self.results.append(result)
                    
                    if result.success:
                        self._save_checkpoint(checkpoint_file, str(video_path))
                    
                    if self.progress_callback:
                        self.progress_callback(completed, len(videos), str(video_path))
                    
                    self.logger.info(
                        f"[{completed}/{len(videos)}] Concluído: {video_path.name}"
                    )
                
                except Exception as e:
                    self.logger.error(f"Erro em {video_path}: {e}")
                    self.results.append(ProcessingResult(
                        video_path=str(video_path),
                        success=False,
                        error=str(e)
                    ))
    
    def _process_single_video(
        self,
        video_path: Path,
        output_folder: Path
    ) -> ProcessingResult:
        """Processa um único vídeo"""
        import time
        
        start_time = time.time()
        
        try:
            # Criar subpasta para este vídeo
            video_output = output_folder / video_path.stem
            video_output.mkdir(exist_ok=True)
            
            # Processar
            tracker = BlinkTracker(self.config)
            results = tracker.process_video(
                str(video_path),
                str(video_output),
                save_csv=True,
                save_json=True,
                save_debug_video=self.config.save_debug_video
            )
            
            processing_time = time.time() - start_time
            
            # Listar arquivos gerados
            output_files = [
                str(f) for f in video_output.iterdir()
                if f.is_file()
            ]
            
            return ProcessingResult(
                video_path=str(video_path),
                success=True,
                metrics=results,
                processing_time=processing_time,
                output_files=output_files
            )
        
        except Exception as e:
            processing_time = time.time() - start_time
            self.logger.error(f"Erro processando {video_path}: {e}")
            
            return ProcessingResult(
                video_path=str(video_path),
                success=False,
                error=str(e),
                processing_time=processing_time
            )
    
    def _load_checkpoint(self, checkpoint_file: Path) -> set:
        """Carrega vídeos já processados"""
        if not checkpoint_file.exists():
            return set()
        
        try:
            with open(checkpoint_file, 'r') as f:
                data = json.load(f)
            return set(data.get('processed', []))
        except:
            return set()
    
    def _save_checkpoint(self, checkpoint_file: Path, video_path: str):
        """Salva checkpoint"""
        processed = self._load_checkpoint(checkpoint_file)
        processed.add(video_path)
        
        with open(checkpoint_file, 'w') as f:
            json.dump({
                'processed': list(processed),
                'last_update': datetime.now().isoformat()
            }, f, indent=2)
    
    def _generate_report(self, output_folder: Path):
        """Gera relatório consolidado"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_videos': len(self.results),
            'successful': sum(1 for r in self.results if r.success),
            'failed': sum(1 for r in self.results if not r.success),
            'total_processing_time': sum(r.processing_time for r in self.results),
            'results': []
        }
        
        for result in self.results:
            report['results'].append({
                'video': result.video_path,
                'success': result.success,
                'error': result.error,
                'processing_time': result.processing_time,
                'total_blinks': (
                    result.metrics['metrics']['combined']['total_blinks']
                    if result.success and result.metrics else 0
                )
            })
        
        # Salvar relatório
        report_path = output_folder / 'batch_report.json'
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Resumo no log
        self.logger.info("=" * 50)
        self.logger.info("BATCH PROCESSING COMPLETE")
        self.logger.info(f"Total: {report['total_videos']}")
        self.logger.info(f"Sucesso: {report['successful']}")
        self.logger.info(f"Falhas: {report['failed']}")
        self.logger.info(f"Tempo total: {report['total_processing_time']:.1f}s")
        self.logger.info(f"Relatório: {report_path}")
        self.logger.info("=" * 50)
