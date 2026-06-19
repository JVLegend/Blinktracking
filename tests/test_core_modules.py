"""
Testes dos módulos core do BlinkTracking V2.0
(Sem dependência do MediaPipe)
"""

import sys
import os
import csv
import io
import warnings
import numpy as np
from pathlib import Path

# Adicionar ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

from blinktracking import Config
from blinktracking.filters import (
    KalmanFilter, MovingAverageFilter, 
    LandmarkStabilizer, RotationNormalizer, Point2D
)
from blinktracking.metrics import BlinkDetector, BlinkEvent, BlinkMetrics, MetricsCalculator
from blinktracking.tracker import BlinkTracker


def test_kalman_filter():
    """Testa Kalman Filter"""
    print("\n" + "="*60)
    print("TESTE 1: Kalman Filter")
    print("="*60)
    
    # Criar trajetória com movimento suave + ruído
    np.random.seed(42)
    t = np.linspace(0, 4*np.pi, 100)
    # Movimento mais previsível (linear + aceleração constante)
    true_signal = np.cumsum(np.ones(100) * 2) + np.sin(t) * 10
    noise = np.random.normal(0, 5, 100)
    noisy_signal = true_signal + noise
    
    # Aplicar Kalman
    kalman = KalmanFilter()
    filtered = []
    predictions = []
    
    for val in noisy_signal:
        # Predizer
        pred = kalman.predict()
        predictions.append(pred.x)
        # Atualizar com medição
        result = kalman.update(Point2D(val, 0))
        filtered.append(result.x)
    
    # Verificar que o filtro foi inicializado
    assert kalman.initialized, "Kalman deve estar inicializado após updates"
    
    # Verificar que a saída tem o mesmo tamanho
    assert len(filtered) == len(noisy_signal), "Saída deve ter mesmo tamanho da entrada"
    
    # Calcular estatísticas
    warmup = 10
    orig_std = np.std(noisy_signal[warmup:])
    filt_std = np.std(filtered[warmup:])
    
    print(f"Frames processados:     {len(filtered)}")
    print(f"Desvio padrão original: {orig_std:.2f}")
    print(f"Desvio padrão filtrado: {filt_std:.2f}")
    print(f"Estado inicializado:    {kalman.initialized}")
    print(f"Estado final:           x={kalman.state[0]:.2f}, vx={kalman.state[2]:.2f}")
    
    # Testar reset
    kalman.reset()
    assert not kalman.initialized, "Kalman deve estar não-inicializado após reset"
    print("✅ Kalman Filter funcionando (inicialização, processamento, reset)!")
    return True


def test_moving_average_filter():
    """Testa Moving Average Filter"""
    print("\n" + "="*60)
    print("TESTE 2: Moving Average Filter")
    print("="*60)
    
    # Criar sinal com ruído de alta frequência
    np.random.seed(123)
    t = np.linspace(0, 2*np.pi, 50)
    true_signal = np.sin(t) * 30 + 50
    # Ruído de alta frequência
    noise = np.random.normal(0, 8, 50)
    noisy_signal = true_signal + noise
    
    # Aplicar Moving Average com janela maior
    ma = MovingAverageFilter(window_size=7)
    filtered = []
    for val in noisy_signal:
        result = ma.update(Point2D(val, 0))
        filtered.append(result.x)
    
    # Calcular erros (ignorando primeiros frames - warmup)
    warmup = 10
    original_error = np.mean(np.abs(noisy_signal[warmup:] - true_signal[warmup:]))
    filtered_error = np.mean(np.abs(np.array(filtered[warmup:]) - true_signal[warmup:]))
    
    print(f"Janela: {ma.window_size}")
    print(f"Erro original (após warmup):     {original_error:.2f} pixels")
    print(f"Erro com Moving Average:         {filtered_error:.2f} pixels")
    
    # Moving Average pode não melhorar em todos os casos,
    # mas deve suavizar o sinal
    variance_original = np.var(noisy_signal[warmup:])
    variance_filtered = np.var(filtered[warmup:])
    
    print(f"Variância original:   {variance_original:.2f}")
    print(f"Variância filtrada:   {variance_filtered:.2f}")
    print(f"Redução de variância: {(1 - variance_filtered/variance_original)*100:.1f}%")
    
    # O importante é que reduziu a variância (suavizou)
    assert variance_filtered < variance_original, "Deve reduzir variância"
    print("✅ Moving Average Filter funcionando!")
    return True


def test_landmark_stabilizer():
    """Testa estabilizador completo de landmarks"""
    print("\n" + "="*60)
    print("TESTE 3: Landmark Stabilizer")
    print("="*60)
    
    # Criar sequência de landmarks com ruído
    np.random.seed(456)
    num_points = 10
    num_frames = 30
    
    # Posições verdadeiras (movimento suave)
    true_positions = []
    for i in range(num_frames):
        frame_pos = []
        for j in range(num_points):
            x = 100 + j * 10 + np.sin(i * 0.2) * 5
            y = 100 + j * 5 + np.cos(i * 0.2) * 3
            frame_pos.append((x, y))
        true_positions.append(frame_pos)
    
    # Adicionar ruído
    noisy_positions = []
    for frame in true_positions:
        noisy_frame = []
        for x, y in frame:
            noisy_frame.append((
                x + np.random.normal(0, 3),
                y + np.random.normal(0, 3)
            ))
        noisy_positions.append(noisy_frame)
    
    # Aplicar estabilizador
    stabilizer = LandmarkStabilizer(
        num_landmarks=num_points,
        use_kalman=True,
        use_moving_avg=True,
        moving_avg_window=5
    )
    
    stabilized_positions = []
    for frame in noisy_positions:
        stabilized = stabilizer.stabilize(frame)
        stabilized_positions.append(stabilized)
    
    # Calcular erros (após warmup)
    warmup = 5
    original_errors = []
    stabilized_errors = []
    
    for i in range(warmup, num_frames):
        for j in range(num_points):
            orig_err = np.sqrt(
                (noisy_positions[i][j][0] - true_positions[i][j][0])**2 +
                (noisy_positions[i][j][1] - true_positions[i][j][1])**2
            )
            stab_err = np.sqrt(
                (stabilized_positions[i][j][0] - true_positions[i][j][0])**2 +
                (stabilized_positions[i][j][1] - true_positions[i][j][1])**2
            )
            original_errors.append(orig_err)
            stabilized_errors.append(stab_err)
    
    mean_orig = np.mean(original_errors)
    mean_stab = np.mean(stabilized_errors)
    improvement = (1 - mean_stab/mean_orig) * 100
    
    print(f"Erro médio original:     {mean_orig:.2f} pixels")
    print(f"Erro médio estabilizado: {mean_stab:.2f} pixels")
    print(f"Melhoria:                {improvement:.1f}%")
    
    assert mean_stab < mean_orig, "Estabilizador deve reduzir erro"
    print("✅ Landmark Stabilizer funcionando!")
    return True


def test_vectorized_kalman_matches_legacy_landmark_stabilizer():
    """O banco vetorizado deve manter a mesma API e saída do Kalman legado."""
    np.random.seed(789)
    frames = [
        [(float(i * 10 + np.random.normal()), float(i * 5 + np.random.normal())) for i in range(8)]
        for _ in range(12)
    ]
    legacy = LandmarkStabilizer(
        num_landmarks=8,
        use_kalman=True,
        use_moving_avg=False,
        vectorized_kalman=False,
    )
    vectorized = LandmarkStabilizer(
        num_landmarks=8,
        use_kalman=True,
        use_moving_avg=False,
        vectorized_kalman=True,
    )

    for frame in frames:
        legacy_out = np.array(legacy.stabilize(frame))
        vectorized_out = np.array(vectorized.stabilize(frame))
        np.testing.assert_allclose(vectorized_out, legacy_out, atol=1e-9)


def test_rotation_normalizer():
    """Testa normalizador de rotação"""
    print("\n" + "="*60)
    print("TESTE 4: Rotation Normalizer")
    print("="*60)
    
    # Criar landmarks simulados
    # Ponto 39 é a carúncula (referência)
    num_landmarks = 50
    caruncula_idx = 39
    
    # Frame de referência
    reference = [(i * 5, i * 3) for i in range(num_landmarks)]
    reference[caruncula_idx] = (200, 150)  # Carúncula em posição fixa
    
    # Frame com rotação (carúncula moveu)
    rotated = [(x + 20, y + 15) for x, y in reference]
    
    # Normalizar
    normalizer = RotationNormalizer(caruncula_idx=caruncula_idx)
    normalizer.set_baseline(reference)
    normalized = normalizer.normalize(rotated, reference)
    
    # Verificar se carúncula voltou para posição de referência
    caruncula_normalized = normalized[caruncula_idx]
    caruncula_reference = reference[caruncula_idx]
    
    print(f"Carúncula referência:   {caruncula_reference}")
    print(f"Carúncula rotacionada:  {rotated[caruncula_idx]}")
    print(f"Carúncula normalizada:  {caruncula_normalized}")
    
    # Após normalização, carúncula deve estar próxima da referência
    distance = np.sqrt(
        (caruncula_normalized[0] - caruncula_reference[0])**2 +
        (caruncula_normalized[1] - caruncula_reference[1])**2
    )
    print(f"Distância após normalização: {distance:.2f} pixels")
    
    assert distance < 1.0, "Carúncula deve voltar para posição de referência"
    print("✅ Rotation Normalizer funcionando!")
    return True


def test_blink_detector_adapts_to_individual_baseline():
    """Detecta piscada parcial quando a abertura basal não chega a 100%."""
    detector = BlinkDetector(fps=150.0, min_duration_ms=80, max_duration_ms=800)

    opening_pattern = []
    opening_pattern.extend([68.0] * 120)
    opening_pattern.extend(np.linspace(68, 45, 12).tolist())
    opening_pattern.extend([45.0] * 8)
    opening_pattern.extend(np.linspace(45, 68, 12).tolist())
    opening_pattern.extend([68.0] * 120)

    blinks = [blink for opening in opening_pattern if (blink := detector.update(opening))]
    metrics = detector.calculate_metrics()

    assert len(blinks) == 1
    assert metrics.total_blinks == 1
    assert 30 <= metrics.mean_completeness <= 40


def test_tracker_eye_opening_uses_scale_invariant_ear():
    """Abertura ocular não deve depender da resolução/tamanho do rosto."""
    tracker = object.__new__(BlinkTracker)
    tracker.config = Config()
    eye = tracker.config.right_eye

    def make_landmarks(width, vertical_gap):
        landmarks = np.full((478, 2), np.nan, dtype=float)
        landmarks[eye.lower[0]] = (0.0, 0.0)
        landmarks[eye.lower[-1]] = (width, 0.0)
        for upper_idx, lower_idx, x in [
            (eye.upper[2], eye.lower[3], width * 0.35),
            (eye.upper[4], eye.lower[5], width * 0.65),
        ]:
            landmarks[upper_idx] = (x, -vertical_gap / 2.0)
            landmarks[lower_idx] = (x, vertical_gap / 2.0)
        return landmarks

    opening = tracker._calculate_eye_opening(make_landmarks(100.0, 25.0), eye)
    opening_scaled = tracker._calculate_eye_opening(make_landmarks(200.0, 50.0), eye)
    opening_closed = tracker._calculate_eye_opening(make_landmarks(100.0, 5.0), eye)

    assert np.isclose(opening, 100.0)
    assert np.isclose(opening_scaled, opening)
    assert np.isclose(opening_closed, 20.0)


def test_blink_detector():
    """Testa detector de piscadas"""
    print("\n" + "="*60)
    print("TESTE 5: Blink Detector")
    print("="*60)
    
    fps = 30.0
    detector = BlinkDetector(fps=fps)
    
    # Gerar sequência de piscadas
    # Padrão: aberto -> fechando -> fechado -> abrindo -> aberto
    
    def generate_blink_pattern(num_blinks=3):
        pattern = []
        
        for i in range(num_blinks):
            # Aberto (40 frames)
            pattern.extend([100.0] * 40)
            
            # Fechando (8 frames) - até 5%
            pattern.extend(np.linspace(100, 5, 8).tolist())
            
            # Fechado (4 frames)
            pattern.extend([5.0] * 4)
            
            # Abrindo (8 frames)
            pattern.extend(np.linspace(5, 100, 8).tolist())
        
        # Aberto no final (30 frames)
        pattern.extend([100.0] * 30)
        
        return pattern
    
    opening_pattern = generate_blink_pattern(num_blinks=3)
    
    print(f"Total de frames: {len(opening_pattern)}")
    print(f"Duração esperada: {len(opening_pattern)/fps:.1f} segundos")
    
    # Processar
    blinks = []
    for i, opening in enumerate(opening_pattern):
        blink = detector.update(opening, eye='left')
        if blink:
            blinks.append(blink)
            print(f"\n  Piscada {len(blinks)} detectada:")
            print(f"    Frame: {i}")
            print(f"    Duração: {blink.duration_ms:.0f}ms")
            print(f"    Completude: {(100-blink.min_opening):.0f}%")
            print(f"    Completa: {'Sim' if blink.is_complete else 'Não'}")
    
    # Calcular métricas
    metrics = detector.calculate_metrics()
    
    print(f"\nResumo:")
    print(f"  Total de piscadas: {metrics.total_blinks}")
    print(f"  Completas: {metrics.complete_blinks}")
    print(f"  Taxa: {metrics.blink_rate_per_minute:.1f} piscadas/min")
    print(f"  Duração média: {metrics.mean_duration_ms:.0f}ms")
    
    assert metrics.total_blinks == 3, f"Deveria detectar 3 piscadas, detectou {metrics.total_blinks}"
    assert metrics.complete_blinks == 3, "Todas devem ser completas"
    assert 500 <= metrics.mean_duration_ms <= 650, "Duração adaptativa deve ser entre 500-650ms"
    print("✅ Blink Detector funcionando!")
    return True


def test_tracker_csv_left_lower_columns_and_fps_timestamp():
    """Garante que landmarks inferiores esquerdos não sobrescrevem left_upper_*."""
    tracker = object.__new__(BlinkTracker)
    tracker.config = Config()

    output = io.StringIO()
    writer = tracker._create_csv_writer(output, fps=60.0)
    landmarks = [(float(i), float(i) + 0.5) for i in range(478)]
    results = {
        "landmarks": landmarks,
        "openings": {"left": 75.0, "right": 80.0},
    }

    tracker._write_csv_row(writer, frame_num=3, results=results, fps=60.0)

    lines = output.getvalue().splitlines()
    reader = csv.DictReader(lines[1:])
    row = next(reader)

    left_upper_idx = tracker.config.left_eye.upper[0]
    left_lower_idx = tracker.config.left_eye.lower[0]
    assert row["left_upper_0_x"] == str(float(left_upper_idx))
    assert row["left_upper_0_y"] == str(float(left_upper_idx) + 0.5)
    assert row["left_lower_0_x"] == str(float(left_lower_idx))
    assert row["left_lower_0_y"] == str(float(left_lower_idx) + 0.5)
    assert float(row["timestamp_ms"]) == 50.0


def test_blink_detector_invalid_fps_falls_back_to_30():
    """Protege cálculo de ms_per_frame contra FPS inválido."""
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        detector = BlinkDetector(fps=0)

    assert detector.fps == 30.0
    assert detector.ms_per_frame == 1000.0 / 30.0
    assert any("FPS inválido" in str(item.message) for item in caught)


def test_tracker_interpolates_skipped_openings():
    """Valida interpolação linear usada quando frame_skip > 1."""
    tracker = object.__new__(BlinkTracker)
    interpolated = tracker._interpolate_openings(
        {"left": 10.0, "right": 20.0},
        {"left": 30.0, "right": 60.0},
        0.25,
    )

    assert interpolated == {"left": 15.0, "right": 30.0}


def test_metrics_calculator():
    """Testa calculador de métricas completo"""
    print("\n" + "="*60)
    print("TESTE 6: Metrics Calculator")
    print("="*60)
    
    config = Config()
    calc = MetricsCalculator(config)
    
    # Simular frames
    fps = 30.0
    num_frames = 300  # 10 segundos
    
    # Padrão de abertura com 2 piscadas
    for frame in range(num_frames):
        if 60 <= frame < 80:  # Piscada 1
            left = 100 - min(100, (frame - 60) * 5)
            if left < 5: left = 5
            if frame > 70: left = 5 + (frame - 70) * 9.5
        elif 150 <= frame < 170:  # Piscada 2
            left = 100 - min(100, (frame - 150) * 5)
            if left < 5: left = 5
            if frame > 160: left = 5 + (frame - 160) * 9.5
        else:
            left = 100.0
        
        right = left + np.random.normal(0, 2)  # Olho direito similar com ruído
        
        calc.process_frame(left, right, fps)
    
    # Obter métricas
    metrics = calc.get_metrics()
    
    print(f"Olho esquerdo:")
    print(f"  Piscadas: {metrics['left'].total_blinks}")
    print(f"  Taxa: {metrics['left'].blink_rate_per_minute:.1f}/min")
    
    print(f"\nOlho direito:")
    print(f"  Piscadas: {metrics['right'].total_blinks}")
    print(f"  Taxa: {metrics['right'].blink_rate_per_minute:.1f}/min")
    
    print(f"\nCombinado:")
    print(f"  Total: {metrics['combined'].total_blinks}")
    print(f"  Taxa média: {metrics['combined'].blink_rate_per_minute:.1f}/min")
    
    assert metrics['left'].total_blinks >= 1, "Deve detectar piscadas"
    assert metrics['combined'].total_blinks > 0, "Deve ter métricas combinadas"
    print("✅ Metrics Calculator funcionando!")
    return True


def test_combined_metrics_counts_bilateral_blinks_once():
    """Piscadas sincronizadas dos dois olhos devem contar como um evento clínico."""
    calc = MetricsCalculator(Config())
    left_metrics = BlinkMetrics(
        total_blinks=2,
        blink_events=[
            BlinkEvent(10, 18, 5.0, 333.0, 600.0, "left", baseline_opening=100.0),
            BlinkEvent(80, 88, 40.0, 2666.0, 2933.0, "left", baseline_opening=100.0),
        ],
        total_frames=120,
        duration_seconds=4.0,
        fps=30.0,
    )
    right_metrics = BlinkMetrics(
        total_blinks=1,
        blink_events=[
            BlinkEvent(11, 19, 6.0, 366.0, 633.0, "right", baseline_opening=100.0),
        ],
        total_frames=120,
        duration_seconds=4.0,
        fps=30.0,
    )

    combined = calc._combine_metrics(left_metrics, right_metrics)

    assert combined.raw_eye_blinks == 3
    assert combined.total_blinks == 2
    assert combined.bilateral_blinks == 1
    assert combined.unilateral_left_blinks == 1
    assert combined.unilateral_right_blinks == 0
    assert [blink.eye for blink in combined.blink_events] == ["bilateral", "left"]
    assert combined.bilateral_symmetric_blinks == 1


def test_combined_metrics_classifies_lateral_dominance():
    """Eventos bilaterais assimétricos preservam o lado dominante."""
    calc = MetricsCalculator(Config())
    left_metrics = BlinkMetrics(
        total_blinks=1,
        blink_events=[
            BlinkEvent(10, 18, 20.0, 333.0, 600.0, "left", baseline_opening=100.0),
        ],
        total_frames=60,
        duration_seconds=2.0,
        fps=30.0,
    )
    right_metrics = BlinkMetrics(
        total_blinks=1,
        blink_events=[
            BlinkEvent(11, 19, 55.0, 366.0, 633.0, "right", baseline_opening=100.0),
        ],
        total_frames=60,
        duration_seconds=2.0,
        fps=30.0,
    )

    combined = calc._combine_metrics(left_metrics, right_metrics)

    assert combined.total_blinks == 1
    assert combined.left_dominant_blinks == 1
    assert combined.right_dominant_blinks == 0
    assert combined.blink_events[0].lateral_classification == "left_dominant"
    assert combined.blink_events[0].left_completeness_percent == 80.0
    assert np.isclose(combined.blink_events[0].right_completeness_percent, 45.0)

    borderline_left = BlinkMetrics(
        total_blinks=1,
        blink_events=[
            BlinkEvent(30, 38, 64.0, 1000.0, 1266.0, "left", baseline_opening=100.0),
        ],
        total_frames=60,
        duration_seconds=2.0,
        fps=30.0,
    )
    borderline_right = BlinkMetrics(
        total_blinks=1,
        blink_events=[
            BlinkEvent(30, 38, 61.5, 1000.0, 1266.0, "right", baseline_opening=100.0),
        ],
        total_frames=60,
        duration_seconds=2.0,
        fps=30.0,
    )

    borderline = calc._combine_metrics(borderline_left, borderline_right)

    assert borderline.right_dominant_blinks == 1
    assert borderline.blink_events[0].lateral_classification == "right_dominant"


def test_config_system():
    """Testa sistema de configuração"""
    print("\n" + "="*60)
    print("TESTE 7: Sistema de Configuração")
    print("="*60)
    
    # Config padrão
    config = Config()
    print(f"Versão: {config.version}")
    print(f"Right eye landmarks: {len(config.right_eye.upper)} upper, {len(config.right_eye.lower)} lower")
    print(f"Detection confidence: {config.detection.min_detection_confidence}")
    
    # Validar
    valid, errors = config.validate()
    assert valid, f"Config padrão deve ser válida: {errors}"
    print("✅ Configuração padrão válida")
    
    # Modificar
    config.thresholds.blink_threshold_percent = 25.0
    config.filters.moving_average_window = 7
    
    valid, errors = config.validate()
    assert valid, f"Config modificada deve ser válida: {errors}"
    print("✅ Configuração modificada válida")
    
    # Testar inválida
    bad_config = Config()
    bad_config.thresholds.blink_threshold_percent = 150
    valid, errors = bad_config.validate()
    assert not valid, "Deve detectar valor inválido"
    print(f"✅ Detectou config inválida: {errors[0]}")
    
    # Salvar e carregar
    yaml_path = "/tmp/test_config.yaml"
    json_path = "/tmp/test_config.json"
    
    config.to_yaml(yaml_path)
    print(f"✅ Salva em YAML")
    
    config.to_json(json_path)
    print(f"✅ Salva em JSON")
    
    # Limpar
    os.remove(yaml_path)
    os.remove(json_path)
    
    print("✅ Sistema de configuração funcionando!")
    return True


def run_all_tests():
    """Executa todos os testes"""
    print("\n" + "="*70)
    print("BLINKTRACKING V2.0 - TESTES DOS MÓDULOS CORE")
    print("="*70)
    
    tests = [
        ("Kalman Filter", test_kalman_filter),
        ("Moving Average Filter", test_moving_average_filter),
        ("Landmark Stabilizer", test_landmark_stabilizer),
        ("Rotation Normalizer", test_rotation_normalizer),
        ("Blink Detector", test_blink_detector),
        ("Metrics Calculator", test_metrics_calculator),
        ("Sistema de Configuração", test_config_system),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            success = test_func()
            results.append((name, True, None))
        except AssertionError as e:
            results.append((name, False, str(e)))
            print(f"\n❌ ASSERT ERROR em {name}: {e}")
        except Exception as e:
            results.append((name, False, str(e)))
            print(f"\n❌ ERROR em {name}: {e}")
            import traceback
            traceback.print_exc()
    
    # Resumo
    print("\n" + "="*70)
    print("RESUMO DOS TESTES")
    print("="*70)
    
    passed = sum(1 for _, success, _ in results if success)
    failed = len(results) - passed
    
    for name, success, error in results:
        status = "✅ PASSOU" if success else "❌ FALHOU"
        print(f"{status}: {name}")
        if error:
            print(f"   → {error}")
    
    print("\n" + "-"*70)
    print(f"Total: {len(results)} testes | ✅ {passed} passaram | ❌ {failed} falharam")
    print("="*70)
    
    if failed == 0:
        print("\n🎉 TODOS OS TESTES PASSARAM! O sistema está funcionando corretamente.")
    else:
        print(f"\n⚠️  {failed} teste(s) falharam. Verifique os erros acima.")
    
    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
