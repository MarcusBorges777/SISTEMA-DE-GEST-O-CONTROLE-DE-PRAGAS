#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DatabaseManager - Ponto de acesso ÚNICO para operações de banco de dados.

Este módulo centraliza:
- Conexões SQLite (desenvolvimento) / PostgreSQL (produção)
- Sessões SQLAlchemy com gerenciamento de transações
- Compatibilidade com código legado (sqlite3.Row)
- Cache de conexões thread-safe via Singleton

IMPORTANTE: Todo acesso a banco DEVE passar por este módulo.
Não use sqlite3.connect() ou get_db() diretamente em outros arquivos.
"""

import sqlite3
import threading
import os
from pathlib import Path
from contextlib import contextmanager
from typing import Optional, Any, List, Dict, Union, Generator
from functools import wraps

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, Session, scoped_session
from sqlalchemy.pool import StaticPool
from sqlalchemy.engine import Engine

# Importar models para criar tabelas
from models import Base, create_all_tables, insert_initial_data


# =============================================================================
# CONFIGURAÇÕES
# =============================================================================

class DatabaseConfig:
    """Configurações centralizadas do banco de dados."""

    # Ambiente (development, production, testing)
    ENV = os.environ.get('FLASK_ENV', 'development')

    # Caminhos padrão
    BASE_DIR = Path(__file__).parent
    DEFAULT_SQLITE_PATH = BASE_DIR / 'gestao_documentos.db'

    # URL de conexão (prioriza variável de ambiente)
    DATABASE_URL = os.environ.get(
        'DATABASE_URL',
        f'sqlite:///{DEFAULT_SQLITE_PATH}'
    )

    # PRAGMAs SQLite para otimização
    SQLITE_PRAGMAS = {
        'journal_mode': 'WAL',           # Write-Ahead Logging
        'synchronous': 'NORMAL',         # Balanço segurança/performance
        'cache_size': -64000,            # 64MB cache
        'mmap_size': 268435456,          # 256MB memory-mapped I/O
        'temp_store': 'MEMORY',          # Tabelas temp em RAM
        'busy_timeout': 20000,           # 20s timeout para locks
        'foreign_keys': 'ON',            # Habilitar FK constraints
    }

    # Configurações de pool
    POOL_SIZE = 5
    POOL_RECYCLE = 3600  # Reciclar conexões a cada 1h
    POOL_PRE_PING = True  # Verificar conexão antes de usar


# =============================================================================
# SINGLETON DATABASE MANAGER
# =============================================================================

class DatabaseManager:
    """
    Gerenciador centralizado de conexões com banco de dados.

    Implementa:
    - Singleton thread-safe por URL de banco
    - Sessões SQLAlchemy com scoped_session
    - Compatibilidade com sqlite3.Row para código legado
    - Transações ACID via context manager

    Uso:
        db = DatabaseManager.get_instance()
        with db.session_scope() as session:
            session.query(Cliente).all()
    """

    _instances: Dict[str, 'DatabaseManager'] = {}
    _lock = threading.Lock()

    def __new__(cls, database_url: str = None):
        """Singleton por URL de banco."""
        url = database_url or DatabaseConfig.DATABASE_URL

        with cls._lock:
            if url not in cls._instances:
                instance = super().__new__(cls)
                instance._initialized = False
                cls._instances[url] = instance
            return cls._instances[url]

    def __init__(self, database_url: str = None):
        if self._initialized:
            return

        self.database_url = database_url or DatabaseConfig.DATABASE_URL
        self._engine = None
        self._session_factory = None
        self._scoped_session = None
        self._legacy_local = threading.local()  # Para compatibilidade sqlite3

        self._initialize_engine()
        self._initialized = True

    def _initialize_engine(self):
        """Inicializa engine SQLAlchemy com configurações otimizadas."""
        is_sqlite = self.database_url.startswith('sqlite')

        if is_sqlite:
            # SQLite: conexão única com StaticPool para evitar locks
            self._engine = create_engine(
                self.database_url,
                connect_args={'check_same_thread': False, 'timeout': 20},
                poolclass=StaticPool,
                echo=DatabaseConfig.ENV == 'development' and os.environ.get('SQL_ECHO', '').lower() == 'true'
            )

            # Aplicar PRAGMAs de otimização
            @event.listens_for(self._engine, 'connect')
            def set_sqlite_pragma(dbapi_connection, connection_record):
                cursor = dbapi_connection.cursor()
                for pragma, value in DatabaseConfig.SQLITE_PRAGMAS.items():
                    cursor.execute(f'PRAGMA {pragma}={value}')
                cursor.close()

        else:
            # PostgreSQL: pool de conexões
            self._engine = create_engine(
                self.database_url,
                pool_size=DatabaseConfig.POOL_SIZE,
                pool_recycle=DatabaseConfig.POOL_RECYCLE,
                pool_pre_ping=DatabaseConfig.POOL_PRE_PING,
                echo=DatabaseConfig.ENV == 'development' and os.environ.get('SQL_ECHO', '').lower() == 'true'
            )

        # Session factory
        self._session_factory = sessionmaker(
            bind=self._engine,
            expire_on_commit=False,
            autoflush=True
        )

        # Scoped session para thread-safety
        self._scoped_session = scoped_session(self._session_factory)

    @property
    def engine(self) -> Engine:
        """Retorna a engine SQLAlchemy."""
        return self._engine

    @property
    def session(self) -> Session:
        """Retorna sessão scoped (thread-safe)."""
        return self._scoped_session()

    @contextmanager
    def session_scope(self) -> Generator[Session, None, None]:
        """
        Context manager para sessões com commit/rollback automático.

        Uso:
            with db.session_scope() as session:
                cliente = Cliente(nome='Teste')
                session.add(cliente)
            # Commit automático ao sair do bloco

        Raises:
            Exception: Re-levanta exceção após rollback
        """
        session = self._scoped_session()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            raise e
        finally:
            self._scoped_session.remove()

    def create_tables(self):
        """Cria todas as tabelas definidas nos models."""
        create_all_tables(self._engine)

    def init_database(self, insert_data: bool = True):
        """
        Inicializa banco de dados (cria tabelas e dados iniciais).

        Args:
            insert_data: Se True, insere dados iniciais (tags, pragas, etc)
        """
        self.create_tables()

        if insert_data:
            with self.session_scope() as session:
                insert_initial_data(session)

    # =========================================================================
    # MÉTODOS DE COMPATIBILIDADE COM CÓDIGO LEGADO
    # =========================================================================

    def _get_legacy_connection(self) -> sqlite3.Connection:
        """
        Conexão sqlite3 para código legado.
        DEPRECATED: Use session_scope() para novo código.
        """
        if not self.database_url.startswith('sqlite'):
            raise RuntimeError("Conexão legada só suportada para SQLite")

        if not hasattr(self._legacy_local, 'connection') or self._legacy_local.connection is None:
            db_path = self.database_url.replace('sqlite:///', '')
            self._legacy_local.connection = sqlite3.connect(
                db_path,
                timeout=20,
                check_same_thread=False
            )
            self._legacy_local.connection.row_factory = sqlite3.Row

            # Aplicar PRAGMAs
            for pragma, value in DatabaseConfig.SQLITE_PRAGMAS.items():
                try:
                    self._legacy_local.connection.execute(f'PRAGMA {pragma}={value}')
                except sqlite3.Error:
                    pass

        return self._legacy_local.connection

    @property
    def connection(self) -> sqlite3.Connection:
        """
        DEPRECATED: Use session_scope() para novo código.
        Mantido para compatibilidade com código existente.
        """
        return self._get_legacy_connection()

    def execute(self, sql: str, params: tuple = ()) -> sqlite3.Cursor:
        """
        DEPRECATED: Use session.execute(text(sql)) para novo código.
        Executa query SQL diretamente.
        """
        return self.connection.execute(sql, params)

    def executemany(self, sql: str, params_list: list) -> sqlite3.Cursor:
        """DEPRECATED: Executa query múltiplas vezes."""
        return self.connection.executemany(sql, params_list)

    def fetchone(self, sql: str, params: tuple = ()) -> Optional[sqlite3.Row]:
        """DEPRECATED: Executa query e retorna uma linha."""
        return self.execute(sql, params).fetchone()

    def fetchall(self, sql: str, params: tuple = ()) -> List[sqlite3.Row]:
        """DEPRECATED: Executa query e retorna todas as linhas."""
        return self.execute(sql, params).fetchall()

    def commit(self):
        """DEPRECATED: Confirma transação."""
        self.connection.commit()

    def rollback(self):
        """DEPRECATED: Desfaz transação."""
        self.connection.rollback()

    @contextmanager
    def transaction(self):
        """
        DEPRECATED: Use session_scope() para novo código.
        Context manager para transações.
        """
        conn = self.connection
        try:
            conn.execute("BEGIN")
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e

    def table_exists(self, table_name: str) -> bool:
        """Verifica se tabela existe."""
        if self.database_url.startswith('sqlite'):
            result = self.fetchone(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                (table_name,)
            )
            return result is not None
        else:
            # PostgreSQL
            with self.session_scope() as session:
                result = session.execute(text(
                    "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name=:name)"
                ), {'name': table_name})
                return result.scalar()

    def add_column_if_not_exists(self, table: str, column: str,
                                   column_type: str, default: Any = None):
        """
        DEPRECATED: Migrations devem ser feitas via Alembic.
        Adiciona coluna se não existir (somente SQLite).
        """
        try:
            sql = f'ALTER TABLE {table} ADD COLUMN {column} {column_type}'
            if default is not None:
                sql += f' DEFAULT {default}'
            self.execute(sql)
            self.commit()
        except sqlite3.OperationalError as e:
            if 'duplicate column name' not in str(e).lower():
                print(f"[AVISO] Erro ao adicionar coluna {column}: {e}")

    def close(self):
        """Fecha conexões."""
        if hasattr(self._legacy_local, 'connection') and self._legacy_local.connection:
            self._legacy_local.connection.close()
            self._legacy_local.connection = None

        if self._scoped_session:
            self._scoped_session.remove()

    @classmethod
    def close_all(cls):
        """Fecha todas as instâncias."""
        with cls._lock:
            for instance in cls._instances.values():
                instance.close()
            cls._instances.clear()

    @classmethod
    def get_instance(cls, database_url: str = None) -> 'DatabaseManager':
        """
        Obtém instância do DatabaseManager.

        Args:
            database_url: URL opcional. Se não fornecida, usa DATABASE_URL do ambiente.

        Returns:
            Instância singleton do DatabaseManager
        """
        return cls(database_url)


# =============================================================================
# FUNÇÕES DE CONVENIÊNCIA (COMPATIBILIDADE)
# =============================================================================

# Instância global
_db_manager: Optional[DatabaseManager] = None


def get_db_manager(db_path: str = None) -> DatabaseManager:
    """
    Obtém instância do DatabaseManager.

    NOTA: Para novo código, prefira DatabaseManager.get_instance()

    Args:
        db_path: Caminho para SQLite (opcional). Se fornecido, cria URL sqlite:///

    Returns:
        Instância do DatabaseManager
    """
    global _db_manager

    if db_path:
        # Converter path para URL
        url = f'sqlite:///{db_path}'
        return DatabaseManager(url)

    if _db_manager is None:
        _db_manager = DatabaseManager()

    return _db_manager


def set_main_db_path(db_path: str):
    """
    Define caminho do banco principal.

    DEPRECATED: Configure via variável de ambiente DATABASE_URL.
    """
    global _db_manager
    url = f'sqlite:///{db_path}'
    _db_manager = DatabaseManager(url)


def get_connection(db_path: str) -> sqlite3.Connection:
    """
    DEPRECATED: Use DatabaseManager.session_scope()
    Retorna conexão sqlite3 para compatibilidade.
    """
    return get_db_manager(db_path).connection


@contextmanager
def get_db_context(db_path: str = None):
    """
    DEPRECATED: Use DatabaseManager.session_scope()
    Context manager para uso em módulos externos.
    """
    db = get_db_manager(db_path)
    try:
        yield db
    finally:
        pass


# =============================================================================
# DECORADORES
# =============================================================================

def with_session(func):
    """
    Decorador que injeta sessão SQLAlchemy na função.

    Uso:
        @with_session
        def get_cliente(session, cliente_id):
            return session.query(Cliente).get(cliente_id)
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        db = get_db_manager()
        with db.session_scope() as session:
            return func(session, *args, **kwargs)
    return wrapper


def transactional(func):
    """
    Decorador que executa função dentro de transação.
    Commit automático em sucesso, rollback em exceção.
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        db = get_db_manager()
        with db.session_scope() as session:
            kwargs['session'] = session
            return func(*args, **kwargs)
    return wrapper


# =============================================================================
# INICIALIZAÇÃO
# =============================================================================

def init_database(database_url: str = None, insert_data: bool = True):
    """
    Inicializa o banco de dados.

    Args:
        database_url: URL opcional do banco
        insert_data: Se True, insere dados iniciais

    Uso:
        # No startup da aplicação
        from db_manager import init_database
        init_database()
    """
    db = DatabaseManager.get_instance(database_url)
    db.init_database(insert_data=insert_data)
    print(f"[OK] Banco de dados inicializado: {db.database_url}")
    return db


# =============================================================================
# FLASK INTEGRATION
# =============================================================================

def init_app(app):
    """
    Integração com Flask.

    Uso:
        from db_manager import init_app
        init_app(app)
    """
    db = get_db_manager()

    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db._scoped_session.remove()

    # Criar tabelas no primeiro request
    @app.before_request
    def create_tables():
        if not hasattr(app, '_db_initialized'):
            db.init_database()
            app._db_initialized = True


# =============================================================================
# UTILITÁRIOS
# =============================================================================

def get_database_info() -> Dict[str, Any]:
    """
    Retorna informações sobre o banco de dados.

    Returns:
        Dict com informações de conexão, tabelas, etc.
    """
    db = get_db_manager()
    info = {
        'url': db.database_url,
        'is_sqlite': db.database_url.startswith('sqlite'),
        'tables': []
    }

    if info['is_sqlite']:
        rows = db.fetchall(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        info['tables'] = [row['name'] for row in rows]

        # Tamanho do arquivo
        db_path = db.database_url.replace('sqlite:///', '')
        if os.path.exists(db_path):
            info['size_mb'] = os.path.getsize(db_path) / (1024 * 1024)

    return info


if __name__ == '__main__':
    # Teste de inicialização
    print("Inicializando banco de dados...")
    db = init_database()
    info = get_database_info()
    print(f"Tabelas criadas: {len(info['tables'])}")
    for table in info['tables']:
        print(f"  - {table}")
