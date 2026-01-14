@echo off
chcp 65001 > nul
title Diagnostico - Localizar Maven
color 0E

echo.
echo ========================================================================
echo                  DIAGNOSTICO - LOCALIZAR ARQUIVO MAVEN
echo ========================================================================
echo.

set PROJETO=%~dp0
echo Diretorio do projeto:
echo %PROJETO%
echo.

echo ========================================================================
echo [1] Verificando pasta tools...
echo ========================================================================
if exist "%PROJETO%tools" (
    echo [OK] Pasta tools existe
    echo.
    echo Conteudo da pasta tools:
    dir /b "%PROJETO%tools" 2>nul
    if %errorlevel% neq 0 (
        echo [Vazia] Nenhum arquivo encontrado
    )
) else (
    echo [X] Pasta tools NAO existe!
    echo.
    echo Criando pasta tools...
    mkdir "%PROJETO%tools"
    echo [OK] Pasta criada em: %PROJETO%tools
)
echo.

echo ========================================================================
echo [2] Procurando arquivos .zip no diretorio atual...
echo ========================================================================
dir /b "%PROJETO%*.zip" 2>nul
if %errorlevel% neq 0 (
    echo [Nenhum] Nenhum arquivo .zip encontrado no diretorio atual
)
echo.

echo ========================================================================
echo [3] Procurando apache-maven*.zip em todo o projeto...
echo ========================================================================
dir /s /b "%PROJETO%apache-maven*.zip" 2>nul
if %errorlevel% neq 0 (
    echo [Nenhum] Nenhum arquivo apache-maven*.zip encontrado
)
echo.

echo ========================================================================
echo [4] Procurando qualquer .zip que contenha 'maven'...
echo ========================================================================
for /r "%PROJETO%" %%F in (*.zip) do (
    echo %%F | findstr /i maven
)
echo.

echo ========================================================================
echo [5] Verificando Downloads do usuario...
echo ========================================================================
set DOWNLOADS=%USERPROFILE%\Downloads
echo Pasta Downloads: %DOWNLOADS%
echo.
echo Procurando maven*.zip em Downloads...
dir /b "%DOWNLOADS%\*maven*.zip" 2>nul
if %errorlevel% neq 0 (
    echo [Nenhum] Nenhum arquivo maven encontrado em Downloads
) else (
    echo.
    echo [ENCONTRADO] Arquivo(s) maven encontrado(s) em Downloads!
    echo.
    echo Deseja copiar para a pasta tools? (S/N)
    set /p COPIAR=
    if /i "%COPIAR%"=="S" (
        for %%F in ("%DOWNLOADS%\*maven*.zip") do (
            echo Copiando %%F...
            copy "%%F" "%PROJETO%tools\maven.zip"
            if %errorlevel% equ 0 (
                echo [OK] Arquivo copiado com sucesso!
                echo.
                echo Execute agora: INSTALAR_MAVEN_SIMPLES.bat
            )
        )
    )
)
echo.

echo ========================================================================
echo [6] Onde salvar o arquivo maven.zip
echo ========================================================================
echo.
echo O arquivo deve ser salvo EXATAMENTE em:
echo %PROJETO%tools\maven.zip
echo.
echo Ou seja:
echo - Nome do arquivo: maven.zip (minusculas)
echo - Pasta: tools\
echo - Caminho completo: %PROJETO%tools\maven.zip
echo.

echo ========================================================================
echo                         RESUMO
echo ========================================================================
echo.
echo Para instalar Maven manualmente:
echo.
echo 1. Baixe: https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.zip
echo.
echo 2. Salve como: %PROJETO%tools\maven.zip
echo    (IMPORTANTE: nome DEVE ser maven.zip)
echo.
echo 3. Execute: INSTALAR_MAVEN_SIMPLES.bat
echo.
echo ========================================================================
echo.
pause
