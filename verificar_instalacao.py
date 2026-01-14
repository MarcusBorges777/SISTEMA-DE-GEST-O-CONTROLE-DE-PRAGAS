#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script de Verificação da Instalação
Verifica se todos os arquivos e configurações estão corretos
"""

import os
import sys
from pathlib import Path

# Cores para terminal
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text.center(60)}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}\n")

def check_ok(message):
    print(f"{Colors.GREEN}[OK]{Colors.END} {message}")

def check_error(message):
    print(f"{Colors.RED}[ERRO]{Colors.END} {message}")

def check_warning(message):
    print(f"{Colors.YELLOW}[AVISO]{Colors.END} {message}")

def check_file(filepath, required=True):
    """Verifica se arquivo existe"""
    if os.path.exists(filepath):
        check_ok(f"Arquivo encontrado: {filepath}")
        return True
    else:
        if required:
            check_error(f"Arquivo FALTANDO: {filepath}")
        else:
            check_warning(f"Arquivo opcional não encontrado: {filepath}")
        return False

def check_folder(folderpath, required=True):
    """Verifica se pasta existe"""
    if os.path.exists(folderpath) and os.path.isdir(folderpath):
        check_ok(f"Pasta encontrada: {folderpath}")
        return True
    else:
        if required:
            check_error(f"Pasta FALTANDO: {folderpath}")
        else:
            check_warning(f"Pasta opcional não encontrada: {folderpath}")
        return False

def check_in_file(filepath, search_text, description):
    """Verifica se texto existe no arquivo"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            if search_text in content:
                check_ok(f"{description} configurado em {filepath}")
                return True
            else:
                check_error(f"{description} NÃO encontrado em {filepath}")
                return False
    except Exception as e:
        check_error(f"Erro ao ler {filepath}: {e}")
        return False

def main():
    print(f"\n{Colors.BOLD}VERIFICACAO DA INSTALACAO DO SISTEMA DE ARQUIVOS{Colors.END}\n")

    total_checks = 0
    passed_checks = 0

    # ============================================
    # VERIFICAR ESTRUTURA DE PASTAS
    # ============================================
    print_header("1. ESTRUTURA DE PASTAS")

    folders = [
        ('static/js', True),
        ('templates/components', True),
        ('blueprints', True),
        ('uploads', True),
    ]

    for folder, required in folders:
        total_checks += 1
        if check_folder(folder, required):
            passed_checks += 1

    # ============================================
    # VERIFICAR ARQUIVOS PRINCIPAIS
    # ============================================
    print_header("2. ARQUIVOS PRINCIPAIS")

    files = [
        ('static/js/file-manager.js', True),
        ('static/js/cloud-config.js', True),
        ('templates/components/file_upload_widget.html', True),
        ('templates/components/export_buttons.html', True),
        ('blueprints/file_manager.py', True),
        ('app.py', True),
    ]

    for file, required in files:
        total_checks += 1
        if check_file(file, required):
            passed_checks += 1

    # ============================================
    # VERIFICAR DOCUMENTAÇÃO
    # ============================================
    print_header("3. DOCUMENTAÇÃO")

    docs = [
        ('SISTEMA_ARQUIVOS_DOCUMENTACAO.md', False),
        ('README_SISTEMA_ARQUIVOS.md', False),
        ('GUIA_GOOGLE_DRIVE.md', False),
        ('GUIA_DROPBOX.md', False),
        ('INTEGRACAO_PASSO_A_PASSO.md', False),
        ('EXEMPLOS_PRATICOS.html', False),
    ]

    for doc, required in docs:
        total_checks += 1
        if check_file(doc, required):
            passed_checks += 1

    # ============================================
    # VERIFICAR INTEGRAÇÃO NO APP.PY
    # ============================================
    print_header("4. INTEGRAÇÃO NO APP.PY")

    if os.path.exists('app.py'):
        total_checks += 1
        if check_in_file('app.py', 'from blueprints.file_manager import file_manager_bp',
                         'Import do file_manager_bp'):
            passed_checks += 1

        total_checks += 1
        if check_in_file('app.py', 'app.register_blueprint(file_manager_bp)',
                         'Registro do blueprint'):
            passed_checks += 1
    else:
        check_error("app.py não encontrado!")
        total_checks += 2

    # ============================================
    # VERIFICAR BASE.HTML
    # ============================================
    print_header("5. SCRIPTS NO BASE.HTML")

    base_html = 'templates/base.html'
    if os.path.exists(base_html):
        total_checks += 1
        if check_in_file(base_html, 'file-manager.js', 'Script file-manager.js'):
            passed_checks += 1

        total_checks += 1
        if check_in_file(base_html, 'jspdf', 'Script jsPDF'):
            passed_checks += 1

        total_checks += 1
        if check_in_file(base_html, 'xlsx', 'Script SheetJS'):
            passed_checks += 1
    else:
        check_error("templates/base.html não encontrado!")
        total_checks += 3

    # ============================================
    # VERIFICAR CONFIGURAÇÃO DE NUVEM
    # ============================================
    print_header("6. CONFIGURAÇÃO DE NUVEM")

    cloud_config = 'static/js/cloud-config.js'
    if os.path.exists(cloud_config):
        try:
            with open(cloud_config, 'r', encoding='utf-8') as f:
                content = f.read()

                # Google Drive
                total_checks += 1
                if 'enabled: true' in content and 'googleDrive' in content:
                    if 'SEU_CLIENT_ID_AQUI' not in content:
                        check_ok("Google Drive configurado")
                        passed_checks += 1
                    else:
                        check_warning("Google Drive habilitado mas credenciais não configuradas")
                else:
                    check_warning("Google Drive não habilitado (opcional)")

                # Dropbox
                total_checks += 1
                if 'enabled: true' in content and 'dropbox' in content:
                    if 'SUA_APP_KEY_AQUI' not in content:
                        check_ok("Dropbox configurado")
                        passed_checks += 1
                    else:
                        check_warning("Dropbox habilitado mas App Key não configurada")
                else:
                    check_warning("Dropbox não habilitado (opcional)")

        except Exception as e:
            check_error(f"Erro ao ler cloud-config.js: {e}")
            total_checks += 2
    else:
        check_error("cloud-config.js não encontrado!")
        total_checks += 2

    # ============================================
    # VERIFICAR PERMISSÕES (Linux/Mac)
    # ============================================
    if sys.platform != 'win32':
        print_header("7. PERMISSÕES (UNIX)")

        total_checks += 1
        uploads_path = Path('uploads')
        if uploads_path.exists():
            if os.access(uploads_path, os.W_OK):
                check_ok("Pasta uploads tem permissão de escrita")
                passed_checks += 1
            else:
                check_error("Pasta uploads SEM permissão de escrita! Execute: chmod 777 uploads")
        else:
            check_error("Pasta uploads não existe!")

    # ============================================
    # RESUMO FINAL
    # ============================================
    print_header("RESUMO DA VERIFICAÇÃO")

    percentage = (passed_checks / total_checks * 100) if total_checks > 0 else 0

    print(f"Total de verificações: {total_checks}")
    print(f"Verificações OK: {Colors.GREEN}{passed_checks}{Colors.END}")
    print(f"Verificações com problema: {Colors.RED}{total_checks - passed_checks}{Colors.END}")
    print(f"Percentual de sucesso: {Colors.BOLD}{percentage:.1f}%{Colors.END}\n")

    if percentage == 100:
        print(f"{Colors.GREEN}{Colors.BOLD}TUDO OK! Sistema pronto para usar!{Colors.END}\n")
        return 0
    elif percentage >= 80:
        print(f"{Colors.YELLOW}{Colors.BOLD}Quase la! Resolva os problemas acima.{Colors.END}\n")
        return 1
    else:
        print(f"{Colors.RED}{Colors.BOLD}Problemas detectados! Siga o INTEGRACAO_PASSO_A_PASSO.md{Colors.END}\n")
        return 2

    # ============================================
    # DICAS
    # ============================================
    print_header("PRÓXIMOS PASSOS")

    print("1. Se faltam arquivos principais:")
    print("   → Verifique se todos os arquivos foram criados corretamente\n")

    print("2. Se app.py não está configurado:")
    print("   → Siga o INTEGRACAO_PASSO_A_PASSO.md\n")

    print("3. Se quer configurar nuvem:")
    print("   → Google Drive: veja GUIA_GOOGLE_DRIVE.md")
    print("   → Dropbox: veja GUIA_DROPBOX.md\n")

    print("4. Para testar o sistema:")
    print("   → Abra EXEMPLOS_PRATICOS.html no navegador")
    print("   → Ou inicie o servidor: python app.py\n")

    print(f"{Colors.BLUE}Documentacao completa:{Colors.END}")
    print("   → SISTEMA_ARQUIVOS_DOCUMENTACAO.md")
    print("   → README_SISTEMA_ARQUIVOS.md")
    print("   → INTEGRACAO_PASSO_A_PASSO.md\n")

if __name__ == '__main__':
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Verificação cancelada pelo usuário.{Colors.END}\n")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.RED}Erro inesperado: {e}{Colors.END}\n")
        sys.exit(2)
