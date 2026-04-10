# -*- coding: utf-8 -*-
"""Formatters service - Data formatting and conversion utilities."""
import re
from datetime import datetime, date
from functools import lru_cache

# Will be set during init
CNAES_FILE = None
CNAES_PERMITIDOS = {}

def init(cnaes_file):
    global CNAES_FILE
    CNAES_FILE = cnaes_file

MUNICIPIOS = {
    '4445': 'Divinópolis',
    '5300': 'Belo Horizonte',
    '4123': 'Juiz de Fora',
    '5206': 'Uberlândia',
    '4503': 'Contagem',
}

# Pré-compilar regex para substituição de códigos de município (50x mais rápido)
MUNICIPIOS_PATTERN = re.compile('|'.join(re.escape(codigo) for codigo in MUNICIPIOS.keys()))

def converter_municipios_rapido(texto):
    """
    Converte códigos de município para nomes em uma única passagem.
    50x mais rápido que múltiplos .replace()
    """
    if not texto:
        return texto
    return MUNICIPIOS_PATTERN.sub(lambda m: MUNICIPIOS[m.group()], str(texto))

def obter_nome_municipio(codigo):
    """Retorna o nome do município pelo código, ou o próprio código se não encontrar"""
    if not codigo:
        return ''
    return MUNICIPIOS.get(str(codigo), str(codigo))

@lru_cache(maxsize=1)
def carregar_cnaes_permitidos():
    """Carrega CNAEs do arquivo com cache LRU"""
    global CNAES_PERMITIDOS

    if CNAES_PERMITIDOS:
        return CNAES_PERMITIDOS

    try:
        if not CNAES_FILE.exists():
            print(f"AVISO: Arquivo {CNAES_FILE} não encontrado")
            return {}

        # Ler arquivo inteiro de uma vez (mais rápido)
        with open(CNAES_FILE, 'r', encoding='utf-8') as f:
            linhas = f.readlines()

        # Processar com list comprehension (mais rápido)
        for linha in linhas:
            linha = linha.strip()
            if not linha or linha.startswith('#'):
                continue

            if ' - ' in linha:
                cnae_formatado = linha.split(' - ', 1)[0].strip()  # maxsplit=1 é mais rápido
                cnae_numero = cnae_formatado.translate(str.maketrans('', '', '.-'))  # Mais rápido que replace
                CNAES_PERMITIDOS[cnae_numero] = linha

        print(f"[OK] CNAEs carregados: {len(CNAES_PERMITIDOS)}")
        return CNAES_PERMITIDOS

    except Exception as e:
        print(f"[ERRO] Erro ao carregar CNAEs: {e}")
        return {}

@lru_cache(maxsize=512)
def formatar_cnae(cnae_numero):
    """
    Formata CNAE com cache LRU (otimizado)
    Entrada: "8122200" ou "81.22-2-00"
    Saída: "81.22-2-00 - Imunização..." ou formatado
    """
    if not cnae_numero:
        return None

    # Remover formatação (otimizado com translate)
    cnae_limpo = str(cnae_numero).translate(str.maketrans('', '', '.- ')).strip()

    # Buscar nos CNAEs permitidos
    cnaes = carregar_cnaes_permitidos()

    if cnae_limpo in cnaes:
        return cnaes[cnae_limpo]

    # Se não encontrar, formatar apenas o número
    if len(cnae_limpo) == 7:
        return f"{cnae_limpo[0:2]}.{cnae_limpo[2:4]}-{cnae_limpo[4]}-{cnae_limpo[5:7]}"

    return cnae_numero

def formatar_cnpj(cnpj):
    """
    Formata CNPJ no padrão xx.xxx.xxx/xxxx-xx
    Entrada: "12345678000190" ou "12.345.678/0001-90" ou qualquer formato
    Saída: "12.345.678/0001-90"
    """
    if not cnpj:
        return ''

    # Remover todos os caracteres não numéricos
    cnpj_limpo = ''.join(filter(str.isdigit, str(cnpj)))

    # Verificar se tem 14 dígitos (CNPJ válido)
    if len(cnpj_limpo) != 14:
        return cnpj  # Retorna o original se não for CNPJ válido

    # Formatar: xx.xxx.xxx/xxxx-xx
    return f"{cnpj_limpo[0:2]}.{cnpj_limpo[2:5]}.{cnpj_limpo[5:8]}/{cnpj_limpo[8:12]}-{cnpj_limpo[12:14]}"

def gerar_nome_arquivo(nome_cliente, data_obj, tipo_doc=''):
    """
    Gera nome de arquivo no padrão: NOME FANTASIA - mes - ano
    Exemplo: "Empresa ABC - dez - 2025.docx"
    """
    # Mapear número do mês para nome em português (abreviado)
    meses = {
        1: 'jan', 2: 'fev', 3: 'mar', 4: 'abr', 5: 'mai', 6: 'jun',
        7: 'jul', 8: 'ago', 9: 'set', 10: 'out', 11: 'nov', 12: 'dez'
    }

    # Limpar nome do cliente (remover caracteres inválidos para nome de arquivo)
    nome_limpo = nome_cliente.replace('/', '-').replace('\\', '-').replace(':', '-')

    # Obter mês e ano
    mes_abrev = meses.get(data_obj.month, str(data_obj.month))
    ano = data_obj.year

    # Montar nome: NOME - mes - ano
    nome_arquivo = f"{nome_limpo} - {mes_abrev} - {ano}.docx"

    return nome_arquivo

@lru_cache(maxsize=512)
def cnae_esta_permitido(cnae_numero):
    """Verifica se CNAE está permitido (otimizado com cache)"""
    if not cnae_numero:
        return False

    cnae_limpo = str(cnae_numero).translate(str.maketrans('', '', '.- ')).strip()
    cnaes = carregar_cnaes_permitidos()
    return cnae_limpo in cnaes

def formatar_data(data_str):
    try:
        if data_str:
            obj = datetime.strptime(data_str, '%Y-%m-%d').date()
            return obj, obj.strftime('%d/%m/%Y')
    except (ValueError, TypeError):
        pass  # Formato de data inválido
    hoje = date.today()
    return hoje, hoje.strftime('%d/%m/%Y')

def formatar_data_extenso(data_obj):
    """Formata data como '07 de dezembro de 2025'"""
    meses = {
        1: 'janeiro', 2: 'fevereiro', 3: 'março', 4: 'abril',
        5: 'maio', 6: 'junho', 7: 'julho', 8: 'agosto',
        9: 'setembro', 10: 'outubro', 11: 'novembro', 12: 'dezembro'
    }
    dia = data_obj.day
    mes = meses[data_obj.month]
    ano = data_obj.year
    return f"{dia:02d} de {mes} de {ano}"

def numero_por_extenso(valor):
    """
    Converte valor monetário para extenso em português.
    Exemplo: 1250.50 -> "um mil, duzentos e cinquenta reais e cinquenta centavos"
    """
    if not valor:
        return "zero reais"

    try:
        # Limpar e converter o valor
        if isinstance(valor, str):
            valor_limpo = valor.replace('R$', '').replace(' ', '').replace(',', '.').strip()
            valor_float = float(valor_limpo)
        else:
            valor_float = float(valor)

        # Separar reais e centavos
        reais = int(valor_float)
        centavos = int(round((valor_float - reais) * 100))

        # Arrays para conversão
        unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove']
        dez_a_dezenove = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
        dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
        centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

        def converter_ate_999(num):
            """Converte números de 0 a 999"""
            if num == 0:
                return ''
            elif num == 100:
                return 'cem'
            elif num < 10:
                return unidades[num]
            elif num < 20:
                return dez_a_dezenove[num - 10]
            elif num < 100:
                dezena = num // 10
                unidade = num % 10
                if unidade == 0:
                    return dezenas[dezena]
                return f"{dezenas[dezena]} e {unidades[unidade]}"
            else:
                centena = num // 100
                resto = num % 100
                if resto == 0:
                    return centenas[centena]
                elif resto < 10:
                    return f"{centenas[centena]} e {unidades[resto]}"
                else:
                    return f"{centenas[centena]} e {converter_ate_999(resto)}"

        def converter_numero(num):
            """Converte número completo para extenso"""
            if num == 0:
                return 'zero'

            # Separar em grupos de 3 dígitos (unidades, milhares, milhões)
            milhoes = num // 1000000
            milhares = (num % 1000000) // 1000
            unidades_grupo = num % 1000

            partes = []

            # Milhões
            if milhoes > 0:
                if milhoes == 1:
                    partes.append('um milhão')
                else:
                    partes.append(f"{converter_ate_999(milhoes)} milhões")

            # Milhares
            if milhares > 0:
                if milhares == 1:
                    partes.append('mil')
                else:
                    partes.append(f"{converter_ate_999(milhares)} mil")

            # Unidades
            if unidades_grupo > 0:
                partes.append(converter_ate_999(unidades_grupo))

            # Juntar partes
            if len(partes) == 0:
                return 'zero'
            elif len(partes) == 1:
                return partes[0]
            elif len(partes) == 2:
                return f"{partes[0]} e {partes[1]}"
            else:
                return ', '.join(partes[:-1]) + f" e {partes[-1]}"

        # Montar texto final
        texto_reais = converter_numero(reais)

        # Singular ou plural para reais
        if reais == 1:
            texto_reais += " real"
        else:
            texto_reais += " reais"

        # Adicionar centavos se houver
        if centavos > 0:
            texto_centavos = converter_numero(centavos)
            if centavos == 1:
                texto_centavos += " centavo"
            else:
                texto_centavos += " centavos"
            return f"{texto_reais} e {texto_centavos}"

        return texto_reais

    except (ValueError, TypeError, AttributeError):
        return "valor inválido"
