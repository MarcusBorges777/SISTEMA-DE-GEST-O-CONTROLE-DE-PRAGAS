@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul 2>&1
title Instalacao Maven Local - Versao Simplificada
color 0B

echo.
echo ========================================================================
echo           INSTALACAO MAVEN LOCAL - VERSAO SIMPLIFICADA
echo ========================================================================
echo.

REM Configurar caminhos
set MAVEN_VERSION=3.9.12
set TOOLS_DIR=%~dp0tools
set MAVEN_DIR=%TOOLS_DIR%\apache-maven-%MAVEN_VERSION%
set MAVEN_ZIP=%TOOLS_DIR%\maven.zip

echo Diretorio do projeto: %~dp0
echo Diretorio tools: %TOOLS_DIR%
echo Maven ZIP: %MAVEN_ZIP%
echo.

REM ========================================
REM 1. Criar diretorio tools
REM ========================================
echo [1/5] Criando diretorio tools...
if not exist "%TOOLS_DIR%" (
    mkdir "%TOOLS_DIR%"
    echo Diretorio criado: %TOOLS_DIR%
) else (
    echo Diretorio ja existe: %TOOLS_DIR%
)
echo.

REM ========================================
REM 2. Baixar Maven
REM ========================================
echo [2/5] Baixando Maven %MAVEN_VERSION%...

if exist "%MAVEN_ZIP%" (
    echo Maven.zip ja existe, pulando download...
) else (
    echo Tentando baixar Maven de multiplas fontes...
    echo.

    REM Tentar URL 1: Archive Apache (versao 3.9.12)
    echo [Tentativa 1/3] Apache Archive (Maven 3.9.12)...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "$ProgressPreference='SilentlyContinue'; " ^
        "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; " ^
        "try { " ^
        "  Invoke-WebRequest -Uri 'https://archive.apache.org/dist/maven/maven-3/3.9.12/binaries/apache-maven-3.9.12-bin.zip' " ^
        "  -OutFile '%MAVEN_ZIP%' -TimeoutSec 30; " ^
        "  Write-Host 'Download concluido!'; " ^
        "  exit 0; " ^
        "} catch { " ^
        "  Write-Host 'Falhou, tentando proxima fonte...'; " ^
        "  exit 1; " ^
        "}" 2>nul

    if %errorlevel% neq 0 (
        echo [Tentativa 2/3] Repositorio Maven Central...
        powershell -NoProfile -ExecutionPolicy Bypass -Command ^
            "$ProgressPreference='SilentlyContinue'; " ^
            "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; " ^
            "try { " ^
            "  Invoke-WebRequest -Uri 'https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.12/apache-maven-3.9.12-bin.zip' " ^
            "  -OutFile '%MAVEN_ZIP%' -TimeoutSec 30; " ^
            "  Write-Host 'Download concluido!'; " ^
            "  exit 0; " ^
            "} catch { " ^
            "  Write-Host 'Falhou, tentando ultima fonte...'; " ^
            "  exit 1; " ^
            "}" 2>nul
    )

    if not exist "%MAVEN_ZIP%" (
        color 0C
        echo.
        echo [ERRO] Todas as tentativas de download falharam!
        echo.
        echo Por favor, baixe manualmente:
        echo 1. Acesse: https://maven.apache.org/download.cgi
        echo 2. Baixe: apache-maven-3.9.12-bin.zip
        echo 3. Salve em: %MAVEN_ZIP%
        echo 4. Execute este script novamente
        echo.
        pause
        exit /b 1
    )
)
REM Verificar se o arquivo foi realmente baixado
if not exist "%MAVEN_ZIP%" (
    color 0C
    echo.
    echo [ERRO] Arquivo maven.zip nao foi criado!
    echo.
    echo Por favor, baixe manualmente:
    echo 1. Acesse: https://maven.apache.org/download.cgi
    echo 2. Baixe: apache-maven-3.9.12-bin.zip
    echo 3. Salve em: %MAVEN_ZIP%
    echo 4. Execute este script novamente
    echo.
    pause
    exit /b 1
)

REM Verificar tamanho do arquivo (deve ter mais de 1MB)
for %%F in ("%MAVEN_ZIP%") do set FILESIZE=%%~zF
if %FILESIZE% LSS 1000000 (
    color 0C
    echo.
    echo [ERRO] Arquivo maven.zip esta corrompido ou incompleto!
    echo Tamanho: %FILESIZE% bytes (esperado: ~9MB)
    echo.
    echo Deletando arquivo corrompido...
    del /q "%MAVEN_ZIP%"
    echo.
    echo Execute este script novamente para tentar re-baixar.
    pause
    exit /b 1
)

echo [OK] Maven baixado! (Tamanho: %FILESIZE% bytes)
echo.

REM ========================================
REM 3. Extrair Maven
REM ========================================
echo [3/5] Extraindo Maven...

if exist "%MAVEN_DIR%" (
    echo Maven ja extraido em: %MAVEN_DIR%
    echo Pulando extracao...
) else (
    echo Extraindo para: %TOOLS_DIR%
    echo.

    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "Expand-Archive -Path '%MAVEN_ZIP%' -DestinationPath '%TOOLS_DIR%' -Force; " ^
        "Write-Host 'Extracao concluida!'"

    if %errorlevel% neq 0 (
        color 0C
        echo.
        echo [ERRO] Falha ao extrair Maven!
        pause
        exit /b 1
    )
)
echo [OK] Maven extraido!
echo.

REM ========================================
REM 4. Verificar instalacao
REM ========================================
echo [4/5] Verificando instalacao...

set MVN_CMD=%MAVEN_DIR%\bin\mvn.cmd

if not exist "%MVN_CMD%" (
    color 0C
    echo.
    echo [ERRO] mvn.cmd nao encontrado em: %MVN_CMD%
    echo.
    dir /b "%TOOLS_DIR%"
    pause
    exit /b 1
)

echo Testando Maven...
"%MVN_CMD%" -version
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERRO] Maven instalado mas nao funciona!
    pause
    exit /b 1
)

echo [OK] Maven funcional!
echo.

REM ========================================
REM 5. Criar atalhos
REM ========================================
echo [5/5] Criando scripts de atalho...

REM Script de compilacao
(
echo @echo off
echo chcp 65001 ^> nul
echo title Compilando Backend Java
echo cd /d "%%~dp0"
echo echo.
echo echo Compilando backend Java...
echo echo.
echo if not exist backend (
echo     echo [ERRO] Pasta backend nao encontrada!
echo     pause
echo     exit /b 1
echo ^)
echo cd backend
echo "%MVN_CMD%" clean package -DskipTests
echo if %%errorlevel%% neq 0 (
echo     echo.
echo     echo [ERRO] Falha na compilacao!
echo     pause
echo     exit /b 1
echo ^)
echo cd ..
echo echo.
echo echo [OK] Backend Java compilado com sucesso!
echo pause
) > COMPILAR_JAVA.bat

echo [OK] COMPILAR_JAVA.bat criado!
echo.

REM Limpar zip
if exist "%MAVEN_ZIP%" (
    echo Limpando arquivo zip...
    del /q "%MAVEN_ZIP%"
)

REM ========================================
REM Sucesso
REM ========================================
color 0A
echo ========================================================================
echo              MAVEN INSTALADO COM SUCESSO!
echo ========================================================================
echo.
echo Localizacao: %MAVEN_DIR%
echo Comando: %MVN_CMD%
echo.
echo Arquivos criados:
echo   - COMPILAR_JAVA.bat    (compila o backend)
echo.
echo ========================================================================
echo                         PROXIMOS PASSOS
echo ========================================================================
echo.
echo 1. Para compilar o backend:
echo    Execute: COMPILAR_JAVA.bat
echo.
echo 2. Para iniciar o sistema completo:
echo    Execute: INICIAR_SISTEMA_HIBRIDO.bat
echo.
echo ========================================================================
echo.
echo Instalacao concluida com sucesso!
echo.
echo Pressione qualquer tecla para fechar...
pause > nul
endlocal
