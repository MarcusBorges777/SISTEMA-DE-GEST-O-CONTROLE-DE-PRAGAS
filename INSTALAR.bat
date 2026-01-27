@echo off
chcp 65001 >nul 2>&1
title INSTALADOR - Sistema de Gestao de Controle de Pragas
color 0A

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║   INSTALADOR DO SISTEMA DE GESTAO - CONTROLE DE PRAGAS      ║
echo ║                                                              ║
echo ║   Este script vai configurar tudo automaticamente            ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Ir para o diretorio do script
cd /d "%~dp0"

echo [1/6] Verificando Python...
echo ─────────────────────────────────────────
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Python NAO encontrado!
    echo.
    echo Voce precisa instalar o Python 3.10 ou superior.
    echo Baixe em: https://www.python.org/downloads/
    echo.
    echo IMPORTANTE: Na instalacao, marque a opcao "Add Python to PATH"
    echo.
    pause
    exit /b 1
)
python --version
echo [OK] Python encontrado!
echo.

echo [2/6] Verificando Node.js (opcional, para CSS)...
echo ─────────────────────────────────────────
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [AVISO] Node.js nao encontrado. O CSS compilado ja esta incluido.
    echo Se quiser editar o CSS, instale Node.js: https://nodejs.org/
    echo.
) else (
    node --version
    echo [OK] Node.js encontrado!
    echo.
)

echo [3/6] Criando ambiente virtual Python...
echo ─────────────────────────────────────────
if not exist "venv" (
    python -m venv venv
    echo [OK] Ambiente virtual criado!
) else (
    echo [OK] Ambiente virtual ja existe!
)
echo.

echo [4/6] Ativando ambiente virtual e instalando dependencias Python...
echo ─────────────────────────────────────────
call venv\Scripts\activate.bat

pip install --upgrade pip >nul 2>&1
pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Falha ao instalar dependencias Python!
    echo Verifique o arquivo requirements.txt
    pause
    exit /b 1
)
echo.
echo [OK] Dependencias Python instaladas!
echo.

echo [5/6] Instalando dependencias Node.js (se disponivel)...
echo ─────────────────────────────────────────
node --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    if exist "package.json" (
        call npm install
        echo [OK] Dependencias Node.js instaladas!
    )
) else (
    echo [PULADO] Node.js nao disponivel.
)
echo.

echo [6/6] Criando pastas necessarias...
echo ─────────────────────────────────────────
if not exist "output" mkdir output
if not exist "uploads_pdf" mkdir uploads_pdf
if not exist "training_samples" mkdir training_samples
if not exist "uploads" mkdir uploads
echo [OK] Pastas criadas!
echo.

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║   INSTALACAO CONCLUIDA COM SUCESSO!                          ║
echo ║                                                              ║
echo ║   Para iniciar o sistema, execute: INICIAR_SISTEMA.bat       ║
echo ║   Para fechar o sistema, execute:  FECHAR_SISTEMA.bat        ║
echo ║                                                              ║
echo ║   O sistema vai abrir no navegador em:                       ║
echo ║   http://localhost:5000                                      ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Dica: Se voce tiver um arquivo .env com a chave GEMINI_API_KEY,
echo       o sistema tera inteligencia artificial habilitada.
echo.
pause
