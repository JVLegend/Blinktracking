"""
Testes completos do BlinkTracking V2.0

Gera dados sintéticos e valida todo o pipeline
"""

import sys
import os
import cv2
import numpy as np
from pathlib import Path

# Adicionar ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

from blinktracking import BlinkTracker, Config, BatchProcessor
from blinktracking.filters import KalmanFilter, MovingAverageFilter, LandmarkStabilizer
from blinktracking.metrics import BlinkDetector, BlinkMetrics


def test_filters():
    """Testa filtros de estabilização"""
    print("\n" + "="*60)
    print("TESTE 1: Filtros de Estabilização")
    print("="*60)
    
    # Simular trajetória com ruído
    np.random.seed(42)
    true_trajectory = np.sin(np.linspace(0, 4*np.pi, 100)) * 50 + 100
    noisy_trajectory = true_trajectory + np.random.normal(0, 10, 100)
    
    # Testar Kalman
    kalman = KalmanFilter()
    kalman_results = []
    for point in noisy_trajectory:
        from blinktracking.filters import Point2D
        result = kalman.update(Point2D(point, 0))
        kalman_results.append(result.x)
    
    # Testar Moving Average
    ma = MovingAverageFilter(window_size=5)
    ma_results = []
    for point in noisy_trajectory:
        from blinktracking.filters import Point2D
        result = ma.update(Point2D(point, 0))
        ma_results.append(result.x)
    
    # Calcular erro
    kalman_error = np.mean(np.abs(np.array(kalman_results) - true_trajectory))
    ma_error = np.mean(np.abs(np.array(ma_results) - true_trajectory))
    original_error = np.mean(np.abs(noisy_trajectory - true_trajectory))
    
    print(f"Erro original (com ruído): {original_error:.2f} pixels")
    print(f"Erro com Kalman Filter:    {kalman_error:.2f} pixels")
    print(f"Erro com Moving Average:   {ma_error:.2f} pixels")
    print(f"Melhoria Kalman:           {(1 - kalman_error/original_error)*100:.1f}%")
    print(f"Melhoria Moving Average:   {(1 - ma_error/original_error)*100:.1f}%")
    
    assert kalman_error < original_error, "Kalman não melhorou o sinal"
    assert ma_error < original_error, "Moving Average não melhorou o sinal"
    print("✅ Filtros funcionando corretamente!")
    
    return True


def test_blink_detector():
    """Testa detector de piscadas"""
    print("\n" + "="*60)
    print("TESTE 2: Detector de Piscadas")
    print("="*60)
    
    # Simular série temporal de abertura ocular
    # 100 frames = olho aberto (100%)
    # 10 frames = fechando (100% -> 10%)
    # 5 frames = fechado (10%)
    # 10 frames = abrindo (10% -> 100%)
    # 50 frames = aberto
    
    fps = 30.0
    detector = BlinkDetector(fps=fps)
    
    # Gerar padrão de piscada
    opening_pattern = []
    
    # Olho aberto
    opening_pattern.extend([100.0] * 30)
    
    # Piscada 1 - completa
    opening_pattern.extend(np.linspace(100, 5, 8).tolist())   # Fechando
    opening_pattern.extend([5.0] * 4)                          # Fechado
    opening_pattern.extend(np.linspace(5, 100, 8).tolist())   # Abrindo
    
    # Olho aberto
    opening_pattern.extend([100.0] * 40)
    
    # Piscada 2 - incompleta (só desce até 40%)
    opening_pattern.extend(np.linspace(100, 40, 6).tolist())
    opening_pattern.extend([40.0] * 3)
    opening_pattern.extend(np.linspace(40, 100, 6).tolist())
    
    # Olho aberto
    opening_pattern.extend([100.0] * 30)
    
    # Piscada 3 - completa rápida
    opening_pattern.extend(np.linspace(100, 3, 5).tolist())
    opening_pattern.extend([3.0] * 3)
    opening_pattern.extend(np.linspace(3, 100, 5).tolist())
    
    # Olho aberto
    opening_pattern.extend([100.0] * 20)
    
    # Processar
    blinks_detected = []
    for i, opening in enumerate(opening_pattern):
        blink = detector.update(opening, eye='left')
        if blink:
            blinks_detected.append(blink)
            print(f"  Piscada detectada no frame {i}: "
                  f"duração={blink.duration_ms:.0f}ms, "
                  f"completa={blink.is_complete}")
    
    # Calcular métricas
    metrics = detector.calculate_metrics()
    
    print(f"\nTotal de piscadas detectadas: {metrics.total_blinks}")
    print(f"Piscadas completas: {metrics.complete_blinks}")
    print(f"Taxa: {metrics.blink_rate_per_minute:.1f} piscadas/min")
    print(f"Duração média: {metrics.mean_duration_ms:.0f}ms")
    
    assert metrics.total_blinks >= 2, "Deveria detectar pelo menos 2 piscadas"
    print("✅ Detector de piscadas funcionando!")
    
    return True


def create_test_video(output_path: str, duration_sec: int = 5, fps: int = 30):
    """Cria um vídeo de teste sintético"""
    print(f"\nCriando vídeo de teste: {output_path}")
    
    width, height = 640, 480
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    total_frames = duration_sec * fps
    
    for frame_num in range(total_frames):
        # Criar frame preto
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        
        # Desenhar "rosto" (círculo branco)
        center = (width // 2, height // 2)
        cv2.circle(frame, center, 150, (255, 255, 255), 2)
        
        # Simular piscada
        # A cada 90 frames (3 segundos), fecha o olho
        blink_cycle = frame_num % 90
        if 30 <= blink_cycle <= 45:  # Fechando
            eye_open = 1.0 - ((blink_cycle - 30) / 15) * 0.9
        elif 45 < blink_cycle <= 50:  # Fechado
            eye_open = 0.1
        elif 50 < blink_cycle <= 65:  # Abrindo
            eye_open = 0.1 + ((blink_cycle - 50) / 15) * 0.9
        else:  # Aberto
            eye_open = 1.0
        
        # Desenhar olhos
        eye_y = height // 2 - 20
        left_eye_x = width // 2 - 50
        right_eye_x = width // 2 + 50
        
        eye_height = int(30 * eye_open)
        
        # Olho esquerdo
        cv2.ellipse(frame, (left_eye_x, eye_y), (30, eye_height), 
                    0, 0, 360, (0, 255, 0), 2)
        
        # Olho direito
        cv2.ellipse(frame, (right_eye_x, eye_y), (30, eye_height), 
                    0, 0, 360, (0, 255, 0), 2)
        
        # Adicionar texto
        cv2.putText(frame, f"Frame: {frame_num}", (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(frame, f"Eye Open: {eye_open*100:.0f}%", (10, 60),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        out.write(frame)
    
    out.release()
    print(f"✅ Vídeo criado: {total_frames} frames, {duration_sec}s")
    return output_path


def test_tracker():
    """Testa o tracker completo"""
    print("\n" + "="*60)
    print("TESTE 3: BlinkTracker (Integração)")
    print("="*60)
    
    # Criar vídeo de teste
    test_video = "/tmp/test_blink_video.mp4"
    create_test_video(test_video, duration_sec=5, fps=30)
    
    # Configurar
    config = Config()
    config.save_debug_video = True
    
    # Criar tracker
    tracker = BlinkTracker(config)
    
    # Processar
    output_dir = "/tmp/blinktracking_test"
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"\nProcessando vídeo de teste...")
    
    # Progress callback
    def on_progress(current, total):
        if current % 30 == 0:
            print(f"  Progresso: {(current/total)*100:.0f}%")
    
    tracker.progress_callback = on_progress
    
    results = tracker.process_video(
        test_video,
        output_dir=output_dir,
        save_csv=True,
        save_json=True,
        save_debug_video=True
    )
    
    # Verificar resultados
    print("\n" + "-"*60)
    print("RESULTADOS:")
    print("-"*60)
    
    video_info = results['video_info']
    print(f"Vídeo: {video_info['width']}x{video_info['height']} @ {video_info['fps']}fps")
    print(f"Frames processados: {video_info['total_frames']}")
    print(f"Duração: {video_info['duration_seconds']:.1f}s")
    
    metrics = results['metrics']['combined']
    print(f"\nPiscadas detectadas: {metrics['total_blinks']}")
    print(f"Taxa: {metrics['blink_rate_per_minute']:.1f} piscadas/min")
    
    if metrics['total_blinks'] > 0:
        print(f"Duração média: {metrics['duration_ms']['mean']:.0f}ms")
        print(f"Completude média: {metrics['completeness']['mean']:.1f}%")
    
    # Verificar arquivos de saída
    output_files = list(Path(output_dir).glob("*"))
    print(f"\nArquivos gerados em {output_dir}:")
    for f in output_files:
        size_kb = f.stat().st_size / 1024
        print(f"  - {f.name} ({size_kb:.1f} KB)")
    
    # Verificar se JSON e CSV foram criados
    json_files = list(Path(output_dir).glob("*.json"))
    csv_files = list(Path(output_dir).glob("*.csv"))
    
    assert len(json_files) > 0, "JSON não foi gerado"
    assert len(csv_files) > 0, "CSV não foi gerado"
    
    print("\n✅ BlinkTracker funcionando corretamente!")
    
    # Limpar
    os.remove(test_video)
    
    return True


def test_config():
    """Testa sistema de configuração"""
    print("\n" + "="*60)
    print("TESTE 4: Sistema de Configuração")
    print("="*60)
    
    # Config padrão
    config = Config()
    print(f"Versão: {config.version}")
    print(f"Threshold: {config.thresholds.blink_threshold_percent}%")
    print(f"Kalman: {config.filters.enable_kalman}")
    
    # Validar
    valid, errors = config.validate()
    assert valid, f"Erros de validação: {errors}"
    print("✅ Configuração válida")
    
    # Salvar e carregar YAML
    yaml_path = "/tmp/test_config.yaml"
    config.to_yaml(yaml_path)
    print(f"✅ Config salva em YAML: {yaml_path}")
    
    # Salvar e carregar JSON
    json_path = "/tmp/test_config.json"
    config.to_json(json_path)
    print(f"✅ Config salva em JSON: {json_path}")
    
    # Testar config inválida
    bad_config = Config()
    bad_config.thresholds.blink_threshold_percent = 150  # Inválido (>100)
    valid, errors = bad_config.validate()
    assert not valid, "Deveria detectar erro"
    print(f"✅ Detectou config inválida: {errors[0]}")
    
    # Limpar
    os.remove(yaml_path)
    os.remove(json_path)
    
    print("✅ Sistema de configuração funcionando!")
    
    return True


def run_all_tests():
    """Executa todos os testes"""
    print("\n" + "="*60)
    print("BLINKTRACKING V2.0 - TESTES AUTOMATIZADOS")
    print("="*60)
    
    tests = [
        ("Filtros de Estabilização", test_filters),
        ("Detector de Piscadas", test_blink_detector),
        ("Sistema de Configuração", test_config),
        ("BlinkTracker (Integração)", test_tracker),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            success = test_func()
            results.append((name, True, None))
        except Exception as e:
            results.append((name, False, str(e)))
            print(f"\n❌ ERRO em {name}: {e}")
            import traceback
            traceback.print_exc()
    
    # Resumo
    print("\n" + "="*60)
    print("RESUMO DOS TESTES")
    print("="*60)
    
    passed = sum(1 for _, success, _ in results if success)
    failed = len(results) - passed
    
    for name, success, error in results:
        status = "✅ PASSOU" if success else "❌ FALHOU"
        print(f"{status}: {name}")
        if error:
            print(f"   Erro: {error}")
    
    print("\n" + "-"*60)
    print(f"Total: {len(results)} | Passaram: {passed} | Falharam: {failed}")
    print("="*60)
    
    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
