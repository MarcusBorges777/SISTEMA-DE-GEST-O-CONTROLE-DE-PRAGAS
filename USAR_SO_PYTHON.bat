@echo off
chcp 65001 > nul
title Sistema 100%% Python - Sem Java
color 0A

echo.
echo ========================================================================
echo         MODO PYTHON - SEM NECESSIDADE DE JAVA/MAVEN
echo ========================================================================
echo.
echo Este modo usa APENAS Python para gerar documentos.
echo.
echo Vantagens:
echo   - Nao precisa de Java ou Maven
echo   - Funciona imediatamente
echo   - Mais simples de usar
echo.
echo Desvantagens:
echo   - Geracao de documentos um pouco mais lenta
echo.
echo Pressione qualquer tecla para iniciar...
pause > nul

echo.
echo Iniciando sistema em modo Python...
echo.

start "Sistema de Gestao - Python" cmd /k "python app.py"

timeout /t 3 /nobreak > nul

echo.
echo ========================================================================
echo Sistema iniciado com sucesso!
echo ========================================================================
echo.
echo Acesse: http://localhost:5000
echo.
echo Para parar o sistema:
echo   - Feche a janela do servidor Python
echo   - OU execute: PARAR_SISTEMA.bat
echo.
echo Pressione qualquer tecla para abrir o navegador...
pause > nul

start http://localhost:5000

echo.
echo Sistema em execucao!
pause
