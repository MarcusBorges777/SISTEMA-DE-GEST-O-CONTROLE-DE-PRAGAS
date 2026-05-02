from flask import Blueprint, request, jsonify, current_app
from blueprints.auth_db import current_user_summary, require_role

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
@require_role('admin', 'atendimento', 'tecnico')
def listar_clientes():
    q = request.args.get('q', '').strip()
    clientes = _db().get_clientes(query=q or None)
    return jsonify(clientes)


@json_db_bp.post('/clientes')
@require_role('admin', 'atendimento')
def criar_ou_atualizar_cliente():
    data = request.get_json(force=True) or {}
    if not data.get('cnpj') and not data.get('nome'):
        return jsonify({'erro': 'cnpj ou nome obrigatório'}), 400
    is_create = not data.get('id')
    _attach_audit(data, is_create=is_create)
    entry = _db().upsert_cliente(data)
    return jsonify(entry), 201


@json_db_bp.put('/clientes/<cliente_id>')
@require_role('admin', 'atendimento')
def atualizar_cliente(cliente_id):
    data = request.get_json(force=True) or {}
    _attach_audit(data, is_create=False)
    entry = _db().update_cliente(cliente_id, data)
    if entry is None:
        return jsonify({'erro': 'Cliente não encontrado'}), 404
    return jsonify(entry)


@json_db_bp.delete('/clientes/<cliente_id>')
@require_role('admin')
def deletar_cliente(cliente_id):
    _db().delete_cliente(cliente_id)
    return jsonify({'ok': True})


@json_db_bp.get('/clientes/<cliente_id>/historico')
@require_role('admin', 'atendimento', 'tecnico')
def historico_cliente(cliente_id):
    historico = _db().get_historico_cliente(cliente_id)
    return jsonify(historico)


# ── Agenda ────────────────────────────────────────────────────────────────

@json_db_bp.get('/agenda')
@require_role('admin', 'atendimento', 'tecnico')
def listar_agenda():
    cliente_id = request.args.get('clienteId')
    items = _db().get_agenda(cliente_id=cliente_id or None)
    return jsonify(items)


@json_db_bp.post('/agenda')
@require_role('admin', 'atendimento')
def criar_agendamento():
    data = request.get_json(force=True) or {}
    is_create = not data.get('id')
    _attach_audit(data, is_create=is_create)
    entry = _db().upsert_agendamento(data)
    return jsonify(entry), 201


@json_db_bp.put('/agenda/<ag_id>')
@require_role('admin', 'atendimento')
def atualizar_agendamento(ag_id):
    data = request.get_json(force=True) or {}
    _attach_audit(data, is_create=False)
    entry = _db().update_agendamento(ag_id, data)
    if entry is None:
        return jsonify({'erro': 'Agendamento não encontrado'}), 404
    return jsonify(entry)


@json_db_bp.delete('/agenda/<ag_id>')
@require_role('admin', 'atendimento')
def deletar_agendamento(ag_id):
    _db().delete_agendamento(ag_id)
    return jsonify({'ok': True})


@json_db_bp.delete('/agenda/serie/<recorrencia_id>')
@require_role('admin', 'atendimento')
def deletar_serie(recorrencia_id):
    _db().delete_serie_recorrente(recorrencia_id)
    return jsonify({'ok': True})


# ── Documentos ────────────────────────────────────────────────────────────

@json_db_bp.get('/documentos')
@require_role('admin', 'atendimento', 'tecnico')
def listar_documentos():
    cliente_id = request.args.get('clienteId')
    tipo = request.args.get('tipo')
    docs = _db().get_documentos(cliente_id=cliente_id or None, tipo=tipo or None)
    return jsonify(docs)


@json_db_bp.post('/documentos')
@require_role('admin', 'atendimento')
def registrar_documento():
    data = request.get_json(force=True) or {}
    if not data.get('tipo'):
        return jsonify({'erro': 'tipo obrigatório'}), 400
    _attach_audit(data, is_create=True)
    entry = _db().registrar_documento(data)
    return jsonify(entry), 201


# ── Configurações ─────────────────────────────────────────────────────────

@json_db_bp.get('/config')
@require_role('admin', 'atendimento', 'tecnico')
def get_config():
    return jsonify(_db().get_configuracoes())


@json_db_bp.put('/config')
@require_role('admin')
def update_config():
    data = request.get_json(force=True) or {}
    return jsonify(_db().update_configuracoes(data))


@json_db_bp.put('/clientes/<cliente_id>/config')
@require_role('admin')
def update_cliente_config(cliente_id):
    data = request.get_json(force=True) or {}
    entry = _db().update_cliente_configuracoes(cliente_id, data)
    if entry is None:
        return jsonify({'erro': 'Cliente nÃ£o encontrado'}), 404
    return jsonify(entry)


@json_db_bp.post('/clientes/garantia-padrao')
@require_role('admin', 'atendimento')
def atualizar_garantia_cliente():
    data = request.get_json(force=True) or {}
    garantia = data.get('garantiaPadrao', data.get('garantiaMeses', None))
    if garantia is None:
        return jsonify({'erro': 'garantiaPadrao obrigatÃ³ria'}), 400
    entry = _db().atualizar_garantia_cliente(
        garantia=int(garantia or 0),
        cliente_id=data.get('clienteId') or None,
        cnpj=data.get('cnpj') or None,
    )
    if entry is None:
        return jsonify({'ok': False, 'erro': 'Cliente nÃ£o encontrado'}), 404
    return jsonify({'ok': True, 'cliente': entry})


@json_db_bp.post('/config/proximo-numero')
@require_role('admin', 'atendimento')
def proximo_numero():
    data = request.get_json(force=True) or {}
    tipo = data.get('tipo', '')
    if tipo not in ('laudo', 'orcamento', 'recibo', 'relatorio_mensal', 'relatorio_branco'):
        return jsonify({'erro': 'tipo deve ser laudo, orcamento, recibo, relatorio_mensal ou relatorio_branco'}), 400
    result = _db().resolver_config_documento(
        tipo,
        cliente_id=data.get('clienteId') or None,
        cnpj=data.get('cnpj') or None,
        incrementar=bool(data.get('incrementar')),
    )
    return jsonify({'tipo': tipo, **result})


# ── Contatos de Garantia ──────────────────────────────────────────────────

@json_db_bp.post('/contatos-garantia')
@require_role('admin', 'atendimento', 'tecnico')
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
@require_role('admin', 'atendimento', 'tecnico')
def listar_contatos_garantia():
    laudo = request.args.get('laudoNumero')
    items = _db().get_contatos_garantia(laudo_numero=laudo or None)
    return jsonify(items)


@json_db_bp.delete('/contatos-garantia/<contato_id>')
@require_role('admin')
def deletar_contato_garantia(contato_id):
    _db().deletar_contato_garantia(contato_id)
    return jsonify({'ok': True})


# ── Contratos (clientes recorrentes) ──────────────────────────────────────

@json_db_bp.get('/contratos')
@require_role('admin', 'atendimento')
def listar_contratos():
    ativos = request.args.get('ativos') == '1'
    return jsonify(_db().get_contratos(ativos_apenas=ativos))


@json_db_bp.get('/contratos/<contrato_id>')
@require_role('admin', 'atendimento')
def obter_contrato(contrato_id):
    contrato = _db().get_contrato_by_id(contrato_id)
    if not contrato:
        return jsonify({'erro': 'Contrato não encontrado'}), 404
    return jsonify(contrato)


@json_db_bp.post('/contratos')
@require_role('admin', 'atendimento')
def criar_contrato():
    data = request.get_json(force=True) or {}
    _attach_audit(data, is_create=True)
    try:
        entry = _db().criar_contrato(data)
        return jsonify(entry), 201
    except ValueError as e:
        return jsonify({'erro': str(e)}), 400


@json_db_bp.put('/contratos/<contrato_id>')
@require_role('admin', 'atendimento')
def atualizar_contrato(contrato_id):
    data = request.get_json(force=True) or {}
    _attach_audit(data, is_create=False)
    entry = _db().atualizar_contrato(contrato_id, data)
    if entry is None:
        return jsonify({'erro': 'Contrato não encontrado'}), 404
    return jsonify(entry)


@json_db_bp.delete('/contratos/<contrato_id>')
@require_role('admin')
def deletar_contrato(contrato_id):
    _db().deletar_contrato(contrato_id)
    return jsonify({'ok': True})
