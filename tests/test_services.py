# -*- coding: utf-8 -*-
"""Tests for services modules."""
import pytest
from services.formatters import (
    formatar_cnpj, formatar_data, formatar_data_extenso,
    numero_por_extenso, converter_municipios_rapido,
    obter_nome_municipio, gerar_nome_arquivo
)
from services.cache import SimpleCache
from datetime import date, datetime


class TestFormatarCnpj:
    """Tests for CNPJ formatting."""

    def test_cnpj_valido_14_digitos(self):
        assert formatar_cnpj('12345678000190') == '12.345.678/0001-90'

    def test_cnpj_ja_formatado(self):
        assert formatar_cnpj('12.345.678/0001-90') == '12.345.678/0001-90'

    def test_cnpj_vazio(self):
        assert formatar_cnpj('') == ''

    def test_cnpj_none(self):
        assert formatar_cnpj(None) == ''

    def test_cnpj_incompleto(self):
        # CNPJ with less than 14 digits returns original
        assert formatar_cnpj('123456') == '123456'

    def test_cnpj_com_caracteres(self):
        assert formatar_cnpj('12.345.678/0001-90') == '12.345.678/0001-90'


class TestFormatarData:
    """Tests for date formatting."""

    def test_data_valida(self):
        data_obj, data_str = formatar_data('2025-01-15')
        assert data_str == '15/01/2025'
        assert data_obj == date(2025, 1, 15)

    def test_data_vazia(self):
        data_obj, data_str = formatar_data('')
        assert data_obj == date.today()

    def test_data_none(self):
        data_obj, data_str = formatar_data(None)
        assert data_obj == date.today()

    def test_data_invalida(self):
        data_obj, data_str = formatar_data('invalid')
        assert data_obj == date.today()


class TestFormatarDataExtenso:
    """Tests for long-form date formatting."""

    def test_data_extenso(self):
        data = date(2025, 12, 7)
        resultado = formatar_data_extenso(data)
        assert resultado == '07 de dezembro de 2025'

    def test_data_extenso_janeiro(self):
        data = date(2026, 1, 1)
        resultado = formatar_data_extenso(data)
        assert resultado == '01 de janeiro de 2026'


class TestNumeroPorExtenso:
    """Tests for currency to text conversion."""

    def test_zero(self):
        assert numero_por_extenso(0) == 'zero reais'

    def test_um_real(self):
        assert numero_por_extenso(1) == 'um real'

    def test_cem_reais(self):
        assert numero_por_extenso(100) == 'cem reais'

    def test_mil_reais(self):
        assert numero_por_extenso(1000) == 'mil reais'

    def test_com_centavos(self):
        resultado = numero_por_extenso(1.50)
        assert 'um real' in resultado
        assert 'cinquenta centavos' in resultado

    def test_valor_string(self):
        resultado = numero_por_extenso('R$ 250,00')
        assert 'duzentos e cinquenta reais' in resultado

    def test_valor_none(self):
        assert numero_por_extenso(None) == 'zero reais'

    def test_valor_invalido(self):
        assert numero_por_extenso('abc') == 'valor inválido'


class TestConverterMunicipios:
    """Tests for municipality code conversion."""

    def test_converter_codigo_4445(self):
        assert converter_municipios_rapido('4445') == 'Divinópolis'

    def test_converter_codigo_5300(self):
        assert converter_municipios_rapido('5300') == 'Belo Horizonte'

    def test_texto_sem_codigo(self):
        assert converter_municipios_rapido('São Paulo') == 'São Paulo'

    def test_texto_vazio(self):
        assert converter_municipios_rapido('') == ''

    def test_texto_none(self):
        assert converter_municipios_rapido(None) is None

    def test_obter_nome_municipio(self):
        assert obter_nome_municipio('4445') == 'Divinópolis'

    def test_obter_nome_municipio_desconhecido(self):
        assert obter_nome_municipio('9999') == '9999'

    def test_obter_nome_municipio_vazio(self):
        assert obter_nome_municipio('') == ''


class TestGerarNomeArquivo:
    """Tests for filename generation."""

    def test_nome_basico(self):
        data = datetime(2025, 6, 15)
        nome = gerar_nome_arquivo('Empresa ABC', data)
        assert nome == 'Empresa ABC - jun - 2025.docx'

    def test_nome_com_caracteres_especiais(self):
        data = datetime(2025, 12, 1)
        nome = gerar_nome_arquivo('Empresa/Filial', data)
        assert 'Empresa-Filial' in nome

    def test_nome_janeiro(self):
        data = datetime(2026, 1, 1)
        nome = gerar_nome_arquivo('Test', data)
        assert 'jan' in nome


class TestSimpleCache:
    """Tests for SimpleCache."""

    def test_set_and_get(self):
        cache = SimpleCache(ttl=60)
        cache.set('key1', 'value1')
        assert cache.get('key1') == 'value1'

    def test_cache_miss(self):
        cache = SimpleCache(ttl=60)
        assert cache.get('nonexistent') is None

    def test_cache_clear(self):
        cache = SimpleCache(ttl=60)
        cache.set('key1', 'value1')
        cache.set('key2', 'value2')
        cache.clear()
        assert cache.get('key1') is None
        assert cache.get('key2') is None

    def test_cache_invalidate_pattern(self):
        cache = SimpleCache(ttl=60)
        cache.set('tags_doc_1', 'v1')
        cache.set('tags_doc_2', 'v2')
        cache.set('other_key', 'v3')
        cache.invalidate('tags_doc')
        assert cache.get('tags_doc_1') is None
        assert cache.get('tags_doc_2') is None
        assert cache.get('other_key') == 'v3'

    def test_cache_expired(self):
        cache = SimpleCache(ttl=0)  # Expires immediately
        cache.set('key1', 'value1')
        import time
        time.sleep(0.01)
        assert cache.get('key1') is None
