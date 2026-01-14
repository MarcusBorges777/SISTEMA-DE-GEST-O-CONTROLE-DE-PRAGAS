@echo off
chcp 65001 > nul
title Verificação de Instalação - Sistema Híbrido
color 0E

echo.
echo ========================================================================
echo           VERIFICACAO DE INSTALACAO - SISTEMA HIBRIDO
echo ========================================================================
echo.

set ERROS=0

REM ========================================
REM Verificar Java
REM ========================================
echo [1/3] Verificando Java...
where java >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [X] ERRO: Java nao encontrado!
    echo.
    echo    Baixe e instale Java 17:
    echo    https://adoptium.net/
    echo.
    set /a ERROS+=1
) else (
    java -version 2>&1 | findstr /C:"version" >nul
    if %errorlevel% neq 0 (
        echo [X] ERRO: Java instalado mas nao configurado corretamente
        set /a ERROS+=1
    ) else (
        echo [OK] Java encontrado:
        java -version 2>&1 | findstr /C:"version"
    )
)
echo.

REM ========================================
REM Verificar Maven
REM ========================================
echo [2/3] Verificando Maven...
where mvn >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] ERRO: Maven nao encontrado!
    echo.
    echo    INSTRUCOES PARA INSTALAR MAVEN:
    echo    ================================
    echo.
    echo    1. Baixe Maven em:
    echo       https://maven.apache.org/download.cgi
    echo.
    echo    2. Baixe o arquivo: apache-maven-3.9.X-bin.zip
    echo.
    echo    3. Extraia para: C:\apache-maven-3.9.X
    echo.
    echo    4. Adicione ao PATH do Windows:
    echo       - Pressione Win + Pause
    echo       - Configuracoes avancadas do sistema
    echo       - Variaveis de ambiente
    echo       - Editar PATH
    echo       - Adicionar: C:\apache-maven-3.9.X\bin
    echo.
    echo    5. Abra um NOVO prompt e teste: mvn -version
    echo.
    set /a ERROS+=1
) else (
    echo [OK] Maven encontrado:
    mvn -version 2>&1 | findstr /C:"Apache Maven"
)
echo.

REM ========================================
REM Verificar Python
REM ========================================
echo [3/3] Verificando Python...
where python >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [X] ERRO: Python nao encontrado!
    echo.
    echo    Baixe e instale Python 3.8+:
    echo    https://www.python.org/downloads/
    echo.
    set /a ERROS+=1
) else (
    python --version 2>&1 | findstr /C:"Python" >nul
    if %errorlevel% neq 0 (
        echo [X] ERRO: Python instalado mas nao configurado corretamente
        set /a ERROS+=1
    ) else (
        echo [OK] Python encontrado:
        python --version
    )
)
echo.

REM ========================================
REM Resultado
REM ========================================
echo ========================================================================
if %ERROS% equ 0 (
    color 0A
    echo                  TODOS OS REQUISITOS OK!
    echo.
    echo    Voce pode iniciar o sistema com:
    echo    INICIAR_SISTEMA_HIBRIDO.bat
    echo.
) else (
    color 0C
    echo               INSTALACAO INCOMPLETA (%ERROS% erro(s))
    echo.
    echo    Por favor, instale os componentes faltantes antes de continuar.
    echo.
)
echo ========================================================================
echo.
echo Pressione qualquer tecla para fechar esta janela...
pause > nul
echo.
echo Fechando...
timeout /t 2 /nobreak > nul
