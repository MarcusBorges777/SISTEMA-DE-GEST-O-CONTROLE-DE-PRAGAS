# Script PowerShell para compilar o backend Java
# Execute no terminal do VS Code: .\compilar.ps1

Write-Host ""
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "              COMPILANDO BACKEND JAVA" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""

# Caminho para o Maven local
$mavenCmd = "..\tools\apache-maven-3.9.12\bin\mvn.cmd"

# Verificar se Maven existe
if (Test-Path $mavenCmd) {
    Write-Host "[OK] Maven local encontrado!" -ForegroundColor Green
    Write-Host "Localizacao: $mavenCmd" -ForegroundColor Gray
} else {
    Write-Host "[ERRO] Maven nao encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Execute primeiro: INSTALAR_MAVEN_DEFINITIVO.bat" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "Iniciando compilacao..." -ForegroundColor Yellow
Write-Host "Comando: mvn clean package -DskipTests" -ForegroundColor Gray
Write-Host ""

# Compilar
& $mavenCmd clean package -DskipTests

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================================================" -ForegroundColor Green
    Write-Host "              COMPILACAO CONCLUIDA COM SUCESSO!" -ForegroundColor Green
    Write-Host "========================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Arquivo JAR criado em: target\" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Proximo passo: Execute .\iniciar.ps1" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================================================" -ForegroundColor Red
    Write-Host "              ERRO NA COMPILACAO!" -ForegroundColor Red
    Write-Host "========================================================================" -ForegroundColor Red
    Write-Host ""
    exit 1
}
