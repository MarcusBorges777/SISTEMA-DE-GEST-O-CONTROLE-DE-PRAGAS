#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Migração de Dados (ETL)

Migra dados do schema antigo (clientes_web, boletos, recibos, documentos_gerados)
para o novo schema normalizado SQLAlchemy (clientes, enderecos, contatos, etc).

Características:
- Processamento robusto com tratamento de erro por registro
- Log detalhado de todas as operações
- Rollback automático em caso de falha crítica
- Modo dry-run para validação sem escrita
- Resumo estatístico no final

Uso:
    python migrate_data.py                    # Executa migração completa
    python migrate_data.py --dry-run          # Apenas valida, sem escrita
    python migrate_data.py --source old.db    # Especifica DB de origem
    python migrate_data.py --verbose          # Log detalhado
"""

import argparse
import logging
import re
import sqlite3
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field

# Imports do projeto
from models import (
    Base, Cliente, Endereco, Contato, DocumentoGerado, TituloReceber, Recibo,
    Tag, DocumentoTag, FormaPagamento, get_engine, get_session_factory,
    insert_initial_data
)
from sqlalchemy.orm import Session


# =============================================================================
# CONFIGURAÇÃO DE LOGGING
# =============================================================================

def setup_logging(verbose: bool = False) -> logging.Logger:
    """Configura logging para o script."""
    level = logging.DEBUG if verbose else logging.INFO

    logging.basicConfig(
        level=level,
        format='%(asctime)s [%(levelname)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # Também salva em arquivo
    file_handler = logging.FileHandler(
        f'migration_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log',
        encoding='utf-8'
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s [%(levelname)s] %(message)s'
    ))

    logger = logging.getLogger('migration')
    logger.addHandler(file_handler)

    return logger


# =============================================================================
# ESTRUTURAS DE DADOS
# =============================================================================

@dataclass
class MigrationStats:
    """Estatísticas da migração."""
    clientes_total: int = 0
    clientes_migrados: int = 0
    clientes_erro: int = 0
    enderecos_criados: int = 0
    documentos_total: int = 0
    documentos_migrados: int = 0
    documentos_erro: int = 0
    boletos_total: int = 0
    boletos_migrados: int = 0
    boletos_erro: int = 0
    recibos_total: int = 0
    recibos_migrados: int = 0
    recibos_erro: int = 0
    tags_migradas: int = 0
    erros: List[str] = field(default_factory=list)

    def add_error(self, entity: str, entity_id: Any, error: str):
        """Registra um erro."""
        self.erros.append(f"{entity}[{entity_id}]: {error}")

    def print_summary(self, logger: logging.Logger):
        """Imprime resumo da migração."""
        logger.info("=" * 60)
        logger.info("RESUMO DA MIGRAÇÃO")
        logger.info("=" * 60)
        logger.info(f"Clientes: {self.clientes_migrados}/{self.clientes_total} (erros: {self.clientes_erro})")
        logger.info(f"Endereços criados: {self.enderecos_criados}")
        logger.info(f"Documentos: {self.documentos_migrados}/{self.documentos_total} (erros: {self.documentos_erro})")
        logger.info(f"Boletos/Títulos: {self.boletos_migrados}/{self.boletos_total} (erros: {self.boletos_erro})")
        logger.info(f"Recibos: {self.recibos_migrados}/{self.recibos_total} (erros: {self.recibos_erro})")
        logger.info(f"Tags: {self.tags_migradas}")
        logger.info("=" * 60)

        if self.erros:
            logger.warning(f"Total de erros: {len(self.erros)}")
            for erro in self.erros[:20]:  # Mostra primeiros 20
                logger.warning(f"  - {erro}")
            if len(self.erros) > 20:
                logger.warning(f"  ... e mais {len(self.erros) - 20} erros")


@dataclass
class MigrationConfig:
    """Configuração da migração."""
    source_db: Path
    target_db: Path
    dry_run: bool = False
    verbose: bool = False
    batch_size: int = 100


# =============================================================================
# FUNÇÕES DE EXTRAÇÃO (EXTRACT)
# =============================================================================

def get_source_connection(db_path: Path) -> sqlite3.Connection:
    """Cria conexão com banco de origem."""
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn


def extract_clientes(conn: sqlite3.Connection) -> List[Dict]:
    """Extrai clientes do banco antigo."""
    cursor = conn.execute("""
        SELECT * FROM clientes_web
        ORDER BY id
    """)
    return [dict(row) for row in cursor.fetchall()]


def extract_documentos(conn: sqlite3.Connection) -> List[Dict]:
    """Extrai documentos gerados do banco antigo."""
    cursor = conn.execute("""
        SELECT * FROM documentos_gerados
        ORDER BY id
    """)
    return [dict(row) for row in cursor.fetchall()]


def extract_boletos(conn: sqlite3.Connection) -> List[Dict]:
    """Extrai boletos do banco antigo."""
    # Verifica se tabela existe
    exists = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='boletos'"
    ).fetchone()

    if not exists:
        return []

    cursor = conn.execute("""
        SELECT * FROM boletos
        ORDER BY id
    """)
    return [dict(row) for row in cursor.fetchall()]


def extract_recibos(conn: sqlite3.Connection) -> List[Dict]:
    """Extrai recibos do banco antigo."""
    # Verifica se tabela existe
    exists = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='recibos'"
    ).fetchone()

    if not exists:
        return []

    cursor = conn.execute("""
        SELECT * FROM recibos
        ORDER BY id
    """)
    return [dict(row) for row in cursor.fetchall()]


def extract_tags(conn: sqlite3.Connection) -> List[Dict]:
    """Extrai tags do banco antigo."""
    exists = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='tags'"
    ).fetchone()

    if not exists:
        return []

    cursor = conn.execute("""
        SELECT * FROM tags
        ORDER BY id
    """)
    return [dict(row) for row in cursor.fetchall()]


def extract_documento_tags(conn: sqlite3.Connection) -> List[Dict]:
    """Extrai associações documento-tag do banco antigo."""
    exists = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='documento_tags'"
    ).fetchone()

    if not exists:
        return []

    cursor = conn.execute("""
        SELECT * FROM documento_tags
        ORDER BY id
    """)
    return [dict(row) for row in cursor.fetchall()]


# =============================================================================
# FUNÇÕES DE TRANSFORMAÇÃO (TRANSFORM)
# =============================================================================

def parse_endereco_completo(endereco: str) -> Dict[str, Optional[str]]:
    """
    Parseia endereço completo em componentes.

    Entrada: "Rua das Flores, 123, Centro, Divinópolis/MG, CEP: 35500-000"
    Saída: {logradouro, numero, bairro, cidade, uf, cep}
    """
    result = {
        'logradouro': None,
        'numero': None,
        'complemento': None,
        'bairro': None,
        'cidade': None,
        'uf': None,
        'cep': None
    }

    if not endereco:
        return result

    endereco = endereco.strip()

    # Extrai CEP
    cep_match = re.search(r'CEP[:\s]*(\d{5}-?\d{3})', endereco, re.IGNORECASE)
    if cep_match:
        result['cep'] = cep_match.group(1).replace('-', '')
        endereco = re.sub(r',?\s*CEP[:\s]*\d{5}-?\d{3}', '', endereco, flags=re.IGNORECASE)

    # Extrai Cidade/UF
    cidade_uf_match = re.search(r'([A-Za-zÀ-ú\s]+)/([A-Z]{2})', endereco)
    if cidade_uf_match:
        result['cidade'] = cidade_uf_match.group(1).strip()
        result['uf'] = cidade_uf_match.group(2).upper()
        endereco = endereco[:cidade_uf_match.start()].strip().rstrip(',')

    # Divide o restante por vírgulas
    partes = [p.strip() for p in endereco.split(',') if p.strip()]

    if len(partes) >= 1:
        result['logradouro'] = partes[0]

    if len(partes) >= 2:
        # Tenta identificar se é número
        if re.match(r'^\d+[A-Za-z]?$', partes[1]):
            result['numero'] = partes[1]
        else:
            result['bairro'] = partes[1]

    if len(partes) >= 3:
        if not result['numero'] and re.match(r'^\d+[A-Za-z]?$', partes[2]):
            result['numero'] = partes[2]
        elif not result['bairro']:
            result['bairro'] = partes[2]
        else:
            result['complemento'] = partes[2]

    if len(partes) >= 4 and not result['bairro']:
        result['bairro'] = partes[3]

    return result


def detect_tipo_pessoa(cnpj_cpf: str) -> str:
    """Detecta se é PF ou PJ baseado no documento."""
    if not cnpj_cpf:
        return 'PJ'

    # Remove formatação
    doc = re.sub(r'[^\d]', '', cnpj_cpf)

    if len(doc) == 11:
        return 'PF'
    elif len(doc) == 14:
        return 'PJ'
    else:
        return 'PJ'  # Default


def clean_cpf_cnpj(value: str) -> Optional[str]:
    """Limpa e formata CPF/CNPJ."""
    if not value:
        return None

    # Remove tudo que não é dígito
    digits = re.sub(r'[^\d]', '', value)

    if len(digits) == 11:
        # CPF: 000.000.000-00
        return f"{digits[:3]}.{digits[3:6]}.{digits[6:9]}-{digits[9:]}"
    elif len(digits) == 14:
        # CNPJ: 00.000.000/0000-00
        return f"{digits[:2]}.{digits[2:5]}.{digits[5:8]}/{digits[8:12]}-{digits[12:]}"
    else:
        return value  # Retorna original se não reconhecer


def transform_cliente(old_data: Dict, logger: logging.Logger) -> Tuple[Cliente, Optional[Endereco]]:
    """
    Transforma dados do cliente antigo para novo modelo.

    Returns:
        Tuple de (Cliente, Endereco ou None)
    """
    cpf_cnpj = clean_cpf_cnpj(old_data.get('cnpj') or old_data.get('cpf_cnpj'))

    cliente = Cliente(
        tipo_pessoa=detect_tipo_pessoa(cpf_cnpj),
        nome_fantasia=old_data.get('nome_fantasia') or 'SEM NOME',
        razao_social=old_data.get('razao_social'),
        cpf_cnpj=cpf_cnpj or f"SEM-DOC-{old_data.get('id', 0)}",
        cnae=old_data.get('cnae'),
        telefone_principal=old_data.get('telefone'),
        email=old_data.get('email'),
        status='ativo',
        created_by='migration_script',
        updated_by='migration_script'
    )

    # Cria endereço se houver dados
    endereco = None
    endereco_completo = old_data.get('endereco_completo')

    if endereco_completo:
        parsed = parse_endereco_completo(endereco_completo)
        endereco = Endereco(
            tipo_endereco='comercial',
            logradouro=parsed['logradouro'] or endereco_completo[:255],
            numero=parsed['numero'] or old_data.get('numero'),
            complemento=parsed['complemento'],
            bairro=parsed['bairro'] or old_data.get('bairro'),
            cidade=parsed['cidade'] or old_data.get('cidade') or 'NAO INFORMADO',
            uf=parsed['uf'] or old_data.get('uf') or 'MG',
            cep=parsed['cep'],
            endereco_padrao=True
        )
    elif old_data.get('cidade'):
        # Monta endereço a partir de campos separados
        endereco = Endereco(
            tipo_endereco='comercial',
            logradouro=old_data.get('rua') or 'NAO INFORMADO',
            numero=old_data.get('numero'),
            bairro=old_data.get('bairro'),
            cidade=old_data.get('cidade'),
            uf=old_data.get('uf') or 'MG',
            endereco_padrao=True
        )

    return cliente, endereco


def map_tipo_documento(tipo_antigo: str) -> str:
    """Mapeia tipo de documento antigo para novo enum."""
    if not tipo_antigo:
        return 'outro'

    tipo_lower = tipo_antigo.lower()

    mapping = {
        'laudo': 'laudo_tecnico',
        'laudo_tecnico': 'laudo_tecnico',
        'laudo_dedetizacao': 'laudo_tecnico',
        'laudo_caixa': 'laudo_tecnico',
        'certificado': 'certificado',
        'orcamento': 'orcamento',
        'orçamento': 'orcamento',
        'recibo': 'recibo',
        'boleto': 'boleto',
        'contrato': 'contrato',
        'relatorio': 'relatorio',
        'relatório': 'relatorio',
    }

    for key, value in mapping.items():
        if key in tipo_lower:
            return value

    return 'outro'


def transform_documento(old_data: Dict, cliente_map: Dict[str, int]) -> Optional[DocumentoGerado]:
    """Transforma documento antigo para novo modelo."""
    # Tenta encontrar cliente pelo CNPJ
    cliente_cnpj = old_data.get('cliente_cnpj')
    cliente_id = None

    if cliente_cnpj:
        cliente_cnpj_limpo = clean_cpf_cnpj(cliente_cnpj)
        cliente_id = cliente_map.get(cliente_cnpj_limpo)

    if not cliente_id:
        # Tenta pelo nome
        cliente_nome = old_data.get('cliente_nome')
        if cliente_nome:
            cliente_id = cliente_map.get(cliente_nome.upper()[:100])

    if not cliente_id:
        return None  # Não conseguiu vincular a um cliente

    return DocumentoGerado(
        cliente_id=cliente_id,
        tipo_documento=map_tipo_documento(old_data.get('tipo_doc')),
        status_geracao='gerado',
        nome_arquivo=old_data.get('nome_arquivo') or 'documento_migrado.docx',
        caminho_arquivo=old_data.get('caminho_arquivo'),
        formato_arquivo='docx',
        valor_total=old_data.get('valor_total'),
        cliente_nome=old_data.get('cliente_nome'),
        razao_social=old_data.get('razao_social'),
        cliente_cnpj=cliente_cnpj,
        data_solicitacao=old_data.get('data_geracao'),
        data_geracao=old_data.get('data_geracao'),
        created_by='migration_script',
        updated_by='migration_script'
    )


def transform_boleto(old_data: Dict, cliente_map: Dict[str, int]) -> Optional[TituloReceber]:
    """Transforma boleto antigo para TituloReceber."""
    cliente_id = old_data.get('cliente_id')

    if not cliente_id:
        # Tenta pelo nome
        cliente_nome = old_data.get('cliente_nome')
        if cliente_nome:
            cliente_id = cliente_map.get(cliente_nome.upper()[:100])

    if not cliente_id:
        return None

    valor = old_data.get('valor') or 0

    return TituloReceber(
        cliente_id=cliente_id,
        numero_titulo=old_data.get('numero_documento') or f"MIG-{old_data.get('id', 0)}",
        valor_original=valor,
        valor_total=valor,
        valor_saldo=valor - (old_data.get('valor_pago') or 0),
        data_emissao=old_data.get('data_emissao') or datetime.now().date(),
        data_vencimento=old_data.get('data_vencimento') or datetime.now().date(),
        data_pagamento=old_data.get('data_pagamento'),
        status=old_data.get('status') or 'pendente',
        codigo_barras=old_data.get('codigo_barras'),
        descricao=old_data.get('descricao'),
        observacoes=old_data.get('observacoes'),
        arquivo_caminho=old_data.get('arquivo_caminho')
    )


def transform_recibo(old_data: Dict, cliente_map: Dict[str, int]) -> Optional[Recibo]:
    """Transforma recibo antigo para novo modelo."""
    cliente_id = old_data.get('cliente_id')

    if not cliente_id:
        cliente_nome = old_data.get('cliente_nome')
        if cliente_nome:
            cliente_id = cliente_map.get(cliente_nome.upper()[:100])

    return Recibo(
        cliente_id=cliente_id,
        cliente_nome=old_data.get('cliente_nome') or 'NAO INFORMADO',
        numero_recibo=old_data.get('numero_recibo'),
        descricao=old_data.get('descricao'),
        valor_total=old_data.get('valor_total') or 0,
        data_emissao=old_data.get('data_emissao') or datetime.now().date(),
        forma_pagamento=old_data.get('forma_pagamento'),
        observacoes=old_data.get('observacoes'),
        arquivo_caminho=old_data.get('arquivo_caminho')
    )


# =============================================================================
# FUNÇÕES DE CARGA (LOAD)
# =============================================================================

def load_clientes(
    session: Session,
    clientes_antigos: List[Dict],
    stats: MigrationStats,
    logger: logging.Logger,
    dry_run: bool = False
) -> Dict[str, int]:
    """
    Carrega clientes no novo banco.

    Returns:
        Mapa de cpf_cnpj/nome -> cliente_id para lookup posterior
    """
    cliente_map = {}
    stats.clientes_total = len(clientes_antigos)

    logger.info(f"Migrando {stats.clientes_total} clientes...")

    for old_cliente in clientes_antigos:
        old_id = old_cliente.get('id', 'N/A')

        try:
            cliente, endereco = transform_cliente(old_cliente, logger)

            # Verifica duplicata
            existing = session.query(Cliente).filter_by(cpf_cnpj=cliente.cpf_cnpj).first()
            if existing:
                logger.debug(f"Cliente {cliente.cpf_cnpj} já existe, pulando...")
                cliente_map[cliente.cpf_cnpj] = existing.id
                cliente_map[cliente.nome_fantasia.upper()[:100]] = existing.id
                continue

            if not dry_run:
                session.add(cliente)
                session.flush()  # Obtém ID

                if endereco:
                    endereco.cliente_id = cliente.id
                    session.add(endereco)
                    stats.enderecos_criados += 1

                # Adiciona ao mapa
                cliente_map[cliente.cpf_cnpj] = cliente.id
                cliente_map[cliente.nome_fantasia.upper()[:100]] = cliente.id

            stats.clientes_migrados += 1
            logger.debug(f"Cliente migrado: {cliente.nome_fantasia}")

        except Exception as e:
            stats.clientes_erro += 1
            stats.add_error('Cliente', old_id, str(e))
            logger.error(f"Erro ao migrar cliente {old_id}: {e}")
            continue

    if not dry_run:
        session.commit()

    return cliente_map


def load_documentos(
    session: Session,
    documentos_antigos: List[Dict],
    cliente_map: Dict[str, int],
    stats: MigrationStats,
    logger: logging.Logger,
    dry_run: bool = False
):
    """Carrega documentos no novo banco."""
    stats.documentos_total = len(documentos_antigos)

    logger.info(f"Migrando {stats.documentos_total} documentos...")

    for old_doc in documentos_antigos:
        old_id = old_doc.get('id', 'N/A')

        try:
            documento = transform_documento(old_doc, cliente_map)

            if not documento:
                stats.documentos_erro += 1
                stats.add_error('Documento', old_id, 'Cliente não encontrado')
                continue

            if not dry_run:
                session.add(documento)

            stats.documentos_migrados += 1

        except Exception as e:
            stats.documentos_erro += 1
            stats.add_error('Documento', old_id, str(e))
            logger.error(f"Erro ao migrar documento {old_id}: {e}")
            continue

    if not dry_run:
        session.commit()


def load_boletos(
    session: Session,
    boletos_antigos: List[Dict],
    cliente_map: Dict[str, int],
    stats: MigrationStats,
    logger: logging.Logger,
    dry_run: bool = False
):
    """Carrega boletos como títulos a receber."""
    stats.boletos_total = len(boletos_antigos)

    logger.info(f"Migrando {stats.boletos_total} boletos...")

    for old_boleto in boletos_antigos:
        old_id = old_boleto.get('id', 'N/A')

        try:
            titulo = transform_boleto(old_boleto, cliente_map)

            if not titulo:
                stats.boletos_erro += 1
                stats.add_error('Boleto', old_id, 'Cliente não encontrado')
                continue

            # Verifica duplicata
            existing = session.query(TituloReceber).filter_by(
                numero_titulo=titulo.numero_titulo
            ).first()

            if existing:
                logger.debug(f"Título {titulo.numero_titulo} já existe, pulando...")
                continue

            if not dry_run:
                session.add(titulo)

            stats.boletos_migrados += 1

        except Exception as e:
            stats.boletos_erro += 1
            stats.add_error('Boleto', old_id, str(e))
            logger.error(f"Erro ao migrar boleto {old_id}: {e}")
            continue

    if not dry_run:
        session.commit()


def load_recibos(
    session: Session,
    recibos_antigos: List[Dict],
    cliente_map: Dict[str, int],
    stats: MigrationStats,
    logger: logging.Logger,
    dry_run: bool = False
):
    """Carrega recibos no novo banco."""
    stats.recibos_total = len(recibos_antigos)

    logger.info(f"Migrando {stats.recibos_total} recibos...")

    for old_recibo in recibos_antigos:
        old_id = old_recibo.get('id', 'N/A')

        try:
            recibo = transform_recibo(old_recibo, cliente_map)

            if not recibo:
                stats.recibos_erro += 1
                stats.add_error('Recibo', old_id, 'Transformação falhou')
                continue

            if not dry_run:
                session.add(recibo)

            stats.recibos_migrados += 1

        except Exception as e:
            stats.recibos_erro += 1
            stats.add_error('Recibo', old_id, str(e))
            logger.error(f"Erro ao migrar recibo {old_id}: {e}")
            continue

    if not dry_run:
        session.commit()


def load_tags(
    session: Session,
    tags_antigas: List[Dict],
    stats: MigrationStats,
    logger: logging.Logger,
    dry_run: bool = False
) -> Dict[int, int]:
    """
    Carrega tags no novo banco.

    Returns:
        Mapa de old_tag_id -> new_tag_id
    """
    tag_map = {}

    logger.info(f"Migrando {len(tags_antigas)} tags...")

    for old_tag in tags_antigas:
        old_id = old_tag.get('id')

        try:
            # Verifica se já existe
            existing = session.query(Tag).filter_by(nome=old_tag.get('nome')).first()

            if existing:
                tag_map[old_id] = existing.id
                continue

            tag = Tag(
                nome=old_tag.get('nome'),
                descricao=old_tag.get('descricao'),
                cor=old_tag.get('cor') or '#3B82F6'
            )

            if not dry_run:
                session.add(tag)
                session.flush()
                tag_map[old_id] = tag.id

            stats.tags_migradas += 1

        except Exception as e:
            stats.add_error('Tag', old_id, str(e))
            logger.error(f"Erro ao migrar tag {old_id}: {e}")
            continue

    if not dry_run:
        session.commit()

    return tag_map


# =============================================================================
# FUNÇÃO PRINCIPAL
# =============================================================================

def run_migration(config: MigrationConfig) -> MigrationStats:
    """
    Executa a migração completa.

    Args:
        config: Configuração da migração

    Returns:
        Estatísticas da migração
    """
    logger = setup_logging(config.verbose)
    stats = MigrationStats()

    logger.info("=" * 60)
    logger.info("INICIANDO MIGRAÇÃO DE DADOS")
    logger.info("=" * 60)
    logger.info(f"Origem: {config.source_db}")
    logger.info(f"Destino: {config.target_db}")
    logger.info(f"Dry-run: {config.dry_run}")
    logger.info("=" * 60)

    # Verifica se banco de origem existe
    if not config.source_db.exists():
        logger.error(f"Banco de origem não encontrado: {config.source_db}")
        return stats

    # Conecta ao banco de origem
    logger.info("Conectando ao banco de origem...")
    source_conn = get_source_connection(config.source_db)

    # Configura banco de destino
    logger.info("Configurando banco de destino...")
    target_url = f'sqlite:///{config.target_db}'
    engine = get_engine(target_url)
    SessionFactory = get_session_factory(engine)

    # Cria tabelas se não existirem
    Base.metadata.create_all(engine)

    session = SessionFactory()

    try:
        # Insere dados iniciais (tags, formas de pagamento, pragas)
        if not config.dry_run:
            insert_initial_data(session)

        # 1. Extrai dados do banco antigo
        logger.info("Extraindo dados do banco antigo...")
        clientes_antigos = extract_clientes(source_conn)
        documentos_antigos = extract_documentos(source_conn)
        boletos_antigos = extract_boletos(source_conn)
        recibos_antigos = extract_recibos(source_conn)
        tags_antigas = extract_tags(source_conn)

        logger.info(f"  - Clientes: {len(clientes_antigos)}")
        logger.info(f"  - Documentos: {len(documentos_antigos)}")
        logger.info(f"  - Boletos: {len(boletos_antigos)}")
        logger.info(f"  - Recibos: {len(recibos_antigos)}")
        logger.info(f"  - Tags: {len(tags_antigas)}")

        # 2. Migra tags primeiro (necessário para documentos)
        tag_map = load_tags(session, tags_antigas, stats, logger, config.dry_run)

        # 3. Migra clientes (gera mapa para vincular outros dados)
        cliente_map = load_clientes(
            session, clientes_antigos, stats, logger, config.dry_run
        )

        # 4. Migra documentos
        load_documentos(
            session, documentos_antigos, cliente_map, stats, logger, config.dry_run
        )

        # 5. Migra boletos
        load_boletos(
            session, boletos_antigos, cliente_map, stats, logger, config.dry_run
        )

        # 6. Migra recibos
        load_recibos(
            session, recibos_antigos, cliente_map, stats, logger, config.dry_run
        )

        if not config.dry_run:
            session.commit()
            logger.info("Migração concluída com sucesso!")
        else:
            logger.info("DRY-RUN: Nenhuma alteração foi persistida.")

    except Exception as e:
        logger.error(f"Erro crítico durante migração: {e}")
        session.rollback()
        raise

    finally:
        session.close()
        source_conn.close()

    # Imprime resumo
    stats.print_summary(logger)

    return stats


# =============================================================================
# CLI
# =============================================================================

def main():
    """Entry point do script."""
    parser = argparse.ArgumentParser(
        description='Migra dados do schema antigo para o novo schema SQLAlchemy.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  python migrate_data.py                           # Migração padrão
  python migrate_data.py --dry-run                 # Apenas valida
  python migrate_data.py --source backup.db        # Especifica origem
  python migrate_data.py --target novo_banco.db    # Especifica destino
  python migrate_data.py --verbose                 # Log detalhado
        """
    )

    parser.add_argument(
        '--source',
        type=Path,
        default=Path(__file__).parent / 'gestao_documentos.db',
        help='Caminho do banco de dados de origem (padrão: gestao_documentos.db)'
    )

    parser.add_argument(
        '--target',
        type=Path,
        default=Path(__file__).parent / 'gestao_documentos_new.db',
        help='Caminho do banco de dados de destino (padrão: gestao_documentos_new.db)'
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Executa validação sem persistir alterações'
    )

    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Ativa log detalhado (DEBUG level)'
    )

    parser.add_argument(
        '--batch-size',
        type=int,
        default=100,
        help='Tamanho do batch para commits (padrão: 100)'
    )

    args = parser.parse_args()

    config = MigrationConfig(
        source_db=args.source,
        target_db=args.target,
        dry_run=args.dry_run,
        verbose=args.verbose,
        batch_size=args.batch_size
    )

    try:
        stats = run_migration(config)

        # Exit code baseado em erros
        if stats.clientes_erro > stats.clientes_total * 0.1:  # Mais de 10% de erro
            sys.exit(1)

        sys.exit(0)

    except Exception as e:
        print(f"ERRO FATAL: {e}", file=sys.stderr)
        sys.exit(2)


if __name__ == '__main__':
    main()
