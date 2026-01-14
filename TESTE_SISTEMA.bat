@echo off
chcp 65001 >nul
title Teste Rapido - Sistema de Documentos
color 0E

echo.
echo ================================================================
echo             TESTE RAPIDO DO SISTEMA
echo ================================================================
echo.

:: Verificar Python
echo [1/7] Testando Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [FALHA] Python nao encontrado
    goto FIM_ERRO
)
python --version
echo [OK] Python instalado

:: Verificar dependencias criticas
echo.
echo [2/7] Testando Flask...
pip show flask >nul 2>&1
if %errorlevel% neq 0 (
    echo [FALHA] Flask nao instalado
    echo Execute: pip install flask
    goto FIM_ERRO
)
echo [OK] Flask instalado

echo.
echo [3/7] Testando DocxTpl...
pip show docxtpl >nul 2>&1
if %errorlevel% neq 0 (
    echo [FALHA] DocxTpl nao instalado
    echo Execute: pip install docxtpl
    goto FIM_ERRO
)
echo [OK] DocxTpl instalado

:: Verificar arquivos criticos
echo.
echo [4/7] Testando app.py...
if not exist "app.py" (
    echo [FALHA] app.py nao encontrado
    goto FIM_ERRO
)
echo [OK] app.py encontrado

echo.
echo [5/7] Testando pasta de templates...
if not exist "modelos" (
    echo [FALHA] Pasta modelos\ nao encontrada
    goto FIM_ERRO
)
echo [OK] Pasta modelos\ encontrada

:: Contar templates
set template_count=0
for %%f in (modelos\*.docx) do set /a template_count+=1
echo Templates encontrados: %template_count%

echo.
echo [6/7] Testando estrutura de diretorios...
if not exist "output" mkdir output
if not exist "output\documentos" mkdir "output\documentos"
echo [OK] Diretorios OK

:: Teste de importacao Python
echo.
echo [7/7] Testando imports Python...
python -c "import flask; import docxtpl; import sqlite3" 2>nul
if %errorlevel% neq 0 (
    echo [FALHA] Erro ao importar bibliotecas
    goto FIM_ERRO
)
echo [OK] Imports funcionando

:: Sucesso
echo.
echo ================================================================
echo                  TODOS OS TESTES PASSARAM!
echo ================================================================
echo.
echo O sistema esta pronto para uso!
echo.
echo Para iniciar o sistema, execute:
echo    - INICIAR_SISTEMA.bat    (Iniciar servidor)
echo    - MENU_SISTEMA_SIMPLES.bat (Menu interativo)
echo.
pause
exit /b 0

:FIM_ERRO
echo.
echo ================================================================
echo                  TESTE FALHOU
echo ================================================================
echo.
echo Corrija os erros acima antes de continuar.
echo.
echo Dicas:
echo    1. Instale Python 3.8+: https://www.python.org/downloads/
echo    2. Execute: pip install flask docxtpl pdfplumber python-dateutil
echo    3. Verifique se todos os arquivos estao na pasta correta
echo.
pause
exit /b 1
