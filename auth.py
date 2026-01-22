"""
Sistema de Autenticação Completo e Seguro
Implementa: Login, Registro, Recuperação de Senha, Proteção de Rotas
"""

import sqlite3
import secrets
import hashlib
import re
from datetime import datetime, timedelta
from functools import wraps
from flask import redirect, url_for, flash, request, session
from flask_login import LoginManager, UserMixin, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import URLSafeTimedSerializer

# Configurações de segurança
MAX_TENTATIVAS_LOGIN = 5
TEMPO_BLOQUEIO_MINUTOS = 15
TOKEN_EXPIRACAO_HORAS = 24

class Usuario(UserMixin):
    """Modelo de Usuário para Flask-Login"""

    def __init__(self, id, nome, email, ativo=True):
        self.id = id
        self.nome = nome
        self.email = email
        self.ativo = ativo

    def get_id(self):
        return str(self.id)

    @property
    def is_active(self):
        return self.ativo


def init_auth(app, db_path):
    """Inicializa o sistema de autenticação"""

    # Configurar Flask-Login
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'login'
    login_manager.login_message = 'Por favor, faça login para acessar esta página.'
    login_manager.login_message_category = 'info'

    # Serializer para tokens de recuperação de senha
    app.config['SECURITY_PASSWORD_SALT'] = app.config.get('SECRET_KEY', secrets.token_hex(32))

    @login_manager.user_loader
    def load_user(user_id):
        """Carrega usuário da sessão"""
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM usuarios WHERE id = ? AND ativo = 1', (user_id,))
        user_data = cursor.fetchone()
        conn.close()

        if user_data:
            return Usuario(
                id=user_data['id'],
                nome=user_data['nome'],
                email=user_data['email'],
                ativo=user_data['ativo']
            )
        return None

    # Criar tabelas se não existirem
    criar_tabelas_usuarios(db_path)

    return login_manager


def criar_tabelas_usuarios(db_path):
    """Cria as tabelas de usuários se não existirem"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Ler e executar o SQL de criação
    try:
        with open('database/create_users_table.sql', 'r', encoding='utf-8') as f:
            sql_script = f.read()
            cursor.executescript(sql_script)
        conn.commit()
        print("[OK] Tabelas de usuários criadas/verificadas")
    except Exception as e:
        print(f"[AVISO] Erro ao criar tabelas de usuários: {e}")
    finally:
        conn.close()


def validar_email(email):
    """Valida formato de email"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validar_senha(senha):
    """
    Valida força da senha
    Requisitos: mínimo 8 caracteres, 1 letra maiúscula, 1 minúscula, 1 número
    """
    if len(senha) < 8:
        return False, "A senha deve ter no mínimo 8 caracteres"

    if not re.search(r'[A-Z]', senha):
        return False, "A senha deve conter pelo menos uma letra maiúscula"

    if not re.search(r'[a-z]', senha):
        return False, "A senha deve conter pelo menos uma letra minúscula"

    if not re.search(r'\d', senha):
        return False, "A senha deve conter pelo menos um número"

    return True, "Senha válida"


def registrar_usuario(db_path, nome, email, senha):
    """Registra um novo usuário"""

    # Validações
    if not nome or len(nome) < 3:
        return False, "Nome deve ter no mínimo 3 caracteres"

    if not validar_email(email):
        return False, "Email inválido"

    valido, mensagem = validar_senha(senha)
    if not valido:
        return False, mensagem

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Verificar se email já existe
        cursor.execute('SELECT id FROM usuarios WHERE email = ?', (email.lower(),))
        if cursor.fetchone():
            return False, "Este email já está cadastrado"

        # Criar hash da senha
        senha_hash = generate_password_hash(senha, method='pbkdf2:sha256')

        # Inserir usuário
        cursor.execute('''
            INSERT INTO usuarios (nome, email, senha_hash, ativo)
            VALUES (?, ?, ?, 1)
        ''', (nome, email.lower(), senha_hash))

        user_id = cursor.lastrowid

        # Registrar log
        registrar_log_autenticacao(cursor, user_id, 'registro',
                                   request.remote_addr if request else None,
                                   request.user_agent.string if request else None,
                                   True, f"Usuário {nome} registrado com sucesso")

        conn.commit()
        return True, "Usuário cadastrado com sucesso!"

    except Exception as e:
        conn.rollback()
        return False, f"Erro ao cadastrar usuário: {str(e)}"
    finally:
        conn.close()


def fazer_login(db_path, email, senha):
    """Realiza login do usuário"""

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        # Buscar usuário
        cursor.execute('SELECT * FROM usuarios WHERE email = ?', (email.lower(),))
        user_data = cursor.fetchone()

        if not user_data:
            registrar_log_autenticacao(cursor, None, 'falha_login',
                                      request.remote_addr if request else None,
                                      request.user_agent.string if request else None,
                                      False, f"Email não encontrado: {email}")
            conn.commit()
            return False, None, "Email ou senha incorretos"

        # Verificar se está bloqueado
        if user_data['bloqueado_ate']:
            bloqueado_ate = datetime.fromisoformat(user_data['bloqueado_ate'])
            if datetime.now() < bloqueado_ate:
                tempo_restante = (bloqueado_ate - datetime.now()).seconds // 60
                return False, None, f"Conta bloqueada. Tente novamente em {tempo_restante} minutos"

        # Verificar senha
        if not check_password_hash(user_data['senha_hash'], senha):
            # Incrementar tentativas
            tentativas = user_data['tentativas_login'] + 1
            bloqueado_ate = None

            if tentativas >= MAX_TENTATIVAS_LOGIN:
                bloqueado_ate = datetime.now() + timedelta(minutes=TEMPO_BLOQUEIO_MINUTOS)
                cursor.execute('''
                    UPDATE usuarios
                    SET tentativas_login = ?, bloqueado_ate = ?
                    WHERE id = ?
                ''', (tentativas, bloqueado_ate.isoformat(), user_data['id']))

                registrar_log_autenticacao(cursor, user_data['id'], 'falha_login',
                                          request.remote_addr if request else None,
                                          request.user_agent.string if request else None,
                                          False, f"Conta bloqueada após {MAX_TENTATIVAS_LOGIN} tentativas")
                conn.commit()
                return False, None, f"Muitas tentativas incorretas. Conta bloqueada por {TEMPO_BLOQUEIO_MINUTOS} minutos"
            else:
                cursor.execute('''
                    UPDATE usuarios
                    SET tentativas_login = ?
                    WHERE id = ?
                ''', (tentativas, user_data['id']))

                registrar_log_autenticacao(cursor, user_data['id'], 'falha_login',
                                          request.remote_addr if request else None,
                                          request.user_agent.string if request else None,
                                          False, f"Senha incorreta. Tentativa {tentativas}/{MAX_TENTATIVAS_LOGIN}")
                conn.commit()
                return False, None, f"Email ou senha incorretos ({MAX_TENTATIVAS_LOGIN - tentativas} tentativas restantes)"

        # Login bem-sucedido - resetar tentativas
        cursor.execute('''
            UPDATE usuarios
            SET tentativas_login = 0, bloqueado_ate = NULL, data_ultimo_acesso = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (user_data['id'],))

        registrar_log_autenticacao(cursor, user_data['id'], 'login',
                                  request.remote_addr if request else None,
                                  request.user_agent.string if request else None,
                                  True, "Login realizado com sucesso")
        conn.commit()

        # Criar objeto usuário
        usuario = Usuario(
            id=user_data['id'],
            nome=user_data['nome'],
            email=user_data['email'],
            ativo=user_data['ativo']
        )

        return True, usuario, "Login realizado com sucesso!"

    except Exception as e:
        conn.rollback()
        return False, None, f"Erro ao fazer login: {str(e)}"
    finally:
        conn.close()


def gerar_token_reset(app, email):
    """Gera token para recuperação de senha"""
    serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])
    return serializer.dumps(email, salt=app.config['SECURITY_PASSWORD_SALT'])


def verificar_token_reset(app, token, expiracao=3600):
    """Verifica token de recuperação de senha (padrão: 1 hora)"""
    serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])
    try:
        email = serializer.loads(
            token,
            salt=app.config['SECURITY_PASSWORD_SALT'],
            max_age=expiracao
        )
        return email
    except:
        return None


def solicitar_reset_senha(db_path, app, email):
    """Cria solicitação de reset de senha"""

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Verificar se email existe
        cursor.execute('SELECT id FROM usuarios WHERE email = ?', (email.lower(),))
        user_data = cursor.fetchone()

        if not user_data:
            # Não revelar se email existe ou não (segurança)
            return True, "Se o email existir, você receberá instruções para recuperação de senha"

        # Gerar token
        token = gerar_token_reset(app, email)
        expira = datetime.now() + timedelta(hours=TOKEN_EXPIRACAO_HORAS)

        # Salvar token no banco
        cursor.execute('''
            UPDATE usuarios
            SET reset_token = ?, reset_token_expira = ?
            WHERE email = ?
        ''', (token, expira.isoformat(), email.lower()))

        registrar_log_autenticacao(cursor, user_data[0], 'reset_senha',
                                  request.remote_addr if request else None,
                                  request.user_agent.string if request else None,
                                  True, "Solicitação de reset de senha")

        conn.commit()

        # Em produção, enviar email aqui
        # send_email(email, token)

        return True, f"Token gerado: {token}\n(Em produção, este token seria enviado por email)"

    except Exception as e:
        conn.rollback()
        return False, f"Erro ao solicitar reset: {str(e)}"
    finally:
        conn.close()


def resetar_senha(db_path, app, token, nova_senha):
    """Reseta senha usando token"""

    # Verificar token
    email = verificar_token_reset(app, token, expiracao=TOKEN_EXPIRACAO_HORAS * 3600)

    if not email:
        return False, "Token inválido ou expirado"

    # Validar nova senha
    valido, mensagem = validar_senha(nova_senha)
    if not valido:
        return False, mensagem

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Verificar se token ainda é válido no banco
        cursor.execute('''
            SELECT id, reset_token_expira
            FROM usuarios
            WHERE email = ? AND reset_token = ?
        ''', (email.lower(), token))

        user_data = cursor.fetchone()

        if not user_data:
            return False, "Token inválido"

        # Atualizar senha
        senha_hash = generate_password_hash(nova_senha, method='pbkdf2:sha256')

        cursor.execute('''
            UPDATE usuarios
            SET senha_hash = ?, reset_token = NULL, reset_token_expira = NULL,
                tentativas_login = 0, bloqueado_ate = NULL
            WHERE email = ?
        ''', (senha_hash, email.lower()))

        registrar_log_autenticacao(cursor, user_data[0], 'reset_senha',
                                  request.remote_addr if request else None,
                                  request.user_agent.string if request else None,
                                  True, "Senha resetada com sucesso")

        conn.commit()
        return True, "Senha alterada com sucesso!"

    except Exception as e:
        conn.rollback()
        return False, f"Erro ao resetar senha: {str(e)}"
    finally:
        conn.close()


def registrar_log_autenticacao(cursor, usuario_id, tipo, ip_address, user_agent, sucesso, mensagem):
    """Registra log de autenticação"""
    try:
        cursor.execute('''
            INSERT INTO logs_autenticacao
            (usuario_id, tipo, ip_address, user_agent, sucesso, mensagem)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (usuario_id, tipo, ip_address, user_agent, sucesso, mensagem))
    except Exception as e:
        print(f"[AVISO] Erro ao registrar log: {e}")


def login_required(f):
    """Decorator para proteger rotas que precisam de autenticação"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            flash('Por favor, faça login para acessar esta página.', 'warning')
            return redirect(url_for('login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function


def criar_usuario_admin(db_path, nome="Administrador", email="admin@sistema.com", senha="Admin@123"):
    """Cria usuário administrador padrão (use apenas na primeira execução)"""
    sucesso, mensagem = registrar_usuario(db_path, nome, email, senha)
    if sucesso:
        print(f"[OK] Usuário admin criado: {email} / {senha}")
        print("[IMPORTANTE] Altere a senha após o primeiro login!")
    else:
        print(f"[INFO] {mensagem}")
    return sucesso
