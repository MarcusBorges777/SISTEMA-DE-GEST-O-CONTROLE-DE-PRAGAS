@echo off
chcp 65001 > nul
title Compilar Backend Java
color 0B

echo.
echo ========================================================================
echo              COMPILAR BACKEND JAVA COM MAVEN DO VS CODE
echo ========================================================================
echo.
echo Este script vai compilar o backend Java usando o Maven do VS Code.
echo.
pause

REM ========================================
REM 1. Procurar Maven do VS Code
REM ========================================
echo.
echo [1/2] Procurando Maven do VS Code...
echo.

set MVN_CMD=
for /d %%i in ("%USERPROFILE%\.vscode\extensions\vscjava.vscode-maven-*") do (
    if exist "%%i\maven-wrapper\maven\bin\mvn.cmd" (
        set MVN_CMD=%%i\maven-wrapper\maven\bin\mvn.cmd
        echo [OK] Maven encontrado!
        echo Localizacao: %%i
        goto maven_found
    )
)

REM Tentar Maven global
where mvn >nul 2>nul
if %errorlevel% equ 0 (
    set MVN_CMD=mvn
    echo [OK] Maven global encontrado!
    goto maven_found
)

color 0C
echo [ERRO] Maven nao encontrado!
echo.
echo Solucao: Instale Extension Pack for Java no VS Code
echo.
pause
exit /b 1

:maven_found
echo.
echo Testando Maven...
call "%MVN_CMD%" -version
echo.
pause

REM ========================================
REM 2. Compilar Backend
REM ========================================
echo.
echo [2/2] Compilando backend Java...
echo.
echo Comando: mvn clean package -DskipTests
echo Pasta: backend
echo.

cd backend

call "%MVN_CMD%" clean package -DskipTests

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ========================================================================
    echo [ERRO] Falha na compilacao!
    echo ========================================================================
    echo.
    cd ..
    pause
    exit /b 1
)

cd ..

color 0A
echo.
echo ========================================================================
echo              BACKEND COMPILADO COM SUCESSO!
echo ========================================================================
echo.
echo Arquivo JAR criado em: backend\target\
echo.
echo Proximo passo: Execute INICIAR_COM_VSCODE.bat
echo.
pause
