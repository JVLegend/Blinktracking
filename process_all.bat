@echo off
echo ========================================
echo PROCESSAMENTO COMPLETO DE VIDEOS
echo ========================================
echo.

echo [1/2] Processando videos com landmarks visuais...
call process_all_videos.bat

echo.
echo [2/2] Extraindo pontos e gerando planilhas...
call extract_all_points.bat

echo.
echo ========================================
echo PROCESSAMENTO COMPLETO FINALIZADO!
echo ========================================
echo Todos os arquivos foram salvos em: E:\trabalho\paralisia_video_com_pontos
pause 