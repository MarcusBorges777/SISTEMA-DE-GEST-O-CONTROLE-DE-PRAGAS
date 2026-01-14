# Script PowerShell para iniciar o backend Java
# Execute no terminal do VS Code: .\iniciar.ps1

Write-Host ""
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "              INICIANDO BACKEND JAVA" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""

# Caminho para o Maven local
$mavenCmd = "..\tools\apache-maven-3.9.12\bin\mvn.cmd"

# Verificar se Maven existe
if (Test-Path $mavenCmd) {
    Write-Host "[OK] Maven local encontrado!" -ForegroundColor Green
} else {
    Write-Host "[ERRO] Maven nao encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Execute primeiro: INSTALAR_MAVEN_DEFINITIVO.bat" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "Iniciando Spring Boot..." -ForegroundColor Yellow
Write-Host "Aguarde ate aparecer: 'Started Application in X seconds'" -ForegroundColor Gray
Write-Host ""
Write-Host "Pressione Ctrl+C para parar o servidor" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""

# Iniciar Spring Boot
& $mavenCmd spring-boot:run
