import cv2
import sys
import json

def extract_frame(video_path, frame_number):
    try:
        # Abrir o vídeo
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            raise Exception("Não foi possível abrir o vídeo")

        # Converter frame_number para inteiro
        frame_number = int(frame_number)
        
        # Posicionar no frame desejado
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
        
        # Ler o frame
        ret, frame = cap.read()
        
        if not ret:
            raise Exception(f"Não foi possível ler o frame {frame_number}")
        
        # Codificar o frame em bytes JPEG
        _, buffer = cv2.imencode('.jpg', frame)
        
        # Escrever os bytes diretamente para stdout
        sys.stdout.buffer.write(buffer.tobytes())
        
        # Liberar recursos
        cap.release()
        
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Argumentos inválidos"}), file=sys.stderr)
        sys.exit(1)
        
    video_path = sys.argv[1]
    frame_number = sys.argv[2]
    
    extract_frame(video_path, frame_number) 