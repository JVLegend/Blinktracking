import cv2
import mediapipe as mp
import numpy as np
import sys
import json
import os
import codecs
import warnings

# Suprimir avisos do protobuf
warnings.filterwarnings('ignore', category=UserWarning)

# Configurar stderr para usar UTF-8
sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer)

def extract_points_from_video(video_path):
    try:
        mp_face_mesh = mp.solutions.face_mesh
        face_mesh = mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

        # Abre o vídeo
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(json.dumps({
                "error": "Não foi possível abrir o vídeo",
                "points": []
            }))
            return []

        all_points = []
        frame_count = 0

        # Índices dos pontos dos olhos no MediaPipe Face Mesh para EXTRAÇÃO DE DADOS (CSV)
        # IMPORTANTE: Estes pontos são extraídos para análise e salvos no arquivo CSV.
        # Os pontos de visualização do vídeo são diferentes (ver process_video_mediapipe.py).
        right_eye_upper = [27, 29, 30, 31, 32, 33, 34]  # Pálpebra superior direita (right_upper_X)
        right_eye_lower = [35, 36, 37, 38, 39, 40, 41, 42, 43]  # Pálpebra inferior direita (right_lower_X)
        left_eye_upper = [257, 259, 260, 261, 262, 263, 264]  # Pálpebra superior esquerda (left_upper_X)
        left_eye_lower = [265, 266, 267, 268, 269, 270, 271, 272, 273]  # Pálpebra inferior esquerda (left_lower_X)

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # Converte para RGB (MediaPipe usa RGB)
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(rgb_frame)

            frame_data = {
                "frame": frame_count,
                "method": "mediapipe"
            }

            if results.multi_face_landmarks:
                landmarks = results.multi_face_landmarks[0]  # Pega a primeira face

                # Processar pontos do olho direito
                for i, idx in enumerate(right_eye_upper, 1):
                    x = int(landmarks.landmark[idx].x * frame.shape[1])
                    y = int(landmarks.landmark[idx].y * frame.shape[0])
                    frame_data[f"right_upper_{i}_x"] = x
                    frame_data[f"right_upper_{i}_y"] = y

                for i, idx in enumerate(right_eye_lower, 1):
                    x = int(landmarks.landmark[idx].x * frame.shape[1])
                    y = int(landmarks.landmark[idx].y * frame.shape[0])
                    frame_data[f"right_lower_{i}_x"] = x
                    frame_data[f"right_lower_{i}_y"] = y

                # Processar pontos do olho esquerdo
                for i, idx in enumerate(left_eye_upper, 1):
                    x = int(landmarks.landmark[idx].x * frame.shape[1])
                    y = int(landmarks.landmark[idx].y * frame.shape[0])
                    frame_data[f"left_upper_{i}_x"] = x
                    frame_data[f"left_upper_{i}_y"] = y

                for i, idx in enumerate(left_eye_lower, 1):
                    x = int(landmarks.landmark[idx].x * frame.shape[1])
                    y = int(landmarks.landmark[idx].y * frame.shape[0])
                    frame_data[f"left_lower_{i}_x"] = x
                    frame_data[f"left_lower_{i}_y"] = y

                all_points.append(frame_data)

            frame_count += 1

        cap.release()
        
        # Garantir que sempre retorne um JSON válido
        print(json.dumps({
            "success": True,
            "points": all_points,
            "total_frames": frame_count
        }))
        return all_points

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
            "points": []
        }))
        return []

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({
            "success": False,
            "error": "Forneça o caminho do vídeo como argumento",
            "points": []
        }))
        sys.exit(1)

    video_path = sys.argv[1]
    extract_points_from_video(video_path) 