import sys
import json
import os
import cv2
import dlib
import numpy as np
import codecs

# Configurar stderr para usar UTF-8
sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer)

def extract_points_from_video(video_path):
    try:
        # Inicializa detector e predictor
        detector = dlib.get_frontal_face_detector()
        predictor = dlib.shape_predictor("models/shape_predictor_68_face_landmarks.dat")

        # Abre o vídeo
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(json.dumps({
                "success": False,
                "error": "Não foi possível abrir o vídeo",
                "points": []
            }))
            return []

        all_points = []
        frame_count = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # Converte para escala de cinza
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = detector(gray)

            frame_data = {
                "frame": frame_count,
                "method": "dlib"
            }

            if len(faces) > 0:
                # Pega apenas a primeira face detectada
                face = faces[0]
                landmarks = predictor(gray, face)

                # Extrair pontos específicos dos olhos (37-42 olho esquerdo, 43-48 olho direito)
                eye_points = [37, 38, 40, 41]  # Pontos específicos que queremos
                for point_idx in eye_points:
                    point = landmarks.part(point_idx)
                    frame_data[f"{point_idx}_x"] = point.x
                    frame_data[f"{point_idx}_y"] = point.y

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