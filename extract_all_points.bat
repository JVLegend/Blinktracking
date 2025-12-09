@echo off
echo Extraindo pontos de todos os videos .MOV na pasta E:\trabalho\paralisia...
echo.

for %%f in ("E:\trabalho\paralisia\*.MOV") do (
    echo Processando: %%~nxf
    python scripts/extract_points_mediapipe.py "%%f" > "E:\trabalho\paralisia_video_com_pontos\points_%%~nf.json"
    echo Arquivo JSON salvo: E:\trabalho\paralisia_video_com_pontos\points_%%~nf.json
    echo.
)

echo.
echo Convertendo arquivos JSON para CSV...
python scripts/convert_json_to_csv.py "E:\trabalho\paralisia_video_com_pontos"

echo.
echo Processamento concluido!
echo Arquivos JSON e CSV salvos na pasta E:\trabalho\paralisia_video_com_pontos
pause 