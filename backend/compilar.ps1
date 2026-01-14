# Script PowerShell para compilar o backend Java
# Execute no terminal do VS Code (pasta backend): .\compilar.ps1

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
    Write-Host "Solucao: Volte para pasta raiz e execute INSTALAR_MAVEN_DEFINITIVO.bat" -ForegroundColor Yellow
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

    # Listar arquivo JAR criado
    $jarFile = Get-ChildItem -Path "target" -Filter "*.jar" | Select-Object -First 1
    if ($jarFile) {
        Write-Host "  -> $($jarFile.Name)" -ForegroundColor Green
        Write-Host "  -> Tamanho: $([math]::Round($jarFile.Length/1MB, 2)) MB" -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "Proximo passo: Execute .\iniciar.ps1 para rodar o servidor" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================================================" -ForegroundColor Red
    Write-Host "              ERRO NA COMPILACAO!" -ForegroundColor Red
    Write-Host "========================================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifique os erros acima e tente novamente." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
