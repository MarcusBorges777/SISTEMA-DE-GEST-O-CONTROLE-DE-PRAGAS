#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Services Compat - Camada de Compatibilidade para Tabelas Legadas

Este módulo fornece acesso ORM às tabelas legadas do sistema,
permitindo uma migração gradual do código raw SQL para SQLAlchemy.

Tabelas Legadas:
- clientes_web -> ClienteLegado
- boletos -> BoletoLegado
- recibos -> ReciboLegado
- documentos_gerados -> DocumentoLegado
- tags -> Tag (já compatível)
- documento_tags -> DocumentoTagLegado
"""

from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple
from contextlib import contextmanager

from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, Date,
    ForeignKey, create_engine, and_, or_, func, desc
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker, Session, joinedload
from sqlalchemy.pool import QueuePool

from db_manager import DatabaseManager, get_db_manager

# Base para modelos legados
BaseLegado = declarative_base()


# =============================================================================
# MODELOS LEGADOS (Mapeamento das tabelas existentes)
# =============================================================================

class ClienteLegado(BaseLegado):
    """Mapeamento da tabela clientes_web (legado)."""
    __tablename__ = 'clientes_web'

    id = Column(Integer, primary_key=True, autoincrement=True)
    nome_fantasia = Column(String(255), nullable=False, index=True)
    razao_social = Column(String(255))
    cnpj = Column(String(18), index=True)
    cnae = Column(String(20))
    rua = Column(String(255))
    numero = Column(String(20))
    bairro = Column(String(100))
    cidade = Column(String(100))
    uf = Column(String(2))
    endereco_completo = Column(Text)
    telefone = Column(String(50))
    ultima_data_servico = Column(String(50))
    data_cadastro = Column(DateTime, default=datetime.now)
    data_garantia = Column(String(50))
    periodo_garantia_meses = Column(Integer, default=12)

    # Relacionamentos
    boletos = relationship('BoletoLegado', back_populates='cliente', lazy='dynamic')
    recibos = relationship('ReciboLegado', back_populates='cliente', lazy='dynamic')

    @property
    def endereco_formatado(self) -> str:
        """Retorna endereço formatado."""
        partes = []
        if self.rua:
            partes.append(self.rua)
        if self.numero:
            partes.append(self.numero)
        if self.bairro:
            partes.append(f"- {self.bairro}")
        if self.cidade:
            partes.append(f"- {self.cidade}")
        if self.uf:
            partes.append(f"/{self.uf}")
        return ' '.join(partes) if partes else ''

    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário."""
        return {
            'id': self.id,
            'nome_fantasia': self.nome_fantasia,
            'razao_social': self.razao_social,
            'cnpj': self.cnpj,
            'cnae': self.cnae,
            'rua': self.rua,
            'numero': self.numero,
            'bairro': self.bairro,
            'cidade': self.cidade,
            'uf': self.uf,
            'endereco_completo': self.endereco_completo,
            'telefone': self.telefone,
            'ultima_data_servico': self.ultima_data_servico,
            'data_cadastro': self.data_cadastro.isoformat() if self.data_cadastro else None,
            'data_garantia': self.data_garantia,
            'periodo_garantia_meses': self.periodo_garantia_meses
        }


class BoletoLegado(BaseLegado):
    """Mapeamento da tabela boletos (legado)."""
    __tablename__ = 'boletos'

    id = Column(Integer, primary_key=True, autoincrement=True)
    cliente_id = Column(Integer, ForeignKey('clientes_web.id', ondelete='SET NULL'))
    cliente_nome = Column(String(255), nullable=False)
    descricao = Column(Text)
    valor = Column(Float, nullable=False)
    data_emissao = Column(Date, nullable=False)
    data_vencimento = Column(Date, nullable=False)
    numero_documento = Column(String(50))
    codigo_barras = Column(String(100))
    status = Column(String(20), default='pendente')
    data_pagamento = Column(Date)
    valor_pago = Column(Float)
    observacoes = Column(Text)
    arquivo_caminho = Column(String(500))
    data_criacao = Column(DateTime, default=datetime.now)

    # Relacionamentos
    cliente = relationship('ClienteLegado', back_populates='boletos')

    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário."""
        return {
            'id': self.id,
            'cliente_id': self.cliente_id,
            'cliente_nome': self.cliente_nome,
            'descricao': self.descricao,
            'valor': self.valor,
            'data_emissao': self.data_emissao.isoformat() if self.data_emissao else None,
            'data_vencimento': self.data_vencimento.isoformat() if self.data_vencimento else None,
            'numero_documento': self.numero_documento,
            'codigo_barras': self.codigo_barras,
            'status': self.status,
            'data_pagamento': self.data_pagamento.isoformat() if self.data_pagamento else None,
            'valor_pago': self.valor_pago,
            'observacoes': self.observacoes,
            'arquivo_caminho': self.arquivo_caminho,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None
        }


class ReciboLegado(BaseLegado):
    """Mapeamento da tabela recibos (legado)."""
    __tablename__ = 'recibos'

    id = Column(Integer, primary_key=True, autoincrement=True)
    cliente_id = Column(Integer, ForeignKey('clientes_web.id', ondelete='SET NULL'))
    cliente_nome = Column(String(255), nullable=False)
    numero_recibo = Column(String(50))
    descricao = Column(Text)
    valor_total = Column(Float, nullable=False)
    data_emissao = Column(Date, nullable=False)
    forma_pagamento = Column(String(50))
    observacoes = Column(Text)
    arquivo_caminho = Column(String(500))
    data_criacao = Column(DateTime, default=datetime.now)

    # Relacionamentos
    cliente = relationship('ClienteLegado', back_populates='recibos')

    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário."""
        return {
            'id': self.id,
            'cliente_id': self.cliente_id,
            'cliente_nome': self.cliente_nome,
            'numero_recibo': self.numero_recibo,
            'descricao': self.descricao,
            'valor_total': self.valor_total,
            'data_emissao': self.data_emissao.isoformat() if self.data_emissao else None,
            'forma_pagamento': self.forma_pagamento,
            'observacoes': self.observacoes,
            'arquivo_caminho': self.arquivo_caminho,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None
        }


class DocumentoLegado(BaseLegado):
    """Mapeamento da tabela documentos_gerados (legado)."""
    __tablename__ = 'documentos_gerados'

    id = Column(Integer, primary_key=True, autoincrement=True)
    tipo_doc = Column(String(50))
    nome_arquivo = Column(String(255))
    caminho_arquivo = Column(String(500))
    valor_total = Column(Float, default=0)
    cliente_nome = Column(String(255))
    razao_social = Column(String(255))
    cliente_cnpj = Column(String(18))
    data_geracao = Column(DateTime, default=datetime.now)

    # Nota: tags são acessadas via DocumentoTagLegado (relação polimórfica por arquivo_tipo)

    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário."""
        return {
            'id': self.id,
            'tipo_doc': self.tipo_doc,
            'nome_arquivo': self.nome_arquivo,
            'caminho_arquivo': self.caminho_arquivo,
            'valor_total': self.valor_total,
            'cliente_nome': self.cliente_nome,
            'razao_social': self.razao_social,
            'cliente_cnpj': self.cliente_cnpj,
            'data_geracao': self.data_geracao.isoformat() if self.data_geracao else None
        }


class TagLegado(BaseLegado):
    """Mapeamento da tabela tags (legado)."""
    __tablename__ = 'tags'

    id = Column(Integer, primary_key=True, autoincrement=True)
    nome = Column(String(50), nullable=False, unique=True)
    descricao = Column(Text)
    cor = Column(String(7), default='#3B82F6')
    data_criacao = Column(DateTime, default=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário."""
        return {
            'id': self.id,
            'nome': self.nome,
            'descricao': self.descricao,
            'cor': self.cor,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None
        }


class DocumentoTagLegado(BaseLegado):
    """Mapeamento da tabela documento_tags (legado)."""
    __tablename__ = 'documento_tags'

    id = Column(Integer, primary_key=True, autoincrement=True)
    arquivo_id = Column(Integer)  # Referência polimórfica (pode ser documento, arquivo, etc.)
    arquivo_tipo = Column(String(50), nullable=False)  # Tipo de arquivo referenciado
    tag_id = Column(Integer, ForeignKey('tags.id', ondelete='CASCADE'), nullable=False)
    confianca = Column(Float, default=1.0)
    manual = Column(Boolean, default=True)
    data_atribuicao = Column(DateTime, default=datetime.now)

    # Relacionamentos
    tag = relationship('TagLegado', lazy='joined')
    # Nota: documento é uma relação polimórfica, acessada via queries explícitas


# =============================================================================
# SERVIÇOS PARA TABELAS LEGADAS
# =============================================================================

class ClienteServiceLegado:
    """Serviço ORM para operações com clientes_web (legado)."""

    def __init__(self, session: Session = None):
        self.db = get_db_manager()
        self._session = session

    @property
    def session(self) -> Session:
        if self._session:
            return self._session
        return self.db.session

    def listar(
        self,
        nome: str = None,
        cidade: str = None,
        cnpj: str = None,
        cnae: str = None,
        rua: str = None,
        limite: int = 500,
        offset: int = 0
    ) -> Tuple[List[ClienteLegado], int]:
        """
        Lista clientes com filtros.

        Returns:
            Tuple de (lista de clientes, total)
        """
        query = self.session.query(ClienteLegado)

        if nome:
            query = query.filter(ClienteLegado.nome_fantasia.ilike(f'%{nome}%'))

        if cidade:
            query = query.filter(ClienteLegado.cidade.ilike(f'%{cidade}%'))

        if cnpj:
            query = query.filter(ClienteLegado.cnpj.ilike(f'%{cnpj}%'))

        if cnae:
            query = query.filter(ClienteLegado.cnae.ilike(f'%{cnae}%'))

        if rua:
            query = query.filter(ClienteLegado.rua.ilike(f'%{rua}%'))

        total = query.count()

        clientes = query.order_by(
            ClienteLegado.nome_fantasia
        ).offset(offset).limit(limite).all()

        return clientes, total

    def buscar_por_id(self, cliente_id: int) -> Optional[ClienteLegado]:
        """Busca cliente por ID."""
        return self.session.query(ClienteLegado).get(cliente_id)

    def buscar_por_cnpj(self, cnpj: str) -> Optional[ClienteLegado]:
        """Busca cliente por CNPJ."""
        return self.session.query(ClienteLegado).filter(
            ClienteLegado.cnpj == cnpj
        ).first()

    def criar(self, dados: Dict[str, Any]) -> ClienteLegado:
        """Cria novo cliente."""
        # Monta endereço completo
        if 'endereco_completo' not in dados or not dados['endereco_completo']:
            partes = []
            if dados.get('rua'):
                partes.append(dados['rua'])
            if dados.get('numero'):
                partes.append(f", {dados['numero']}")
            if dados.get('cidade'):
                partes.append(f" - {dados['cidade']}")
            if dados.get('uf'):
                partes.append(f"/{dados['uf']}")
            dados['endereco_completo'] = ''.join(partes)

        cliente = ClienteLegado(**dados)
        self.session.add(cliente)
        self.session.commit()
        return cliente

    def atualizar(self, cliente_id: int, dados: Dict[str, Any]) -> Optional[ClienteLegado]:
        """Atualiza cliente existente."""
        cliente = self.buscar_por_id(cliente_id)
        if not cliente:
            return None

        for campo, valor in dados.items():
            if hasattr(cliente, campo):
                setattr(cliente, campo, valor)

        self.session.commit()
        return cliente

    def deletar(self, cliente_id: int) -> bool:
        """Deleta cliente."""
        cliente = self.buscar_por_id(cliente_id)
        if not cliente:
            return False

        self.session.delete(cliente)
        self.session.commit()
        return True

    def garantias_vencendo(self, dias: int = 30) -> List[Dict[str, Any]]:
        """Lista clientes com garantia vencendo."""
        hoje = date.today()

        clientes = self.session.query(ClienteLegado).filter(
            ClienteLegado.data_garantia.isnot(None)
        ).all()

        avisos = []
        for cliente in clientes:
            try:
                # Parse da data de garantia
                data_garantia = datetime.strptime(
                    cliente.data_garantia, '%Y-%m-%d'
                ).date() if cliente.data_garantia else None

                if not data_garantia:
                    continue

                # Calcula data de vencimento
                periodo = cliente.periodo_garantia_meses or 12
                data_vencimento = data_garantia + timedelta(days=periodo * 30)

                dias_restantes = (data_vencimento - hoje).days

                if dias_restantes <= dias:
                    avisos.append({
                        'cliente_id': cliente.id,
                        'cliente_nome': cliente.nome_fantasia,
                        'data_garantia': cliente.data_garantia,
                        'data_vencimento': data_vencimento.isoformat(),
                        'dias_restantes': dias_restantes,
                        'vencida': dias_restantes < 0,
                        'status': 'vencida' if dias_restantes < 0 else
                                  'urgente' if dias_restantes <= 7 else 'atencao'
                    })
            except (ValueError, TypeError):
                continue

        return sorted(avisos, key=lambda x: x['dias_restantes'])


class BoletoServiceLegado:
    """Serviço ORM para operações com boletos (legado)."""

    def __init__(self, session: Session = None):
        self.db = get_db_manager()
        self._session = session

    @property
    def session(self) -> Session:
        if self._session:
            return self._session
        return self.db.session

    def listar(
        self,
        status: str = None,
        cliente_id: int = None,
        limite: int = 100,
        offset: int = 0
    ) -> Tuple[List[BoletoLegado], int]:
        """Lista boletos com filtros."""
        query = self.session.query(BoletoLegado)

        if status:
            query = query.filter(BoletoLegado.status == status)

        if cliente_id:
            query = query.filter(BoletoLegado.cliente_id == cliente_id)

        total = query.count()

        boletos = query.order_by(
            BoletoLegado.data_vencimento
        ).offset(offset).limit(limite).all()

        return boletos, total

    def buscar_por_id(self, boleto_id: int) -> Optional[BoletoLegado]:
        """Busca boleto por ID."""
        return self.session.query(BoletoLegado).get(boleto_id)

    def criar(self, dados: Dict[str, Any]) -> BoletoLegado:
        """Cria novo boleto."""
        # Converte datas se necessário
        if isinstance(dados.get('data_emissao'), str):
            dados['data_emissao'] = datetime.strptime(
                dados['data_emissao'], '%Y-%m-%d'
            ).date()

        if isinstance(dados.get('data_vencimento'), str):
            dados['data_vencimento'] = datetime.strptime(
                dados['data_vencimento'], '%Y-%m-%d'
            ).date()

        boleto = BoletoLegado(**dados)
        self.session.add(boleto)
        self.session.commit()
        return boleto

    def atualizar(self, boleto_id: int, dados: Dict[str, Any]) -> Optional[BoletoLegado]:
        """Atualiza boleto existente."""
        boleto = self.buscar_por_id(boleto_id)
        if not boleto:
            return None

        for campo, valor in dados.items():
            if hasattr(boleto, campo):
                # Converte datas se necessário
                if campo in ('data_emissao', 'data_vencimento', 'data_pagamento'):
                    if isinstance(valor, str) and valor:
                        valor = datetime.strptime(valor, '%Y-%m-%d').date()
                setattr(boleto, campo, valor)

        self.session.commit()
        return boleto

    def registrar_pagamento(self, boleto_id: int, valor_pago: float = None) -> Optional[BoletoLegado]:
        """Registra pagamento de boleto."""
        boleto = self.buscar_por_id(boleto_id)
        if not boleto:
            return None

        boleto.status = 'pago'
        boleto.data_pagamento = date.today()
        boleto.valor_pago = valor_pago or boleto.valor

        self.session.commit()
        return boleto

    def cancelar(self, boleto_id: int) -> Optional[BoletoLegado]:
        """Cancela boleto."""
        boleto = self.buscar_por_id(boleto_id)
        if not boleto:
            return None

        boleto.status = 'cancelado'
        self.session.commit()
        return boleto

    def deletar(self, boleto_id: int) -> bool:
        """Deleta boleto."""
        boleto = self.buscar_por_id(boleto_id)
        if not boleto:
            return False

        self.session.delete(boleto)
        self.session.commit()
        return True

    def vencendo(self, dias: int = 7) -> List[Dict[str, Any]]:
        """Lista boletos vencendo nos próximos dias."""
        hoje = date.today()
        data_limite = hoje + timedelta(days=dias)

        boletos = self.session.query(BoletoLegado).filter(
            BoletoLegado.status == 'pendente',
            BoletoLegado.data_vencimento <= data_limite
        ).order_by(BoletoLegado.data_vencimento).all()

        avisos = []
        for boleto in boletos:
            dias_restantes = (boleto.data_vencimento - hoje).days

            avisos.append({
                'id': boleto.id,
                'cliente_nome': boleto.cliente_nome,
                'descricao': boleto.descricao,
                'valor': boleto.valor,
                'data_vencimento': boleto.data_vencimento.isoformat(),
                'dias_restantes': dias_restantes,
                'status_aviso': 'vencido' if dias_restantes < 0 else
                               'urgente' if dias_restantes <= 3 else 'atencao',
                'numero_documento': boleto.numero_documento
            })

        return avisos


class ReciboServiceLegado:
    """Serviço ORM para operações com recibos (legado)."""

    def __init__(self, session: Session = None):
        self.db = get_db_manager()
        self._session = session

    @property
    def session(self) -> Session:
        if self._session:
            return self._session
        return self.db.session

    def listar(
        self,
        cliente_id: int = None,
        data_inicio: date = None,
        data_fim: date = None,
        limite: int = 100,
        offset: int = 0
    ) -> Tuple[List[ReciboLegado], int]:
        """Lista recibos com filtros."""
        query = self.session.query(ReciboLegado)

        if cliente_id:
            query = query.filter(ReciboLegado.cliente_id == cliente_id)

        if data_inicio:
            query = query.filter(ReciboLegado.data_emissao >= data_inicio)

        if data_fim:
            query = query.filter(ReciboLegado.data_emissao <= data_fim)

        total = query.count()

        recibos = query.order_by(
            desc(ReciboLegado.data_emissao)
        ).offset(offset).limit(limite).all()

        return recibos, total

    def buscar_por_id(self, recibo_id: int) -> Optional[ReciboLegado]:
        """Busca recibo por ID."""
        return self.session.query(ReciboLegado).get(recibo_id)

    def criar(self, dados: Dict[str, Any]) -> ReciboLegado:
        """Cria novo recibo."""
        # Converte data se necessário
        if isinstance(dados.get('data_emissao'), str):
            dados['data_emissao'] = datetime.strptime(
                dados['data_emissao'], '%Y-%m-%d'
            ).date()

        recibo = ReciboLegado(**dados)
        self.session.add(recibo)
        self.session.commit()
        return recibo

    def deletar(self, recibo_id: int) -> bool:
        """Deleta recibo."""
        recibo = self.buscar_por_id(recibo_id)
        if not recibo:
            return False

        self.session.delete(recibo)
        self.session.commit()
        return True


class DocumentoServiceLegado:
    """Serviço ORM para operações com documentos_gerados (legado)."""

    def __init__(self, session: Session = None):
        self.db = get_db_manager()
        self._session = session

    @property
    def session(self) -> Session:
        if self._session:
            return self._session
        return self.db.session

    def listar(
        self,
        tipo: str = None,
        cliente_cnpj: str = None,
        limite: int = 100,
        offset: int = 0
    ) -> Tuple[List[DocumentoLegado], int]:
        """Lista documentos com filtros."""
        query = self.session.query(DocumentoLegado)

        if tipo:
            query = query.filter(DocumentoLegado.tipo_doc == tipo)

        if cliente_cnpj:
            query = query.filter(DocumentoLegado.cliente_cnpj == cliente_cnpj)

        total = query.count()

        documentos = query.order_by(
            desc(DocumentoLegado.data_geracao)
        ).offset(offset).limit(limite).all()

        return documentos, total

    def buscar_por_id(self, doc_id: int) -> Optional[DocumentoLegado]:
        """Busca documento por ID."""
        return self.session.query(DocumentoLegado).get(doc_id)

    def buscar_por_nome(self, nome_arquivo: str) -> Optional[DocumentoLegado]:
        """Busca documento por nome de arquivo."""
        return self.session.query(DocumentoLegado).filter(
            DocumentoLegado.nome_arquivo == nome_arquivo
        ).first()

    def criar(self, dados: Dict[str, Any]) -> DocumentoLegado:
        """Cria novo documento."""
        documento = DocumentoLegado(**dados)
        self.session.add(documento)
        self.session.commit()
        return documento

    def deletar(self, doc_id: int) -> bool:
        """Deleta documento."""
        documento = self.buscar_por_id(doc_id)
        if not documento:
            return False

        self.session.delete(documento)
        self.session.commit()
        return True

    def deletar_por_nome(self, nome_arquivo: str) -> bool:
        """Deleta documento por nome de arquivo."""
        documento = self.buscar_por_nome(nome_arquivo)
        if not documento:
            return False

        self.session.delete(documento)
        self.session.commit()
        return True


class TagServiceLegado:
    """Serviço ORM para operações com tags (legado)."""

    def __init__(self, session: Session = None):
        self.db = get_db_manager()
        self._session = session

    @property
    def session(self) -> Session:
        if self._session:
            return self._session
        return self.db.session

    def listar(self) -> List[TagLegado]:
        """Lista todas as tags."""
        return self.session.query(TagLegado).order_by(TagLegado.nome).all()

    def buscar_por_id(self, tag_id: int) -> Optional[TagLegado]:
        """Busca tag por ID."""
        return self.session.query(TagLegado).get(tag_id)

    def buscar_por_nome(self, nome: str) -> Optional[TagLegado]:
        """Busca tag por nome."""
        return self.session.query(TagLegado).filter(TagLegado.nome == nome).first()

    def criar(self, nome: str, descricao: str = None, cor: str = '#3B82F6') -> TagLegado:
        """Cria nova tag."""
        tag = TagLegado(nome=nome, descricao=descricao, cor=cor)
        self.session.add(tag)
        self.session.commit()
        return tag

    def tags_do_documento(self, arquivo_id: int) -> List[TagLegado]:
        """Lista tags de um documento."""
        return self.session.query(TagLegado).join(
            DocumentoTagLegado
        ).filter(
            DocumentoTagLegado.arquivo_id == arquivo_id
        ).all()

    def adicionar_ao_documento(
        self,
        arquivo_id: int,
        tag_id: int,
        arquivo_tipo: str = 'documento',
        confianca: float = 1.0,
        manual: bool = True
    ) -> DocumentoTagLegado:
        """Adiciona tag a um documento."""
        doc_tag = DocumentoTagLegado(
            arquivo_id=arquivo_id,
            arquivo_tipo=arquivo_tipo,
            tag_id=tag_id,
            confianca=confianca,
            manual=manual
        )
        self.session.add(doc_tag)
        self.session.commit()
        return doc_tag

    def remover_do_documento(self, arquivo_id: int, tag_id: int) -> bool:
        """Remove tag de um documento."""
        doc_tag = self.session.query(DocumentoTagLegado).filter(
            DocumentoTagLegado.arquivo_id == arquivo_id,
            DocumentoTagLegado.tag_id == tag_id
        ).first()

        if doc_tag:
            self.session.delete(doc_tag)
            self.session.commit()
            return True
        return False


# =============================================================================
# FUNÇÕES DE CONVENIÊNCIA
# =============================================================================

def get_cliente_service(session: Session = None) -> ClienteServiceLegado:
    """Retorna instância do serviço de clientes."""
    return ClienteServiceLegado(session)

def get_boleto_service(session: Session = None) -> BoletoServiceLegado:
    """Retorna instância do serviço de boletos."""
    return BoletoServiceLegado(session)

def get_recibo_service(session: Session = None) -> ReciboServiceLegado:
    """Retorna instância do serviço de recibos."""
    return ReciboServiceLegado(session)

def get_documento_service(session: Session = None) -> DocumentoServiceLegado:
    """Retorna instância do serviço de documentos."""
    return DocumentoServiceLegado(session)

def get_tag_service(session: Session = None) -> TagServiceLegado:
    """Retorna instância do serviço de tags."""
    return TagServiceLegado(session)


# =============================================================================
# INICIALIZAÇÃO DAS TABELAS LEGADAS NO ENGINE
# =============================================================================

def registrar_tabelas_legadas():
    """
    Registra as tabelas legadas no engine SQLAlchemy.
    Deve ser chamado após inicialização do DatabaseManager.
    """
    db = get_db_manager()

    # Cria as tabelas se não existirem (mapeamento)
    # Note: não altera estrutura existente, apenas mapeia
    BaseLegado.metadata.create_all(db.engine, checkfirst=True)

    print("[OK] Tabelas legadas registradas no ORM")


# Para uso direto (teste)
if __name__ == '__main__':
    # Testa os serviços
    from db_manager import DatabaseManager

    # Inicializa banco
    db = DatabaseManager.get_instance()
    registrar_tabelas_legadas()

    # Testa listagem de clientes
    cliente_svc = get_cliente_service()
    clientes, total = cliente_svc.listar(limite=5)
    print(f"Clientes encontrados: {total}")
    for c in clientes:
        print(f"  - {c.nome_fantasia} ({c.cnpj})")

    # Testa listagem de boletos
    boleto_svc = get_boleto_service()
    boletos, total = boleto_svc.listar(limite=5)
    print(f"\nBoletos encontrados: {total}")
    for b in boletos:
        print(f"  - {b.cliente_nome}: R$ {b.valor:.2f} ({b.status})")

    # Testa listagem de tags
    tag_svc = get_tag_service()
    tags = tag_svc.listar()
    print(f"\nTags encontradas: {len(tags)}")
    for t in tags:
        print(f"  - {t.nome} ({t.cor})")
