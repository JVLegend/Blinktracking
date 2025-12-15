import cv2
import mediapipe as mp
import sys
import csv
import os
from tqdm import tqdm

def extract_all_points_to_csv(video_path, output_csv_path=None):
    """
    Extrai TODOS os 478 pontos faciais do MediaPipe e salva em CSV com barra de progresso
    
    Args:
        video_path: Caminho do vídeo de entrada
        output_csv_path: Caminho do CSV de saída (opcional, usa o mesmo nome do vídeo se não fornecido)
    """
    
    # Se não forneceu caminho de saída, usa o mesmo nome do vídeo
    if output_csv_path is None:
        video_dir = os.path.dirname(video_path)
        video_name = os.path.splitext(os.path.basename(video_path))[0]
        output_csv_path = os.path.join(video_dir, f"{video_name}_all_points.csv")
    
    try:
        # Inicializar MediaPipe
        mp_face_mesh = mp.solutions.face_mesh
        face_mesh = mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
            refine_landmarks=True  # Inclui íris (478 pontos)
        )

        # Abrir vídeo
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"❌ Erro: Não foi possível abrir o vídeo: {video_path}")
            return False

        # Obter total de frames
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        print(f"\n📹 Vídeo: {os.path.basename(video_path)}")
        print(f"📊 Resolução: {width}x{height}")
        print(f"📊 Total de frames: {total_frames}")
        print(f"⏱️  FPS: {fps:.2f}")
        print(f"💾 Salvando em: {output_csv_path}")
        print(f"🎯 Extraindo TODOS os 478 pontos do MediaPipe Face Mesh\n")

        # Criar arquivo CSV
        with open(output_csv_path, 'w', newline='', encoding='utf-8') as csvfile:
            # Escrever Metadados (FPS)
            csvfile.write(f"# FPS: {fps:.2f}\n")

            # Preparar cabeçalho - 478 pontos x 3 coordenadas (x, y, z)
            fieldnames = ['frame', 'method', 'face_detected']
            
            # Adicionar colunas para cada ponto (0-477)
            for i in range(478):
                fieldnames.extend([f'point_{i}_x', f'point_{i}_y', f'point_{i}_z'])
            
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()

            # Processar frames com barra de progresso
            frame_count = 0
            frames_with_face = 0
            
            with tqdm(total=total_frames, desc="🔍 Processando", unit="frame", 
                     bar_format='{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}, {rate_fmt}]') as pbar:
                
                while True:
                    ret, frame = cap.read()
                    if not ret:
                        break

                    # Converter para RGB
                    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    results = face_mesh.process(rgb_frame)

                    # Preparar dados do frame
                    frame_data = {
                        'frame': frame_count,
                        'method': 'mediapipe_full',
                        'face_detected': 0
                    }

                    if results.multi_face_landmarks:
                        landmarks = results.multi_face_landmarks[0]
                        frames_with_face += 1
                        frame_data['face_detected'] = 1

                        # Extrair TODOS os pontos
                        for i in range(478):
                            # Coordenadas normalizadas (0-1) convertidas para pixels
                            x = landmarks.landmark[i].x * width
                            y = landmarks.landmark[i].y * height
                            z = landmarks.landmark[i].z * width  # Z também em escala de pixels
                            
                            frame_data[f'point_{i}_x'] = x
                            frame_data[f'point_{i}_y'] = y
                            frame_data[f'point_{i}_z'] = z

                    # Escrever linha no CSV
                    writer.writerow(frame_data)
                    
                    frame_count += 1
                    pbar.update(1)

        cap.release()
        
        # Estatísticas finais
        detection_rate = (frames_with_face / total_frames * 100) if total_frames > 0 else 0
        file_size_mb = os.path.getsize(output_csv_path) / (1024 * 1024)
        
        print(f"\n✅ Processamento concluído!")
        print(f"📊 Frames processados: {frame_count}")
        print(f"👤 Frames com face detectada: {frames_with_face} ({detection_rate:.1f}%)")
        print(f"💾 CSV salvo em: {output_csv_path}")
        print(f"📦 Tamanho do arquivo: {file_size_mb:.2f} MB")
        print(f"🎯 Total de pontos por frame: 478 (x, y, z)")
        
        return True

    except Exception as e:
        print(f"\n❌ Erro durante o processamento: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("❌ Uso: python extract_all_points_to_csv.py <caminho_video> [caminho_csv_saida]")
        print("\nExemplos:")
        print("  python extract_all_points_to_csv.py video.mp4")
        print("  python extract_all_points_to_csv.py video.mp4 saida/todos_pontos.csv")
        print("\n📝 Este script extrai TODOS os 478 pontos do MediaPipe Face Mesh")
        print("   incluindo contorno facial, olhos, íris, boca, nariz, etc.")
        sys.exit(1)
    
    video_path = sys.argv[1]
    output_csv = sys.argv[2] if len(sys.argv) > 2 else None
    
    if not os.path.exists(video_path):
        print(f"❌ Erro: Arquivo não encontrado: {video_path}")
        sys.exit(1)
    
    success = extract_all_points_to_csv(video_path, output_csv)
    sys.exit(0 if success else 1)
