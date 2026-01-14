#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MÓDULO DESATIVADO - Backend Java não será mais utilizado.

Este proxy foi desativado como parte da Fase 1 de refatoração.
A geração de documentos será feita 100% em Python usando:
- docxtpl para templates DOCX
- Fila assíncrona para processamento em background

Motivos da desativação:
1. Complexidade desnecessária (dual-stack Python/Java)
2. Overhead de comunicação HTTP entre processos
3. Dificuldade de deploy (duas aplicações)
4. Python já faz tudo que o Java fazia (POI-TL ~ docxtpl)

NOTA: Este arquivo mantém a interface original para compatibilidade,
mas todas as funções agora retornam erro informando a desativação.
"""

import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# =============================================================================
# CONSTANTES
# =============================================================================

JAVA_BACKEND_DISABLED = True
JAVA_BACKEND_URL = "http://localhost:8080/api"  # DESATIVADO

DEPRECATION_MESSAGE = """
[AVISO] Backend Java DESATIVADO.

A geração de documentos agora é feita 100% em Python.
Use as funções do módulo document_generator.py em vez deste proxy.

Se você está vendo esta mensagem, atualize seu código:
  - Antigo: java_proxy.gerar_laudo_via_java(data, tipo)
  - Novo:   document_generator.gerar_laudo(data, tipo)
"""


# =============================================================================
# EXCEÇÃO CUSTOMIZADA
# =============================================================================

class JavaBackendDisabledError(Exception):
    """Exceção levantada quando se tenta usar o backend Java desativado."""

    def __init__(self, message: str = DEPRECATION_MESSAGE):
        self.message = message
        super().__init__(self.message)


# =============================================================================
# CLASSE PROXY (DESATIVADA)
# =============================================================================

class JavaDocumentProxy:
    """
    DESATIVADO - Proxy para comunicação com o backend Java.

    Esta classe foi mantida para compatibilidade, mas todas as operações
    levantam JavaBackendDisabledError.
    """

    def __init__(self, base_url: str = JAVA_BACKEND_URL):
        self.base_url = base_url
        self.timeout = 30
        self._disabled = True
        logger.warning(DEPRECATION_MESSAGE)

    def _raise_disabled(self, operation: str):
        """Levanta erro informando que o backend está desativado."""
        msg = f"Operação '{operation}' não disponível: {DEPRECATION_MESSAGE}"
        logger.error(msg)
        raise JavaBackendDisabledError(msg)

    def _make_request(self, endpoint: str, data: Dict[str, Any],
                      params: Optional[Dict[str, Any]] = None):
        """DESATIVADO - Fazia requisição POST para o backend Java."""
        self._raise_disabled(f"POST {endpoint}")

    def gerar_laudo_completo(self, data: Dict[str, Any],
                             com_assinatura: bool = True,
                             registrar: bool = True) -> bytes:
        """DESATIVADO - Use document_generator.gerar_laudo_completo()"""
        self._raise_disabled("gerar_laudo_completo")

    def gerar_laudo_dedetizacao(self, data: Dict[str, Any],
                                 com_assinatura: bool = True,
                                 registrar: bool = True) -> bytes:
        """DESATIVADO - Use document_generator.gerar_laudo_dedetizacao()"""
        self._raise_disabled("gerar_laudo_dedetizacao")

    def gerar_laudo_caixa_agua(self, data: Dict[str, Any],
                               com_assinatura: bool = True,
                               registrar: bool = True) -> bytes:
        """DESATIVADO - Use document_generator.gerar_laudo_caixa_agua()"""
        self._raise_disabled("gerar_laudo_caixa_agua")

    def gerar_recibo(self, data: Dict[str, Any], registrar: bool = True) -> bytes:
        """DESATIVADO - Use document_generator.gerar_recibo()"""
        self._raise_disabled("gerar_recibo")

    def gerar_orcamento(self, data: Dict[str, Any], registrar: bool = True) -> bytes:
        """DESATIVADO - Use document_generator.gerar_orcamento()"""
        self._raise_disabled("gerar_orcamento")

    def check_health(self) -> bool:
        """
        Sempre retorna False - backend Java está desativado.

        Esta função é mantida para que código que verifica disponibilidade
        do Java antes de usar continue funcionando (vai para fallback Python).
        """
        return False


# =============================================================================
# INSTÂNCIA GLOBAL (DESATIVADA)
# =============================================================================

java_proxy = JavaDocumentProxy()


# =============================================================================
# FUNÇÕES AUXILIARES (DESATIVADAS)
# =============================================================================

def usar_java_backend() -> bool:
    """
    Sempre retorna False - backend Java está desativado.

    Código que chamava esta função para decidir qual backend usar
    vai automaticamente usar o fallback Python.
    """
    return False


def converter_dados_para_java(data: Dict[str, Any]) -> Dict[str, Any]:
    """DESATIVADO - Não há mais necessidade de conversão."""
    logger.warning("converter_dados_para_java() chamado mas backend Java está desativado")
    return data


def gerar_laudo_via_java(data: Dict[str, Any], tipo: str,
                         com_assinatura: bool = True) -> bytes:
    """
    DESATIVADO - Use document_generator.gerar_laudo()

    Raises:
        JavaBackendDisabledError: Sempre (backend desativado)
    """
    raise JavaBackendDisabledError(
        f"gerar_laudo_via_java(tipo={tipo}) não disponível.\n"
        "Use document_generator.gerar_laudo() em vez disso."
    )


def gerar_recibo_via_java(data: Dict[str, Any]) -> bytes:
    """
    DESATIVADO - Use document_generator.gerar_recibo()

    Raises:
        JavaBackendDisabledError: Sempre (backend desativado)
    """
    raise JavaBackendDisabledError(
        "gerar_recibo_via_java() não disponível.\n"
        "Use document_generator.gerar_recibo() em vez disso."
    )


def gerar_orcamento_via_java(data: Dict[str, Any]) -> bytes:
    """
    DESATIVADO - Use document_generator.gerar_orcamento()

    Raises:
        JavaBackendDisabledError: Sempre (backend desativado)
    """
    raise JavaBackendDisabledError(
        "gerar_orcamento_via_java() não disponível.\n"
        "Use document_generator.gerar_orcamento() em vez disso."
    )


# =============================================================================
# AVISO NO IMPORT
# =============================================================================

if __name__ != '__main__':
    logger.warning(
        "[java_proxy] Este módulo está DESATIVADO. "
        "Geração de documentos agora é 100% Python via document_generator.py"
    )
