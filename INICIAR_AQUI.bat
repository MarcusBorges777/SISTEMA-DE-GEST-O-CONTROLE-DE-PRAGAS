@echo off
chcp 65001 > nul
title Iniciar Sistema Hibrido
color 0A

echo.
echo ╔════════════════════════════════════════════════════════════════════╗
echo ║                                                                    ║
echo ║          BEM-VINDO AO SISTEMA HIBRIDO JAVA + PYTHON                ║
echo ║                                                                    ║
echo ╚════════════════════════════════════════════════════════════════════╝
echo.
echo Este script vai:
echo   1. Abrir as instrucoes
echo   2. Abrir o VS Code na pasta backend
echo.
echo Aguarde...
timeout /t 2 /nobreak > nul

REM Abrir arquivo de instrucoes
start notepad EXECUTAR_NO_VSCODE.txt

REM Aguardar um pouco
timeout /t 1 /nobreak > nul

REM Abrir VS Code
code backend

echo.
echo ========================================================================
echo.
echo ✓ Arquivo de instrucoes aberto
echo ✓ VS Code aberto na pasta backend
echo.
echo Siga as instrucoes no arquivo de texto!
echo.
echo ========================================================================
echo.
pause
