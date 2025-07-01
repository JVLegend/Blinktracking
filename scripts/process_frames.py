import cv2
import dlib
import numpy as np
import sys
import json
import mediapipe as mp
import pandas as pd
import base64

def process_frames_dlib(video_path, csv_path, frame_numbers):
    try:
        # Inicializar detector e predictor do dlib
        detector = dlib.get_frontal_face_detector()
        predictor = dlib.shape_predictor("models/shape_predictor_68_face_landmarks.dat")
        
        # Carregar o vídeo
        cap = cv2.VideoCapture(video_path)
        
        # Carregar os pontos do CSV
        points_data = pd.read_csv(csv_path)
        
        for frame_number in frame_numbers:
            frame_number = int(frame_number)
            
            # Posicionar no frame correto
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
            ret, frame = cap.read()
            
            if not ret:
                print(json.dumps({
                    "error": f"Não foi possível ler o frame {frame_number}"
                }))
                continue
            
            # Detectar face e pontos
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = detector(gray)
            
            for face in faces:
                landmarks = predictor(gray, face)
                
                # Desenhar pontos dos olhos (36-47 são os pontos dos olhos)
                for n in range(36, 48):
                    x = landmarks.part(n).x
                    y = landmarks.part(n).y
                    cv2.circle(frame, (x, y), 2, (0, 255, 0), -1)
                    cv2.putText(frame, str(n), (x, y), cv2.FONT_HERSHEY_SIMPLEX, 
                              0.3, (255, 0, 0), 1)
            
            # Salvar frame processado
            _, buffer = cv2.imencode('.jpg', frame)
            
            # Enviar dados do frame processado
            print(json.dumps({
                "frameNumber": str(frame_number),
                "frameData": buffer.tobytes().hex(),
                "progress": int((frame_numbers.index(frame_number) + 1) / len(frame_numbers) * 100)
            }))
            sys.stdout.flush()
        
        cap.release()
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

def process_frames_mediapipe(video_path, csv_path, frame_numbers):
    try:
        # Inicializar MediaPipe Face Mesh
        mp_face_mesh = mp.solutions.face_mesh
        face_mesh = mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

        # Carregar o vídeo e CSV
        cap = cv2.VideoCapture(video_path)
        points_data = pd.read_csv(csv_path)
        
        processed_frames = []
        
        for frame_number in frame_numbers:
            frame_number = int(frame_number)
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
            ret, frame = cap.read()
            
            if not ret:
                continue

            # Obter dados do CSV para este frame
            frame_data = points_data[points_data['frame'] == frame_number].iloc[0]
            height, width = frame.shape[:2]

            # Desenhar pontos do olho direito
            for i in range(1, 8):  # 7 pontos superiores
                x = int(frame_data[f'right_upper_{i}_x'])
                y = int(frame_data[f'right_upper_{i}_y'])
                cv2.circle(frame, (x, y), 2, (0, 255, 0), -1)
                cv2.putText(frame, f'RU{i}', (x+5, y-5), 
                          cv2.FONT_HERSHEY_SIMPLEX, 0.3, (255, 0, 0), 1)

            for i in range(1, 10):  # 9 pontos inferiores
                x = int(frame_data[f'right_lower_{i}_x'])
                y = int(frame_data[f'right_lower_{i}_y'])
                cv2.circle(frame, (x, y), 2, (0, 255, 0), -1)
                cv2.putText(frame, f'RL{i}', (x+5, y-5), 
                          cv2.FONT_HERSHEY_SIMPLEX, 0.3, (255, 0, 0), 1)

            # Desenhar pontos do olho esquerdo
            for i in range(1, 8):  # 7 pontos superiores
                x = int(frame_data[f'left_upper_{i}_x'])
                y = int(frame_data[f'left_upper_{i}_y'])
                cv2.circle(frame, (x, y), 2, (0, 255, 0), -1)
                cv2.putText(frame, f'LU{i}', (x+5, y-5), 
                          cv2.FONT_HERSHEY_SIMPLEX, 0.3, (255, 0, 0), 1)

            for i in range(1, 10):  # 9 pontos inferiores
                x = int(frame_data[f'left_lower_{i}_x'])
                y = int(frame_data[f'left_lower_{i}_y'])
                cv2.circle(frame, (x, y), 2, (0, 255, 0), -1)
                cv2.putText(frame, f'LL{i}', (x+5, y-5), 
                          cv2.FONT_HERSHEY_SIMPLEX, 0.3, (255, 0, 0), 1)

            # Converter frame para base64
            _, buffer = cv2.imencode('.jpg', frame)
            frame_base64 = base64.b64encode(buffer).decode('utf-8')
            
            processed_frames.append({
                "frameNumber": str(frame_number),
                "imageData": frame_base64
            })

            # Reportar progresso
            progress = int((len(processed_frames) / len(frame_numbers)) * 100)
            sys.stderr.write(json.dumps({"progress": progress}) + '\n')
            sys.stderr.flush()

        cap.release()
        face_mesh.close()

        print(json.dumps({"frames": processed_frames}))
        sys.stdout.flush()

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(json.dumps({"error": "Argumentos insuficientes"}))
        sys.exit(1)
    
    video_path = sys.argv[1]
    csv_path = sys.argv[2]
    method = sys.argv[3]
    frame_numbers = sys.argv[4:]
    
    if method == "dlib":
        process_frames_dlib(video_path, csv_path, frame_numbers)
    elif method == "mediapipe":
        process_frames_mediapipe(video_path, csv_path, frame_numbers)
    else:
        print(json.dumps({"error": "Método de processamento inválido"}))
        sys.exit(1) 