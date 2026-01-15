#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Blueprint de Tags - Gestão de tags/etiquetas para documentos.

Rotas:
    GET  /api/tags              - Lista todas as tags
    POST /api/tags              - Cria nova tag
    POST /api/tags/criar        - Cria nova tag (alias)
    GET  /api/tags/documento    - Obtém tags de um documento
    POST /api/tags/adicionar    - Adiciona tag a documento
    POST /api/tags/remover      - Remove tag de documento
    POST /api/tags/sugerir      - Sugere tags automaticamente
    GET  /api/arquivo/tags      - Obtém tags de arquivo físico
    POST /api/arquivo/tag/adicionar - Adiciona tag a arquivo físico
    POST /api/arquivo/tag/remover   - Remove tag de arquivo físico
"""

from flask import Blueprint, request, jsonify
import hashlib

# Serviços ORM
from services_compat import get_tag_service

# Blueprint
tags_bp = Blueprint('tags', __name__)


# =============================================================================
# FUNÇÕES AUXILIARES
# =============================================================================

def sugerir_tags_por_nome(nome_arquivo: str) -> list:
    """
    Sugere tags baseado no nome do arquivo.

    Args:
        nome_arquivo: Nome do arquivo

    Returns:
        Lista de IDs de tags sugeridas
    """
    nome_lower = nome_arquivo.lower()
    sugestoes = []

    # Mapeamento simples de palavras-chave para tags
    mapeamento = {
        'laudo': 'Laudo',
        'recibo': 'Recibo',
        'orcamento': 'Orçamento',
        'orçamento': 'Orçamento',
        'boleto': 'Boleto',
        'contrato': 'Contrato',
        'relatorio': 'Relatório',
        'relatório': 'Relatório',
    }

    svc = get_tag_service()
    for palavra, tag_nome in mapeamento.items():
        if palavra in nome_lower:
            tag = svc.buscar_por_nome(tag_nome)
            if tag:
                sugestoes.append({
                    'tag_id': tag.id,
                    'nome': tag.nome,
                    'cor': tag.cor,
                    'confianca': 0.9
                })

    return sugestoes


# =============================================================================
# ROTAS DE TAGS
# =============================================================================

@tags_bp.route('/tags', methods=['GET', 'POST'])
def api_obter_tags():
    """
    Retorna todas as tags cadastradas (GET) ou cria nova tag (POST).

    GET Returns:
        Lista de tags em JSON

    POST JSON Body:
        nome: Nome da tag (obrigatório)
        descricao: Descrição da tag
        cor: Cor em hexadecimal (default: #3B82F6)

    Returns:
        JSON com sucesso e ID da tag criada
    """
    svc = get_tag_service()

    if request.method == 'GET':
        try:
            tags = svc.listar()
            return jsonify([t.to_dict() for t in tags])
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    elif request.method == 'POST':
        try:
            dados = request.json
            nome = dados.get('nome', '').strip()
            descricao = dados.get('descricao', '').strip()
            cor = dados.get('cor', '#3B82F6')

            if not nome:
                return jsonify({"error": "Nome da tag é obrigatório"}), 400

            tag = svc.criar(nome=nome, descricao=descricao, cor=cor)

            return jsonify({
                "success": True,
                "tag_id": tag.id,
                "message": "Tag criada com sucesso"
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500


@tags_bp.route('/tags/criar', methods=['POST'])
def api_criar_tag():
    """
    Cria uma nova tag personalizada (alias para POST /tags).

    JSON Body:
        nome: Nome da tag (obrigatório)
        descricao: Descrição da tag
        cor: Cor em hexadecimal (default: #3B82F6)

    Returns:
        JSON com sucesso e dados da tag criada
    """
    try:
        svc = get_tag_service()
        dados = request.json
        nome = dados.get('nome', '').strip()
        descricao = dados.get('descricao', '').strip()
        cor = dados.get('cor', '#3B82F6')

        if not nome:
            return jsonify({"error": "Nome da tag é obrigatório"}), 400

        tag = svc.criar(nome=nome, descricao=descricao, cor=cor)

        return jsonify({
            "success": True,
            "message": "Tag criada com sucesso",
            "tag": tag.to_dict()
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@tags_bp.route('/tags/documento', methods=['GET'])
def api_obter_tags_documento():
    """
    Retorna tags de um documento específico.

    Query Params:
        arquivo_id: ID do arquivo (obrigatório)
        arquivo_tipo: Tipo do arquivo (obrigatório)

    Returns:
        Lista de tags do documento em JSON
    """
    try:
        svc = get_tag_service()
        arquivo_id = request.args.get('arquivo_id', type=int)
        arquivo_tipo = request.args.get('arquivo_tipo', '')

        if not arquivo_id or not arquivo_tipo:
            return jsonify({"error": "arquivo_id e arquivo_tipo são obrigatórios"}), 400

        tags = svc.tags_do_documento(arquivo_id)
        return jsonify([t.to_dict() for t in tags])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@tags_bp.route('/tags/adicionar', methods=['POST'])
def api_adicionar_tag():
    """
    Adiciona uma tag a um documento.

    JSON Body:
        arquivo_id: ID do arquivo (obrigatório)
        arquivo_tipo: Tipo do arquivo (obrigatório)
        tag_id: ID da tag (obrigatório)
        confianca: Nível de confiança (default: 1.0)
        manual: Se foi adicionada manualmente (default: True)

    Returns:
        JSON com mensagem de sucesso
    """
    try:
        svc = get_tag_service()
        dados = request.json
        arquivo_id = dados.get('arquivo_id')
        arquivo_tipo = dados.get('arquivo_tipo')
        tag_id = dados.get('tag_id')
        confianca = dados.get('confianca', 1.0)
        manual = dados.get('manual', True)

        if not arquivo_id or not arquivo_tipo or not tag_id:
            return jsonify({"error": "arquivo_id, arquivo_tipo e tag_id são obrigatórios"}), 400

        svc.adicionar_ao_documento(
            arquivo_id=arquivo_id,
            tag_id=tag_id,
            arquivo_tipo=arquivo_tipo,
            confianca=confianca,
            manual=manual
        )

        return jsonify({"success": True, "message": "Tag adicionada com sucesso"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@tags_bp.route('/tags/remover', methods=['POST'])
def api_remover_tag():
    """
    Remove uma tag de um documento.

    JSON Body:
        arquivo_id: ID do arquivo (obrigatório)
        arquivo_tipo: Tipo do arquivo (obrigatório)
        tag_id: ID da tag (obrigatório)

    Returns:
        JSON com mensagem de sucesso
    """
    try:
        svc = get_tag_service()
        dados = request.json
        arquivo_id = dados.get('arquivo_id')
        arquivo_tipo = dados.get('arquivo_tipo')
        tag_id = dados.get('tag_id')

        if not arquivo_id or not arquivo_tipo or not tag_id:
            return jsonify({"error": "arquivo_id, arquivo_tipo e tag_id são obrigatórios"}), 400

        if svc.remover_do_documento(arquivo_id, tag_id):
            return jsonify({"success": True, "message": "Tag removida com sucesso"})
        else:
            return jsonify({"error": "Tag não encontrada no documento"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@tags_bp.route('/tags/sugerir', methods=['POST'])
def api_sugerir_tags():
    """
    Sugere tags automaticamente para um documento.

    JSON Body:
        arquivo_id: ID do arquivo
        arquivo_tipo: Tipo do arquivo
        nome_arquivo: Nome do arquivo (obrigatório)
        conteudo_texto: Conteúdo do documento (opcional)

    Returns:
        Lista de tags sugeridas em JSON
    """
    try:
        dados = request.json
        nome_arquivo = dados.get('nome_arquivo', '')

        if not nome_arquivo:
            return jsonify({"error": "nome_arquivo é obrigatório"}), 400

        tags_sugeridas = sugerir_tags_por_nome(nome_arquivo)
        return jsonify(tags_sugeridas)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# ROTAS DE TAGS PARA ARQUIVOS FÍSICOS
# =============================================================================

@tags_bp.route('/arquivo/tags', methods=['GET'])
def api_obter_tags_arquivo():
    """
    Retorna tags de um arquivo físico baseado no caminho.

    Query Params:
        caminho: Caminho do arquivo (obrigatório)

    Returns:
        Lista de tags do arquivo em JSON
    """
    try:
        svc = get_tag_service()
        caminho = request.args.get('caminho', '')

        if not caminho:
            return jsonify({"error": "Caminho do arquivo é obrigatório"}), 400

        # Usar hash do caminho como ID único
        arquivo_id = int(hashlib.md5(caminho.encode()).hexdigest()[:8], 16)

        tags = svc.tags_do_documento(arquivo_id)
        return jsonify([t.to_dict() for t in tags])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@tags_bp.route('/arquivo/tag/adicionar', methods=['POST'])
def api_adicionar_tag_arquivo():
    """
    Adiciona uma tag a um arquivo físico.

    JSON Body:
        caminho: Caminho do arquivo (obrigatório)
        tag_id: ID da tag (obrigatório)

    Returns:
        JSON com mensagem de sucesso
    """
    try:
        svc = get_tag_service()
        dados = request.json
        caminho = dados.get('caminho', '')
        tag_id = dados.get('tag_id')

        if not caminho or not tag_id:
            return jsonify({"error": "Caminho e tag_id são obrigatórios"}), 400

        # Usar hash do caminho como ID único
        arquivo_id = int(hashlib.md5(caminho.encode()).hexdigest()[:8], 16)

        svc.adicionar_ao_documento(
            arquivo_id=arquivo_id,
            tag_id=tag_id,
            arquivo_tipo='arquivo_fisico',
            confianca=1.0,
            manual=True
        )

        return jsonify({"success": True, "message": "Tag adicionada com sucesso"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@tags_bp.route('/arquivo/tag/remover', methods=['POST'])
def api_remover_tag_arquivo():
    """
    Remove uma tag de um arquivo físico.

    JSON Body:
        caminho: Caminho do arquivo (obrigatório)
        tag_id: ID da tag (obrigatório)

    Returns:
        JSON com mensagem de sucesso
    """
    try:
        svc = get_tag_service()
        dados = request.json
        caminho = dados.get('caminho', '')
        tag_id = dados.get('tag_id')

        if not caminho or not tag_id:
            return jsonify({"error": "Caminho e tag_id são obrigatórios"}), 400

        # Usar hash do caminho como ID único
        arquivo_id = int(hashlib.md5(caminho.encode()).hexdigest()[:8], 16)

        if svc.remover_do_documento(arquivo_id, tag_id):
            return jsonify({"success": True, "message": "Tag removida com sucesso"})
        else:
            return jsonify({"error": "Tag não encontrada no arquivo"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
