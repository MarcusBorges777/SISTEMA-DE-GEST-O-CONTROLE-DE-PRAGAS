#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Módulo centralizado de gerenciamento de conexões com banco de dados SQLite.
Fornece uma interface unificada para todos os módulos do sistema.
"""

import sqlite3
from pathlib import Path
from contextlib import contextmanager
from typing import Optional, Any
import threading


class DatabaseManager:
    """
    Gerenciador centralizado de conexões com banco de dados SQLite.
    Implementa padrão Singleton para garantir uma única instância por banco.
    """

    _instances = {}
    _lock = threading.Lock()

    # Configurações padrão otimizadas para SQLite
    DEFAULT_CONFIG = {
        'timeout': 20,
        'check_same_thread': False,
        'isolation_level': None,  # Autocommit por padrão
    }

    # PRAGMAs otimizados para performance
    PRAGMAS = [
        "PRAGMA journal_mode=WAL",           # Write-Ahead Logging para concorrência
        "PRAGMA synchronous=NORMAL",         # Balanço entre segurança e performance
        "PRAGMA cache_size=-64000",          # 64MB de cache
        "PRAGMA mmap_size=268435456",        # 256MB memory-mapped I/O
        "PRAGMA temp_store=MEMORY",          # Tabelas temporárias em memória
        "PRAGMA busy_timeout=20000",         # 20s timeout para locks
    ]

    def __new__(cls, db_path: str):
        """Implementa Singleton por caminho de banco"""
        with cls._lock:
            if db_path not in cls._instances:
                instance = super().__new__(cls)
                instance._initialized = False
                cls._instances[db_path] = instance
            return cls._instances[db_path]

    def __init__(self, db_path: str):
        if self._initialized:
            return

        self.db_path = Path(db_path)
        self._local = threading.local()
        self._initialized = True

    def _get_connection(self) -> sqlite3.Connection:
        """Obtém conexão thread-local"""
        if not hasattr(self._local, 'connection') or self._local.connection is None:
            self._local.connection = self._create_connection()
        return self._local.connection

    def _create_connection(self) -> sqlite3.Connection:
        """Cria nova conexão otimizada"""
        conn = sqlite3.connect(
            str(self.db_path),
            **self.DEFAULT_CONFIG
        )
        conn.row_factory = sqlite3.Row

        # Aplicar PRAGMAs de otimização
        for pragma in self.PRAGMAS:
            try:
                conn.execute(pragma)
            except sqlite3.Error:
                pass  # Alguns PRAGMAs podem não ser suportados

        return conn

    @property
    def connection(self) -> sqlite3.Connection:
        """Propriedade para acessar a conexão atual"""
        return self._get_connection()

    def execute(self, sql: str, params: tuple = ()) -> sqlite3.Cursor:
        """Executa uma query SQL"""
        return self.connection.execute(sql, params)

    def executemany(self, sql: str, params_list: list) -> sqlite3.Cursor:
        """Executa uma query SQL múltiplas vezes"""
        return self.connection.executemany(sql, params_list)

    def fetchone(self, sql: str, params: tuple = ()) -> Optional[sqlite3.Row]:
        """Executa query e retorna uma linha"""
        return self.execute(sql, params).fetchone()

    def fetchall(self, sql: str, params: tuple = ()) -> list:
        """Executa query e retorna todas as linhas"""
        return self.execute(sql, params).fetchall()

    def commit(self):
        """Confirma transação atual"""
        self.connection.commit()

    def rollback(self):
        """Desfaz transação atual"""
        self.connection.rollback()

    @contextmanager
    def transaction(self):
        """Context manager para transações ACID"""
        conn = self.connection
        try:
            conn.execute("BEGIN")
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e

    def close(self):
        """Fecha a conexão atual"""
        if hasattr(self._local, 'connection') and self._local.connection:
            self._local.connection.close()
            self._local.connection = None

    @classmethod
    def close_all(cls):
        """Fecha todas as conexões (útil para shutdown)"""
        with cls._lock:
            for instance in cls._instances.values():
                instance.close()
            cls._instances.clear()

    def table_exists(self, table_name: str) -> bool:
        """Verifica se uma tabela existe"""
        result = self.fetchone(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            (table_name,)
        )
        return result is not None

    def add_column_if_not_exists(self, table: str, column: str,
                                   column_type: str, default: Any = None):
        """Adiciona coluna se não existir"""
        try:
            sql = f'ALTER TABLE {table} ADD COLUMN {column} {column_type}'
            if default is not None:
                sql += f' DEFAULT {default}'
            self.execute(sql)
            self.commit()
        except sqlite3.OperationalError as e:
            if 'duplicate column name' not in str(e).lower():
                print(f"[AVISO] Erro ao adicionar coluna {column}: {e}")


# Instância global para o banco principal
_main_db: Optional[DatabaseManager] = None


def get_db_manager(db_path: str = None) -> DatabaseManager:
    """
    Obtém o gerenciador de banco de dados.
    Se db_path não for fornecido, usa o banco principal.
    """
    global _main_db

    if db_path:
        return DatabaseManager(db_path)

    if _main_db is None:
        # Caminho padrão do banco principal
        from pathlib import Path
        default_path = Path(__file__).parent / 'database.db'
        _main_db = DatabaseManager(str(default_path))

    return _main_db


def set_main_db_path(db_path: str):
    """Define o caminho do banco principal"""
    global _main_db
    _main_db = DatabaseManager(db_path)


# Funções de compatibilidade com código existente
def get_connection(db_path: str) -> sqlite3.Connection:
    """Função de compatibilidade - retorna conexão SQLite"""
    return DatabaseManager(db_path).connection


@contextmanager
def get_db_context(db_path: str):
    """Context manager para uso em módulos externos"""
    db = DatabaseManager(db_path)
    try:
        yield db
    finally:
        pass  # Conexão é gerenciada pelo DatabaseManager
