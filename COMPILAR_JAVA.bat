@echo off 
chcp 65001 > nul 
title Compilando Backend Java 
echo. 
echo Compilando backend Java com Maven local... 
echo. 
cd backend 
"..\tools\apache-maven-3.9.6\bin\mvn.cmd" clean package -DskipTests 
if %errorlevel% neq 0 ( 
    echo. 
    echo [ERRO] Falha na compilacao! 
    pause 
    exit /b 1 
) 
cd .. 
echo. 
echo [OK] Backend Java compilado com sucesso! 
pause 
