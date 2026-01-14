@echo off
chcp 65001 > nul
title Sistema de Gestao de Documentos
color 0A

echo.
echo ========================================================================
echo              SISTEMA DE GESTAO DE DOCUMENTOS
echo ========================================================================
echo.
echo Iniciando sistema...
echo.

REM Parar processos antigos
taskkill /F /IM python.exe >nul 2>&1

REM Esperar um pouco
timeout /t 1 /nobreak > nul

REM Iniciar Python Flask
echo Servidor iniciando na porta 5000...
echo.
start "Sistema de Gestao - Python Flask" cmd /k "python app.py"

REM Esperar servidor iniciar
echo Aguardando servidor inicializar...
timeout /t 5 /nobreak > nul

echo.
echo ========================================================================
echo              SISTEMA INICIADO COM SUCESSO!
echo ========================================================================
echo.
echo Acesse: http://localhost:5000
echo.
echo Rotas disponiveis:
echo   - http://localhost:5000/documentos
echo   - http://localhost:5000/prospeccao
echo.
echo Para parar: Feche a janela do servidor ou execute PARAR_SISTEMA.bat
echo.
echo ========================================================================
echo.
echo Pressione qualquer tecla para abrir o navegador...
pause > nul

start http://localhost:5000

echo.
echo Sistema em execucao!
echo.
pause
