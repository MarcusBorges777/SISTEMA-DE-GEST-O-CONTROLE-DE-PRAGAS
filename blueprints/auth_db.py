# -*- coding: utf-8 -*-
"""Auth + Usuarios (db.json) — Single Source of Truth para autenticação."""
from functools import wraps
from flask import Blueprint, request, jsonify, session, current_app
from werkzeug.security import check_password_hash

auth_db_bp = Blueprint('auth_db', __name__, url_prefix='/api/auth')
usuarios_db_bp = Blueprint('usuarios_db', __name__, url_prefix='/api/usuarios')


def _db():
    return current_app.json_db_service


# ─── Decorators ───────────────────────────────────────────────────────────

def require_auth(f):
    @wraps(f)
    def w(*args, **kwargs):
        if not session.get('usuario_id'):
            return jsonify({'erro': 'Autenticação necessária'}), 401
        return f(*args, **kwargs)
    return w


def require_role(*roles):
    def deco(f):
        @wraps(f)
        def w(*args, **kwargs):
            if not session.get('usuario_id'):
                return jsonify({'erro': 'Autenticação necessária'}), 401
            user_role = session.get('usuario_role')
            if user_role not in roles:
                return jsonify({'erro': 'Acesso negado'}), 403
            return f(*args, **kwargs)
        return w
    return deco


def current_user_summary():
    """Retorna {id, nome, role} do usuário logado, ou None."""
    if not session.get('usuario_id'):
        return None
    return {
        'id': session.get('usuario_id'),
        'nome': session.get('usuario_nome'),
        'role': session.get('usuario_role'),
    }


# ─── Auth endpoints ───────────────────────────────────────────────────────

@auth_db_bp.post('/login')
def api_login():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    senha = (data.get('senha') or '').strip()
    if not email or not senha:
        return jsonify({'erro': 'Preencha email e senha'}), 400

    user = _db().get_usuario_raw_by_email(email)
    if not user or not user.get('ativo', True):
        return jsonify({'erro': 'Credenciais inválidas'}), 401

    senha_hash = user.get('senhaHash')
    if not senha_hash or not check_password_hash(senha_hash, senha):
        return jsonify({'erro': 'Credenciais inválidas'}), 401

    # Configurar sessão
    session.clear()
    session['usuario_id']   = user['id']
    session['usuario_nome'] = user['nome']
    session['usuario_email'] = user['email']
    session['usuario_role'] = user['role']
    # Compat com decorators legados que checam 'usuario_perfil'
    session['usuario_perfil'] = user['role']

    try:
        _db().registrar_ultimo_login(user['id'])
    except Exception:
        pass

    return jsonify({
        'sucesso': True,
        'usuario': {
            'id':    user['id'],
            'nome':  user['nome'],
            'email': user['email'],
            'role':  user['role'],
        },
    })


@auth_db_bp.post('/logout')
def api_logout():
    session.clear()
    return jsonify({'sucesso': True})


@auth_db_bp.get('/me')
def api_me():
    uid = session.get('usuario_id')
    if not uid:
        return jsonify({'autenticado': False}), 401
    user = _db().get_usuario_by_id(uid)
    if not user:
        session.clear()
        return jsonify({'autenticado': False}), 401
    return jsonify({
        'autenticado': True,
        'usuario': {
            'id':    user['id'],
            'nome':  user['nome'],
            'email': user['email'],
            'role':  user['role'],
        },
    })


# ─── Usuarios CRUD (admin only) ───────────────────────────────────────────

@usuarios_db_bp.get('')
@require_role('admin')
def listar_usuarios():
    return jsonify(_db().get_usuarios())


@usuarios_db_bp.post('')
@require_role('admin')
def criar_usuario():
    data = request.get_json(silent=True) or {}
    try:
        novo = _db().criar_usuario(data)
        return jsonify(novo), 201
    except ValueError as e:
        return jsonify({'erro': str(e)}), 400


@usuarios_db_bp.put('/<user_id>')
@require_role('admin')
def atualizar_usuario(user_id):
    data = request.get_json(silent=True) or {}
    try:
        atualizado = _db().atualizar_usuario(user_id, data)
        if atualizado is None:
            return jsonify({'erro': 'Usuário não encontrado'}), 404
        return jsonify(atualizado)
    except ValueError as e:
        return jsonify({'erro': str(e)}), 400


@usuarios_db_bp.delete('/<user_id>')
@require_role('admin')
def deletar_usuario(user_id):
    if user_id == session.get('usuario_id'):
        return jsonify({'erro': 'Você não pode excluir a própria conta'}), 400
    _db().deletar_usuario(user_id)
    return jsonify({'ok': True})
