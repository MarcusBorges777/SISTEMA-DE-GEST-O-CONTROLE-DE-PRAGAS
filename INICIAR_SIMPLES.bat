@echo off
title Sistema Completo

echo Iniciando Backend Java (Spring Boot)...
start "Backend Java" cmd /k "cd backend && mvn spring-boot:run"

timeout /t 10 /nobreak

echo Iniciando Frontend Python (Flask)...
start "Frontend Python" cmd /k "python app.py"

timeout /t 5 /nobreak

echo Abrindo navegador...
start http://localhost:5000

echo Sistema iniciado!
pause
