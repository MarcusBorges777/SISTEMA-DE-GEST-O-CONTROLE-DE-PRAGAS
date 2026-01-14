@echo off
chcp 65001 > nul
echo ========================================
echo Parando Sistema de Gestão de Documentos
echo ========================================
echo.

echo Parando processos Java (Spring Boot)...
taskkill /F /FI "WINDOWTITLE eq Backend Java - Spring Boot*" > nul 2>&1

echo Parando processos Python (Flask)...
taskkill /F /FI "WINDOWTITLE eq Frontend Python - Flask*" > nul 2>&1

REM Matar processos Java e Python rodando nas portas específicas
echo Liberando porta 8080 (Java)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080 ^| findstr LISTENING') do taskkill /F /PID %%a > nul 2>&1

echo Liberando porta 5000 (Flask)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do taskkill /F /PID %%a > nul 2>&1

echo.
echo ========================================
echo Sistema Parado!
echo ========================================
pause
