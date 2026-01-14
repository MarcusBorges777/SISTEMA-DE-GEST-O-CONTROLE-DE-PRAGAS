#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Script para verificar rotas do sistema"""

import re
import sys

# Configurar encoding para Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

# Ler o arquivo app.py
with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Encontrar todas as rotas com suas funções
route_pattern = r'@app\.route\([\'\"](.*?)[\'\"].*?\)\s*def\s+(\w+)\([^)]*\):\s*\n(.*?)(?=\n@|\nif __name__|$)'
routes = re.findall(route_pattern, content, re.DOTALL)

print("=" * 80)
print("AUDITORIA DE ROTAS DO SISTEMA")
print("=" * 80)
print(f"\nTotal de rotas encontradas: {len(routes)}\n")

# Categorizar rotas
vazias = []
funcionais = []
suspeitas = []

for route_path, func_name, func_body in routes:
    # Remover comentários e espaços em branco
    func_body_clean = '\n'.join([line for line in func_body.split('\n')
                                  if line.strip() and not line.strip().startswith('#')])

    # Verificar se está vazia (só comentários ou pass)
    if not func_body_clean or func_body_clean.strip() == 'pass':
        vazias.append((route_path, func_name))
    # Verificar se tem apenas docstring
    elif func_body_clean.strip().startswith('"""') or func_body_clean.strip().startswith("'''"):
        if 'return' not in func_body_clean:
            vazias.append((route_path, func_name))
        else:
            funcionais.append((route_path, func_name))
    # Verificar se tem implementação mas pode estar quebrada
    elif 'TODO' in func_body.upper() or 'FIXME' in func_body.upper():
        suspeitas.append((route_path, func_name))
    else:
        funcionais.append((route_path, func_name))

# Imprimir resultados
print("\n" + "=" * 80)
print("ROTAS FUNCIONAIS ({})".format(len(funcionais)))
print("=" * 80)
for i, (route, func) in enumerate(funcionais, 1):
    print(f"{i:3}. {route:45} -> {func}")

if suspeitas:
    print("\n" + "=" * 80)
    print("ROTAS SUSPEITAS/EM DESENVOLVIMENTO ({})".format(len(suspeitas)))
    print("=" * 80)
    for i, (route, func) in enumerate(suspeitas, 1):
        print(f"{i:3}. {route:45} -> {func}")

if vazias:
    print("\n" + "=" * 80)
    print("ROTAS VAZIAS OU QUEBRADAS ({})".format(len(vazias)))
    print("=" * 80)
    for i, (route, func) in enumerate(vazias, 1):
        print(f"{i:3}. {route:45} -> {func}")

# Resumo
print("\n" + "=" * 80)
print("RESUMO")
print("=" * 80)
print(f"Total de rotas:        {len(routes)}")
print(f"Funcionais:            {len(funcionais)} ({len(funcionais)*100//len(routes) if routes else 0}%)")
print(f"Suspeitas:             {len(suspeitas)} ({len(suspeitas)*100//len(routes) if routes else 0}%)")
print(f"Vazias/Quebradas:      {len(vazias)} ({len(vazias)*100//len(routes) if routes else 0}%)")
print("=" * 80)

# Pausar no final para ver os resultados
input("\nPressione ENTER para sair...")
