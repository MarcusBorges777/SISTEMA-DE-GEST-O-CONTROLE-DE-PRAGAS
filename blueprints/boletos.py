# -*- coding: utf-8 -*-
"""Boletos (Invoice) Management Blueprint."""
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from services.database import get_db

boletos_bp = Blueprint('boletos', __name__)


def verificar_garantias_vencendo(dias_aviso=30):
    """Verifica clientes com garantia vencendo nos próximos X dias"""
    db = get_db()
    hoje = datetime.now()
    data_limite = hoje + timedelta(days=dias_aviso)

    # Buscar clientes com garantia
    clientes = db.execute('''
        SELECT id, nome_fantasia, razao_social, telefone, data_garantia,
               periodo_garantia_meses, ultima_data_servico
        FROM clientes_web
        WHERE data_garantia IS NOT NULL AND data_garantia != ''
        ORDER BY data_garantia ASC
    ''').fetchall()

    avisos = []
    for cliente in clientes:
        try:
            data_garantia = datetime.strptime(cliente['data_garantia'], '%Y-%m-%d')
            dias_restantes = (data_garantia - hoje).days

            if dias_restantes <= dias_aviso and dias_restantes >= 0:
                status = 'urgente' if dias_restantes <= 7 else 'atencao' if dias_restantes <= 15 else 'proximo'
                avisos.append({
                    'id': cliente['id'],
                    'nome': cliente['nome_fantasia'],
                    'razao_social': cliente['razao_social'],
                    'telefone': cliente['telefone'],
                    'data_garantia': cliente['data_garantia'],
                    'dias_restantes': dias_restantes,
                    'status': status,
                    'vencida': False
                })
            elif dias_restantes < 0:
                avisos.append({
                    'id': cliente['id'],
                    'nome': cliente['nome_fantasia'],
                    'razao_social': cliente['razao_social'],
                    'telefone': cliente['telefone'],
                    'data_garantia': cliente['data_garantia'],
                    'dias_restantes': dias_restantes,
                    'status': 'vencida',
                    'vencida': True
                })
        except (ValueError, TypeError):
            continue  # Data inválida ou ausente, pular cliente

    return avisos


@boletos_bp.route('/api/boletos', methods=['GET', 'POST'])
def api_boletos():
    """Lista todos os boletos (GET) ou cria um novo boleto (POST)"""
    db = get_db()

    if request.method == 'GET':
        try:
            status_filter = request.args.get('status', '')
            query = 'SELECT * FROM boletos'
            params = []

            if status_filter:
                query += ' WHERE status = ?'
                params.append(status_filter)

            query += ' ORDER BY data_vencimento ASC'

            boletos = db.execute(query, params).fetchall()
            return jsonify([dict(b) for b in boletos])
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    elif request.method == 'POST':
        try:
            dados = request.json
            cliente_id = dados.get('cliente_id')
            cliente_nome = dados.get('cliente_nome', '').strip()
            descricao = dados.get('descricao', '').strip()
            valor = dados.get('valor')
            data_emissao = dados.get('data_emissao')
            data_vencimento = dados.get('data_vencimento')
            numero_documento = dados.get('numero_documento', '').strip()
            codigo_barras = dados.get('codigo_barras', '').strip()
            arquivo_caminho = dados.get('arquivo_caminho', '').strip()

            if not cliente_nome or not valor or not data_emissao or not data_vencimento:
                return jsonify({"error": "Campos obrigatórios: cliente_nome, valor, data_emissao, data_vencimento"}), 400

            cursor = db.execute('''
                INSERT INTO boletos (cliente_id, cliente_nome, descricao, valor, data_emissao, data_vencimento,
                                   numero_documento, codigo_barras, arquivo_caminho)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (cliente_id, cliente_nome, descricao, valor, data_emissao, data_vencimento,
                  numero_documento, codigo_barras, arquivo_caminho))
            db.commit()

            return jsonify({
                "success": True,
                "boleto_id": cursor.lastrowid,
                "message": "Boleto criado com sucesso"
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500


@boletos_bp.route('/api/boletos/<int:boleto_id>', methods=['GET', 'PUT', 'DELETE'])
def api_boleto(boleto_id):
    """Obtém, atualiza ou deleta um boleto específico"""
    db = get_db()

    if request.method == 'GET':
        try:
            boleto = db.execute('SELECT * FROM boletos WHERE id = ?', (boleto_id,)).fetchone()
            if not boleto:
                return jsonify({"error": "Boleto não encontrado"}), 404
            return jsonify(dict(boleto))
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    elif request.method == 'PUT':
        try:
            dados = request.json
            cliente_nome = dados.get('cliente_nome')
            descricao = dados.get('descricao')
            valor = dados.get('valor')
            data_vencimento = dados.get('data_vencimento')
            numero_documento = dados.get('numero_documento')
            codigo_barras = dados.get('codigo_barras')
            observacoes = dados.get('observacoes')

            db.execute('''
                UPDATE boletos
                SET cliente_nome = ?, descricao = ?, valor = ?, data_vencimento = ?,
                    numero_documento = ?, codigo_barras = ?, observacoes = ?
                WHERE id = ?
            ''', (cliente_nome, descricao, valor, data_vencimento, numero_documento, codigo_barras, observacoes, boleto_id))
            db.commit()

            return jsonify({"success": True, "message": "Boleto atualizado com sucesso"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    elif request.method == 'DELETE':
        try:
            db.execute('DELETE FROM boletos WHERE id = ?', (boleto_id,))
            db.commit()
            return jsonify({"success": True, "message": "Boleto excluído com sucesso"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500


@boletos_bp.route('/api/boletos/<int:boleto_id>/pagar', methods=['POST'])
def api_pagar_boleto(boleto_id):
    """Marca um boleto como pago (usa o valor original do boleto)"""
    try:
        db = get_db()

        # Buscar o valor original do boleto
        boleto = db.execute('SELECT valor FROM boletos WHERE id = ?', (boleto_id,)).fetchone()

        if not boleto:
            return jsonify({"error": "Boleto não encontrado"}), 404

        valor_original = boleto['valor']
        data_pagamento = datetime.now().strftime('%Y-%m-%d')  # Data atual

        # Marcar como pago com o valor original
        db.execute('''
            UPDATE boletos
            SET status = 'pago', data_pagamento = ?, valor_pago = ?
            WHERE id = ?
        ''', (data_pagamento, valor_original, boleto_id))
        db.commit()

        print(f"[BOLETO] Boleto ID {boleto_id} marcado como PAGO - Valor: R$ {valor_original:.2f}")

        return jsonify({
            "success": True,
            "message": "Boleto marcado como pago",
            "valor_pago": valor_original,
            "data_pagamento": data_pagamento
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@boletos_bp.route('/api/boletos/<int:boleto_id>/cancelar', methods=['POST'])
def api_cancelar_boleto(boleto_id):
    """Marca um boleto como cancelado"""
    try:
        db = get_db()
        db.execute('UPDATE boletos SET status = ? WHERE id = ?', ('cancelado', boleto_id))
        db.commit()
        return jsonify({"success": True, "message": "Boleto cancelado"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@boletos_bp.route('/api/boletos/vencendo', methods=['GET'])
def api_boletos_vencendo():
    """Retorna boletos que estão vencendo ou vencidos"""
    try:
        db = get_db()
        hoje = datetime.now().date()
        dias_aviso = request.args.get('dias', default=7, type=int)
        data_limite = hoje + timedelta(days=dias_aviso)

        boletos = db.execute('''
            SELECT * FROM boletos
            WHERE status = 'pendente' AND date(data_vencimento) <= ?
            ORDER BY data_vencimento ASC
        ''', (data_limite.isoformat(),)).fetchall()

        avisos = []
        for b in boletos:
            data_venc = datetime.fromisoformat(b['data_vencimento']).date()
            dias_restantes = (data_venc - hoje).days

            status_aviso = 'vencido' if dias_restantes < 0 else 'urgente' if dias_restantes <= 3 else 'atenção'

            avisos.append({
                'id': b['id'],
                'cliente_nome': b['cliente_nome'],
                'descricao': b['descricao'],
                'valor': b['valor'],
                'data_vencimento': b['data_vencimento'],
                'dias_restantes': dias_restantes,
                'status_aviso': status_aviso,
                'numero_documento': b['numero_documento']
            })

        return jsonify({
            'total': len(avisos),
            'vencidos': len([a for a in avisos if a['status_aviso'] == 'vencido']),
            'urgentes': len([a for a in avisos if a['status_aviso'] == 'urgente']),
            'boletos': avisos
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== ROTA DA API PARA GARANTIAS ====================

@boletos_bp.route('/api/garantias/vencendo', methods=['GET'])
def api_garantias_vencendo():
    """Retorna clientes com garantias vencendo"""
    try:
        dias_aviso = request.args.get('dias', default=30, type=int)
        avisos = verificar_garantias_vencendo(dias_aviso)
        return jsonify({
            'total': len(avisos),
            'urgentes': len([a for a in avisos if a['status'] == 'urgente']),
            'atencao': len([a for a in avisos if a['status'] == 'atencao']),
            'vencidas': len([a for a in avisos if a['vencida']]),
            'avisos': avisos
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
