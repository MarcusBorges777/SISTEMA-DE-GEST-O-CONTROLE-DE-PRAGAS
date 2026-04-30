#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Proxy Python para integração Flask -> Java Spring Boot
Redireciona requisições de geração de documentos para o backend Java
"""

import requests
import logging
import os
from flask import jsonify
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# URL base do backend Java
JAVA_BACKEND_URL = "http://localhost:8080/api"

class JavaDocumentProxy:
    """Proxy para comunicação com o backend Java"""

    def __init__(self, base_url: str = JAVA_BACKEND_URL):
        self.base_url = base_url
        self.timeout = 30  # 30 segundos de timeout

    def _make_request(self, endpoint: str, data: Dict[str, Any],
                     params: Optional[Dict[str, Any]] = None) -> requests.Response:
        """Faz requisição POST para o backend Java"""
        url = f"{self.base_url}{endpoint}"

        try:
            logger.info(f"Enviando requisição para Java: {url}")
            headers = {"Content-Type": "application/json"}
            internal_token = os.environ.get("JAVA_INTERNAL_TOKEN")
            if internal_token:
                headers["X-Internal-Token"] = internal_token

            response = requests.post(
                url,
                json=data,
                params=params or {},
                timeout=self.timeout,
                headers=headers
            )
            response.raise_for_status()
            return response
        except requests.exceptions.ConnectionError:
            logger.error(f"Erro: Backend Java não está disponível em {url}")
            raise Exception("Backend Java não está rodando. Inicie com: mvn spring-boot:run")
        except requests.exceptions.Timeout:
            logger.error(f"Timeout ao conectar com {url}")
            raise Exception("Timeout ao gerar documento no backend Java")
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro ao chamar backend Java: {e}")
            raise Exception(f"Erro ao gerar documento: {str(e)}")

    def gerar_laudo_completo(self, data: Dict[str, Any],
                            com_assinatura: bool = True,
                            registrar: bool = True) -> bytes:
        """Gera Laudo Completo via Java"""
        endpoint = "/documentos/laudo-completo"
        params = {
            "comAssinatura": str(com_assinatura).lower(),
            "registrar": str(registrar).lower()
        }

        response = self._make_request(endpoint, data, params)
        return response.content

    def gerar_laudo_dedetizacao(self, data: Dict[str, Any],
                                com_assinatura: bool = True,
                                registrar: bool = True) -> bytes:
        """Gera Laudo de Dedetização via Java"""
        endpoint = "/documentos/laudo-dedetizacao"
        params = {
            "comAssinatura": str(com_assinatura).lower(),
            "registrar": str(registrar).lower()
        }

        response = self._make_request(endpoint, data, params)
        return response.content

    def gerar_laudo_caixa_agua(self, data: Dict[str, Any],
                              com_assinatura: bool = True,
                              registrar: bool = True) -> bytes:
        """Gera Laudo de Caixa D'Água via Java"""
        endpoint = "/documentos/laudo-caixa-agua"
        params = {
            "comAssinatura": str(com_assinatura).lower(),
            "registrar": str(registrar).lower()
        }

        response = self._make_request(endpoint, data, params)
        return response.content

    def gerar_recibo(self, data: Dict[str, Any], registrar: bool = True) -> bytes:
        """Gera Recibo via Java"""
        endpoint = "/documentos/recibo"
        params = {"registrar": str(registrar).lower()}

        response = self._make_request(endpoint, data, params)
        return response.content

    def gerar_orcamento(self, data: Dict[str, Any], registrar: bool = True) -> bytes:
        """Gera Orçamento via Java"""
        endpoint = "/documentos/orcamento"
        params = {"registrar": str(registrar).lower()}

        response = self._make_request(endpoint, data, params)
        return response.content

    def check_health(self) -> bool:
        """Verifica se o backend Java está respondendo"""
        try:
            response = requests.get(
                f"{self.base_url}/actuator/health",
                timeout=5
            )
            return response.status_code == 200
        except:
            return False


# Instância global do proxy
java_proxy = JavaDocumentProxy()


def usar_java_backend() -> bool:
    """
    Verifica se deve usar o backend Java
    Retorna True se o Java estiver rodando, False caso contrário
    """
    return java_proxy.check_health()


def converter_dados_para_java(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Converte dados do formato Python/Flask para o formato esperado pelo Java
    """
    # O formato já está compatível, mas podemos fazer ajustes se necessário
    return data


def gerar_laudo_via_java(data: Dict[str, Any], tipo: str,
                        com_assinatura: bool = True) -> bytes:
    """
    Função auxiliar para gerar laudos via Java
    """
    data_java = converter_dados_para_java(data)

    if tipo == "completo":
        return java_proxy.gerar_laudo_completo(data_java, com_assinatura)
    elif tipo == "dedetizacao":
        return java_proxy.gerar_laudo_dedetizacao(data_java, com_assinatura)
    elif tipo == "caixa_agua":
        return java_proxy.gerar_laudo_caixa_agua(data_java, com_assinatura)
    else:
        raise ValueError(f"Tipo de laudo inválido: {tipo}")


def gerar_recibo_via_java(data: Dict[str, Any]) -> bytes:
    """Gera recibo via Java"""
    data_java = converter_dados_para_java(data)
    return java_proxy.gerar_recibo(data_java)


def gerar_orcamento_via_java(data: Dict[str, Any]) -> bytes:
    """Gera orçamento via Java"""
    data_java = converter_dados_para_java(data)
    return java_proxy.gerar_orcamento(data_java)
