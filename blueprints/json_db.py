from flask import Blueprint, request, jsonify, current_app
from blueprints.auth_db import current_user_summary

json_db_bp = Blueprint('json_db', __name__, url_prefix='/api/db')


def _db():
    return current_app.json_db_service


def _attach_audit(data: dict, is_create: bool = True) -> dict:
    """Adiciona criadoPor (na criação) e atualizadoPor (sempre) com base na sessão."""
    user = current_user_summary()
    if user:
        if is_create and 'criadoPor' not in data:
            data['criadoPor'] = user
        data['atualizadoPor'] = user
    return data


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
    is_create = not data.get('id')
    _attach_audit(data, is_create=is_create)
    entry = _db().upsert_cliente(data)
    return jsonify(entry), 201


@json_db_bp.put('/clientes/<cliente_id>')
def atualizar_cliente(cliente_id):
    data = request.get_json(force=True) or {}
    _attach_audit(data, is_create=False)
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
    is_create = not data.get('id')
    _attach_audit(data, is_create=is_create)
    entry = _db().upsert_agendamento(data)
    return jsonify(entry), 201


@json_db_bp.put('/agenda/<ag_id>')
def atualizar_agendamento(ag_id):
    data = request.get_json(force=True) or {}
    _attach_audit(data, is_create=False)
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
    _attach_audit(data, is_create=True)
    entry = _db().registrar_documento(data)
    return jsonify(entry), 201


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


# ── Contatos de Garantia ──────────────────────────────────────────────────

@json_db_bp.post('/contatos-garantia')
def registrar_contato_garantia():
    data = request.get_json(force=True) or {}
    if not data.get('laudoNumero'):
        return jsonify({'erro': 'laudoNumero obrigatório'}), 400
    user = current_user_summary()
    if user:
        data['usuario'] = user
    entry = _db().registrar_contato_garantia(data)
    return jsonify(entry), 201


@json_db_bp.get('/contatos-garantia')
def listar_contatos_garantia():
    laudo = request.args.get('laudoNumero')
    items = _db().get_contatos_garantia(laudo_numero=laudo or None)
    return jsonify(items)


@json_db_bp.delete('/contatos-garantia/<contato_id>')
def deletar_contato_garantia(contato_id):
    _db().deletar_contato_garantia(contato_id)
    return jsonify({'ok': True})


# ── Contratos (clientes recorrentes) ──────────────────────────────────────

@json_db_bp.get('/contratos')
def listar_contratos():
    ativos = request.args.get('ativos') == '1'
    return jsonify(_db().get_contratos(ativos_apenas=ativos))


@json_db_bp.get('/contratos/<contrato_id>')
def obter_contrato(contrato_id):
    contrato = _db().get_contrato_by_id(contrato_id)
    if not contrato:
        return jsonify({'erro': 'Contrato não encontrado'}), 404
    return jsonify(contrato)


@json_db_bp.post('/contratos')
def criar_contrato():
    data = request.get_json(force=True) or {}
    _attach_audit(data, is_create=True)
    try:
        entry = _db().criar_contrato(data)
        return jsonify(entry), 201
    except ValueError as e:
        return jsonify({'erro': str(e)}), 400


@json_db_bp.put('/contratos/<contrato_id>')
def atualizar_contrato(contrato_id):
    data = request.get_json(force=True) or {}
    _attach_audit(data, is_create=False)
    entry = _db().atualizar_contrato(contrato_id, data)
    if entry is None:
        return jsonify({'erro': 'Contrato não encontrado'}), 404
    return jsonify(entry)


@json_db_bp.delete('/contratos/<contrato_id>')
def deletar_contrato(contrato_id):
    _db().deletar_contrato(contrato_id)
    return jsonify({'ok': True})
