#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Blueprint de Boletos - Gestão de boletos/títulos a receber.

Rotas:
    GET  /api/boletos              - Lista boletos
    POST /api/boletos              - Cria novo boleto
    GET  /api/boletos/<id>         - Obtém boleto específico
    PUT  /api/boletos/<id>         - Atualiza boleto
    DELETE /api/boletos/<id>       - Deleta boleto
    POST /api/boletos/<id>/pagar   - Marca boleto como pago
    POST /api/boletos/<id>/cancelar - Cancela boleto
    GET  /api/boletos/vencendo     - Lista boletos vencendo
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, date, timedelta

# Serviços ORM
from services_compat import get_boleto_service

# Blueprint
boletos_bp = Blueprint('boletos', __name__)


# =============================================================================
# ROTAS DE BOLETOS
# =============================================================================

@boletos_bp.route('/boletos', methods=['GET', 'POST'])
def api_boletos():
    """
    Lista todos os boletos (GET) ou cria um novo boleto (POST).

    GET Query Params:
        status: Filtro por status (pendente, pago, cancelado)

    POST JSON Body:
        cliente_id: ID do cliente (opcional)
        cliente_nome: Nome do cliente (obrigatório)
        descricao: Descrição do boleto
        valor: Valor do boleto (obrigatório)
        data_emissao: Data de emissão (obrigatório, YYYY-MM-DD)
        data_vencimento: Data de vencimento (obrigatório, YYYY-MM-DD)
        numero_documento: Número do documento
        codigo_barras: Código de barras
        arquivo_caminho: Caminho do arquivo PDF

    Returns:
        GET: Lista de boletos em JSON
        POST: JSON com sucesso e ID do boleto criado
    """
    svc = get_boleto_service()

    if request.method == 'GET':
        try:
            status_filter = request.args.get('status', '')

            # Busca via ORM
            boletos, total = svc.listar(
                status=status_filter or None,
                limite=500
            )

            return jsonify([b.to_dict() for b in boletos])
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    elif request.method == 'POST':
        try:
            dados = request.json
            cliente_nome = dados.get('cliente_nome', '').strip()
            valor = dados.get('valor')
            data_emissao = dados.get('data_emissao')
            data_vencimento = dados.get('data_vencimento')

            if not cliente_nome or not valor or not data_emissao or not data_vencimento:
                return jsonify({"error": "Campos obrigatórios: cliente_nome, valor, data_emissao, data_vencimento"}), 400

            # Cria via ORM
            boleto = svc.criar({
                'cliente_id': dados.get('cliente_id'),
                'cliente_nome': cliente_nome,
                'descricao': dados.get('descricao', '').strip(),
                'valor': valor,
                'data_emissao': data_emissao,
                'data_vencimento': data_vencimento,
                'numero_documento': dados.get('numero_documento', '').strip(),
                'codigo_barras': dados.get('codigo_barras', '').strip(),
                'arquivo_caminho': dados.get('arquivo_caminho', '').strip()
            })

            return jsonify({
                "success": True,
                "boleto_id": boleto.id,
                "message": "Boleto criado com sucesso"
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500


@boletos_bp.route('/boletos/<int:boleto_id>', methods=['GET', 'PUT', 'DELETE'])
def api_boleto(boleto_id):
    """
    Obtém, atualiza ou deleta um boleto específico.

    Args:
        boleto_id: ID do boleto

    GET Returns:
        JSON com dados do boleto

    PUT JSON Body:
        cliente_nome: Nome do cliente
        descricao: Descrição
        valor: Valor
        data_vencimento: Data de vencimento
        numero_documento: Número do documento
        codigo_barras: Código de barras
        observacoes: Observações

    DELETE Returns:
        JSON com mensagem de sucesso
    """
    svc = get_boleto_service()

    if request.method == 'GET':
        try:
            boleto = svc.buscar_por_id(boleto_id)
            if not boleto:
                return jsonify({"error": "Boleto não encontrado"}), 404
            return jsonify(boleto.to_dict())
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    elif request.method == 'PUT':
        try:
            dados = request.json
            boleto = svc.atualizar(boleto_id, {
                'cliente_nome': dados.get('cliente_nome'),
                'descricao': dados.get('descricao'),
                'valor': dados.get('valor'),
                'data_vencimento': dados.get('data_vencimento'),
                'numero_documento': dados.get('numero_documento'),
                'codigo_barras': dados.get('codigo_barras'),
                'observacoes': dados.get('observacoes')
            })

            if not boleto:
                return jsonify({"error": "Boleto não encontrado"}), 404

            return jsonify({"success": True, "message": "Boleto atualizado com sucesso"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    elif request.method == 'DELETE':
        try:
            if svc.deletar(boleto_id):
                return jsonify({"success": True, "message": "Boleto excluído com sucesso"})
            return jsonify({"error": "Boleto não encontrado"}), 404
        except Exception as e:
            return jsonify({"error": str(e)}), 500


@boletos_bp.route('/boletos/<int:boleto_id>/pagar', methods=['POST'])
def api_pagar_boleto(boleto_id):
    """
    Marca um boleto como pago (usa o valor original do boleto).

    Args:
        boleto_id: ID do boleto

    Returns:
        JSON com dados do pagamento
    """
    try:
        svc = get_boleto_service()

        boleto = svc.registrar_pagamento(boleto_id)
        if not boleto:
            return jsonify({"error": "Boleto não encontrado"}), 404

        print(f"[BOLETO] Boleto ID {boleto_id} marcado como PAGO - Valor: R$ {boleto.valor_pago:.2f}")

        return jsonify({
            "success": True,
            "message": "Boleto marcado como pago",
            "valor_pago": boleto.valor_pago,
            "data_pagamento": boleto.data_pagamento.isoformat() if boleto.data_pagamento else None
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@boletos_bp.route('/boletos/<int:boleto_id>/cancelar', methods=['POST'])
def api_cancelar_boleto(boleto_id):
    """
    Marca um boleto como cancelado.

    Args:
        boleto_id: ID do boleto

    Returns:
        JSON com mensagem de sucesso
    """
    try:
        svc = get_boleto_service()
        boleto = svc.cancelar(boleto_id)
        if not boleto:
            return jsonify({"error": "Boleto não encontrado"}), 404
        return jsonify({"success": True, "message": "Boleto cancelado"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@boletos_bp.route('/boletos/vencendo', methods=['GET'])
def api_boletos_vencendo():
    """
    Retorna boletos que estão vencendo ou vencidos.

    Query Params:
        dias: Número de dias para considerar (default: 7)

    Returns:
        JSON com lista de boletos vencendo e estatísticas
    """
    try:
        svc = get_boleto_service()
        dias_aviso = request.args.get('dias', default=7, type=int)

        # Busca boletos vencendo via ORM
        avisos = svc.vencendo(dias=dias_aviso)

        return jsonify({
            'total': len(avisos),
            'vencidos': len([a for a in avisos if a['status_aviso'] == 'vencido']),
            'urgentes': len([a for a in avisos if a['status_aviso'] == 'urgente']),
            'boletos': avisos
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
