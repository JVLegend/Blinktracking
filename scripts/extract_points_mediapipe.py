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
        # IMPORTANTE: Usando os índices CORRETOS do contorno do olho conforme documentação oficial do MediaPipe
        # Referência: https://github.com/google/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png
        
        # rightEyeUpper0 e rightEyeLower0 da documentação oficial
        right_eye_upper = [246, 161, 160, 159, 158, 157, 173]  # Pálpebra superior direita (right_upper_X)
        right_eye_lower = [33, 7, 163, 144, 145, 153, 154, 155, 133]  # Pálpebra inferior direita (right_lower_X)
        
        # leftEyeUpper0 e leftEyeLower0 da documentação oficial
        left_eye_upper = [466, 388, 387, 386, 385, 384, 398]  # Pálpebra superior esquerda (left_upper_X)
        left_eye_lower = [263, 249, 390, 373, 374, 380, 381, 382, 362]  # Pálpebra inferior esquerda (left_lower_X)

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