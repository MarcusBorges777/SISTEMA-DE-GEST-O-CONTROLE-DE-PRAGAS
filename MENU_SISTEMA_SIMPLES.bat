@echo off
chcp 65001 >nul
title Sistema de Gestao - Menu Principal
color 0B

:MENU
cls
echo.
echo ================================================================
echo           SISTEMA DE GESTAO DE DOCUMENTOS
echo                   Menu Principal v2.0
echo ================================================================
echo.
echo [1] Iniciar Sistema
echo [2] Reiniciar Servidor
echo [3] Parar Servidor
echo [4] Verificar Status
echo [5] Instalar/Atualizar Dependencias
echo [6] Verificar Banco de Dados
echo [7] Abrir Pasta de Documentos
echo [8] Abrir Sistema no Navegador
echo [9] Sair
echo.
echo ================================================================
echo.

set /p opcao="Digite a opcao desejada: "

if "%opcao%"=="1" goto INICIAR
if "%opcao%"=="2" goto REINICIAR
if "%opcao%"=="3" goto PARAR
if "%opcao%"=="4" goto STATUS
if "%opcao%"=="5" goto INSTALAR
if "%opcao%"=="6" goto VERIFICAR_DB
if "%opcao%"=="7" goto ABRIR_PASTA
if "%opcao%"=="8" goto ABRIR_BROWSER
if "%opcao%"=="9" goto SAIR

echo [ERRO] Opcao invalida!
timeout /t 2 >nul
goto MENU

:INICIAR
cls
echo.
echo ================================================================
echo                    INICIANDO SISTEMA
echo ================================================================
echo.
call INICIAR_SISTEMA.bat
goto MENU

:REINICIAR
cls
echo.
echo ================================================================
echo                  REINICIANDO SERVIDOR
echo ================================================================
echo.
echo Parando servidor atual...
taskkill /F /IM python.exe >nul 2>&1
timeout /t 2 >nul
echo [OK] Servidor parado
echo.
echo Iniciando novo servidor...
start "Servidor Flask" python app.py
timeout /t 3 >nul
echo [OK] Servidor reiniciado
echo.
echo Acesse: http://127.0.0.1:5000
echo.
pause
goto MENU

:PARAR
cls
echo.
echo ================================================================
echo                    PARANDO SERVIDOR
echo ================================================================
echo.
taskkill /F /IM python.exe >nul 2>&1
echo [OK] Servidor parado com sucesso!
echo.
pause
goto MENU

:STATUS
cls
echo.
echo ================================================================
echo                  STATUS DO SISTEMA
echo ================================================================
echo.

echo [1/6] Verificando Python...
python --version >nul 2>&1
if %errorlevel% equ 0 (
    python --version
    echo [OK] Python instalado
) else (
    echo [ERRO] Python NAO instalado
)

echo.
echo [2/6] Verificando Flask...
pip show flask >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Flask instalado
) else (
    echo [ERRO] Flask NAO instalado
)

echo.
echo [3/6] Verificando DocxTpl...
pip show docxtpl >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] DocxTpl instalado
) else (
    echo [ERRO] DocxTpl NAO instalado
)

echo.
echo [4/6] Verificando Banco de Dados...
if exist "gestao_documentos.db" (
    echo [OK] Banco de dados encontrado
) else (
    echo [AVISO] Banco de dados nao encontrado (sera criado ao iniciar)
)

echo.
echo [5/6] Verificando Servidor...
tasklist /FI "IMAGENAME eq python.exe" 2>NUL | find /I /N "python.exe">NUL
if %errorlevel% equ 0 (
    echo [OK] Servidor Python esta RODANDO
) else (
    echo [AVISO] Servidor Python NAO esta rodando
)

echo.
echo [6/6] Verificando Templates...
set template_count=0
for %%f in (modelos\*.docx) do set /a template_count+=1
echo [OK] Templates encontrados: %template_count%

echo.
echo ================================================================
echo.
pause
goto MENU

:INSTALAR
cls
echo.
echo ================================================================
echo              INSTALANDO DEPENDENCIAS
echo ================================================================
echo.
echo Instalando/Atualizando pacotes Python...
echo.
pip install --upgrade pip
pip install flask flask-cors python-docx docxtpl pdfplumber python-dateutil google-generativeai python-dotenv requests werkzeug
echo.
echo [OK] Dependencias instaladas/atualizadas!
echo.
pause
goto MENU

:VERIFICAR_DB
cls
echo.
echo ================================================================
echo              VERIFICANDO BANCO DE DADOS
echo ================================================================
echo.

if exist "gestao_documentos.db" (
    echo [OK] Banco de dados encontrado: gestao_documentos.db
    for %%A in (gestao_documentos.db) do (
        echo Tamanho: %%~zA bytes
        echo Ultima modificacao: %%~tA
    )
) else (
    echo [AVISO] Banco de dados nao encontrado
    echo.
    echo O banco sera criado automaticamente ao iniciar o sistema.
)

echo.
if exist "cnpj_filtrado.db" (
    echo [OK] Banco CNPJ encontrado: cnpj_filtrado.db
    for %%A in (cnpj_filtrado.db) do (
        echo Tamanho: %%~zA bytes
    )
) else (
    echo [AVISO] Banco CNPJ nao encontrado (opcional)
)

echo.
pause
goto MENU

:ABRIR_PASTA
cls
echo.
echo Abrindo pasta de documentos...
if exist "output\documentos" (
    start "" "output\documentos"
    echo [OK] Pasta aberta
) else (
    mkdir "output\documentos"
    start "" "output\documentos"
    echo [OK] Pasta criada e aberta
)
timeout /t 2 >nul
goto MENU

:ABRIR_BROWSER
cls
echo.
echo Abrindo sistema no navegador...
echo.
echo Verificando se servidor esta rodando...
tasklist /FI "IMAGENAME eq python.exe" 2>NUL | find /I /N "python.exe">NUL
if %errorlevel% neq 0 (
    echo [AVISO] Servidor nao esta rodando!
    echo.
    echo Iniciando servidor...
    start "Servidor Flask" python app.py
    timeout /t 5 >nul
)

start http://127.0.0.1:5000/documentos
echo [OK] Navegador aberto
timeout /t 2 >nul
goto MENU

:SAIR
cls
echo.
echo ================================================================
echo                  ENCERRANDO SISTEMA
echo ================================================================
echo.
echo Deseja parar o servidor antes de sair? (S/N)
set /p parar="Resposta: "

if /i "%parar%"=="S" (
    echo.
    echo Parando servidor...
    taskkill /F /IM python.exe >nul 2>&1
    echo [OK] Servidor parado
)

echo.
echo [OK] Sistema encerrado. Ate logo!
timeout /t 2 >nul
exit
