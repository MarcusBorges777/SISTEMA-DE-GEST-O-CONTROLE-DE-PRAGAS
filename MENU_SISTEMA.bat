@echo off
chcp 65001 >nul
title Sistema de Gestão - Menu Principal
color 0B

:MENU
cls
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║          SISTEMA DE GESTÃO DE DOCUMENTOS                       ║
echo ║                   Menu Principal v2.0                          ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo [1] 🚀 INICIAR SISTEMA (Recomendado)
echo [2] 🔄 REINICIAR SERVIDOR
echo [3] 🛑 PARAR SERVIDOR
echo [4] 🔍 VERIFICAR STATUS DO SISTEMA
echo [5] 📦 INSTALAR/ATUALIZAR DEPENDÊNCIAS
echo [6] 🗄️  VERIFICAR BANCO DE DADOS
echo [7] 📂 ABRIR PASTA DE DOCUMENTOS GERADOS
echo [8] 🌐 ABRIR SISTEMA NO NAVEGADOR
echo [9] 📖 MOSTRAR DOCUMENTAÇÃO
echo [0] ❌ SAIR
echo.
echo ════════════════════════════════════════════════════════════════
echo.

set /p opcao="Digite a opção desejada: "

if "%opcao%"=="1" goto INICIAR
if "%opcao%"=="2" goto REINICIAR
if "%opcao%"=="3" goto PARAR
if "%opcao%"=="4" goto STATUS
if "%opcao%"=="5" goto INSTALAR
if "%opcao%"=="6" goto VERIFICAR_DB
if "%opcao%"=="7" goto ABRIR_PASTA
if "%opcao%"=="8" goto ABRIR_BROWSER
if "%opcao%"=="9" goto DOCS
if "%opcao%"=="0" goto SAIR

echo ❌ Opção inválida!
timeout /t 2 >nul
goto MENU

:INICIAR
cls
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                    INICIANDO SISTEMA                           ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
call INICIAR_SISTEMA.bat
goto MENU

:REINICIAR
cls
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                  REINICIANDO SERVIDOR                          ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo Parando servidor atual...
taskkill /F /IM python.exe >nul 2>&1
timeout /t 2 >nul
echo ✅ Servidor parado
echo.
echo Iniciando novo servidor...
start "Servidor Flask" python app.py
timeout /t 3 >nul
echo ✅ Servidor reiniciado
echo.
echo 🌐 Acesse: http://127.0.0.1:5000
echo.
pause
goto MENU

:PARAR
cls
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                    PARANDO SERVIDOR                            ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
taskkill /F /IM python.exe >nul 2>&1
echo ✅ Servidor parado com sucesso!
echo.
pause
goto MENU

:STATUS
cls
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                  STATUS DO SISTEMA                             ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

echo [1/6] Verificando Python...
python --version >nul 2>&1
if %errorlevel% equ 0 (
    python --version
    echo ✅ Python instalado
) else (
    echo ❌ Python NÃO instalado
)

echo.
echo [2/6] Verificando Flask...
pip show flask >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Flask instalado
) else (
    echo ❌ Flask NÃO instalado
)

echo.
echo [3/6] Verificando DocxTpl...
pip show docxtpl >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ DocxTpl instalado
) else (
    echo ❌ DocxTpl NÃO instalado
)

echo.
echo [4/6] Verificando Banco de Dados...
if exist "gestao_documentos.db" (
    echo ✅ Banco de dados encontrado
) else (
    echo ⚠️  Banco de dados não encontrado (será criado ao iniciar)
)

echo.
echo [5/6] Verificando Servidor...
tasklist /FI "IMAGENAME eq python.exe" 2>NUL | find /I /N "python.exe">NUL
if %errorlevel% equ 0 (
    echo ✅ Servidor Python está RODANDO
) else (
    echo ⚠️  Servidor Python NÃO está rodando
)

echo.
echo [6/6] Verificando Templates...
set template_count=0
for %%f in (modelos\*.docx) do set /a template_count+=1
echo ✅ Templates encontrados: %template_count%

echo.
echo ════════════════════════════════════════════════════════════════
echo.
pause
goto MENU

:INSTALAR
cls
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║              INSTALANDO DEPENDÊNCIAS                           ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo Instalando/Atualizando pacotes Python...
echo.
pip install --upgrade pip
pip install flask flask-cors python-docx docxtpl pdfplumber python-dateutil google-generativeai python-dotenv requests werkzeug
echo.
echo ✅ Dependências instaladas/atualizadas!
echo.
pause
goto MENU

:VERIFICAR_DB
cls
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║              VERIFICANDO BANCO DE DADOS                        ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

if exist "gestao_documentos.db" (
    echo ✅ Banco de dados encontrado: gestao_documentos.db
    for %%A in (gestao_documentos.db) do (
        echo 📊 Tamanho: %%~zA bytes
        echo 📅 Última modificação: %%~tA
    )
) else (
    echo ⚠️  Banco de dados não encontrado
    echo.
    echo O banco será criado automaticamente ao iniciar o sistema.
)

echo.
if exist "cnpj_filtrado.db" (
    echo ✅ Banco CNPJ encontrado: cnpj_filtrado.db
    for %%A in (cnpj_filtrado.db) do (
        echo 📊 Tamanho: %%~zA bytes
    )
) else (
    echo ⚠️  Banco CNPJ não encontrado (opcional)
)

echo.
pause
goto MENU

:ABRIR_PASTA
cls
echo.
echo 📂 Abrindo pasta de documentos...
if exist "output\documentos" (
    start "" "output\documentos"
    echo ✅ Pasta aberta
) else (
    mkdir "output\documentos"
    start "" "output\documentos"
    echo ✅ Pasta criada e aberta
)
timeout /t 2 >nul
goto MENU

:ABRIR_BROWSER
cls
echo.
echo 🌐 Abrindo sistema no navegador...
echo.
echo Verificando se servidor está rodando...
tasklist /FI "IMAGENAME eq python.exe" 2>NUL | find /I /N "python.exe">NUL
if %errorlevel% neq 0 (
    echo ⚠️  Servidor não está rodando!
    echo.
    echo Iniciando servidor...
    start "Servidor Flask" python app.py
    timeout /t 5 >nul
)

start http://127.0.0.1:5000/documentos
echo ✅ Navegador aberto
timeout /t 2 >nul
goto MENU

:DOCS
cls
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                    DOCUMENTAÇÃO                                ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo 📚 SISTEMA DE GESTÃO DE DOCUMENTOS
echo.
echo 🔧 FUNCIONALIDADES:
echo    • Geração de Laudos (Completo, Dedetização, Caixa D'Água)
echo    • Geração de Recibos
echo    • Geração de Orçamentos
echo    • Gestão de Clientes
echo    • Prospecção de Clientes (CNPJ)
echo    • Aprendizagem automática de layouts de documentos
echo.
echo 🌐 ROTAS PRINCIPAIS:
echo    • /documentos          - Interface principal
echo    • /prospeccao          - Módulo de prospecção
echo    • /gerar-laudo         - API de geração de laudos
echo    • /gerar-recibo        - API de geração de recibos
echo    • /gerar-orcamento     - API de geração de orçamentos
echo.
echo 📝 TEMPLATES DISPONÍVEIS:
echo    • Laudo Completo.docx
echo    • Laudo Completo (Sem Assinatura).docx
echo    • Laudo Dedetização.docx
echo    • Laudo DDT (Sem Assinatura).docx
echo    • Laudo Caixa D'Água.docx
echo    • Laudo Caixa (Sem Assinatura).docx
echo    • Recibo.docx
echo    • Orçamento.docx
echo.
echo 🔑 TECNOLOGIAS:
echo    • Python 3.13+ com Flask
echo    • DocxTpl para geração de documentos
echo    • SQLite para banco de dados
echo    • PDFPlumber para extração de dados
echo    • Google Gemini AI (opcional)
echo.
echo ════════════════════════════════════════════════════════════════
echo.
pause
goto MENU

:SAIR
cls
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                  ENCERRANDO SISTEMA                            ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo Deseja parar o servidor antes de sair? (S/N)
set /p parar="Resposta: "

if /i "%parar%"=="S" (
    echo.
    echo Parando servidor...
    taskkill /F /IM python.exe >nul 2>&1
    echo ✅ Servidor parado
)

echo.
echo ✅ Sistema encerrado. Até logo!
timeout /t 2 >nul
exit
