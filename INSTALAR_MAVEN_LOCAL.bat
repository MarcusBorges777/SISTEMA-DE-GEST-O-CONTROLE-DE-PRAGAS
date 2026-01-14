@echo off
chcp 65001 > nul
title Instalacao Local do Maven (sem precisar de admin)
color 0B

echo.
echo ========================================================================
echo        INSTALACAO LOCAL DO MAVEN - SEM PERMISSOES DE ADMIN
echo ========================================================================
echo.
echo Este script vai instalar Maven LOCALMENTE neste projeto.
echo Nao precisa de permissoes de administrador!
echo.
echo Tamanho do download: ~9 MB
echo.
echo Pressione qualquer tecla para continuar...
pause > nul

REM ========================================
REM 1. Configurar caminhos
REM ========================================
echo.
echo [1/4] Configurando...

set MAVEN_VERSION=3.9.6
set MAVEN_LOCAL=%~dp0tools\apache-maven-%MAVEN_VERSION%
set MAVEN_ZIP=%~dp0tools\maven.zip
set MAVEN_URL=https://dlcdn.apache.org/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.zip

REM Criar diretorio tools
if not exist "%~dp0tools" mkdir "%~dp0tools"

echo [OK] Configurado

REM ========================================
REM 2. Baixar Maven
REM ========================================
echo.
echo [2/4] Baixando Maven %MAVEN_VERSION%...
echo Aguarde, isso pode levar alguns minutos...
echo.

if exist "%MAVEN_ZIP%" (
    echo Maven ja baixado, pulando download...
) else (
    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Write-Host 'Baixando...'; $ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri '%MAVEN_URL%' -OutFile '%MAVEN_ZIP%'; Write-Host 'Download concluido!'}"

    if %errorlevel% neq 0 (
        color 0C
        echo [ERRO] Falha ao baixar Maven!
        echo.
        echo Tente baixar manualmente de:
        echo https://maven.apache.org/download.cgi
        echo.
        echo E extraia para: %~dp0tools\
        pause
        exit /b 1
    )
)

echo [OK] Maven baixado!

REM ========================================
REM 3. Extrair Maven
REM ========================================
echo.
echo [3/4] Extraindo Maven...

if exist "%MAVEN_LOCAL%" (
    echo Maven ja extraido, pulando...
) else (
    powershell -Command "& {Write-Host 'Extraindo...'; Expand-Archive -Path '%MAVEN_ZIP%' -DestinationPath '%~dp0tools\' -Force; Write-Host 'Extracao concluida!'}"

    if %errorlevel% neq 0 (
        color 0C
        echo [ERRO] Falha ao extrair Maven!
        pause
        exit /b 1
    )
)

echo [OK] Maven extraido!

REM ========================================
REM 4. Criar scripts de atalho
REM ========================================
echo.
echo [4/4] Criando scripts de atalho...

REM Criar mvn.bat local
echo @echo off > mvn.bat
echo "%MAVEN_LOCAL%\bin\mvn.cmd" %%* >> mvn.bat

REM Criar script de compilacao
echo @echo off > COMPILAR_JAVA.bat
echo chcp 65001 ^> nul >> COMPILAR_JAVA.bat
echo title Compilando Backend Java >> COMPILAR_JAVA.bat
echo echo. >> COMPILAR_JAVA.bat
echo echo Compilando backend Java com Maven local... >> COMPILAR_JAVA.bat
echo echo. >> COMPILAR_JAVA.bat
echo cd backend >> COMPILAR_JAVA.bat
echo "..\tools\apache-maven-%MAVEN_VERSION%\bin\mvn.cmd" clean package -DskipTests >> COMPILAR_JAVA.bat
echo if %%errorlevel%% neq 0 ( >> COMPILAR_JAVA.bat
echo     echo. >> COMPILAR_JAVA.bat
echo     echo [ERRO] Falha na compilacao! >> COMPILAR_JAVA.bat
echo     pause >> COMPILAR_JAVA.bat
echo     exit /b 1 >> COMPILAR_JAVA.bat
echo ^) >> COMPILAR_JAVA.bat
echo cd .. >> COMPILAR_JAVA.bat
echo echo. >> COMPILAR_JAVA.bat
echo echo [OK] Backend Java compilado com sucesso! >> COMPILAR_JAVA.bat
echo pause >> COMPILAR_JAVA.bat

echo [OK] Scripts criados!

REM Limpar arquivo zip
if exist "%MAVEN_ZIP%" del /q "%MAVEN_ZIP%"

REM ========================================
REM Resultado
REM ========================================
echo.
echo ========================================================================
color 0A
echo              MAVEN INSTALADO LOCALMENTE COM SUCESSO!
echo ========================================================================
echo.
echo Localizacao: %MAVEN_LOCAL%
echo.
echo Arquivos criados:
echo   - mvn.bat              (atalho para Maven local)
echo   - COMPILAR_JAVA.bat    (compila o backend)
echo.
echo ========================================================================
echo                         COMO USAR
echo ========================================================================
echo.
echo Para compilar o backend Java:
echo   Execute: COMPILAR_JAVA.bat
echo.
echo Para iniciar o sistema hibrido:
echo   Execute: INICIAR_SISTEMA_HIBRIDO.bat
echo.
echo ========================================================================
echo.
echo Pressione qualquer tecla para compilar o backend agora...
pause > nul

echo.
echo Compilando backend Java...
call COMPILAR_JAVA.bat
