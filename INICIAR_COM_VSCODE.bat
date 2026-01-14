@echo off
chcp 65001 > nul
title Sistema Hibrido com Maven do VS Code
color 0B

echo.
echo ========================================================================
echo           SISTEMA HIBRIDO - USANDO MAVEN DO VS CODE
echo           Python Flask (Frontend) + Java Spring Boot (Backend)
echo ========================================================================
echo.

REM ========================================
REM 1. Verificar Java
REM ========================================
echo [1/4] Verificando Java...
where java >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERRO] Java nao encontrado!
    pause
    exit /b 1
)
java -version
echo [OK] Java encontrado
echo.

REM ========================================
REM 2. Verificar Python
REM ========================================
echo [2/4] Verificando Python...
python --version >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERRO] Python nao encontrado!
    pause
    exit /b 1
)
python --version
echo [OK] Python encontrado
echo.

REM ========================================
REM 3. Verificar Maven do VS Code
REM ========================================
echo [3/4] Procurando Maven...

REM Tentar encontrar Maven do VS Code
set VSCODE_MAVEN=%USERPROFILE%\.vscode\extensions\vscjava.vscode-maven-*\maven-wrapper\maven\bin\mvn.cmd

REM Procurar por qualquer versao do Maven do VS Code
for /d %%i in ("%USERPROFILE%\.vscode\extensions\vscjava.vscode-maven-*") do (
    if exist "%%i\maven-wrapper\maven\bin\mvn.cmd" (
        set MVN_CMD=%%i\maven-wrapper\maven\bin\mvn.cmd
        echo [OK] Maven do VS Code encontrado!
        echo Localizacao: %%i
        goto maven_found
    )
)

REM Tentar Maven local
if exist tools\apache-maven-3.9.12\bin\mvn.cmd (
    set MVN_CMD=tools\apache-maven-3.9.12\bin\mvn.cmd
    echo [OK] Maven local encontrado!
    goto maven_found
)

REM Tentar Maven global
where mvn >nul 2>nul
if %errorlevel% equ 0 (
    mvn -version >nul 2>nul
    if %errorlevel% equ 0 (
        set MVN_CMD=mvn
        echo [OK] Maven global encontrado!
        goto maven_found
    )
)

REM Maven nao encontrado
color 0C
echo [ERRO] Maven nao encontrado!
echo.
echo Opcoes:
echo 1. Instale Extension Pack for Java no VS Code
echo 2. Ou execute: INSTALAR_MAVEN_DEFINITIVO.bat
echo.
pause
exit /b 1

:maven_found
echo.
pause

REM ========================================
REM 4. Compilar Backend Java
REM ========================================
echo [4/4] Compilando backend Java...
echo Usando: %MVN_CMD%
echo.

cd backend

if "%MVN_CMD%"=="mvn" (
    call mvn clean package -DskipTests
) else (
    call "%MVN_CMD%" clean package -DskipTests
)

if %errorlevel% neq 0 (
    color 0C
    echo [ERRO] Falha ao compilar!
    cd ..
    pause
    exit /b 1
)

cd ..
echo [OK] Backend compilado!
echo.
pause

REM ========================================
REM 5. Iniciar Backend Java
REM ========================================
echo Iniciando Backend Java (Spring Boot)...

if "%MVN_CMD%"=="mvn" (
    start "Backend Java - Spring Boot" cmd /k "cd backend && mvn spring-boot:run"
) else (
    start "Backend Java - Spring Boot" cmd /k "cd backend && "%MVN_CMD%" spring-boot:run"
)

echo Aguardando backend inicializar (15 segundos)...
timeout /t 15 /nobreak > nul
echo [OK] Backend iniciado na porta 8080
echo.

REM ========================================
REM 6. Iniciar Frontend Python
REM ========================================
echo Iniciando Frontend Python (Flask)...
start "Frontend Python - Flask" cmd /k "python app.py"

timeout /t 3 /nobreak > nul

REM ========================================
REM Sistema Iniciado
REM ========================================
color 0A
echo.
echo ========================================================================
echo                    SISTEMA INICIADO COM SUCESSO!
echo ========================================================================
echo.
echo Backend Java:  http://localhost:8080/api
echo Frontend Flask: http://localhost:5000
echo.
echo Pressione qualquer tecla para abrir o navegador...
pause > nul

start http://localhost:5000

echo.
echo Sistema em execucao!
pause
