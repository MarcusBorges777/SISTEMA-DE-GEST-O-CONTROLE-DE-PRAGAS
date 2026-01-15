#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Blueprint de Documentos - Gestão de documentos gerados.

Rotas:
    GET  /api/documentos          - Lista documentos do banco
    GET  /api/documentos-gerados  - Lista documentos com paginação
    DELETE /api/documentos/<nome> - Deleta documento
    POST /api/documentos/renomear - Renomeia documento
    POST /api/documentos/mover    - Move documento para outra pasta
"""

from flask import Blueprint, request, jsonify, current_app
from pathlib import Path
import shutil
import traceback
import re

# Serviços ORM
from services_compat import get_documento_service

# Blueprint
documentos_bp = Blueprint('documentos', __name__)

# =============================================================================
# UTILITÁRIOS
# =============================================================================

# Mapeamento de códigos de municípios para nomes
MUNICIPIOS = {
    '4445': 'Divinópolis',
    '5300': 'Belo Horizonte',
    '4123': 'Juiz de Fora',
    '5206': 'Uberlândia',
    '4503': 'Contagem',
}

MUNICIPIOS_PATTERN = re.compile('|'.join(re.escape(codigo) for codigo in MUNICIPIOS.keys()))


def converter_municipios_rapido(texto):
    """Converte códigos de município para nomes."""
    if not texto:
        return texto
    return MUNICIPIOS_PATTERN.sub(lambda m: MUNICIPIOS[m.group()], str(texto))


def get_output_dir() -> Path:
    """Retorna diretório de saída de documentos."""
    base_dir = Path(__file__).parent.parent
    output_dir = base_dir / 'output'
    output_dir.mkdir(exist_ok=True)
    return output_dir


# =============================================================================
# ROTAS DE DOCUMENTOS
# =============================================================================

@documentos_bp.route('/documentos', methods=['GET'])
def api_documentos():
    """
    Lista todos os documentos gerados do banco de dados com informações completas.

    Query Params:
        tipo: Filtro por tipo de documento (opcional)

    Returns:
        Lista de documentos em JSON
    """
    try:
        svc = get_documento_service()
        tipo_filtro = request.args.get('tipo', '')

        # Busca via ORM
        docs, total = svc.listar(
            tipo=tipo_filtro or None,
            limite=500
        )

        documentos = []
        for doc in docs:
            valor = doc.valor_total or 0.0
            documentos.append({
                'id': doc.id,
                'tipo': doc.tipo_doc,
                'nome_arquivo': doc.nome_arquivo,
                'caminho': doc.caminho_arquivo,
                'cliente': doc.cliente_nome or 'Não informado',
                'razao_social': doc.razao_social or 'Não informado',
                'cnpj': doc.cliente_cnpj or 'Não informado',
                'valor': float(valor),
                'valor_formatado': f"R$ {float(valor):,.2f}".replace(',', '_').replace('.', ',').replace('_', '.') if valor else 'R$ 0,00',
                'data_geracao': doc.data_geracao.isoformat() if doc.data_geracao else None
            })

        return jsonify(documentos)

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@documentos_bp.route('/documentos-gerados', methods=['GET'])
def api_documentos_gerados():
    """
    Lista documentos gerados com suporte a paginação.

    Query Params:
        page: Número da página (opcional)
        per_page: Itens por página (default: 100, max: 500)

    Returns:
        Lista de documentos ou objeto com paginação
    """
    try:
        svc = get_documento_service()

        # Paginação
        page = request.args.get('page', type=int)
        per_page = request.args.get('per_page', 100, type=int)
        per_page = min(per_page, 500)  # Limite máximo

        # Calcula offset
        if page is not None and page > 0:
            offset = (page - 1) * per_page
        else:
            offset = 0
            per_page = 100

        # Busca via ORM
        docs, total = svc.listar(limite=per_page, offset=offset)

        # Converte e aplica conversão de municípios
        docs_convertidos = []
        for doc in docs:
            doc_dict = doc.to_dict()
            for campo in ['cliente_nome', 'cidade', 'endereco_completo']:
                if campo in doc_dict and doc_dict[campo]:
                    doc_dict[campo] = converter_municipios_rapido(doc_dict[campo])
            docs_convertidos.append(doc_dict)

        if page is not None and page > 0:
            return jsonify({
                "data": docs_convertidos,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "pages": (total + per_page - 1) // per_page
                }
            })
        else:
            return jsonify(docs_convertidos)

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@documentos_bp.route('/documentos/<path:nome_arquivo>', methods=['DELETE'])
def deletar_documento(nome_arquivo):
    """
    Exclui documento gerado.

    Args:
        nome_arquivo: Nome do arquivo a ser excluído

    Returns:
        JSON com mensagem de sucesso ou erro
    """
    try:
        output_dir = get_output_dir()
        caminho_arquivo = output_dir / nome_arquivo

        if not caminho_arquivo.exists():
            return jsonify({'erro': 'Arquivo não encontrado'}), 404

        # Excluir o arquivo
        caminho_arquivo.unlink()

        # Remover do banco de dados via ORM
        svc = get_documento_service()
        svc.deletar_por_nome(nome_arquivo)

        return jsonify({
            'sucesso': True,
            'mensagem': f'Arquivo {nome_arquivo} excluído com sucesso'
        })

    except Exception as e:
        print(f"[ERRO] Ao excluir documento: {e}")
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


@documentos_bp.route('/documentos/renomear', methods=['POST'])
def renomear_documento():
    """
    Renomeia documento gerado.

    JSON Body:
        nome_antigo: Nome atual do arquivo
        nome_novo: Novo nome para o arquivo

    Returns:
        JSON com mensagem de sucesso e novo nome
    """
    try:
        dados = request.get_json()
        nome_antigo = dados.get('nome_antigo')
        nome_novo = dados.get('nome_novo')

        if not nome_antigo or not nome_novo:
            return jsonify({'erro': 'Nome antigo e novo são obrigatórios'}), 400

        output_dir = get_output_dir()
        caminho_antigo = output_dir / nome_antigo
        caminho_novo = output_dir / nome_novo

        if not caminho_antigo.exists():
            return jsonify({'erro': 'Arquivo original não encontrado'}), 404

        if caminho_novo.exists():
            return jsonify({'erro': 'Já existe um arquivo com este nome'}), 400

        # Renomear o arquivo
        caminho_antigo.rename(caminho_novo)

        # Atualizar no banco de dados
        svc = get_documento_service()
        doc = svc.buscar_por_nome(nome_antigo)
        if doc:
            # Atualiza via session diretamente
            doc.nome_arquivo = nome_novo
            doc.caminho_arquivo = str(caminho_novo)
            svc.session.commit()

        return jsonify({
            'sucesso': True,
            'mensagem': f'Arquivo renomeado de {nome_antigo} para {nome_novo}',
            'nome_novo': nome_novo
        })

    except Exception as e:
        print(f"[ERRO] Ao renomear documento: {e}")
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


@documentos_bp.route('/documentos/mover', methods=['POST'])
def mover_documento():
    """
    Move documento para outra pasta.

    JSON Body:
        nome_arquivo: Nome do arquivo a mover
        pasta_destino: Caminho da pasta de destino

    Returns:
        JSON com mensagem de sucesso e novo caminho
    """
    try:
        dados = request.get_json()
        nome_arquivo = dados.get('nome_arquivo')
        pasta_destino = dados.get('pasta_destino')

        if not nome_arquivo or not pasta_destino:
            return jsonify({'erro': 'Nome do arquivo e pasta destino são obrigatórios'}), 400

        output_dir = get_output_dir()
        caminho_origem = output_dir / nome_arquivo

        if not caminho_origem.exists():
            return jsonify({'erro': 'Arquivo não encontrado'}), 404

        # Criar pasta destino se não existir
        pasta_destino_path = Path(pasta_destino)
        pasta_destino_path.mkdir(parents=True, exist_ok=True)

        caminho_destino = pasta_destino_path / nome_arquivo

        if caminho_destino.exists():
            return jsonify({'erro': 'Já existe um arquivo com este nome na pasta destino'}), 400

        # Mover o arquivo
        shutil.move(str(caminho_origem), str(caminho_destino))

        return jsonify({
            'sucesso': True,
            'mensagem': f'Arquivo {nome_arquivo} movido para {pasta_destino}',
            'caminho_novo': str(caminho_destino)
        })

    except Exception as e:
        print(f"[ERRO] Ao mover documento: {e}")
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500
