@echo off
title Instalacao Maven - Versao Basica
color 0B

echo.
echo ========================================
echo   INSTALACAO MAVEN 3.9.12 - BASICO
echo ========================================
echo.

REM Ir para o diretorio do script
cd /d "%~dp0"

echo Diretorio atual: %CD%
echo.
pause

REM Verificar/criar pasta tools
echo Criando pasta tools...
if not exist tools mkdir tools
echo [OK] Pasta tools: %CD%\tools
echo.
pause

REM Verificar arquivo
echo Verificando arquivo maven.zip...
if exist tools\maven.zip (
    echo [OK] Arquivo encontrado!
    dir tools\maven.zip
) else (
    echo [ERRO] Arquivo tools\maven.zip NAO encontrado!
    echo.
    echo Baixe manualmente de:
    echo https://archive.apache.org/dist/maven/maven-3/3.9.12/binaries/apache-maven-3.9.12-bin.zip
    echo.
    echo E salve como: %CD%\tools\maven.zip
    echo.
    pause
    exit /b 1
)
echo.
pause

REM Extrair
echo Extraindo Maven...
powershell -Command "Expand-Archive -Path 'tools\maven.zip' -DestinationPath 'tools\' -Force"
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao extrair!
    pause
    exit /b 1
)
echo [OK] Maven extraido!
echo.
pause

REM Verificar instalacao
echo Verificando instalacao...
if exist tools\apache-maven-3.9.12\bin\mvn.cmd (
    echo [OK] Maven instalado com sucesso!
    echo.
    echo Localizacao: %CD%\tools\apache-maven-3.9.12
) else (
    echo [ERRO] Maven nao foi instalado corretamente!
    pause
    exit /b 1
)
echo.

echo ========================================
echo        INSTALACAO CONCLUIDA!
echo ========================================
echo.
echo Execute agora: INICIAR_SISTEMA_HIBRIDO.bat
echo.
pause
