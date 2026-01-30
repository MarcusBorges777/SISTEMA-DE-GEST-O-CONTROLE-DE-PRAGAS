#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Services - Camada de Lógica de Negócio

Este módulo contém os serviços que encapsulam a lógica de negócio do sistema.
Cada serviço é responsável por uma entidade ou domínio específico.

Benefícios:
- Separação de responsabilidades (rotas HTTP vs lógica de negócio)
- Facilita testes unitários
- Reduz tamanho do app.py
- Centraliza regras de negócio
"""

from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple
from pathlib import Path
import re
import os

from sqlalchemy import and_, or_, func, desc
from sqlalchemy.orm import Session, joinedload

from models import (
    Cliente, Endereco, Contato, HistoricoCliente,
    DocumentoGerado, FilaDocumento, Tag, DocumentoTag,
    TituloReceber, Recibo, FormaPagamento,
    Servico, Produto, Praga
)
from db_manager import DatabaseManager, get_db_manager


# =============================================================================
# CLIENTE SERVICE
# =============================================================================

class ClienteService:
    """Serviço para operações com Clientes."""

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
        status: str = 'ativo',
        limite: int = 100,
        offset: int = 0
    ) -> Tuple[List[Cliente], int]:
        """
        Lista clientes com filtros opcionais.

        Returns:
            Tuple de (lista de clientes, total de registros)
        """
        query = self.session.query(Cliente)

        # Filtros
        if nome:
            query = query.filter(
                or_(
                    Cliente.nome_fantasia.ilike(f'%{nome}%'),
                    Cliente.razao_social.ilike(f'%{nome}%')
                )
            )

        if cidade:
            # Join com endereços para filtrar por cidade
            query = query.join(Cliente.enderecos).filter(
                Endereco.cidade.ilike(f'%{cidade}%')
            )

        if cnpj:
            query = query.filter(Cliente.cpf_cnpj.ilike(f'%{cnpj}%'))

        if cnae:
            query = query.filter(Cliente.cnae.ilike(f'{cnae}%'))

        if status:
            query = query.filter(Cliente.status == status)

        # Conta total antes de paginar
        total = query.count()

        # Paginação e ordenação
        clientes = query.options(
            joinedload(Cliente.enderecos)
        ).order_by(
            Cliente.nome_fantasia
        ).offset(offset).limit(limite).all()

        return clientes, total

    def buscar_por_id(self, cliente_id: int) -> Optional[Cliente]:
        """Busca cliente por ID."""
        return self.session.query(Cliente).options(
            joinedload(Cliente.enderecos),
            joinedload(Cliente.contatos)
        ).get(cliente_id)

    def buscar_por_cnpj(self, cnpj: str) -> Optional[Cliente]:
        """Busca cliente por CPF/CNPJ."""
        cnpj_limpo = self._limpar_documento(cnpj)
        return self.session.query(Cliente).filter(
            Cliente.cpf_cnpj == cnpj_limpo
        ).first()

    def criar(self, dados: Dict[str, Any]) -> Cliente:
        """
        Cria novo cliente com endereço.

        Args:
            dados: Dict com campos do cliente e opcional 'endereco'

        Returns:
            Cliente criado
        """
        # Extrai dados do endereço
        endereco_dados = dados.pop('endereco', None)

        # Formata CPF/CNPJ
        if 'cpf_cnpj' in dados:
            dados['cpf_cnpj'] = self._formatar_documento(dados['cpf_cnpj'])

        # Cria cliente
        cliente = Cliente(**dados)
        self.session.add(cliente)
        self.session.flush()  # Obtém ID

        # Cria endereço se fornecido
        if endereco_dados:
            endereco_dados['cliente_id'] = cliente.id
            endereco_dados['endereco_padrao'] = True
            endereco = Endereco(**endereco_dados)
            self.session.add(endereco)

        self.session.commit()
        return cliente

    def atualizar(self, cliente_id: int, dados: Dict[str, Any]) -> Optional[Cliente]:
        """
        Atualiza cliente existente.

        Args:
            cliente_id: ID do cliente
            dados: Dict com campos a atualizar

        Returns:
            Cliente atualizado ou None se não encontrado
        """
        cliente = self.buscar_por_id(cliente_id)
        if not cliente:
            return None

        # Extrai dados do endereço
        endereco_dados = dados.pop('endereco', None)

        # Formata CPF/CNPJ
        if 'cpf_cnpj' in dados:
            dados['cpf_cnpj'] = self._formatar_documento(dados['cpf_cnpj'])

        # Atualiza campos
        for campo, valor in dados.items():
            if hasattr(cliente, campo):
                setattr(cliente, campo, valor)

        cliente.updated_at = datetime.now()

        # Atualiza endereço principal se fornecido
        if endereco_dados:
            endereco_principal = cliente.endereco_principal
            if endereco_principal:
                for campo, valor in endereco_dados.items():
                    if hasattr(endereco_principal, campo):
                        setattr(endereco_principal, campo, valor)
                endereco_principal.updated_at = datetime.now()
            else:
                # Cria novo endereço
                endereco_dados['cliente_id'] = cliente.id
                endereco_dados['endereco_padrao'] = True
                endereco = Endereco(**endereco_dados)
                self.session.add(endereco)

        self.session.commit()
        return cliente

    def deletar(self, cliente_id: int) -> bool:
        """
        Deleta cliente (soft delete - muda status para inativo).

        Args:
            cliente_id: ID do cliente

        Returns:
            True se deletado, False se não encontrado
        """
        cliente = self.buscar_por_id(cliente_id)
        if not cliente:
            return False

        # Soft delete
        cliente.status = 'inativo'
        cliente.updated_at = datetime.now()
        self.session.commit()
        return True

    def deletar_permanente(self, cliente_id: int) -> bool:
        """
        Deleta cliente permanentemente (hard delete).

        Args:
            cliente_id: ID do cliente

        Returns:
            True se deletado, False se não encontrado
        """
        cliente = self.buscar_por_id(cliente_id)
        if not cliente:
            return False

        self.session.delete(cliente)
        self.session.commit()
        return True

    def garantias_vencendo(self, dias: int = 30) -> List[Dict[str, Any]]:
        """
        Lista clientes com garantia vencendo nos próximos dias.

        Args:
            dias: Número de dias para considerar

        Returns:
            Lista de dicts com info de garantia
        """
        # Busca documentos com data de conclusão (que define início da garantia)
        data_limite = datetime.now() + timedelta(days=dias)

        # Query para encontrar documentos concluídos recentemente
        documentos = self.session.query(DocumentoGerado).filter(
            DocumentoGerado.data_conclusao.isnot(None),
            DocumentoGerado.tipo_documento.in_(['laudo_tecnico', 'certificado'])
        ).all()

        # Agrupa por cliente e calcula garantias
        garantias = []
        clientes_processados = set()

        for doc in documentos:
            if doc.cliente_id in clientes_processados:
                continue

            cliente = doc.cliente
            if not cliente:
                continue

            # Calcula data fim da garantia (padrão 90 dias)
            data_inicio = doc.data_conclusao
            periodo_dias = 90  # Pode vir do template ou config
            data_fim = data_inicio + timedelta(days=periodo_dias)

            if data_fim <= data_limite:
                dias_restantes = (data_fim - datetime.now()).days
                garantias.append({
                    'cliente_id': cliente.id,
                    'cliente_nome': cliente.nome_fantasia,
                    'data_inicio_garantia': data_inicio.isoformat(),
                    'data_fim_garantia': data_fim.isoformat(),
                    'dias_restantes': dias_restantes,
                    'status': 'vencida' if dias_restantes < 0 else 'vencendo'
                })
                clientes_processados.add(doc.cliente_id)

        return sorted(garantias, key=lambda x: x['dias_restantes'])

    def _limpar_documento(self, doc: str) -> str:
        """Remove formatação de CPF/CNPJ."""
        if not doc:
            return doc
        return re.sub(r'[^\d]', '', doc)

    def _formatar_documento(self, doc: str) -> str:
        """Formata CPF ou CNPJ."""
        if not doc:
            return doc

        digits = re.sub(r'[^\d]', '', doc)

        if len(digits) == 11:
            return f"{digits[:3]}.{digits[3:6]}.{digits[6:9]}-{digits[9:]}"
        elif len(digits) == 14:
            return f"{digits[:2]}.{digits[2:5]}.{digits[5:8]}/{digits[8:12]}-{digits[12:]}"
        else:
            return doc


# =============================================================================
# DOCUMENTO SERVICE
# =============================================================================

class DocumentoService:
    """Serviço para operações com Documentos Gerados."""

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
        cliente_id: int = None,
        status: str = None,
        data_inicio: date = None,
        data_fim: date = None,
        limite: int = 50,
        offset: int = 0
    ) -> Tuple[List[DocumentoGerado], int]:
        """
        Lista documentos com filtros.

        Returns:
            Tuple de (lista de documentos, total)
        """
        query = self.session.query(DocumentoGerado)

        if tipo:
            query = query.filter(DocumentoGerado.tipo_documento == tipo)

        if cliente_id:
            query = query.filter(DocumentoGerado.cliente_id == cliente_id)

        if status:
            query = query.filter(DocumentoGerado.status_geracao == status)

        if data_inicio:
            query = query.filter(DocumentoGerado.data_solicitacao >= data_inicio)

        if data_fim:
            query = query.filter(DocumentoGerado.data_solicitacao <= data_fim)

        total = query.count()

        documentos = query.options(
            joinedload(DocumentoGerado.cliente),
            joinedload(DocumentoGerado.tags)
        ).order_by(
            desc(DocumentoGerado.data_solicitacao)
        ).offset(offset).limit(limite).all()

        return documentos, total

    def buscar_por_id(self, doc_id: int) -> Optional[DocumentoGerado]:
        """Busca documento por ID."""
        return self.session.query(DocumentoGerado).options(
            joinedload(DocumentoGerado.cliente),
            joinedload(DocumentoGerado.tags)
        ).get(doc_id)

    def buscar_por_nome(self, nome_arquivo: str) -> Optional[DocumentoGerado]:
        """Busca documento por nome de arquivo."""
        return self.session.query(DocumentoGerado).filter(
            DocumentoGerado.nome_arquivo == nome_arquivo
        ).first()

    def criar(self, dados: Dict[str, Any]) -> DocumentoGerado:
        """
        Registra novo documento gerado.

        Args:
            dados: Dict com campos do documento

        Returns:
            DocumentoGerado criado
        """
        documento = DocumentoGerado(**dados)
        self.session.add(documento)
        self.session.commit()
        return documento

    def atualizar_status(
        self,
        doc_id: int,
        status: str,
        erro: str = None
    ) -> Optional[DocumentoGerado]:
        """
        Atualiza status de geração do documento.

        Args:
            doc_id: ID do documento
            status: Novo status
            erro: Mensagem de erro (se status='erro')

        Returns:
            Documento atualizado ou None
        """
        documento = self.buscar_por_id(doc_id)
        if not documento:
            return None

        documento.status_geracao = status
        documento.updated_at = datetime.now()

        if status == 'gerado':
            documento.data_geracao = datetime.now()
        elif status == 'erro':
            documento.erro_mensagem = erro
            documento.tentativas_geracao += 1

        self.session.commit()
        return documento

    def renomear(self, doc_id: int, novo_nome: str) -> Optional[DocumentoGerado]:
        """Renomeia documento."""
        documento = self.buscar_por_id(doc_id)
        if not documento:
            return None

        # Renomeia arquivo físico se existir
        if documento.caminho_arquivo:
            caminho_antigo = Path(documento.caminho_arquivo)
            if caminho_antigo.exists():
                novo_caminho = caminho_antigo.parent / novo_nome
                caminho_antigo.rename(novo_caminho)
                documento.caminho_arquivo = str(novo_caminho)

        documento.nome_arquivo = novo_nome
        documento.updated_at = datetime.now()
        self.session.commit()
        return documento

    def deletar(self, doc_id: int, deletar_arquivo: bool = True) -> bool:
        """
        Deleta documento.

        Args:
            doc_id: ID do documento
            deletar_arquivo: Se True, também deleta arquivo físico

        Returns:
            True se deletado
        """
        documento = self.buscar_por_id(doc_id)
        if not documento:
            return False

        # Deleta arquivo físico
        if deletar_arquivo and documento.caminho_arquivo:
            caminho = Path(documento.caminho_arquivo)
            if caminho.exists():
                caminho.unlink()

        self.session.delete(documento)
        self.session.commit()
        return True

    def analise_financeira(
        self,
        data_inicio: date = None,
        data_fim: date = None
    ) -> Dict[str, Any]:
        """
        Gera análise financeira dos documentos.

        Returns:
            Dict com estatísticas financeiras
        """
        query = self.session.query(DocumentoGerado).filter(
            DocumentoGerado.valor_total.isnot(None)
        )

        if data_inicio:
            query = query.filter(DocumentoGerado.data_geracao >= data_inicio)

        if data_fim:
            query = query.filter(DocumentoGerado.data_geracao <= data_fim)

        documentos = query.all()

        # Agrupa por tipo
        por_tipo = {}
        total_geral = Decimal('0')

        for doc in documentos:
            tipo = doc.tipo_documento
            valor = Decimal(str(doc.valor_total or 0))

            if tipo not in por_tipo:
                por_tipo[tipo] = {'quantidade': 0, 'valor_total': Decimal('0')}

            por_tipo[tipo]['quantidade'] += 1
            por_tipo[tipo]['valor_total'] += valor
            total_geral += valor

        # Agrupa por mês
        por_mes = {}
        for doc in documentos:
            if doc.data_geracao:
                mes = doc.data_geracao.strftime('%Y-%m')
                valor = Decimal(str(doc.valor_total or 0))

                if mes not in por_mes:
                    por_mes[mes] = {'quantidade': 0, 'valor_total': Decimal('0')}

                por_mes[mes]['quantidade'] += 1
                por_mes[mes]['valor_total'] += valor

        # Top clientes
        clientes_valor = {}
        for doc in documentos:
            nome = doc.cliente_nome or 'Desconhecido'
            valor = Decimal(str(doc.valor_total or 0))

            if nome not in clientes_valor:
                clientes_valor[nome] = {'quantidade': 0, 'valor_total': Decimal('0')}

            clientes_valor[nome]['quantidade'] += 1
            clientes_valor[nome]['valor_total'] += valor

        top_clientes = sorted(
            clientes_valor.items(),
            key=lambda x: x[1]['valor_total'],
            reverse=True
        )[:10]

        return {
            'total_documentos': len(documentos),
            'valor_total': float(total_geral),
            'por_tipo': {k: {'quantidade': v['quantidade'], 'valor_total': float(v['valor_total'])}
                         for k, v in por_tipo.items()},
            'por_mes': {k: {'quantidade': v['quantidade'], 'valor_total': float(v['valor_total'])}
                        for k, v in sorted(por_mes.items())},
            'top_clientes': [{'nome': k, 'quantidade': v['quantidade'], 'valor_total': float(v['valor_total'])}
                             for k, v in top_clientes]
        }


# =============================================================================
# TAG SERVICE
# =============================================================================

class TagService:
    """Serviço para operações com Tags."""

    def __init__(self, session: Session = None):
        self.db = get_db_manager()
        self._session = session

    @property
    def session(self) -> Session:
        if self._session:
            return self._session
        return self.db.session

    def listar(self) -> List[Tag]:
        """Lista todas as tags."""
        return self.session.query(Tag).order_by(Tag.nome).all()

    def buscar_por_id(self, tag_id: int) -> Optional[Tag]:
        """Busca tag por ID."""
        return self.session.query(Tag).get(tag_id)

    def buscar_por_nome(self, nome: str) -> Optional[Tag]:
        """Busca tag por nome."""
        return self.session.query(Tag).filter(Tag.nome == nome).first()

    def criar(self, nome: str, descricao: str = None, cor: str = '#3B82F6') -> Tag:
        """Cria nova tag."""
        tag = Tag(nome=nome, descricao=descricao, cor=cor)
        self.session.add(tag)
        self.session.commit()
        return tag

    def adicionar_ao_documento(
        self,
        documento_id: int,
        tag_id: int,
        confianca: float = 1.0,
        manual: bool = True
    ) -> DocumentoTag:
        """Adiciona tag a um documento."""
        doc_tag = DocumentoTag(
            documento_id=documento_id,
            arquivo_tipo='documento',
            tag_id=tag_id,
            confianca=confianca,
            manual=manual
        )
        self.session.add(doc_tag)
        self.session.commit()
        return doc_tag

    def remover_do_documento(self, documento_id: int, tag_id: int) -> bool:
        """Remove tag de um documento."""
        doc_tag = self.session.query(DocumentoTag).filter(
            DocumentoTag.documento_id == documento_id,
            DocumentoTag.tag_id == tag_id
        ).first()

        if doc_tag:
            self.session.delete(doc_tag)
            self.session.commit()
            return True
        return False

    def tags_do_documento(self, documento_id: int) -> List[Tag]:
        """Lista tags de um documento."""
        return self.session.query(Tag).join(
            DocumentoTag
        ).filter(
            DocumentoTag.documento_id == documento_id
        ).all()

    def sugerir_por_tipo(self, tipo_documento: str) -> List[Tag]:
        """Sugere tags baseado no tipo do documento."""
        mapeamento = {
            'laudo_tecnico': ['Laudo'],
            'certificado': ['Laudo', 'Contrato'],
            'orcamento': ['Orçamento'],
            'recibo': ['Recibo'],
            'boleto': ['Boleto'],
            'contrato': ['Contrato'],
            'relatorio': ['Relatório'],
        }

        nomes_sugeridos = mapeamento.get(tipo_documento, ['Outros'])

        return self.session.query(Tag).filter(
            Tag.nome.in_(nomes_sugeridos)
        ).all()


# =============================================================================
# TITULO SERVICE (Boletos/Contas a Receber)
# =============================================================================

class TituloService:
    """Serviço para operações com Títulos a Receber (Boletos)."""

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
        status: str = None,
        vencimento_ate: date = None,
        limite: int = 50,
        offset: int = 0
    ) -> Tuple[List[TituloReceber], int]:
        """Lista títulos com filtros."""
        query = self.session.query(TituloReceber)

        if cliente_id:
            query = query.filter(TituloReceber.cliente_id == cliente_id)

        if status:
            query = query.filter(TituloReceber.status == status)

        if vencimento_ate:
            query = query.filter(TituloReceber.data_vencimento <= vencimento_ate)

        total = query.count()

        titulos = query.options(
            joinedload(TituloReceber.cliente)
        ).order_by(
            TituloReceber.data_vencimento
        ).offset(offset).limit(limite).all()

        return titulos, total

    def buscar_por_id(self, titulo_id: int) -> Optional[TituloReceber]:
        """Busca título por ID."""
        return self.session.query(TituloReceber).options(
            joinedload(TituloReceber.cliente)
        ).get(titulo_id)

    def criar(self, dados: Dict[str, Any]) -> TituloReceber:
        """Cria novo título."""
        # Gera número do título se não fornecido
        if 'numero_titulo' not in dados:
            ano = datetime.now().year
            count = self.session.query(TituloReceber).filter(
                TituloReceber.numero_titulo.like(f'BOL-{ano}%')
            ).count()
            dados['numero_titulo'] = f"BOL-{ano}-{count + 1:04d}"

        # Calcula valor_saldo se não fornecido
        if 'valor_saldo' not in dados:
            dados['valor_saldo'] = dados.get('valor_total', 0)

        titulo = TituloReceber(**dados)
        self.session.add(titulo)
        self.session.commit()
        return titulo

    def atualizar(self, titulo_id: int, dados: Dict[str, Any]) -> Optional[TituloReceber]:
        """Atualiza título existente."""
        titulo = self.buscar_por_id(titulo_id)
        if not titulo:
            return None

        for campo, valor in dados.items():
            if hasattr(titulo, campo):
                setattr(titulo, campo, valor)

        titulo.updated_at = datetime.now()
        self.session.commit()
        return titulo

    def registrar_pagamento(
        self,
        titulo_id: int,
        valor_pago: Decimal,
        data_pagamento: date = None
    ) -> Optional[TituloReceber]:
        """
        Registra pagamento de título.

        Args:
            titulo_id: ID do título
            valor_pago: Valor pago
            data_pagamento: Data do pagamento (default: hoje)

        Returns:
            Título atualizado
        """
        titulo = self.buscar_por_id(titulo_id)
        if not titulo:
            return None

        titulo.valor_pago = (titulo.valor_pago or Decimal('0')) + valor_pago
        titulo.valor_saldo = titulo.valor_total - titulo.valor_pago
        titulo.data_pagamento = data_pagamento or date.today()

        if titulo.valor_saldo <= 0:
            titulo.status = 'pago'
        else:
            titulo.status = 'pago_parcial'

        titulo.updated_at = datetime.now()
        self.session.commit()
        return titulo

    def cancelar(self, titulo_id: int) -> Optional[TituloReceber]:
        """Cancela título."""
        titulo = self.buscar_por_id(titulo_id)
        if not titulo:
            return None

        titulo.status = 'cancelado'
        titulo.updated_at = datetime.now()
        self.session.commit()
        return titulo

    def vencendo(self, dias: int = 7) -> List[TituloReceber]:
        """Lista títulos vencendo nos próximos dias."""
        data_limite = date.today() + timedelta(days=dias)

        return self.session.query(TituloReceber).filter(
            TituloReceber.status == 'pendente',
            TituloReceber.data_vencimento <= data_limite
        ).order_by(
            TituloReceber.data_vencimento
        ).all()

    def deletar(self, titulo_id: int) -> bool:
        """Deleta título."""
        titulo = self.buscar_por_id(titulo_id)
        if not titulo:
            return False

        self.session.delete(titulo)
        self.session.commit()
        return True


# =============================================================================
# RECIBO SERVICE
# =============================================================================

class ReciboService:
    """Serviço para operações com Recibos."""

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
        limite: int = 50,
        offset: int = 0
    ) -> Tuple[List[Recibo], int]:
        """Lista recibos com filtros."""
        query = self.session.query(Recibo)

        if cliente_id:
            query = query.filter(Recibo.cliente_id == cliente_id)

        if data_inicio:
            query = query.filter(Recibo.data_emissao >= data_inicio)

        if data_fim:
            query = query.filter(Recibo.data_emissao <= data_fim)

        total = query.count()

        recibos = query.options(
            joinedload(Recibo.cliente)
        ).order_by(
            desc(Recibo.data_emissao)
        ).offset(offset).limit(limite).all()

        return recibos, total

    def buscar_por_id(self, recibo_id: int) -> Optional[Recibo]:
        """Busca recibo por ID."""
        return self.session.query(Recibo).options(
            joinedload(Recibo.cliente)
        ).get(recibo_id)

    def criar(self, dados: Dict[str, Any]) -> Recibo:
        """Cria novo recibo."""
        # Gera número do recibo se não fornecido
        if 'numero_recibo' not in dados:
            ano = datetime.now().year
            count = self.session.query(Recibo).filter(
                Recibo.numero_recibo.like(f'REC-{ano}%')
            ).count()
            dados['numero_recibo'] = f"REC-{ano}-{count + 1:04d}"

        recibo = Recibo(**dados)
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


# =============================================================================
# FUNÇÕES AUXILIARES PARA GERAÇÃO DE DOCUMENTOS
# =============================================================================

def preparar_dados_laudo(cliente: Cliente, dados_extras: Dict = None) -> Dict[str, Any]:
    """
    Prepara dados para geração de laudo.

    Args:
        cliente: Objeto Cliente
        dados_extras: Dados adicionais do formulário

    Returns:
        Dict com dados formatados para o template
    """
    endereco = cliente.endereco_principal
    dados_extras = dados_extras or {}

    dados = {
        # Dados do Cliente
        'cliente_nome': cliente.nome_fantasia,
        'razao_social': cliente.razao_social or cliente.nome_fantasia,
        'cnpj': cliente.cpf_cnpj,
        'cnae': cliente.cnae,

        # Endereço
        'endereco': endereco.endereco_completo if endereco else '',
        'rua': endereco.logradouro if endereco else '',
        'numero': endereco.numero if endereco else '',
        'bairro': endereco.bairro if endereco else '',
        'cidade': endereco.cidade if endereco else '',
        'uf': endereco.uf if endereco else '',
        'cep': endereco.cep if endereco else '',

        # Contato
        'telefone': cliente.telefone_principal,
        'email': cliente.email,

        # Datas
        'data_atual': datetime.now().strftime('%d/%m/%Y'),
        'data_servico': dados_extras.get('data_servico', datetime.now().strftime('%d/%m/%Y')),
        'data_validade': dados_extras.get('data_validade'),

        # Serviço
        'tipo_servico': dados_extras.get('tipo_servico', 'Controle de Pragas'),
        'descricao_servico': dados_extras.get('descricao_servico', ''),
        'observacoes': dados_extras.get('observacoes', ''),

        # Produtos/Técnico
        'produtos_utilizados': dados_extras.get('produtos', []),
        'tecnico_responsavel': dados_extras.get('tecnico', ''),
        'registro_profissional': dados_extras.get('registro', ''),
    }

    return dados


def preparar_dados_recibo(
    cliente: Cliente,
    valor: Decimal,
    descricao: str,
    dados_extras: Dict = None
) -> Dict[str, Any]:
    """
    Prepara dados para geração de recibo.

    Args:
        cliente: Objeto Cliente
        valor: Valor do recibo
        descricao: Descrição do serviço
        dados_extras: Dados adicionais

    Returns:
        Dict com dados formatados
    """
    dados_extras = dados_extras or {}
    endereco = cliente.endereco_principal

    # Formata valor por extenso
    valor_extenso = _valor_por_extenso(valor)

    dados = {
        'cliente_nome': cliente.nome_fantasia,
        'razao_social': cliente.razao_social or cliente.nome_fantasia,
        'cnpj': cliente.cpf_cnpj,
        'endereco': endereco.endereco_completo if endereco else '',
        'valor': f"R$ {valor:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'),
        'valor_extenso': valor_extenso,
        'descricao': descricao,
        'data_emissao': datetime.now().strftime('%d/%m/%Y'),
        'forma_pagamento': dados_extras.get('forma_pagamento', 'Dinheiro'),
        'numero_recibo': dados_extras.get('numero_recibo'),
    }

    return dados


def _valor_por_extenso(valor: Decimal) -> str:
    """Converte valor numérico para extenso (simplificado)."""
    # Implementação simplificada - para produção usar biblioteca específica
    try:
        valor_int = int(valor)
        centavos = int((valor - valor_int) * 100)

        if valor_int == 0:
            return "zero reais"

        # Dicionários para conversão
        unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove']
        dezenas = ['', 'dez', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
        centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']
        especiais = {11: 'onze', 12: 'doze', 13: 'treze', 14: 'quatorze', 15: 'quinze', 16: 'dezesseis', 17: 'dezessete', 18: 'dezoito', 19: 'dezenove'}

        def converter_grupo(n):
            if n == 0:
                return ''
            if n == 100:
                return 'cem'
            if 11 <= n <= 19:
                return especiais[n]

            c = n // 100
            d = (n % 100) // 10
            u = n % 10

            partes = []
            if c > 0:
                partes.append(centenas[c])
            if d > 0:
                partes.append(dezenas[d])
            if u > 0:
                partes.append(unidades[u])

            return ' e '.join(partes)

        resultado = converter_grupo(valor_int)
        resultado += ' real' if valor_int == 1 else ' reais'

        if centavos > 0:
            resultado += ' e ' + converter_grupo(centavos)
            resultado += ' centavo' if centavos == 1 else ' centavos'

        return resultado

    except Exception:
        return str(valor)
