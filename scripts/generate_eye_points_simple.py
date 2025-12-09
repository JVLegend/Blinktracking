import numpy as np
import cv2
import json

def create_simple_eye_diagram():
    """
    Cria um diagrama simples mostrando os pontos do MediaPipe extraídos para o CSV
    usando as coordenadas normalizadas do MediaPipe Face Mesh
    """

    # Pontos extraídos para o CSV
    points_config = {
        'right_eye_upper': [27, 29, 30, 31, 32, 33, 34],
        'right_eye_lower': [35, 36, 37, 38, 39, 40, 41, 42, 43],
        'left_eye_upper': [257, 259, 260, 261, 262, 263, 264],
        'left_eye_lower': [265, 266, 267, 268, 269, 270, 271, 272, 273]
    }

    # Coordenadas aproximadas dos pontos do MediaPipe (normalizadas 0-1)
    # Baseado na malha padrão do MediaPipe Face Mesh
    # Olho direito (da perspectiva da pessoa)
    right_eye_coords = {
        # Upper eyelid
        27: (0.35, 0.35),
        29: (0.36, 0.34),
        30: (0.37, 0.33),
        31: (0.38, 0.33),
        32: (0.39, 0.34),
        33: (0.40, 0.35),
        34: (0.41, 0.36),
        # Lower eyelid
        35: (0.35, 0.37),
        36: (0.36, 0.38),
        37: (0.37, 0.39),
        38: (0.38, 0.40),
        39: (0.39, 0.40),
        40: (0.40, 0.39),
        41: (0.41, 0.38),
        42: (0.42, 0.37),
        43: (0.43, 0.36),
    }

    # Olho esquerdo (da perspectiva da pessoa)
    left_eye_coords = {
        # Upper eyelid
        257: (0.65, 0.35),
        259: (0.64, 0.34),
        260: (0.63, 0.33),
        261: (0.62, 0.33),
        262: (0.61, 0.34),
        263: (0.60, 0.35),
        264: (0.59, 0.36),
        # Lower eyelid
        265: (0.65, 0.37),
        266: (0.64, 0.38),
        267: (0.63, 0.39),
        268: (0.62, 0.40),
        269: (0.61, 0.40),
        270: (0.60, 0.39),
        271: (0.59, 0.38),
        272: (0.58, 0.37),
        273: (0.57, 0.36),
    }

    # Combinar coordenadas
    all_coords = {**right_eye_coords, **left_eye_coords}

    # Criar imagem
    width, height = 1400, 900
    image = np.ones((height, width, 3), dtype=np.uint8) * 255

    # Escala para a imagem
    scale_x = width * 0.8
    scale_y = height * 0.6
    offset_x = width * 0.1
    offset_y = height * 0.2

    # Cores
    colors = {
        'right_eye_upper': (255, 0, 0),      # Azul
        'right_eye_lower': (0, 0, 255),      # Vermelho
        'left_eye_upper': (255, 128, 0),     # Laranja
        'left_eye_lower': (128, 0, 255)      # Roxo
    }

    # Prefixos para labels
    prefixes = {
        'right_eye_upper': 'RU',
        'right_eye_lower': 'RL',
        'left_eye_upper': 'LU',
        'left_eye_lower': 'LL'
    }

    # Desenhar pontos
    for group_name, indices in points_config.items():
        color = colors[group_name]
        prefix = prefixes[group_name]

        for i, idx in enumerate(indices, 1):
            if idx in all_coords:
                norm_x, norm_y = all_coords[idx]
                x = int(norm_x * scale_x + offset_x)
                y = int(norm_y * scale_y + offset_y)

                # Desenhar círculo
                cv2.circle(image, (x, y), 8, color, -1)
                cv2.circle(image, (x, y), 10, (0, 0, 0), 2)

                # Desenhar número do índice MediaPipe
                label_idx = f"{idx}"
                cv2.putText(image, label_idx, (x - 15, y - 15),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 2)

                # Desenhar label CSV
                label_csv = f"{prefix}{i}"
                cv2.putText(image, label_csv, (x - 15, y + 25),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 2)

        # Desenhar linhas conectando os pontos
        points_list = []
        for idx in indices:
            if idx in all_coords:
                norm_x, norm_y = all_coords[idx]
                x = int(norm_x * scale_x + offset_x)
                y = int(norm_y * scale_y + offset_y)
                points_list.append((x, y))

        if len(points_list) > 1:
            for i in range(len(points_list) - 1):
                cv2.line(image, points_list[i], points_list[i + 1], color, 2)

    # Adicionar título
    title_y = 50
    cv2.putText(image, "Pontos do MediaPipe Extraidos para CSV",
               (width // 2 - 300, title_y), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 3)

    # Adicionar legenda detalhada
    legend_x = 50
    legend_y = height - 250

    cv2.putText(image, "Legenda:",
               (legend_x, legend_y), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)

    legend_y += 35
    for group_name, indices in points_config.items():
        color = colors[group_name]
        prefix = prefixes[group_name]

        # Desenhar quadrado de cor
        cv2.rectangle(image, (legend_x, legend_y - 15), (legend_x + 20, legend_y), color, -1)
        cv2.rectangle(image, (legend_x, legend_y - 15), (legend_x + 20, legend_y), (0, 0, 0), 2)

        # Texto
        text = f"{group_name.replace('_', ' ').title()} ({prefix}1-{prefix}{len(indices)}): {indices}"
        cv2.putText(image, text,
                   (legend_x + 30, legend_y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

        legend_y += 30

    # Adicionar nota
    note_y = legend_y + 20
    cv2.putText(image, "Nota: Numero acima = Indice MediaPipe | Numero abaixo = Nome no CSV",
               (legend_x, note_y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 100, 100), 1)

    # Salvar imagem
    output_path = "e:\\GitHub\\Blinktracking\\public\\docs\\mediapipe-csv-points-diagram.png"
    cv2.imwrite(output_path, image)
    print(f"Diagrama salvo em: {output_path}")

    # Também salvar um JSON com o mapeamento
    mapping_path = "e:\\GitHub\\Blinktracking\\public\\docs\\mediapipe-csv-mapping.json"
    mapping = {}
    for group_name, indices in points_config.items():
        prefix = prefixes[group_name]
        for i, idx in enumerate(indices, 1):
            csv_name = f"{prefix}{i}".lower().replace('r', 'right_').replace('l', 'left_')
            if 'u' in prefix.lower():
                csv_name = csv_name.replace('u', 'upper_')
            else:
                csv_name = csv_name.replace('l', 'lower_')
            mapping[f"{prefix}{i}"] = {
                "mediapipe_index": idx,
                "csv_column_x": f"{csv_name}_x",
                "csv_column_y": f"{csv_name}_y",
                "group": group_name
            }

    with open(mapping_path, 'w', encoding='utf-8') as f:
        json.dump({
            "description": "Mapeamento dos pontos do MediaPipe para colunas do CSV",
            "points": mapping,
            "groups": points_config
        }, f, indent=2, ensure_ascii=False)

    print(f"Mapeamento JSON salvo em: {mapping_path}")

    return output_path

if __name__ == "__main__":
    output = create_simple_eye_diagram()
    print(f"\nImagem criada com sucesso!")
    print(f"Caminho: {output}")
