import argparse
import cv2
import dlib
import numpy as np
import json
import os
import sys

def print_progress(progress):
    print(f"Progresso: {progress}", file=sys.stderr)
    sys.stderr.flush()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("video_path", help="Caminho para o vídeo de entrada")
    parser.add_argument("tmp_dir", help="Diretório temporário para arquivos")
    parser.add_argument("predictor_path", help="Caminho para o arquivo do preditor facial")
    
    args = parser.parse_args()
    
    try:
        # Carregar o detector e preditor
        detector = dlib.get_frontal_face_detector()
        predictor = dlib.shape_predictor(args.predictor_path)
        
        # Gerar nome único para o arquivo de saída
        output_filename = f"processed_{os.path.basename(args.video_path)}"
        output_path = os.path.join(args.tmp_dir, output_filename)
        
        # Processar vídeo
        cap = cv2.VideoCapture(args.video_path)
        
        if not cap.isOpened():
            raise Exception("Não foi possível abrir o vídeo")
            
        # Configurar o writer do vídeo de saída
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        # Obter total de frames para calcular progresso
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        current_frame = 0
        last_progress = -1
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            # Calcular e enviar progresso
            current_frame += 1
            progress = int((current_frame / total_frames) * 100)
            
            # Só envia o progresso se mudou
            if progress != last_progress:
                print_progress(progress)
                last_progress = progress
            
            # Detectar face
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = detector(gray)
            
            for face in faces:
                landmarks = predictor(gray, face)
                
                # Desenhar pontos dos olhos
                for n in range(36, 48):
                    x = landmarks.part(n).x
                    y = landmarks.part(n).y
                    cv2.circle(frame, (x, y), 2, (0, 255, 0), -1)
            
            out.write(frame)
        
        cap.release()
        out.release()
        
        # Retornar nome do arquivo para download
        result = {
            "success": True,
            "outputFile": output_filename
        }
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_result))
        exit(1)

if __name__ == "__main__":
    main()