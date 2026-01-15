#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Blueprint de Clientes - Gestão de clientes do sistema.

Rotas:
    GET  /api/clientes          - Lista clientes com filtros
    POST /api/clientes          - Cria ou atualiza cliente
    DELETE /api/clientes/<id>   - Deleta cliente
    PUT  /api/clientes/<id>/garantia - Atualiza garantia do cliente
    GET  /api/garantias/vencimentos  - Lista garantias vencendo
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, date, timedelta
import re

# Serviços ORM
from services_compat import get_cliente_service

# Blueprint
clientes_bp = Blueprint('clientes', __name__)

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

# Regex para substituição de códigos de município
MUNICIPIOS_PATTERN = re.compile('|'.join(re.escape(codigo) for codigo in MUNICIPIOS.keys()))


def converter_municipios_rapido(texto):
    """
    Converte códigos de município para nomes em uma única passagem.
    """
    if not texto:
        return texto
    return MUNICIPIOS_PATTERN.sub(lambda m: MUNICIPIOS[m.group()], str(texto))


# =============================================================================
# ROTAS DE CLIENTES
# =============================================================================

@clientes_bp.route('/clientes', methods=['GET', 'POST'])
def api_clientes():
    """
    Lista clientes (GET) ou cria/atualiza cliente (POST).

    GET Query Params:
        nome: Filtro por nome fantasia
        cidade: Filtro por cidade
        cnpj: Filtro por CNPJ
        cnae: Filtro por CNAE
        rua: Filtro por rua
        page: Número da página (opcional)
        per_page: Itens por página (default: 50, max: 200)

    POST JSON Body:
        id: ID do cliente (se atualização)
        nome_fantasia: Nome fantasia (obrigatório)
        razao_social: Razão social
        cnpj: CNPJ
        cnae: CNAE
        rua, numero, bairro, cidade, uf: Endereço
        telefone: Telefone
        data_garantia: Data da garantia
        periodo_garantia_meses: Período da garantia em meses
    """
    svc = get_cliente_service()

    if request.method == 'GET':
        # Extrai filtros da query string
        nome = request.args.get('nome', '')
        cidade = request.args.get('cidade', '')
        cnpj = request.args.get('cnpj', '')
        cnae = request.args.get('cnae', '')
        rua = request.args.get('rua', '')

        # Paginação
        page = request.args.get('page', type=int)
        per_page = request.args.get('per_page', 50, type=int)
        per_page = min(per_page, 200)  # Limite máximo de 200

        # Calcula offset e limite
        if page is not None and page > 0:
            offset = (page - 1) * per_page
            limite = per_page
        else:
            offset = 0
            limite = 500

        # Busca via ORM
        clientes, total = svc.listar(
            nome=nome or None,
            cidade=cidade or None,
            cnpj=cnpj or None,
            cnae=cnae or None,
            rua=rua or None,
            limite=limite,
            offset=offset
        )

        # Converte para dict e aplica conversão de municípios
        clientes_convertidos = []
        for cliente in clientes:
            cliente_dict = cliente.to_dict()
            if cliente_dict.get('cidade'):
                cliente_dict['cidade'] = converter_municipios_rapido(cliente_dict['cidade'])
            if cliente_dict.get('endereco_completo'):
                cliente_dict['endereco_completo'] = converter_municipios_rapido(cliente_dict['endereco_completo'])
            clientes_convertidos.append(cliente_dict)

        if page is not None and page > 0:
            return jsonify({
                "data": clientes_convertidos,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "pages": (total + per_page - 1) // per_page
                }
            })
        else:
            return jsonify(clientes_convertidos)

    # POST - Criar ou Atualizar
    dados = request.json
    nome = dados.get('nome_fantasia', '').strip()
    if not nome:
        return jsonify({"error": "Nome obrigatorio"}), 400

    try:
        cliente_id = dados.get('id')

        # Prepara dados para o serviço
        dados_cliente = {
            'nome_fantasia': nome,
            'razao_social': dados.get('razao_social'),
            'cnpj': dados.get('cnpj'),
            'cnae': dados.get('cnae'),
            'rua': dados.get('rua'),
            'numero': dados.get('numero'),
            'bairro': dados.get('bairro'),
            'cidade': dados.get('cidade'),
            'uf': dados.get('uf'),
            'telefone': dados.get('telefone'),
            'data_garantia': dados.get('data_garantia'),
            'periodo_garantia_meses': dados.get('periodo_garantia_meses', 12)
        }

        if cliente_id:
            # Atualizar via ORM
            cliente = svc.atualizar(cliente_id, dados_cliente)
            if not cliente:
                return jsonify({"error": "Cliente não encontrado"}), 404
        else:
            # Criar via ORM
            cliente = svc.criar(dados_cliente)

        return jsonify({"message": "Cliente salvo!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@clientes_bp.route('/clientes/<int:id>', methods=['DELETE'])
def deletar_cliente(id):
    """
    Deleta cliente por ID.

    Args:
        id: ID do cliente a ser deletado

    Returns:
        JSON com mensagem de sucesso ou erro
    """
    svc = get_cliente_service()
    if svc.deletar(id):
        return jsonify({"message": "Cliente excluido"})
    return jsonify({"error": "Cliente não encontrado"}), 404


@clientes_bp.route('/clientes/<int:cliente_id>/garantia', methods=['PUT'])
def atualizar_garantia(cliente_id):
    """
    Atualiza a garantia de um cliente.

    Args:
        cliente_id: ID do cliente

    JSON Body:
        data_garantia: Data da garantia (YYYY-MM-DD)
        periodo_garantia_meses: Período em meses (default: 12)

    Returns:
        JSON com dados atualizados da garantia
    """
    try:
        svc = get_cliente_service()
        dados = request.json

        cliente = svc.atualizar(cliente_id, {
            'data_garantia': dados.get('data_garantia'),
            'periodo_garantia_meses': dados.get('periodo_garantia_meses', 12)
        })

        if not cliente:
            return jsonify({"error": "Cliente não encontrado"}), 404

        # Calcula data de vencimento
        data_garantia = cliente.data_garantia
        periodo = cliente.periodo_garantia_meses or 12

        if data_garantia:
            try:
                dt = datetime.strptime(data_garantia, '%Y-%m-%d').date()
                data_vencimento = dt + timedelta(days=periodo * 30)
            except ValueError:
                data_vencimento = None
        else:
            data_vencimento = None

        return jsonify({
            "success": True,
            "cliente_id": cliente_id,
            "data_garantia": data_garantia,
            "periodo_garantia_meses": periodo,
            "data_vencimento": data_vencimento.isoformat() if data_vencimento else None
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# ROTAS DE GARANTIAS
# =============================================================================

@clientes_bp.route('/garantias/vencimentos', methods=['GET'])
def api_garantias_vencimentos():
    """
    Retorna clientes com garantia vencida ou próxima ao vencimento.

    Query Params:
        dias_antecedencia: Dias para alertar antes do vencimento (default: 30)

    Returns:
        JSON com lista de avisos de garantias
    """
    try:
        svc = get_cliente_service()
        dias_antecedencia = request.args.get('dias_antecedencia', 30, type=int)

        avisos = svc.garantias_vencendo(dias=dias_antecedencia)

        return jsonify({
            'total': len(avisos),
            'vencidas': len([a for a in avisos if a['vencida']]),
            'urgentes': len([a for a in avisos if a['status'] == 'urgente']),
            'atencao': len([a for a in avisos if a['status'] == 'atencao']),
            'avisos': avisos
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@clientes_bp.route('/garantias/vencendo', methods=['GET'])
def api_garantias_vencendo():
    """
    Retorna clientes com garantias vencendo (alias para /garantias/vencimentos).

    Query Params:
        dias: Dias para alertar antes do vencimento (default: 30)

    Returns:
        JSON com lista de avisos de garantias
    """
    try:
        svc = get_cliente_service()
        dias_aviso = request.args.get('dias', default=30, type=int)

        avisos = svc.garantias_vencendo(dias=dias_aviso)

        return jsonify({
            'total': len(avisos),
            'urgentes': len([a for a in avisos if a['status'] == 'urgente']),
            'atencao': len([a for a in avisos if a['status'] == 'atencao']),
            'vencidas': len([a for a in avisos if a['vencida']]),
            'avisos': avisos
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
