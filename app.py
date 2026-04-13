#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sistema Gestao Documentos - COM LOGIN E GERENCIAMENTO DE USUARIOS
Refatorado em módulos: services/ (utilities) + blueprints/ (routes)
"""

# Imports padrão
import sqlite3
import re
import os
import json
from pathlib import Path
from datetime import datetime, date, timedelta
from collections import defaultdict
from functools import lru_cache, wraps
from time import time
import hashlib
import traceback
import shutil
import secrets

# Imports de terceiros
from dateutil.relativedelta import relativedelta

from flask import Flask, render_template, request, jsonify, send_file, g, session, redirect, url_for, flash
from werkzeug.security import generate_password_hash, check_password_hash
import pdfplumber
from werkzeug.utils import secure_filename
from google import genai
from dotenv import load_dotenv
import requests  # Para consulta de CNPJ na Receita Federal


# Módulo de categorização de CNAEs
from categorias_cnae import obter_categoria_por_cnae

# Sistema de aprendizagem de layouts
from document_learning import DocumentLayoutLearner

# Gerenciador centralizado de banco de dados
from db_manager import DatabaseManager, get_db_manager

# Validação de entrada
from validators import (
    ClienteSchema, BoletoSchema,
    ValidationError, validar_cnpj, validar_cpf,
    sanitizar_string, validate_json
)

# Autocomplete de CNPJs da Receita Federal
from autocomplete_api import AutocompleteAPI

# ==================== SERVICES (módulos compartilhados) ====================
import services.database as db_service
import services.cache as cache_service
import services.formatters as formatters_service
from services.auth import login_required, admin_required

# ==================== BLUEPRINTS ====================
from blueprints.prospeccao import prospeccao_bp
from blueprints.file_manager import file_manager_bp
from blueprints.auth import auth_bp
from blueprints.clientes import clientes_bp
from blueprints.clientes import init as clientes_init
from blueprints.tags import tags_bp
from blueprints.boletos import boletos_bp
from blueprints.admin import admin_bp
from blueprints.admin import init as admin_init
from blueprints.ia import ia_bp
from blueprints.ia import init as ia_init, init_upload_helpers as ia_init_upload_helpers

# Data Bridge - Ponte entre cnpj_filtrado e gestao_documentos
from data_bridge import criar_bridge

# Carregar variáveis de ambiente do arquivo .env
load_dotenv()

# Configurar Gemini (novo SDK google-genai)
gemini_api_key = os.environ.get("GEMINI_API_KEY")
gemini_client = None
if gemini_api_key:
    gemini_client = genai.Client(api_key=gemini_api_key)

# Configuração Flask otimizada
app = Flask(__name__)

# Registrar blueprints
app.register_blueprint(prospeccao_bp)
app.register_blueprint(file_manager_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(clientes_bp)
app.register_blueprint(tags_bp)
app.register_blueprint(boletos_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(ia_bp)

# Gerar SECRET_KEY segura e persistente
SECRET_KEY = os.environ.get('FLASK_SECRET_KEY') or os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    # Tentar carregar de arquivo para manter sessoes entre reinicializacoes
    _secret_file = Path(__file__).parent / '.secret_key'
    if _secret_file.exists():
        SECRET_KEY = _secret_file.read_text().strip()
    else:
        SECRET_KEY = secrets.token_hex(32)
        try:
            _secret_file.write_text(SECRET_KEY)
            print("[OK] SECRET_KEY gerada e salva em .secret_key")
        except Exception:
            print("[AVISO] SECRET_KEY gerada mas nao foi possivel salvar em arquivo.")

app.config.update(
    SECRET_KEY=SECRET_KEY,
    JSON_AS_ASCII=False,
    MAX_CONTENT_LENGTH=100 * 1024 * 1024,  # 100MB max upload
    SEND_FILE_MAX_AGE_DEFAULT=0,  # Desabilitar cache em dev
    SESSION_COOKIE_SECURE=os.environ.get('FLASK_ENV') == 'production',  # HTTPS em produção
    SESSION_COOKIE_HTTPONLY=True,  # Proteger contra XSS
    SESSION_COOKIE_SAMESITE='Lax',  # Proteger contra CSRF
)

# ==================== SEGURANÇA: RATE LIMITING ====================
class RateLimiter:
    """Rate limiter em memória por IP. Limita tentativas em rotas sensíveis."""
    def __init__(self):
        self._attempts = {}  # {ip: [(timestamp, endpoint), ...]}

    def _cleanup(self, ip, window):
        """Remove entradas expiradas."""
        now = time()
        if ip in self._attempts:
            self._attempts[ip] = [
                (ts, ep) for ts, ep in self._attempts[ip]
                if now - ts < window
            ]
            if not self._attempts[ip]:
                del self._attempts[ip]

    def is_limited(self, ip, endpoint, max_requests=10, window=60):
        """Verifica se IP excedeu limite. Default: 10 req/min."""
        self._cleanup(ip, window)
        attempts = self._attempts.get(ip, [])
        count = sum(1 for _, ep in attempts if ep == endpoint)
        return count >= max_requests

    def record(self, ip, endpoint):
        """Registra uma tentativa."""
        if ip not in self._attempts:
            self._attempts[ip] = []
        self._attempts[ip].append((time(), endpoint))

rate_limiter = RateLimiter()

# Rotas com rate limiting e seus limites (max_requests, window_seconds)
RATE_LIMITS = {
    'login': (5, 60),           # 5 tentativas/minuto
    'reset_admin': (3, 300),    # 3 tentativas/5 min
}

# ==================== SEGURANÇA: PROTEÇÃO GLOBAL DE ROTAS ====================
# Rotas públicas que NÃO exigem autenticação
ROTAS_PUBLICAS = {
    'login', 'logout', 'reset_admin', 'static',
}

# Rotas que exigem perfil de administrador
ROTAS_ADMIN = {
    'listar_tabelas', 'listar_registros_tabela', 'editar_registro',
    'deletar_registro', 'limpar_tabela', 'limpar_laudos',
    'config_tema', 'get_logo_mascote', 'upload_imagem_config',
    'remover_imagem_config', 'treinar_sistema', 'listar_layouts',
    'selecionar_diretorio', 'salvar_diretorios', 'testar_diretorios', 'obter_diretorios',
    'listar_usuarios', 'criar_usuario', 'editar_usuario', 'excluir_usuario',
    'admin_usuarios',
}

@app.before_request
def seguranca_global():
    """Proteção global: todas as rotas exigem login, exceto as públicas.
    Suporta endpoints de blueprints (ex: 'auth.login' → verifica 'login')."""
    endpoint = request.endpoint

    if not endpoint:
        return None

    # Extrair nome da função (suporta 'blueprint.func' e 'func')
    func_name = endpoint.split('.')[-1] if '.' in endpoint else endpoint

    # Rate limiting em rotas sensíveis
    if func_name in RATE_LIMITS and request.method == 'POST':
        ip = request.remote_addr or '127.0.0.1'
        max_req, window = RATE_LIMITS[func_name]
        if rate_limiter.is_limited(ip, func_name, max_req, window):
            if request.is_json or request.path.startswith('/api/'):
                return jsonify({'erro': 'Muitas tentativas. Tente novamente mais tarde.'}), 429
            flash('Muitas tentativas. Aguarde antes de tentar novamente.', 'erro')
            return render_template('app.html'), 429
        rate_limiter.record(ip, func_name)

    # Rotas públicas - sem autenticação
    if func_name in ROTAS_PUBLICAS:
        return None

    # Arquivos estáticos de blueprints
    if func_name == 'static':
        return None

    # Verificar se o usuário está autenticado
    if 'usuario_id' not in session:
        if request.is_json or request.path.startswith('/api/'):
            return jsonify({'erro': 'Autenticação necessária', 'redirect': '/login'}), 401
        return redirect(url_for('auth.login', next=request.url))

    # Verificar se rota é admin-only
    if func_name in ROTAS_ADMIN:
        if session.get('usuario_perfil') != 'admin':
            if request.is_json or request.path.startswith('/api/'):
                return jsonify({'erro': 'Acesso negado. Apenas administradores.'}), 403
            return redirect(url_for('spa_app'))

BASE_DIR = Path(__file__).parent
DB_PATH = BASE_DIR / 'gestao_documentos.db'
MODELOS_DIR = BASE_DIR / 'modelos'

OUTPUT_DIR = BASE_DIR / 'output'
CNAES_FILE = BASE_DIR / 'cnaes_permitidos.txt'
CONFIG_FILE = BASE_DIR / 'diretorios_config.json'
OUTPUT_DIR.mkdir(exist_ok=True)
UPLOAD_DIR = BASE_DIR / 'uploads_pdf'
UPLOAD_DIR.mkdir(exist_ok=True)
TRAINING_DIR = BASE_DIR / 'training_samples'
TRAINING_DIR.mkdir(exist_ok=True)

# ==================== INICIALIZAR SERVICES ====================
db_service.init(DB_PATH, BASE_DIR)
formatters_service.init(CNAES_FILE)
admin_init(BASE_DIR)

# Inicializar sistema de aprendizagem de layouts
layout_learner = DocumentLayoutLearner(DB_PATH, TRAINING_DIR)
layout_learner.criar_tabelas()  # Garantir que tabelas existem
print("[OK] Sistema de aprendizagem de layouts inicializado")

# Inicializar API de Autocomplete de CNPJs da Receita Federal
CNPJ_DB_PATH = BASE_DIR / 'cnpj_filtrado.db'
if CNPJ_DB_PATH.exists():
    api_cnpj = AutocompleteAPI(str(CNPJ_DB_PATH))
    print("[OK] API de autocomplete de CNPJs inicializada")
else:
    api_cnpj = None
    print("[AVISO] Banco cnpj_filtrado.db não encontrado - autocomplete de CNPJs desabilitado")

# Inicializar blueprint de clientes com api_cnpj
clientes_init(api_cnpj)

# Inicializar Data Bridge - Ponte entre cnpj_filtrado e gestao_documentos
if CNPJ_DB_PATH.exists() and CNAES_FILE.exists():
    data_bridge = criar_bridge(BASE_DIR)
    print(f"[OK] Data Bridge inicializada - {len(data_bridge.cnaes_permitidos)} CNAEs permitidos")
else:
    data_bridge = None
    print("[AVISO] Data Bridge desabilitada - cnpj_filtrado.db ou cnaes_permitidos.txt não encontrado")

# Cache de CNAEs permitidos
CNAES_PERMITIDOS = {}

# ============================================
#  OTIMIZAÇÃO: Cache de Municípios
# ============================================
# Mapeamento de códigos de municípios para nomes
MUNICIPIOS = {
    '4445': 'Divinópolis',
    '5300': 'Belo Horizonte',
    '4123': 'Juiz de Fora',
    '5206': 'Uberlândia',
    '4503': 'Contagem',
}

# Pré-compilar regex para substituição de códigos de município (50x mais rápido)
MUNICIPIOS_PATTERN = re.compile('|'.join(re.escape(codigo) for codigo in MUNICIPIOS.keys()))

def converter_municipios_rapido(texto):
    """
    Converte códigos de município para nomes em uma única passagem.
    50x mais rápido que múltiplos .replace()
    """
    if not texto:
        return texto
    return MUNICIPIOS_PATTERN.sub(lambda m: MUNICIPIOS[m.group()], str(texto))

# Regex patterns pré-compilados para otimizar extração de dados de PDFs
COMPILED_PATTERNS = {
    'data_emissao': [
        re.compile(r'Data\s+de\s+Emiss[aã]o[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})', re.IGNORECASE),
        re.compile(r'Emiss[aã]o[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})', re.IGNORECASE),
        re.compile(r'Data\s+Emiss[aã]o[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})', re.IGNORECASE),
        re.compile(r'Data[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})', re.IGNORECASE),
        re.compile(r'Competência[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})', re.IGNORECASE),
        re.compile(r'(\d{2}[\/\-]\d{2}[\/\-]\d{4})', re.IGNORECASE),
    ],
    'vencimento': [
        re.compile(r'Vencimento[:\s]+(\d{2}[\/\-]\d{2}[\/\-]\d{4})', re.IGNORECASE),
        re.compile(r'Data\s+Vencimento[:\s]+(\d{2}[\/\-]\d{2}[\/\-]\d{4})', re.IGNORECASE),
        re.compile(r'Dt\.?\s*Vencimento[:\s]+(\d{2}[\/\-]\d{2}[\/\-]\d{4})', re.IGNORECASE),
    ],
    'valor': [
        re.compile(r'Valor\s+Total[:\s]*R?\$?\s*([\d\.,]+)', re.IGNORECASE),
        re.compile(r'Total\s+da\s+Nota[:\s]*R?\$?\s*([\d\.,]+)', re.IGNORECASE),
        re.compile(r'Valor\s+L[ií]quido[:\s]*R?\$?\s*([\d\.,]+)', re.IGNORECASE),
        re.compile(r'Total\s+L[ií]quido[:\s]*R?\$?\s*([\d\.,]+)', re.IGNORECASE),
        re.compile(r'Valor\s+do\s+Documento[:\s]*R?\$?\s*([\d\.,]+)', re.IGNORECASE),
        re.compile(r'Total[:\s]*R?\$?\s*([\d\.,]+)', re.IGNORECASE),
        re.compile(r'Valor[:\s]*R?\$?\s*([\d\.,]+)', re.IGNORECASE),
        re.compile(r'R\$\s*([\d\.,]+)', re.IGNORECASE),
    ],
    'numero': [
        re.compile(r'N[úu]mero[:\s]+(\d+)', re.IGNORECASE),
        re.compile(r'Nota[:\s]+(\d+)', re.IGNORECASE),
        re.compile(r'NF[:\s-]+(\d+)', re.IGNORECASE),
        re.compile(r'Documento[:\s]+(\d+)', re.IGNORECASE),
    ],
    'cnpj': [
        re.compile(r'(?:Tomador|Cliente).*?(?:CNPJ|CPF)[:\s/]*(\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2})', re.IGNORECASE | re.DOTALL),
        re.compile(r'(\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2})', re.IGNORECASE),
    ],
    'nome': [
        re.compile(r'Nome/Razão Social[:\s]*([A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜ][A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜ\s\-\.]+?)(?:\n|CPF|CNPJ)', re.IGNORECASE | re.MULTILINE),
        re.compile(r'Tomador de Serviços[:\s]*(?:Nome/Razão Social[:\s]*)?([A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜ][A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜ\s\-\.]+?)(?:\n|CPF|CNPJ)', re.IGNORECASE | re.MULTILINE),
        re.compile(r'Tomador[:\s]+([A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜ][A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜ\s\-\.]+?)(?:\n|CNPJ|CPF)', re.IGNORECASE | re.MULTILINE),
        re.compile(r'Cliente[:\s]+([A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜ][A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜ\s\-\.]+?)(?:\n|CNPJ|CPF)', re.IGNORECASE | re.MULTILINE),
        re.compile(r'Razão Social[:\s]+([A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜ][A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜ\s\-\.]+?)(?:\n|CNPJ|CPF)', re.IGNORECASE | re.MULTILINE),
        re.compile(r'Nome[:\s]+([A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜ][A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜ\s\-\.]+?)(?:\n|CNPJ|CPF)', re.IGNORECASE | re.MULTILINE),
    ],
    'endereco': [
        re.compile(r'Endere[çc]o[:\s]*([A-Za-zÀ-ú\.]+[^\n]+?)\s*-?\s*Bairro', re.IGNORECASE | re.MULTILINE),
        re.compile(r'Endere[çc]o[:\s]*([A-Za-zÀ-ú\.]+[^\n]+?)(?:\n|Bairro|Cep|CEP)', re.IGNORECASE | re.MULTILINE),
        re.compile(r'(?:Rua|Avenida|Av\.?|Travessa|Rod\.?|Estrada)\s+([^\n]+)', re.IGNORECASE | re.MULTILINE),
        re.compile(r'Logradouro[:\s]+([^\n]+)', re.IGNORECASE | re.MULTILINE),
    ],
    'bairro': [
        re.compile(r'Bairro[:\s]*([A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜ][A-ZÀ-Úa-zà-ú\s\-\.]+?)(?:\s*-\s*)?(?:Cep|CEP|\n)', re.IGNORECASE | re.MULTILINE),
    ],
    'cep': [
        re.compile(r'Cep[:\s]*(\d{5}[-]?\d{3})', re.IGNORECASE),
        re.compile(r'CEP[:\s]*(\d{5}[-]?\d{3})', re.IGNORECASE),
        re.compile(r'(\d{8})', re.IGNORECASE),
    ],
    'tributos': {
        'iss': [
            re.compile(r'ISS[:\s]+R?\$?\s*([\d\.,]+)', re.IGNORECASE),
            re.compile(r'ISSQN[:\s]+R?\$?\s*([\d\.,]+)', re.IGNORECASE)
        ],
        'pis': [re.compile(r'PIS[:\s]+R?\$?\s*([\d\.,]+)', re.IGNORECASE)],
        'cofins': [re.compile(r'COFINS[:\s]+R?\$?\s*([\d\.,]+)', re.IGNORECASE)],
        'inss': [re.compile(r'INSS[:\s]+R?\$?\s*([\d\.,]+)', re.IGNORECASE)],
        'ir': [
            re.compile(r'IR[:\s]+R?\$?\s*([\d\.,]+)', re.IGNORECASE),
            re.compile(r'IRRF[:\s]+R?\$?\s*([\d\.,]+)', re.IGNORECASE)
        ],
        'csll': [re.compile(r'CSLL[:\s]+R?\$?\s*([\d\.,]+)', re.IGNORECASE)],
    }
}

# Inicializar blueprint de IA com dependências (após COMPILED_PATTERNS)
ia_init(UPLOAD_DIR, layout_learner, COMPILED_PATTERNS)

# Sistema de cache em memória otimizado
class SimpleCache:
    """Cache simples em memória com TTL"""
    def __init__(self, ttl=300):
        self.cache = {}
        self.ttl = ttl

    def get(self, key):
        if key in self.cache:
            value, timestamp = self.cache[key]
            if time() - timestamp < self.ttl:
                return value
            else:
                del self.cache[key]
        return None

    def set(self, key, value):
        self.cache[key] = (value, time())

    def clear(self):
        self.cache.clear()

    def invalidate(self, pattern=None):
        if pattern is None:
            self.cache.clear()
        else:
            keys_to_delete = [k for k in self.cache.keys() if pattern in k]
            for k in keys_to_delete:
                del self.cache[k]

# Instâncias de cache com diferentes TTLs
cache_api = SimpleCache(ttl=60)  # Cache de APIs - 1 minuto
cache_queries = SimpleCache(ttl=300)  # Cache de queries - 5 minutos
cache_tags = SimpleCache(ttl=600)  # Cache de tags - 10 minutos

# Regex patterns compilados (otimização)
REGEX_PATTERNS = {
    'data': re.compile(r'(\d{2}/\d{2}/\d{4})'),
    'valor_bruto': re.compile(r'Valor\s+(?:bruto|total|líquido)[^\d]*R?\$?\s*([\d\.]+,\d{2})', re.IGNORECASE),
    'valor_total': re.compile(r'TOTAL\s+R?\$?\s*([\d\.]+,\d{2})', re.IGNORECASE),
    'valor_rs': re.compile(r'R\$\s*([\d\.]+,\d{2})'),
    'cnpj': re.compile(r'CPF/CNPJ[:\s]+([\d\.\-/]+)', re.IGNORECASE),
    'razao_social': re.compile(r'Nome/Razão social:\s*([^\n]+)', re.IGNORECASE),
    'nome_fantasia': re.compile(r'Nome fantasia:\s*([^\n]+)', re.IGNORECASE),
}

def obter_nome_municipio(codigo):
    """Retorna o nome do município pelo código, ou o próprio código se não encontrar"""
    if not codigo:
        return ''
    return MUNICIPIOS.get(str(codigo), str(codigo))

TEMPLATES = {
    'laudo_padrao': MODELOS_DIR / "Laudo Completo.docx",
    'laudo_caixa': MODELOS_DIR / "Laudo Caixa D'Água.docx",
    'laudo_dedetizacao': MODELOS_DIR / "Laudo Dedetização.docx",
    'laudo_caixa_sem_assinatura': MODELOS_DIR / "Laudo Caixa (Sem Assinatura).docx",
    'laudo_ddt_caixa_sem_assinatura': MODELOS_DIR / "Laudo Completo (Sem Assinatura).docx",
    'laudo_ddt_sem_assinatura': MODELOS_DIR / "Laudo DDT (Sem Assinatura).docx",
    'recibo': MODELOS_DIR / "Recibo.docx",
    'orcamento': MODELOS_DIR / "Orçamento.docx",
}

def get_db():
    """Conexão otimizada com SQLite"""
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(
            str(DB_PATH),
            timeout=20.0,
            check_same_thread=False
        )
        db.row_factory = sqlite3.Row
        # Otimizações SQLite
        db.execute('PRAGMA journal_mode=WAL')  # Write-Ahead Logging
        db.execute('PRAGMA synchronous=NORMAL')  # Menos sync, mais rápido
        db.execute('PRAGMA cache_size=-64000')  # 64MB cache
        db.execute('PRAGMA temp_store=MEMORY')  # Temp tables em memória
        db.execute('PRAGMA mmap_size=268435456')  # 256MB memory-mapped I/O
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def tabela_existe(nome):
    return get_db().execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?", (nome,)
    ).fetchone() is not None

def adicionar_coluna_segura(db, tabela: str, coluna: str, tipo: str, default: str = None):
    """Adiciona coluna à tabela se não existir, ignorando erro se já existir"""
    try:
        sql = f'ALTER TABLE {tabela} ADD COLUMN {coluna} {tipo}'
        if default is not None:
            sql += f' DEFAULT {default}'
        db.execute(sql)
    except sqlite3.OperationalError as e:
        if 'duplicate column name' not in str(e).lower():
            print(f"[AVISO] Erro ao adicionar coluna {coluna}: {e}")

def criar_tabelas():
    db = get_db()
    db.execute('''CREATE TABLE IF NOT EXISTS clientes_web (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome_fantasia TEXT NOT NULL,
        razao_social TEXT,
        cnpj TEXT,
        cnae TEXT,
        rua TEXT,
        numero TEXT,
        bairro TEXT,
        cidade TEXT,
        uf TEXT,
        endereco_completo TEXT,
        telefone TEXT,
        ultima_data_servico TEXT,
        data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')
    db.execute('''CREATE TABLE IF NOT EXISTS documentos_gerados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo_doc TEXT,
        nome_arquivo TEXT,
        caminho_arquivo TEXT,
        valor_total REAL DEFAULT 0,
        cliente_nome TEXT,
        razao_social TEXT,
        cliente_cnpj TEXT,
        data_geracao DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')

    # Adicionar colunas se não existirem (para bancos existentes)
    adicionar_coluna_segura(db, 'documentos_gerados', 'cliente_nome', 'TEXT')
    adicionar_coluna_segura(db, 'documentos_gerados', 'razao_social', 'TEXT')
    adicionar_coluna_segura(db, 'documentos_gerados', 'cliente_cnpj', 'TEXT')

    # Adicionar campo de garantia e contato aos clientes
    adicionar_coluna_segura(db, 'clientes_web', 'email', 'TEXT')
    adicionar_coluna_segura(db, 'clientes_web', 'data_garantia', 'TEXT')
    adicionar_coluna_segura(db, 'clientes_web', 'periodo_garantia_meses', 'INTEGER', '12')

    # Criar índices para melhorar performance de queries
    db.execute('CREATE INDEX IF NOT EXISTS idx_clientes_cnpj ON clientes_web(cnpj)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes_web(nome_fantasia)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_clientes_cidade ON clientes_web(cidade)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_clientes_nome_cidade ON clientes_web(nome_fantasia, cidade)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_clientes_cnae ON clientes_web(cnae)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_documentos_tipo ON documentos_gerados(tipo_doc)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_documentos_data ON documentos_gerados(data_geracao)')
    # db.execute('CREATE INDEX IF NOT EXISTS idx_documentos_cliente ON documentos_gerados(cliente_id)')  # Coluna cliente_id não existe
    db.execute('CREATE INDEX IF NOT EXISTS idx_documentos_cliente_cnpj ON documentos_gerados(cliente_cnpj, data_geracao)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_documentos_data_tipo ON documentos_gerados(data_geracao, tipo_doc)')

    # Tabelas para sistema de tags
    db.execute('''CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        descricao TEXT,
        cor TEXT DEFAULT '#3B82F6',
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')

    db.execute('''CREATE TABLE IF NOT EXISTS documento_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        arquivo_id INTEGER,
        arquivo_tipo TEXT NOT NULL,
        tag_id INTEGER NOT NULL,
        confianca REAL DEFAULT 1.0,
        manual BOOLEAN DEFAULT 1,
        data_atribuicao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )''')

    db.execute('''CREATE TABLE IF NOT EXISTS tag_training_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        arquivo_nome TEXT,
        arquivo_conteudo TEXT,
        tag_id INTEGER NOT NULL,
        features TEXT,
        data_treinamento DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )''')

    # Índices para tags
    db.execute('CREATE INDEX IF NOT EXISTS idx_documento_tags_arquivo ON documento_tags(arquivo_id, arquivo_tipo)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_documento_tags_tag ON documento_tags(tag_id)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_training_data_tag ON tag_training_data(tag_id)')

    # Tabela para gerenciamento de boletos
    db.execute('''CREATE TABLE IF NOT EXISTS boletos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        cliente_nome TEXT NOT NULL,
        descricao TEXT,
        valor REAL NOT NULL,
        data_emissao DATE NOT NULL,
        data_vencimento DATE NOT NULL,
        numero_documento TEXT,
        codigo_barras TEXT,
        status TEXT DEFAULT 'pendente',
        data_pagamento DATE,
        valor_pago REAL,
        observacoes TEXT,
        arquivo_caminho TEXT,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes_web(id) ON DELETE SET NULL
    )''')

    # Índices para boletos
    db.execute('CREATE INDEX IF NOT EXISTS idx_boletos_cliente ON boletos(cliente_id)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_boletos_vencimento ON boletos(data_vencimento)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_boletos_status ON boletos(status)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_boletos_emissao ON boletos(data_emissao)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_boletos_cliente_vencimento ON boletos(cliente_id, data_vencimento)')

    # Tabela para gerenciamento de recibos
    db.execute('''CREATE TABLE IF NOT EXISTS recibos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        cliente_nome TEXT NOT NULL,
        numero_recibo TEXT,
        descricao TEXT,
        valor_total REAL NOT NULL,
        data_emissao DATE NOT NULL,
        forma_pagamento TEXT,
        observacoes TEXT,
        arquivo_caminho TEXT,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes_web(id) ON DELETE SET NULL
    )''')

    # Índices para recibos
    db.execute('CREATE INDEX IF NOT EXISTS idx_recibos_cliente ON recibos(cliente_id)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_recibos_emissao ON recibos(data_emissao)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_recibos_numero ON recibos(numero_recibo)')

    # Tabela de produtos quimicos (sincronizada com Laudos)
    db.execute('''CREATE TABLE IF NOT EXISTS produtos (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        grupo TEXT,
        principio TEXT,
        registro TEXT,
        concentracao TEXT,
        diluente TEXT,
        equipamento TEXT,
        antidoto TEXT,
        targets TEXT DEFAULT '[]',
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')

    # Tabela de documentos salvos como PDF pelo frontend
    db.execute('''CREATE TABLE IF NOT EXISTS documentos_salvos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome_arquivo TEXT NOT NULL,
        tipo TEXT NOT NULL,
        caminho TEXT NOT NULL,
        numero_doc TEXT,
        nome_empresa TEXT,
        data_geracao DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'ativo'
    )''')

    # Tabela de usuarios do sistema
    db.execute('''CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        senha_hash TEXT NOT NULL,
        perfil TEXT DEFAULT 'operador',
        ativo BOOLEAN DEFAULT 1,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        ultimo_login DATETIME
    )''')
    db.execute('CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email)')

    # Garantir que colunas existem (para bancos criados antes dessas colunas)
    adicionar_coluna_segura(db, 'usuarios', 'perfil', "TEXT DEFAULT 'operador'")
    adicionar_coluna_segura(db, 'usuarios', 'ativo', 'BOOLEAN DEFAULT 1')
    adicionar_coluna_segura(db, 'usuarios', 'data_criacao', 'DATETIME')
    adicionar_coluna_segura(db, 'usuarios', 'ultimo_login', 'DATETIME')

    # Criar usuario admin padrao se nao existir nenhum
    try:
        admin_existe = db.execute('SELECT COUNT(*) FROM usuarios').fetchone()[0]
        if admin_existe == 0:
            senha_hash = generate_password_hash('admin123', method='pbkdf2:sha256')
            db.execute('''INSERT INTO usuarios (nome, email, senha_hash, perfil)
                          VALUES (?, ?, ?, ?)''',
                       ('Administrador', 'admin@sistema.com', senha_hash, 'admin'))
            db.commit()
            print("[OK] Usuario admin padrao criado (admin@sistema.com / admin123)")
        else:
            print(f"[INFO] {admin_existe} usuario(s) encontrado(s) no sistema")
    except Exception as e:
        print(f"[ERRO] Falha ao criar usuario admin: {e}")
        db.rollback()

    # Inserir tags padrão se não existirem
    tags_padrao = [
        ('Laudo', 'Laudos técnicos e de serviços', '#10B981'),
        ('Recibo', 'Recibos de pagamento', '#3B82F6'),
        ('Orçamento', 'Orçamentos e propostas', '#F59E0B'),
        ('Boleto', 'Boletos bancários', '#F97316'),
        ('Contrato', 'Contratos e termos', '#8B5CF6'),
        ('Relatório', 'Relatórios diversos', '#6366F1'),
        ('Outros', 'Documentos diversos', '#6B7280')
    ]

    for nome, descricao, cor in tags_padrao:
        try:
            db.execute('INSERT OR IGNORE INTO tags (nome, descricao, cor) VALUES (?, ?, ?)',
                      (nome, descricao, cor))
        except sqlite3.IntegrityError:
            pass  # Tag já existe, ignorar

    db.commit()

def limpar_arquivos_temporarios():
    """Remove arquivos .txt temporários/desnecessários automaticamente"""
    arquivos_para_deletar = [
        'CORRECOES_APLICADAS.txt',
        'VALIDACAO_CNAE.txt',
        'RESUMO_CNAE.txt',
        'ENDERECO_COMPLETO.txt',
        'RESUMO_ENDERECO.txt',
        'GERENCIADOR_ARQUIVOS.txt',
        'RESUMO_ARQUIVOS.txt',
        'CONFIGURACAO_DIRETORIOS.txt',
        'NOVAS_VARIAVEIS_IMPLEMENTADAS.txt',
        'NOTAS_FISCAIS_E_ANALISE.txt',
        'VALORES_RECIBOS_E_LANCAMENTOS.txt',
        'teste_api_key.py',
        'teste_gemini.py',
        'teste_final.py',
        'listar_modelos.py',
        'diagnostico_completo.py',
        'corrigir_api_key.py',
        'limpar_arquivos.py',
        'testar_formatacoes.py',
        'SOLUCOES_API_KEY.md'
    ]

    for arquivo in arquivos_para_deletar:
        caminho = BASE_DIR / arquivo
        if caminho.exists():
            try:
                caminho.unlink()
            except (OSError, PermissionError) as e:
                pass  # Arquivo pode estar em uso ou sem permissão

# ==================== FUNÇÕES DE GERENCIAMENTO DE TAGS ====================

def obter_todas_tags():
    """Retorna todas as tags cadastradas (com cache)"""
    cached = cache_tags.get("all_tags")
    if cached is not None:
        return cached

    db = get_db()
    cursor = db.execute('SELECT id, nome, descricao, cor FROM tags ORDER BY nome')
    tags = []
    for row in cursor.fetchall():
        tags.append({
            'id': row[0],
            'nome': row[1],
            'descricao': row[2],
            'cor': row[3]
        })

    cache_tags.set("all_tags", tags)
    return tags

def adicionar_tag_documento(arquivo_id, arquivo_tipo, tag_id, confianca=1.0, manual=True):
    """Adiciona uma tag a um documento"""
    db = get_db()
    try:
        db.execute('''INSERT INTO documento_tags
                     (arquivo_id, arquivo_tipo, tag_id, confianca, manual)
                     VALUES (?, ?, ?, ?, ?)''',
                  (arquivo_id, arquivo_tipo, tag_id, confianca, int(manual)))
        db.commit()
        # Invalidar cache
        cache_tags.invalidate(f"tags_{arquivo_tipo}_{arquivo_id}")
        return True
    except Exception as e:
        print(f"Erro ao adicionar tag: {e}")
        return False

def remover_tag_documento(arquivo_id, arquivo_tipo, tag_id):
    """Remove uma tag de um documento"""
    db = get_db()
    try:
        db.execute('''DELETE FROM documento_tags
                     WHERE arquivo_id = ? AND arquivo_tipo = ? AND tag_id = ?''',
                  (arquivo_id, arquivo_tipo, tag_id))
        db.commit()
        # Invalidar cache
        cache_tags.invalidate(f"tags_{arquivo_tipo}_{arquivo_id}")
        return True
    except Exception as e:
        print(f"Erro ao remover tag: {e}")
        return False

def obter_tags_documento(arquivo_id, arquivo_tipo):
    """Retorna todas as tags de um documento (com cache)"""
    cache_key = f"tags_{arquivo_tipo}_{arquivo_id}"
    cached = cache_tags.get(cache_key)
    if cached is not None:
        return cached

    db = get_db()
    cursor = db.execute('''
        SELECT t.id, t.nome, t.cor, dt.confianca, dt.manual
        FROM documento_tags dt
        JOIN tags t ON dt.tag_id = t.id
        WHERE dt.arquivo_id = ? AND dt.arquivo_tipo = ?
    ''', (arquivo_id, arquivo_tipo))

    tags = []
    for row in cursor.fetchall():
        tags.append({
            'id': row[0],
            'nome': row[1],
            'cor': row[2],
            'confianca': row[3],
            'manual': bool(row[4])
        })

    cache_tags.set(cache_key, tags)
    return tags

def sugerir_tags_automaticas(arquivo_id, arquivo_tipo, nome_arquivo, conteudo_texto=''):
    """Sugere tags automaticamente baseado em análise do documento"""
    features = extrair_features_documento(nome_arquivo, conteudo_texto)
    tags_sugeridas = []

    # Mapeamento de features para tags
    mapeamento = {
        'Laudo': ['tem_laudo_nome', 'tem_laudo_conteudo'],
        'Recibo': ['tem_recibo_nome', 'tem_recibo_conteudo'],
        'Orçamento': ['tem_orcamento_nome', 'tem_orcamento_conteudo'],
        'Contrato': ['tem_contrato_nome', 'tem_contrato_conteudo'],
        'Relatório': ['tem_relatorio_nome', 'tem_relatorio_conteudo']
    }

    db = get_db()

    for tag_nome, feature_keys in mapeamento.items():
        # Verificar se alguma feature corresponde
        confianca = 0.0
        for key in feature_keys:
            if features.get(key, False):
                confianca += 0.5

        if confianca > 0:
            # Obter ID da tag
            cursor = db.execute('SELECT id FROM tags WHERE nome = ?', (tag_nome,))
            row = cursor.fetchone()
            if row:
                tags_sugeridas.append({
                    'tag_id': row[0],
                    'tag_nome': tag_nome,
                    'confianca': min(confianca, 1.0)
                })

    return tags_sugeridas

def salvar_dados_treinamento(nome_arquivo, conteudo_texto, tag_id):
    """Salva dados de treinamento para melhorar o modelo"""
    db = get_db()
    features = extrair_features_documento(nome_arquivo, conteudo_texto)
    features_json = json.dumps(features)

    try:
        db.execute('''INSERT INTO tag_training_data
                     (arquivo_nome, arquivo_conteudo, tag_id, features)
                     VALUES (?, ?, ?, ?)''',
                  (nome_arquivo, conteudo_texto[:1000], tag_id, features_json))
        db.commit()
        return True
    except Exception as e:
        print(f"Erro ao salvar dados de treinamento: {e}")
        return False
@lru_cache(maxsize=1)
def carregar_cnaes_permitidos():
    """Carrega CNAEs do arquivo com cache LRU"""
    global CNAES_PERMITIDOS

    if CNAES_PERMITIDOS:
        return CNAES_PERMITIDOS

    try:
        if not CNAES_FILE.exists():
            print(f"AVISO: Arquivo {CNAES_FILE} não encontrado")
            return {}

        # Ler arquivo inteiro de uma vez (mais rápido)
        with open(CNAES_FILE, 'r', encoding='utf-8') as f:
            linhas = f.readlines()

        # Processar com list comprehension (mais rápido)
        for linha in linhas:
            linha = linha.strip()
            if not linha or linha.startswith('#'):
                continue

            if ' - ' in linha:
                cnae_formatado = linha.split(' - ', 1)[0].strip()  # maxsplit=1 é mais rápido
                cnae_numero = cnae_formatado.translate(str.maketrans('', '', '.-'))  # Mais rápido que replace
                CNAES_PERMITIDOS[cnae_numero] = linha

        print(f"[OK] CNAEs carregados: {len(CNAES_PERMITIDOS)}")
        return CNAES_PERMITIDOS

    except Exception as e:
        print(f"[ERRO] Erro ao carregar CNAEs: {e}")
        return {}

@lru_cache(maxsize=512)
def formatar_cnae(cnae_numero):
    """
    Formata CNAE com cache LRU (otimizado)
    Entrada: "8122200" ou "81.22-2-00"
    Saída: "81.22-2-00 - Imunização..." ou formatado
    """
    if not cnae_numero:
        return None

    # Remover formatação (otimizado com translate)
    cnae_limpo = str(cnae_numero).translate(str.maketrans('', '', '.- ')).strip()

    # Buscar nos CNAEs permitidos
    cnaes = carregar_cnaes_permitidos()

    if cnae_limpo in cnaes:
        return cnaes[cnae_limpo]

    # Se não encontrar, formatar apenas o número
    if len(cnae_limpo) == 7:
        return f"{cnae_limpo[0:2]}.{cnae_limpo[2:4]}-{cnae_limpo[4]}-{cnae_limpo[5:7]}"

    return cnae_numero

def formatar_cnpj(cnpj):
    """
    Formata CNPJ no padrão xx.xxx.xxx/xxxx-xx
    Entrada: "12345678000190" ou "12.345.678/0001-90" ou qualquer formato
    Saída: "12.345.678/0001-90"
    """
    if not cnpj:
        return ''

    # Remover todos os caracteres não numéricos
    cnpj_limpo = ''.join(filter(str.isdigit, str(cnpj)))

    # Verificar se tem 14 dígitos (CNPJ válido)
    if len(cnpj_limpo) != 14:
        return cnpj  # Retorna o original se não for CNPJ válido

    # Formatar: xx.xxx.xxx/xxxx-xx
    return f"{cnpj_limpo[0:2]}.{cnpj_limpo[2:5]}.{cnpj_limpo[5:8]}/{cnpj_limpo[8:12]}-{cnpj_limpo[12:14]}"

@lru_cache(maxsize=512)
def cnae_esta_permitido(cnae_numero):
    """Verifica se CNAE está permitido (otimizado com cache)"""
    if not cnae_numero:
        return False

    cnae_limpo = str(cnae_numero).translate(str.maketrans('', '', '.- ')).strip()
    cnaes = carregar_cnaes_permitidos()
    return cnae_limpo in cnaes

def extrair_dados_pdf(caminho_arquivo):
    """
    Extrai informações de PDFs (otimizado para performance)
    Usa sistema de aprendizagem de layouts quando possível
    """
    dados = {
        'tipo_documento': 'PDF',
        'numero': None,
        'data_emissao': None,
        'valor_total': 0.0,
        'cliente_nome': None,
        'cliente_cnpj': None,
        'prestador_nome': None,
        'prestador_cnpj': None,
        'servicos': None,
        'layout_reconhecido': False  # Indica se usou layout aprendido
    }

    try:
        # ==================== TENTATIVA 1: USAR LAYOUT APRENDIDO ====================
        # Tentar identificar layout conhecido
        layout_info = layout_learner.identificar_layout(Path(caminho_arquivo))

        if layout_info and layout_info.get('regex'):
            print(f"  → Layout reconhecido: {layout_info['nome']}")
            dados['layout_reconhecido'] = True

            # Extrair texto do PDF
            with pdfplumber.open(caminho_arquivo) as pdf:
                # Extrair texto da primeira página
                texto = pdf.pages[0].extract_text() or ''

                # Usar os regex otimizados do layout aprendido
                regex_patterns = layout_info['regex']

                # Número da nota
                if 'numero_nota' in regex_patterns:
                    match = re.search(regex_patterns['numero_nota'], texto, re.IGNORECASE)
                    if match:
                        dados['numero'] = match.group(1)

                # Data de emissão
                if 'data_emissao' in regex_patterns:
                    match = re.search(regex_patterns['data_emissao'], texto, re.IGNORECASE)
                    if match:
                        data_str = match.group(1)
                        try:
                            data_obj = datetime.strptime(data_str, '%d/%m/%Y')
                            dados['data_emissao'] = data_obj.strftime('%Y-%m-%d')
                        except ValueError:
                            pass  # Formato de data não reconhecido

                # Valor total
                if 'valor_total' in regex_patterns:
                    match = re.search(regex_patterns['valor_total'], texto, re.IGNORECASE)
                    if match:
                        try:
                            valor_str = match.group(1).replace('.', '').replace(',', '.')
                            dados['valor_total'] = float(valor_str)
                        except (ValueError, AttributeError):
                            pass  # Valor não é número válido

                # CNPJ do cliente/tomador
                if 'cnpj' in regex_patterns:
                    match = re.search(regex_patterns['cnpj'], texto, re.IGNORECASE)
                    if match:
                        dados['cliente_cnpj'] = match.group(1).strip()

                # Nome do cliente/tomador
                if 'tomador_nome' in regex_patterns:
                    match = re.search(regex_patterns['tomador_nome'], texto, re.IGNORECASE)
                    if match:
                        dados['cliente_nome'] = match.group(1).strip()

                # Nome do prestador
                if 'prestador_nome' in regex_patterns:
                    match = re.search(regex_patterns['prestador_nome'], texto, re.IGNORECASE)
                    if match:
                        dados['prestador_nome'] = match.group(1).strip()

                # Discriminação/Serviços
                if 'discriminacao' in regex_patterns:
                    match = re.search(regex_patterns['discriminacao'], texto, re.IGNORECASE)
                    if match:
                        dados['servicos'] = match.group(1).strip()

                # Tipo de documento
                dados['tipo_documento'] = layout_info.get('tipo', 'PDF').upper()

            print(f"OK PDF processado (layout aprendido): {dados['numero']} - R$ {dados['valor_total']:.2f}")
            return dados

        # ==================== TENTATIVA 2: EXTRAÇÃO COM REGEX GENÉRICOS ====================
        print(f"  → Layout desconhecido - usando regex genéricos")

        with pdfplumber.open(caminho_arquivo) as pdf:
            # Limitar a 5 páginas para evitar PDFs muito grandes
            max_pages = min(len(pdf.pages), 5)

            # Extrair texto apenas das páginas necessárias
            textos = []
            for i in range(max_pages):
                texto_pagina = pdf.pages[i].extract_text()
                if texto_pagina:
                    textos.append(texto_pagina)

            texto = '\n'.join(textos)

            # 1. IDENTIFICAR TIPO
            texto_upper = texto.upper()
            if 'LAUDO' in texto_upper or 'TÉCNICO' in texto_upper:
                dados['tipo_documento'] = 'LAUDO'
            elif 'RECIBO' in texto_upper:
                dados['tipo_documento'] = 'RECIBO'
            elif 'ORÇAMENTO' in texto_upper or 'ORCAMENTO' in texto_upper:
                dados['tipo_documento'] = 'ORCAMENTO'

            # 2. EXTRAIR NÚMERO
            numero_match = re.search(r'N[°º]?\s*:?\s*(\d+)', texto)
            if numero_match:
                dados['numero'] = numero_match.group(1)

            # 3. EXTRAIR DATA (procurar múltiplas ocorrências e converter formato)
            datas_encontradas = []
            for match in REGEX_PATTERNS['data'].finditer(texto):
                data_str = match.group(1)  # formato dd/mm/yyyy
                try:
                    # Converter dd/mm/yyyy para yyyy-mm-dd
                    data_obj = datetime.strptime(data_str, '%d/%m/%Y')
                    # Validar se a data é razoável (não muito antiga, não futura)
                    hoje = datetime.now()
                    diferenca_dias = abs((data_obj - hoje).days)
                    # Aceitar datas de até 5 anos no passado ou 1 ano no futuro
                    if diferenca_dias <= (5 * 365):
                        datas_encontradas.append(data_obj)
                except ValueError:
                    continue  # Formato de data inválido

            # Usar a data mais antiga encontrada (geralmente é a data de emissão)
            if datas_encontradas:
                data_mais_antiga = min(datas_encontradas)
                dados['data_emissao'] = data_mais_antiga.strftime('%Y-%m-%d')

            # 4. EXTRAIR VALOR (otimizado)
            valores = []
            for pattern_key in ['valor_bruto', 'valor_total', 'valor_rs']:
                for match in REGEX_PATTERNS[pattern_key].finditer(texto):
                    try:
                        valor_str = match.group(1).replace('.', '').replace(',', '.')
                        valores.append(float(valor_str))
                    except (ValueError, AttributeError):
                        continue  # Valor não convertível
            if valores:
                dados['valor_total'] = max(valores)

            # 5. EXTRAIR DADOS DO CLIENTE
            match = REGEX_PATTERNS['cnpj_tomador'].search(texto)
            if match:
                dados['cliente_cnpj'] = match.group(1).strip()

            match = REGEX_PATTERNS['razao_social'].search(texto)
            if match:
                nome = match.group(1).strip()
                if len(nome) < 100:
                    dados['cliente_nome'] = nome

            # 6. EXTRAIR DADOS DO PRESTADOR
            match = REGEX_PATTERNS['cnpj_prestador'].search(texto)
            if match:
                dados['prestador_cnpj'] = match.group(1).strip()

            match = REGEX_PATTERNS['nome_fantasia'].search(texto)
            if match:
                nome = match.group(1).strip()
                if len(nome) < 100:
                    dados['prestador_nome'] = nome

            # 7. EXTRAIR SERVIÇOS
            match = REGEX_PATTERNS['discriminacao'].search(texto)
            if match:
                servicos = match.group(1).strip()
                servicos = re.sub(r'\d+,\d+', '', servicos)
                servicos = re.sub(r'\s+', ' ', servicos)
                if 10 < len(servicos) < 500:
                    dados['servicos'] = servicos

        print(f"OK PDF processado: {dados['numero']} - R$ {dados['valor_total']:.2f}")
        return dados

    except Exception as e:
        print(f"ERRO Erro ao processar PDF: {e}")
        return dados

# Inicializar helpers do blueprint IA (após definição das funções necessárias)
ia_init_upload_helpers(extrair_dados_pdf, sugerir_tags_automaticas, adicionar_tag_documento)

# login_required e admin_required importados de services/auth.py

@app.route('/')
@app.route('/dashboard')
@app.route('/clientes')
@app.route('/documentos')
@app.route('/arquivos')
@app.route('/admin')
@app.route('/prospeccao')
@login_required
def spa_app():
    """Serve o React SPA para todas as rotas do frontend"""
    return render_template('app.html')

# Redirects de rotas antigas para o SPA
@app.route('/gerador')
@app.route('/gerador/')
@login_required
def gerador_redirect():
    return redirect('/')

@app.route('/gerador/recibo')
@login_required
def gerador_recibo():
    return redirect('/documentos?tab=recibo')

@app.route('/gerador/orcamento')
@login_required
def gerador_orcamento():
    return redirect('/documentos?tab=orcamento')

@app.route('/gerador/laudo')
@login_required
def gerador_laudo():
    return redirect('/documentos?tab=laudo')

# === APIs DO DASHBOARD ===

@app.route('/api/dashboard/stats')
@login_required
def api_dashboard_stats():
    """Retorna estatisticas consolidadas para o dashboard"""
    try:
        db = get_db()
        from datetime import datetime, timedelta

        # Total de clientes
        total_clientes = db.execute('SELECT COUNT(*) FROM clientes_web').fetchone()[0]

        # Documentos gerados este mes
        primeiro_dia_mes = datetime.now().replace(day=1).strftime('%Y-%m-%d')
        docs_mes = db.execute(
            'SELECT COUNT(*) FROM documentos_gerados WHERE data_geracao >= ?',
            (primeiro_dia_mes,)
        ).fetchone()[0]

        # Receita estimada este mes
        receita_row = db.execute(
            'SELECT COALESCE(SUM(valor_total), 0) FROM documentos_gerados WHERE data_geracao >= ?',
            (primeiro_dia_mes,)
        ).fetchone()
        receita_valor = receita_row[0] if receita_row else 0
        receita_mes = f"R$ {receita_valor:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')

        # Clientes ativos (com garantia valida)
        hoje = datetime.now().strftime('%Y-%m-%d')
        clientes_ativos = db.execute(
            'SELECT COUNT(*) FROM clientes_web WHERE data_garantia >= ?',
            (hoje,)
        ).fetchone()[0]

        return jsonify({
            'total_clientes': total_clientes,
            'docs_mes': docs_mes,
            'receita_mes': receita_mes,
            'clientes_ativos': clientes_ativos,
        })
    except Exception as e:
        print(f"Erro em dashboard stats: {e}")
        return jsonify({
            'total_clientes': 0,
            'docs_mes': 0,
            'receita_mes': 'R$ 0,00',
            'clientes_ativos': 0,
        })

@app.route('/api/dashboard/atividades-recentes')
@login_required
def api_dashboard_atividades_recentes():
    """Retorna ultimas 10 atividades do sistema"""
    try:
        db = get_db()
        atividades = []

        # Ultimos documentos gerados
        docs = db.execute(
            'SELECT tipo_doc, nome_arquivo, cliente_nome, data_geracao FROM documentos_gerados ORDER BY data_geracao DESC LIMIT 8'
        ).fetchall()
        for doc in docs:
            atividades.append({
                'tipo': 'documento',
                'descricao': f'{doc[0]} - {doc[2] or "sem cliente"}',
                'arquivo': doc[1],
                'data': doc[3],
            })

        # Ultimos clientes cadastrados
        clientes = db.execute(
            'SELECT nome_fantasia, razao_social, data_cadastro FROM clientes_web ORDER BY data_cadastro DESC LIMIT 4'
        ).fetchall()
        for c in clientes:
            atividades.append({
                'tipo': 'cliente',
                'descricao': f'Cliente cadastrado: {c[0] or c[1]}',
                'data': c[2],
            })

        # Ordenar por data (mais recente primeiro)
        atividades.sort(key=lambda x: x.get('data') or '', reverse=True)

        return jsonify({'atividades': atividades[:10]})
    except Exception as e:
        print(f"Erro em atividades recentes: {e}")
        return jsonify({'atividades': []})

@app.route('/empresas')
def empresas():
    return render_template('empresas.html')

@app.route('/api/empresa/sync', methods=['POST'])
def sync_empresa_receita():
    """
    Sincroniza empresa do cnpj_filtrado.db para gestao_documentos.db

    Workflow completo:
    1. Busca empresa no cnpj_filtrado.db
    2. Valida CNAE contra cnaes_permitidos.txt
    3. Transforma dados para formato interno
    4. Insere no gestao_documentos.db (tabela clientes_web)
    5. Retorna ID do cliente para geração de documentos

    Body JSON:
        {
            "cnpj": "12345678000190",
            "validar_cnae": true  // opcional, padrão true
        }

    Resposta:
        {
            "sucesso": true,
            "cliente_id": 123,
            "mensagem": "Empresa sincronizada com sucesso",
            "dados": {...}
        }
    """
    if not data_bridge:
        return jsonify({
            'erro': 'Data Bridge não disponível',
            'detalhes': 'cnpj_filtrado.db ou cnaes_permitidos.txt não encontrado'
        }), 503

    try:
        dados = request.json
        cnpj = dados.get('cnpj', '').strip()
        validar_cnae = dados.get('validar_cnae', True)

        if not cnpj:
            return jsonify({'erro': 'CNPJ é obrigatório'}), 400

        # Limpar CNPJ (apenas dígitos)
        cnpj_limpo = re.sub(r'[^\d]', '', cnpj)

        if len(cnpj_limpo) != 14:
            return jsonify({'erro': 'CNPJ inválido (deve ter 14 dígitos)'}), 400

        # PASSO 1: Buscar empresa na Receita Federal
        print(f"[SYNC] Buscando empresa {cnpj_limpo}...")
        receita_data = data_bridge.buscar_empresa_receita(cnpj_limpo)

        if not receita_data:
            return jsonify({
                'erro': 'Empresa não encontrada',
                'detalhes': f'CNPJ {cnpj} não existe no cnpj_filtrado.db'
            }), 404

        # PASSO 2: Validar CNAE (se solicitado)
        cnae = receita_data.get('cnae_fiscal_principal', '')
        if validar_cnae and not data_bridge.validar_cnae(cnae):
            return jsonify({
                'erro': 'CNAE não permitido',
                'detalhes': f'CNAE {cnae} não está na lista de CNAEs estratégicos',
                'cnae': cnae,
                'empresa': receita_data.get('nome_fantasia') or receita_data.get('razao_social')
            }), 400

        # PASSO 3: Transformar dados
        print(f"[SYNC] Transformando dados da empresa...")
        dados_transformados = data_bridge.transform_empresa_data(receita_data)

        # PASSO 4: Inserir no gestao_documentos.db (usando tabela clientes_web)
        conn = get_db()

        # Verificar se já existe
        cliente_existente = conn.execute(
            "SELECT id FROM clientes_web WHERE cnpj = ?",
            (dados_transformados['cnpj_numerico'],)
        ).fetchone()

        if cliente_existente:
            cliente_id = cliente_existente['id']
            print(f"[SYNC] Cliente já existe (ID: {cliente_id})")
        else:
            # Inserir novo cliente
            endereco_completo = dados_transformados['endereco_completo']

            cursor = conn.execute('''
                INSERT INTO clientes_web (
                    nome_fantasia, razao_social, cnpj, cnae,
                    rua, numero, bairro, cidade, uf, endereco_completo,
                    telefone, data_garantia, periodo_garantia_meses
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                dados_transformados['nome_fantasia'],
                dados_transformados['razao_social'],
                dados_transformados['cnpj_numerico'],
                dados_transformados['cnae_numerico'],
                dados_transformados['rua'],
                dados_transformados['numero'],
                dados_transformados['bairro'],
                dados_transformados['cidade'],
                dados_transformados['uf'],
                endereco_completo,
                dados_transformados['telefone'],
                None,  # data_garantia
                12     # periodo_garantia_meses padrão
            ))

            cliente_id = cursor.lastrowid
            conn.commit()

            print(f"[SYNC] Cliente inserido (ID: {cliente_id})")

        # PASSO 5: Retornar dados completos
        return jsonify({
            'sucesso': True,
            'cliente_id': cliente_id,
            'mensagem': 'Empresa sincronizada com sucesso',
            'dados': {
                'id': cliente_id,
                'nome_fantasia': dados_transformados['nome_fantasia'],
                'razao_social': dados_transformados['razao_social'],
                'cnpj': dados_transformados['cnpj'],
                'cnae': dados_transformados['cnae'],
                'endereco': dados_transformados['endereco_completo'],
                'telefone': dados_transformados['telefone'],
                'email': dados_transformados.get('email', ''),
                'categoria_lead': dados_transformados.get('categoria_lead', 'normal'),
                'validado_cnae': dados_transformados.get('validado_por_cnae', False)
            },
            'estatisticas': data_bridge.get_estatisticas()
        })

    except Exception as e:
        print(f"[ERRO] Sync empresa: {e}")
        traceback.print_exc()
        return jsonify({
            'erro': 'Erro ao sincronizar empresa',
            'detalhes': str(e)
        }), 500

@app.route('/api/cnae/descricao/<cnae_codigo>')
def buscar_descricao_cnae(cnae_codigo):
    """
    Busca a descrição de um CNAE no arquivo cnaes_permitidos.txt

    Exemplo: /api/cnae/descricao/4711302
    Retorna: {"cnae": "47.11-3-02", "descricao": "Comércio varejista..."}
    """
    try:
        # Limpar e formatar CNAE
        cnae_limpo = re.sub(r'[^\d]', '', cnae_codigo)

        # Formatar para XX.XX-X-XX
        if len(cnae_limpo) == 7:
            cnae_formatado = f"{cnae_limpo[0:2]}.{cnae_limpo[2:4]}-{cnae_limpo[4]}-{cnae_limpo[5:7]}"
        else:
            cnae_formatado = cnae_codigo

        # Buscar no arquivo cnaes_permitidos.txt
        if not CNAES_FILE.exists():
            return jsonify({
                'erro': 'Arquivo cnaes_permitidos.txt não encontrado'
            }), 404

        with open(CNAES_FILE, 'r', encoding='utf-8') as f:
            for linha in f:
                linha = linha.strip()

                # Ignorar comentários e linhas vazias
                if not linha or linha.startswith('#'):
                    continue

                # Procurar pela linha que começa com o CNAE
                if linha.startswith(cnae_formatado):
                    # Extrair descrição (após o hífen)
                    partes = linha.split(' - ', 1)
                    if len(partes) == 2:
                        return jsonify({
                            'cnae': partes[0].strip(),
                            'descricao': partes[1].strip(),
                            'descricao_completa': f"{partes[0].strip()} - {partes[1].strip()}"
                        })

        # Se não encontrou
        return jsonify({
            'cnae': cnae_formatado,
            'descricao': 'Descrição não encontrada',
            'descricao_completa': cnae_formatado
        })

    except Exception as e:
        print(f"[ERRO] Buscar descrição CNAE: {e}")
        return jsonify({
            'erro': 'Erro ao buscar descrição do CNAE',
            'detalhes': str(e)
        }), 500

@app.route('/api/orcamentos/<int:orc_id>/rejeitar', methods=['POST'])
def rejeitar_orcamento(orc_id):
    """Rejeita um orçamento alterando seu status"""
    try:
        conn = get_db()

        # Verificar se a coluna status_aprovacao existe, se não, criar
        cursor = conn.execute("PRAGMA table_info(documentos_gerados)")
        colunas = [col[1] for col in cursor.fetchall()]

        if 'status_aprovacao' not in colunas:
            conn.execute("ALTER TABLE documentos_gerados ADD COLUMN status_aprovacao TEXT DEFAULT 'pendente'")
            conn.commit()

        # Atualizar status do orçamento
        conn.execute("""
            UPDATE documentos_gerados
            SET status_aprovacao = 'rejeitado'
            WHERE id = ? AND tipo_doc = 'ORCAMENTO'
        """, (orc_id,))
        conn.commit()

        return jsonify({
            'success': True,
            'message': 'Orçamento rejeitado com sucesso',
            'orcamento_id': orc_id
        })

    except Exception as e:
        print(f"Erro ao rejeitar orçamento: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@lru_cache(maxsize=1)
def carregar_config_diretorios():
    """Carrega configuração com cache (suporta formato antigo e novo)"""
    try:
        if CONFIG_FILE.exists():
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                config = json.load(f)

            # Se já está no formato novo, retorna direto
            if 'download' in config or 'upload' in config:
                return config

            # Converter formato antigo para novo (retrocompatibilidade)
            return {
                'download': {
                    'laudos': config.get('laudos', ''),
                    'recibos': config.get('recibos', ''),
                    'orcamentos': config.get('orcamentos', '')
                },
                'upload': {
                    'laudos': config.get('laudos', ''),
                    'recibos': config.get('recibos', ''),
                    'orcamentos': config.get('orcamentos', '')
                }
            }

        # Configuração padrão
        return {
            'download': {'laudos': '', 'recibos': '', 'orcamentos': ''},
            'upload': {'laudos': '', 'recibos': '', 'orcamentos': ''}
        }
    except Exception as e:
        print(f"[ERRO] Erro ao carregar config: {e}")
        return {
            'download': {'laudos': '', 'recibos': '', 'orcamentos': ''},
            'upload': {'laudos': '', 'recibos': '', 'orcamentos': ''}
        }

def obter_diretorio_download(tipo_doc):
    """
    Retorna o diretório de download configurado para o tipo de documento
    Se não configurado, retorna OUTPUT_DIR padrão
    tipo_doc: 'LAUDO', 'RECIBO', 'ORCAMENTO'
    """
    try:
        config_file = BASE_DIR / 'config_diretorios_duplos.json'

        # Se não houver configuração nova, usar sistema antigo
        if not config_file.exists():
            config = carregar_config_diretorios()
            download_config = config.get('download', {})

            # Mapear tipo de documento para chave de configuração
            mapa = {
                'LAUDO': 'laudos',
                'RECIBO': 'recibos',
                'ORCAMENTO': 'orcamentos'
            }

            chave = mapa.get(tipo_doc, 'laudos')
            diretorio_config = download_config.get(chave, '').strip()

            if diretorio_config:
                diretorio = Path(diretorio_config)
                diretorio.mkdir(parents=True, exist_ok=True)
                return diretorio

            return OUTPUT_DIR

        # Usar novo sistema de diretórios duplos
        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f)

        dir_principal = config.get('principal')

        if not dir_principal:
            return OUTPUT_DIR

        # Mapear tipo de documento para nome de pasta
        mapa_pastas = {
            'LAUDO': 'Laudos',
            'RECIBO': 'Recibos',
            'ORCAMENTO': 'Orcamentos',
            'BOLETO': 'Boletos'
        }

        pasta = mapa_pastas.get(tipo_doc, 'Laudos')
        diretorio = Path(dir_principal) / pasta
        diretorio.mkdir(parents=True, exist_ok=True)

        return diretorio

    except Exception as e:
        print(f"[ERRO] ao obter diretorio de download: {e}")
        return OUTPUT_DIR

@app.route('/api/config/diretorios', methods=['GET', 'POST'])
def api_config_diretorios():
    """Gerencia configuração de diretórios personalizados"""
    if request.method == 'GET':
        config = carregar_config_diretorios()
        return jsonify(config)

    if request.method == 'POST':
        try:
            dados = request.json
            with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(dados, f, indent=4, ensure_ascii=False)
            # Limpar cache após salvar
            carregar_config_diretorios.cache_clear()
            return jsonify({"message": "Configuração salva!"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

def listar_arquivos_diretorio(diretorio, tipo, origem, tag_id=None):
    """Helper otimizado para listar arquivos"""
    arquivos = []
    if not diretorio.exists() or not diretorio.is_dir():
        return arquivos

    for arquivo in diretorio.iterdir():
        if arquivo.is_file():
            stat = arquivo.stat()
            arquivo_info = {
                'nome': arquivo.name,
                'caminho': str(arquivo),
                'tamanho': stat.st_size,
                'data_modificacao': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                'extensao': arquivo.suffix,
                'tipo': tipo,
                'origem': origem
            }

            # Adicionar tag_id se configurado para aplicação automática no frontend
            if tag_id:
                arquivo_info['tag_automatica_id'] = tag_id

            arquivos.append(arquivo_info)
    return arquivos

@app.route('/api/arquivos')
def api_arquivos():
    """Lista arquivos de todos os diretórios configurados com paginação (otimizado)"""
    try:
        # Parâmetros de paginação
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)

        # Validar parâmetros
        page = max(1, page)  # Mínimo página 1
        per_page = min(max(1, per_page), 200)  # Entre 1 e 200 itens por página

        # Listar arquivos do output padrão e da pasta documentos
        arquivos = []

        # Listar da pasta documentos (onde ficam os documentos gerados)
        documentos_dir = OUTPUT_DIR / 'documentos'
        if documentos_dir.exists():
            arquivos.extend(listar_arquivos_diretorio(documentos_dir, 'documentos', 'Sistema'))

        # Também listar diretamente do OUTPUT_DIR (para compatibilidade)
        arquivos.extend(listar_arquivos_diretorio(OUTPUT_DIR, 'output', 'Sistema'))

        # Diretórios personalizados (novo formato: download/upload)
        config = carregar_config_diretorios()
        download_config = config.get('download', {})
        upload_config = config.get('upload', {})
        tags_config = config.get('tags', {})

        # Adicionar arquivos dos diretórios de DOWNLOAD (onde salvamos)
        diretorios_download = [
            (download_config.get('laudos'), 'download_laudo', 'Laudos', None),
            (download_config.get('recibos'), 'download_recibo', 'Recibos', None),
            (download_config.get('orcamentos'), 'download_orcamento', 'Orçamentos', None)
        ]

        # Adicionar arquivos dos diretórios de UPLOAD (onde lemos) COM TAGS AUTOMÁTICAS
        diretorios_upload = [
            (upload_config.get('laudos'), 'upload_laudo', 'Laudos (Upload)', tags_config.get('laudos')),
            (upload_config.get('recibos'), 'upload_recibo', 'Recibos (Upload)', tags_config.get('recibos')),
            (upload_config.get('orcamentos'), 'upload_orcamento', 'Orçamentos (Upload)', tags_config.get('orcamentos'))
        ]

        for caminho, tipo, origem, tag_id in diretorios_download + diretorios_upload:
            if caminho and caminho.strip():
                try:
                    # Converter tag_id para int se for string numérica, senão None
                    tag_id_int = None
                    if tag_id:
                        try:
                            tag_id_int = int(tag_id) if tag_id else None
                        except (ValueError, TypeError):
                            pass  # tag_id não é numérico
                    arquivos.extend(listar_arquivos_diretorio(Path(caminho), tipo, origem, tag_id_int))
                except (OSError, PermissionError):
                    pass  # Ignora diretórios inacessíveis

        # Ordenar por data de modificação (mais recente primeiro)
        arquivos.sort(key=lambda x: x['data_modificacao'], reverse=True)

        # Aplicar paginação
        total = len(arquivos)
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        arquivos_paginados = arquivos[start_idx:end_idx]

        # Calcular total de páginas
        total_pages = (total + per_page - 1) // per_page  # Arredonda para cima

        return jsonify({
            'arquivos': arquivos_paginados,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'total_pages': total_pages,
                'has_next': page < total_pages,
                'has_prev': page > 1
            }
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/sincronizar-arquivos', methods=['POST'])
def api_sincronizar_arquivos():
    """Sincroniza todos os arquivos das pastas configuradas com o banco de dados"""
    try:
        stats = {
            'total_encontrados': 0,
            'ja_existentes': 0,
            'adicionados': 0,
            'erros': 0,
            'detalhes': []
        }

        # Carregar configuração de diretórios
        config = carregar_config_diretorios()
        download_config = config.get('download', {})

        # Lista de diretórios para sincronizar
        diretorios_sync = [
            (download_config.get('laudos'), 'LAUDO'),
            (download_config.get('recibos'), 'RECIBO'),
            (download_config.get('orcamentos'), 'ORCAMENTO')
        ]

        conn = get_db()

        for caminho_dir, tipo_doc in diretorios_sync:
            if not caminho_dir or not caminho_dir.strip():
                continue

            dir_path = Path(caminho_dir)
            if not dir_path.exists() or not dir_path.is_dir():
                continue

            # Listar todos os arquivos do diretório
            for arquivo in dir_path.glob('**/*'):
                if not arquivo.is_file():
                    continue

                # Filtrar apenas arquivos suportados
                extensoes_suportadas = ['.pdf', '.docx', '.doc', '.xml']
                if arquivo.suffix.lower() not in extensoes_suportadas:
                    continue

                stats['total_encontrados'] += 1
                nome_arquivo = arquivo.name
                caminho_completo = str(arquivo.absolute())

                # Verificar se já existe no banco
                existente = conn.execute(
                    'SELECT id FROM documentos_gerados WHERE nome_arquivo = ?',
                    (nome_arquivo,)
                ).fetchone()

                if existente:
                    stats['ja_existentes'] += 1
                    continue

                # Processar novo arquivo
                try:
                    # Extrair dados baseado na extensão
                    dados_extraidos = {}

                    if arquivo.suffix.lower() == '.pdf':
                        dados_extraidos = extrair_dados_pdf(str(arquivo))
                    elif arquivo.suffix.lower() in ['.docx', '.doc']:
                        # Para arquivos Word, apenas dados básicos
                        dados_extraidos = {
                            'tipo_documento': tipo_doc,
                            'cliente_nome': '',
                            'cliente_cnpj': '',
                            'valor_total': 0.0
                        }
                    elif arquivo.suffix.lower() == '.xml':
                        dados_extraidos = extrair_dados_xml(str(arquivo))

                    # Inserir no banco
                    cursor = conn.execute('''INSERT INTO documentos_gerados
                        (tipo_doc, nome_arquivo, caminho_arquivo, cliente_nome, razao_social, cliente_cnpj, valor_total, data_geracao)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                        (
                            tipo_doc,
                            nome_arquivo,
                            caminho_completo,
                            dados_extraidos.get('cliente_nome', ''),
                            dados_extraidos.get('razao_social', ''),
                            dados_extraidos.get('cliente_cnpj', ''),
                            dados_extraidos.get('valor_total', 0.0),
                            datetime.now()
                        ))

                    documento_id = cursor.lastrowid
                    conn.commit()

                    stats['adicionados'] += 1
                    stats['detalhes'].append({
                        'arquivo': nome_arquivo,
                        'tipo': tipo_doc,
                        'status': 'adicionado',
                        'id': documento_id
                    })

                except Exception as e:
                    stats['erros'] += 1
                    stats['detalhes'].append({
                        'arquivo': nome_arquivo,
                        'tipo': tipo_doc,
                        'status': 'erro',
                        'mensagem': str(e)
                    })
                    continue

        return jsonify({
            'success': True,
            'message': f'Sincronização concluída: {stats["adicionados"]} arquivos adicionados',
            'stats': stats
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/arquivo/excluir', methods=['POST'])
def api_excluir_arquivo():
    """Exclui um arquivo do sistema"""
    try:
        dados = request.json
        caminho_arquivo = dados.get('caminho')

        if not caminho_arquivo:
            return jsonify({"error": "Caminho do arquivo não fornecido"}), 400

        arquivo_path = Path(caminho_arquivo)

        # Verificar se o arquivo existe
        if not arquivo_path.exists():
            return jsonify({"error": "Arquivo não encontrado"}), 404

        # Verificar se é um arquivo (não diretório)
        if not arquivo_path.is_file():
            return jsonify({"error": "O caminho não é um arquivo válido"}), 400

        # Deletar o arquivo
        arquivo_path.unlink()

        return jsonify({
            "message": "Arquivo excluído com sucesso!",
            "arquivo": arquivo_path.name
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Erro ao excluir arquivo: {str(e)}"}), 500

def encontrar_arquivo_em_diretorios(filename):
    """Procura arquivo em todos os diretórios configurados"""
    # Primeiro tenta no OUTPUT_DIR padrão
    caminho = OUTPUT_DIR / filename
    if caminho.exists():
        return caminho

    # Tenta em output/documentos (geração inteligente)
    caminho_docs = OUTPUT_DIR / 'documentos' / filename
    if caminho_docs.exists():
        return caminho_docs

    # Buscar em todos os diretórios configurados
    config = carregar_config_diretorios()
    download_config = config.get('download', {})
    upload_config = config.get('upload', {})

    todos_diretorios = []
    for secao in [download_config, upload_config]:
        for chave in ['laudos', 'recibos', 'orcamentos']:
            dir_config = secao.get(chave, '').strip()
            if dir_config:
                todos_diretorios.append(Path(dir_config))

    # Procurar em cada diretório
    for diretorio in todos_diretorios:
        if diretorio.exists():
            caminho = diretorio / filename
            if caminho.exists():
                return caminho

    return None

@app.route('/download/<path:filename>')
@app.route('/api/download/<path:filename>')
def download_arquivo(filename):
    """Permite download de arquivo de qualquer diretório configurado"""
    try:
        caminho_arquivo = encontrar_arquivo_em_diretorios(filename)

        if not caminho_arquivo:
            return jsonify({"error": "Arquivo não encontrado"}), 404

        return send_file(str(caminho_arquivo), as_attachment=True, download_name=filename)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/visualizar/<path:filename>')
def visualizar_arquivo(filename):
    """Permite visualizar arquivo no navegador (sem forçar download)"""
    try:
        caminho_arquivo = encontrar_arquivo_em_diretorios(filename)

        if not caminho_arquivo:
            return jsonify({"error": "Arquivo não encontrado"}), 404

        # Enviar arquivo sem forçar download (as_attachment=False)
        return send_file(str(caminho_arquivo), as_attachment=False)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/compartilhar/<path:filename>')
def compartilhar_arquivo(filename):
    """Gera link de compartilhamento"""
    try:
        caminho_arquivo = OUTPUT_DIR / filename

        if not caminho_arquivo.exists():
            return jsonify({"error": "Arquivo não encontrado"}), 404

        # Gerar link simples (em produção, use tokens temporários)
        link = f"http://localhost:5000/api/download/{filename}"

        return jsonify({
            "link": link,
            "nome": filename,
            "expira": "Link permanente"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/documentos')
def api_documentos():
    """Lista todos os documentos gerados do banco de dados com informações completas"""
    try:
        conn = get_db()

        # Buscar tipo de filtro se fornecido
        tipo_filtro = request.args.get('tipo', '')

        if tipo_filtro:
            docs = conn.execute('''
                SELECT id, tipo_doc, nome_arquivo, caminho_arquivo,
                       cliente_nome, razao_social, cliente_cnpj, valor_total,
                       data_geracao
                FROM documentos_gerados
                WHERE tipo_doc = ?
                ORDER BY data_geracao DESC
            ''', (tipo_filtro,)).fetchall()
        else:
            docs = conn.execute('''
                SELECT id, tipo_doc, nome_arquivo, caminho_arquivo,
                       cliente_nome, razao_social, cliente_cnpj, valor_total,
                       data_geracao
                FROM documentos_gerados
                ORDER BY data_geracao DESC
            ''').fetchall()

        documentos = []
        for doc in docs:
            documentos.append({
                'id': doc[0],
                'tipo': doc[1],
                'nome_arquivo': doc[2],
                'caminho': doc[3],
                'cliente': doc[4] or 'Não informado',
                'razao_social': doc[5] or 'Não informado',
                'cnpj': doc[6] or 'Não informado',
                'valor': float(doc[7]) if doc[7] else 0.0,
                'valor_formatado': f"R$ {float(doc[7]):,.2f}".replace(',', '_').replace('.', ',').replace('_', '.') if doc[7] else 'R$ 0,00',
                'data_geracao': doc[8]
            })

        return jsonify(documentos)

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/upload', methods=['POST'])
def upload_arquivo():
    try:
        if 'files[]' not in request.files:
            return jsonify({"error": "Nenhum arquivo enviado"}), 400

        files = request.files.getlist('files[]')
        tipo_documento = request.form.get('tipo_documento', 'outro')  # Pegar tipo do formulário
        respeitar_limite = request.form.get('respeitar_limite', 'false') == 'true'
        uploaded = []

        print(f"\n[UPLOAD] Tipo de documento selecionado: {tipo_documento}")
        print(f"[UPLOAD] Total de arquivos: {len(files)}")
        print(f"[UPLOAD] Respeitar limite API: {respeitar_limite}")

        for file in files:
            if file.filename == '':
                continue

            # Sanitizar nome do arquivo
            filename = file.filename.replace('/', '-').replace('\\', '-')
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            nome_final = f"{timestamp}_{filename}"

            # Mapear tipo_documento para tipo_doc
            tipo_doc_map = {
                'boleto': 'BOLETO',
                'laudo': 'LAUDO',
                'recibo': 'RECIBO',
                'orcamento': 'ORCAMENTO',
                'outro': 'UPLOAD'
            }
            tipo_doc = tipo_doc_map.get(tipo_documento, 'UPLOAD')

            # Salvar temporariamente
            temp_path = OUTPUT_DIR / 'temp' / nome_final
            temp_path.parent.mkdir(parents=True, exist_ok=True)
            file.save(str(temp_path))
            print(f"[UPLOAD] Arquivo temporário salvo: {temp_path}")
            print(f"[UPLOAD] Tipo de documento: {tipo_doc}")

            # Salvar no diretório principal configurado
            if tipo_doc != 'UPLOAD':
                print(f"[UPLOAD] Chamando salvar_upload_simples...")
                caminho = salvar_upload_simples(str(temp_path), nome_final, tipo_doc)
                if caminho:
                    print(f"[UPLOAD] Arquivo salvo em: {caminho}")
                else:
                    print(f"[UPLOAD] ERRO: salvar_upload_simples retornou None")
                    # Remover temp e continuar com próximo arquivo
                    if temp_path.exists():
                        temp_path.unlink(missing_ok=True)
                    continue
            else:
                # Para 'outro', salvar em OUTPUT_DIR
                caminho = OUTPUT_DIR / nome_final
                shutil.copy2(str(temp_path), str(caminho))
                caminho = str(caminho)
                print(f"[UPLOAD] Arquivo 'outro' salvo em: {caminho}")

            # Remover arquivo temporário
            if temp_path.exists():
                temp_path.unlink(missing_ok=True)
                print(f"[UPLOAD] Arquivo temporário removido")

            # Registrar no banco
            conn = get_db()
            cursor = conn.execute('''INSERT INTO documentos_gerados
                (tipo_doc, nome_arquivo, caminho_arquivo, data_geracao)
                VALUES (?, ?, ?, ?)''',
                (tipo_doc, filename, str(caminho), datetime.now()))
            documento_id = cursor.lastrowid
            conn.commit()

            print(f"[UPLOAD] Arquivo salvo: {filename} | ID: {documento_id} | Tipo: {tipo_doc}")

            # Aplicar tags automaticamente
            tags_sugeridas = sugerir_tags_automaticas(documento_id, 'documento', filename, '')
            for tag_sugerida in tags_sugeridas:
                adicionar_tag_documento(
                    documento_id,
                    'documento',
                    tag_sugerida['tag_id'],
                    tag_sugerida['confianca'],
                    manual=False
                )

            # PROCESSAMENTO ESPECÍFICO PARA BOLETOS (função dedicada)
            if tipo_documento == 'boleto':
                print(f"[UPLOAD] Iniciando processamento de BOLETO...")
                try:
                    dados_boleto = processar_boleto(str(caminho), filename, documento_id)
                    if dados_boleto:
                        print(f"[UPLOAD] OKOK Boleto processado com sucesso!")
                    else:
                        print(f"[UPLOAD] AVISO Falha ao processar boleto (não é um boleto válido)")
                except Exception as e:
                    print(f"[UPLOAD] ERRO Erro ao processar boleto: {e}")
                    traceback.print_exc()

            uploaded.append({
                'nome': filename,
                'caminho': str(caminho),
                'tamanho': Path(caminho).stat().st_size
            })

        return jsonify({
            "message": f"{len(uploaded)} arquivo(s) enviado(s)",
            "files": uploaded
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

def extrair_valor_pdf(caminho_arquivo):
    """Tenta extrair valor de PDF"""
    dados = extrair_dados_pdf(caminho_arquivo)
    return dados['valor_total']

@app.route('/api/empresas')
def api_empresas():
    if not tabela_existe('empresas'):
        return jsonify([])

    nome = request.args.get('nome', '')
    cnpj = request.args.get('cnpj', '')

    query = """SELECT
        cnpj_completo as cnpj,
        nome_fantasia,
        nome_fantasia as razao_social,
        cnae_fiscal_principal,
        tipo_logradouro,
        logradouro,
        numero,
        bairro,
        cep,
        uf,
        codigo_municipio as municipio
        FROM empresas
        WHERE situacao_cadastral = '02'"""
    params = []

    if nome:
        query += " AND nome_fantasia LIKE ?"
        params.append(f'%{nome}%')

    if cnpj:
        query += " AND cnpj_completo LIKE ?"
        params.append(f'%{cnpj}%')

    query += " ORDER BY nome_fantasia LIMIT 50"

    empresas = get_db().execute(query, params).fetchall()

    # Processar cada empresa para formatar CNAE e verificar se está permitido
    resultado = []
    for row in empresas:
        emp = dict(row)
        cnae_original = emp.get('cnae_fiscal_principal', '')

        # Formatar CNAE e adicionar descrição
        emp['cnae_fiscal'] = formatar_cnae(cnae_original)
        emp['cnae_permitido'] = cnae_esta_permitido(cnae_original)

        # Converter código de município para nome
        codigo_mun = emp.get('municipio', '')
        emp['municipio'] = obter_nome_municipio(codigo_mun)

        # Remover campo temporário
        if 'cnae_fiscal_principal' in emp:
            del emp['cnae_fiscal_principal']

        resultado.append(emp)

    return jsonify(resultado)

MEDIA_DIR = Path('static/media')
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'svg', 'webp'}

def allowed_image(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS
def processar_boleto(caminho_arquivo, arquivo_nome, documento_id):
    """
    Processa ESPECIFICAMENTE boletos - Função dedicada e otimizada

    Fluxo:
    1. Extrai texto do PDF (OCR com pdfplumber)
    2. Detecta se é realmente um boleto (palavras-chave)
    3. Extrai dados: valor, vencimento, código de barras, beneficiário
    4. Salva na tabela boletos
    5. Atualiza documentos_gerados

    Returns:
        dict: Dados extraídos ou None se falhar
    """
    try:
        print(f"\n{'='*70}")
        print(f"[BOLETO] Processando boleto: {arquivo_nome}")
        print(f"{'='*70}")

        # ========== ETAPA 1: EXTRAIR TEXTO DO PDF ==========
        print(f"[BOLETO] [1/5] Extraindo texto do PDF...")
        texto_completo = ""

        try:
            import pdfplumber
            with pdfplumber.open(caminho_arquivo) as pdf:
                for pagina in pdf.pages:
                    texto = pagina.extract_text()
                    if texto:
                        texto_completo += texto + "\n"
            print(f"[BOLETO] OK Texto extraído: {len(texto_completo)} caracteres")
        except Exception as e:
            print(f"[BOLETO] ERRO Erro ao extrair texto: {e}")
            return None

        if not texto_completo or len(texto_completo) < 50:
            print(f"[BOLETO] ERRO Texto insuficiente para análise")
            return None

        texto_lower = texto_completo.lower()

        # ========== ETAPA 2: VALIDAR SE É BOLETO ==========
        print(f"[BOLETO] [2/5] Validando se é realmente um boleto...")

        palavras_chave_boleto = [
            'boleto', 'vencimento', 'nosso número', 'nosso numero',
            'código de barras', 'codigo de barras', 'linha digitável', 'linha digitavel',
            'beneficiário', 'beneficiario', 'pagador', 'sacado', 'cedente',
            'banco do brasil', 'itaú', 'itau', 'bradesco', 'santander',
            'caixa econômica', 'caixa economica', 'sicoob', 'sicredi',
            'valor do documento', 'valor cobrado', 'agência', 'agencia',
            'conta corrente', 'data de vencimento', 'data do vencimento'
        ]

        matches = sum(1 for palavra in palavras_chave_boleto if palavra in texto_lower)

        if matches < 3:  # Precisa de pelo menos 3 palavras-chave
            print(f"[BOLETO] ERRO Não parece ser um boleto (apenas {matches} palavras-chave encontradas)")
            print(f"[BOLETO] ℹ Palavras encontradas: {[p for p in palavras_chave_boleto if p in texto_lower]}")
            return None

        print(f"[BOLETO] OK Confirmado como boleto ({matches} palavras-chave encontradas)")

        # ========== ETAPA 3: EXTRAIR DADOS DO NOME DO ARQUIVO ==========
        print(f"[BOLETO] [3/5] Extraindo dados do nome do arquivo...")

        import re
        dados_boleto = {}

        # Remover timestamp do nome do arquivo se houver (formato: YYYYMMDD_HHMMSS_)
        nome_limpo = re.sub(r'^\d{8}_\d{6}_', '', arquivo_nome)
        # Remover extensão .pdf
        nome_limpo = nome_limpo.replace('.pdf', '').replace('.PDF', '')

        print(f"[BOLETO]   Nome original: {arquivo_nome}")
        print(f"[BOLETO]   Nome limpo: {nome_limpo}")

        # Padrão: NOME - VALOR - DATA
        # Exemplos: "ELASA - 950,00 - 26-09-2025" ou "EMPRESA TESTE - 1500.50 - 15/12/2024"
        padrao_completo = r'^(.+?)\s*[-–]\s*([\d\.,]+)\s*[-–]\s*(\d{2})[-/](\d{2})[-/](\d{4})'
        match = re.search(padrao_completo, nome_limpo, re.IGNORECASE)

        if match:
            # Extrair do nome do arquivo
            dados_boleto['cliente_nome'] = match.group(1).strip().upper()

            # Extrair valor
            valor_str = match.group(2).replace('.', '').replace(',', '.')
            try:
                dados_boleto['valor'] = float(valor_str)
            except (ValueError, AttributeError):
                dados_boleto['valor'] = 0.0

            # Extrair data de vencimento (DD-MM-YYYY ou DD/MM/YYYY)
            dia = match.group(3)
            mes = match.group(4)
            ano = match.group(5)
            dados_boleto['data_vencimento'] = f"{dia}/{mes}/{ano}"
            dados_boleto['data_emissao'] = datetime.now().strftime('%d/%m/%Y')

            print(f"[BOLETO]   OK Cliente (do arquivo): {dados_boleto['cliente_nome']}")
            print(f"[BOLETO]   OK Valor (do arquivo): R$ {dados_boleto['valor']:.2f}")
            print(f"[BOLETO]   OK Vencimento (do arquivo): {dados_boleto['data_vencimento']}")
            print(f"[BOLETO]   OK Emissão: {dados_boleto['data_emissao']} (data atual)")
        else:
            print(f"[BOLETO]   AVISO Padrão não encontrado no nome do arquivo")
            print(f"[BOLETO]   ℹ Esperado: NOME - VALOR - DD-MM-AAAA")

            # Tentar extrair apenas o nome (tudo antes do primeiro -)
            nome_simples = nome_limpo.split('-')[0].strip() if '-' in nome_limpo else nome_limpo
            dados_boleto['cliente_nome'] = nome_simples.upper() if nome_simples else 'CLIENTE NÃO IDENTIFICADO'
            dados_boleto['valor'] = 0.0
            dados_boleto['data_vencimento'] = datetime.now().strftime('%d/%m/%Y')
            dados_boleto['data_emissao'] = datetime.now().strftime('%d/%m/%Y')

            print(f"[BOLETO]   → Usando: Cliente='{dados_boleto['cliente_nome']}', Valor=R$ 0,00")

        # Campos adicionais (padrão)
        dados_boleto['endereco'] = ''
        dados_boleto['numero_documento'] = ''
        dados_boleto['codigo_barras'] = None

        # Gemini desativado - dados vêm do nome do arquivo
        print(f"[BOLETO]   ℹ Usando dados do nome do arquivo (Gemini desativado)")

        # ========== ETAPA 4: SALVAR NA TABELA BOLETOS ==========
        print(f"[BOLETO] [4/5] Salvando na tabela boletos...")

        conn = get_db()
        cursor = conn.execute('''
            INSERT INTO boletos (
                cliente_nome, descricao, valor, data_emissao, data_vencimento,
                numero_documento, codigo_barras, status, arquivo_caminho, data_criacao
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            dados_boleto['cliente_nome'],
            f"Boleto de {dados_boleto['cliente_nome']} - Venc: {dados_boleto['data_vencimento']}",
            dados_boleto['valor'],
            dados_boleto['data_emissao'],
            dados_boleto['data_vencimento'],
            dados_boleto['numero_documento'],
            dados_boleto['codigo_barras'],
            'pendente',
            caminho_arquivo,
            datetime.now()
        ))
        boleto_id = cursor.lastrowid
        conn.commit()

        print(f"[BOLETO] OKOK Boleto salvo com ID: {boleto_id}")

        # ========== ETAPA 5: ATUALIZAR DOCUMENTOS_GERADOS ==========
        print(f"[BOLETO] [5/5] Atualizando documentos_gerados...")

        # Converter data de vencimento para datetime
        try:
            partes = dados_boleto['data_vencimento'].split('/')
            data_obj = datetime(int(partes[2]), int(partes[1]), int(partes[0]))
        except (ValueError, IndexError, AttributeError):
            data_obj = datetime.now()

        conn.execute('''
            UPDATE documentos_gerados
            SET tipo_doc = 'BOLETO',
                cliente_nome = ?,
                valor_total = ?,
                data_geracao = ?
            WHERE id = ?
        ''', (
            dados_boleto['cliente_nome'],
            dados_boleto['valor'],
            data_obj,
            documento_id
        ))
        conn.commit()

        print(f"[BOLETO] OK documentos_gerados atualizado")
        print(f"{'='*70}")
        print(f"[BOLETO] OKOKOK PROCESSAMENTO CONCLUÍDO COM SUCESSO!")
        print(f"{'='*70}\n")

        return dados_boleto

    except Exception as e:
        print(f"[BOLETO] ERROERROERRO ERRO NO PROCESSAMENTO: {e}")
        traceback.print_exc()
        return None
with app.app_context():
    criar_tabelas()
    # Criar tabelas do sistema de aprendizagem
    layout_learner.criar_tabelas()
    layout_learner.carregar_layouts()
    # Carregar CNAEs ao iniciar
    carregar_cnaes_permitidos()
    # Limpar arquivos temporários
    limpar_arquivos_temporarios()

# ==================== ENDPOINTS DE CONFIGURAÇÃO DE DIRETÓRIOS ====================

@app.route('/api/selecionar-diretorio', methods=['POST'])
def selecionar_diretorio():
    """Abre diálogo para selecionar diretório"""
    try:
        import tkinter as tk
        from tkinter import filedialog

        # Criar janela oculta
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)

        # Abrir diálogo de seleção de pasta
        caminho = filedialog.askdirectory(
            title="Selecione o diretório",
            mustexist=True
        )

        root.destroy()

        if caminho:
            return jsonify({'success': True, 'caminho': caminho})
        else:
            return jsonify({'success': False, 'message': 'Nenhum diretório selecionado'})

    except Exception as e:
        print(f"Erro ao selecionar diretório: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/salvar-diretorios', methods=['POST'])
def salvar_diretorios():
    """Salva configuração de diretórios duplos"""
    try:
        data = request.json
        dir_principal = data.get('principal')
        dir_backup = data.get('backup')
        criar_pastas = data.get('criar_pastas', True)  # Por padrão, cria pastas

        if not dir_principal or not dir_backup:
            return jsonify({'success': False, 'message': 'Ambos os diretórios são obrigatórios'})

        # Verificar se os diretórios existem
        if not Path(dir_principal).exists():
            return jsonify({'success': False, 'message': 'Diretório principal não existe'})

        if not Path(dir_backup).exists():
            return jsonify({'success': False, 'message': 'Diretório de backup não existe'})

        estrutura_criada = []

        # Criar estrutura de pastas APENAS se a opção estiver marcada
        if criar_pastas:
            pastas = ['Laudos', 'Recibos', 'Orcamentos', 'Boletos']

            for pasta in pastas:
                # Criar no diretório principal
                caminho_principal = Path(dir_principal) / pasta
                caminho_principal.mkdir(parents=True, exist_ok=True)

                # Criar no diretório de backup
                caminho_backup = Path(dir_backup) / pasta
                caminho_backup.mkdir(parents=True, exist_ok=True)

                estrutura_criada.append(pasta)

        # Salvar configuração
        config = {
            'principal': str(dir_principal),
            'backup': str(dir_backup),
            'ativo': True,
            'criar_pastas_auto': criar_pastas,
            'data_configuracao': datetime.now().isoformat()
        }

        config_file = BASE_DIR / 'config_diretorios_duplos.json'
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)

        response_data = {
            'success': True,
            'message': 'Diretórios configurados com sucesso'
        }

        if estrutura_criada:
            response_data['estrutura_criada'] = estrutura_criada

        return jsonify(response_data)

    except Exception as e:
        print(f"Erro ao salvar diretórios: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/testar-diretorios', methods=['POST'])
def testar_diretorios():
    """Testa se os diretórios estão acessíveis e cria arquivo de teste"""
    try:
        data = request.json
        dir_principal = data.get('principal')
        dir_backup = data.get('backup')

        if not dir_principal or not dir_backup:
            return jsonify({'success': False, 'message': 'Diretórios não configurados'})

        # Testar escrita no diretório principal
        teste_principal = Path(dir_principal) / 'teste_acesso.txt'
        teste_principal.write_text(f'Teste de acesso - {datetime.now()}', encoding='utf-8')

        # Testar escrita no diretório de backup
        teste_backup = Path(dir_backup) / 'teste_acesso.txt'
        teste_backup.write_text(f'Teste de acesso - {datetime.now()}', encoding='utf-8')

        # Remover arquivos de teste
        teste_principal.unlink()
        teste_backup.unlink()

        return jsonify({
            'success': True,
            'message': 'Ambos os diretórios estão acessíveis e funcionando',
            'arquivos_teste_criados': True
        })

    except Exception as e:
        print(f"Erro ao testar diretórios: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/obter-diretorios')
def obter_diretorios():
    """Retorna os diretórios configurados"""
    try:
        config_file = BASE_DIR / 'config_diretorios_duplos.json'

        if config_file.exists():
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)

            return jsonify({
                'success': True,
                'diretorios': {
                    'principal': config.get('principal'),
                    'backup': config.get('backup')
                }
            })
        else:
            return jsonify({'success': True, 'diretorios': {}})

    except Exception as e:
        print(f"Erro ao obter diretórios: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

def salvar_upload_simples(conteudo, nome_arquivo, tipo_documento):
    """
    Salva um arquivo de upload APENAS no diretório principal configurado
    (uploads são manuais, então não fazemos backup automático)

    Args:
        conteudo: bytes do arquivo OU caminho do arquivo já salvo
        nome_arquivo: nome do arquivo
        tipo_documento: 'LAUDO', 'RECIBO', 'ORCAMENTO', 'BOLETO'

    Returns:
        str: caminho onde o arquivo foi salvo
    """
    try:
        print(f"[SALVAR] Iniciando salvar_upload_simples()")
        print(f"[SALVAR] - nome_arquivo: {nome_arquivo}")
        print(f"[SALVAR] - tipo_documento: {tipo_documento}")
        print(f"[SALVAR] - tipo de conteudo: {type(conteudo).__name__}")

        # Mapear tipo de documento para nome de pasta
        mapa_pastas = {
            'LAUDO': 'Laudos',
            'RECIBO': 'Recibos',
            'ORCAMENTO': 'Orcamentos',
            'BOLETO': 'Boletos'
        }

        pasta = mapa_pastas.get(tipo_documento, 'Laudos')
        print(f"[SALVAR] - pasta destino: {pasta}")

        config_file = BASE_DIR / 'config_diretorios_duplos.json'
        print(f"[SALVAR] - config_file: {config_file}")
        print(f"[SALVAR] - config existe: {config_file.exists()}")

        # Se não houver configuração, usar diretório padrão
        if not config_file.exists():
            print(f"[SALVAR] Sem config - usando diretório padrão")
            caminho_padrao = OUTPUT_DIR / pasta / nome_arquivo
            caminho_padrao.parent.mkdir(parents=True, exist_ok=True)

            if isinstance(conteudo, bytes):
                caminho_padrao.write_bytes(conteudo)
            elif isinstance(conteudo, str):
                shutil.copy2(conteudo, caminho_padrao)

            print(f"[SALVAR] OK Arquivo salvo (sem config): {caminho_padrao}")
            return str(caminho_padrao)

        # Carregar configuração
        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f)

        print(f"[SALVAR] Config carregada: {config}")
        dir_principal = config.get('principal')
        print(f"[SALVAR] Diretorio principal: {dir_principal}")

        # Salvar APENAS no diretório principal (uploads são manuais)
        if dir_principal:
            caminho_principal = Path(dir_principal) / pasta / nome_arquivo
            print(f"[SALVAR] Caminho completo: {caminho_principal}")
            print(f"[SALVAR] Criando diretorio: {caminho_principal.parent}")
            caminho_principal.parent.mkdir(parents=True, exist_ok=True)

            if isinstance(conteudo, bytes):
                print(f"[SALVAR] Salvando bytes...")
                caminho_principal.write_bytes(conteudo)
            elif isinstance(conteudo, str):
                print(f"[SALVAR] Copiando de: {conteudo}")
                shutil.copy2(conteudo, caminho_principal)

            print(f"[SALVAR] OK Arquivo salvo (config): {caminho_principal}")
            return str(caminho_principal)

        # Fallback para diretório padrão
        print(f"[SALVAR] Sem dir_principal - usando fallback")
        caminho_padrao = OUTPUT_DIR / pasta / nome_arquivo
        caminho_padrao.parent.mkdir(parents=True, exist_ok=True)

        if isinstance(conteudo, bytes):
            caminho_padrao.write_bytes(conteudo)
        elif isinstance(conteudo, str):
                shutil.copy2(conteudo, caminho_padrao)

        print(f"[SALVAR] OK Arquivo salvo (fallback): {caminho_padrao}")
        return str(caminho_padrao)

    except Exception as e:
        print(f"[ERRO] Erro ao salvar upload: {e}")
        traceback.print_exc()

        # Fallback para diretório padrão
        try:
            caminho_padrao = OUTPUT_DIR / pasta / nome_arquivo
            caminho_padrao.parent.mkdir(parents=True, exist_ok=True)

            if isinstance(conteudo, bytes):
                caminho_padrao.write_bytes(conteudo)
            elif isinstance(conteudo, str):
                shutil.copy2(conteudo, caminho_padrao)

            print(f"[ERRO] Arquivo salvo em fallback: {caminho_padrao}")
            return str(caminho_padrao)
        except Exception as e2:
            print(f"[ERRO] Falha crítica no fallback: {e2}")
            traceback.print_exc()
            return None

def salvar_arquivo_duplo(conteudo, nome_arquivo, tipo_documento):
    """
    Salva um arquivo nos diretórios configurados (principal + backup)

    Args:
        conteudo: bytes do arquivo OU caminho do arquivo já salvo
        nome_arquivo: nome do arquivo (ex: laudo_123.pdf)
        tipo_documento: 'LAUDO', 'RECIBO', 'ORCAMENTO', 'BOLETO'

    Returns:
        dict com {'caminho_principal': str, 'caminhos_todos': [str, str, ...]}
    """
    try:
        # Mapear tipo de documento para nome de pasta
        mapa_pastas = {
            'LAUDO': 'Laudos',
            'RECIBO': 'Recibos',
            'ORCAMENTO': 'Orcamentos',
            'BOLETO': 'Boletos'
        }

        pasta = mapa_pastas.get(tipo_documento, 'Laudos')

        config_file = BASE_DIR / 'config_diretorios_duplos.json'

        # Se não houver configuração, salvar apenas no diretório padrão
        if not config_file.exists():
            caminho_padrao = OUTPUT_DIR / pasta / nome_arquivo
            caminho_padrao.parent.mkdir(parents=True, exist_ok=True)

            if isinstance(conteudo, bytes):
                caminho_padrao.write_bytes(conteudo)
            elif isinstance(conteudo, str):
                # Copiar arquivo
                        shutil.copy2(conteudo, caminho_padrao)

            return {
                'caminho_principal': str(caminho_padrao),
                'caminhos_todos': [str(caminho_padrao)]
            }

        # Carregar configuração
        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f)

        dir_principal = config.get('principal')
        dir_backup = config.get('backup')

        caminhos_salvos = []
        caminho_principal_str = None

        # Salvar no diretório principal
        if dir_principal:
            caminho_principal = Path(dir_principal) / pasta / nome_arquivo
            caminho_principal.parent.mkdir(parents=True, exist_ok=True)

            if isinstance(conteudo, bytes):
                caminho_principal.write_bytes(conteudo)
            elif isinstance(conteudo, str):
                shutil.copy2(conteudo, caminho_principal)

            caminho_principal_str = str(caminho_principal)
            caminhos_salvos.append(caminho_principal_str)

        # Salvar no diretório de backup
        if dir_backup:
            caminho_backup = Path(dir_backup) / pasta / nome_arquivo
            caminho_backup.parent.mkdir(parents=True, exist_ok=True)

            if isinstance(conteudo, bytes):
                caminho_backup.write_bytes(conteudo)
            elif isinstance(conteudo, str):
                shutil.copy2(conteudo, caminho_backup)

            caminhos_salvos.append(str(caminho_backup))

        # Se não salvou em nenhum configurado, usar padrão
        if not caminho_principal_str:
            caminho_padrao = OUTPUT_DIR / pasta / nome_arquivo
            caminho_padrao.parent.mkdir(parents=True, exist_ok=True)

            if isinstance(conteudo, bytes):
                caminho_padrao.write_bytes(conteudo)
            elif isinstance(conteudo, str):
                shutil.copy2(conteudo, caminho_padrao)

            caminho_principal_str = str(caminho_padrao)
            caminhos_salvos.append(caminho_principal_str)

        return {
            'caminho_principal': caminho_principal_str,
            'caminhos_todos': caminhos_salvos
        }

    except Exception as e:
        print(f"Erro ao salvar arquivo duplo: {e}")
        traceback.print_exc()

        # Fallback para diretório padrão
        try:
            caminho_padrao = OUTPUT_DIR / pasta / nome_arquivo
            caminho_padrao.parent.mkdir(parents=True, exist_ok=True)

            if isinstance(conteudo, bytes):
                caminho_padrao.write_bytes(conteudo)
            elif isinstance(conteudo, str):
                shutil.copy2(conteudo, caminho_padrao)

            return {
                'caminho_principal': str(caminho_padrao),
                'caminhos_todos': [str(caminho_padrao)]
            }
        except Exception as e2:
            raise Exception(f"Erro crítico ao salvar arquivo: {e2}")

# Rota /prospeccao agora servida pelo SPA React (spa_app)

@app.route('/api/busca-global')
def busca_global():
    """Pesquisa global em clientes, documentos e boletos."""
    q = request.args.get('q', '').strip()
    if len(q) < 2:
        return jsonify({'resultados': [], 'total': 0})

    conn = get_db()
    resultados = []
    termo = f'%{q}%'

    # Buscar clientes
    clientes = conn.execute(
        "SELECT id, nome_fantasia, cnpj, cidade FROM clientes_web WHERE nome_fantasia LIKE ? OR cnpj LIKE ? LIMIT 5",
        (termo, termo)
    ).fetchall()
    for c in clientes:
        resultados.append({
            'tipo': 'cliente',
            'titulo': c['nome_fantasia'],
            'subtitulo': c['cnpj'] or c['cidade'] or '',
            'url': '/dashboard#clientes'
        })

    # Buscar documentos
    docs = conn.execute(
        "SELECT id, nome_arquivo, tipo_documento, cliente_nome FROM documentos_gerados WHERE nome_arquivo LIKE ? OR cliente_nome LIKE ? LIMIT 5",
        (termo, termo)
    ).fetchall()
    for d in docs:
        resultados.append({
            'tipo': 'documento',
            'titulo': d['nome_arquivo'],
            'subtitulo': d['cliente_nome'] or d['tipo_documento'] or '',
            'url': '/dashboard#documentos'
        })

    # Buscar boletos
    boletos = conn.execute(
        "SELECT id, descricao, valor, status FROM boletos WHERE descricao LIKE ? LIMIT 3",
        (termo,)
    ).fetchall()
    for b in boletos:
        resultados.append({
            'tipo': 'boleto',
            'titulo': b['descricao'],
            'subtitulo': f"R$ {b['valor']:.2f}" if b['valor'] else b['status'] or '',
            'url': '/dashboard#boletos'
        })

    return jsonify({'resultados': resultados, 'total': len(resultados)})

@app.route('/api/abrir-arquivo', methods=['POST'])
def abrir_arquivo():
    """Abre um arquivo no visualizador padrão do sistema"""
    try:
        import subprocess
        import platform

        data = request.json
        caminho = data.get('caminho')

        if not caminho:
            return jsonify({'success': False, 'message': 'Caminho não fornecido'})

        # Converter para Path
        arquivo = Path(caminho)

        if not arquivo.exists():
            return jsonify({'success': False, 'message': 'Arquivo não encontrado'})

        # Abrir arquivo de acordo com o sistema operacional
        sistema = platform.system()

        if sistema == 'Windows':
            os.startfile(str(arquivo))
        elif sistema == 'Darwin':  # macOS
            subprocess.run(['open', str(arquivo)])
        else:  # Linux
            subprocess.run(['xdg-open', str(arquivo)])

        return jsonify({'success': True, 'message': 'Arquivo aberto'})

    except Exception as e:
        print(f"Erro ao abrir arquivo: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== PRODUTOS ====================

@app.route('/api/produtos', methods=['GET'])
def listar_produtos():
    """Lista todos os produtos do banco"""
    try:
        db = get_db()
        rows = db.execute('SELECT * FROM produtos ORDER BY nome').fetchall()
        resultado = []
        for r in rows:
            p = dict(r)
            try:
                p['targets'] = json.loads(p['targets'] or '[]')
            except Exception:
                p['targets'] = []
            resultado.append(p)
        return jsonify(resultado)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/produtos', methods=['POST'])
def criar_produto():
    """Cria ou atualiza produto"""
    try:
        data = request.json
        if not data or not data.get('nome'):
            return jsonify({'error': 'Nome obrigatório'}), 400
        pid = data.get('id') or data['nome'].lower().replace(' ', '_').replace('/', '_')
        targets_json = json.dumps(data.get('targets', []), ensure_ascii=False)
        db = get_db()
        db.execute('''INSERT OR REPLACE INTO produtos
            (id, nome, grupo, principio, registro, concentracao, diluente, equipamento, antidoto, targets)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (pid, data.get('nome',''), data.get('grupo',''), data.get('principio',''),
             data.get('registro',''), data.get('concentracao',''), data.get('diluente',''),
             data.get('equipamento',''), data.get('antidoto',''), targets_json))
        db.commit()
        return jsonify({'success': True, 'id': pid})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/produtos/<produto_id>', methods=['PUT'])
def atualizar_produto(produto_id):
    """Atualiza produto existente"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'Dados inválidos'}), 400
        targets_json = json.dumps(data.get('targets', []), ensure_ascii=False)
        db = get_db()
        db.execute('''UPDATE produtos SET nome=?, grupo=?, principio=?, registro=?,
            concentracao=?, diluente=?, equipamento=?, antidoto=?, targets=?
            WHERE id=?''',
            (data.get('nome',''), data.get('grupo',''), data.get('principio',''),
             data.get('registro',''), data.get('concentracao',''), data.get('diluente',''),
             data.get('equipamento',''), data.get('antidoto',''), targets_json, produto_id))
        db.commit()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/produtos/<produto_id>', methods=['DELETE'])
def deletar_produto(produto_id):
    """Remove produto"""
    try:
        db = get_db()
        db.execute('DELETE FROM produtos WHERE id=?', (produto_id,))
        db.commit()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== CONFIGURAÇÃO PASTA PRINCIPAL ====================

@app.route('/api/config/pasta-principal', methods=['GET', 'POST'])
def api_pasta_principal():
    """Lê/salva o caminho da pasta principal (OneDrive ou similar)"""
    config_duplos = BASE_DIR / 'config_diretorios_duplos.json'
    if request.method == 'GET':
        try:
            if config_duplos.exists():
                with open(config_duplos, 'r', encoding='utf-8') as f:
                    cfg = json.load(f)
                pasta = cfg.get('principal', '')
                existe = Path(pasta).exists() if pasta else False
                return jsonify({'pasta': pasta, 'existe': existe})
            return jsonify({'pasta': '', 'existe': False})
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    else:
        try:
            data = request.json
            pasta = (data or {}).get('pasta', '')
            cfg = {}
            if config_duplos.exists():
                with open(config_duplos, 'r', encoding='utf-8') as f:
                    cfg = json.load(f)
            cfg['principal'] = pasta
            cfg['ativo'] = True
            cfg['criar_pastas_auto'] = True
            cfg['data_configuracao'] = datetime.now().isoformat()
            with open(config_duplos, 'w', encoding='utf-8') as f:
                json.dump(cfg, f, indent=2, ensure_ascii=False)
            return jsonify({'success': True, 'pasta': pasta})
        except Exception as e:
            return jsonify({'error': str(e)}), 500


# ==================== SALVAR DOCUMENTOS PDF ====================

@app.route('/api/documentos/salvar-pdf', methods=['POST'])
def salvar_pdf():
    """Recebe PDF gerado pelo frontend e salva com nomenclatura correta"""
    try:
        arquivo = request.files.get('arquivo')
        if not arquivo:
            return jsonify({'error': 'Arquivo não enviado'}), 400

        tipo = request.form.get('tipo', 'laudo').upper()
        numero_doc = request.form.get('numero_doc', '0001').zfill(4)
        nome_empresa = request.form.get('nome_empresa', 'Empresa').strip()
        mes_ano = request.form.get('mes_ano', datetime.now().strftime('%m-%y'))

        # Sanitizar nome da empresa para uso em nome de arquivo
        import re as _re
        nome_safe = _re.sub(r'[<>:"/\\|?*]', '', nome_empresa)[:60].strip()

        nome_arquivo = f'#{numero_doc} {nome_safe} {mes_ano}.pdf'

        # Determinar pasta de destino
        config_duplos = BASE_DIR / 'config_diretorios_duplos.json'
        pasta_principal = None
        if config_duplos.exists():
            with open(config_duplos, 'r', encoding='utf-8') as f:
                cfg = json.load(f)
            pasta_principal = cfg.get('principal', '').strip()

        mapa_subpastas = {'LAUDO': 'Laudos', 'RECIBO': 'Recibos', 'ORCAMENTO': 'Orcamentos', 'ORÇAMENTO': 'Orcamentos'}
        subpasta_nome = mapa_subpastas.get(tipo, 'Laudos')

        if pasta_principal and Path(pasta_principal).exists():
            destino = Path(pasta_principal) / subpasta_nome
        else:
            destino = OUTPUT_DIR / subpasta_nome

        destino.mkdir(parents=True, exist_ok=True)
        caminho_final = destino / nome_arquivo

        # Se já existe arquivo com mesmo nome → mover para Lixeira
        if caminho_final.exists():
            if pasta_principal and Path(pasta_principal).exists():
                lixeira = Path(pasta_principal) / 'Lixeira'
            else:
                lixeira = OUTPUT_DIR / 'Lixeira'
            lixeira.mkdir(parents=True, exist_ok=True)
            ts = datetime.now().strftime('%Y%m%d_%H%M%S')
            nome_lixeira = f'{ts}_{nome_arquivo}'
            shutil.move(str(caminho_final), str(lixeira / nome_lixeira))

        arquivo.save(str(caminho_final))

        # Registrar no banco
        db = get_db()
        db.execute('''INSERT INTO documentos_salvos (nome_arquivo, tipo, caminho, numero_doc, nome_empresa)
            VALUES (?, ?, ?, ?, ?)''',
            (nome_arquivo, tipo, str(caminho_final), numero_doc, nome_empresa))
        db.commit()

        return jsonify({'success': True, 'nome_arquivo': nome_arquivo, 'caminho': str(caminho_final)})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/limpar-lixeira', methods=['POST'])
def limpar_lixeira():
    """Remove arquivos da Lixeira com mais de 90 dias"""
    try:
        config_duplos = BASE_DIR / 'config_diretorios_duplos.json'
        pasta_principal = None
        if config_duplos.exists():
            with open(config_duplos, 'r', encoding='utf-8') as f:
                cfg = json.load(f)
            pasta_principal = cfg.get('principal', '').strip()

        if pasta_principal and Path(pasta_principal).exists():
            lixeira = Path(pasta_principal) / 'Lixeira'
        else:
            lixeira = OUTPUT_DIR / 'Lixeira'

        removidos = 0
        limite = datetime.now() - timedelta(days=90)
        if lixeira.exists():
            for arq in lixeira.iterdir():
                if arq.is_file():
                    mtime = datetime.fromtimestamp(arq.stat().st_mtime)
                    if mtime < limite:
                        arq.unlink()
                        removidos += 1
        return jsonify({'success': True, 'removidos': removidos})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("\n" + "="*70)
    print("  SISTEMA DE GESTAO DE DOCUMENTOS - MODULAR")
    print("  Arquitetura: services/ + blueprints/")
    print("="*70)
    print("\n  MODULOS ATIVOS:")
    print("     - services/database.py  (conexao e tabelas)")
    print("     - services/cache.py     (cache em memoria)")
    print("     - services/formatters.py (formatacao de dados)")
    print("     - services/auth.py      (autenticacao)")
    print("     - blueprints/auth.py    (login/usuarios)")
    print("     - blueprints/clientes.py(clientes/CNPJ)")
    print("     - blueprints/tags.py    (gerenciamento de tags)")
    print("     - blueprints/boletos.py (boletos/garantias)")
    print("     - blueprints/admin.py   (config/banco)")
    print("  OTIMIZACOES:")
    print("     - SQLite WAL + 64MB cache")
    print("     - Regex compilados + Cache LRU")
    print("     - Gemini 2.5 Flash")
    print("\n  Acesse: http://localhost:5000")
    print("  Pressione CTRL+C para parar")
    print("="*70 + "\n")

    # Configurações otimizadas para produção
    app.run(
        debug=True,
        host='0.0.0.0',
        port=5000,
        threaded=True,  # Habilitar threading
        use_reloader=False  # Desabilitar reloader em produção
    )

# Reload 1767837493.9213495