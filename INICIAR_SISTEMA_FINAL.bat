@echo off
chcp 65001 > nul
title Sistema Hibrido - Inicializacao
color 0B

echo.
echo ========================================================================
echo              SISTEMA HIBRIDO JAVA + PYTHON
echo ========================================================================
echo.
echo Este script vai abrir o VS Code com o backend Java.
echo.
echo IMPORTANTE:
echo 1. O VS Code vai abrir na pasta backend
echo 2. Aguarde o Maven carregar o projeto
echo 3. Abra o terminal (Ctrl + ')
echo 4. Execute: mvn clean package -DskipTests
echo 5. Depois: mvn spring-boot:run
echo.
echo ========================================================================
echo.
pause

echo.
echo Abrindo VS Code...
code backend

echo.
echo VS Code aberto!
echo.
echo Siga as instrucoes em: EXECUTAR_NO_VSCODE.txt
echo.
pause
