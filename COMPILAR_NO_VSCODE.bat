@echo off
chcp 65001 > nul
title Compilar Backend Java no VS Code
color 0B

echo.
echo ========================================================================
echo              COMPILAR BACKEND JAVA USANDO VS CODE
echo ========================================================================
echo.
echo Este script vai abrir o VS Code e compilar o backend Java.
echo.
echo INSTRUCOES:
echo.
echo 1. Aguarde o VS Code abrir
echo 2. Pressione: Ctrl+Shift+P
echo 3. Digite: Java: Build Workspace
echo 4. Pressione Enter
echo.
echo OU no terminal do VS Code:
echo   cd backend
echo   mvn clean package -DskipTests
echo.
echo ========================================================================
echo.
pause

echo Abrindo VS Code na pasta backend...
code backend

echo.
echo VS Code aberto!
echo.
echo Agora compile o projeto usando uma das opcoes acima.
echo.
pause
