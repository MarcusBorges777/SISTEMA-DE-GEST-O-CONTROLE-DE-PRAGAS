@echo off
chcp 65001 >nul 2>&1
title Sistema de Gestao - Controle de Pragas
color 0B

:: Ir para o diretorio do script
cd /d "%~dp0"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║   SISTEMA DE GESTAO - CONTROLE DE PRAGAS                     ║
echo ║   Iniciando...                                               ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Verificar se o ambiente virtual existe
if exist "venv\Scripts\activate.bat" (
    echo [OK] Ativando ambiente virtual...
    call venv\Scripts\activate.bat
) else (
    echo [AVISO] Ambiente virtual nao encontrado. Usando Python global.
    echo         Execute INSTALAR.bat primeiro se houver problemas.
    echo.
)

:: Verificar se o Python esta disponivel
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Python nao encontrado!
    echo Execute INSTALAR.bat primeiro.
    pause
    exit /b 1
)

:: Verificar se app.py existe
if not exist "app.py" (
    echo [ERRO] Arquivo app.py nao encontrado!
    echo Certifique-se de estar na pasta correta do sistema.
    pause
    exit /b 1
)

echo [OK] Iniciando servidor Flask na porta 5000...
echo.
echo ──────────────────────────────────────────────────────────────
echo   Acesse o sistema em:  http://localhost:5000
echo   Para fechar, execute: FECHAR_SISTEMA.bat
echo   Ou pressione CTRL+C nesta janela
echo ──────────────────────────────────────────────────────────────
echo.

:: Aguardar 2 segundos e abrir o navegador
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:5000"

:: Iniciar o Flask (fica rodando nesta janela)
python app.py

:: Se o Flask fechar, mostrar mensagem
echo.
echo [INFO] O sistema foi encerrado.
pause
