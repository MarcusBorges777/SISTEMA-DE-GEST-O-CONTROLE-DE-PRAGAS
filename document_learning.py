#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sistema de Aprendizagem de Layouts de Documentos
Aprende padrões de notas fiscais e boletos para melhorar extração de dados
"""

import json
import re
import hashlib
from pathlib import Path
from datetime import datetime
from collections import defaultdict, Counter
from typing import Dict, List, Tuple, Optional
import pdfplumber
import sqlite3


class DocumentLayoutLearner:
    """
    Aprende e identifica layouts de documentos (notas fiscais e boletos)
    """
    
    def __init__(self, db_path: Path, training_dir: Path):
        self.db_path = db_path
        self.training_dir = training_dir
        self.training_dir.mkdir(exist_ok=True)
        
        # Diretórios para diferentes tipos de documentos
        self.nfse_dir = training_dir / 'nfse'
        self.boleto_dir = training_dir / 'boletos'
        self.nfse_dir.mkdir(exist_ok=True)
        self.boleto_dir.mkdir(exist_ok=True)
        
        # Cache de layouts conhecidos
        self.layouts_conhecidos = {}
        self.carregar_layouts()
    
    def criar_tabelas(self):
        """Cria tabelas no banco para armazenar layouts aprendidos"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        # Tabela de layouts identificados
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS document_layouts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tipo_doc TEXT NOT NULL,
                layout_hash TEXT UNIQUE NOT NULL,
                nome_layout TEXT,
                emissor TEXT,
                palavras_chave TEXT,
                regex_patterns TEXT,
                posicoes_campos TEXT,
                estrategia_extracao TEXT,
                confianca REAL DEFAULT 1.0,
                num_amostras INTEGER DEFAULT 0,
                data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
                ultima_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela de amostras de treinamento
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS training_samples (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                layout_id INTEGER,
                arquivo_nome TEXT,
                arquivo_hash TEXT UNIQUE,
                texto_extraido TEXT,
                campos_extraidos TEXT,
                sucesso BOOLEAN DEFAULT 1,
                data_adicao DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (layout_id) REFERENCES document_layouts(id)
            )
        ''')
        
        # Índices
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_layouts_tipo ON document_layouts(tipo_doc)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_layouts_hash ON document_layouts(layout_hash)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_samples_layout ON training_samples(layout_id)')
        
        conn.commit()
        conn.close()
    
    def calcular_hash_layout(self, texto: str) -> str:
        """
        Calcula hash baseado em características estruturais do documento
        """
        # Extrair palavras-chave estruturais (ignorando dados variáveis)
        palavras_estruturais = []
        
        # Padrões que indicam estrutura do documento
        padroes_estrutura = [
            r'NOTA FISCAL',
            r'PREFEITURA',
            r'TOMADOR',
            r'PRESTADOR',
            r'DISCRIMINAÇÃO',
            r'VALOR',
            r'CNPJ',
            r'CÓDIGO DE VERIFICAÇÃO',
            r'BOLETO',
            r'BANCO',
            r'VENCIMENTO',
            r'CEDENTE',
            r'SACADO',
        ]
        
        for padrao in padroes_estrutura:
            if re.search(padrao, texto, re.IGNORECASE):
                palavras_estruturais.append(padrao)
        
        # Criar hash baseado na estrutura
        estrutura = '|'.join(sorted(palavras_estruturais))
        return hashlib.md5(estrutura.encode()).hexdigest()[:16]
    
    def identificar_tipo_documento(self, texto: str) -> str:
        """
        Identifica o tipo de documento baseado em palavras-chave
        """
        texto_upper = texto.upper()
        
        # Nota Fiscal de Serviço Eletrônica
        if any(k in texto_upper for k in ['NOTA FISCAL', 'NF-E', 'NFSE', 'RPS']):
            return 'nfse'
        
        # Boleto
        if any(k in texto_upper for k in ['BOLETO', 'BANCO', 'VENCIMENTO', 'NOSSO NÚMERO']):
            return 'boleto'
        
        return 'desconhecido'
    
    def detectar_emissor(self, texto: str) -> Optional[str]:
        """
        Tenta identificar o emissor do documento
        """
        # Padrões para detectar prefeituras
        prefeitura_match = re.search(r'PREFEITURA\s+(?:MUNICIPAL\s+)?DE\s+([A-ZÀ-Ú\s]+)', texto, re.IGNORECASE)
        if prefeitura_match:
            return f"Prefeitura {prefeitura_match.group(1).strip()}"
        
        # Padrões para detectar bancos
        banco_match = re.search(r'BANCO\s+([A-ZÀ-Ú\s]+)', texto, re.IGNORECASE)
        if banco_match:
            return f"Banco {banco_match.group(1).strip()}"
        
        # Procurar por CNPJ do prestador (pode indicar sistema emissor)
        cnpj_match = re.search(r'PRESTADOR.*?CNPJ[:\s]+([\d\.\-/]+)', texto, re.IGNORECASE | re.DOTALL)
        if cnpj_match:
            return f"CNPJ {cnpj_match.group(1)}"
        
        return None
    
    def extrair_caracteristicas(self, pdf_path: Path) -> Dict:
        """
        Extrai características estruturais do documento PDF
        """
        caracteristicas = {
            'arquivo': pdf_path.name,
            'tipo_doc': 'desconhecido',
            'emissor': None,
            'num_paginas': 0,
            'palavras_chave': [],
            'estrutura_texto': {},
            'posicoes_campos': {},
            'regex_sugeridos': {},
        }
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                caracteristicas['num_paginas'] = len(pdf.pages)
                
                # Analisar primeira página (onde geralmente estão os dados principais)
                primeira_pagina = pdf.pages[0]
                texto = primeira_pagina.extract_text() or ''
                
                # Identificar tipo
                caracteristicas['tipo_doc'] = self.identificar_tipo_documento(texto)
                
                # Identificar emissor
                caracteristicas['emissor'] = self.detectar_emissor(texto)
                
                # Palavras-chave estruturais
                palavras_importantes = [
                    'NOTA FISCAL', 'NÚMERO', 'DATA', 'VALOR', 'TOMADOR',
                    'PRESTADOR', 'CNPJ', 'DISCRIMINAÇÃO', 'BOLETO',
                    'VENCIMENTO', 'BANCO', 'CÓDIGO DE BARRAS'
                ]
                
                for palavra in palavras_importantes:
                    if palavra in texto.upper():
                        caracteristicas['palavras_chave'].append(palavra)
                
                # Tentar encontrar posições de campos importantes
                caracteristicas['posicoes_campos'] = self.encontrar_posicoes_campos(primeira_pagina)
                
                # Sugerir regex baseado no conteúdo
                caracteristicas['regex_sugeridos'] = self.sugerir_regex(texto)
                
                # Estrutura do texto (para fingerprinting)
                caracteristicas['estrutura_texto'] = {
                    'linhas_total': len(texto.split('\n')),
                    'tem_tabela': len(primeira_pagina.extract_tables()) > 0,
                    'densidade_texto': len(texto) / (primeira_pagina.width * primeira_pagina.height),
                }
                
        except Exception as e:
            print(f"Erro ao extrair características de {pdf_path}: {e}")
        
        return caracteristicas
    
    def encontrar_posicoes_campos(self, pagina) -> Dict:
        """
        Tenta encontrar posições aproximadas de campos importantes
        Identifica localização de valores, datas, impostos, CNPJs, etc.
        """
        posicoes = {}

        try:
            # Extrair texto com posições
            palavras = pagina.extract_words()

            # Campos de interesse expandidos
            campos_interesse = {
                # Identificação do documento
                'numero_nota': ['NÚMERO', 'Nº', 'NUM'],
                'numero_rps': ['RPS'],
                'codigo_verificacao': ['CÓDIGO', 'VERIFICAÇÃO', 'AUTENTICAÇÃO'],

                # Datas
                'data_emissao': ['DATA', 'EMISSÃO', 'EMITIDA'],
                'data_vencimento': ['VENCIMENTO'],
                'data_competencia': ['COMPETÊNCIA'],

                # Valores
                'valor_total': ['TOTAL', 'LÍQUIDO'],
                'valor_servicos': ['SERVIÇOS', 'BRUTO'],
                'base_calculo': ['BASE', 'CÁLCULO'],
                'desconto': ['DESCONTO'],

                # Impostos e tributos
                'iss': ['ISS', 'ISSQN'],
                'pis': ['PIS'],
                'cofins': ['COFINS'],
                'csll': ['CSLL'],
                'irrf': ['IRRF', 'IR'],
                'inss': ['INSS'],
                'retencoes': ['RETENÇÕES', 'DEDUÇÕES'],

                # Documentos
                'cnpj': ['CNPJ'],
                'cpf': ['CPF'],
                'inscricao_municipal': ['INSCRIÇÃO', 'MUNICIPAL', 'I.M.'],
                'inscricao_estadual': ['INSCRIÇÃO', 'ESTADUAL', 'I.E.'],

                # Partes envolvidas
                'tomador': ['TOMADOR', 'CLIENTE'],
                'prestador': ['PRESTADOR', 'FORNECEDOR'],

                # Dados bancários (boletos)
                'nosso_numero': ['NOSSO', 'NÚMERO'],
                'codigo_barras': ['CÓDIGO', 'BARRAS', 'LINHA'],
                'agencia': ['AGÊNCIA'],
                'conta': ['CONTA'],

                # Descrição
                'discriminacao': ['DISCRIMINAÇÃO', 'DESCRIÇÃO', 'SERVIÇOS'],
            }

            for campo, keywords in campos_interesse.items():
                for palavra in palavras:
                    texto_palavra = palavra['text'].upper()
                    # Verificar se a palavra contém alguma das keywords
                    if any(kw in texto_palavra for kw in keywords):
                        # Salvar a primeira ocorrência encontrada
                        if campo not in posicoes:
                            posicoes[campo] = {
                                'x': palavra['x0'],
                                'y': palavra['top'],
                                'palavra_chave': palavra['text']
                            }

        except Exception as e:
            print(f"Erro ao encontrar posições: {e}")

        return posicoes
    
    def sugerir_regex(self, texto: str) -> Dict:
        """
        Sugere padrões regex baseado no conteúdo do documento
        Reconhece: números, datas, valores, impostos, CNPJs, inscrições e mais
        """
        regex_sugeridos = {}

        # ==================== NÚMEROS DE DOCUMENTO ====================
        # Número de nota fiscal (várias variações)
        numero_nota_patterns = [
            r'(?:NÚMERO|NUM|N[ºÚ])\s*(?:DA\s+NOTA)?[:\s]*(\d{4,})',
            r'NOTA\s+FISCAL[:\s]+(?:N[ºÚ]|NÚMERO)?[:\s]*(\d{4,})',
            r'NF-?e?[:\s]+(\d{4,})',
        ]
        for pattern in numero_nota_patterns:
            if re.search(pattern, texto, re.IGNORECASE):
                regex_sugeridos['numero_nota'] = pattern
                break

        # RPS (Recibo Provisório de Serviços)
        if re.search(r'RPS[:\s]*N?[ºÚ]?[:\s]*(\d+)', texto, re.IGNORECASE):
            regex_sugeridos['numero_rps'] = r'RPS[:\s]*N?[ºÚ]?[:\s]*(\d+)'

        # Código de verificação (várias variações)
        codigo_verif_patterns = [
            r'(?:CÓDIGO|COD)[:\s]*(?:DE\s+)?(?:VERIFICAÇÃO|AUTENTICAÇÃO)[:\s]*([A-Z0-9-]+)',
            r'VERIFICA[ÇC][ÃA]O[:\s]*([A-Z0-9-]+)',
            r'C[ÓO]D(?:IGO)?\s+VERIF[:\s]*([A-Z0-9-]+)',
        ]
        for pattern in codigo_verif_patterns:
            if re.search(pattern, texto, re.IGNORECASE):
                regex_sugeridos['codigo_verificacao'] = pattern
                break

        # ==================== DATAS ====================
        # Data de emissão (formato DD/MM/YYYY)
        if re.search(r'(?:DATA|DT)[:\s]*(?:DE\s+)?(?:EMISSÃO|EMIS)[:\s]*(\d{2}/\d{2}/\d{4})', texto, re.IGNORECASE):
            regex_sugeridos['data_emissao'] = r'(?:DATA|DT)[:\s]*(?:DE\s+)?(?:EMISSÃO|EMIS)[:\s]*(\d{2}/\d{2}/\d{4})'
        elif re.search(r'EMISSÃO[:\s]*(\d{2}/\d{2}/\d{4})', texto, re.IGNORECASE):
            regex_sugeridos['data_emissao'] = r'EMISSÃO[:\s]*(\d{2}/\d{2}/\d{4})'

        # Data de vencimento
        if re.search(r'(?:DATA|DT)[:\s]*(?:DE\s+)?VENCIMENTO[:\s]*(\d{2}/\d{2}/\d{4})', texto, re.IGNORECASE):
            regex_sugeridos['data_vencimento'] = r'(?:DATA|DT)[:\s]*(?:DE\s+)?VENCIMENTO[:\s]*(\d{2}/\d{2}/\d{4})'
        elif re.search(r'VENCIMENTO[:\s]*(\d{2}/\d{2}/\d{4})', texto, re.IGNORECASE):
            regex_sugeridos['data_vencimento'] = r'VENCIMENTO[:\s]*(\d{2}/\d{2}/\d{4})'

        # Data de competência
        if re.search(r'COMPET[ÊE]NCIA[:\s]*(\d{2}/\d{2}/\d{4}|\d{2}/\d{4})', texto, re.IGNORECASE):
            regex_sugeridos['data_competencia'] = r'COMPET[ÊE]NCIA[:\s]*(\d{2}/\d{2}/\d{4}|\d{2}/\d{4})'

        # ==================== VALORES MONETÁRIOS ====================
        # Valor total (várias variações)
        valor_patterns = [
            r'(?:VALOR\s+)?TOTAL(?:\s+DA\s+NOTA)?[:\s]*R?\$?\s*([\d.,]+)',
            r'TOTAL\s+(?:A\s+)?(?:PAGAR|COBRAR)[:\s]*R?\$?\s*([\d.,]+)',
            r'VALOR\s+L[ÍI]QUIDO[:\s]*R?\$?\s*([\d.,]+)',
        ]
        for pattern in valor_patterns:
            if re.search(pattern, texto, re.IGNORECASE):
                regex_sugeridos['valor_total'] = pattern
                break

        # Valor bruto/serviços
        if re.search(r'(?:VALOR|VL)[:\s]*(?:DOS?\s+)?(?:SERVIÇOS|SERV|BRUTO)[:\s]*R?\$?\s*([\d.,]+)', texto, re.IGNORECASE):
            regex_sugeridos['valor_servicos'] = r'(?:VALOR|VL)[:\s]*(?:DOS?\s+)?(?:SERVIÇOS|SERV|BRUTO)[:\s]*R?\$?\s*([\d.,]+)'

        # Base de cálculo
        if re.search(r'BASE\s+(?:DE\s+)?C[ÁA]LCULO[:\s]*R?\$?\s*([\d.,]+)', texto, re.IGNORECASE):
            regex_sugeridos['base_calculo'] = r'BASE\s+(?:DE\s+)?C[ÁA]LCULO[:\s]*R?\$?\s*([\d.,]+)'

        # Descontos
        if re.search(r'(?:VALOR\s+)?DESCONTO[S]?[:\s]*R?\$?\s*([\d.,]+)', texto, re.IGNORECASE):
            regex_sugeridos['valor_desconto'] = r'(?:VALOR\s+)?DESCONTO[S]?[:\s]*R?\$?\s*([\d.,]+)'

        # ==================== IMPOSTOS E TRIBUTOS ====================
        # ISS (Imposto Sobre Serviços)
        iss_patterns = [
            r'ISS(?:\s+RETIDO)?[:\s]*R?\$?\s*([\d.,]+)',
            r'(?:VALOR|VL)[:\s]*ISS[:\s]*R?\$?\s*([\d.,]+)',
            r'IMPOSTO\s+SOBRE\s+SERVIÇO[S]?[:\s]*R?\$?\s*([\d.,]+)',
        ]
        for pattern in iss_patterns:
            if re.search(pattern, texto, re.IGNORECASE):
                regex_sugeridos['iss_valor'] = pattern
                break

        # Alíquota ISS
        if re.search(r'(?:AL[ÍI]QUOTA|ALIQ)[:\s]*ISS[:\s]*([\d.,]+)\s*%', texto, re.IGNORECASE):
            regex_sugeridos['iss_aliquota'] = r'(?:AL[ÍI]QUOTA|ALIQ)[:\s]*ISS[:\s]*([\d.,]+)\s*%'
        elif re.search(r'ISS[:\s]*([\d.,]+)\s*%', texto, re.IGNORECASE):
            regex_sugeridos['iss_aliquota'] = r'ISS[:\s]*([\d.,]+)\s*%'

        # PIS
        if re.search(r'PIS[:\s]*R?\$?\s*([\d.,]+)', texto, re.IGNORECASE):
            regex_sugeridos['pis_valor'] = r'PIS[:\s]*R?\$?\s*([\d.,]+)'

        # COFINS
        if re.search(r'COFINS[:\s]*R?\$?\s*([\d.,]+)', texto, re.IGNORECASE):
            regex_sugeridos['cofins_valor'] = r'COFINS[:\s]*R?\$?\s*([\d.,]+)'

        # CSLL
        if re.search(r'CSLL[:\s]*R?\$?\s*([\d.,]+)', texto, re.IGNORECASE):
            regex_sugeridos['csll_valor'] = r'CSLL[:\s]*R?\$?\s*([\d.,]+)'

        # IRRF (Imposto de Renda Retido na Fonte)
        if re.search(r'(?:IRRF|IR|IMPOSTO\s+DE\s+RENDA)[:\s]*R?\$?\s*([\d.,]+)', texto, re.IGNORECASE):
            regex_sugeridos['irrf_valor'] = r'(?:IRRF|IR|IMPOSTO\s+DE\s+RENDA)[:\s]*R?\$?\s*([\d.,]+)'

        # INSS
        if re.search(r'INSS[:\s]*R?\$?\s*([\d.,]+)', texto, re.IGNORECASE):
            regex_sugeridos['inss_valor'] = r'INSS[:\s]*R?\$?\s*([\d.,]+)'

        # Total de retenções/deduções
        if re.search(r'(?:TOTAL\s+)?(?:RETEN[ÇC][ÕO]ES|DEDU[ÇC][ÕO]ES)[:\s]*R?\$?\s*([\d.,]+)', texto, re.IGNORECASE):
            regex_sugeridos['total_retencoes'] = r'(?:TOTAL\s+)?(?:RETEN[ÇC][ÕO]ES|DEDU[ÇC][ÕO]ES)[:\s]*R?\$?\s*([\d.,]+)'

        # ==================== DOCUMENTOS (CNPJ, CPF, INSCRIÇÕES) ====================
        # CNPJ (formato completo)
        if re.search(r'\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}', texto):
            regex_sugeridos['cnpj'] = r'(\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2})'
        # CNPJ (apenas números)
        elif re.search(r'CNPJ[:\s]*(\d{14})', texto, re.IGNORECASE):
            regex_sugeridos['cnpj'] = r'CNPJ[:\s]*(\d{14})'

        # CPF
        if re.search(r'\d{3}\.\d{3}\.\d{3}-\d{2}', texto):
            regex_sugeridos['cpf'] = r'(\d{3}\.\d{3}\.\d{3}-\d{2})'
        elif re.search(r'CPF[:\s]*(\d{11})', texto, re.IGNORECASE):
            regex_sugeridos['cpf'] = r'CPF[:\s]*(\d{11})'

        # Inscrição Municipal
        if re.search(r'INSCRI[ÇC][ÃA]O\s+MUNICIPAL[:\s]*([A-Z0-9.-]+)', texto, re.IGNORECASE):
            regex_sugeridos['inscricao_municipal'] = r'INSCRI[ÇC][ÃA]O\s+MUNICIPAL[:\s]*([A-Z0-9.-]+)'
        elif re.search(r'(?:I\.?M\.?|IM)[:\s]*([A-Z0-9.-]+)', texto, re.IGNORECASE):
            regex_sugeridos['inscricao_municipal'] = r'(?:I\.?M\.?|IM)[:\s]*([A-Z0-9.-]+)'

        # Inscrição Estadual
        if re.search(r'INSCRI[ÇC][ÃA]O\s+ESTADUAL[:\s]*([A-Z0-9.-]+)', texto, re.IGNORECASE):
            regex_sugeridos['inscricao_estadual'] = r'INSCRI[ÇC][ÃA]O\s+ESTADUAL[:\s]*([A-Z0-9.-]+)'
        elif re.search(r'(?:I\.?E\.?|IE)[:\s]*([A-Z0-9.-]+)', texto, re.IGNORECASE):
            regex_sugeridos['inscricao_estadual'] = r'(?:I\.?E\.?|IE)[:\s]*([A-Z0-9.-]+)'

        # ==================== IDENTIFICAÇÃO DE PESSOAS ====================
        # Nome do tomador/cliente
        if re.search(r'TOMADOR(?:\s+DE\s+SERVI[ÇC]O)?[:\s]*([A-ZÀ-Ú][A-ZÀ-Ú\s]+?)(?:\n|CNPJ|CPF)', texto, re.IGNORECASE):
            regex_sugeridos['tomador_nome'] = r'TOMADOR(?:\s+DE\s+SERVI[ÇC]O)?[:\s]*([A-ZÀ-Ú][A-ZÀ-Ú\s]+?)(?:\n|CNPJ|CPF)'

        # Nome do prestador
        if re.search(r'PRESTADOR(?:\s+DE\s+SERVI[ÇC]O)?[:\s]*([A-ZÀ-Ú][A-ZÀ-Ú\s]+?)(?:\n|CNPJ|CPF)', texto, re.IGNORECASE):
            regex_sugeridos['prestador_nome'] = r'PRESTADOR(?:\s+DE\s+SERVI[ÇC]O)?[:\s]*([A-ZÀ-Ú][A-ZÀ-Ú\s]+?)(?:\n|CNPJ|CPF)'

        # ==================== DADOS BANCÁRIOS (BOLETOS) ====================
        # Nosso número
        if re.search(r'NOSSO\s+N[ÚU]MERO[:\s]*([0-9-/]+)', texto, re.IGNORECASE):
            regex_sugeridos['nosso_numero'] = r'NOSSO\s+N[ÚU]MERO[:\s]*([0-9-/]+)'

        # Código de barras
        if re.search(r'(?:C[ÓO]DIGO\s+DE\s+BARRAS|LINHA\s+DIGIT[ÁA]VEL)[:\s]*(\d{47,})', texto, re.IGNORECASE):
            regex_sugeridos['codigo_barras'] = r'(?:C[ÓO]DIGO\s+DE\s+BARRAS|LINHA\s+DIGIT[ÁA]VEL)[:\s]*(\d{47,})'

        # Agência e conta
        if re.search(r'AG[ÊE]NCIA[:\s]*(\d{4,})', texto, re.IGNORECASE):
            regex_sugeridos['agencia'] = r'AG[ÊE]NCIA[:\s]*(\d{4,})'

        if re.search(r'CONTA[:\s]*(\d+[-/]?\d*)', texto, re.IGNORECASE):
            regex_sugeridos['conta'] = r'CONTA[:\s]*(\d+[-/]?\d*)'

        # ==================== DISCRIMINAÇÃO/DESCRIÇÃO ====================
        # Discriminação dos serviços
        if re.search(r'DISCRIMINA[ÇC][ÃA]O(?:\s+DOS?\s+SERVI[ÇC]OS?)?[:\s]*(.+?)(?:VALOR|TOTAL|BASE)', texto, re.IGNORECASE | re.DOTALL):
            regex_sugeridos['discriminacao'] = r'DISCRIMINA[ÇC][ÃA]O(?:\s+DOS?\s+SERVI[ÇC]OS?)?[:\s]*(.+?)(?:VALOR|TOTAL|BASE)'

        return regex_sugeridos
    
    def adicionar_amostra_treinamento(self, pdf_path: Path) -> Dict:
        """
        Adiciona um PDF como amostra de treinamento
        """
        print(f"\n📚 Analisando: {pdf_path.name}")
        
        # Extrair características
        caracteristicas = self.extrair_caracteristicas(pdf_path)
        
        # Calcular hash do arquivo
        with open(pdf_path, 'rb') as f:
            arquivo_hash = hashlib.md5(f.read()).hexdigest()
        
        # Calcular hash do layout
        with pdfplumber.open(pdf_path) as pdf:
            texto = pdf.pages[0].extract_text() or ''
        
        layout_hash = self.calcular_hash_layout(texto)
        
        # Salvar no banco
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        # Verificar se layout já existe
        cursor.execute('SELECT id, nome_layout, num_amostras FROM document_layouts WHERE layout_hash = ?', 
                      (layout_hash,))
        layout_existente = cursor.fetchone()
        
        if layout_existente:
            layout_id, nome_layout, num_amostras = layout_existente
            print(f"✓ Layout já conhecido: {nome_layout} ({num_amostras} amostras)")
            
            # Atualizar contagem
            cursor.execute('''
                UPDATE document_layouts 
                SET num_amostras = num_amostras + 1,
                    ultima_atualizacao = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (layout_id,))
        else:
            # Criar novo layout
            nome_layout = f"{caracteristicas['tipo_doc']}_{layout_hash[:8]}"
            if caracteristicas['emissor']:
                nome_layout = f"{caracteristicas['emissor'][:20]}_{layout_hash[:8]}"
            
            print(f"🆕 Novo layout detectado: {nome_layout}")
            
            cursor.execute('''
                INSERT INTO document_layouts 
                (tipo_doc, layout_hash, nome_layout, emissor, palavras_chave, 
                 regex_patterns, posicoes_campos, estrategia_extracao, num_amostras)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            ''', (
                caracteristicas['tipo_doc'],
                layout_hash,
                nome_layout,
                caracteristicas['emissor'],
                json.dumps(caracteristicas['palavras_chave']),
                json.dumps(caracteristicas['regex_sugeridos']),
                json.dumps(caracteristicas['posicoes_campos']),
                'gemini'  # estratégia padrão
            ))
            
            layout_id = cursor.lastrowid
        
        # Adicionar amostra
        try:
            cursor.execute('''
                INSERT INTO training_samples 
                (layout_id, arquivo_nome, arquivo_hash, texto_extraido, campos_extraidos)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                layout_id,
                pdf_path.name,
                arquivo_hash,
                texto[:5000],  # Primeiros 5000 caracteres
                json.dumps(caracteristicas)
            ))
        except sqlite3.IntegrityError:
            print(f"⚠ Arquivo já foi adicionado anteriormente")
        
        conn.commit()
        conn.close()
        
        caracteristicas['layout_id'] = layout_id
        caracteristicas['layout_hash'] = layout_hash
        caracteristicas['nome_layout'] = nome_layout
        
        return caracteristicas
    
    def treinar_com_diretorio(self, diretorio: Path = None) -> Dict:
        """
        Treina o sistema com todos os PDFs em um diretório
        """
        if diretorio is None:
            diretorio = self.training_dir
        
        resultados = {
            'total_arquivos': 0,
            'processados': 0,
            'erros': 0,
            'layouts_novos': 0,
            'layouts_existentes': 0,
        }
        
        print(f"\n{'='*60}")
        print(f"🎓 INICIANDO TREINAMENTO")
        print(f"📁 Diretório: {diretorio}")
        print(f"{'='*60}")
        
        # Buscar todos os PDFs
        arquivos_pdf = list(diretorio.glob('**/*.pdf'))
        resultados['total_arquivos'] = len(arquivos_pdf)
        
        if not arquivos_pdf:
            print(f"\n⚠ Nenhum arquivo PDF encontrado em {diretorio}")
            return resultados
        
        print(f"\n📋 Encontrados {len(arquivos_pdf)} arquivos PDF")
        
        layouts_antes = self.contar_layouts()
        
        for pdf_path in arquivos_pdf:
            try:
                caract = self.adicionar_amostra_treinamento(pdf_path)
                resultados['processados'] += 1
            except Exception as e:
                print(f"❌ Erro ao processar {pdf_path.name}: {e}")
                resultados['erros'] += 1
        
        layouts_depois = self.contar_layouts()
        resultados['layouts_novos'] = layouts_depois - layouts_antes
        resultados['layouts_existentes'] = layouts_antes
        
        print(f"\n{'='*60}")
        print(f"✅ TREINAMENTO CONCLUÍDO")
        print(f"{'='*60}")
        print(f"📊 Estatísticas:")
        print(f"   • Arquivos processados: {resultados['processados']}/{resultados['total_arquivos']}")
        print(f"   • Layouts novos: {resultados['layouts_novos']}")
        print(f"   • Layouts já conhecidos: {resultados['layouts_existentes']}")
        print(f"   • Erros: {resultados['erros']}")
        print(f"{'='*60}\n")
        
        # Recarregar layouts
        self.carregar_layouts()
        
        return resultados
    
    def contar_layouts(self) -> int:
        """Conta quantos layouts estão cadastrados"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM document_layouts')
        count = cursor.fetchone()[0]
        conn.close()
        return count
    
    def carregar_layouts(self):
        """Carrega layouts conhecidos do banco para memória"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT layout_hash, nome_layout, tipo_doc, emissor, 
                       regex_patterns, posicoes_campos, estrategia_extracao
                FROM document_layouts
            ''')
            
            self.layouts_conhecidos = {}
            for row in cursor.fetchall():
                hash_layout = row[0]
                self.layouts_conhecidos[hash_layout] = {
                    'nome': row[1],
                    'tipo': row[2],
                    'emissor': row[3],
                    'regex': json.loads(row[4]) if row[4] else {},
                    'posicoes': json.loads(row[5]) if row[5] else {},
                    'estrategia': row[6],
                }
            
            conn.close()
            print(f"✓ Carregados {len(self.layouts_conhecidos)} layouts conhecidos")
        
        except Exception as e:
            print(f"Aviso: Erro ao carregar layouts: {e}")
    
    def identificar_layout(self, pdf_path: Path) -> Optional[Dict]:
        """
        Identifica o layout de um PDF não visto anteriormente
        """
        try:
            with pdfplumber.open(pdf_path) as pdf:
                texto = pdf.pages[0].extract_text() or ''
            
            layout_hash = self.calcular_hash_layout(texto)
            
            if layout_hash in self.layouts_conhecidos:
                layout_info = self.layouts_conhecidos[layout_hash]
                print(f"✓ Layout reconhecido: {layout_info['nome']}")
                return layout_info
            else:
                print(f"⚠ Layout desconhecido - considere adicionar ao treinamento")
                return None
        
        except Exception as e:
            print(f"Erro ao identificar layout: {e}")
            return None
    
    def listar_layouts(self) -> List[Dict]:
        """
        Lista todos os layouts aprendidos
        """
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, tipo_doc, nome_layout, emissor, num_amostras, 
                   data_criacao, ultima_atualizacao
            FROM document_layouts
            ORDER BY num_amostras DESC
        ''')
        
        layouts = []
        for row in cursor.fetchall():
            layouts.append({
                'id': row[0],
                'tipo': row[1],
                'nome': row[2],
                'emissor': row[3],
                'num_amostras': row[4],
                'data_criacao': row[5],
                'ultima_atualizacao': row[6],
            })
        
        conn.close()
        return layouts
    
    def exportar_relatorio(self, output_path: Path = None):
        """
        Gera relatório HTML com os layouts aprendidos
        """
        if output_path is None:
            output_path = self.training_dir / f"relatorio_layouts_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        
        layouts = self.listar_layouts()
        
        html = f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Layouts Aprendidos</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        h1 {{ color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }}
        .stats {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }}
        .stat-card {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; }}
        .stat-card h3 {{ margin: 0; font-size: 2em; }}
        .stat-card p {{ margin: 5px 0 0 0; opacity: 0.9; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
        th {{ background: #2563eb; color: white; padding: 12px; text-align: left; }}
        td {{ padding: 12px; border-bottom: 1px solid #ddd; }}
        tr:hover {{ background: #f8fafc; }}
        .badge {{ display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.85em; font-weight: bold; }}
        .badge-nfse {{ background: #10b981; color: white; }}
        .badge-boleto {{ background: #f59e0b; color: white; }}
        .badge-desconhecido {{ background: #6b7280; color: white; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Relatório de Layouts Aprendidos</h1>
        <p><strong>Gerado em:</strong> {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}</p>
        
        <div class="stats">
            <div class="stat-card">
                <h3>{len(layouts)}</h3>
                <p>Layouts Únicos</p>
            </div>
            <div class="stat-card">
                <h3>{sum(l['num_amostras'] for l in layouts)}</h3>
                <p>Amostras de Treinamento</p>
            </div>
            <div class="stat-card">
                <h3>{len([l for l in layouts if l['tipo'] == 'nfse'])}</h3>
                <p>Layouts NFS-e</p>
            </div>
            <div class="stat-card">
                <h3>{len([l for l in layouts if l['tipo'] == 'boleto'])}</h3>
                <p>Layouts Boletos</p>
            </div>
        </div>
        
        <h2>📋 Detalhamento dos Layouts</h2>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nome do Layout</th>
                    <th>Tipo</th>
                    <th>Emissor</th>
                    <th>Amostras</th>
                    <th>Criado em</th>
                </tr>
            </thead>
            <tbody>
"""
        
        for layout in layouts:
            badge_class = f"badge-{layout['tipo']}"
            html += f"""
                <tr>
                    <td>#{layout['id']}</td>
                    <td><strong>{layout['nome']}</strong></td>
                    <td><span class="badge {badge_class}">{layout['tipo'].upper()}</span></td>
                    <td>{layout['emissor'] or 'N/A'}</td>
                    <td>{layout['num_amostras']}</td>
                    <td>{layout['data_criacao'][:10]}</td>
                </tr>
"""
        
        html += """
            </tbody>
        </table>
    </div>
</body>
</html>
"""
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html)
        
        print(f"\n✅ Relatório gerado: {output_path}")
        return output_path
