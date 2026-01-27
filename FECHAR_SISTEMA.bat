@echo off
chcp 65001 >nul 2>&1
title Fechar Sistema de Gestao
color 0C

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║   FECHAR SISTEMA DE GESTAO - CONTROLE DE PRAGAS              ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Encontrar e encerrar processos Python rodando app.py na porta 5000
echo Procurando processos do sistema...
echo.

:: Metodo 1: Matar processos Python que estejam usando a porta 5000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000" ^| findstr "LISTENING"') do (
    echo [INFO] Encerrando processo PID: %%a na porta 5000...
    taskkill /PID %%a /F >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Processo %%a encerrado com sucesso!
    ) else (
        echo [AVISO] Nao foi possivel encerrar processo %%a
    )
)

:: Metodo 2: Matar processos python.exe que possam estar rodando o app.py
tasklist /FI "IMAGENAME eq python.exe" 2>NUL | find /I "python.exe" >NUL
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [INFO] Encerrando processos Python restantes...
    taskkill /IM python.exe /F >nul 2>&1
    echo [OK] Processos Python encerrados!
) else (
    echo [INFO] Nenhum processo Python encontrado.
)

echo.
echo ──────────────────────────────────────────────────────────────
echo   Sistema encerrado com sucesso!
echo   Para iniciar novamente, execute: INICIAR_SISTEMA.bat
echo ──────────────────────────────────────────────────────────────
echo.
pause
