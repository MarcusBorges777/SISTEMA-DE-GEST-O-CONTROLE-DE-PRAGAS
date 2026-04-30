# -*- coding: utf-8 -*-
"""Database service - Database connections and table management."""
import sqlite3
import json
import secrets
from pathlib import Path
from flask import g
from werkzeug.security import generate_password_hash

# Will be set by app.py during initialization
DB_PATH = None
BASE_DIR = None


def init(db_path, base_dir):
    """Initialize database service with paths."""
    global DB_PATH, BASE_DIR
    DB_PATH = db_path
    BASE_DIR = base_dir


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

    # Adicionar campo de garantia aos clientes
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
            senha_temporaria = secrets.token_urlsafe(18)
            senha_hash = generate_password_hash(senha_temporaria, method='pbkdf2:sha256')
            db.execute('''INSERT INTO usuarios (nome, email, senha_hash, perfil)
                          VALUES (?, ?, ?, ?)''',
                       ('Administrador', 'admin@sistema.com', senha_hash, 'admin'))
            db.commit()
            print(f"[OK] Usuario admin padrao criado (admin@sistema.com / {senha_temporaria})")
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

