#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DATA BRIDGE - Ponte entre cnpj_filtrado.db e gestao_documentos.db

Este módulo conecta:
1. cnpj_filtrado.db (base da Receita Federal - 391k empresas)
2. cnaes_permitidos.txt (validação de CNAEs estratégicos)
3. gestao_documentos.db (sistema de geração de documentos)

Workflow:
- Valida empresas por CNAE
- Transforma dados do formato Receita Federal para formato interno
- Prepara dados para geração de documentos
"""

import sqlite3
from pathlib import Path
from typing import Dict, Optional, List, Tuple
from datetime import datetime
import re
import json


class DataBridge:
    """Ponte entre base de CNPJs da Receita Federal e sistema de documentos"""

    def __init__(self, cnpj_db_path: Path, gestao_db_path: Path, cnaes_file: Path):
        """
        Inicializa a ponte de dados

        Args:
            cnpj_db_path: Caminho para cnpj_filtrado.db
            gestao_db_path: Caminho para gestao_documentos.db
            cnaes_file: Caminho para cnaes_permitidos.txt
        """
        self.cnpj_db_path = cnpj_db_path
        self.gestao_db_path = gestao_db_path
        self.cnaes_file = cnaes_file

        # Cache de CNAEs permitidos
        self._cnaes_permitidos = None

        # Estatísticas
        self.stats = {
            'empresas_validadas': 0,
            'empresas_rejeitadas': 0,
            'empresas_sincronizadas': 0,
            'erros': 0
        }

    @property
    def cnaes_permitidos(self) -> set:
        """
        Carrega e cacheia a lista de CNAEs permitidos

        Returns:
            Set de CNAEs no formato 'XX.XX-X-XX'
        """
        if self._cnaes_permitidos is None:
            self._cnaes_permitidos = self._carregar_cnaes_permitidos()
        return self._cnaes_permitidos

    def _carregar_cnaes_permitidos(self) -> set:
        """
        Carrega CNAEs permitidos do arquivo cnaes_permitidos.txt

        Returns:
            Set com códigos CNAE no formato 'XX.XX-X-XX'
        """
        cnaes = set()

        if not self.cnaes_file.exists():
            print(f"[AVISO] Arquivo {self.cnaes_file} não encontrado")
            return cnaes

        with open(self.cnaes_file, 'r', encoding='utf-8') as f:
            for linha in f:
                linha = linha.strip()

                # Ignorar comentários e linhas vazias
                if not linha or linha.startswith('#'):
                    continue

                # Extrair código CNAE (formato: XX.XX-X-XX - Descrição)
                match = re.match(r'^(\d{2}\.\d{2}-\d-\d{2})', linha)
                if match:
                    cnae = match.group(1)
                    cnaes.add(cnae)

        print(f"[OK] {len(cnaes)} CNAEs permitidos carregados")
        return cnaes

    def validar_cnae(self, cnae: str) -> bool:
        """
        Verifica se um CNAE está na lista de permitidos

        Args:
            cnae: Código CNAE no formato 'XX.XX-X-XX' ou 'XXXXXXX'

        Returns:
            True se o CNAE é permitido, False caso contrário
        """
        if not cnae:
            return False

        # Normalizar formato (aceita com ou sem pontuação)
        cnae_limpo = re.sub(r'[^\d]', '', cnae)

        # Formatar para XX.XX-X-XX
        if len(cnae_limpo) == 7:
            cnae_formatado = f"{cnae_limpo[0:2]}.{cnae_limpo[2:4]}-{cnae_limpo[4]}-{cnae_limpo[5:7]}"
        else:
            cnae_formatado = cnae

        return cnae_formatado in self.cnaes_permitidos

    def buscar_empresa_receita(self, cnpj: str) -> Optional[Dict]:
        """
        Busca dados de uma empresa no cnpj_filtrado.db

        Args:
            cnpj: CNPJ da empresa (com ou sem formatação)

        Returns:
            Dicionário com dados da empresa ou None se não encontrada
        """
        # Limpar CNPJ (apenas dígitos)
        cnpj_limpo = re.sub(r'[^\d]', '', cnpj)

        try:
            conn = sqlite3.connect(self.cnpj_db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # Buscar estabelecimento
            query = """
                SELECT
                    e.cnpj_basico || e.cnpj_ordem || e.cnpj_dv as cnpj,
                    e.nome_fantasia,
                    emp.razao_social,
                    e.cnae_fiscal as cnae_fiscal_principal,
                    e.cnae_fiscal_secundaria,
                    e.tipo_logradouro,
                    e.logradouro,
                    e.numero,
                    e.complemento,
                    e.bairro,
                    e.cep,
                    e.uf,
                    e.ddd1 as ddd_1,
                    e.telefone1 as telefone_1,
                    e.correio_eletronico as email,
                    e.situacao_cadastral,
                    e.data_situacao_cadastral,
                    e.data_inicio_atividades as data_inicio_atividade,
                    e.municipio as municipio,
                    e.municipio as codigo_municipio
                FROM estabelecimento e
                LEFT JOIN empresas emp ON e.cnpj_basico = emp.cnpj_basico
                WHERE e.cnpj_basico || e.cnpj_ordem || e.cnpj_dv = ?
                LIMIT 1
            """

            cursor.execute(query, (cnpj_limpo,))
            row = cursor.fetchone()

            if not row:
                return None

            # Converter para dicionário
            empresa = dict(row)

            # CNAEs secundários da coluna cnae_fiscal_secundaria
            if empresa.get('cnae_fiscal_secundaria'):
                empresa['cnaes_secundarios'] = empresa['cnae_fiscal_secundaria'].split(',')
            else:
                empresa['cnaes_secundarios'] = []

            conn.close()
            return empresa

        except sqlite3.Error as e:
            print(f"[ERRO] Erro ao buscar empresa: {e}")
            self.stats['erros'] += 1
            return None

    def transform_empresa_data(self, receita_data: Dict) -> Dict:
        """
        Transforma dados do formato Receita Federal para formato interno

        Args:
            receita_data: Dados da empresa no formato do cnpj_filtrado.db

        Returns:
            Dicionário com dados no formato do gestao_documentos.db
        """
        # Formatar CNPJ
        cnpj = receita_data.get('cnpj', '')
        if len(cnpj) == 14:
            cnpj_formatado = f"{cnpj[0:2]}.{cnpj[2:5]}.{cnpj[5:8]}/{cnpj[8:12]}-{cnpj[12:14]}"
        else:
            cnpj_formatado = cnpj

        # Formatar CEP
        cep = receita_data.get('cep', '')
        if len(cep) == 8:
            cep_formatado = f"{cep[0:5]}-{cep[5:8]}"
        else:
            cep_formatado = cep

        # Formatar telefone
        ddd = receita_data.get('ddd_1', '')
        telefone = receita_data.get('telefone_1', '')
        if ddd and telefone:
            # Remover espaços e formatação
            telefone_limpo = re.sub(r'[^\d]', '', telefone)
            if len(telefone_limpo) == 9:
                telefone_formatado = f"({ddd}) {telefone_limpo[0:5]}-{telefone_limpo[5:9]}"
            elif len(telefone_limpo) == 8:
                telefone_formatado = f"({ddd}) {telefone_limpo[0:4]}-{telefone_limpo[4:8]}"
            else:
                telefone_formatado = f"({ddd}) {telefone}"
        else:
            telefone_formatado = ''

        # Construir endereço completo
        tipo_logradouro = receita_data.get('tipo_logradouro', '')
        logradouro = receita_data.get('logradouro', '')
        numero = receita_data.get('numero', 'S/N')
        complemento = receita_data.get('complemento', '')
        bairro = receita_data.get('bairro', '')
        municipio = receita_data.get('municipio', '')
        uf = receita_data.get('uf', '')

        # Montar rua completa
        rua_completa = f"{tipo_logradouro} {logradouro}".strip() if tipo_logradouro else logradouro

        # Montar endereço completo
        partes_endereco = [rua_completa, numero]
        if complemento:
            partes_endereco.append(complemento)
        partes_endereco.extend([bairro, municipio, uf])
        endereco_completo = ', '.join(filter(None, partes_endereco))

        # Formatar CNAE
        cnae = receita_data.get('cnae_fiscal_principal', '')
        if len(cnae) == 7:
            cnae_formatado = f"{cnae[0:2]}.{cnae[2:4]}-{cnae[4]}-{cnae[5:7]}"
        else:
            cnae_formatado = cnae

        # Calcular dias desde abertura
        data_inicio = receita_data.get('data_inicio_atividade', '')
        dias_desde_abertura = None
        if data_inicio:
            try:
                data_obj = datetime.strptime(data_inicio, '%Y%m%d')
                dias_desde_abertura = (datetime.now() - data_obj).days
            except (ValueError, TypeError):
                pass

        # Determinar categoria de lead
        categoria_lead = 'normal'
        if dias_desde_abertura is not None:
            if dias_desde_abertura <= 30:
                categoria_lead = 'lead_fresco_30'
            elif dias_desde_abertura <= 90:
                categoria_lead = 'lead_fresco_90'
            elif dias_desde_abertura <= 180:
                categoria_lead = 'lead_fresco_180'

        # Montar dados transformados
        dados_transformados = {
            # Identificação
            'nome_fantasia': receita_data.get('nome_fantasia', '') or receita_data.get('razao_social', ''),
            'razao_social': receita_data.get('razao_social', ''),
            'cnpj': cnpj_formatado,
            'cnpj_numerico': cnpj,

            # Endereço
            'rua': rua_completa,
            'numero': numero,
            'complemento': complemento,
            'bairro': bairro,
            'cidade': municipio,
            'uf': uf,
            'cep': cep_formatado,
            'endereco_completo': endereco_completo,

            # Contato
            'telefone': telefone_formatado,
            'email': receita_data.get('email', ''),

            # Atividade
            'cnae': cnae_formatado,
            'cnae_numerico': cnae,
            'cnaes_secundarios': receita_data.get('cnaes_secundarios', []),

            # Situação cadastral
            'situacao_cadastral': receita_data.get('situacao_cadastral', ''),
            'data_situacao_cadastral': receita_data.get('data_situacao_cadastral', ''),
            'data_inicio_atividade': data_inicio,
            'dias_desde_abertura': dias_desde_abertura,
            'categoria_lead': categoria_lead,

            # Metadados
            'origem': 'cnpj_filtrado',
            'validado_por_cnae': self.validar_cnae(cnae),
            'data_importacao': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }

        return dados_transformados

    def inserir_cliente_gestao(self, dados: Dict) -> Optional[int]:
        """
        Insere empresa no gestao_documentos.db

        Args:
            dados: Dados da empresa transformados

        Returns:
            ID do cliente inserido ou None se erro
        """
        try:
            conn = sqlite3.connect(self.gestao_db_path)
            cursor = conn.cursor()

            # Verificar se já existe
            cursor.execute("SELECT id FROM clientes WHERE cnpj = ?", (dados['cnpj_numerico'],))
            existente = cursor.fetchone()

            if existente:
                print(f"[INFO] Cliente {dados['nome_fantasia']} já existe (ID: {existente[0]})")
                conn.close()
                return existente[0]

            # Inserir novo cliente
            query = """
                INSERT INTO clientes (
                    nome_fantasia, razao_social, cnpj, rua, numero,
                    complemento, bairro, cidade, uf, cep,
                    telefone, email, endereco_completo, cnae,
                    origem, validado_cnae, categoria_lead
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """

            cursor.execute(query, (
                dados['nome_fantasia'],
                dados['razao_social'],
                dados['cnpj_numerico'],
                dados['rua'],
                dados['numero'],
                dados.get('complemento', ''),
                dados['bairro'],
                dados['cidade'],
                dados['uf'],
                dados['cep'],
                dados['telefone'],
                dados.get('email', ''),
                dados['endereco_completo'],
                dados['cnae_numerico'],
                dados.get('origem', 'cnpj_filtrado'),
                1 if dados.get('validado_por_cnae', False) else 0,
                dados.get('categoria_lead', 'normal')
            ))

            cliente_id = cursor.lastrowid
            conn.commit()
            conn.close()

            print(f"[OK] Cliente {dados['nome_fantasia']} inserido (ID: {cliente_id})")
            self.stats['empresas_sincronizadas'] += 1

            return cliente_id

        except sqlite3.Error as e:
            print(f"[ERRO] Erro ao inserir cliente: {e}")
            self.stats['erros'] += 1
            return None

    def sync_empresa(self, cnpj: str, validar_cnae: bool = True) -> Optional[int]:
        """
        Workflow completo: buscar → validar → transformar → inserir

        Args:
            cnpj: CNPJ da empresa
            validar_cnae: Se True, só sincroniza empresas com CNAE permitido

        Returns:
            ID do cliente inserido ou None se erro/validação falhou
        """
        # PASSO 1: Buscar dados na Receita Federal
        receita_data = self.buscar_empresa_receita(cnpj)
        if not receita_data:
            print(f"[ERRO] Empresa {cnpj} não encontrada no cnpj_filtrado.db")
            self.stats['empresas_rejeitadas'] += 1
            return None

        # PASSO 2: Validar CNAE (se solicitado)
        cnae = receita_data.get('cnae_fiscal_principal', '')
        if validar_cnae and not self.validar_cnae(cnae):
            print(f"[REJEITADO] Empresa {receita_data.get('nome_fantasia')} - CNAE {cnae} não permitido")
            self.stats['empresas_rejeitadas'] += 1
            return None

        self.stats['empresas_validadas'] += 1

        # PASSO 3: Transformar dados
        dados_transformados = self.transform_empresa_data(receita_data)

        # PASSO 4: Inserir no gestao_documentos.db
        cliente_id = self.inserir_cliente_gestao(dados_transformados)

        return cliente_id

    def prepare_document_data(self, cliente_id: int) -> Optional[Dict]:
        """
        Prepara todos os dados necessários para geração de documentos

        Args:
            cliente_id: ID do cliente no gestao_documentos.db

        Returns:
            Dicionário com todos os dados formatados para templates
        """
        try:
            conn = sqlite3.connect(self.gestao_db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # Buscar dados do cliente
            cursor.execute("SELECT * FROM clientes WHERE id = ?", (cliente_id,))
            row = cursor.fetchone()

            if not row:
                print(f"[ERRO] Cliente {cliente_id} não encontrado")
                return None

            cliente = dict(row)

            # Preparar dados para templates
            dados_template = {
                # Identificação
                'nome_fantasia': cliente['nome_fantasia'],
                'razao_social': cliente['razao_social'],
                'cnpj': cliente['cnpj'],

                # Endereço completo
                'endereco': cliente['endereco_completo'],
                'rua': cliente['rua'],
                'numero': cliente['numero'],
                'bairro': cliente['bairro'],
                'cidade': cliente['cidade'],
                'uf': cliente['uf'],
                'cep': cliente['cep'],

                # Contato
                'telefone': cliente['telefone'],
                'email': cliente['email'],

                # Atividade
                'cnae': cliente.get('cnae', ''),

                # Datas
                'data_atual': datetime.now().strftime('%d/%m/%Y'),
                'mes_atual': datetime.now().strftime('%B/%Y'),
                'ano_atual': datetime.now().strftime('%Y'),

                # Categoria de lead
                'categoria_lead': cliente.get('categoria_lead', 'normal'),
                'is_lead_fresco': cliente.get('categoria_lead', '').startswith('lead_fresco')
            }

            conn.close()
            return dados_template

        except sqlite3.Error as e:
            print(f"[ERRO] Erro ao preparar dados: {e}")
            return None

    def get_estatisticas(self) -> Dict:
        """
        Retorna estatísticas da ponte de dados

        Returns:
            Dicionário com estatísticas
        """
        return {
            **self.stats,
            'total_cnaes_permitidos': len(self.cnaes_permitidos),
            'taxa_aprovacao': (
                self.stats['empresas_validadas'] /
                (self.stats['empresas_validadas'] + self.stats['empresas_rejeitadas'])
            ) if (self.stats['empresas_validadas'] + self.stats['empresas_rejeitadas']) > 0 else 0
        }

    def sync_lote(self, cnpjs: List[str], validar_cnae: bool = True) -> Dict:
        """
        Sincroniza múltiplas empresas em lote

        Args:
            cnpjs: Lista de CNPJs
            validar_cnae: Se True, valida CNAEs

        Returns:
            Dicionário com resultado do processamento
        """
        resultados = {
            'sucesso': [],
            'rejeitados': [],
            'erros': []
        }

        for cnpj in cnpjs:
            cliente_id = self.sync_empresa(cnpj, validar_cnae)

            if cliente_id:
                resultados['sucesso'].append({'cnpj': cnpj, 'cliente_id': cliente_id})
            elif cliente_id is None and self.stats['empresas_rejeitadas'] > 0:
                resultados['rejeitados'].append(cnpj)
            else:
                resultados['erros'].append(cnpj)

        return resultados


# Função auxiliar para uso fácil
def criar_bridge(base_dir: Path = None) -> DataBridge:
    """
    Cria instância da ponte de dados com caminhos padrão

    Args:
        base_dir: Diretório base (usa diretório atual se None)

    Returns:
        Instância configurada de DataBridge
    """
    if base_dir is None:
        base_dir = Path(__file__).parent

    cnpj_db = base_dir / 'cnpj_filtrado.db'
    gestao_db = base_dir / 'gestao_documentos.db'
    cnaes_file = base_dir / 'cnaes_permitidos.txt'

    return DataBridge(cnpj_db, gestao_db, cnaes_file)


if __name__ == '__main__':
    # Teste básico
    print("=" * 60)
    print("DATA BRIDGE - Teste de Inicialização")
    print("=" * 60)

    bridge = criar_bridge()

    print(f"\n[OK] Bridge inicializada")
    print(f"[OK] CNAEs permitidos: {len(bridge.cnaes_permitidos)}")
    print(f"[OK] Estatísticas: {bridge.get_estatisticas()}")

    print("\n" + "=" * 60)
    print("Ponte pronta para uso!")
    print("=" * 60)
