#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Models SQLAlchemy - Schema Unificado do ERP de Gestão de Ordens de Serviço.

Este módulo define o schema normalizado do banco de dados, compatível com:
- SQLite (desenvolvimento)
- PostgreSQL (produção no Azure)

Convenções:
- Todas as tabelas possuem campos de auditoria (created_at, updated_at)
- Foreign Keys com ON DELETE apropriado para cada caso de uso
- Índices otimizados para queries frequentes
- Tipos de dados compatíveis entre SQLite e PostgreSQL
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from enum import Enum

from sqlalchemy import (
    create_engine, Column, Integer, String, Text, Boolean,
    DateTime, Date, Numeric, ForeignKey, Index, CheckConstraint, UniqueConstraint,
    event, JSON
)
from sqlalchemy.orm import (
    declarative_base, relationship, sessionmaker, Session
)
from sqlalchemy.sql import func

# Nota: Usamos Integer em vez de Integer para compatibilidade SQLite.
# SQLite requer INTEGER PRIMARY KEY para AUTOINCREMENT funcionar.
# Em PostgreSQL, Integer é suficiente para a maioria dos casos.
# Para tabelas muito grandes (>2 bilhões de registros), usar Integer.

# Base declarativa para todos os models
Base = declarative_base()


# =============================================================================
# MIXINS DE AUDITORIA
# =============================================================================

class AuditMixin:
    """Mixin com campos de auditoria padrão para todas as tabelas."""
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)


class UserAuditMixin(AuditMixin):
    """Mixin com campos de auditoria incluindo usuário responsável."""
    created_by = Column(String(100), nullable=True)
    updated_by = Column(String(100), nullable=True)


# =============================================================================
# ENUMS
# =============================================================================

class TipoPessoa(str, Enum):
    PF = 'PF'
    PJ = 'PJ'


class StatusCliente(str, Enum):
    ATIVO = 'ativo'
    INATIVO = 'inativo'
    BLOQUEADO = 'bloqueado'


class TipoEndereco(str, Enum):
    COMERCIAL = 'comercial'
    RESIDENCIAL = 'residencial'
    ENTREGA = 'entrega'
    COBRANCA = 'cobranca'
    SERVICO = 'servico'


class CategoriaServico(str, Enum):
    CONTROLE_PRAGAS = 'controle_pragas'
    LIMPEZA = 'limpeza'
    MANUTENCAO = 'manutencao'
    INSTALACAO = 'instalacao'
    CONSULTORIA = 'consultoria'
    OUTRO = 'outro'


class UnidadeMedida(str, Enum):
    M2 = 'm2'
    UNIDADE = 'unidade'
    HORA = 'hora'
    SERVICO = 'servico'
    KG = 'kg'
    LITRO = 'litro'
    CAIXA = 'caixa'
    PACOTE = 'pacote'


class TipoProduto(str, Enum):
    PRODUTO_FINAL = 'produto_final'
    INSUMO = 'insumo'
    EPI = 'epi'
    EQUIPAMENTO = 'equipamento'


class CategoriaPraga(str, Enum):
    INSETO = 'inseto'
    ROEDOR = 'roedor'
    AVE = 'ave'
    OUTRO = 'outro'


class NivelRisco(str, Enum):
    BAIXO = 'baixo'
    MEDIO = 'medio'
    ALTO = 'alto'
    CRITICO = 'critico'


class StatusOS(str, Enum):
    RASCUNHO = 'rascunho'
    AGUARDANDO_APROVACAO = 'aguardando_aprovacao'
    APROVADA = 'aprovada'
    AGENDADA = 'agendada'
    EM_EXECUCAO = 'em_execucao'
    AGUARDANDO_PAGAMENTO = 'aguardando_pagamento'
    CONCLUIDA = 'concluida'
    CANCELADA = 'cancelada'


class Prioridade(str, Enum):
    BAIXA = 'baixa'
    NORMAL = 'normal'
    ALTA = 'alta'
    URGENTE = 'urgente'


class TipoDocumento(str, Enum):
    LAUDO_TECNICO = 'laudo_tecnico'
    CERTIFICADO = 'certificado'
    INSTRUCOES_PREVIAS = 'instrucoes_previas'
    ORCAMENTO = 'orcamento'
    RECIBO = 'recibo'
    BOLETO = 'boleto'
    CONTRATO = 'contrato'
    RELATORIO = 'relatorio'
    OUTRO = 'outro'


class StatusDocumento(str, Enum):
    AGUARDANDO = 'aguardando'
    PROCESSANDO = 'processando'
    GERADO = 'gerado'
    ERRO = 'erro'
    CANCELADO = 'cancelado'


class FormatoArquivo(str, Enum):
    DOCX = 'docx'
    PDF = 'pdf'


class StatusTitulo(str, Enum):
    PENDENTE = 'pendente'
    PAGO_PARCIAL = 'pago_parcial'
    PAGO = 'pago'
    VENCIDO = 'vencido'
    CANCELADO = 'cancelado'


class TipoPagamento(str, Enum):
    DINHEIRO = 'dinheiro'
    PIX = 'pix'
    CARTAO_CREDITO = 'cartao_credito'
    CARTAO_DEBITO = 'cartao_debito'
    BOLETO = 'boleto'
    TRANSFERENCIA = 'transferencia'


class TipoEvento(str, Enum):
    LIGACAO = 'ligacao'
    EMAIL = 'email'
    VISITA = 'visita'
    OS = 'os'
    RECLAMACAO = 'reclamacao'
    ELOGIO = 'elogio'
    OUTRO = 'outro'


class OrigemOS(str, Enum):
    WEB = 'web'
    APP = 'app'
    API = 'api'
    WHATSAPP = 'whatsapp'
    TELEFONE = 'telefone'


class Periodicidade(str, Enum):
    UNICO = 'unico'
    MENSAL = 'mensal'
    BIMESTRAL = 'bimestral'
    TRIMESTRAL = 'trimestral'
    SEMESTRAL = 'semestral'
    ANUAL = 'anual'


class NivelInfestacao(str, Enum):
    AUSENTE = 'ausente'
    BAIXO = 'baixo'
    MEDIO = 'medio'
    ALTO = 'alto'
    CRITICO = 'critico'


# =============================================================================
# 1. MÓDULO DE CLIENTES
# =============================================================================

class Cliente(Base, UserAuditMixin):
    """
    Tabela de clientes (PF e PJ).
    Migrada de clientes_web com normalização de endereços e contatos.
    """
    __tablename__ = 'clientes'

    id = Column(Integer, primary_key=True, autoincrement=True)
    tipo_pessoa = Column(String(2), nullable=False, default='PJ')
    nome_fantasia = Column(String(255), nullable=False, index=True)
    razao_social = Column(String(255), nullable=True)
    cpf_cnpj = Column(String(18), nullable=False, unique=True, index=True)
    cnae = Column(String(10), nullable=True, index=True)
    inscricao_estadual = Column(String(20), nullable=True)
    inscricao_municipal = Column(String(20), nullable=True)
    telefone_principal = Column(String(20), nullable=True)
    telefone_secundario = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    site = Column(String(255), nullable=True)
    observacoes = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default='ativo', index=True)

    # Relacionamentos
    enderecos = relationship('Endereco', back_populates='cliente', cascade='all, delete-orphan')
    contatos = relationship('Contato', back_populates='cliente', cascade='all, delete-orphan')
    historico = relationship('HistoricoCliente', back_populates='cliente', cascade='all, delete-orphan')
    ordens_servico = relationship('OrdemServico', back_populates='cliente')
    documentos = relationship('DocumentoGerado', back_populates='cliente')
    titulos = relationship('TituloReceber', back_populates='cliente')
    recibos = relationship('Recibo', back_populates='cliente')

    __table_args__ = (
        CheckConstraint("tipo_pessoa IN ('PF', 'PJ')", name='ck_cliente_tipo_pessoa'),
        CheckConstraint("status IN ('ativo', 'inativo', 'bloqueado')", name='ck_cliente_status'),
        Index('idx_clientes_nome_status', 'nome_fantasia', 'status'),
    )

    def __repr__(self):
        return f"<Cliente(id={self.id}, nome='{self.nome_fantasia}', cnpj='{self.cpf_cnpj}')>"

    @property
    def endereco_principal(self) -> Optional['Endereco']:
        """Retorna o endereço marcado como padrão ou o primeiro disponível."""
        for end in self.enderecos:
            if end.endereco_padrao:
                return end
        return self.enderecos[0] if self.enderecos else None

    @property
    def contato_principal(self) -> Optional['Contato']:
        """Retorna o contato marcado como principal ou o primeiro disponível."""
        for cont in self.contatos:
            if cont.contato_principal:
                return cont
        return self.contatos[0] if self.contatos else None


class Endereco(Base, AuditMixin):
    """
    Endereços dos clientes (normalizado).
    Um cliente pode ter múltiplos endereços (comercial, entrega, etc).
    """
    __tablename__ = 'enderecos'

    id = Column(Integer, primary_key=True, autoincrement=True)
    cliente_id = Column(Integer, ForeignKey('clientes.id', ondelete='CASCADE'), nullable=False, index=True)
    tipo_endereco = Column(String(20), nullable=False, default='comercial')
    cep = Column(String(9), nullable=True)
    logradouro = Column(String(255), nullable=False)
    numero = Column(String(20), nullable=True)
    complemento = Column(String(100), nullable=True)
    bairro = Column(String(100), nullable=True)
    cidade = Column(String(100), nullable=False, index=True)
    uf = Column(String(2), nullable=False)
    pais = Column(String(50), nullable=True, default='Brasil')
    referencia = Column(Text, nullable=True)
    endereco_padrao = Column(Boolean, nullable=False, default=False)
    latitude = Column(Numeric(10, 8), nullable=True)
    longitude = Column(Numeric(11, 8), nullable=True)

    # Relacionamentos
    cliente = relationship('Cliente', back_populates='enderecos')
    ordens_servico = relationship('OrdemServico', back_populates='endereco')

    __table_args__ = (
        CheckConstraint(
            "tipo_endereco IN ('comercial', 'residencial', 'entrega', 'cobranca', 'servico')",
            name='ck_endereco_tipo'
        ),
        Index('idx_enderecos_cidade_uf', 'cidade', 'uf'),
    )

    def __repr__(self):
        return f"<Endereco(id={self.id}, tipo='{self.tipo_endereco}', cidade='{self.cidade}')>"

    @property
    def endereco_completo(self) -> str:
        """Retorna o endereço formatado em uma única string."""
        partes = [self.logradouro]
        if self.numero:
            partes.append(self.numero)
        if self.complemento:
            partes.append(self.complemento)
        if self.bairro:
            partes.append(self.bairro)
        partes.append(f"{self.cidade}/{self.uf}")
        if self.cep:
            partes.append(f"CEP: {self.cep}")
        return ', '.join(partes)


class Contato(Base, AuditMixin):
    """
    Contatos dos clientes.
    Permite múltiplos contatos por cliente com diferentes responsabilidades.
    """
    __tablename__ = 'contatos'

    id = Column(Integer, primary_key=True, autoincrement=True)
    cliente_id = Column(Integer, ForeignKey('clientes.id', ondelete='CASCADE'), nullable=False, index=True)
    nome = Column(String(255), nullable=False)
    cargo = Column(String(100), nullable=True)
    departamento = Column(String(100), nullable=True)
    email = Column(String(255), nullable=True, index=True)
    telefone = Column(String(20), nullable=True)
    celular = Column(String(20), nullable=True)
    whatsapp = Column(String(20), nullable=True)
    contato_principal = Column(Boolean, nullable=False, default=False)
    recebe_notificacao_os = Column(Boolean, nullable=False, default=True)
    recebe_notificacao_financeiro = Column(Boolean, nullable=False, default=False)

    # Relacionamentos
    cliente = relationship('Cliente', back_populates='contatos')
    ordens_servico = relationship('OrdemServico', back_populates='contato')

    def __repr__(self):
        return f"<Contato(id={self.id}, nome='{self.nome}', principal={self.contato_principal})>"


class HistoricoCliente(Base):
    """
    Histórico de relacionamento com o cliente.
    Registra ligações, visitas, reclamações, elogios, etc.
    """
    __tablename__ = 'historico_cliente'

    id = Column(Integer, primary_key=True, autoincrement=True)
    cliente_id = Column(Integer, ForeignKey('clientes.id', ondelete='CASCADE'), nullable=False)
    tipo_evento = Column(String(20), nullable=False)
    descricao = Column(Text, nullable=False)
    usuario_responsavel = Column(String(100), nullable=True)
    data_evento = Column(DateTime, default=func.now(), nullable=False)

    # Relacionamentos
    cliente = relationship('Cliente', back_populates='historico')

    __table_args__ = (
        CheckConstraint(
            "tipo_evento IN ('ligacao', 'email', 'visita', 'os', 'reclamacao', 'elogio', 'outro')",
            name='ck_historico_tipo_evento'
        ),
        Index('idx_historico_cliente_data', 'cliente_id', 'data_evento'),
    )


# =============================================================================
# 2. MÓDULO DE SERVIÇOS E PRODUTOS
# =============================================================================

class Servico(Base, AuditMixin):
    """
    Catálogo de serviços oferecidos.
    """
    __tablename__ = 'servicos'

    id = Column(Integer, primary_key=True, autoincrement=True)
    codigo = Column(String(50), nullable=False, unique=True, index=True)
    nome = Column(String(255), nullable=False)
    categoria = Column(String(50), nullable=False, index=True)
    subcategoria = Column(String(100), nullable=True)
    descricao = Column(Text, nullable=True)
    unidade_medida = Column(String(20), nullable=False, default='servico')
    preco_base = Column(Numeric(10, 2), nullable=False)
    custo_estimado = Column(Numeric(10, 2), nullable=True)
    tempo_estimado_minutos = Column(Integer, nullable=True)
    status = Column(String(20), nullable=False, default='ativo', index=True)
    requer_agendamento = Column(Boolean, nullable=False, default=True)
    permite_desconto = Column(Boolean, nullable=False, default=True)
    desconto_maximo_percentual = Column(Numeric(5, 2), nullable=True, default=10.00)

    # Relacionamentos
    os_servicos = relationship('OSServico', back_populates='servico')

    __table_args__ = (
        CheckConstraint(
            "categoria IN ('controle_pragas', 'limpeza', 'manutencao', 'instalacao', 'consultoria', 'outro')",
            name='ck_servico_categoria'
        ),
        CheckConstraint(
            "unidade_medida IN ('m2', 'unidade', 'hora', 'servico', 'kg', 'litro')",
            name='ck_servico_unidade'
        ),
        CheckConstraint("status IN ('ativo', 'inativo')", name='ck_servico_status'),
    )


class Produto(Base, AuditMixin):
    """
    Produtos e insumos utilizados nos serviços.
    """
    __tablename__ = 'produtos'

    id = Column(Integer, primary_key=True, autoincrement=True)
    codigo = Column(String(50), nullable=False, unique=True, index=True)
    nome = Column(String(255), nullable=False)
    tipo_produto = Column(String(30), nullable=False, index=True)
    categoria = Column(String(100), nullable=True)
    fabricante = Column(String(100), nullable=True)
    unidade_medida = Column(String(20), nullable=False)
    quantidade_estoque = Column(Numeric(10, 3), nullable=False, default=0)
    estoque_minimo = Column(Numeric(10, 3), nullable=True)
    preco_custo = Column(Numeric(10, 2), nullable=True)
    preco_venda = Column(Numeric(10, 2), nullable=True)
    ncm = Column(String(10), nullable=True)
    registro_anvisa = Column(String(50), nullable=True)
    data_validade = Column(Date, nullable=True)
    lote = Column(String(50), nullable=True)
    status = Column(String(20), nullable=False, default='ativo')
    ficha_tecnica = Column(Text, nullable=True)

    # Relacionamentos
    os_produtos = relationship('OSProduto', back_populates='produto')

    __table_args__ = (
        CheckConstraint(
            "tipo_produto IN ('produto_final', 'insumo', 'epi', 'equipamento')",
            name='ck_produto_tipo'
        ),
        CheckConstraint(
            "unidade_medida IN ('kg', 'litro', 'unidade', 'caixa', 'pacote')",
            name='ck_produto_unidade'
        ),
        Index('idx_produtos_estoque', 'quantidade_estoque'),
    )


class Praga(Base):
    """
    Cadastro de pragas para identificação em serviços.
    """
    __tablename__ = 'pragas'

    id = Column(Integer, primary_key=True, autoincrement=True)
    nome_cientifico = Column(String(255), nullable=True)
    nome_popular = Column(String(255), nullable=False, index=True)
    categoria = Column(String(20), nullable=False, index=True)
    nivel_risco = Column(String(20), nullable=False, default='medio')
    descricao = Column(Text, nullable=True)
    tratamento_recomendado = Column(Text, nullable=True)
    produtos_recomendados = Column(JSON, nullable=True)
    foto_url = Column(String(500), nullable=True)

    # Relacionamentos
    os_pragas = relationship('OSPraga', back_populates='praga')

    __table_args__ = (
        CheckConstraint(
            "categoria IN ('inseto', 'roedor', 'ave', 'outro')",
            name='ck_praga_categoria'
        ),
        CheckConstraint(
            "nivel_risco IN ('baixo', 'medio', 'alto', 'critico')",
            name='ck_praga_nivel_risco'
        ),
    )


class TemplateServico(Base, AuditMixin):
    """
    Templates pré-configurados de serviços.
    """
    __tablename__ = 'templates_servico'

    id = Column(Integer, primary_key=True, autoincrement=True)
    nome = Column(String(255), nullable=False)
    descricao = Column(Text, nullable=True)
    categoria = Column(String(100), nullable=True, index=True)
    preco_total = Column(Numeric(10, 2), nullable=True)
    periodicidade = Column(String(20), nullable=False, default='unico')
    quantidade_visitas = Column(Integer, nullable=False, default=1)
    tempo_total_estimado_minutos = Column(Integer, nullable=True)
    observacoes_tecnicas = Column(Text, nullable=True)
    instrucoes_cliente = Column(Text, nullable=True)
    termos_garantia = Column(Text, nullable=True)
    periodo_garantia_dias = Column(Integer, nullable=False, default=90)
    status = Column(String(20), nullable=False, default='ativo', index=True)

    # Relacionamentos
    ordens_servico = relationship('OrdemServico', back_populates='template')

    __table_args__ = (
        CheckConstraint(
            "periodicidade IN ('unico', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual')",
            name='ck_template_periodicidade'
        ),
        CheckConstraint("status IN ('ativo', 'inativo')", name='ck_template_status'),
    )


# =============================================================================
# 3. MÓDULO DE ORDENS DE SERVIÇO
# =============================================================================

class OrdemServico(Base, UserAuditMixin):
    """
    Ordens de Serviço - Entidade principal do sistema.
    """
    __tablename__ = 'ordens_servico'

    id = Column(Integer, primary_key=True, autoincrement=True)
    numero_os = Column(String(50), nullable=False, unique=True, index=True)
    cliente_id = Column(Integer, ForeignKey('clientes.id', ondelete='RESTRICT'), nullable=False, index=True)
    endereco_id = Column(Integer, ForeignKey('enderecos.id', ondelete='RESTRICT'), nullable=False)
    contato_id = Column(Integer, ForeignKey('contatos.id', ondelete='SET NULL'), nullable=True)
    template_id = Column(Integer, ForeignKey('templates_servico.id', ondelete='SET NULL'), nullable=True)

    # Datas e Agendamento
    data_abertura = Column(DateTime, default=func.now(), nullable=False)
    data_agendamento = Column(DateTime, nullable=True, index=True)
    data_inicio_execucao = Column(DateTime, nullable=True)
    data_conclusao = Column(DateTime, nullable=True)
    data_cancelamento = Column(DateTime, nullable=True)

    # Status e Controle
    status = Column(String(30), nullable=False, default='rascunho', index=True)
    prioridade = Column(String(20), nullable=False, default='normal')

    # Valores
    valor_servicos = Column(Numeric(10, 2), nullable=False, default=0)
    valor_produtos = Column(Numeric(10, 2), nullable=False, default=0)
    valor_deslocamento = Column(Numeric(10, 2), nullable=False, default=0)
    valor_desconto = Column(Numeric(10, 2), nullable=False, default=0)
    valor_total = Column(Numeric(10, 2), nullable=False)

    # Garantia
    possui_garantia = Column(Boolean, nullable=False, default=True)
    data_inicio_garantia = Column(Date, nullable=True)
    data_fim_garantia = Column(Date, nullable=True)

    # Equipe
    tecnico_responsavel = Column(String(100), nullable=True)
    equipe_ids = Column(JSON, nullable=True)

    # Observações
    descricao_servico = Column(Text, nullable=True)
    observacoes_internas = Column(Text, nullable=True)
    observacoes_cliente = Column(Text, nullable=True)

    # Documentos Gerados
    certificado_gerado = Column(Boolean, nullable=False, default=False)
    certificado_path = Column(String(500), nullable=True)
    certificado_enviado = Column(Boolean, nullable=False, default=False)
    instrucoes_geradas = Column(Boolean, nullable=False, default=False)
    instrucoes_path = Column(String(500), nullable=True)
    instrucoes_enviadas = Column(Boolean, nullable=False, default=False)

    # Metadados
    origem = Column(String(20), nullable=False, default='web')

    # Relacionamentos
    cliente = relationship('Cliente', back_populates='ordens_servico')
    endereco = relationship('Endereco', back_populates='ordens_servico')
    contato = relationship('Contato', back_populates='ordens_servico')
    template = relationship('TemplateServico', back_populates='ordens_servico')
    servicos = relationship('OSServico', back_populates='ordem_servico', cascade='all, delete-orphan')
    produtos = relationship('OSProduto', back_populates='ordem_servico', cascade='all, delete-orphan')
    pragas = relationship('OSPraga', back_populates='ordem_servico', cascade='all, delete-orphan')
    historico_status = relationship('OSHistoricoStatus', back_populates='ordem_servico', cascade='all, delete-orphan')
    documentos = relationship('DocumentoGerado', back_populates='ordem_servico')
    titulos = relationship('TituloReceber', back_populates='ordem_servico')

    __table_args__ = (
        CheckConstraint(
            "status IN ('rascunho', 'aguardando_aprovacao', 'aprovada', 'agendada', "
            "'em_execucao', 'aguardando_pagamento', 'concluida', 'cancelada')",
            name='ck_os_status'
        ),
        CheckConstraint(
            "prioridade IN ('baixa', 'normal', 'alta', 'urgente')",
            name='ck_os_prioridade'
        ),
        CheckConstraint(
            "origem IN ('web', 'app', 'api', 'whatsapp', 'telefone')",
            name='ck_os_origem'
        ),
        Index('idx_os_status_agendamento', 'status', 'data_agendamento'),
    )


class OSServico(Base):
    """
    Serviços incluídos em uma Ordem de Serviço.
    """
    __tablename__ = 'os_servicos'

    id = Column(Integer, primary_key=True, autoincrement=True)
    os_id = Column(Integer, ForeignKey('ordens_servico.id', ondelete='CASCADE'), nullable=False, index=True)
    servico_id = Column(Integer, ForeignKey('servicos.id', ondelete='RESTRICT'), nullable=False)
    quantidade = Column(Numeric(10, 2), nullable=False)
    preco_unitario = Column(Numeric(10, 2), nullable=False)
    desconto_percentual = Column(Numeric(5, 2), nullable=False, default=0)
    preco_total = Column(Numeric(10, 2), nullable=False)
    observacoes = Column(Text, nullable=True)

    # Relacionamentos
    ordem_servico = relationship('OrdemServico', back_populates='servicos')
    servico = relationship('Servico', back_populates='os_servicos')


class OSProduto(Base):
    """
    Produtos utilizados em uma Ordem de Serviço.
    """
    __tablename__ = 'os_produtos'

    id = Column(Integer, primary_key=True, autoincrement=True)
    os_id = Column(Integer, ForeignKey('ordens_servico.id', ondelete='CASCADE'), nullable=False, index=True)
    produto_id = Column(Integer, ForeignKey('produtos.id', ondelete='RESTRICT'), nullable=False)
    quantidade = Column(Numeric(10, 3), nullable=False)
    preco_unitario = Column(Numeric(10, 2), nullable=True)
    preco_total = Column(Numeric(10, 2), nullable=True)
    lote = Column(String(50), nullable=True)

    # Relacionamentos
    ordem_servico = relationship('OrdemServico', back_populates='produtos')
    produto = relationship('Produto', back_populates='os_produtos')


class OSPraga(Base):
    """
    Pragas identificadas em uma Ordem de Serviço.
    """
    __tablename__ = 'os_pragas'

    id = Column(Integer, primary_key=True, autoincrement=True)
    os_id = Column(Integer, ForeignKey('ordens_servico.id', ondelete='CASCADE'), nullable=False, index=True)
    praga_id = Column(Integer, ForeignKey('pragas.id', ondelete='RESTRICT'), nullable=False)
    nivel_infestacao = Column(String(20), nullable=False)
    locais_encontrados = Column(Text, nullable=True)
    observacoes = Column(Text, nullable=True)

    # Relacionamentos
    ordem_servico = relationship('OrdemServico', back_populates='pragas')
    praga = relationship('Praga', back_populates='os_pragas')

    __table_args__ = (
        CheckConstraint(
            "nivel_infestacao IN ('ausente', 'baixo', 'medio', 'alto', 'critico')",
            name='ck_os_praga_nivel'
        ),
    )


class OSHistoricoStatus(Base):
    """
    Histórico de mudanças de status de uma Ordem de Serviço.
    """
    __tablename__ = 'os_historico_status'

    id = Column(Integer, primary_key=True, autoincrement=True)
    os_id = Column(Integer, ForeignKey('ordens_servico.id', ondelete='CASCADE'), nullable=False)
    status_anterior = Column(String(50), nullable=True)
    status_novo = Column(String(50), nullable=False)
    usuario = Column(String(100), nullable=True)
    observacao = Column(Text, nullable=True)
    data_mudanca = Column(DateTime, default=func.now(), nullable=False)

    # Relacionamentos
    ordem_servico = relationship('OrdemServico', back_populates='historico_status')

    __table_args__ = (
        Index('idx_os_historico_os_data', 'os_id', 'data_mudanca'),
    )


# =============================================================================
# 4. MÓDULO DE DOCUMENTOS
# =============================================================================

class DocumentoGerado(Base, UserAuditMixin):
    """
    Documentos gerados pelo sistema (laudos, certificados, recibos, etc).
    """
    __tablename__ = 'documentos_gerados'

    id = Column(Integer, primary_key=True, autoincrement=True)
    os_id = Column(Integer, ForeignKey('ordens_servico.id', ondelete='SET NULL'), nullable=True, index=True)
    cliente_id = Column(Integer, ForeignKey('clientes.id', ondelete='RESTRICT'), nullable=False, index=True)

    tipo_documento = Column(String(50), nullable=False, index=True)
    status_geracao = Column(String(20), nullable=False, default='aguardando', index=True)

    # Arquivos
    nome_arquivo = Column(String(255), nullable=False)
    caminho_arquivo = Column(String(500), nullable=True)
    arquivo_hash = Column(String(64), nullable=True)
    tamanho_bytes = Column(Integer, nullable=True)
    formato_arquivo = Column(String(10), nullable=False, default='docx')

    # Metadados de Geração
    template_utilizado = Column(String(100), nullable=True)
    dados_entrada = Column(JSON, nullable=True)
    erro_mensagem = Column(Text, nullable=True)
    tentativas_geracao = Column(Integer, nullable=False, default=0)

    # Assinatura Digital
    assinado = Column(Boolean, nullable=False, default=False)
    data_assinatura = Column(DateTime, nullable=True)
    assinante_nome = Column(String(255), nullable=True)
    assinatura_hash = Column(String(64), nullable=True)
    certificado_digital_path = Column(String(500), nullable=True)

    # Envio
    enviado = Column(Boolean, nullable=False, default=False)
    data_envio = Column(DateTime, nullable=True)
    destinatarios = Column(JSON, nullable=True)
    canal_envio = Column(String(20), nullable=True)

    # Rastreamento
    visualizado = Column(Boolean, nullable=False, default=False)
    data_primeira_visualizacao = Column(DateTime, nullable=True)
    quantidade_visualizacoes = Column(Integer, nullable=False, default=0)

    # Campos legados (compatibilidade com sistema antigo)
    valor_total = Column(Numeric(10, 2), nullable=True)
    cliente_nome = Column(String(255), nullable=True)
    razao_social = Column(String(255), nullable=True)
    cliente_cnpj = Column(String(18), nullable=True)
    status_aprovacao = Column(String(20), nullable=True)

    data_solicitacao = Column(DateTime, default=func.now(), nullable=False, index=True)
    data_geracao = Column(DateTime, nullable=True)
    data_conclusao = Column(DateTime, nullable=True)

    # Relacionamentos
    ordem_servico = relationship('OrdemServico', back_populates='documentos')
    cliente = relationship('Cliente', back_populates='documentos')
    tags = relationship('DocumentoTag', back_populates='documento', cascade='all, delete-orphan')
    fila = relationship('FilaDocumento', back_populates='documento', uselist=False, cascade='all, delete-orphan')

    __table_args__ = (
        CheckConstraint(
            "tipo_documento IN ('laudo_tecnico', 'certificado', 'instrucoes_previas', 'orcamento', "
            "'recibo', 'boleto', 'contrato', 'relatorio', 'outro')",
            name='ck_documento_tipo'
        ),
        CheckConstraint(
            "status_geracao IN ('aguardando', 'processando', 'gerado', 'erro', 'cancelado')",
            name='ck_documento_status'
        ),
        CheckConstraint(
            "formato_arquivo IN ('docx', 'pdf')",
            name='ck_documento_formato'
        ),
    )


class FilaDocumento(Base):
    """
    Fila de processamento de documentos (para geração assíncrona).
    """
    __tablename__ = 'fila_documentos'

    id = Column(Integer, primary_key=True, autoincrement=True)
    documento_id = Column(Integer, ForeignKey('documentos_gerados.id', ondelete='CASCADE'), nullable=False, unique=True)
    prioridade = Column(String(20), nullable=False, default='normal')
    status = Column(String(20), nullable=False, default='pendente')
    tentativas = Column(Integer, nullable=False, default=0)
    max_tentativas = Column(Integer, nullable=False, default=3)
    erro_mensagem = Column(Text, nullable=True)
    worker_id = Column(String(100), nullable=True)
    data_adicao = Column(DateTime, default=func.now(), nullable=False)
    data_inicio_processamento = Column(DateTime, nullable=True)
    data_conclusao = Column(DateTime, nullable=True)

    # Relacionamentos
    documento = relationship('DocumentoGerado', back_populates='fila')

    __table_args__ = (
        CheckConstraint(
            "prioridade IN ('baixa', 'normal', 'alta', 'urgente')",
            name='ck_fila_prioridade'
        ),
        CheckConstraint(
            "status IN ('pendente', 'processando', 'concluido', 'erro')",
            name='ck_fila_status'
        ),
        Index('idx_fila_status_prioridade', 'status', 'prioridade'),
    )


# =============================================================================
# 5. MÓDULO DE TAGS E ML
# =============================================================================

class Tag(Base, AuditMixin):
    """
    Tags para categorização de documentos.
    """
    __tablename__ = 'tags'

    id = Column(Integer, primary_key=True, autoincrement=True)
    nome = Column(String(100), nullable=False, unique=True)
    descricao = Column(Text, nullable=True)
    cor = Column(String(7), nullable=False, default='#3B82F6')

    # Relacionamentos
    documentos = relationship('DocumentoTag', back_populates='tag', cascade='all, delete-orphan')
    training_data = relationship('TagTrainingData', back_populates='tag', cascade='all, delete-orphan')


class DocumentoTag(Base):
    """
    Associação entre documentos e tags (many-to-many).
    """
    __tablename__ = 'documento_tags'

    id = Column(Integer, primary_key=True, autoincrement=True)
    documento_id = Column(Integer, ForeignKey('documentos_gerados.id', ondelete='CASCADE'), nullable=True)
    arquivo_id = Column(Integer, nullable=True)
    arquivo_tipo = Column(String(50), nullable=False)
    tag_id = Column(Integer, ForeignKey('tags.id', ondelete='CASCADE'), nullable=False, index=True)
    confianca = Column(Numeric(3, 2), nullable=False, default=1.0)
    manual = Column(Boolean, nullable=False, default=True)
    data_atribuicao = Column(DateTime, default=func.now(), nullable=False)

    # Relacionamentos
    documento = relationship('DocumentoGerado', back_populates='tags')
    tag = relationship('Tag', back_populates='documentos')

    __table_args__ = (
        Index('idx_documento_tags_arquivo', 'arquivo_id', 'arquivo_tipo'),
    )


class TagTrainingData(Base):
    """
    Dados de treinamento para classificação automática de tags.
    """
    __tablename__ = 'tag_training_data'

    id = Column(Integer, primary_key=True, autoincrement=True)
    arquivo_nome = Column(String(255), nullable=True)
    arquivo_conteudo = Column(Text, nullable=True)
    tag_id = Column(Integer, ForeignKey('tags.id', ondelete='CASCADE'), nullable=False, index=True)
    features = Column(Text, nullable=True)
    data_treinamento = Column(DateTime, default=func.now(), nullable=False)

    # Relacionamentos
    tag = relationship('Tag', back_populates='training_data')


# =============================================================================
# 6. MÓDULO FINANCEIRO
# =============================================================================

class FormaPagamento(Base):
    """
    Formas de pagamento disponíveis.
    """
    __tablename__ = 'formas_pagamento'

    id = Column(Integer, primary_key=True, autoincrement=True)
    nome = Column(String(100), nullable=False)
    tipo = Column(String(30), nullable=False)
    ativo = Column(Boolean, nullable=False, default=True)
    taxa_percentual = Column(Numeric(5, 2), nullable=False, default=0)
    prazo_compensacao_dias = Column(Integer, nullable=False, default=0)

    # Relacionamentos
    titulos = relationship('TituloReceber', back_populates='forma_pagamento')

    __table_args__ = (
        CheckConstraint(
            "tipo IN ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'boleto', 'transferencia')",
            name='ck_forma_pagamento_tipo'
        ),
    )


class TituloReceber(Base, AuditMixin):
    """
    Títulos a receber (boletos, faturas, etc).
    """
    __tablename__ = 'titulos_receber'

    id = Column(Integer, primary_key=True, autoincrement=True)
    os_id = Column(Integer, ForeignKey('ordens_servico.id', ondelete='RESTRICT'), nullable=True, index=True)
    cliente_id = Column(Integer, ForeignKey('clientes.id', ondelete='RESTRICT'), nullable=False, index=True)
    numero_titulo = Column(String(50), nullable=False, unique=True)

    # Valores
    valor_original = Column(Numeric(10, 2), nullable=False)
    valor_desconto = Column(Numeric(10, 2), nullable=False, default=0)
    valor_juros = Column(Numeric(10, 2), nullable=False, default=0)
    valor_multa = Column(Numeric(10, 2), nullable=False, default=0)
    valor_total = Column(Numeric(10, 2), nullable=False)
    valor_pago = Column(Numeric(10, 2), nullable=False, default=0)
    valor_saldo = Column(Numeric(10, 2), nullable=False)

    # Datas
    data_emissao = Column(Date, nullable=False)
    data_vencimento = Column(Date, nullable=False, index=True)
    data_pagamento = Column(Date, nullable=True)

    # Status
    status = Column(String(20), nullable=False, default='pendente', index=True)

    # Gateway de Pagamento
    gateway_provider = Column(String(50), nullable=True)
    gateway_transaction_id = Column(String(255), nullable=True, index=True)
    gateway_payment_link = Column(String(500), nullable=True)
    gateway_status = Column(String(50), nullable=True)
    webhook_payload = Column(JSON, nullable=True)
    data_confirmacao_gateway = Column(DateTime, nullable=True)

    # Boleto
    codigo_barras = Column(String(100), nullable=True)
    linha_digitavel = Column(String(100), nullable=True)
    nosso_numero = Column(String(50), nullable=True)
    numero_documento = Column(String(50), nullable=True)

    forma_pagamento_id = Column(Integer, ForeignKey('formas_pagamento.id', ondelete='SET NULL'), nullable=True)
    descricao = Column(Text, nullable=True)
    observacoes = Column(Text, nullable=True)
    arquivo_caminho = Column(String(500), nullable=True)

    # Relacionamentos
    ordem_servico = relationship('OrdemServico', back_populates='titulos')
    cliente = relationship('Cliente', back_populates='titulos')
    forma_pagamento = relationship('FormaPagamento', back_populates='titulos')
    recibos = relationship('Recibo', back_populates='titulo')

    __table_args__ = (
        CheckConstraint(
            "status IN ('pendente', 'pago_parcial', 'pago', 'vencido', 'cancelado')",
            name='ck_titulo_status'
        ),
    )


class Recibo(Base, AuditMixin):
    """
    Recibos emitidos para pagamentos.
    """
    __tablename__ = 'recibos'

    id = Column(Integer, primary_key=True, autoincrement=True)
    cliente_id = Column(Integer, ForeignKey('clientes.id', ondelete='SET NULL'), nullable=True, index=True)
    titulo_id = Column(Integer, ForeignKey('titulos_receber.id', ondelete='SET NULL'), nullable=True, index=True)
    cliente_nome = Column(String(255), nullable=False)
    numero_recibo = Column(String(50), nullable=True)
    descricao = Column(Text, nullable=True)
    valor_total = Column(Numeric(10, 2), nullable=False)
    data_emissao = Column(Date, nullable=False, index=True)
    forma_pagamento = Column(String(50), nullable=True)
    observacoes = Column(Text, nullable=True)
    arquivo_caminho = Column(String(500), nullable=True)

    # Relacionamentos
    cliente = relationship('Cliente', back_populates='recibos')
    titulo = relationship('TituloReceber', back_populates='recibos')


# =============================================================================
# 7. FUNÇÕES AUXILIARES
# =============================================================================

def create_all_tables(engine):
    """Cria todas as tabelas no banco de dados."""
    Base.metadata.create_all(engine)


def drop_all_tables(engine):
    """Remove todas as tabelas (CUIDADO: perda de dados)."""
    Base.metadata.drop_all(engine)


def get_engine(database_url: str, echo: bool = False):
    """
    Cria engine SQLAlchemy.

    Args:
        database_url: URL de conexão (sqlite:///path ou postgresql://...)
        echo: Se True, loga todas as queries SQL

    Returns:
        Engine SQLAlchemy configurada
    """
    return create_engine(database_url, echo=echo)


def get_session_factory(engine) -> sessionmaker:
    """
    Cria factory de sessões.

    Args:
        engine: Engine SQLAlchemy

    Returns:
        Sessionmaker configurada
    """
    return sessionmaker(bind=engine, expire_on_commit=False)


# =============================================================================
# DADOS INICIAIS
# =============================================================================

def insert_initial_data(session: Session):
    """
    Insere dados iniciais no banco (tags, formas de pagamento, pragas).
    Usa no_autoflush para evitar problemas de RETURNING em SQLite.
    """
    with session.no_autoflush:
        # Tags padrão
        tags_padrao = [
            ('Laudo', 'Laudos técnicos e de serviços', '#10B981'),
            ('Recibo', 'Recibos de pagamento', '#3B82F6'),
            ('Orçamento', 'Orçamentos e propostas', '#F59E0B'),
            ('Boleto', 'Boletos bancários', '#F97316'),
            ('Contrato', 'Contratos e termos', '#8B5CF6'),
            ('Relatório', 'Relatórios diversos', '#6366F1'),
            ('Outros', 'Documentos diversos', '#6B7280'),
        ]

        for nome, descricao, cor in tags_padrao:
            existing = session.query(Tag).filter_by(nome=nome).first()
            if not existing:
                session.add(Tag(nome=nome, descricao=descricao, cor=cor))

        # Formas de Pagamento
        formas_pagamento = [
            ('Dinheiro', 'dinheiro', True, 0, 0),
            ('PIX', 'pix', True, 0, 0),
            ('Cartão de Crédito', 'cartao_credito', True, 3.5, 30),
            ('Cartão de Débito', 'cartao_debito', True, 2.0, 1),
            ('Boleto Bancário', 'boleto', True, 2.5, 3),
            ('Transferência', 'transferencia', True, 0, 1),
        ]

        for nome, tipo, ativo, taxa, prazo in formas_pagamento:
            existing = session.query(FormaPagamento).filter_by(nome=nome).first()
            if not existing:
                session.add(FormaPagamento(
                    nome=nome, tipo=tipo, ativo=ativo,
                    taxa_percentual=taxa, prazo_compensacao_dias=prazo
                ))

        # Pragas comuns
        pragas = [
            ('Barata', 'Blattodea', 'inseto', 'alto', 'Inseto urbano vetor de doenças'),
            ('Rato', 'Rattus norvegicus', 'roedor', 'critico', 'Roedor urbano transmissor de leptospirose'),
            ('Camundongo', 'Mus musculus', 'roedor', 'alto', 'Pequeno roedor doméstico'),
            ('Cupim', 'Isoptera', 'inseto', 'alto', 'Inseto destruidor de madeira'),
            ('Formiga', 'Formicidae', 'inseto', 'medio', 'Inseto social'),
            ('Mosca', 'Diptera', 'inseto', 'alto', 'Inseto vetor de doenças'),
            ('Pulga', 'Siphonaptera', 'inseto', 'medio', 'Parasita de animais'),
            ('Escorpião', 'Scorpiones', 'outro', 'critico', 'Aracnídeo peçonhento'),
        ]

        for nome_popular, nome_cientifico, categoria, nivel_risco, descricao in pragas:
            existing = session.query(Praga).filter_by(nome_popular=nome_popular).first()
            if not existing:
                session.add(Praga(
                    nome_popular=nome_popular, nome_cientifico=nome_cientifico,
                    categoria=categoria, nivel_risco=nivel_risco, descricao=descricao
                ))

    session.commit()
