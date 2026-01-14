@echo off
chcp 65001 > nul
title Sistema Híbrido - Python Flask + Java Spring Boot
color 0B

echo.
echo ========================================================================
echo           SISTEMA DE GESTAO DE DOCUMENTOS - MODO HIBRIDO
echo           Python Flask (Frontend) + Java Spring Boot (Backend)
echo ========================================================================
echo.

REM ========================================
REM 1. Verificar Java e Maven
REM ========================================
echo [1/6] Verificando Java...
where java >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERRO] Java nao encontrado!
    echo Por favor, instale Java 17+: https://adoptium.net/
    pause
    exit /b 1
)
java -version
echo [OK] Java encontrado
echo.

echo [2/6] Verificando Maven...

REM Verificar Maven local primeiro
set MAVEN_LOCAL=%~dp0tools\apache-maven-3.9.12\bin\mvn.cmd
set MVN_CMD=
set MAVEN_FOUND=0

if exist "%MAVEN_LOCAL%" (
    echo Testando Maven local...
    "%MAVEN_LOCAL%" -version >nul 2>nul
    if %errorlevel% equ 0 (
        echo [OK] Maven local encontrado e funcional
        set MVN_CMD=%MAVEN_LOCAL%
        set MAVEN_FOUND=1
    )
)

if %MAVEN_FOUND% equ 0 (
    REM Tentar Maven global
    echo Testando Maven global...
    where mvn >nul 2>nul
    if %errorlevel% equ 0 (
        mvn -version >nul 2>nul
        if %errorlevel% equ 0 (
            echo [OK] Maven global encontrado e funcional
            set MVN_CMD=mvn
            set MAVEN_FOUND=1
        )
    )
)

if %MAVEN_FOUND% equ 0 (
    color 0C
    echo [ERRO] Maven nao encontrado ou nao funcional!
    echo.
    echo Execute primeiro: INSTALAR_MAVEN_LOCAL.bat
    echo Isso instala Maven localmente sem precisar de permissoes de admin.
    echo.
    pause
    exit /b 1
)
echo.

REM ========================================
REM 2. Verificar Python
REM ========================================
echo [3/6] Verificando Python...
python --version >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERRO] Python nao encontrado!
    echo Por favor, instale Python 3.8+
    pause
    exit /b 1
)
python --version
echo [OK] Python encontrado
echo.

REM ========================================
REM 3. Compilar Backend Java
REM ========================================
echo [4/6] Compilando backend Java (Spring Boot)...
echo Isso pode levar alguns minutos na primeira vez...
echo.
cd backend

REM Usar Maven sem aspas se for global
if "%MVN_CMD%"=="mvn" (
    call mvn clean package -DskipTests -q
) else (
    call "%MVN_CMD%" clean package -DskipTests -q
)

if %errorlevel% neq 0 (
    color 0C
    echo [ERRO] Falha ao compilar backend Java!
    cd ..
    pause
    exit /b 1
)
cd ..
echo [OK] Backend Java compilado com sucesso
echo.

REM ========================================
REM 4. Iniciar Backend Java
REM ========================================
echo [5/6] Iniciando Backend Java (Spring Boot)...

REM Iniciar backend com Maven apropriado
if "%MVN_CMD%"=="mvn" (
    start "Backend Java - Spring Boot (Porta 8080)" cmd /k "cd backend && mvn spring-boot:run"
) else (
    start "Backend Java - Spring Boot (Porta 8080)" cmd /k "cd backend && "%MVN_CMD%" spring-boot:run"
)

echo Aguardando backend Java inicializar (15 segundos)...
timeout /t 15 /nobreak > nul
echo [OK] Backend Java iniciado!
echo.

REM ========================================
REM 5. Iniciar Frontend Python
REM ========================================
echo [6/6] Iniciando Frontend Python (Flask)...
start "Frontend Python - Flask (Porta 5000)" cmd /k "python app.py"

timeout /t 5 /nobreak > nul

REM ========================================
REM Sistema Iniciado
REM ========================================
color 0A
echo.
echo ========================================================================
echo                    SISTEMA INICIADO COM SUCESSO!
echo ========================================================================
echo.
echo SERVICOS DISPONIVEIS:
echo.
echo   [Backend Java - Spring Boot]
echo   - API REST:      http://localhost:8080/api
echo   - H2 Console:    http://localhost:8080/api/h2-console
echo   - Swagger:       http://localhost:8080/api/swagger-ui.html
echo.
echo   Credenciais H2 Console:
echo   - JDBC URL: jdbc:h2:file:./database/documentos
echo   - Usuario:  sa
echo   - Senha:    (vazio)
echo.
echo   [Frontend Python - Flask]
echo   - Interface Web: http://localhost:5000
echo   - Documentos:    http://localhost:5000/documentos
echo   - Prospeccao:    http://localhost:5000/prospeccao
echo.
echo ========================================================================
echo.
echo COMO USAR:
echo   1. Acesse http://localhost:5000 no navegador
echo   2. O Flask automaticamente usa o backend Java para gerar documentos
echo   3. Para parar, execute PARAR_SISTEMA.bat
echo.
echo Pressione qualquer tecla para abrir o navegador...
pause > nul

start http://localhost:5000

echo.
echo Sistema em execucao!
echo Para parar, execute: PARAR_SISTEMA.bat
echo.
pause
