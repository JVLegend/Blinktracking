from PIL import Image, ImageDraw, ImageFont
import json

def create_eye_points_diagram():
    """
    Cria diagrama dos pontos do MediaPipe usando PIL
    """

    # Pontos extraídos para o CSV
    points_config = {
        'right_eye_upper': [27, 29, 30, 31, 32, 33, 34],
        'right_eye_lower': [35, 36, 37, 38, 39, 40, 41, 42, 43],
        'left_eye_upper': [257, 259, 260, 261, 262, 263, 264],
        'left_eye_lower': [265, 266, 267, 268, 269, 270, 271, 272, 273]
    }

    # Coordenadas aproximadas (normalizadas 0-1)
    right_eye_coords = {
        # Upper eyelid
        27: (0.35, 0.35), 29: (0.36, 0.34), 30: (0.37, 0.33), 31: (0.38, 0.33),
        32: (0.39, 0.34), 33: (0.40, 0.35), 34: (0.41, 0.36),
        # Lower eyelid
        35: (0.35, 0.37), 36: (0.36, 0.38), 37: (0.37, 0.39), 38: (0.38, 0.40),
        39: (0.39, 0.40), 40: (0.40, 0.39), 41: (0.41, 0.38), 42: (0.42, 0.37),
        43: (0.43, 0.36),
    }

    left_eye_coords = {
        # Upper eyelid
        257: (0.65, 0.35), 259: (0.64, 0.34), 260: (0.63, 0.33), 261: (0.62, 0.33),
        262: (0.61, 0.34), 263: (0.60, 0.35), 264: (0.59, 0.36),
        # Lower eyelid
        265: (0.65, 0.37), 266: (0.64, 0.38), 267: (0.63, 0.39), 268: (0.62, 0.40),
        269: (0.61, 0.40), 270: (0.60, 0.39), 271: (0.59, 0.38), 272: (0.58, 0.37),
        273: (0.57, 0.36),
    }

    all_coords = {**right_eye_coords, **left_eye_coords}

    # Criar imagem
    width, height = 1400, 900
    image = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(image)

    # Escala
    scale_x = width * 0.8
    scale_y = height * 0.6
    offset_x = width * 0.1
    offset_y = height * 0.2

    # Cores (RGB)
    colors = {
        'right_eye_upper': (0, 0, 255),       # Azul
        'right_eye_lower': (255, 0, 0),       # Vermelho
        'left_eye_upper': (255, 128, 0),      # Laranja
        'left_eye_lower': (128, 0, 255)       # Roxo
    }

    prefixes = {
        'right_eye_upper': 'RU',
        'right_eye_lower': 'RL',
        'left_eye_upper': 'LU',
        'left_eye_lower': 'LL'
    }

    # Desenhar pontos e conexões
    for group_name, indices in points_config.items():
        color = colors[group_name]
        prefix = prefixes[group_name]

        points_list = []

        for i, idx in enumerate(indices, 1):
            if idx in all_coords:
                norm_x, norm_y = all_coords[idx]
                x = int(norm_x * scale_x + offset_x)
                y = int(norm_y * scale_y + offset_y)
                points_list.append((x, y))

                # Desenhar círculo
                r = 8
                draw.ellipse([x-r, y-r, x+r, y+r], fill=color, outline='black', width=2)

                # Labels
                draw.text((x-15, y-30), str(idx), fill='black', anchor="mm")
                draw.text((x-15, y+30), f"{prefix}{i}", fill=color, anchor="mm")

        # Desenhar linhas
        if len(points_list) > 1:
            draw.line(points_list, fill=color, width=2)

    # Título
    draw.text((width//2, 50), "Pontos do MediaPipe Extraídos para CSV",
             fill='black', anchor="mm", font=None)

    # Legenda
    legend_x = 50
    legend_y = height - 250

    draw.text((legend_x, legend_y), "Legenda:", fill='black')
    legend_y += 30

    for group_name, indices in points_config.items():
        color = colors[group_name]
        prefix = prefixes[group_name]

        # Quadrado de cor
        draw.rectangle([legend_x, legend_y-15, legend_x+20, legend_y], fill=color, outline='black')

        # Texto
        text = f"{group_name.replace('_', ' ').title()} ({prefix}1-{prefix}{len(indices)}): {indices}"
        draw.text((legend_x+30, legend_y-7), text, fill='black')

        legend_y += 25

    # Nota
    draw.text((legend_x, legend_y+20),
             "Nota: Número acima = Índice MediaPipe | Número abaixo = Nome no CSV",
             fill='gray')

    # Salvar
    output_path = "e:\\GitHub\\Blinktracking\\public\\docs\\mediapipe-csv-points-diagram.png"
    image.save(output_path)
    print(f"Diagrama salvo em: {output_path}")

    # Salvar mapeamento JSON
    mapping_path = "e:\\GitHub\\Blinktracking\\public\\docs\\mediapipe-csv-mapping.json"

    # Construir mapeamento correto
    csv_mapping = {}

    # Right upper
    for i, idx in enumerate(points_config['right_eye_upper'], 1):
        csv_mapping[f"right_upper_{i}"] = {"mediapipe_index": idx, "group": "right_eye_upper"}

    # Right lower
    for i, idx in enumerate(points_config['right_eye_lower'], 1):
        csv_mapping[f"right_lower_{i}"] = {"mediapipe_index": idx, "group": "right_eye_lower"}

    # Left upper
    for i, idx in enumerate(points_config['left_eye_upper'], 1):
        csv_mapping[f"left_upper_{i}"] = {"mediapipe_index": idx, "group": "left_eye_upper"}

    # Left lower
    for i, idx in enumerate(points_config['left_eye_lower'], 1):
        csv_mapping[f"left_lower_{i}"] = {"mediapipe_index": idx, "group": "left_eye_lower"}

    with open(mapping_path, 'w', encoding='utf-8') as f:
        json.dump({
            "description": "Mapeamento dos pontos do MediaPipe para colunas do CSV",
            "csv_columns": csv_mapping,
            "mediapipe_indices": points_config
        }, f, indent=2, ensure_ascii=False)

    print(f"Mapeamento JSON salvo em: {mapping_path}")
    return output_path

if __name__ == "__main__":
    try:
        output = create_eye_points_diagram()
        print(f"\nSucesso! Imagem criada em: {output}")
    except Exception as e:
        print(f"Erro: {e}")
        import traceback
        traceback.print_exc()
