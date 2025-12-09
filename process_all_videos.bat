@echo off
echo Processando todos os videos .MOV na pasta E:\trabalho\paralisia...
echo.

for %%f in ("E:\trabalho\paralisia\*.MOV") do (
    echo Processando: %%~nxf
    python scripts/process_video_mediapipe.py "%%f" "E:\trabalho\paralisia_video_com_pontos"
    echo.
)

echo Processamento concluido!
pause 