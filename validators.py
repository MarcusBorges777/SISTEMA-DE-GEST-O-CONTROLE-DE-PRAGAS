#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Módulo de validação de dados de entrada para APIs.
Fornece funções e decoradores para validar dados antes de processá-los.
"""

import re
from functools import wraps
from flask import request, jsonify
from typing import Dict, List, Any, Optional, Callable


# ==================== VALIDADORES BÁSICOS ====================

def validar_cnpj(cnpj: str) -> bool:
    """
    Valida um CNPJ brasileiro.
    Aceita com ou sem formatação.
    """
    if not cnpj:
        return False

    # Remover caracteres não numéricos
    cnpj = re.sub(r'[^\d]', '', cnpj)

    if len(cnpj) != 14:
        return False

    # Verificar se todos os dígitos são iguais
    if cnpj == cnpj[0] * 14:
        return False

    # Cálculo do primeiro dígito verificador
    peso = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    soma = sum(int(cnpj[i]) * peso[i] for i in range(12))
    resto = soma % 11
    digito1 = 0 if resto < 2 else 11 - resto

    if int(cnpj[12]) != digito1:
        return False

    # Cálculo do segundo dígito verificador
    peso = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    soma = sum(int(cnpj[i]) * peso[i] for i in range(13))
    resto = soma % 11
    digito2 = 0 if resto < 2 else 11 - resto

    return int(cnpj[13]) == digito2


def validar_cpf(cpf: str) -> bool:
    """
    Valida um CPF brasileiro.
    Aceita com ou sem formatação.
    """
    if not cpf:
        return False

    # Remover caracteres não numéricos
    cpf = re.sub(r'[^\d]', '', cpf)

    if len(cpf) != 11:
        return False

    # Verificar se todos os dígitos são iguais
    if cpf == cpf[0] * 11:
        return False

    # Cálculo do primeiro dígito verificador
    soma = sum(int(cpf[i]) * (10 - i) for i in range(9))
    resto = soma % 11
    digito1 = 0 if resto < 2 else 11 - resto

    if int(cpf[9]) != digito1:
        return False

    # Cálculo do segundo dígito verificador
    soma = sum(int(cpf[i]) * (11 - i) for i in range(10))
    resto = soma % 11
    digito2 = 0 if resto < 2 else 11 - resto

    return int(cpf[10]) == digito2


def validar_email(email: str) -> bool:
    """Valida formato de email"""
    if not email:
        return False
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validar_telefone(telefone: str) -> bool:
    """Valida formato de telefone brasileiro"""
    if not telefone:
        return False
    # Remover caracteres não numéricos
    telefone = re.sub(r'[^\d]', '', telefone)
    # Aceitar 10 ou 11 dígitos (com DDD)
    return len(telefone) in [10, 11]


def validar_data(data: str, formato: str = '%Y-%m-%d') -> bool:
    """Valida formato de data"""
    if not data:
        return False
    from datetime import datetime
    try:
        datetime.strptime(data, formato)
        return True
    except ValueError:
        return False


def validar_valor_monetario(valor: Any) -> bool:
    """Valida se é um valor monetário válido"""
    if valor is None:
        return False
    try:
        if isinstance(valor, str):
            # Aceitar formato brasileiro (1.234,56) e americano (1234.56)
            valor = valor.replace('.', '').replace(',', '.')
        float(valor)
        return True
    except (ValueError, TypeError):
        return False


def sanitizar_string(texto: str, max_length: int = None) -> str:
    """Remove caracteres perigosos e limita tamanho"""
    if not texto:
        return ''
    # Remover tags HTML/scripts
    texto = re.sub(r'<[^>]+>', '', texto)
    # Remover caracteres de controle
    texto = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', texto)
    # Limitar tamanho
    if max_length:
        texto = texto[:max_length]
    return texto.strip()


# ==================== SCHEMAS DE VALIDAÇÃO ====================

class ValidationError(Exception):
    """Exceção para erros de validação"""
    def __init__(self, message: str, field: str = None):
        self.message = message
        self.field = field
        super().__init__(message)


class Schema:
    """Classe base para schemas de validação"""

    @classmethod
    def validate(cls, data: Dict) -> Dict:
        """Valida e retorna dados sanitizados"""
        raise NotImplementedError


class ClienteSchema(Schema):
    """Schema de validação para clientes"""

    CAMPOS_OBRIGATORIOS = ['nome_fantasia']
    CAMPOS_OPCIONAIS = [
        'razao_social', 'cnpj', 'cnae', 'rua', 'numero',
        'bairro', 'cidade', 'uf', 'telefone', 'data_garantia',
        'periodo_garantia_meses', 'id'
    ]

    @classmethod
    def validate(cls, data: Dict) -> Dict:
        erros = []
        resultado = {}

        # Validar campos obrigatórios
        for campo in cls.CAMPOS_OBRIGATORIOS:
            valor = data.get(campo, '').strip() if isinstance(data.get(campo), str) else data.get(campo)
            if not valor:
                erros.append(f"Campo '{campo}' é obrigatório")
            else:
                resultado[campo] = sanitizar_string(str(valor), 200)

        # Validar e sanitizar campos opcionais
        for campo in cls.CAMPOS_OPCIONAIS:
            valor = data.get(campo)
            if valor is not None:
                if campo == 'cnpj' and valor:
                    valor_limpo = re.sub(r'[^\d]', '', str(valor))
                    if valor_limpo and not validar_cnpj(valor_limpo):
                        erros.append(f"CNPJ inválido")
                    resultado[campo] = valor_limpo
                elif campo == 'telefone' and valor:
                    resultado[campo] = sanitizar_string(str(valor), 20)
                elif campo == 'data_garantia' and valor:
                    if not validar_data(valor):
                        erros.append(f"Data de garantia inválida (use YYYY-MM-DD)")
                    resultado[campo] = valor
                elif campo == 'periodo_garantia_meses' and valor:
                    try:
                        resultado[campo] = int(valor)
                    except (ValueError, TypeError):
                        resultado[campo] = 12
                elif campo == 'id' and valor:
                    try:
                        resultado[campo] = int(valor)
                    except (ValueError, TypeError):
                        pass
                elif campo == 'uf' and valor:
                    resultado[campo] = sanitizar_string(str(valor), 2).upper()
                else:
                    resultado[campo] = sanitizar_string(str(valor), 200)

        if erros:
            raise ValidationError('; '.join(erros))

        return resultado


class BoletoSchema(Schema):
    """Schema de validação para boletos"""

    @classmethod
    def validate(cls, data: Dict) -> Dict:
        erros = []
        resultado = {}

        # Cliente (obrigatório)
        cliente = data.get('cliente_nome', '').strip()
        if not cliente:
            erros.append("Nome do cliente é obrigatório")
        resultado['cliente_nome'] = sanitizar_string(cliente, 200)

        # Valor (obrigatório)
        valor = data.get('valor')
        if not valor:
            erros.append("Valor é obrigatório")
        elif not validar_valor_monetario(valor):
            erros.append("Valor inválido")
        else:
            if isinstance(valor, str):
                valor = valor.replace('.', '').replace(',', '.')
            resultado['valor'] = float(valor)

        # Data de vencimento (obrigatório)
        data_vencimento = data.get('data_vencimento')
        if not data_vencimento:
            erros.append("Data de vencimento é obrigatória")
        elif not validar_data(data_vencimento):
            erros.append("Data de vencimento inválida")
        resultado['data_vencimento'] = data_vencimento

        # Campos opcionais
        resultado['descricao'] = sanitizar_string(data.get('descricao', ''), 500)
        resultado['numero_documento'] = sanitizar_string(data.get('numero_documento', ''), 50)
        resultado['codigo_barras'] = sanitizar_string(data.get('codigo_barras', ''), 100)
        resultado['observacoes'] = sanitizar_string(data.get('observacoes', ''), 1000)

        if erros:
            raise ValidationError('; '.join(erros))

        return resultado


# ==================== DECORADORES ====================

def validate_json(schema: type = None, required_fields: List[str] = None):
    """
    Decorador para validar dados JSON de requisições.

    Uso:
        @app.route('/api/clientes', methods=['POST'])
        @validate_json(schema=ClienteSchema)
        def criar_cliente():
            dados = request.validated_data  # Dados já validados
            ...
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            # Verificar se tem JSON
            if not request.is_json:
                return jsonify({"error": "Content-Type deve ser application/json"}), 400

            data = request.get_json(silent=True)
            if data is None:
                return jsonify({"error": "JSON inválido"}), 400

            # Validar campos obrigatórios simples
            if required_fields:
                for field in required_fields:
                    if field not in data or not data[field]:
                        return jsonify({"error": f"Campo '{field}' é obrigatório"}), 400

            # Validar com schema se fornecido
            if schema:
                try:
                    validated_data = schema.validate(data)
                    request.validated_data = validated_data
                except ValidationError as e:
                    return jsonify({"error": str(e.message)}), 400

            return f(*args, **kwargs)
        return wrapper
    return decorator


def validate_query_params(params_config: Dict[str, Dict]):
    """
    Decorador para validar parâmetros de query string.

    Uso:
        @app.route('/api/items')
        @validate_query_params({
            'page': {'type': int, 'default': 1, 'min': 1},
            'per_page': {'type': int, 'default': 50, 'min': 1, 'max': 200}
        })
        def listar_items():
            page = request.validated_params['page']
            ...
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            validated = {}

            for param, config in params_config.items():
                value = request.args.get(param)
                param_type = config.get('type', str)
                default = config.get('default')

                if value is None:
                    validated[param] = default
                    continue

                try:
                    value = param_type(value)

                    # Validar min/max
                    if 'min' in config and value < config['min']:
                        value = config['min']
                    if 'max' in config and value > config['max']:
                        value = config['max']

                    validated[param] = value
                except (ValueError, TypeError):
                    validated[param] = default

            request.validated_params = validated
            return f(*args, **kwargs)
        return wrapper
    return decorator
