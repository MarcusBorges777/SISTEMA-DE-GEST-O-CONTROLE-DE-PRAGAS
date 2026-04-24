from flask import Blueprint, request, jsonify, current_app

json_db_bp = Blueprint('json_db', __name__, url_prefix='/api/db')


def _db():
    return current_app.json_db_service


# ── Clientes ──────────────────────────────────────────────────────────────

@json_db_bp.get('/clientes')
def listar_clientes():
    q = request.args.get('q', '').strip()
    clientes = _db().get_clientes(query=q or None)
    return jsonify(clientes)


@json_db_bp.post('/clientes')
def criar_ou_atualizar_cliente():
    data = request.get_json(force=True) or {}
    if not data.get('cnpj') and not data.get('nome'):
        return jsonify({'erro': 'cnpj ou nome obrigatório'}), 400
    entry = _db().upsert_cliente(data)
    return jsonify(entry), 201


@json_db_bp.put('/clientes/<cliente_id>')
def atualizar_cliente(cliente_id):
    data = request.get_json(force=True) or {}
    entry = _db().update_cliente(cliente_id, data)
    if entry is None:
        return jsonify({'erro': 'Cliente não encontrado'}), 404
    return jsonify(entry)


@json_db_bp.delete('/clientes/<cliente_id>')
def deletar_cliente(cliente_id):
    _db().delete_cliente(cliente_id)
    return jsonify({'ok': True})


@json_db_bp.get('/clientes/<cliente_id>/historico')
def historico_cliente(cliente_id):
    historico = _db().get_historico_cliente(cliente_id)
    return jsonify(historico)


# ── Agenda ────────────────────────────────────────────────────────────────

@json_db_bp.get('/agenda')
def listar_agenda():
    cliente_id = request.args.get('clienteId')
    items = _db().get_agenda(cliente_id=cliente_id or None)
    return jsonify(items)


@json_db_bp.post('/agenda')
def criar_agendamento():
    data = request.get_json(force=True) or {}
    entry = _db().upsert_agendamento(data)
    return jsonify(entry), 201


@json_db_bp.put('/agenda/<ag_id>')
def atualizar_agendamento(ag_id):
    data = request.get_json(force=True) or {}
    entry = _db().update_agendamento(ag_id, data)
    if entry is None:
        return jsonify({'erro': 'Agendamento não encontrado'}), 404
    return jsonify(entry)


@json_db_bp.delete('/agenda/<ag_id>')
def deletar_agendamento(ag_id):
    _db().delete_agendamento(ag_id)
    return jsonify({'ok': True})


@json_db_bp.delete('/agenda/serie/<recorrencia_id>')
def deletar_serie(recorrencia_id):
    _db().delete_serie_recorrente(recorrencia_id)
    return jsonify({'ok': True})


# ── Documentos ────────────────────────────────────────────────────────────

@json_db_bp.get('/documentos')
def listar_documentos():
    cliente_id = request.args.get('clienteId')
    tipo = request.args.get('tipo')
    docs = _db().get_documentos(cliente_id=cliente_id or None, tipo=tipo or None)
    return jsonify(docs)


@json_db_bp.post('/documentos')
def registrar_documento():
    data = request.get_json(force=True) or {}
    if not data.get('tipo'):
        return jsonify({'erro': 'tipo obrigatório'}), 400
    entry = _db().registrar_documento(data)
    return jsonify(entry), 201


@json_db_bp.delete('/documentos/por-arquivo/<path:nome_arquivo>')
def excluir_documento_por_arquivo(nome_arquivo):
    _db().delete_documento_by_filename(nome_arquivo)
    return jsonify({'ok': True})


# ── Configurações ─────────────────────────────────────────────────────────

@json_db_bp.get('/config')
def get_config():
    return jsonify(_db().get_configuracoes())


@json_db_bp.post('/config/proximo-numero')
def proximo_numero():
    data = request.get_json(force=True) or {}
    tipo = data.get('tipo', '')
    if tipo not in ('laudo', 'orcamento', 'recibo'):
        return jsonify({'erro': 'tipo deve ser laudo, orcamento ou recibo'}), 400
    numero = _db().proximo_numero(tipo)
    return jsonify({'numero': numero, 'tipo': tipo})
