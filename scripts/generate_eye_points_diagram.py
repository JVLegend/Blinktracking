import cv2
import mediapipe as mp
import numpy as np
import sys

def create_eye_points_diagram():
    """
    Cria uma imagem mostrando apenas os pontos extraídos para o CSV:
    - Olho Direito: Pálpebra Superior e Inferior
    - Olho Esquerdo: Pálpebra Superior e Inferior
    """

    # Inicializar MediaPipe Face Mesh
    mp_face_mesh = mp.solutions.face_mesh
    mp_drawing = mp.solutions.drawing_utils
    mp_drawing_styles = mp.solutions.drawing_styles

    # Pontos extraídos para o CSV (mesmos do extract_points_mediapipe.py)
    right_eye_upper = [27, 29, 30, 31, 32, 33, 34]
    right_eye_lower = [35, 36, 37, 38, 39, 40, 41, 42, 43]
    left_eye_upper = [257, 259, 260, 261, 262, 263, 264]
    left_eye_lower = [265, 266, 267, 268, 269, 270, 271, 272, 273]

    # Criar imagem em branco
    width, height = 1200, 800
    image = np.ones((height, width, 3), dtype=np.uint8) * 255

    # Carregar uma imagem de exemplo ou usar webcam
    # Para este exemplo, vamos criar um diagrama esquemático

    print("Para gerar o diagrama, você precisa de uma imagem de rosto ou vídeo.")
    print("Por favor, forneça o caminho de uma imagem ou pressione Enter para usar a webcam:")

    input_path = input().strip()

    if input_path:
        # Carregar imagem
        test_image = cv2.imread(input_path)
        if test_image is None:
            print(f"Erro: Não foi possível carregar a imagem: {input_path}")
            return False
    else:
        # Usar webcam
        cap = cv2.VideoCapture(0)
        ret, test_image = cap.read()
        cap.release()
        if not ret:
            print("Erro: Não foi possível capturar imagem da webcam")
            return False

    # Processar imagem com MediaPipe
    with mp_face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=False,
        min_detection_confidence=0.5
    ) as face_mesh:

        # Converter para RGB
        rgb_image = cv2.cvtColor(test_image, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb_image)

        if not results.multi_face_landmarks:
            print("Erro: Nenhum rosto detectado na imagem")
            return False

        # Pegar a primeira face
        face_landmarks = results.multi_face_landmarks[0]

        # Criar imagem de saída
        output_image = test_image.copy()
        img_height, img_width = output_image.shape[:2]

        # Função para desenhar pontos numerados
        def draw_numbered_points(image, landmarks, indices, color, label_prefix):
            for i, idx in enumerate(indices, 1):
                landmark = landmarks.landmark[idx]
                x = int(landmark.x * img_width)
                y = int(landmark.y * img_height)

                # Desenhar círculo
                cv2.circle(image, (x, y), 5, color, -1)
                cv2.circle(image, (x, y), 7, (255, 255, 255), 2)

                # Desenhar número
                label = f"{label_prefix}{i}"
                cv2.putText(image, label, (x + 10, y - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 2)
                cv2.putText(image, label, (x + 10, y - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

        # Desenhar pontos do olho direito
        draw_numbered_points(output_image, face_landmarks, right_eye_upper,
                           (255, 0, 0), "RU")  # Azul para upper
        draw_numbered_points(output_image, face_landmarks, right_eye_lower,
                           (0, 0, 255), "RL")  # Vermelho para lower

        # Desenhar pontos do olho esquerdo
        draw_numbered_points(output_image, face_landmarks, left_eye_upper,
                           (255, 128, 0), "LU")  # Laranja para upper
        draw_numbered_points(output_image, face_landmarks, left_eye_lower,
                           (128, 0, 255), "LL")  # Roxo para lower

        # Adicionar legenda
        legend_y = 30
        cv2.putText(output_image, "Pontos Extraidos para CSV (MediaPipe)",
                   (10, legend_y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)

        legend_y += 40
        cv2.rectangle(output_image, (10, legend_y - 15), (25, legend_y), (255, 0, 0), -1)
        cv2.putText(output_image, f"Right Upper (RU1-RU7): {right_eye_upper}",
                   (35, legend_y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

        legend_y += 30
        cv2.rectangle(output_image, (10, legend_y - 15), (25, legend_y), (0, 0, 255), -1)
        cv2.putText(output_image, f"Right Lower (RL1-RL9): {right_eye_lower}",
                   (35, legend_y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

        legend_y += 30
        cv2.rectangle(output_image, (10, legend_y - 15), (25, legend_y), (255, 128, 0), -1)
        cv2.putText(output_image, f"Left Upper (LU1-LU7): {left_eye_upper}",
                   (35, legend_y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

        legend_y += 30
        cv2.rectangle(output_image, (10, legend_y - 15), (25, legend_y), (128, 0, 255), -1)
        cv2.putText(output_image, f"Left Lower (LL1-LL9): {left_eye_lower}",
                   (35, legend_y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

        # Salvar imagem
        output_path = "e:\\GitHub\\Blinktracking\\public\\docs\\mediapipe-csv-points.png"
        cv2.imwrite(output_path, output_image)
        print(f"\nDiagrama salvo em: {output_path}")

        # Mostrar imagem
        cv2.imshow("Pontos Extraidos para CSV", output_image)
        cv2.waitKey(0)
        cv2.destroyAllWindows()

        return True

if __name__ == "__main__":
    create_eye_points_diagram()
