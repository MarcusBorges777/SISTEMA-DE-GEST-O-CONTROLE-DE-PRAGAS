@echo off
setlocal
chcp 65001 > nul 2>&1
title Instalacao DEFINITIVA do Maven 3.9.12
color 0B

echo.
echo ========================================================================
echo           INSTALACAO DEFINITIVA DO MAVEN 3.9.12
echo ========================================================================
echo.
echo Este script vai instalar Maven com TODOS os passos visiveis.
echo.
pause

REM ========================================
REM Passo 1: Diretorio
REM ========================================
echo.
echo [Passo 1/6] Configurando diretorios...
cd /d "%~dp0"
echo Diretorio atual: %CD%
set TOOLS_DIR=%CD%\tools
set MAVEN_ZIP=%TOOLS_DIR%\maven.zip
set MAVEN_DIR=%TOOLS_DIR%\apache-maven-3.9.12
echo Pasta tools: %TOOLS_DIR%
echo Arquivo ZIP: %MAVEN_ZIP%
echo Pasta Maven: %MAVEN_DIR%
echo [OK]
pause

REM ========================================
REM Passo 2: Criar pasta tools
REM ========================================
echo.
echo [Passo 2/6] Criando pasta tools...
if not exist "%TOOLS_DIR%" (
    mkdir "%TOOLS_DIR%"
    echo [OK] Pasta criada
) else (
    echo [OK] Pasta ja existe
)
dir /b "%TOOLS_DIR%"
pause

REM ========================================
REM Passo 3: Verificar/Baixar arquivo
REM ========================================
echo.
echo [Passo 3/6] Verificando arquivo maven.zip...

if exist "%MAVEN_ZIP%" (
    echo [OK] Arquivo encontrado!
    for %%F in ("%MAVEN_ZIP%") do echo Tamanho: %%~zF bytes

    REM Verificar se arquivo tem tamanho razoavel (mais de 5MB)
    for %%F in ("%MAVEN_ZIP%") do set SIZE=%%~zF
    if %SIZE% LSS 5000000 (
        echo [AVISO] Arquivo muito pequeno! Deletando...
        del /q "%MAVEN_ZIP%"
        set MAVEN_ZIP_EXISTS=0
    ) else (
        set MAVEN_ZIP_EXISTS=1
    )
) else (
    echo [AVISO] Arquivo NAO encontrado
    set MAVEN_ZIP_EXISTS=0
)

if %MAVEN_ZIP_EXISTS%==0 (
    echo.
    echo Tentando baixar Maven 3.9.12...
    echo URL: https://archive.apache.org/dist/maven/maven-3/3.9.12/binaries/apache-maven-3.9.12-bin.zip
    echo.

    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://archive.apache.org/dist/maven/maven-3/3.9.12/binaries/apache-maven-3.9.12-bin.zip' -OutFile '%MAVEN_ZIP%' -TimeoutSec 60"

    if exist "%MAVEN_ZIP%" (
        echo [OK] Download concluido!
        for %%F in ("%MAVEN_ZIP%") do echo Tamanho: %%~zF bytes
    ) else (
        color 0C
        echo.
        echo ========================================================================
        echo [ERRO] Download falhou!
        echo ========================================================================
        echo.
        echo Por favor, faca download manual:
        echo.
        echo 1. Abra no navegador:
        echo    https://archive.apache.org/dist/maven/maven-3/3.9.12/binaries/apache-maven-3.9.12-bin.zip
        echo.
        echo 2. Salve o arquivo como:
        echo    %MAVEN_ZIP%
        echo.
        echo 3. Execute este script novamente
        echo.
        pause
        exit /b 1
    )
)
pause

REM ========================================
REM Passo 4: Extrair Maven
REM ========================================
echo.
echo [Passo 4/6] Extraindo Maven...

if exist "%MAVEN_DIR%" (
    echo [AVISO] Maven ja extraido. Deletando versao antiga...
    rmdir /s /q "%MAVEN_DIR%"
)

echo Extraindo para: %TOOLS_DIR%
echo Aguarde...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '%MAVEN_ZIP%' -DestinationPath '%TOOLS_DIR%' -Force"

if %errorlevel% neq 0 (
    color 0C
    echo [ERRO] Falha ao extrair!
    pause
    exit /b 1
)

echo [OK] Extraido!
echo.
echo Conteudo de tools:
dir /b "%TOOLS_DIR%"
pause

REM ========================================
REM Passo 5: Verificar instalacao
REM ========================================
echo.
echo [Passo 5/6] Verificando instalacao...

set MVN_CMD=%MAVEN_DIR%\bin\mvn.cmd

if not exist "%MVN_CMD%" (
    color 0C
    echo [ERRO] mvn.cmd nao encontrado!
    echo Esperado em: %MVN_CMD%
    echo.
    echo Conteudo da pasta tools:
    dir /b "%TOOLS_DIR%"
    echo.
    pause
    exit /b 1
)

echo [OK] mvn.cmd encontrado!
echo Localizacao: %MVN_CMD%
echo.
echo Testando Maven...
call "%MVN_CMD%" -version

if %errorlevel% neq 0 (
    color 0C
    echo [ERRO] Maven instalado mas nao funciona!
    pause
    exit /b 1
)

echo.
echo [OK] Maven FUNCIONAL!
pause

REM ========================================
REM Passo 6: Criar scripts
REM ========================================
echo.
echo [Passo 6/6] Criando scripts...

REM Atualizar COMPILAR_JAVA.bat
(
echo @echo off
echo chcp 65001 ^> nul
echo title Compilando Backend Java
echo cd /d "%%~dp0"
echo echo.
echo echo Compilando backend Java com Maven local...
echo echo.
echo if not exist backend ^(
echo     echo [ERRO] Pasta backend nao encontrada!
echo     pause
echo     exit /b 1
echo ^)
echo cd backend
echo call "..\tools\apache-maven-3.9.12\bin\mvn.cmd" clean package -DskipTests
echo if %%errorlevel%% neq 0 ^(
echo     echo.
echo     echo [ERRO] Falha na compilacao!
echo     cd ..
echo     pause
echo     exit /b 1
echo ^)
echo cd ..
echo echo.
echo echo [OK] Backend Java compilado com sucesso!
echo pause
) > COMPILAR_JAVA.bat

echo [OK] COMPILAR_JAVA.bat atualizado
echo.

REM ========================================
REM Sucesso!
REM ========================================
color 0A
echo ========================================================================
echo              MAVEN INSTALADO E FUNCIONAL!
echo ========================================================================
echo.
echo Localizacao: %MAVEN_DIR%
echo Comando: %MVN_CMD%
echo.
echo ========================================================================
echo                      PROXIMOS PASSOS
echo ========================================================================
echo.
echo 1. Para compilar o backend Java:
echo    Execute: COMPILAR_JAVA.bat
echo.
echo 2. Para iniciar o sistema hibrido:
echo    Execute: INICIAR_SISTEMA_HIBRIDO.bat
echo.
echo ========================================================================
echo.
echo Pressione qualquer tecla para fechar...
pause > nul
endlocal
