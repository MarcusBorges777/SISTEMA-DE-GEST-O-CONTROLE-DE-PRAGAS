#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sistema de Extração Automática de Dados de PDFs
Integra com o sistema de aprendizagem para extrair e salvar dados no banco
"""

import re
import sqlite3
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import pdfplumber
import json


class DocumentDataExtractor:
    """
    Extrai dados de PDFs usando layouts aprendidos e salva no banco de dados
    """

    def __init__(self, db_path: Path, layout_learner):
        self.db_path = db_path
        self.layout_learner = layout_learner

        # Estatísticas de extração
        self.stats = {
            'total_extraidos': 0,
            'sucesso': 0,
            'falhas': 0,
            'validacoes_ok': 0,
            'validacoes_falhas': 0,
            'clientes_novos': 0,
            'clientes_existentes': 0,
        }

    def validar_cnpj(self, cnpj: str) -> bool:
        """
        Valida CNPJ usando algoritmo oficial
        """
        # Remover pontuação
        cnpj = re.sub(r'[^\d]', '', cnpj)

        # Validar tamanho
        if len(cnpj) != 14:
            return False

        # Verificar se todos os dígitos são iguais
        if cnpj == cnpj[0] * 14:
            return False

        # Validar primeiro dígito verificador
        soma = 0
        peso = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        for i in range(12):
            soma += int(cnpj[i]) * peso[i]

        resto = soma % 11
        digito1 = 0 if resto < 2 else 11 - resto

        if int(cnpj[12]) != digito1:
            return False

        # Validar segundo dígito verificador
        soma = 0
        peso = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        for i in range(13):
            soma += int(cnpj[i]) * peso[i]

        resto = soma % 11
        digito2 = 0 if resto < 2 else 11 - resto

        if int(cnpj[13]) != digito2:
            return False

        return True

    def validar_cpf(self, cpf: str) -> bool:
        """
        Valida CPF usando algoritmo oficial
        """
        # Remover pontuação
        cpf = re.sub(r'[^\d]', '', cpf)

        # Validar tamanho
        if len(cpf) != 11:
            return False

        # Verificar se todos os dígitos são iguais
        if cpf == cpf[0] * 11:
            return False

        # Validar primeiro dígito verificador
        soma = sum(int(cpf[i]) * (10 - i) for i in range(9))
        resto = soma % 11
        digito1 = 0 if resto < 2 else 11 - resto

        if int(cpf[9]) != digito1:
            return False

        # Validar segundo dígito verificador
        soma = sum(int(cpf[i]) * (11 - i) for i in range(10))
        resto = soma % 11
        digito2 = 0 if resto < 2 else 11 - resto

        if int(cpf[10]) != digito2:
            return False

        return True

    def normalizar_cnpj(self, cnpj: str) -> str:
        """
        Normaliza CNPJ para formato XX.XXX.XXX/XXXX-XX
        """
        cnpj_limpo = re.sub(r'[^\d]', '', cnpj)
        if len(cnpj_limpo) == 14:
            return f"{cnpj_limpo[:2]}.{cnpj_limpo[2:5]}.{cnpj_limpo[5:8]}/{cnpj_limpo[8:12]}-{cnpj_limpo[12:]}"
        return cnpj

    def normalizar_cpf(self, cpf: str) -> str:
        """
        Normaliza CPF para formato XXX.XXX.XXX-XX
        """
        cpf_limpo = re.sub(r'[^\d]', '', cpf)
        if len(cpf_limpo) == 11:
            return f"{cpf_limpo[:3]}.{cpf_limpo[3:6]}.{cpf_limpo[6:9]}-{cpf_limpo[9:]}"
        return cpf

    def normalizar_valor(self, valor_str: str) -> float:
        """
        Normaliza valores monetários para float
        Suporta: 1.234,56 / 1234,56 / 1234.56 / R$ 1.234,56
        """
        if not valor_str:
            return 0.0

        # Remover símbolos e espaços
        valor_limpo = re.sub(r'[R$\s]', '', valor_str)

        # Identificar se usa vírgula ou ponto como separador decimal
        # Se tem ponto antes de vírgula, é formato BR (1.234,56)
        if '.' in valor_limpo and ',' in valor_limpo:
            if valor_limpo.rindex('.') < valor_limpo.rindex(','):
                # Formato BR: remover pontos e trocar vírgula por ponto
                valor_limpo = valor_limpo.replace('.', '').replace(',', '.')
            else:
                # Formato US: remover vírgulas
                valor_limpo = valor_limpo.replace(',', '')
        elif ',' in valor_limpo:
            # Apenas vírgula, assumir formato BR
            valor_limpo = valor_limpo.replace(',', '.')

        try:
            return float(valor_limpo)
        except ValueError:
            return 0.0

    def normalizar_data(self, data_str: str) -> Optional[str]:
        """
        Normaliza datas para formato YYYY-MM-DD
        Aceita: DD/MM/YYYY, DD-MM-YYYY, etc.
        """
        if not data_str:
            return None

        # Tentar diversos formatos
        formatos = [
            r'(\d{2})[/-](\d{2})[/-](\d{4})',  # DD/MM/YYYY
            r'(\d{4})[/-](\d{2})[/-](\d{2})',  # YYYY-MM-DD
        ]

        for formato in formatos:
            match = re.search(formato, data_str)
            if match:
                if len(match.group(1)) == 4:  # YYYY-MM-DD
                    return f"{match.group(1)}-{match.group(2)}-{match.group(3)}"
                else:  # DD/MM/YYYY
                    dia, mes, ano = match.groups()
                    return f"{ano}-{mes}-{dia}"

        return None

    def extrair_com_regex(self, texto: str, regex_patterns: Dict) -> Dict:
        """
        Extrai dados usando padrões regex do layout aprendido
        """
        dados_extraidos = {}

        for campo, pattern in regex_patterns.items():
            try:
                match = re.search(pattern, texto, re.IGNORECASE | re.DOTALL)
                if match:
                    valor = match.group(1).strip() if match.lastindex >= 1 else match.group(0).strip()
                    dados_extraidos[campo] = valor
            except Exception as e:
                print(f"Erro ao aplicar regex '{campo}': {e}")

        return dados_extraidos

    def validar_dados_extraidos(self, dados: Dict, tipo_doc: str) -> Tuple[bool, List[str]]:
        """
        Valida dados extraídos e retorna (valido, lista_de_erros)
        """
        erros = []

        # Validar CNPJ/CPF se presente
        if 'cnpj' in dados and dados['cnpj']:
            if not self.validar_cnpj(dados['cnpj']):
                erros.append(f"CNPJ inválido: {dados['cnpj']}")

        if 'cpf' in dados and dados['cpf']:
            if not self.validar_cpf(dados['cpf']):
                erros.append(f"CPF inválido: {dados['cpf']}")

        # Validar valores monetários
        campos_monetarios = ['valor_total', 'valor_servicos', 'iss_valor', 'pis_valor',
                            'cofins_valor', 'irrf_valor', 'inss_valor', 'csll_valor']

        for campo in campos_monetarios:
            if campo in dados and dados[campo]:
                try:
                    valor = self.normalizar_valor(dados[campo])
                    if valor < 0:
                        erros.append(f"{campo} não pode ser negativo")
                except:
                    erros.append(f"{campo} com formato inválido: {dados[campo]}")

        # Validar datas
        campos_data = ['data_emissao', 'data_vencimento', 'data_competencia']
        for campo in campos_data:
            if campo in dados and dados[campo]:
                if not self.normalizar_data(dados[campo]):
                    erros.append(f"{campo} com formato inválido: {dados[campo]}")

        # Validações específicas por tipo
        if tipo_doc == 'nfse':
            # Nota fiscal deve ter pelo menos: número, data, valor, tomador
            campos_obrigatorios = ['numero_nota', 'data_emissao', 'valor_total']
            for campo in campos_obrigatorios:
                if campo not in dados or not dados[campo]:
                    erros.append(f"Campo obrigatório ausente: {campo}")

        elif tipo_doc == 'boleto':
            # Boleto deve ter: vencimento, valor
            campos_obrigatorios = ['data_vencimento', 'valor_total']
            for campo in campos_obrigatorios:
                if campo not in dados or not dados[campo]:
                    erros.append(f"Campo obrigatório ausente: {campo}")

        return (len(erros) == 0, erros)

    def buscar_ou_criar_cliente(self, cnpj: str, nome: str = None) -> Optional[int]:
        """
        Busca cliente por CNPJ ou cria novo se não existir
        Retorna o ID do cliente
        """
        if not cnpj:
            return None

        cnpj_normalizado = self.normalizar_cnpj(cnpj)

        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        # Buscar cliente existente
        cursor.execute('SELECT id FROM clientes_web WHERE cnpj = ?', (cnpj_normalizado,))
        cliente = cursor.fetchone()

        if cliente:
            self.stats['clientes_existentes'] += 1
            conn.close()
            return cliente[0]

        # Criar novo cliente se não existir
        if nome:
            cursor.execute('''
                INSERT INTO clientes_web (cnpj, nome_fantasia, razao_social)
                VALUES (?, ?, ?)
            ''', (cnpj_normalizado, nome, nome))

            cliente_id = cursor.lastrowid
            conn.commit()
            conn.close()

            self.stats['clientes_novos'] += 1
            print(f"✓ Novo cliente cadastrado: {nome} ({cnpj_normalizado})")
            return cliente_id

        conn.close()
        return None

    def salvar_nota_fiscal(self, dados: Dict, arquivo_info: Dict) -> Optional[int]:
        """
        Salva nota fiscal no banco de dados com transação ACID
        """
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        try:
            # Iniciar transação
            conn.execute('BEGIN TRANSACTION')

            # Normalizar dados
            numero_nota = dados.get('numero_nota', dados.get('numero_rps', ''))
            data_emissao = self.normalizar_data(dados.get('data_emissao', ''))
            valor_total = self.normalizar_valor(dados.get('valor_total', '0'))
            valor_servicos = self.normalizar_valor(dados.get('valor_servicos', '0'))

            # Tributos
            iss = self.normalizar_valor(dados.get('iss_valor', '0'))
            pis = self.normalizar_valor(dados.get('pis_valor', '0'))
            cofins = self.normalizar_valor(dados.get('cofins_valor', '0'))
            inss = self.normalizar_valor(dados.get('inss_valor', '0'))
            ir = self.normalizar_valor(dados.get('irrf_valor', '0'))
            csll = self.normalizar_valor(dados.get('csll_valor', '0'))

            # Calcular valor líquido
            valor_liquido = valor_total - (iss + pis + cofins + inss + ir + csll)

            # Cliente
            cnpj_tomador = dados.get('cnpj', '')
            nome_tomador = dados.get('tomador_nome', dados.get('cliente_nome', ''))

            cliente_id = None
            if cnpj_tomador:
                if self.validar_cnpj(cnpj_tomador):
                    cliente_id = self.buscar_ou_criar_cliente(cnpj_tomador, nome_tomador)
                    cnpj_tomador = self.normalizar_cnpj(cnpj_tomador)

            # Inserir nota fiscal
            cursor.execute('''
                INSERT INTO notas_fiscais (
                    numero_nota, nome_arquivo, caminho_arquivo, valor_total,
                    data_emissao, cliente_cnpj, cliente_nome,
                    iss, pis, cofins, inss, ir, csll, valor_liquido,
                    tipo_arquivo
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                numero_nota,
                arquivo_info.get('nome', ''),
                arquivo_info.get('caminho', ''),
                valor_total,
                data_emissao,
                cnpj_tomador,
                nome_tomador,
                iss, pis, cofins, inss, ir, csll, valor_liquido,
                'nfse'
            ))

            nota_id = cursor.lastrowid

            # Commit da transação
            conn.commit()
            print(f"✓ Nota fiscal salva: #{numero_nota} - R$ {valor_total:.2f}")
            return nota_id

        except sqlite3.IntegrityError as e:
            conn.rollback()
            print(f"⚠️ Nota fiscal já existe ou violação de integridade: {e}")
            return None
        except Exception as e:
            conn.rollback()
            print(f"❌ Erro ao salvar nota fiscal: {e}")
            import traceback
            traceback.print_exc()
            return None
        finally:
            conn.close()

    def salvar_boleto(self, dados: Dict, arquivo_info: Dict) -> Optional[int]:
        """
        Salva boleto no banco de dados com transação ACID
        """
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        try:
            # Iniciar transação
            conn.execute('BEGIN TRANSACTION')

            # Normalizar dados
            data_vencimento = self.normalizar_data(dados.get('data_vencimento', ''))
            data_emissao = self.normalizar_data(dados.get('data_emissao', datetime.now().strftime('%d/%m/%Y')))
            valor = self.normalizar_valor(dados.get('valor_total', '0'))

            # Cliente
            nome_cliente = dados.get('cliente_nome', dados.get('sacado', 'Cliente não identificado'))
            descricao = dados.get('discriminacao', 'Boleto importado')

            # Dados bancários
            nosso_numero = dados.get('nosso_numero', '')
            codigo_barras = dados.get('codigo_barras', '')

            # Inserir boleto
            cursor.execute('''
                INSERT INTO boletos (
                    cliente_nome, descricao, valor, data_emissao, data_vencimento,
                    numero_documento, codigo_barras, status, arquivo_caminho
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                nome_cliente,
                descricao,
                valor,
                data_emissao,
                data_vencimento,
                nosso_numero,
                codigo_barras,
                'pendente',
                arquivo_info.get('caminho', '')
            ))

            boleto_id = cursor.lastrowid

            # Commit da transação
            conn.commit()
            print(f"✓ Boleto salvo: {nome_cliente} - Venc: {data_vencimento} - R$ {valor:.2f}")
            return boleto_id

        except sqlite3.IntegrityError as e:
            conn.rollback()
            print(f"⚠️ Boleto já existe ou violação de integridade: {e}")
            return None
        except Exception as e:
            conn.rollback()
            print(f"❌ Erro ao salvar boleto: {e}")
            import traceback
            traceback.print_exc()
            return None
        finally:
            conn.close()

    def registrar_extracao(self, pdf_path: Path, layout_info: Dict,
                          dados_extraidos: Dict, sucesso: bool,
                          erros: List[str] = None) -> int:
        """
        Registra resultado da extração no banco para histórico e aprendizado
        """
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        # Criar tabela de histórico se não existir
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS extraction_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                arquivo_nome TEXT NOT NULL,
                layout_id INTEGER,
                layout_nome TEXT,
                dados_extraidos TEXT,
                sucesso BOOLEAN,
                erros TEXT,
                tempo_extracao REAL,
                data_extracao DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (layout_id) REFERENCES document_layouts(id)
            )
        ''')

        cursor.execute('''
            INSERT INTO extraction_history
            (arquivo_nome, layout_id, layout_nome, dados_extraidos, sucesso, erros)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            pdf_path.name,
            layout_info.get('id'),
            layout_info.get('nome'),
            json.dumps(dados_extraidos, ensure_ascii=False),
            sucesso,
            json.dumps(erros, ensure_ascii=False) if erros else None
        ))

        history_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return history_id

    def extrair_e_salvar(self, pdf_path: Path, salvar_banco: bool = True) -> Dict:
        """
        Método principal: extrai dados do PDF e salva no banco
        """
        resultado = {
            'sucesso': False,
            'layout_identificado': False,
            'dados_extraidos': {},
            'validacao_ok': False,
            'erros': [],
            'salvo_banco': False,
            'registro_id': None,
        }

        self.stats['total_extraidos'] += 1

        print(f"\n{'='*60}")
        print(f"🔍 Processando: {pdf_path.name}")
        print(f"{'='*60}")

        # 1. Identificar layout
        layout_info = self.layout_learner.identificar_layout(pdf_path)

        if not layout_info:
            resultado['erros'].append("Layout não reconhecido")
            print("⚠ Layout não reconhecido - considere adicionar ao treinamento")
            self.stats['falhas'] += 1
            return resultado

        resultado['layout_identificado'] = True
        print(f"✓ Layout: {layout_info['nome']} ({layout_info['tipo']})")

        # 2. Extrair texto do PDF
        try:
            with pdfplumber.open(pdf_path) as pdf:
                texto = '\n'.join(page.extract_text() or '' for page in pdf.pages)
        except Exception as e:
            resultado['erros'].append(f"Erro ao ler PDF: {e}")
            self.stats['falhas'] += 1
            return resultado

        # 3. Extrair dados usando regex do layout
        regex_patterns = layout_info.get('regex', {})
        dados = self.extrair_com_regex(texto, regex_patterns)
        resultado['dados_extraidos'] = dados

        print(f"✓ Extraídos {len(dados)} campos")

        # 4. Validar dados
        valido, erros = self.validar_dados_extraidos(dados, layout_info['tipo'])
        resultado['validacao_ok'] = valido
        resultado['erros'].extend(erros)

        if valido:
            print("✓ Validação: OK")
            self.stats['validacoes_ok'] += 1
        else:
            print(f"⚠ Validação: {len(erros)} erro(s)")
            for erro in erros:
                print(f"  • {erro}")
            self.stats['validacoes_falhas'] += 1

        # 5. Salvar no banco se solicitado e validado
        if salvar_banco and valido:
            arquivo_info = {
                'nome': pdf_path.name,
                'caminho': str(pdf_path.absolute())
            }

            if layout_info['tipo'] == 'nfse':
                registro_id = self.salvar_nota_fiscal(dados, arquivo_info)
                resultado['registro_id'] = registro_id
                resultado['salvo_banco'] = (registro_id is not None)

            elif layout_info['tipo'] == 'boleto':
                registro_id = self.salvar_boleto(dados, arquivo_info)
                resultado['registro_id'] = registro_id
                resultado['salvo_banco'] = (registro_id is not None)

        # 6. Registrar no histórico
        self.registrar_extracao(pdf_path, layout_info, dados, valido, erros)

        # 7. Atualizar estatísticas
        if resultado['salvo_banco']:
            resultado['sucesso'] = True
            self.stats['sucesso'] += 1
            print("✅ Dados salvos no banco com sucesso!")
        else:
            self.stats['falhas'] += 1

        print(f"{'='*60}\n")

        return resultado

    def processar_lote(self, diretorio: Path, salvar_banco: bool = True) -> Dict:
        """
        Processa múltiplos PDFs de um diretório
        """
        resultados = []
        arquivos_pdf = list(diretorio.glob('**/*.pdf'))

        print(f"\n{'='*70}")
        print(f"📦 PROCESSAMENTO EM LOTE")
        print(f"{'='*70}")
        print(f"📁 Diretório: {diretorio}")
        print(f"📋 Arquivos encontrados: {len(arquivos_pdf)}")
        print(f"{'='*70}\n")

        for pdf_path in arquivos_pdf:
            resultado = self.extrair_e_salvar(pdf_path, salvar_banco)
            resultados.append({
                'arquivo': pdf_path.name,
                'resultado': resultado
            })

        # Resumo
        print(f"\n{'='*70}")
        print(f"📊 RESUMO DO PROCESSAMENTO")
        print(f"{'='*70}")
        print(f"Total processados:     {self.stats['total_extraidos']}")
        print(f"✅ Sucesso:            {self.stats['sucesso']}")
        print(f"❌ Falhas:             {self.stats['falhas']}")
        print(f"✓ Validações OK:       {self.stats['validacoes_ok']}")
        print(f"⚠ Validações falhas:   {self.stats['validacoes_falhas']}")
        print(f"🆕 Clientes novos:     {self.stats['clientes_novos']}")
        print(f"👥 Clientes existentes: {self.stats['clientes_existentes']}")
        print(f"{'='*70}\n")

        return {
            'stats': self.stats,
            'resultados': resultados
        }

    def obter_estatisticas_acuracia(self) -> Dict:
        """
        Retorna estatísticas de acurácia do sistema
        """
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        # Total de extrações
        cursor.execute('SELECT COUNT(*) FROM extraction_history')
        total = cursor.fetchone()[0] or 0

        # Extrações bem-sucedidas
        cursor.execute('SELECT COUNT(*) FROM extraction_history WHERE sucesso = 1')
        sucesso = cursor.fetchone()[0] or 0

        # Acurácia por layout
        cursor.execute('''
            SELECT layout_nome,
                   COUNT(*) as total,
                   SUM(CASE WHEN sucesso = 1 THEN 1 ELSE 0 END) as sucessos
            FROM extraction_history
            WHERE layout_nome IS NOT NULL
            GROUP BY layout_nome
            ORDER BY total DESC
        ''')

        por_layout = []
        for row in cursor.fetchall():
            layout, tot, suc = row
            acuracia = (suc / tot * 100) if tot > 0 else 0
            por_layout.append({
                'layout': layout,
                'total': tot,
                'sucesso': suc,
                'acuracia': round(acuracia, 2)
            })

        conn.close()

        acuracia_geral = (sucesso / total * 100) if total > 0 else 0

        return {
            'total_extracoes': total,
            'total_sucesso': sucesso,
            'total_falhas': total - sucesso,
            'acuracia_geral': round(acuracia_geral, 2),
            'por_layout': por_layout
        }
