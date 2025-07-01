import cv2
import mediapipe as mp
import json
import sys
import os
import numpy as np
import argparse
import codecs

# Configurar stderr para usar UTF-8
sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer)

"""
Mapeamento dos pontos do MediaPipe:

Olho Esquerdo:
- Pálpebra Superior (left_upper_X): [386, 387, 388, 390, 373, 374, 380]
- Pálpebra Inferior (left_lower_X): [386, 385, 384, 398, 382, 381, 380, 374, 373]
- Íris (left_iris_X): [474, 475, 476, 477]
- Contorno Completo: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]

Olho Direito:
- Pálpebra Superior (right_upper_X): [159, 160, 161, 163, 144, 145, 153]
- Pálpebra Inferior (right_lower_X): [159, 158, 157, 173, 155, 154, 153, 145, 144]
- Íris (right_iris_X): [469, 470, 471, 472]
- Contorno Completo: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
"""

def print_progress(progress):
    print(f"Progresso: {progress}", file=sys.stderr)
    sys.stderr.flush()

def process_video(input_path, output_path):
    try:
        # Inicializar MediaPipe Face Mesh
        mp_face_mesh = mp.solutions.face_mesh
        face_mesh = mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,  # Importante para detectar pontos da íris
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

        print("INFO:Iniciando processamento do vídeo", file=sys.stderr)

        # Abrir vídeo
        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            raise Exception("Erro ao abrir o vídeo")

        # Configurações do vídeo
        frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        # Configurar o writer do vídeo
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (frame_width, frame_height))

        # Posição do texto na tela
        text_x_position = int(frame_width * 0.8)

        # Índices dos pontos dos olhos no MediaPipe
        # Olho direito
        right_eye_indices = {
            'upper': [159, 160, 161, 163, 144, 145, 153],  # Pálpebra superior direita
            'lower': [159, 158, 157, 173, 155, 154, 153, 145, 144],  # Pálpebra inferior direita
            'iris': [469, 470, 471, 472],  # Íris direita
            'contour': [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]  # Contorno completo
        }

        # Olho esquerdo
        left_eye_indices = {
            'upper': [386, 387, 388, 390, 373, 374, 380],  # Pálpebra superior esquerda
            'lower': [386, 385, 384, 398, 382, 381, 380, 374, 373],  # Pálpebra inferior esquerda
            'iris': [474, 475, 476, 477],  # Íris esquerda
            'contour': [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]  # Contorno completo
        }

        frame_count = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            # Converter para RGB (MediaPipe usa RGB)
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(rgb_frame)

            if results.multi_face_landmarks:
                for face_landmarks in results.multi_face_landmarks:
                    # Olho direito
                    # Contorno completo
                    for idx in right_eye_indices['contour']:
                        point = face_landmarks.landmark[idx]
                        x = int(point.x * frame_width)
                        y = int(point.y * frame_height)
                        cv2.circle(frame, (x, y), 2, (0, 255, 0), -1)

                    # Íris direita
                    for idx in right_eye_indices['iris']:
                        point = face_landmarks.landmark[idx]
                        x = int(point.x * frame_width)
                        y = int(point.y * frame_height)
                        cv2.circle(frame, (x, y), 2, (255, 192, 203), -1)  # Rosa (pink)

                    # Olho esquerdo
                    # Contorno completo
                    for idx in left_eye_indices['contour']:
                        point = face_landmarks.landmark[idx]
                        x = int(point.x * frame_width)
                        y = int(point.y * frame_height)
                        cv2.circle(frame, (x, y), 2, (0, 255, 0), -1)

                    # Íris esquerda
                    for idx in left_eye_indices['iris']:
                        point = face_landmarks.landmark[idx]
                        x = int(point.x * frame_width)
                        y = int(point.y * frame_height)
                        cv2.circle(frame, (x, y), 2, (255, 192, 203), -1)  # Rosa (pink)

                    # Calcular e exibir métricas
                    right_eye_height = calculate_eye_height(
                        face_landmarks.landmark,
                        right_eye_indices['upper'][3],  # Ponto central superior
                        right_eye_indices['lower'][3],  # Ponto central inferior
                        frame_width,
                        frame_height
                    )
                    left_eye_height = calculate_eye_height(
                        face_landmarks.landmark,
                        left_eye_indices['upper'][3],   # Ponto central superior
                        left_eye_indices['lower'][3],   # Ponto central inferior
                        frame_width,
                        frame_height
                    )

                    metrics = [
                        f"Right Eye Height: {right_eye_height:.2f}",
                        f"Left Eye Height: {left_eye_height:.2f}",
                        f"Frame: {frame_count}/{total_frames}"
                    ]

                    for i, metric in enumerate(metrics):
                        y_pos = 30 + (i * 40)
                        cv2.putText(frame, metric, (text_x_position, y_pos),
                                  cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

            # Salvar frame
            out.write(frame)
            frame_count += 1
            progress = (frame_count / total_frames) * 100
            print_progress(progress)

        # Liberar recursos
        cap.release()
        out.release()
        face_mesh.close()
        cv2.destroyAllWindows()

        # Retornar sucesso e nome do arquivo
        result = {
            "success": True,
            "outputFile": os.path.basename(output_path)
        }
        print(json.dumps(result))
        sys.stdout.flush()

        return True

    except Exception as e:
        print(f"ERRO: {str(e)}", file=sys.stderr)
        print(json.dumps({"success": False, "error": str(e)}))
        sys.stdout.flush()
        return False

def calculate_eye_height(landmarks, upper_idx, lower_idx, width, height):
    """Calcula a altura entre dois pontos dos olhos"""
    upper = landmarks[upper_idx]
    lower = landmarks[lower_idx]
    return np.sqrt(
        ((upper.x * width - lower.x * width) ** 2) +
        ((upper.y * height - lower.y * height) ** 2)
    )

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('video_path', help='Caminho do vídeo de entrada')
    parser.add_argument('tmp_dir', help='Diretório temporário')
    parser.add_argument('predictor_path', help='Caminho do modelo (não usado no MediaPipe)')
    args = parser.parse_args()

    try:
        # Gerar nome do arquivo de saída
        output_filename = f"processed_{os.path.basename(args.video_path)}"
        output_path = os.path.join(args.tmp_dir, output_filename)
        
        success = process_video(args.video_path, output_path)
        if not success:
            sys.exit(1)
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main() 