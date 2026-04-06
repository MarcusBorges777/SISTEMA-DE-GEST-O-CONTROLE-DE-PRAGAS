# -*- coding: utf-8 -*-
"""Authentication service - Login decorators."""
from functools import wraps
from flask import session, redirect, url_for, request, jsonify


def _wants_json():
    """Verifica se o cliente espera resposta JSON (React SPA)."""
    accept = request.headers.get('Accept', '')
    return 'application/json' in accept or request.path.startswith('/api/')


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'usuario_id' not in session:
            if _wants_json():
                return jsonify({'erro': 'Autenticacao necessaria', 'redirect': '/login'}), 401
            return redirect(url_for('auth.login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function


def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'usuario_id' not in session:
            if _wants_json():
                return jsonify({'erro': 'Autenticacao necessaria', 'redirect': '/login'}), 401
            return redirect(url_for('auth.login', next=request.url))
        if session.get('usuario_perfil') != 'admin':
            return jsonify({'erro': 'Acesso negado. Apenas administradores.'}), 403
        return f(*args, **kwargs)
    return decorated_function
