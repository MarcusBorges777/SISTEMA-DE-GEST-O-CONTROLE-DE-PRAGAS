#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Utilitários centralizados do Sistema de Gestão.

Este módulo contém funções e constantes compartilhadas entre
diferentes partes do sistema para evitar duplicação de código.
"""

import re
from datetime import datetime, date
from typing import Optional, Any


# =============================================================================
# CONSTANTES DE MUNICÍPIOS
# =============================================================================

MUNICIPIOS = {
    '4445': 'Divinópolis',
    '5300': 'Belo Horizonte',
    '4123': 'Juiz de Fora',
    '5206': 'Uberlândia',
    '4503': 'Contagem',
}

# Pattern compilado para substituição eficiente
MUNICIPIOS_PATTERN = re.compile('|'.join(re.escape(codigo) for codigo in MUNICIPIOS.keys()))


def converter_municipios(texto: Optional[str]) -> Optional[str]:
    """
    Converte códigos de município para nomes em uma única passagem.

    Args:
        texto: String que pode conter códigos de município

    Returns:
        String com códigos substituídos por nomes, ou None se input for None
    """
    if not texto:
        return texto
    return MUNICIPIOS_PATTERN.sub(lambda m: MUNICIPIOS[m.group()], str(texto))


# =============================================================================
# VALIDADORES DE ENTRADA
# =============================================================================

def sanitizar_string(valor: Any, max_length: int = 500) -> str:
    """
    Sanitiza uma string removendo caracteres perigosos.

    Args:
        valor: Valor a ser sanitizado
        max_length: Tamanho máximo permitido

    Returns:
        String sanitizada
    """
    if valor is None:
        return ''
    texto = str(valor).strip()
    # Limita tamanho
    if len(texto) > max_length:
        texto = texto[:max_length]
    return texto


def validar_cnpj(cnpj: str) -> bool:
    """
    Valida formato básico de CNPJ (não verifica dígitos verificadores).

    Args:
        cnpj: CNPJ a validar

    Returns:
        True se formato válido
    """
    if not cnpj:
        return False
    # Remove caracteres não numéricos
    numeros = re.sub(r'\D', '', cnpj)
    return len(numeros) == 14


def validar_cpf(cpf: str) -> bool:
    """
    Valida formato básico de CPF (não verifica dígitos verificadores).

    Args:
        cpf: CPF a validar

    Returns:
        True se formato válido
    """
    if not cpf:
        return False
    # Remove caracteres não numéricos
    numeros = re.sub(r'\D', '', cpf)
    return len(numeros) == 11


def validar_email(email: str) -> bool:
    """
    Valida formato básico de email.

    Args:
        email: Email a validar

    Returns:
        True se formato válido
    """
    if not email:
        return False
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validar_telefone(telefone: str) -> bool:
    """
    Valida formato básico de telefone brasileiro.

    Args:
        telefone: Telefone a validar

    Returns:
        True se formato válido (10 ou 11 dígitos)
    """
    if not telefone:
        return False
    numeros = re.sub(r'\D', '', telefone)
    return len(numeros) in (10, 11)


# =============================================================================
# FORMATADORES
# =============================================================================

def formatar_cnpj(cnpj: str) -> str:
    """
    Formata CNPJ para exibição (XX.XXX.XXX/XXXX-XX).

    Args:
        cnpj: CNPJ a formatar

    Returns:
        CNPJ formatado ou string original se inválido
    """
    if not cnpj:
        return ''
    numeros = re.sub(r'\D', '', cnpj)
    if len(numeros) != 14:
        return cnpj
    return f'{numeros[:2]}.{numeros[2:5]}.{numeros[5:8]}/{numeros[8:12]}-{numeros[12:]}'


def formatar_cpf(cpf: str) -> str:
    """
    Formata CPF para exibição (XXX.XXX.XXX-XX).

    Args:
        cpf: CPF a formatar

    Returns:
        CPF formatado ou string original se inválido
    """
    if not cpf:
        return ''
    numeros = re.sub(r'\D', '', cpf)
    if len(numeros) != 11:
        return cpf
    return f'{numeros[:3]}.{numeros[3:6]}.{numeros[6:9]}-{numeros[9:]}'


def formatar_telefone(telefone: str) -> str:
    """
    Formata telefone para exibição.

    Args:
        telefone: Telefone a formatar

    Returns:
        Telefone formatado ou string original se inválido
    """
    if not telefone:
        return ''
    numeros = re.sub(r'\D', '', telefone)
    if len(numeros) == 11:
        return f'({numeros[:2]}) {numeros[2:7]}-{numeros[7:]}'
    elif len(numeros) == 10:
        return f'({numeros[:2]}) {numeros[2:6]}-{numeros[6:]}'
    return telefone


def formatar_moeda(valor: float, simbolo: str = 'R$') -> str:
    """
    Formata valor monetário no padrão brasileiro.

    Args:
        valor: Valor a formatar
        simbolo: Símbolo da moeda (default: R$)

    Returns:
        String formatada (ex: R$ 1.234,56)
    """
    if valor is None:
        valor = 0.0
    # Formata com 2 casas decimais
    formatado = f'{float(valor):,.2f}'
    # Converte para padrão brasileiro
    formatado = formatado.replace(',', '_').replace('.', ',').replace('_', '.')
    return f'{simbolo} {formatado}'


def formatar_data(data: Any, formato_saida: str = '%d/%m/%Y') -> Optional[str]:
    """
    Formata data para exibição.

    Args:
        data: Data (string, date ou datetime)
        formato_saida: Formato de saída (default: DD/MM/YYYY)

    Returns:
        Data formatada ou None se inválida
    """
    if not data:
        return None

    if isinstance(data, str):
        # Tenta parsear ISO format
        for fmt in ['%Y-%m-%d', '%Y-%m-%dT%H:%M:%S', '%d/%m/%Y']:
            try:
                data = datetime.strptime(data, fmt)
                break
            except ValueError:
                continue
        else:
            return data  # Retorna string original se não conseguir parsear

    if isinstance(data, datetime):
        return data.strftime(formato_saida)
    elif isinstance(data, date):
        return data.strftime(formato_saida)

    return str(data)


# =============================================================================
# UTILITÁRIOS DE LISTA/PAGINAÇÃO
# =============================================================================

def paginar_lista(items: list, page: int, per_page: int) -> dict:
    """
    Pagina uma lista de itens.

    Args:
        items: Lista de itens
        page: Número da página (1-indexed)
        per_page: Itens por página

    Returns:
        Dict com data, pagination info
    """
    total = len(items)
    pages = (total + per_page - 1) // per_page if per_page > 0 else 1

    page = max(1, min(page, pages))  # Limita página entre 1 e total
    start = (page - 1) * per_page
    end = start + per_page

    return {
        'data': items[start:end],
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'pages': pages
        }
    }


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    # Constantes
    'MUNICIPIOS',
    'MUNICIPIOS_PATTERN',
    # Funções de conversão
    'converter_municipios',
    # Validadores
    'sanitizar_string',
    'validar_cnpj',
    'validar_cpf',
    'validar_email',
    'validar_telefone',
    # Formatadores
    'formatar_cnpj',
    'formatar_cpf',
    'formatar_telefone',
    'formatar_moeda',
    'formatar_data',
    # Utilitários
    'paginar_lista',
]
