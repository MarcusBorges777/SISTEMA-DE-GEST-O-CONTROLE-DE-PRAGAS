@echo off
chcp 65001 > nul
title Sistema Completo - Inicializacao
color 0B

echo.
echo ========================================================================
echo              INICIANDO SISTEMA COMPLETO
echo ========================================================================
echo.
echo Backend Java (Spring Boot): http://localhost:8080/api
echo Frontend Python (Flask):    http://localhost:5000
echo.
echo ========================================================================
echo.

REM Verificar se Maven esta instalado
where mvn >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Maven nao encontrado!
    echo.
    echo Por favor, instale o Maven antes de continuar.
    echo.
    pause
    exit /b 1
)

REM Verificar se Python esta instalado
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Python nao encontrado!
    echo.
    echo Por favor, instale o Python antes de continuar.
    echo.
    pause
    exit /b 1
)

echo [1/3] Iniciando Backend Java (Spring Boot)...
echo.
start "Backend Java - Spring Boot" cmd /k "cd backend && mvn spring-boot:run"

echo Aguardando 10 segundos para o backend iniciar...
timeout /t 10 /nobreak > nul

echo.
echo [2/3] Iniciando Frontend Python (Flask)...
echo.
start "Frontend Python - Flask" cmd /k "python app.py"

echo.
echo [3/3] Abrindo navegador...
echo.
timeout /t 5 /nobreak > nul
start http://localhost:5000

echo.
echo ========================================================================
echo              SISTEMA INICIADO COM SUCESSO!
echo ========================================================================
echo.
echo Backend Java:  http://localhost:8080/api
echo Frontend Web:  http://localhost:5000
echo.
echo Para parar o sistema, feche as janelas do terminal
echo.
echo ========================================================================
echo.
pause
