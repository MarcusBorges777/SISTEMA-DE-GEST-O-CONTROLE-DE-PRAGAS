@echo off
chcp 65001 > nul
title Verificacao de Rotas
color 0A

echo.
echo ========================================
echo   VERIFICACAO DE ROTAS DO SISTEMA
echo ========================================
echo.

python VERIFICAR_ROTAS.py

echo.
pause
