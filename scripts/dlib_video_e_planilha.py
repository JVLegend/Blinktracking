import dlib
import numpy as np
from tqdm import tqdm  
import cv2
import pandas as pd

# Carregar o detector de faces e o preditor de pontos faciais
detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor("shape_predictor_68_face_landmarks.dat")

def draw_eye_points(frame, landmarks):
    # Olhos estão nos índices 36-41 e 42-47
    left_eye = landmarks.parts()[36:42]
    right_eye = landmarks.parts()[42:48]

    # Desenhar o olho esquerdo
    for i, point in enumerate(left_eye, start=36):
        cv2.circle(frame, (point.x, point.y), 2, (0, 255, 0), -1)
        cv2.putText(frame, str(i), (point.x + 5, point.y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 1)

    # Desenhar o olho direito
    for i, point in enumerate(right_eye, start=42):
        cv2.circle(frame, (point.x, point.y), 2, (0, 255, 0), -1)
        cv2.putText(frame, str(i), (point.x + 5, point.y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 1)

def calculate_distance(point1, point2):
    # Calcular a distância euclidiana entre dois pontos
    return np.linalg.norm(np.array([point1.x, point1.y]) - np.array([point2.x, point2.y]))

# Definir valores de referência para as distâncias (ajuste conforme necessário)
reference_distances = {
    '37-41': 50,  # Exemplo de valor de referência para a distância entre os landmarks 37 e 41
    '38-40': 50,  # Exemplo de valor de referência para a distância entre os landmarks 38 e 40
    '43-47': 50,  # Exemplo de valor de referência para a distância entre os landmarks 43 e 47
    '44-46': 50   # Exemplo de valor de referência para a distância entre os landmarks 44 e 46
}

def process_video(input_video_path, output_video_path, generate_video=True, generate_xlsx=True):
    # Abrir o vídeo
    cap = cv2.VideoCapture(input_video_path)

    # Obter as propriedades do vídeo
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))  # Total de frames

    # Criar o objeto VideoWriter para salvar o vídeo de saída, se necessário
    if generate_video:
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))

    # Calcular a posição horizontal para o texto (10% mais para a esquerda)
    text_offset = int(width * 0.10)  # 10% da largura do vídeo
    text_x_position = width - 250 - text_offset  # Ajustar a posição do texto

    # Inicializar contadores de piscar
    blink_counts = [0, 0, 0, 0]  # Contadores para cada par de landmarks
    blink_threshold = 30  # Limite de percentual para considerar um piscar

    # Dados para o arquivo XLSX
    data = []

    # Usar tqdm para mostrar o progresso
    for frame_index in tqdm(range(total_frames), desc="Processando frames"):
        ret, frame = cap.read()
        if not ret:
            break

        # Converter a imagem para escala de cinza
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Detectar faces
        faces = detector(gray)

        for face in faces:
            landmarks = predictor(gray, face)
            if generate_video:
                draw_eye_points(frame, landmarks)

            # Calcular as distâncias atuais
            dist_37_41 = calculate_distance(landmarks.part(37), landmarks.part(41))
            dist_38_40 = calculate_distance(landmarks.part(38), landmarks.part(40))
            dist_43_47 = calculate_distance(landmarks.part(43), landmarks.part(47))
            dist_44_46 = calculate_distance(landmarks.part(44), landmarks.part(46))

            # Calcular porcentagens em relação aos valores de referência
            percent_37_41 = max(0, ((dist_37_41 / reference_distances['37-41']) * 100))
            percent_38_40 = max(0, ((dist_38_40 / reference_distances['38-40']) * 100))
            percent_43_47 = max(0, ((dist_43_47 / reference_distances['43-47']) * 100))
            percent_44_46 = max(0, ((dist_44_46 / reference_distances['44-46']) * 100))

            # Incrementar contadores de piscar
            if percent_37_41 < blink_threshold:
                blink_counts[0] += 1
            if percent_38_40 < blink_threshold:
                blink_counts[1] += 1
            if percent_43_47 < blink_threshold:
                blink_counts[2] += 1
            if percent_44_46 < blink_threshold:
                blink_counts[3] += 1

            # Adicionar dados ao XLSX
            if generate_xlsx:
                data.append({
                    'Frame': frame_index,
                    'Dist 37-41': percent_37_41,
                    'Dist 38-40': percent_38_40,
                    'Dist 43-47': percent_43_47,
                    'Dist 44-46': percent_44_46,
                    'Blink 37-41': blink_counts[0],
                    'Blink 38-40': blink_counts[1],
                    'Blink 43-47': blink_counts[2],
                    'Blink 44-46': blink_counts[3]
                })

            # Exibir os indicadores no canto superior direito com fonte maior
            if generate_video:
                cv2.putText(frame, f"Dist 37-41: {percent_37_41:.2f}%", (text_x_position, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
                cv2.putText(frame, f"Dist 38-40: {percent_38_40:.2f}%", (text_x_position, 70), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
                cv2.putText(frame, f"Dist 43-47: {percent_43_47:.2f}%", (text_x_position, 110), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
                cv2.putText(frame, f"Dist 44-46: {percent_44_46:.2f}%", (text_x_position, 150), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

                # Exibir contadores de piscar no canto direito do meio da tela
                cv2.putText(frame, f"Blink 37-41: {blink_counts[0]}", (text_x_position, 230), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
                cv2.putText(frame, f"Blink 38-40: {blink_counts[1]}", (text_x_position, 270), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
                cv2.putText(frame, f"Blink 43-47: {blink_counts[2]}", (text_x_position, 310), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
                cv2.putText(frame, f"Blink 44-46: {blink_counts[3]}", (text_x_position, 350), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

        # Escrever o frame no vídeo de saída
        if generate_video:
            out.write(frame)

    # Salvar dados no arquivo XLSX
    if generate_xlsx:
        df = pd.DataFrame(data)
        df.to_excel("output_points.xlsx", index=False)

    # Liberar recursos
    cap.release()
    if generate_video:
        out.release()
    cv2.destroyAllWindows()

# Exemplo de uso:
# process_video("IMG_3086.MOV", "IMG_3086_video_blink.mp4", generate_video=True, generate_xlsx=True)