import json
import pandas as pd
import sys
import os
import glob

def convert_json_to_csv(json_file_path):
    """Converte um arquivo JSON de pontos para CSV"""
    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if not data.get('success', False) or 'points' not in data:
            print(f"Erro: Arquivo JSON inválido ou sem dados: {json_file_path}")
            return False
        
        points = data['points']
        if not points:
            print(f"Aviso: Nenhum ponto encontrado em: {json_file_path}")
            return False
        
        # Converter para DataFrame
        df = pd.DataFrame(points)
        
        # Gerar nome do arquivo CSV
        csv_file_path = json_file_path.replace('.json', '.csv')
        
        # Salvar como CSV
        df.to_csv(csv_file_path, index=False)
        print(f"Convertido: {json_file_path} -> {csv_file_path}")
        return True
        
    except Exception as e:
        print(f"Erro ao converter {json_file_path}: {str(e)}")
        return False

def convert_all_json_files(tmp_dir="tmp"):
    """Converte todos os arquivos JSON de pontos para CSV"""
    json_pattern = os.path.join(tmp_dir, "points_*.json")
    json_files = glob.glob(json_pattern)
    
    if not json_files:
        print(f"Nenhum arquivo JSON encontrado em {tmp_dir}")
        return
    
    print(f"Encontrados {len(json_files)} arquivos JSON para converter...")
    
    success_count = 0
    for json_file in json_files:
        if convert_json_to_csv(json_file):
            success_count += 1
    
    print(f"\nConversão concluída: {success_count}/{len(json_files)} arquivos convertidos com sucesso")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Verificar se é um arquivo específico ou diretório
        if os.path.isfile(sys.argv[1]):
            # Converter arquivo específico
            json_file = sys.argv[1]
            convert_json_to_csv(json_file)
        else:
            # Converter todos os arquivos no diretório especificado
            convert_all_json_files(sys.argv[1])
    else:
        # Converter todos os arquivos na pasta tmp
        convert_all_json_files() 