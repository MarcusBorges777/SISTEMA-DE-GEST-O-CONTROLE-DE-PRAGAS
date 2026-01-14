"""
API de Autocomplete de Alta Performance para Busca de CNPJs
============================================================

Estratégias implementadas:
1. FTS5 para busca full-text em campos de texto livre
2. Índices tradicionais para campos estruturados
3. Tabelas de sugestões pré-calculadas
4. Queries parametrizadas com filtros dinâmicos
5. Limite de resultados para performance

Uso:
    from autocomplete_api import AutocompleteAPI

    api = AutocompleteAPI('cnpj_filtrado.db')
    resultados = api.buscar_sugestoes(
        campo='nome_fantasia',
        termo='Farmácia',
        filtros={'municipio': 'Divinópolis'}
    )
"""

import sqlite3
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import re


@dataclass
class FiltrosBusca:
    """Filtros para busca cascata"""
    municipio: Optional[str] = None
    uf: Optional[str] = None
    bairro: Optional[str] = None
    cnae_fiscal: Optional[str] = None
    situacao_cadastral: Optional[str] = "02"  # Default: Ativa


class AutocompleteAPI:
    """API de autocomplete com queries otimizadas"""

    def __init__(self, db_path: str):
        self.db_path = db_path

    def _get_connection(self) -> sqlite3.Connection:
        """Cria conexão com otimizações"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row

        # Otimizações SQLite para leitura
        conn.execute("PRAGMA query_only = ON")
        conn.execute("PRAGMA temp_store = MEMORY")
        conn.execute("PRAGMA cache_size = -64000")  # 64MB cache

        return conn


    def buscar_sugestoes(
        self,
        campo: str,
        termo: str,
        filtros: Optional[Dict[str, Any]] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Busca sugestões de autocomplete com filtros dinâmicos.

        Args:
            campo: Campo onde buscar ('cnpj', 'razao_social', 'nome_fantasia',
                   'logradouro', 'bairro', 'cnae_fiscal')
            termo: Termo de busca digitado pelo usuário
            filtros: Filtros adicionais (ex: {'uf': 'MG'})
            limit: Número máximo de resultados (default: 10, max: 50)

        Returns:
            Lista de dicionários com sugestões
        """
        if not termo or len(termo) < 2:
            return []

        limit = min(limit, 50)  # Máximo 50 resultados
        filtros = filtros or {}

        # Dispatch para query específica baseada no campo
        query_methods = {
            'cnpj': self._buscar_cnpj,
            'razao_social': self._buscar_razao_social,
            'nome_fantasia': self._buscar_nome_fantasia,
            'logradouro': self._buscar_logradouro,
            'bairro': self._buscar_bairro,
            'cnae_fiscal': self._buscar_cnae
        }

        method = query_methods.get(campo)
        if not method:
            raise ValueError(f"Campo '{campo}' não suportado")

        return method(termo, filtros, limit)


    def _buscar_cnpj(self, termo: str, filtros: Dict, limit: int) -> List[Dict]:
        """Busca por CNPJ (busca exata, otimizada com índice)"""
        conn = self._get_connection()

        # Remove caracteres não numéricos
        cnpj_limpo = re.sub(r'\D', '', termo)

        query = """
            SELECT DISTINCT
                e.cnpj,
                emp.razao_social,
                e.nome_fantasia,
                e.municipio,
                e.uf
            FROM estabelecimento e
            LEFT JOIN empresas emp ON e.cnpj_basico = emp.cnpj_basico
            WHERE e.cnpj LIKE ? || '%'
        """

        params = [cnpj_limpo]
        query, params = self._aplicar_filtros_cascata(query, params, filtros)
        query += f" LIMIT {limit}"

        cursor = conn.execute(query, params)
        resultados = [dict(row) for row in cursor.fetchall()]
        conn.close()

        return resultados


    def _buscar_razao_social(self, termo: str, filtros: Dict, limit: int) -> List[Dict]:
        """Busca em Razão Social usando FTS5"""
        conn = self._get_connection()

        # Prepara termo para FTS5 (busca por prefixo)
        termo_fts = self._preparar_termo_fts5(termo)

        # Query usando FTS5 com JOIN filtrado
        query = """
            SELECT DISTINCT
                e.cnpj,
                emp.razao_social,
                e.nome_fantasia,
                e.municipio,
                e.uf
            FROM fts_razao_social fts
            INNER JOIN empresas emp ON fts.cnpj_basico = emp.cnpj_basico
            INNER JOIN estabelecimento e ON emp.cnpj_basico = e.cnpj_basico
            WHERE fts.razao_social MATCH ?
        """

        params = [termo_fts]
        query, params = self._aplicar_filtros_cascata(query, params, filtros)
        query += f" LIMIT {limit}"

        cursor = conn.execute(query, params)
        resultados = [dict(row) for row in cursor.fetchall()]
        conn.close()

        return resultados


    def _buscar_nome_fantasia(self, termo: str, filtros: Dict, limit: int) -> List[Dict]:
        """Busca em Nome Fantasia usando FTS5"""
        conn = self._get_connection()

        termo_fts = self._preparar_termo_fts5(termo)

        query = """
            SELECT DISTINCT
                e.cnpj,
                emp.razao_social,
                e.nome_fantasia,
                e.municipio,
                e.uf,
                e.logradouro,
                e.bairro
            FROM fts_nome_fantasia fts
            INNER JOIN estabelecimento e ON fts.cnpj = e.cnpj
            LEFT JOIN empresas emp ON e.cnpj_basico = emp.cnpj_basico
            WHERE fts.nome_fantasia MATCH ?
        """

        params = [termo_fts]
        query, params = self._aplicar_filtros_cascata(query, params, filtros)
        query += f" LIMIT {limit}"

        cursor = conn.execute(query, params)
        resultados = [dict(row) for row in cursor.fetchall()]
        conn.close()

        return resultados


    def _buscar_logradouro(self, termo: str, filtros: Dict, limit: int) -> List[Dict]:
        """Busca em Logradouro usando FTS5"""
        conn = self._get_connection()

        termo_fts = self._preparar_termo_fts5(termo)

        query = """
            SELECT DISTINCT
                e.cnpj,
                emp.razao_social,
                e.nome_fantasia,
                e.logradouro,
                e.numero,
                e.bairro,
                e.municipio,
                e.uf
            FROM fts_logradouro fts
            INNER JOIN estabelecimento e ON fts.cnpj = e.cnpj
            LEFT JOIN empresas emp ON e.cnpj_basico = emp.cnpj_basico
            WHERE fts.logradouro MATCH ?
        """

        params = [termo_fts]
        query, params = self._aplicar_filtros_cascata(query, params, filtros)
        query += f" LIMIT {limit}"

        cursor = conn.execute(query, params)
        resultados = [dict(row) for row in cursor.fetchall()]
        conn.close()

        return resultados


    def _buscar_bairro(self, termo: str, filtros: Dict, limit: int) -> List[Dict]:
        """Busca em Bairro (usa tabela de sugestões se município fornecido)"""
        conn = self._get_connection()

        if filtros.get('municipio'):
            # Usa tabela pré-calculada para sugestões rápidas
            query = """
                SELECT DISTINCT
                    bairro,
                    municipio,
                    total_empresas
                FROM sugestoes_bairros
                WHERE bairro LIKE ? || '%'
                  AND municipio = ?
                ORDER BY total_empresas DESC
            """
            params = [termo, filtros['municipio']]
            query += f" LIMIT {limit}"

        else:
            # Busca direta na tabela principal
            query = """
                SELECT DISTINCT
                    e.bairro,
                    e.municipio,
                    COUNT(*) as total_empresas
                FROM estabelecimento e
                WHERE e.bairro LIKE ? || '%'
            """
            params = [termo]
            query, params = self._aplicar_filtros_cascata(query, params, filtros)
            query += f" GROUP BY e.bairro, e.municipio ORDER BY total_empresas DESC LIMIT {limit}"

        cursor = conn.execute(query, params)
        resultados = [dict(row) for row in cursor.fetchall()]
        conn.close()

        return resultados


    # MUNICIPIO REMOVIDO - O campo municipio no banco usa códigos, não nomes
    # def _buscar_municipio(self, termo: str, filtros: Dict, limit: int) -> List[Dict]:
    #     """Busca em Município (usa tabela de sugestões)"""
    #     conn = self._get_connection()
    #     termo_normalizado = self._normalizar_texto(termo)
    #     query = """
    #         SELECT municipio, uf, total_empresas
    #         FROM sugestoes_municipios
    #         WHERE municipio_normalized LIKE ? || '%'
    #     """
    #     params = [termo_normalizado]
    #     if filtros.get('uf'):
    #         query += " AND uf = ?"
    #         params.append(filtros['uf'])
    #     query += f" ORDER BY total_empresas DESC LIMIT {limit}"
    #     cursor = conn.execute(query, params)
    #     resultados = [dict(row) for row in cursor.fetchall()]
    #     conn.close()
    #     return resultados


    def _buscar_cnae(self, termo: str, filtros: Dict, limit: int) -> List[Dict]:
        """Busca em CNAE (busca exata por código)"""
        conn = self._get_connection()

        query = """
            SELECT
                cnae,
                descricao,
                total_empresas
            FROM sugestoes_cnaes
            WHERE cnae LIKE ? || '%'
            ORDER BY total_empresas DESC
        """

        params = [termo]
        query += f" LIMIT {limit}"

        cursor = conn.execute(query, params)
        resultados = [dict(row) for row in cursor.fetchall()]
        conn.close()

        return resultados


    def _aplicar_filtros_cascata(
        self,
        query: str,
        params: List,
        filtros: Dict
    ) -> tuple:
        """Aplica filtros cascata dinamicamente à query"""

        if filtros.get('situacao_cadastral'):
            query += " AND e.situacao_cadastral = ?"
            params.append(filtros['situacao_cadastral'])

        if filtros.get('municipio'):
            query += " AND e.municipio = ? COLLATE NOCASE"
            params.append(filtros['municipio'])

        if filtros.get('uf'):
            query += " AND e.uf = ?"
            params.append(filtros['uf'])

        if filtros.get('bairro'):
            query += " AND e.bairro = ? COLLATE NOCASE"
            params.append(filtros['bairro'])

        if filtros.get('cnae_fiscal'):
            query += " AND e.cnae_fiscal = ?"
            params.append(filtros['cnae_fiscal'])

        return query, params


    def _preparar_termo_fts5(self, termo: str) -> str:
        """
        Prepara termo para busca FTS5.
        Adiciona * para busca por prefixo.
        """
        # Remove caracteres especiais
        termo_limpo = re.sub(r'[^\w\s]', '', termo)

        # Divide em palavras e adiciona * no final de cada
        palavras = termo_limpo.split()
        if not palavras:
            return termo + '*'

        # Busca por prefixo: cada palavra com *
        return ' '.join([f'{palavra}*' for palavra in palavras])


    def _normalizar_texto(self, texto: str) -> str:
        """Remove acentos e normaliza texto para busca"""
        texto = texto.lower()

        # Remove acentos comuns
        mapa_acentos = {
            'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a',
            'é': 'e', 'ê': 'e',
            'í': 'i',
            'ó': 'o', 'ô': 'o', 'õ': 'o',
            'ú': 'u', 'ü': 'u',
            'ç': 'c'
        }

        for acentuado, sem_acento in mapa_acentos.items():
            texto = texto.replace(acentuado, sem_acento)

        return texto


# =====================================================================
# EXEMPLO DE USO EM API REST (Flask)
# =====================================================================

"""
from flask import Flask, request, jsonify
from autocomplete_api import AutocompleteAPI

app = Flask(__name__)
api = AutocompleteAPI('cnpj_filtrado.db')


@app.route('/api/autocomplete', methods=['GET'])
def autocomplete():
    '''
    Endpoint de autocomplete.

    Query params:
        campo: Campo de busca (obrigatório)
        termo: Termo digitado (obrigatório)
        municipio: Filtro por município (opcional)
        uf: Filtro por UF (opcional)
        bairro: Filtro por bairro (opcional)
        limit: Limite de resultados (opcional, default: 10)

    Exemplo:
        /api/autocomplete?campo=nome_fantasia&termo=Farm&municipio=Divinópolis&limit=10
    '''
    try:
        campo = request.args.get('campo')
        termo = request.args.get('termo')

        if not campo or not termo:
            return jsonify({'erro': 'Parâmetros campo e termo são obrigatórios'}), 400

        # Monta filtros
        filtros = {}
        if request.args.get('municipio'):
            filtros['municipio'] = request.args.get('municipio')
        if request.args.get('uf'):
            filtros['uf'] = request.args.get('uf')
        if request.args.get('bairro'):
            filtros['bairro'] = request.args.get('bairro')
        if request.args.get('cnae_fiscal'):
            filtros['cnae_fiscal'] = request.args.get('cnae_fiscal')

        limit = int(request.args.get('limit', 10))

        # Executa busca
        resultados = api.buscar_sugestoes(campo, termo, filtros, limit)

        return jsonify({
            'sucesso': True,
            'total': len(resultados),
            'resultados': resultados
        })

    except ValueError as e:
        return jsonify({'erro': str(e)}), 400
    except Exception as e:
        return jsonify({'erro': 'Erro interno no servidor'}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
"""
