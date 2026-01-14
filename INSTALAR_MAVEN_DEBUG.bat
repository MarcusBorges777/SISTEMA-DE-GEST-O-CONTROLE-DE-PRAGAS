@echo off
echo Iniciando script em modo debug...
echo.
pause

REM Abrir em uma nova janela que nao fecha
start "Instalacao Maven - Debug" cmd /k call "%~dp0INSTALAR_MAVEN_SIMPLES.bat"
