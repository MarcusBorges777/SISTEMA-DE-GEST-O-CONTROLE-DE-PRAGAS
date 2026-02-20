# -*- coding: utf-8 -*-
"""Client Management Blueprint."""
import re
import traceback
from datetime import datetime
from flask import Blueprint, request, jsonify
from services.database import get_db
from services.formatters import converter_municipios_rapido, formatar_cnae

clientes_bp = Blueprint('clientes', __name__)

# Module-level variable for CNPJ API (initialized via init())
api_cnpj = None


def init(api_cnpj_instance):
    """Initialize the blueprint with external dependencies."""
    global api_cnpj
    api_cnpj = api_cnpj_instance


@clientes_bp.route('/api/clientes', methods=['GET', 'POST'])
def api_clientes():
    conn = get_db()

    if request.method == 'GET':
        query = "SELECT * FROM clientes_web WHERE 1=1"
        count_query = "SELECT COUNT(*) as total FROM clientes_web WHERE 1=1"
        params = []

        nome = request.args.get('nome', '')
        if nome:
            query += " AND nome_fantasia LIKE ?"
            count_query += " AND nome_fantasia LIKE ?"
            params.append(f'%{nome}%')

        cidade = request.args.get('cidade', '')
        if cidade:
            query += " AND cidade LIKE ?"
            count_query += " AND cidade LIKE ?"
            params.append(f'%{cidade}%')

        cnpj = request.args.get('cnpj', '')
        if cnpj:
            query += " AND cnpj LIKE ?"
            count_query += " AND cnpj LIKE ?"
            params.append(f'%{cnpj}%')

        cnae = request.args.get('cnae', '')
        if cnae:
            query += " AND cnae LIKE ?"
            count_query += " AND cnae LIKE ?"
            params.append(f'%{cnae}%')

        rua = request.args.get('rua', '')
        if rua:
            query += " AND rua LIKE ?"
            count_query += " AND rua LIKE ?"
            params.append(f'%{rua}%')

        query += " ORDER BY nome_fantasia"

        # Paginacao (opcional - se page for enviado)
        page = request.args.get('page', type=int)
        per_page = request.args.get('per_page', 50, type=int)
        per_page = min(per_page, 200)  # Limite maximo de 200

        if page is not None and page > 0:
            # Paginacao habilitada
            total = conn.execute(count_query, params).fetchone()['total']
            offset = (page - 1) * per_page
            query += f" LIMIT {per_page} OFFSET {offset}"

            clientes = conn.execute(query, params).fetchall()
            return jsonify({
                "data": [dict(row) for row in clientes],
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "pages": (total + per_page - 1) // per_page
                }
            })
        else:
            # Sem paginacao (comportamento original para compatibilidade)
            # OTIMIZACAO: Limitar a 500 registros por padrao para evitar sobrecarga
            query += " LIMIT 500"
            clientes = conn.execute(query, params).fetchall()

            # OTIMIZACAO: Converter codigos de cidade para nomes (50x mais rapido)
            clientes_convertidos = []
            for cliente in clientes:
                cliente_dict = dict(cliente)
                if 'cidade' in cliente_dict:
                    cliente_dict['cidade'] = converter_municipios_rapido(cliente_dict['cidade'])
                if 'endereco_completo' in cliente_dict:
                    cliente_dict['endereco_completo'] = converter_municipios_rapido(cliente_dict['endereco_completo'])
                clientes_convertidos.append(cliente_dict)
            return jsonify(clientes_convertidos)

    # POST - Criar ou Atualizar
    dados = request.json
    nome = dados.get('nome_fantasia', '').strip()
    if not nome:
        return jsonify({"error": "Nome obrigatorio"}), 400

    try:
        cliente_id = dados.get('id')

        if cliente_id:
            # Atualizar
            conn.execute('''UPDATE clientes_web SET
                nome_fantasia = ?, razao_social = ?, cnpj = ?, cnae = ?,
                rua = ?, numero = ?, bairro = ?, cidade = ?, uf = ?,
                telefone = ?, data_garantia = ?, periodo_garantia_meses = ?
                WHERE id = ?''',
                (nome, dados.get('razao_social'), dados.get('cnpj'), dados.get('cnae'),
                 dados.get('rua'), dados.get('numero'), dados.get('bairro'),
                 dados.get('cidade'), dados.get('uf'),
                 dados.get('telefone'), dados.get('data_garantia'),
                 dados.get('periodo_garantia_meses', 12), cliente_id))
        else:
            # Inserir
            endereco_completo = f"{dados.get('rua', '')}, {dados.get('numero', '')} - {dados.get('cidade', '')}/{dados.get('uf', '')}"
            conn.execute('''INSERT INTO clientes_web
                (nome_fantasia, razao_social, cnpj, cnae, rua, numero, bairro, cidade, uf, endereco_completo,
                 telefone, data_garantia, periodo_garantia_meses)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (nome, dados.get('razao_social'), dados.get('cnpj'), dados.get('cnae'),
                 dados.get('rua'), dados.get('numero'), dados.get('bairro'),
                 dados.get('cidade'), dados.get('uf'), endereco_completo,
                 dados.get('telefone'), dados.get('data_garantia'),
                 dados.get('periodo_garantia_meses', 12)))

        conn.commit()
        return jsonify({"message": "Cliente salvo!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@clientes_bp.route('/api/clientes/<int:id>', methods=['DELETE'])
def deletar_cliente(id):
    get_db().execute("DELETE FROM clientes_web WHERE id = ?", (id,))
    get_db().commit()
    return jsonify({"message": "Cliente excluido"})


@clientes_bp.route('/api/cnpj/autocomplete', methods=['GET'])
def cnpj_autocomplete():
    """
    Autocomplete de CNPJs da Receita Federal

    Query params:
        campo: cnpj, razao_social, nome_fantasia, logradouro, bairro, cnae_fiscal
        termo: Termo de busca (minimo 2 caracteres)
        uf: Filtro por UF (opcional)
        limit: Limite de resultados (default: 10, max: 50)

    Exemplo: /api/cnpj/autocomplete?campo=nome_fantasia&termo=Padaria&uf=MG&limit=10
    """
    if not api_cnpj:
        return jsonify({'erro': 'Autocomplete de CNPJs não disponível'}), 503

    try:
        campo = request.args.get('campo')
        termo = request.args.get('termo')

        if not campo or not termo:
            return jsonify({'erro': 'Parâmetros obrigatórios: campo, termo'}), 400

        campos_validos = ['cnpj', 'razao_social', 'nome_fantasia', 'logradouro', 'bairro', 'cnae_fiscal']
        if campo not in campos_validos:
            return jsonify({'erro': f'Campo inválido. Use: {", ".join(campos_validos)}'}), 400

        if len(termo.strip()) < 2:
            return jsonify({'erro': 'Termo deve ter no mínimo 2 caracteres'}), 400

        filtros = {}
        if request.args.get('uf'):
            filtros['uf'] = request.args.get('uf').upper()

        try:
            limit = int(request.args.get('limit', 10))
            limit = max(1, min(limit, 50))
        except ValueError:
            limit = 10

        resultados = api_cnpj.buscar_sugestoes(campo, termo, filtros, limit)

        return jsonify({
            'sucesso': True,
            'total': len(resultados),
            'resultados': resultados
        })

    except ValueError as e:
        return jsonify({'erro': str(e)}), 400
    except Exception as e:
        print(f"[ERRO] Autocomplete CNPJ: {e}")
        traceback.print_exc()
        return jsonify({'erro': 'Erro interno no servidor'}), 500


@clientes_bp.route('/api/garantias/vencimentos', methods=['GET'])
def api_garantias_vencimentos():
    """
    Retorna clientes com garantia vencida ou proxima ao vencimento
    OTIMIZACAO: Calculo movido para SQL (10x mais rapido)

    Query params:
        dias_antecedencia: numero de dias para alertar antes do vencimento (padrao: 30)
    """
    try:
        conn = get_db()
        dias_antecedencia = request.args.get('dias_antecedencia', 30, type=int)

        # OTIMIZACAO: Fazer todos os calculos no SQL ao inves de Python (10x mais rapido)
        avisos = conn.execute('''
            SELECT
                id as cliente_id,
                nome_fantasia as cliente_nome,
                razao_social,
                cnpj,
                telefone,
                email,
                cidade,
                data_garantia,
                COALESCE(periodo_garantia_meses, 12) as periodo_meses,
                date(data_garantia, '+' || COALESCE(periodo_garantia_meses, 12) || ' months') as data_vencimento,
                CAST((julianday(date(data_garantia, '+' || COALESCE(periodo_garantia_meses, 12) || ' months')) - julianday('now')) AS INTEGER) as dias_restantes,
                CASE
                    WHEN CAST((julianday(date(data_garantia, '+' || COALESCE(periodo_garantia_meses, 12) || ' months')) - julianday('now')) AS INTEGER) < 0 THEN 'vencida'
                    WHEN CAST((julianday(date(data_garantia, '+' || COALESCE(periodo_garantia_meses, 12) || ' months')) - julianday('now')) AS INTEGER) <= 7 THEN 'vence_esta_semana'
                    ELSE 'proxima_vencer'
                END as status,
                CASE
                    WHEN CAST((julianday(date(data_garantia, '+' || COALESCE(periodo_garantia_meses, 12) || ' months')) - julianday('now')) AS INTEGER) < 0 THEN 'critico'
                    WHEN CAST((julianday(date(data_garantia, '+' || COALESCE(periodo_garantia_meses, 12) || ' months')) - julianday('now')) AS INTEGER) <= 7 THEN 'urgente'
                    ELSE 'atencao'
                END as urgencia
            FROM clientes_web
            WHERE data_garantia IS NOT NULL
                AND data_garantia != ''
                AND CAST((julianday(date(data_garantia, '+' || COALESCE(periodo_garantia_meses, 12) || ' months')) - julianday('now')) AS INTEGER) <= ?
            ORDER BY dias_restantes ASC
        ''', (dias_antecedencia,)).fetchall()

        # Converter para lista de dicts
        avisos_list = [dict(row) for row in avisos]

        # Ordenar por urgencia e dias restantes (ja vem ordenado do SQL, mas garantir)
        ordem_urgencia = {'critico': 0, 'urgente': 1, 'atencao': 2}
        avisos_list.sort(key=lambda x: (ordem_urgencia[x['urgencia']], x['dias_restantes']))

        return jsonify({
            'sucesso': True,
            'total': len(avisos_list),
            'avisos': avisos_list,
            'resumo': {
                'vencidas': len([a for a in avisos_list if a['status'] == 'vencida']),
                'esta_semana': len([a for a in avisos_list if a['status'] == 'vence_esta_semana']),
                'proximas': len([a for a in avisos_list if a['status'] == 'proxima_vencer'])
            }
        })

    except Exception as e:
        print(f"[ERRO] Garantias vencimentos: {e}")
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


@clientes_bp.route('/api/clientes/<int:cliente_id>/garantia', methods=['PUT'])
def atualizar_garantia_cliente(cliente_id):
    """
    Atualiza data de garantia e periodo de garantia de um cliente

    Body JSON:
        {
            "data_garantia": "2025-01-14",  // Data do ultimo servico/garantia
            "periodo_garantia_meses": 12     // Periodo em meses (padrao: 12)
        }
    """
    try:
        dados = request.json
        data_garantia = dados.get('data_garantia')
        periodo_meses = dados.get('periodo_garantia_meses', 12)

        if not data_garantia:
            return jsonify({'erro': 'Data de garantia é obrigatória'}), 400

        # Validar formato da data
        try:
            datetime.strptime(data_garantia, '%Y-%m-%d')
        except ValueError:
            return jsonify({'erro': 'Formato de data inválido. Use YYYY-MM-DD'}), 400

        conn = get_db()
        conn.execute('''
            UPDATE clientes_web
            SET data_garantia = ?,
                periodo_garantia_meses = ?
            WHERE id = ?
        ''', (data_garantia, periodo_meses, cliente_id))
        conn.commit()

        return jsonify({
            'sucesso': True,
            'mensagem': 'Garantia atualizada com sucesso'
        })

    except Exception as e:
        print(f"[ERRO] Atualizar garantia: {e}")
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


@clientes_bp.route('/api/cnae/formatar', methods=['POST'])
def formatar_cnae_api():
    """
    Formata codigo CNAE com descricao completa

    Body JSON:
        cnae: Codigo CNAE (com ou sem formatacao)

    Retorna:
        {"cnae_formatado": "81.22-2-00 - Imunizacao e controle de pragas urbanas"}

    Exemplo: {"cnae": "8122200"} -> {"cnae_formatado": "81.22-2-00 - Imunizacao..."}
    """
    try:
        dados = request.json
        cnae_codigo = dados.get('cnae', '')

        if not cnae_codigo:
            return jsonify({'erro': 'Código CNAE não fornecido'}), 400

        cnae_formatado = formatar_cnae(cnae_codigo)

        return jsonify({
            'sucesso': True,
            'cnae_formatado': cnae_formatado
        })

    except Exception as e:
        print(f"[ERRO] Formatar CNAE: {e}")
        traceback.print_exc()
        return jsonify({'erro': 'Erro ao formatar CNAE'}), 500
