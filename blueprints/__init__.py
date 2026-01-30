#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Módulo de Blueprints do Sistema de Gestão de Documentos.
Organiza as rotas em módulos separados para melhor manutenção.

Blueprints disponíveis:
    - clientes_bp: Gestão de clientes (/api/clientes/*, /api/garantias/*)
    - boletos_bp: Gestão de boletos (/api/boletos/*)
    - tags_bp: Sistema de tags (/api/tags/*, /api/arquivo/tags)
    - documentos_bp: Gestão de documentos (/api/documentos/*)
    - prospeccao_bp: Prospecção de clientes (Econodata)
    - file_manager_bp: Gerenciamento de arquivos

Uso:
    from blueprints import clientes_bp, boletos_bp, tags_bp, documentos_bp
    app.register_blueprint(clientes_bp, url_prefix='/api')
    app.register_blueprint(boletos_bp, url_prefix='/api')
    app.register_blueprint(tags_bp, url_prefix='/api')
    app.register_blueprint(documentos_bp, url_prefix='/api')
"""

from flask import Blueprint

# Importa blueprints existentes
from blueprints.prospeccao import prospeccao_bp
from blueprints.file_manager import file_manager_bp

# Importa novos blueprints modulares
from blueprints.clientes import clientes_bp
from blueprints.boletos import boletos_bp
from blueprints.tags import tags_bp
from blueprints.documentos import documentos_bp

# Exporta todos os blueprints
__all__ = [
    'clientes_bp',
    'boletos_bp',
    'tags_bp',
    'documentos_bp',
    'prospeccao_bp',
    'file_manager_bp',
]
