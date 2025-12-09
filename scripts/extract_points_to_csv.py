import cv2
import mediapipe as mp
import sys
import csv
import os
from tqdm import tqdm

def extract_points_to_csv(video_path, output_csv_path=None):
    """
    Extrai pontos faciais do MediaPipe e salva diretamente em CSV com barra de progresso
    
    Args:
        video_path: Caminho do vídeo de entrada
        output_csv_path: Caminho do CSV de saída (opcional, usa o mesmo nome do vídeo se não fornecido)
    """
    
    # Se não forneceu caminho de saída, usa o mesmo nome do vídeo
    if output_csv_path is None:
        video_dir = os.path.dirname(video_path)
        video_name = os.path.splitext(os.path.basename(video_path))[0]
        output_csv_path = os.path.join(video_dir, f"{video_name}.csv")
    
    try:
        # Inicializar MediaPipe
        mp_face_mesh = mp.solutions.face_mesh
        face_mesh = mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

        # Abrir vídeo
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"❌ Erro: Não foi possível abrir o vídeo: {video_path}")
            return False

        # Obter total de frames
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        print(f"\n📹 Vídeo: {os.path.basename(video_path)}")
        print(f"📊 Total de frames: {total_frames}")
        print(f"⏱️  FPS: {fps:.2f}")
        print(f"💾 Salvando em: {output_csv_path}\n")

        # Índices dos pontos do MediaPipe - CORRETOS (rightEyeUpper0/Lower0 e leftEyeUpper0/Lower0)
        right_eye_upper = [246, 161, 160, 159, 158, 157, 173]
        right_eye_lower = [33, 7, 163, 144, 145, 153, 154, 155, 133]
        left_eye_upper = [466, 388, 387, 386, 385, 384, 398]
        left_eye_lower = [263, 249, 390, 373, 374, 380, 381, 382, 362]

        # Criar arquivo CSV
        with open(output_csv_path, 'w', newline='', encoding='utf-8') as csvfile:
            # Preparar cabeçalho
            fieldnames = ['frame', 'method']
            
            # Adicionar colunas para cada ponto
            for i in range(1, len(right_eye_upper) + 1):
                fieldnames.extend([f'right_upper_{i}_x', f'right_upper_{i}_y'])
            for i in range(1, len(right_eye_lower) + 1):
                fieldnames.extend([f'right_lower_{i}_x', f'right_lower_{i}_y'])
            for i in range(1, len(left_eye_upper) + 1):
                fieldnames.extend([f'left_upper_{i}_x', f'left_upper_{i}_y'])
            for i in range(1, len(left_eye_lower) + 1):
                fieldnames.extend([f'left_lower_{i}_x', f'left_lower_{i}_y'])
            
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
                        'method': 'mediapipe'
                    }

                    if results.multi_face_landmarks:
                        landmarks = results.multi_face_landmarks[0]
                        frames_with_face += 1

                        # Extrair pontos do olho direito superior
                        for i, idx in enumerate(right_eye_upper, 1):
                            x = int(landmarks.landmark[idx].x * frame.shape[1])
                            y = int(landmarks.landmark[idx].y * frame.shape[0])
                            frame_data[f'right_upper_{i}_x'] = x
                            frame_data[f'right_upper_{i}_y'] = y

                        # Extrair pontos do olho direito inferior
                        for i, idx in enumerate(right_eye_lower, 1):
                            x = int(landmarks.landmark[idx].x * frame.shape[1])
                            y = int(landmarks.landmark[idx].y * frame.shape[0])
                            frame_data[f'right_lower_{i}_x'] = x
                            frame_data[f'right_lower_{i}_y'] = y

                        # Extrair pontos do olho esquerdo superior
                        for i, idx in enumerate(left_eye_upper, 1):
                            x = int(landmarks.landmark[idx].x * frame.shape[1])
                            y = int(landmarks.landmark[idx].y * frame.shape[0])
                            frame_data[f'left_upper_{i}_x'] = x
                            frame_data[f'left_upper_{i}_y'] = y

                        # Extrair pontos do olho esquerdo inferior
                        for i, idx in enumerate(left_eye_lower, 1):
                            x = int(landmarks.landmark[idx].x * frame.shape[1])
                            y = int(landmarks.landmark[idx].y * frame.shape[0])
                            frame_data[f'left_lower_{i}_x'] = x
                            frame_data[f'left_lower_{i}_y'] = y

                    # Escrever linha no CSV
                    writer.writerow(frame_data)
                    
                    frame_count += 1
                    pbar.update(1)

        cap.release()
        
        # Estatísticas finais
        detection_rate = (frames_with_face / total_frames * 100) if total_frames > 0 else 0
        print(f"\n✅ Processamento concluído!")
        print(f"📊 Frames processados: {frame_count}")
        print(f"👤 Frames com face detectada: {frames_with_face} ({detection_rate:.1f}%)")
        print(f"💾 CSV salvo em: {output_csv_path}")
        
        return True

    except Exception as e:
        print(f"\n❌ Erro durante o processamento: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("❌ Uso: python extract_points_to_csv.py <caminho_video> [caminho_csv_saida]")
        print("\nExemplos:")
        print("  python extract_points_to_csv.py video.mp4")
        print("  python extract_points_to_csv.py video.mp4 saida/dados.csv")
        sys.exit(1)
    
    video_path = sys.argv[1]
    output_csv = sys.argv[2] if len(sys.argv) > 2 else None
    
    if not os.path.exists(video_path):
        print(f"❌ Erro: Arquivo não encontrado: {video_path}")
        sys.exit(1)
    
    success = extract_points_to_csv(video_path, output_csv)
    sys.exit(0 if success else 1)
