# -*- coding: utf-8 -*-
"""Authentication and User Management Blueprint."""
import traceback
from datetime import datetime
from flask import Blueprint, request, jsonify, session, redirect, url_for, flash, render_template
from werkzeug.security import generate_password_hash, check_password_hash
from services.database import get_db
from services.auth import login_required, admin_required

auth_bp = Blueprint('auth', __name__)


def _is_json_request():
    """Verifica se o request vem do React (JSON) ou de form tradicional."""
    accept = request.headers.get('Accept', '')
    content_type = request.headers.get('Content-Type', '')
    return 'application/json' in accept or 'application/json' in content_type


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """GET serve o SPA. POST está DESATIVADO — use /api/auth/login (db.json)."""
    if request.method == 'GET':
        if 'usuario_id' in session:
            if _is_json_request():
                return jsonify({'autenticado': True, 'redirect': '/'})
            return redirect(url_for('spa_app'))
        return render_template('app.html')

    # POST desativado — frontend deve usar /api/auth/login
    if _is_json_request():
        return jsonify({'erro': 'Use /api/auth/login'}), 410
    flash('Login antigo desativado.', 'erro')
    return render_template('app.html'), 410


@auth_bp.route('/logout')
def logout():
    session.clear()
    if _is_json_request():
        return jsonify({'sucesso': True, 'redirect': '/login'})
    return redirect(url_for('.login'))


@auth_bp.route('/reset-admin')
def reset_admin():
    """Rota de emergencia para resetar o usuario admin padrao.
    So funciona se nao existem usuarios OU se o usuario logado e admin."""
    try:
        conn = get_db()

        # Seguranca: so permite reset se nao ha usuarios ou se logado como admin
        total_usuarios = conn.execute('SELECT COUNT(*) FROM usuarios').fetchone()[0]
        if total_usuarios > 0 and session.get('usuario_perfil') != 'admin':
            flash('Acesso negado. Apenas administradores podem resetar o admin.', 'erro')
            return redirect(url_for('.login'))

        # Verificar se admin existe
        admin = conn.execute('SELECT id FROM usuarios WHERE email = ?', ('admin@sistema.com',)).fetchone()
        senha_hash = generate_password_hash('admin123', method='pbkdf2:sha256')
        if admin:
            conn.execute('UPDATE usuarios SET senha_hash = ?, ativo = 1, perfil = ? WHERE email = ?',
                         (senha_hash, 'admin', 'admin@sistema.com'))
        else:
            conn.execute('''INSERT INTO usuarios (nome, email, senha_hash, perfil)
                            VALUES (?, ?, ?, ?)''',
                         ('Administrador', 'admin@sistema.com', senha_hash, 'admin'))
        conn.commit()
        flash('Admin resetado com sucesso! Email: admin@sistema.com | Senha: admin123', 'sucesso')
    except Exception as e:
        flash(f'Erro ao resetar admin: {e}', 'erro')
    return redirect(url_for('.login'))


# ==================== API DE USUARIOS ====================

@auth_bp.route('/admin/usuarios')
@login_required
def admin_usuarios():
    return redirect(url_for('spa_app') + '?view=administracao')


@auth_bp.route('/api/usuarios', methods=['GET'])
@admin_required
def listar_usuarios():
    conn = get_db()
    usuarios = conn.execute('SELECT id, nome, email, perfil, ativo, data_criacao, ultimo_login FROM usuarios ORDER BY nome').fetchall()
    return jsonify([dict(u) for u in usuarios])


@auth_bp.route('/api/usuarios', methods=['POST'])
@admin_required
def criar_usuario():
    dados = request.json
    nome = dados.get('nome', '').strip()
    email = dados.get('email', '').strip()
    senha = dados.get('senha', '').strip()
    perfil = dados.get('perfil', 'operador')

    if not nome or not email or not senha:
        return jsonify({'erro': 'Nome, email e senha sao obrigatorios'}), 400

    if perfil not in ('admin', 'operador'):
        return jsonify({'erro': 'Perfil deve ser admin ou operador'}), 400

    conn = get_db()
    existente = conn.execute('SELECT id FROM usuarios WHERE email = ?', (email,)).fetchone()
    if existente:
        return jsonify({'erro': 'Ja existe um usuario com este email'}), 409

    conn.execute('INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?)',
                 (nome, email, generate_password_hash(senha), perfil))
    conn.commit()
    return jsonify({'sucesso': True, 'mensagem': f'Usuario {nome} criado com sucesso'})


@auth_bp.route('/api/usuarios/<int:id>', methods=['PUT'])
@admin_required
def editar_usuario(id):
    dados = request.json
    conn = get_db()

    usuario = conn.execute('SELECT * FROM usuarios WHERE id = ?', (id,)).fetchone()
    if not usuario:
        return jsonify({'erro': 'Usuario nao encontrado'}), 404

    nome = dados.get('nome', usuario['nome']).strip()
    email = dados.get('email', usuario['email']).strip()
    perfil = dados.get('perfil', usuario['perfil'])
    ativo = dados.get('ativo', usuario['ativo'])

    # Verificar email duplicado
    duplicado = conn.execute('SELECT id FROM usuarios WHERE email = ? AND id != ?', (email, id)).fetchone()
    if duplicado:
        return jsonify({'erro': 'Ja existe outro usuario com este email'}), 409

    conn.execute('UPDATE usuarios SET nome = ?, email = ?, perfil = ?, ativo = ? WHERE id = ?',
                 (nome, email, perfil, ativo, id))

    # Se senha nova foi fornecida, atualizar
    nova_senha = dados.get('senha', '').strip()
    if nova_senha:
        conn.execute('UPDATE usuarios SET senha_hash = ? WHERE id = ?',
                     (generate_password_hash(nova_senha), id))

    conn.commit()
    return jsonify({'sucesso': True, 'mensagem': f'Usuario {nome} atualizado'})


@auth_bp.route('/api/usuarios/<int:id>', methods=['DELETE'])
@admin_required
def excluir_usuario(id):
    conn = get_db()
    # Nao permitir excluir a si mesmo
    if session.get('usuario_id') == id:
        return jsonify({'erro': 'Voce nao pode excluir seu proprio usuario'}), 400

    conn.execute('DELETE FROM usuarios WHERE id = ?', (id,))
    conn.commit()
    return jsonify({'sucesso': True, 'mensagem': 'Usuario excluido'})
