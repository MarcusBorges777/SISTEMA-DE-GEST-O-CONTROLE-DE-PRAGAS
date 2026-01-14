@echo off
chcp 65001 >nul
title Sistema de Gestao de Documentos - Inicializacao Inteligente
color 0A

echo.
echo ================================================================
echo           SISTEMA DE GESTAO DE DOCUMENTOS
echo           Inicializacao Inteligente v2.0
echo ================================================================
echo.

:: Verificar Python
echo [1/5] Verificando Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERRO] Python nao encontrado!
    echo.
    echo Baixe e instale Python 3.8+ em: https://www.python.org/downloads/
    echo Certifique-se de marcar "Add Python to PATH" durante a instalacao
    pause
    exit /b 1
)
python --version
echo [OK] Python encontrado

:: Verificar Flask
echo.
echo [2/5] Verificando dependencias Python...
pip show flask >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] Flask nao encontrado. Instalando dependencias...
    pip install flask flask-cors python-docx docxtpl pdfplumber python-dateutil google-generativeai python-dotenv requests
) else (
    echo [OK] Dependencias Python OK
)

:: Verificar banco de dados
echo.
echo [3/5] Verificando banco de dados...
if not exist "gestao_documentos.db" (
    echo [AVISO] Banco de dados nao encontrado - sera criado automaticamente
) else (
    echo [OK] Banco de dados encontrado
)

:: Criar diretorios necessarios
echo.
echo [4/5] Criando diretorios necessarios...
if not exist "output" mkdir output
if not exist "output\documentos" mkdir "output\documentos"
if not exist "output\Laudos" mkdir "output\Laudos"
if not exist "output\Recibos" mkdir "output\Recibos"
if not exist "output\Orcamentos" mkdir "output\Orcamentos"
if not exist "uploads_pdf" mkdir uploads_pdf
if not exist "training_samples" mkdir training_samples
echo [OK] Diretorios criados

:: Parar servidores anteriores
echo.
echo [5/5] Parando servidores anteriores...
taskkill /F /IM python.exe >nul 2>&1
timeout /t 1 >nul
echo [OK] Pronto para iniciar

:: Iniciar servidor
echo.
echo ================================================================
echo                    INICIANDO SERVIDOR
echo ================================================================
echo.
echo Servidor Flask iniciando...
echo URL: http://127.0.0.1:5000
echo.
echo Rotas disponiveis:
echo    - http://127.0.0.1:5000/documentos          - Gestao de Documentos
echo    - http://127.0.0.1:5000/prospeccao          - Prospeccao de Clientes
echo    - http://127.0.0.1:5000/gerar-laudo         - API Gerar Laudo
echo    - http://127.0.0.1:5000/gerar-recibo        - API Gerar Recibo
echo    - http://127.0.0.1:5000/gerar-orcamento     - API Gerar Orcamento
echo.
echo [AVISO] Para parar o servidor, pressione CTRL+C
echo.
echo ================================================================
echo.

:: Iniciar Flask
python app.py

:: Se o servidor parou
echo.
echo ================================================================
echo Servidor encerrado.
echo ================================================================
pause
