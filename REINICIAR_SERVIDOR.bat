@echo off
echo ========================================
echo  REINICIANDO SERVIDOR FLASK
echo ========================================
echo.
echo Parando todos os servidores Python...
taskkill /F /IM python.exe >nul 2>&1
timeout /t 2 >nul

echo.
echo Iniciando servidor atualizado...
start "Servidor Flask" python app.py

echo.
echo ========================================
echo  SERVIDOR REINICIADO!
echo ========================================
echo.
echo Aguarde 5 segundos e depois acesse:
echo http://127.0.0.1:5000/prospeccao
echo.
echo Pressione CTRL+F5 no navegador para limpar o cache!
echo.
pause
