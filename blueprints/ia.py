# -*- coding: utf-8 -*-
"""AI Analysis and Document Processing Blueprint."""
import os
import json
import re
import traceback
from pathlib import Path
from datetime import datetime, date
from collections import defaultdict
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from services.database import get_db

try:
    from google import genai
except ImportError:
    genai = None

ia_bp = Blueprint('ia', __name__)

# Will be set during init
UPLOAD_DIR = None
layout_learner = None
COMPILED_PATTERNS = None


def init(upload_dir, learner, patterns):
    global UPLOAD_DIR, layout_learner, COMPILED_PATTERNS
    UPLOAD_DIR = upload_dir
    layout_learner = learner
    COMPILED_PATTERNS = patterns


# ==================== HELPER FUNCTIONS ====================

def obter_contexto_completo():
    """Busca todos os dados do banco de dados (documentos: laudos, recibos, orcamentos)"""
    conn = get_db()

    docs = conn.execute('''
        SELECT tipo_doc, nome_arquivo, valor_total, data_geracao, cliente_nome
        FROM documentos_gerados
        ORDER BY data_geracao DESC
    ''').fetchall()

    clientes = conn.execute('''
        SELECT nome_fantasia, razao_social, cnpj, cidade, telefone
        FROM clientes_web
        ORDER BY nome_fantasia
    ''').fetchall()

    return {
        'documentos': [dict(d) for d in docs],
        'clientes': [dict(c) for c in clientes]
    }


def calcular_estatisticas(dados):
    """Calcula estatisticas de documentos (laudos, recibos, orcamentos)"""
    docs = dados.get('documentos', [])

    if not docs:
        return {}

    # Contadores por tipo
    laudos = 0
    recibos = 0
    orcamentos = 0
    valor_recibos = 0.0
    por_mes = defaultdict(float)

    for doc in docs:
        tipo = (doc.get('tipo_doc') or '').upper()
        valor = doc.get('valor_total') or 0

        if 'LAUDO' in tipo:
            laudos += 1
        elif 'RECIBO' in tipo:
            recibos += 1
            valor_recibos += valor
        elif 'ORÇAMENTO' in tipo or 'ORCAMENTO' in tipo:
            orcamentos += 1

        data = doc.get('data_geracao')
        if data and len(data) >= 7:
            mes = data[:7]
            por_mes[mes] += valor or 0

    return {
        'total_documentos': len(docs),
        'laudos': laudos,
        'recibos': recibos,
        'orcamentos': orcamentos,
        'valor_recibos': valor_recibos,
        'faturamento_mensal': dict(por_mes)
    }


def consultar_ia_analise(pergunta_usuario, tipo_analise='geral'):
    """
    Consulta Gemini API com analise de dados de documentos
    """
    try:
        dados = obter_contexto_completo()
        stats = calcular_estatisticas(dados)

        # Preparar contexto
        contexto_dados = f"""
=== ESTATÍSTICAS DE DOCUMENTOS ===
Total de Documentos: {stats.get('total_documentos', 0)}
Laudos: {stats.get('laudos', 0)}
Recibos: {stats.get('recibos', 0)}
Orçamentos: {stats.get('orcamentos', 0)}
Valor Total dos Recibos: R$ {stats.get('valor_recibos', 0):.2f}

=== DOCUMENTOS RECENTES (Top 10) ===
"""

        for i, doc in enumerate(dados['documentos'][:10], 1):
            tipo = doc.get('tipo_doc') or 'Documento'
            cliente = doc.get('cliente_nome') or 'Cliente'
            valor = doc.get('valor_total') or 0
            data = doc.get('data_geracao') or 'Sem data'
            contexto_dados += f"{i}. {tipo} - {cliente} - R$ {valor:.2f} ({data})\n"

        # Chamar Gemini API
        api_key = os.environ.get("GEMINI_API_KEY")

        if not api_key or api_key == "SUBSTITUA-PELA-SUA-CHAVE-GEMINI-AQUI":
            return {
                "sucesso": False,
                "erro": "API Key não configurada ou inválida",
                "resposta": "Configure a GEMINI_API_KEY no arquivo .env. Obtenha em: https://makersuite.google.com/app/apikey"
            }

        # Preparar prompt completo
        prompt_completo = f"""Você é um assistente de análise de dados de negócios.
Responda perguntas sobre documentos (laudos, recibos, orçamentos) e análises de desempenho.
Seja direto, use dados específicos e forneça insights quando relevante.

{contexto_dados}

PERGUNTA: {pergunta_usuario}"""

        # Gerar resposta (novo SDK google-genai)
        client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt_completo
        )

        return {
            "sucesso": True,
            "resposta": response.text,
            "tipo_analise": tipo_analise,
            "modelo": "gemini-2.5-flash"
        }

    except Exception as e:
        traceback.print_exc()
        return {
            "sucesso": False,
            "erro": str(e),
            "resposta": f"Erro ao processar: {str(e)}"
        }


def gerar_insights_automaticos():
    """Gera insights automaticos sobre documentos"""
    pergunta = """Analise os dados de documentos (laudos, recibos, orçamentos) e forneça:
1. 3 principais insights sobre a produção de documentos
2. 2 oportunidades de crescimento no volume de serviços
3. 1 alerta importante

Seja específico e use números reais."""

    return consultar_ia_analise(pergunta, tipo_analise='documentos')


def gerar_analise_completa_faturamento():
    """
    Gera analise completa e detalhada de documentos
    Focado em laudos, recibos e orcamentos com analise profunda
    """
    try:
        conn = get_db()

        # Buscar TODOS os documentos
        todos_docs = conn.execute('''
            SELECT tipo_doc, nome_arquivo, valor_total, data_geracao, cliente_nome
            FROM documentos_gerados
            ORDER BY data_geracao DESC
        ''').fetchall()

        # Separar por tipo
        laudos = [d for d in todos_docs if 'LAUDO' in (d['tipo_doc'] or '').upper()]
        recibos = [d for d in todos_docs if 'RECIBO' in (d['tipo_doc'] or '').upper()]
        orcamentos = [d for d in todos_docs if 'ORÇAMENTO' in (d['tipo_doc'] or '').upper() or 'ORCAMENTO' in (d['tipo_doc'] or '').upper()]

        # Calcular totais
        total_valor_recibos = sum([r['valor_total'] or 0 for r in recibos])

        # Analise por mes e cliente
        por_mes = defaultdict(lambda: {'laudos': 0, 'recibos': 0, 'orcamentos': 0, 'valor': 0})
        por_cliente = defaultdict(lambda: {'docs': 0, 'valor': 0})
        valores_recibos = []

        for doc in todos_docs:
            tipo = (doc['tipo_doc'] or '').upper()
            data = doc['data_geracao']
            valor = doc['valor_total'] or 0
            cliente = doc['cliente_nome'] or 'Não identificado'

            if data and len(data) >= 7:
                mes = data[:7]
                if 'LAUDO' in tipo:
                    por_mes[mes]['laudos'] += 1
                elif 'RECIBO' in tipo:
                    por_mes[mes]['recibos'] += 1
                    por_mes[mes]['valor'] += valor
                    valores_recibos.append(valor)
                elif 'ORÇAMENTO' in tipo or 'ORCAMENTO' in tipo:
                    por_mes[mes]['orcamentos'] += 1

            por_cliente[cliente]['docs'] += 1
            por_cliente[cliente]['valor'] += valor

        # Calcular estatisticas
        media_mensal = sum([m['valor'] for m in por_mes.values()]) / len(por_mes) if por_mes else 0

        # Ticket medio dos recibos
        ticket_medio = sum(valores_recibos) / len(valores_recibos) if valores_recibos else 0
        ticket_maximo = max(valores_recibos) if valores_recibos else 0
        ticket_minimo = min(valores_recibos) if valores_recibos else 0

        # Top 5 clientes por quantidade de documentos
        top_clientes = sorted(por_cliente.items(), key=lambda x: x[1]['docs'], reverse=True)[:5]

        # Preparar relatorio
        relatorio = f"""
=== ANÁLISE COMPLETA DE DOCUMENTOS ===

RESUMO:
- Total de Laudos: {len(laudos)}
- Total de Recibos: {len(recibos)} (R$ {total_valor_recibos:,.2f})
- Total de Orçamentos: {len(orcamentos)}
- Total Geral: {len(todos_docs)} documentos

INDICADORES:
- Ticket Médio (Recibos): R$ {ticket_medio:,.2f}
- Maior Recibo: R$ {ticket_maximo:,.2f}
- Menor Recibo: R$ {ticket_minimo:,.2f}
- Média Mensal (Valor): R$ {media_mensal:,.2f}

TOP 5 CLIENTES (por quantidade):
"""
        for i, (cliente, dados) in enumerate(top_clientes, 1):
            relatorio += f"{i}. {cliente}: {dados['docs']} docs - R$ {dados['valor']:,.2f}\n"

        relatorio += f"\nEVOLUÇÃO MENSAL:\n"
        for mes, dados in sorted(por_mes.items(), reverse=True)[:12]:
            relatorio += f"- {mes}: {dados['laudos']} laudos, {dados['recibos']} recibos (R$ {dados['valor']:,.2f}), {dados['orcamentos']} orçamentos\n"

        relatorio += f"\nRECIBOS RECENTES (Top 20):\n"
        for i, recibo in enumerate(recibos[:20], 1):
            relatorio += f"{i}. {recibo['nome_arquivo']} - R$ {recibo['valor_total'] or 0:,.2f} - {recibo['data_geracao']}\n"

        # Chamar Gemini para analise
        api_key = os.environ.get("GEMINI_API_KEY")

        if not api_key or api_key == "SUBSTITUA-PELA-SUA-CHAVE-GEMINI-AQUI":
            return {
                "sucesso": False,
                "erro": "API Key não configurada",
                "dados_brutos": {
                    "total_laudos": len(laudos),
                    "total_recibos": len(recibos),
                    "total_orcamentos": len(orcamentos),
                    "valor_recibos": total_valor_recibos,
                    "relatorio": relatorio
                }
            }

        prompt = f"""{relatorio}

Com base nesses dados de documentos (laudos, recibos, orçamentos), forneça uma análise detalhada:

1. **DIAGNÓSTICO DE PRODUTIVIDADE**
   - Volume de documentos gerados
   - Tendência de crescimento ou declínio
   - Proporção entre tipos de documentos

2. **ANÁLISE DE CLIENTES**
   - Clientes mais ativos
   - Diversificação da base
   - Oportunidades de expansão

3. **ANÁLISE DE VALORES (RECIBOS)**
   - Ticket médio e sua variação
   - Distribuição de valores
   - Oportunidades de precificação

4. **TENDÊNCIAS E PADRÕES**
   - Sazonalidade na produção
   - Meses de maior/menor atividade
   - Padrões identificados

5. **RECOMENDAÇÕES**
   - 3 ações para aumentar produtividade
   - 2 oportunidades de crescimento
   - 1 alerta importante

Seja específico e use os números reais do relatório."""

        client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )

        return {
            "sucesso": True,
            "analise_ia": response.text,
            "dados_brutos": {
                "total_laudos": len(laudos),
                "total_recibos": len(recibos),
                "total_orcamentos": len(orcamentos),
                "valor_recibos": total_valor_recibos,
                "faturamento_mensal": {k: v['valor'] for k, v in sorted(por_mes.items(), reverse=True)},
                "ticket_medio": ticket_medio,
                "top_clientes": {c: d for c, d in top_clientes}
            },
            "relatorio": relatorio
        }

    except Exception as e:
        traceback.print_exc()
        return {
            "sucesso": False,
            "erro": str(e),
            "detalhes": traceback.format_exc()
        }


def extrair_dados_com_regex(texto):
    """Extrai dados usando regex patterns pre-compilados (otimizado)"""
    dados = {
        'data_emissao': None,
        'data_vencimento': None,
        'valor_total': None,
        'numero_documento': None,
        'cnpj': None,
        'nome_cliente': None,
        'tributos': {}
    }

    # Data de emissao - usar patterns pre-compilados
    for pattern in COMPILED_PATTERNS['data_emissao']:
        match = pattern.search(texto)
        if match:
            dados['data_emissao'] = match.group(1).replace('-', '/')
            break

    # Data de vencimento - usar patterns pre-compilados
    for pattern in COMPILED_PATTERNS['vencimento']:
        match = pattern.search(texto)
        if match:
            dados['data_vencimento'] = match.group(1).replace('-', '/')
            break

    # Valor total - usar patterns pre-compilados
    for pattern in COMPILED_PATTERNS['valor']:
        match = pattern.search(texto)
        if match:
            valor_str = match.group(1).replace('.', '').replace(',', '.')
            try:
                dados['valor_total'] = float(valor_str)
                break
            except (ValueError, AttributeError):
                pass  # Valor nao convertivel

    # Numero do documento - usar patterns pre-compilados
    for pattern in COMPILED_PATTERNS['numero']:
        match = pattern.search(texto)
        if match:
            dados['numero_documento'] = match.group(1)
            break

    # CNPJ - usar patterns pre-compilados
    for pattern in COMPILED_PATTERNS['cnpj']:
        match = pattern.search(texto)
        if match:
            dados['cnpj'] = match.group(1)
            break

    # Nome do Cliente / Tomador - usar patterns pre-compilados
    for pattern in COMPILED_PATTERNS['nome']:
        match = pattern.search(texto)
        if match:
            nome = match.group(1).strip()
            if len(nome) > 5:  # Pelo menos 5 caracteres
                dados['nome_cliente'] = nome
                break

    # Endereco - usar patterns pre-compilados
    for pattern in COMPILED_PATTERNS['endereco']:
        match = pattern.search(texto)
        if match:
            endereco = match.group(1).strip()
            # Limpar possiveis caracteres extras
            endereco = re.sub(r'\s*-\s*$', '', endereco)  # Remove traco no final
            if len(endereco) > 10:  # Endereco razoavel
                dados['endereco'] = endereco
                break

    # Bairro - usar patterns pre-compilados
    for pattern in COMPILED_PATTERNS['bairro']:
        match = pattern.search(texto)
        if match:
            bairro = match.group(1).strip()
            if len(bairro) > 2:
                dados['bairro'] = bairro
                break

    # CEP - usar patterns pre-compilados
    for pattern in COMPILED_PATTERNS['cep']:
        match = pattern.search(texto)
        if match:
            cep = match.group(1)
            # Formatar CEP se necessario
            if '-' not in cep and len(cep) == 8:
                cep = f"{cep[:5]}-{cep[5:]}"
            dados['cep'] = cep
            break

    # Tributos - usar patterns pre-compilados
    for tributo, patterns in COMPILED_PATTERNS['tributos'].items():
        for pattern in patterns:
            match = pattern.search(texto)
            if match:
                valor_str = match.group(1).replace('.', '').replace(',', '.')
                try:
                    dados['tributos'][tributo] = float(valor_str)
                    break
                except (ValueError, AttributeError):
                    pass  # Valor nao convertivel

    return dados


def analisar_arquivo_com_gemini(caminho_arquivo, nome_arquivo):
    """Analisa arquivo com multiplas estrategias (REGEX, OCR, IA)"""
    try:
        conteudo = ""
        dados_extraidos = {}

        # ESTRATEGIA 1: Extrair texto do PDF com pdfplumber
        if caminho_arquivo.endswith('.pdf'):
            try:
                import pdfplumber
                with pdfplumber.open(caminho_arquivo) as pdf:
                    for page in pdf.pages[:10]:  # Aumentar para 10 paginas
                        texto_pagina = page.extract_text() or ""
                        conteudo += texto_pagina + "\n"
            except Exception as e:
                print(f"Erro ao extrair PDF: {e}")
                return None
        else:
            try:
                with open(caminho_arquivo, 'r', encoding='utf-8') as f:
                    conteudo = f.read()[:20000]
            except (FileNotFoundError, PermissionError, UnicodeDecodeError) as e:
                print(f"[AVISO] Erro ao ler arquivo {caminho_arquivo}: {e}")
                return None

        if not conteudo or len(conteudo) < 50:
            return None

        # ESTRATEGIA 3: REGEX para extrair dados estruturados (MAIS CONFIAVEL)
        dados_regex = extrair_dados_com_regex(conteudo)

        # Se regex encontrou dados suficientes, usar eles
        if dados_regex.get('data_emissao') and dados_regex.get('valor_total'):
            print(f"OK Dados extraídos via REGEX: {dados_regex}")

            # Tentar identificar tipo de documento (MELHORADO)
            tipo_doc = 'outro'
            conteudo_lower = conteudo.lower()

            # Detectar LAUDO
            palavras_laudo = ['laudo', 'técnico', 'vistoria', 'inspeção', 'diagnóstico']
            matches_laudo = sum(1 for palavra in palavras_laudo if palavra in conteudo_lower)

            # Detectar RECIBO
            palavras_recibo = ['recibo', 'recebi de', 'valor recebido']
            matches_recibo = sum(1 for palavra in palavras_recibo if palavra in conteudo_lower)

            # Detectar ORCAMENTO
            palavras_orcamento = ['orçamento', 'orcamento', 'proposta', 'cotação']
            matches_orcamento = sum(1 for palavra in palavras_orcamento if palavra in conteudo_lower)

            # Determinar tipo baseado em pontuacao
            if matches_laudo >= 1:
                tipo_doc = 'laudo'
                print(f"[DETECÇÃO] OK Identificado como LAUDO ({matches_laudo} palavras-chave)")
            elif matches_recibo >= 1:
                tipo_doc = 'recibo'
                print(f"[DETECÇÃO] OK Identificado como RECIBO ({matches_recibo} palavras-chave)")
            elif matches_orcamento >= 1:
                tipo_doc = 'orcamento'
                print(f"[DETECÇÃO] OK Identificado como ORÇAMENTO ({matches_orcamento} palavras-chave)")
            else:
                print(f"[DETECÇÃO] AVISO Não identificado - marcado como 'outro'")

            return {
                'tipo_documento': tipo_doc,
                'dados_cliente': {
                    'nome': dados_regex.get('nome_cliente', ''),
                    'cnpj': dados_regex.get('cnpj', ''),
                    'endereco': dados_regex.get('endereco', ''),
                    'telefone': ''
                },
                'valores': {
                    'total': dados_regex.get('valor_total'),
                    'data_emissao': dados_regex.get('data_emissao'),
                    'data_vencimento': dados_regex.get('data_vencimento'),
                    'numero_documento': dados_regex.get('numero_documento', ''),
                    'tributos': dados_regex.get('tributos', {})
                },
                'informacoes_chave': ['Extraído via REGEX'],
                'resumo': f'{tipo_doc} - {dados_regex.get("data_emissao", "")}'
            }

        # ESTRATEGIA 4: GEMINI como fallback (apenas se regex falhou)
        if not os.environ.get("GEMINI_API_KEY"):
            return None

        fallback_client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

        # Prompt para extracao estruturada
        prompt = f"""
Analise o documento a seguir e extraia as informações mais importantes em formato JSON.

DOCUMENTO: {nome_arquivo}

CONTEÚDO:
{conteudo[:3000]}

Retorne APENAS um objeto JSON válido com esta estrutura:
{{
  "tipo_documento": "boleto|recibo|orcamento|laudo|contrato|outro",
  "dados_cliente": {{
    "nome": "nome ou razão social encontrada",
    "cnpj": "CNPJ se encontrado",
    "endereco": "endereço se encontrado",
    "telefone": "telefone se encontrado"
  }},
  "valores": {{
    "total": valor_numerico_ou_null,
    "data_emissao": "data de emissão no formato DD/MM/YYYY ou null",
    "data_vencimento": "data de vencimento no formato DD/MM/YYYY ou null (se for boleto)",
    "numero_documento": "número do documento/nota/boleto se houver",
    "tributos": {{
      "iss": valor_ou_null,
      "pis": valor_ou_null,
      "cofins": valor_ou_null,
      "inss": valor_ou_null,
      "ir": valor_ou_null
    }}
  }},
  "informacoes_chave": ["lista", "de", "informações", "importantes"],
  "resumo": "resumo breve do documento em 1-2 frases"
}}

IMPORTANTE:
- Extraia SEMPRE a data que está no documento, não use a data de hoje
- Se for boleto, procure por "Data de Vencimento" e "Data de Emissão"
- Se for recibo/orçamento/laudo, procure pela data do documento
- Formato de data SEMPRE DD/MM/YYYY

Retorne APENAS o JSON, sem explicações adicionais.
"""

        response = fallback_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        resultado_texto = response.text.strip()

        # Limpar markdown se houver
        if resultado_texto.startswith('```'):
            resultado_texto = resultado_texto.split('```')[1]
            if resultado_texto.startswith('json'):
                resultado_texto = resultado_texto[4:]

        # Parse JSON
        dados_extraidos = json.loads(resultado_texto)
        return dados_extraidos

    except Exception as e:
        print(f"Erro na análise Gemini: {e}")
        return None


def consultar_cnpj_receita(cnpj):
    """Consulta dados do CNPJ na Receita Federal (API ReceitaWS)"""
    try:
        import requests

        # Limpar CNPJ (apenas numeros)
        cnpj_limpo = ''.join(filter(str.isdigit, cnpj))

        if len(cnpj_limpo) != 14:
            print(f"[CNPJ] CNPJ inválido: {cnpj}")
            return None

        print(f"[CNPJ] Consultando CNPJ na Receita Federal: {cnpj_limpo}")

        # API gratuita da ReceitaWS
        url = f"https://www.receitaws.com.br/v1/cnpj/{cnpj_limpo}"

        response = requests.get(url, timeout=10)

        if response.status_code == 200:
            dados = response.json()

            if dados.get('status') == 'ERROR':
                print(f"[CNPJ] Erro na consulta: {dados.get('message')}")
                return None

            # Montar endereco completo
            print(f"[CNPJ] Montando endereço a partir dos dados da API...")
            print(f"[CNPJ]   Logradouro: {dados.get('logradouro', 'N/A')}")
            print(f"[CNPJ]   Número: {dados.get('numero', 'N/A')}")
            print(f"[CNPJ]   Complemento: {dados.get('complemento', 'N/A')}")
            print(f"[CNPJ]   Bairro: {dados.get('bairro', 'N/A')}")
            print(f"[CNPJ]   Município: {dados.get('municipio', 'N/A')}")
            print(f"[CNPJ]   UF: {dados.get('uf', 'N/A')}")
            print(f"[CNPJ]   CEP: {dados.get('cep', 'N/A')}")

            endereco_completo = ""
            if dados.get('logradouro'):
                endereco_completo = dados['logradouro']
                if dados.get('numero'):
                    endereco_completo += f", {dados['numero']}"
                if dados.get('complemento') and dados['complemento'].strip():
                    endereco_completo += f", {dados['complemento']}"
                if dados.get('bairro'):
                    endereco_completo += f", {dados['bairro']}"
                if dados.get('municipio'):
                    endereco_completo += f", {dados['municipio']}"
                if dados.get('uf'):
                    endereco_completo += f", {dados['uf']}"
                if dados.get('cep'):
                    endereco_completo += f", CEP: {dados['cep']}"

            print(f"[CNPJ] Endereço montado: {endereco_completo}")

            resultado = {
                'nome': dados.get('nome', ''),
                'razao_social': dados.get('nome', ''),
                'nome_fantasia': dados.get('fantasia', ''),
                'cnpj': dados.get('cnpj', ''),
                'endereco_completo': endereco_completo,
                'logradouro': dados.get('logradouro', ''),
                'numero': dados.get('numero', ''),
                'complemento': dados.get('complemento', ''),
                'bairro': dados.get('bairro', ''),
                'municipio': dados.get('municipio', ''),
                'uf': dados.get('uf', ''),
                'cep': dados.get('cep', ''),
                'telefone': dados.get('telefone', ''),
                'email': dados.get('email', ''),
                'situacao': dados.get('situacao', ''),
                'data_abertura': dados.get('abertura', ''),
            }

            print(f"[CNPJ] OK Dados encontrados na Receita Federal!")
            print(f"[CNPJ]   Razão Social: {resultado['razao_social']}")
            print(f"[CNPJ]   Nome Fantasia: {resultado['nome_fantasia']}")
            print(f"[CNPJ]   Endereço: {endereco_completo[:100]}")
            print(f"[CNPJ]   Situação: {resultado['situacao']}")

            return resultado
        else:
            print(f"[CNPJ] Erro HTTP {response.status_code}")
            return None

    except Exception as e:
        print(f"[CNPJ] Erro ao consultar CNPJ: {e}")
        return None


def processar_boleto(caminho_arquivo, arquivo_nome, documento_id):
    """
    Processa ESPECIFICAMENTE boletos - Funcao dedicada e otimizada

    Fluxo:
    1. Extrai texto do PDF (OCR com pdfplumber)
    2. Detecta se e realmente um boleto (palavras-chave)
    3. Extrai dados: valor, vencimento, codigo de barras, beneficiario
    4. Salva na tabela boletos
    5. Atualiza documentos_gerados

    Returns:
        dict: Dados extraidos ou None se falhar
    """
    try:
        print(f"\n{'='*70}")
        print(f"[BOLETO] Processando boleto: {arquivo_nome}")
        print(f"{'='*70}")

        # ========== ETAPA 1: EXTRAIR TEXTO DO PDF ==========
        print(f"[BOLETO] [1/5] Extraindo texto do PDF...")
        texto_completo = ""

        try:
            import pdfplumber
            with pdfplumber.open(caminho_arquivo) as pdf:
                for pagina in pdf.pages:
                    texto = pagina.extract_text()
                    if texto:
                        texto_completo += texto + "\n"
            print(f"[BOLETO] OK Texto extraído: {len(texto_completo)} caracteres")
        except Exception as e:
            print(f"[BOLETO] ERRO Erro ao extrair texto: {e}")
            return None

        if not texto_completo or len(texto_completo) < 50:
            print(f"[BOLETO] ERRO Texto insuficiente para análise")
            return None

        texto_lower = texto_completo.lower()

        # ========== ETAPA 2: VALIDAR SE E BOLETO ==========
        print(f"[BOLETO] [2/5] Validando se é realmente um boleto...")

        palavras_chave_boleto = [
            'boleto', 'vencimento', 'nosso número', 'nosso numero',
            'código de barras', 'codigo de barras', 'linha digitável', 'linha digitavel',
            'beneficiário', 'beneficiario', 'pagador', 'sacado', 'cedente',
            'banco do brasil', 'itaú', 'itau', 'bradesco', 'santander',
            'caixa econômica', 'caixa economica', 'sicoob', 'sicredi',
            'valor do documento', 'valor cobrado', 'agência', 'agencia',
            'conta corrente', 'data de vencimento', 'data do vencimento'
        ]

        matches = sum(1 for palavra in palavras_chave_boleto if palavra in texto_lower)

        if matches < 3:  # Precisa de pelo menos 3 palavras-chave
            print(f"[BOLETO] ERRO Não parece ser um boleto (apenas {matches} palavras-chave encontradas)")
            print(f"[BOLETO] Palavras encontradas: {[p for p in palavras_chave_boleto if p in texto_lower]}")
            return None

        print(f"[BOLETO] OK Confirmado como boleto ({matches} palavras-chave encontradas)")

        # ========== ETAPA 3: EXTRAIR DADOS DO NOME DO ARQUIVO ==========
        print(f"[BOLETO] [3/5] Extraindo dados do nome do arquivo...")

        dados_boleto = {}

        # Remover timestamp do nome do arquivo se houver (formato: YYYYMMDD_HHMMSS_)
        nome_limpo = re.sub(r'^\d{8}_\d{6}_', '', arquivo_nome)
        # Remover extensao .pdf
        nome_limpo = nome_limpo.replace('.pdf', '').replace('.PDF', '')

        print(f"[BOLETO]   Nome original: {arquivo_nome}")
        print(f"[BOLETO]   Nome limpo: {nome_limpo}")

        # Padrao: NOME - VALOR - DATA
        # Exemplos: "ELASA - 950,00 - 26-09-2025" ou "EMPRESA TESTE - 1500.50 - 15/12/2024"
        padrao_completo = r'^(.+?)\s*[-–]\s*([\d\.,]+)\s*[-–]\s*(\d{2})[-/](\d{2})[-/](\d{4})'
        match = re.search(padrao_completo, nome_limpo, re.IGNORECASE)

        if match:
            # Extrair do nome do arquivo
            dados_boleto['cliente_nome'] = match.group(1).strip().upper()

            # Extrair valor
            valor_str = match.group(2).replace('.', '').replace(',', '.')
            try:
                dados_boleto['valor'] = float(valor_str)
            except (ValueError, AttributeError):
                dados_boleto['valor'] = 0.0

            # Extrair data de vencimento (DD-MM-YYYY ou DD/MM/YYYY)
            dia = match.group(3)
            mes = match.group(4)
            ano = match.group(5)
            dados_boleto['data_vencimento'] = f"{dia}/{mes}/{ano}"
            dados_boleto['data_emissao'] = datetime.now().strftime('%d/%m/%Y')

            print(f"[BOLETO]   OK Cliente (do arquivo): {dados_boleto['cliente_nome']}")
            print(f"[BOLETO]   OK Valor (do arquivo): R$ {dados_boleto['valor']:.2f}")
            print(f"[BOLETO]   OK Vencimento (do arquivo): {dados_boleto['data_vencimento']}")
            print(f"[BOLETO]   OK Emissão: {dados_boleto['data_emissao']} (data atual)")
        else:
            print(f"[BOLETO]   AVISO Padrão não encontrado no nome do arquivo")
            print(f"[BOLETO]   Esperado: NOME - VALOR - DD-MM-AAAA")

            # Tentar extrair apenas o nome (tudo antes do primeiro -)
            nome_simples = nome_limpo.split('-')[0].strip() if '-' in nome_limpo else nome_limpo
            dados_boleto['cliente_nome'] = nome_simples.upper() if nome_simples else 'CLIENTE NÃO IDENTIFICADO'
            dados_boleto['valor'] = 0.0
            dados_boleto['data_vencimento'] = datetime.now().strftime('%d/%m/%Y')
            dados_boleto['data_emissao'] = datetime.now().strftime('%d/%m/%Y')

            print(f"[BOLETO]   -> Usando: Cliente='{dados_boleto['cliente_nome']}', Valor=R$ 0,00")

        # Campos adicionais (padrao)
        dados_boleto['endereco'] = ''
        dados_boleto['numero_documento'] = ''
        dados_boleto['codigo_barras'] = None

        # Gemini desativado - dados vem do nome do arquivo
        print(f"[BOLETO]   Usando dados do nome do arquivo (Gemini desativado)")

        # ========== ETAPA 4: SALVAR NA TABELA BOLETOS ==========
        print(f"[BOLETO] [4/5] Salvando na tabela boletos...")

        conn = get_db()
        cursor = conn.execute('''
            INSERT INTO boletos (
                cliente_nome, descricao, valor, data_emissao, data_vencimento,
                numero_documento, codigo_barras, status, arquivo_caminho, data_criacao
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            dados_boleto['cliente_nome'],
            f"Boleto de {dados_boleto['cliente_nome']} - Venc: {dados_boleto['data_vencimento']}",
            dados_boleto['valor'],
            dados_boleto['data_emissao'],
            dados_boleto['data_vencimento'],
            dados_boleto['numero_documento'],
            dados_boleto['codigo_barras'],
            'pendente',
            caminho_arquivo,
            datetime.now()
        ))
        boleto_id = cursor.lastrowid
        conn.commit()

        print(f"[BOLETO] OKOK Boleto salvo com ID: {boleto_id}")

        # ========== ETAPA 5: ATUALIZAR DOCUMENTOS_GERADOS ==========
        print(f"[BOLETO] [5/5] Atualizando documentos_gerados...")

        # Converter data de vencimento para datetime
        try:
            partes = dados_boleto['data_vencimento'].split('/')
            data_obj = datetime(int(partes[2]), int(partes[1]), int(partes[0]))
        except (ValueError, IndexError, AttributeError):
            data_obj = datetime.now()

        conn.execute('''
            UPDATE documentos_gerados
            SET tipo_doc = 'BOLETO',
                cliente_nome = ?,
                valor_total = ?,
                data_geracao = ?
            WHERE id = ?
        ''', (
            dados_boleto['cliente_nome'],
            dados_boleto['valor'],
            data_obj,
            documento_id
        ))
        conn.commit()

        print(f"[BOLETO] OK documentos_gerados atualizado")
        print(f"{'='*70}")
        print(f"[BOLETO] OKOKOK PROCESSAMENTO CONCLUÍDO COM SUCESSO!")
        print(f"{'='*70}\n")

        return dados_boleto

    except Exception as e:
        print(f"[BOLETO] ERROERROERRO ERRO NO PROCESSAMENTO: {e}")
        traceback.print_exc()
        return None


def salvar_dados_gemini_no_banco(dados_extraidos, arquivo_id, arquivo_nome, respeitar_limite=False):
    """Salva dados extraidos pelo Gemini no banco de dados"""
    try:
        if not dados_extraidos:
            return

        conn = get_db()
        tipo_doc = dados_extraidos.get('tipo_documento', 'outro')
        valores = dados_extraidos.get('valores', {})

        print(f"\n[SALVAR] Iniciando salvamento no banco...")
        print(f"[SALVAR] Tipo do documento extraído: {tipo_doc}")
        print(f"[SALVAR] Valores extraídos: {valores}")
        print(f"[SALVAR] Tem valor total? {bool(valores.get('total'))}")

        # Se for cliente identificado, tentar cadastrar (sem duplicar)
        # REGRA: Cadastro automatico SO com CNPJ + Nome + Endereco
        if dados_extraidos.get('dados_cliente'):
            cliente = dados_extraidos['dados_cliente']
            nome = cliente.get('nome', '').strip()
            cnpj = cliente.get('cnpj', '').strip()
            endereco = cliente.get('endereco', '').strip()

            # CONSULTAR CNPJ NA RECEITA FEDERAL PARA COMPLEMENTAR DADOS
            if cnpj:
                # Se deve respeitar limite, adicionar delay
                if respeitar_limite:
                    import time
                    # Verificar se ja houve consultas recentes
                    if not hasattr(salvar_dados_gemini_no_banco, '_ultimas_consultas'):
                        salvar_dados_gemini_no_banco._ultimas_consultas = []

                    agora = time.time()
                    # Remover consultas mais antigas que 60 segundos
                    salvar_dados_gemini_no_banco._ultimas_consultas = [
                        t for t in salvar_dados_gemini_no_banco._ultimas_consultas
                        if agora - t < 60
                    ]

                    # Se ja tem 3 consultas no ultimo minuto, esperar
                    if len(salvar_dados_gemini_no_banco._ultimas_consultas) >= 3:
                        tempo_espera = 60 - (agora - salvar_dados_gemini_no_banco._ultimas_consultas[0])
                        if tempo_espera > 0:
                            print(f"[CNPJ] Aguardando {tempo_espera:.0f}s para respeitar limite de 3/min...")
                            time.sleep(tempo_espera + 1)  # +1 segundo de margem

                    # Registrar esta consulta
                    salvar_dados_gemini_no_banco._ultimas_consultas.append(time.time())

                # Tentar consultar, mas nao falhar se der erro
                try:
                    dados_receita = consultar_cnpj_receita(cnpj)
                except Exception as e:
                    print(f"[CNPJ] ERRO ao consultar Receita: {e}")
                    dados_receita = None
                if dados_receita:
                    # Usar dados da Receita Federal (SEMPRE PRIORITARIOS)
                    print(f"[CLIENTE] OK Dados da Receita Federal recebidos!")

                    # SEMPRE usar dados da Receita quando disponiveis (mais confiaveis)
                    nome_receita = dados_receita.get('nome_fantasia') or dados_receita.get('razao_social', '')
                    razao_receita = dados_receita.get('razao_social', '')
                    endereco_receita = dados_receita.get('endereco_completo', '')
                    cnpj_receita = dados_receita.get('cnpj', cnpj)
                    telefone_receita = dados_receita.get('telefone', '')
                    email_receita = dados_receita.get('email', '')

                    print(f"[CLIENTE] Dados extraídos da Receita:")
                    print(f"[CLIENTE]   Nome Fantasia: {nome_receita}")
                    print(f"[CLIENTE]   Razão Social: {razao_receita}")
                    print(f"[CLIENTE]   Endereço: {endereco_receita}")
                    print(f"[CLIENTE]   Telefone: {telefone_receita}")
                    print(f"[CLIENTE]   Email: {email_receita}")

                    # PRIORIZAR dados da Receita, usar extraido do PDF apenas como fallback
                    nome = nome_receita if nome_receita else nome
                    endereco = endereco_receita if endereco_receita else endereco

                    # Atualizar dados do cliente com informacoes da Receita (prioritarias)
                    cliente.update({
                        'nome': nome,
                        'razao_social': razao_receita if razao_receita else nome,
                        'nome_fantasia': nome_receita if nome_receita else nome,
                        'cnpj': cnpj_receita,
                        'endereco': endereco,
                        'telefone': telefone_receita if telefone_receita else cliente.get('telefone', ''),
                        'email': email_receita if email_receita else cliente.get('email', ''),
                    })

                    print(f"[CLIENTE] Dados finais após Receita:")
                    print(f"[CLIENTE]   Nome: {nome}")
                    print(f"[CLIENTE]   Endereço: {endereco[:100] if endereco else 'N/A'}")
                else:
                    print(f"[CLIENTE] AVISO Consulta à Receita falhou ou não retornou dados")

            # Validar se tem TODOS os dados obrigatorios para cadastro automatico
            tem_dados_completos = bool(nome and cnpj and endereco)

            if not tem_dados_completos:
                print(f"[CLIENTE] Dados incompletos para cadastro automático")
                print(f"[CLIENTE]   Nome: {'OK' if nome else 'ERRO'} {nome[:50] if nome else 'N/A'}")
                print(f"[CLIENTE]   CNPJ: {'OK' if cnpj else 'ERRO'} {cnpj if cnpj else 'N/A'}")
                print(f"[CLIENTE]   Endereço: {'OK' if endereco else 'ERRO'} {endereco[:50] if endereco else 'N/A'}")
                print(f"[CLIENTE] AVISO Cliente NÃO será cadastrado automaticamente (faltam dados)")
            else:
                # Verificar se cliente ja existe (por CNPJ primeiro, depois por nome)
                existe = None

                if cnpj:
                    # Remover pontuacao do CNPJ para comparacao
                    cnpj_limpo = ''.join(filter(str.isdigit, cnpj))
                    if cnpj_limpo:
                        existe = conn.execute(
                            "SELECT id, nome_fantasia FROM clientes_web WHERE REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '') = ?",
                            (cnpj_limpo,)
                        ).fetchone()

                # Se nao encontrou por CNPJ, tentar por nome exato
                if not existe and nome:
                    existe = conn.execute(
                        "SELECT id, nome_fantasia FROM clientes_web WHERE nome_fantasia = ? OR razao_social = ?",
                        (nome, nome)
                    ).fetchone()

                if existe:
                    print(f"[CLIENTE] Cliente já existe: {existe[1]} (ID: {existe[0]})")
                else:
                    # Cadastrar novo cliente com todos os dados obrigatorios
                    print(f"[CLIENTE] OK Dados completos encontrados!")
                    print(f"[CLIENTE]   Nome: {nome}")
                    print(f"[CLIENTE]   CNPJ: {cnpj}")
                    print(f"[CLIENTE]   Endereço: {endereco[:100]}")

                    # Valores que serao inseridos no banco
                    razao_social_final = cliente.get('razao_social', nome)
                    telefone_final = cliente.get('telefone', '')
                    email_final = cliente.get('email', '')

                    print(f"[CLIENTE] >>> VALORES SENDO INSERIDOS NO BANCO:")
                    print(f"[CLIENTE] >>> nome_fantasia: {nome}")
                    print(f"[CLIENTE] >>> razao_social: {razao_social_final}")
                    print(f"[CLIENTE] >>> cnpj: {cnpj}")
                    print(f"[CLIENTE] >>> endereco_completo: {endereco}")
                    print(f"[CLIENTE] >>> telefone: {telefone_final}")
                    print(f"[CLIENTE] >>> email: {email_final}")

                    conn.execute('''INSERT INTO clientes_web
                        (nome_fantasia, razao_social, cnpj, endereco_completo, telefone, email, data_cadastro)
                        VALUES (?, ?, ?, ?, ?, ?, ?)''',
                        (nome,
                         razao_social_final,
                         cnpj,
                         endereco,
                         telefone_final,
                         email_final,
                         datetime.now()))
                    conn.commit()

                    # Verificar o que foi realmente salvo
                    cliente_inserido = conn.execute(
                        "SELECT id, nome_fantasia, endereco_completo FROM clientes_web WHERE cnpj = ? ORDER BY id DESC LIMIT 1",
                        (cnpj,)
                    ).fetchone()

                    if cliente_inserido:
                        print(f"[CLIENTE] OKOKOK Cliente cadastrado com sucesso! ID: {cliente_inserido[0]}")
                        print(f"[CLIENTE] >>> VERIFICAÇÃO NO BANCO:")
                        print(f"[CLIENTE] >>> Nome salvo: {cliente_inserido[1]}")
                        print(f"[CLIENTE] >>> Endereço salvo: {cliente_inserido[2]}")
                    else:
                        print(f"[CLIENTE] AVISO Erro ao verificar cliente inserido!")

        # Log do tipo detectado
        print(f"[SALVAR] Tipo detectado: {tipo_doc}, tem_total: {bool(valores.get('total'))}")

        # Atualizar documento_gerados com a data correta do documento
        data_documento = valores.get('data_emissao') or datetime.now().strftime('%d/%m/%Y')
        try:
            # Converter DD/MM/YYYY para objeto datetime
            if '/' in data_documento:
                partes = data_documento.split('/')
                data_obj = datetime(int(partes[2]), int(partes[1]), int(partes[0]))
            else:
                data_obj = datetime.now()
        except (ValueError, IndexError, AttributeError):
            data_obj = datetime.now()

        # Preparar nome do cliente
        cliente_nome_para_doc = dados_extraidos.get('dados_cliente', {}).get('nome', '')

        # Mapear tipo_doc para formato documentos_gerados
        tipo_doc_map = {
            'recibo': 'RECIBO',
            'laudo': 'LAUDO',
            'orcamento': 'ORÇAMENTO',
            'outro': 'UPLOAD'
        }
        tipo_doc_final = tipo_doc_map.get(tipo_doc, tipo_doc.upper())

        conn.execute('''UPDATE documentos_gerados
                       SET data_geracao = ?, valor_total = ?, tipo_doc = ?, cliente_nome = ?
                       WHERE id = ?''',
                    (data_obj, valores.get('total', 0.0), tipo_doc_final, cliente_nome_para_doc, arquivo_id))
        conn.commit()
        print(f"[SALVAR] OK Registro atualizado em documentos_gerados: tipo='{tipo_doc_final}', cliente='{cliente_nome_para_doc}'")

        # Salvar resumo e informacoes em tabela de analises
        conn.execute('''CREATE TABLE IF NOT EXISTS analises_gemini (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            arquivo_id INTEGER,
            arquivo_nome TEXT,
            tipo_documento TEXT,
            dados_extraidos TEXT,
            resumo TEXT,
            data_analise TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        conn.execute('''INSERT INTO analises_gemini
            (arquivo_id, arquivo_nome, tipo_documento, dados_extraidos, resumo)
            VALUES (?, ?, ?, ?, ?)''',
            (arquivo_id, arquivo_nome,
             tipo_doc,
             json.dumps(dados_extraidos, ensure_ascii=False),
             dados_extraidos.get('resumo', '')))
        conn.commit()

    except Exception as e:
        print(f"Erro ao salvar dados Gemini: {e}")
        traceback.print_exc()


# ==================== ROUTE HANDLERS ====================

@ia_bp.route('/api/analise-financeira', methods=['GET'])
def analise_financeira():
    """Analise focada em Laudos, Orcamentos e Recibos"""
    try:
        data_inicio = request.args.get('data_inicio')
        data_fim = request.args.get('data_fim')

        conn = get_db()

        # Contar documentos gerados por tipo (LAUDO, RECIBO, ORCAMENTO)
        query_docs = "SELECT tipo_doc, COUNT(*) as total, SUM(COALESCE(valor_total, 0)) as valor_total FROM documentos_gerados"
        params_docs = []

        if data_inicio and data_fim:
            query_docs += " WHERE date(data_geracao) BETWEEN ? AND ?"
            params_docs = [data_inicio, data_fim]

        query_docs += " GROUP BY tipo_doc"

        docs = conn.execute(query_docs, params_docs).fetchall()
        documentos = {}
        valores_por_tipo = {}
        for doc in docs:
            documentos[doc['tipo_doc']] = doc['total']
            valores_por_tipo[doc['tipo_doc']] = doc['valor_total'] or 0

        # Valor total dos recibos
        valor_recibos = valores_por_tipo.get('RECIBO', 0)

        # Total de laudos
        total_laudos = documentos.get('LAUDO', 0)

        # Total de orcamentos
        total_orcamentos = documentos.get('ORCAMENTO', 0) + documentos.get('ORÇAMENTO', 0)

        # Total de recibos
        total_recibos = documentos.get('RECIBO', 0)

        # Faturamento total = soma dos valores dos recibos (documentos com valor)
        faturamento_total = valor_recibos

        # Documentos por mes (ultimos 12 meses) - Laudos, Orcamentos e Recibos
        query_mensal = """
        SELECT
            strftime('%Y-%m', data_geracao) as mes,
            tipo_doc,
            COUNT(*) as total_docs,
            SUM(COALESCE(valor_total, 0)) as total_valor
        FROM documentos_gerados
        WHERE tipo_doc IN ('LAUDO', 'RECIBO', 'ORCAMENTO', 'ORÇAMENTO')
        GROUP BY mes, tipo_doc
        ORDER BY mes DESC
        LIMIT 36
        """

        docs_mensal = conn.execute(query_mensal).fetchall()

        # Agrupar por mes
        mensal_agrupado = {}
        for row in docs_mensal:
            mes = row['mes']
            if mes not in mensal_agrupado:
                mensal_agrupado[mes] = {'mes': mes, 'laudos': 0, 'recibos': 0, 'orcamentos': 0, 'valor_recibos': 0}
            tipo = row['tipo_doc']
            if tipo == 'LAUDO':
                mensal_agrupado[mes]['laudos'] = row['total_docs']
            elif tipo == 'RECIBO':
                mensal_agrupado[mes]['recibos'] = row['total_docs']
                mensal_agrupado[mes]['valor_recibos'] = row['total_valor']
            elif tipo in ('ORCAMENTO', 'ORÇAMENTO'):
                mensal_agrupado[mes]['orcamentos'] += row['total_docs']

        # Converter para lista ordenada
        faturamento_mensal = sorted(mensal_agrupado.values(), key=lambda x: x['mes'], reverse=True)[:12]

        # Top clientes por quantidade de documentos
        query_top_clientes = """
        SELECT
            cliente_nome,
            COUNT(*) as total_docs,
            SUM(COALESCE(valor_total, 0)) as total_valor
        FROM documentos_gerados
        WHERE cliente_nome IS NOT NULL AND cliente_nome != ''
        GROUP BY cliente_nome
        ORDER BY total_docs DESC, total_valor DESC
        LIMIT 10
        """
        top_clientes = conn.execute(query_top_clientes).fetchall()

        return jsonify({
            "documentos": documentos,
            "laudos": {
                "total": total_laudos
            },
            "recibos": {
                "total": total_recibos,
                "valor_total": valor_recibos
            },
            "orcamentos": {
                "total": total_orcamentos
            },
            "faturamento_total": faturamento_total,
            "faturamento_mensal": faturamento_mensal,
            "top_clientes": [dict(row) for row in top_clientes]
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@ia_bp.route('/api/upload-pdf', methods=['POST'])
def upload_pdf():
    """Upload e processamento de multiplos PDFs (salva em documentos_gerados)"""
    try:
        if 'arquivos' not in request.files:
            return jsonify({"error": "Nenhum arquivo enviado"}), 400

        arquivos = request.files.getlist('arquivos')
        if len(arquivos) == 0:
            return jsonify({"error": "Lista vazia"}), 400

        resultados = []
        conn = get_db()

        for arquivo in arquivos:
            if not arquivo.filename.lower().endswith('.pdf'):
                resultados.append({
                    "arquivo": arquivo.filename,
                    "status": "erro",
                    "mensagem": "Não é PDF"
                })
                continue

            try:
                # Salvar arquivo
                filename = secure_filename(arquivo.filename)
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                nome_arquivo = f"{timestamp}_{filename}"
                caminho_arquivo = UPLOAD_DIR / nome_arquivo
                arquivo.save(str(caminho_arquivo))

                # Extrair dados
                dados = extrair_dados_pdf(str(caminho_arquivo))

                # Determinar tipo de documento
                tipo_doc = dados.get('tipo_documento', 'UPLOAD')

                # Salvar em documentos_gerados
                cursor = conn.execute('''
                    INSERT INTO documentos_gerados
                    (tipo_doc, nome_arquivo, caminho_arquivo, valor_total, cliente_nome, data_geracao)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    tipo_doc,
                    nome_arquivo,
                    str(caminho_arquivo),
                    dados.get('valor_total', 0),
                    dados.get('cliente_nome'),
                    datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                ))
                arquivo_id = cursor.lastrowid
                conn.commit()

                # Sugerir e aplicar tags automaticamente
                conteudo_texto = dados.get('texto_completo', '')
                tags_sugeridas = sugerir_tags_automaticas(arquivo_id, 'documento', nome_arquivo, conteudo_texto)

                # Aplicar tags sugeridas automaticamente
                for tag_sugerida in tags_sugeridas:
                    adicionar_tag_documento(
                        arquivo_id,
                        'documento',
                        tag_sugerida['tag_id'],
                        tag_sugerida['confianca'],
                        manual=False
                    )

                resultados.append({
                    "arquivo": filename,
                    "status": "sucesso",
                    "dados": dados,
                    "tags_sugeridas": tags_sugeridas,
                    "arquivo_id": arquivo_id
                })

            except Exception as e:
                resultados.append({
                    "arquivo": arquivo.filename,
                    "status": "erro",
                    "mensagem": str(e)
                })

        sucessos = len([r for r in resultados if r['status'] == 'sucesso'])
        erros = len([r for r in resultados if r['status'] == 'erro'])

        return jsonify({
            "mensagem": f"{sucessos} sucesso(s), {erros} erro(s)",
            "resultados": resultados,
            "total": len(arquivos),
            "sucessos": sucessos,
            "erros": erros
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@ia_bp.route('/api/pdfs-processados', methods=['GET'])
def listar_pdfs_processados():
    """Lista todos os documentos PDF processados"""
    try:
        conn = get_db()
        docs = conn.execute('''
            SELECT * FROM documentos_gerados
            WHERE nome_arquivo LIKE '%.pdf'
            ORDER BY data_geracao DESC
        ''').fetchall()
        return jsonify([dict(row) for row in docs])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ia_bp.route('/api/ia-consulta', methods=['POST'])
def ia_consulta():
    """Endpoint para consultas a IA"""
    try:
        dados = request.json
        pergunta = dados.get('pergunta', '').strip()
        tipo_analise = dados.get('tipo_analise', 'geral')

        if not pergunta or len(pergunta) < 3:
            return jsonify({"erro": "Pergunta muito curta"}), 400

        if len(pergunta) > 1000:
            return jsonify({"erro": "Pergunta muito longa"}), 400

        resultado = consultar_ia_analise(pergunta, tipo_analise)
        return jsonify(resultado)

    except Exception as e:
        traceback.print_exc()
        return jsonify({
            "sucesso": False,
            "erro": str(e),
            "resposta": "Erro ao processar"
        }), 500


@ia_bp.route('/api/ia-insights', methods=['GET'])
def ia_insights():
    """Insights automaticos"""
    try:
        resultado = gerar_insights_automaticos()
        return jsonify(resultado)
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@ia_bp.route('/api/ia-status', methods=['GET'])
def ia_status():
    """Verifica status da IA"""
    try:
        api_key = os.environ.get("GEMINI_API_KEY")

        if not api_key:
            return jsonify({
                "configurada": False,
                "mensagem": "API Key não configurada. Obtenha em: https://makersuite.google.com/app/apikey"
            })

        if api_key == "SUBSTITUA-PELA-SUA-CHAVE-GEMINI-AQUI":
            return jsonify({
                "configurada": False,
                "mensagem": "API Key precisa ser configurada no arquivo .env"
            })

        return jsonify({
            "configurada": True,
            "mensagem": "IA pronta com Gemini 2.5 Flash",
            "modelo": "gemini-2.5-flash"
        })

    except Exception as e:
        return jsonify({
            "configurada": False,
            "erro": str(e)
        })


@ia_bp.route('/api/ia-analise-completa', methods=['GET'])
def ia_analise_completa():
    """Retorna analise completa de faturamento com IA"""
    try:
        resultado = gerar_analise_completa_faturamento()
        return jsonify(resultado)
    except Exception as e:
        traceback.print_exc()
        return jsonify({
            "sucesso": False,
            "erro": str(e),
            "detalhes": traceback.format_exc()
        }), 500


@ia_bp.route('/api/treinar-sistema', methods=['POST'])
def treinar_sistema():
    """Treina o sistema de aprendizagem com os arquivos da pasta training_samples"""
    try:
        print("\n" + "="*60)
        print("INICIANDO TREINAMENTO DO SISTEMA")
        print("="*60)

        # Verificar se tabelas existem
        layout_learner.criar_tabelas()
        print("[OK] Tabelas do banco verificadas/criadas")

        # Treinar com Documentos
        print("\n[1/2] Treinando com Documentos...")
        print(f"    Diretório: {layout_learner.nfse_dir}")
        resultado_docs = layout_learner.treinar_com_diretorio(layout_learner.nfse_dir)
        print(f"    Resultado Docs: {resultado_docs}")

        # Treinar com Boletos
        print("\n[2/2] Treinando com Boletos...")
        print(f"    Diretório: {layout_learner.boleto_dir}")
        resultado_boletos = layout_learner.treinar_com_diretorio(layout_learner.boleto_dir)
        print(f"    Resultado Boletos: {resultado_boletos}")

        # Recarregar layouts
        layout_learner.carregar_layouts()
        print(f"[OK] Layouts recarregados: {len(layout_learner.layouts_conhecidos)} layouts em cache")

        print("\n" + "="*60)
        print("TREINAMENTO CONCLUÍDO!")
        print("="*60 + "\n")

        return jsonify({
            "success": True,
            "message": "Sistema treinado com sucesso!",
            "documentos": {
                "total_arquivos": resultado_docs.get('total_arquivos', 0),
                "processados": resultado_docs.get('processados', 0),
                "erros": resultado_docs.get('erros', 0),
                "layouts_novos": resultado_docs.get('layouts_novos', 0),
                "layouts_existentes": resultado_docs.get('layouts_existentes', 0)
            },
            "boletos": {
                "total_arquivos": resultado_boletos.get('total_arquivos', 0),
                "processados": resultado_boletos.get('processados', 0),
                "erros": resultado_boletos.get('erros', 0),
                "layouts_novos": resultado_boletos.get('layouts_novos', 0),
                "layouts_existentes": resultado_boletos.get('layouts_existentes', 0)
            }
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@ia_bp.route('/api/layouts-conhecidos', methods=['GET'])
def listar_layouts():
    """Lista todos os layouts aprendidos com detalhes"""
    try:
        conn = get_db()

        # Buscar layouts
        layouts = conn.execute("""
            SELECT id, tipo_doc, nome_layout, emissor, palavras_chave,
                   regex_patterns, posicoes_campos, confianca, num_amostras,
                   data_criacao, ultima_atualizacao
            FROM document_layouts
            ORDER BY tipo_doc, data_criacao DESC
        """).fetchall()

        # Buscar amostras de cada layout
        resultado = []
        for layout in layouts:
            layout_dict = dict(layout)

            # Buscar amostras deste layout
            amostras = conn.execute("""
                SELECT arquivo_nome, sucesso, data_adicao
                FROM training_samples
                WHERE layout_id = ?
                ORDER BY data_adicao DESC
            """, (layout['id'],)).fetchall()

            layout_dict['amostras'] = [dict(a) for a in amostras]

            # Parse JSON fields
            if layout_dict['palavras_chave']:
                try:
                    layout_dict['palavras_chave'] = json.loads(layout_dict['palavras_chave'])
                except (json.JSONDecodeError, TypeError):
                    pass  # Manter como string se nao for JSON valido
            if layout_dict['regex_patterns']:
                try:
                    layout_dict['regex_patterns'] = json.loads(layout_dict['regex_patterns'])
                except (json.JSONDecodeError, TypeError):
                    pass  # Manter como string se nao for JSON valido
            if layout_dict['posicoes_campos']:
                try:
                    layout_dict['posicoes_campos'] = json.loads(layout_dict['posicoes_campos'])
                except (json.JSONDecodeError, TypeError):
                    pass  # Manter como string se nao for JSON valido

            resultado.append(layout_dict)

        return jsonify({
            "success": True,
            "total_layouts": len(resultado),
            "layouts": resultado
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ==================== FUNCTIONS TO BE IMPORTED FROM APP ====================
# These functions are defined in app.py and need to be set via init or imported.
# They are used by the upload_pdf route.

extrair_dados_pdf = None
sugerir_tags_automaticas = None
adicionar_tag_documento = None


def init_upload_helpers(extract_pdf_fn, suggest_tags_fn, add_tag_fn):
    """Initialize helper functions that are defined in app.py"""
    global extrair_dados_pdf, sugerir_tags_automaticas, adicionar_tag_documento
    extrair_dados_pdf = extract_pdf_fn
    sugerir_tags_automaticas = suggest_tags_fn
    adicionar_tag_documento = add_tag_fn
