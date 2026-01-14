@echo off
echo ========================================
echo REINICIANDO SERVIDOR FLASK
echo ========================================
echo.

echo [1/3] Matando processos Flask na porta 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
    echo Matando processo %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo [2/3] Limpando cache Python...
del /s /q blueprints\__pycache__\*.pyc 2>nul
rmdir /s /q blueprints\__pycache__ 2>nul

echo.
echo [3/3] Iniciando servidor...
echo.
start "Flask Server" cmd /c "python app.py"

timeout /t 3 >nul

echo.
echo ========================================
echo SERVIDOR REINICIADO!
echo ========================================
echo.
echo Aguarde 3 segundos e depois:
echo 1. Abra: http://127.0.0.1:5000/prospeccao
echo 2. Pressione Ctrl+F5 para limpar cache do navegador
echo.
pause
