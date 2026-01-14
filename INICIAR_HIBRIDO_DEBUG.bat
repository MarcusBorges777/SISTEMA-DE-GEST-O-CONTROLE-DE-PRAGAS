@echo off
echo Abrindo sistema hibrido em modo debug...
echo A janela vai permanecer aberta mesmo com erros.
echo.
pause

REM Abrir em nova janela que nao fecha
start "Sistema Hibrido - Debug" cmd /k call "%~dp0INICIAR_SISTEMA_HIBRIDO.bat"
