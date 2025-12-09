from PIL import Image, ImageDraw, ImageFont
import json

def create_eye_points_diagram():
    """
    Cria diagrama dos pontos do MediaPipe usando PIL
    """

    # Pontos extraídos para o CSV - ÍNDICES CORRETOS do MediaPipe Face Mesh
    # Referência: rightEyeUpper0/Lower0 e leftEyeUpper0/Lower0 da documentação oficial
    points_config = {
        'right_eye_upper': [246, 161, 160, 159, 158, 157, 173],
        'right_eye_lower': [33, 7, 163, 144, 145, 153, 154, 155, 133],
        'left_eye_upper': [466, 388, 387, 386, 385, 384, 398],
        'left_eye_lower': [263, 249, 390, 373, 374, 380, 381, 382, 362]
    }

    # Coordenadas aproximadas para formar o contorno do olho (normalizadas 0-1)
    # Baseado na anatomia do olho: upper vai do canto interno ao externo pela pálpebra superior
    # lower vai do canto externo ao interno pela pálpebra inferior
    right_eye_coords = {
        # Upper eyelid (246->173): canto externo -> canto interno
        246: (0.43, 0.34), 161: (0.41, 0.32), 160: (0.39, 0.31), 159: (0.37, 0.31),
        158: (0.35, 0.32), 157: (0.33, 0.33), 173: (0.31, 0.35),
        # Lower eyelid (33->133): canto interno -> canto externo
        33: (0.31, 0.36), 7: (0.33, 0.38), 163: (0.35, 0.39), 144: (0.37, 0.40),
        145: (0.39, 0.39), 153: (0.41, 0.38), 154: (0.42, 0.37), 155: (0.43, 0.36),
        133: (0.44, 0.35),
    }

    left_eye_coords = {
        # Upper eyelid (466->398): canto externo -> canto interno
        466: (0.57, 0.34), 388: (0.59, 0.32), 387: (0.61, 0.31), 386: (0.63, 0.31),
        385: (0.65, 0.32), 384: (0.67, 0.33), 398: (0.69, 0.35),
        # Lower eyelid (263->362): canto interno -> canto externo
        263: (0.69, 0.36), 249: (0.67, 0.38), 390: (0.65, 0.39), 373: (0.63, 0.40),
        374: (0.61, 0.39), 380: (0.59, 0.38), 381: (0.58, 0.37), 382: (0.57, 0.36),
        362: (0.56, 0.35),
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
