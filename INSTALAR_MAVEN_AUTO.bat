@echo off
chcp 65001 > nul
title Instalacao Automatica do Maven
color 0B

echo.
echo ========================================================================
echo           INSTALACAO AUTOMATICA DO APACHE MAVEN
echo ========================================================================
echo.
echo Este script vai:
echo   1. Baixar o Maven 3.9.6 (9 MB)
echo   2. Extrair para C:\apache-maven-3.9.6
echo   3. Configurar o PATH automaticamente
echo.
echo Pressione qualquer tecla para continuar ou CTRL+C para cancelar...
pause > nul

REM ========================================
REM 1. Criar diretorio temporario
REM ========================================
echo.
echo [1/5] Criando diretorios...
set DOWNLOAD_DIR=%TEMP%\maven_install
if not exist "%DOWNLOAD_DIR%" mkdir "%DOWNLOAD_DIR%"
set MAVEN_HOME=C:\apache-maven-3.9.6
echo [OK] Diretorios criados

REM ========================================
REM 2. Baixar Maven
REM ========================================
echo.
echo [2/5] Baixando Maven 3.9.6...
echo Isso pode levar alguns minutos dependendo da sua internet...
echo.

set MAVEN_URL=https://dlcdn.apache.org/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.zip
set MAVEN_ZIP=%DOWNLOAD_DIR%\maven.zip

powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri '%MAVEN_URL%' -OutFile '%MAVEN_ZIP%'}"

if %errorlevel% neq 0 (
    color 0C
    echo [ERRO] Falha ao baixar Maven!
    echo.
    echo Por favor, baixe manualmente:
    echo https://maven.apache.org/download.cgi
    echo.
    pause
    exit /b 1
)

echo [OK] Maven baixado com sucesso!

REM ========================================
REM 3. Extrair Maven
REM ========================================
echo.
echo [3/5] Extraindo Maven para C:\apache-maven-3.9.6...

REM Remover instalacao anterior se existir
if exist "%MAVEN_HOME%" (
    echo Removendo instalacao anterior...
    rmdir /s /q "%MAVEN_HOME%" 2>nul
)

powershell -Command "& {Expand-Archive -Path '%MAVEN_ZIP%' -DestinationPath 'C:\' -Force}"

if %errorlevel% neq 0 (
    color 0C
    echo [ERRO] Falha ao extrair Maven!
    pause
    exit /b 1
)

echo [OK] Maven extraido!

REM ========================================
REM 4. Configurar PATH
REM ========================================
echo.
echo [4/5] Configurando PATH do sistema...
echo NOTA: Isto requer permissoes de administrador.
echo Se falhar, voce precisara adicionar manualmente ao PATH.
echo.

set MAVEN_BIN=%MAVEN_HOME%\bin

REM Adicionar ao PATH do usuario (nao requer admin)
powershell -Command "& {$path = [Environment]::GetEnvironmentVariable('Path', 'User'); if ($path -notlike '*%MAVEN_BIN%*') { [Environment]::SetEnvironmentVariable('Path', $path + ';%MAVEN_BIN%', 'User'); Write-Host '[OK] PATH do usuario atualizado' } else { Write-Host '[INFO] Maven ja esta no PATH' }}"

echo.
echo PATH atualizado para o usuario atual.

REM ========================================
REM 5. Limpar arquivos temporarios
REM ========================================
echo.
echo [5/5] Limpando arquivos temporarios...
del /q "%MAVEN_ZIP%" 2>nul
echo [OK] Limpeza concluida!

REM ========================================
REM Resultado
REM ========================================
echo.
echo ========================================================================
color 0A
echo                   MAVEN INSTALADO COM SUCESSO!
echo ========================================================================
echo.
echo Instalacao:
echo   %MAVEN_HOME%
echo.
echo PATH configurado:
echo   %MAVEN_BIN%
echo.
echo ========================================================================
echo                           IMPORTANTE!
echo ========================================================================
echo.
echo Para o Maven funcionar, voce precisa:
echo.
echo   1. FECHAR ESTA JANELA
echo   2. ABRIR UM NOVO Prompt de Comando
echo   3. Testar com: mvn -version
echo.
echo O PATH so e atualizado em NOVAS janelas do CMD!
echo.
echo ========================================================================
echo.
echo Pressione qualquer tecla para fechar...
pause > nul

echo.
echo Abrindo novo prompt de comando para voce testar...
start cmd /k "echo Maven instalado! Digite: mvn -version && echo. && echo Se aparecer a versao do Maven, esta funcionando! && echo."
