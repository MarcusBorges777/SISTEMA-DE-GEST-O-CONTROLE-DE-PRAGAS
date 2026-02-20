# -*- coding: utf-8 -*-
"""Tag Management Blueprint."""
import os
import json
import sqlite3
import hashlib
from flask import Blueprint, request, jsonify
from services.database import get_db
from services.cache import cache_tags

tags_bp = Blueprint('tags', __name__)


# ==================== HELPER FUNCTIONS ====================

def obter_todas_tags():
    """Retorna todas as tags cadastradas (com cache)"""
    cached = cache_tags.get("all_tags")
    if cached is not None:
        return cached

    db = get_db()
    cursor = db.execute('SELECT id, nome, descricao, cor FROM tags ORDER BY nome')
    tags = []
    for row in cursor.fetchall():
        tags.append({
            'id': row[0],
            'nome': row[1],
            'descricao': row[2],
            'cor': row[3]
        })

    cache_tags.set("all_tags", tags)
    return tags

def adicionar_tag_documento(arquivo_id, arquivo_tipo, tag_id, confianca=1.0, manual=True):
    """Adiciona uma tag a um documento"""
    db = get_db()
    try:
        db.execute('''INSERT INTO documento_tags
                     (arquivo_id, arquivo_tipo, tag_id, confianca, manual)
                     VALUES (?, ?, ?, ?, ?)''',
                  (arquivo_id, arquivo_tipo, tag_id, confianca, int(manual)))
        db.commit()
        # Invalidar cache
        cache_tags.invalidate(f"tags_{arquivo_tipo}_{arquivo_id}")
        return True
    except Exception as e:
        print(f"Erro ao adicionar tag: {e}")
        return False

def remover_tag_documento(arquivo_id, arquivo_tipo, tag_id):
    """Remove uma tag de um documento"""
    db = get_db()
    try:
        db.execute('''DELETE FROM documento_tags
                     WHERE arquivo_id = ? AND arquivo_tipo = ? AND tag_id = ?''',
                  (arquivo_id, arquivo_tipo, tag_id))
        db.commit()
        # Invalidar cache
        cache_tags.invalidate(f"tags_{arquivo_tipo}_{arquivo_id}")
        return True
    except Exception as e:
        print(f"Erro ao remover tag: {e}")
        return False

def obter_tags_documento(arquivo_id, arquivo_tipo):
    """Retorna todas as tags de um documento (com cache)"""
    cache_key = f"tags_{arquivo_tipo}_{arquivo_id}"
    cached = cache_tags.get(cache_key)
    if cached is not None:
        return cached

    db = get_db()
    cursor = db.execute('''
        SELECT t.id, t.nome, t.cor, dt.confianca, dt.manual
        FROM documento_tags dt
        JOIN tags t ON dt.tag_id = t.id
        WHERE dt.arquivo_id = ? AND dt.arquivo_tipo = ?
    ''', (arquivo_id, arquivo_tipo))

    tags = []
    for row in cursor.fetchall():
        tags.append({
            'id': row[0],
            'nome': row[1],
            'cor': row[2],
            'confianca': row[3],
            'manual': bool(row[4])
        })

    cache_tags.set(cache_key, tags)
    return tags

def extrair_features_documento(nome_arquivo, conteudo_texto=''):
    """Extrai features de um documento para classificação"""
    features = {
        'nome_lower': nome_arquivo.lower(),
        'extensao': os.path.splitext(nome_arquivo)[1].lower(),
        'tamanho_nome': len(nome_arquivo),
    }

    # Palavras-chave para cada tipo de documento
    keywords = {
        'laudo': ['laudo', 'técnico', 'vistoria', 'inspeção', 'diagnóstico'],
        'recibo': ['recibo', 'pagamento', 'recebi', 'valor'],
        'orcamento': ['orçamento', 'proposta', 'cotação', 'estimativa'],
        'contrato': ['contrato', 'termo', 'acordo', 'convênio'],
        'relatorio': ['relatório', 'report', 'análise', 'balanço']
    }

    # Verificar palavras-chave no nome do arquivo
    for tipo, palavras in keywords.items():
        features[f'tem_{tipo}_nome'] = any(palavra in features['nome_lower'] for palavra in palavras)

    # Se tiver conteúdo, verificar palavras-chave no texto
    if conteudo_texto:
        conteudo_lower = conteudo_texto.lower()
        for tipo, palavras in keywords.items():
            features[f'tem_{tipo}_conteudo'] = any(palavra in conteudo_lower for palavra in palavras)

    return features

def sugerir_tags_automaticas(arquivo_id, arquivo_tipo, nome_arquivo, conteudo_texto=''):
    """Sugere tags automaticamente baseado em análise do documento"""
    features = extrair_features_documento(nome_arquivo, conteudo_texto)
    tags_sugeridas = []

    # Mapeamento de features para tags
    mapeamento = {
        'Laudo': ['tem_laudo_nome', 'tem_laudo_conteudo'],
        'Recibo': ['tem_recibo_nome', 'tem_recibo_conteudo'],
        'Orçamento': ['tem_orcamento_nome', 'tem_orcamento_conteudo'],
        'Contrato': ['tem_contrato_nome', 'tem_contrato_conteudo'],
        'Relatório': ['tem_relatorio_nome', 'tem_relatorio_conteudo']
    }

    db = get_db()

    for tag_nome, feature_keys in mapeamento.items():
        # Verificar se alguma feature corresponde
        confianca = 0.0
        for key in feature_keys:
            if features.get(key, False):
                confianca += 0.5

        if confianca > 0:
            # Obter ID da tag
            cursor = db.execute('SELECT id FROM tags WHERE nome = ?', (tag_nome,))
            row = cursor.fetchone()
            if row:
                tags_sugeridas.append({
                    'tag_id': row[0],
                    'tag_nome': tag_nome,
                    'confianca': min(confianca, 1.0)
                })

    return tags_sugeridas

def salvar_dados_treinamento(nome_arquivo, conteudo_texto, tag_id):
    """Salva dados de treinamento para melhorar o modelo"""
    db = get_db()
    features = extrair_features_documento(nome_arquivo, conteudo_texto)
    features_json = json.dumps(features)

    try:
        db.execute('''INSERT INTO tag_training_data
                     (arquivo_nome, arquivo_conteudo, tag_id, features)
                     VALUES (?, ?, ?, ?)''',
                  (nome_arquivo, conteudo_texto[:1000], tag_id, features_json))
        db.commit()
        return True
    except Exception as e:
        print(f"Erro ao salvar dados de treinamento: {e}")
        return False


# ==================== ROUTES ====================

@tags_bp.route('/api/tags', methods=['GET', 'POST'])
def api_obter_tags():
    """Retorna todas as tags cadastradas (GET) ou cria nova tag (POST)"""
    if request.method == 'GET':
        try:
            tags = obter_todas_tags()
            return jsonify(tags)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    elif request.method == 'POST':
        try:
            dados = request.json
            nome = dados.get('nome', '').strip()
            descricao = dados.get('descricao', '').strip()
            cor = dados.get('cor', '#3B82F6')

            if not nome:
                return jsonify({"error": "Nome da tag é obrigatório"}), 400

            db = get_db()
            cursor = db.execute('INSERT INTO tags (nome, descricao, cor) VALUES (?, ?, ?)',
                              (nome, descricao, cor))
            db.commit()

            return jsonify({
                "success": True,
                "tag_id": cursor.lastrowid,
                "message": "Tag criada com sucesso"
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@tags_bp.route('/api/tags/documento', methods=['GET'])
def api_obter_tags_documento():
    """Retorna tags de um documento específico"""
    try:
        arquivo_id = request.args.get('arquivo_id', type=int)
        arquivo_tipo = request.args.get('arquivo_tipo', '')

        if not arquivo_id or not arquivo_tipo:
            return jsonify({"error": "arquivo_id e arquivo_tipo são obrigatórios"}), 400

        tags = obter_tags_documento(arquivo_id, arquivo_tipo)
        return jsonify(tags)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@tags_bp.route('/api/tags/adicionar', methods=['POST'])
def api_adicionar_tag():
    """Adiciona uma tag a um documento"""
    try:
        dados = request.json
        arquivo_id = dados.get('arquivo_id')
        arquivo_tipo = dados.get('arquivo_tipo')
        tag_id = dados.get('tag_id')
        confianca = dados.get('confianca', 1.0)
        manual = dados.get('manual', True)

        if not arquivo_id or not arquivo_tipo or not tag_id:
            return jsonify({"error": "arquivo_id, arquivo_tipo e tag_id são obrigatórios"}), 400

        sucesso = adicionar_tag_documento(arquivo_id, arquivo_tipo, tag_id, confianca, manual)

        if sucesso:
            return jsonify({"success": True, "message": "Tag adicionada com sucesso"})
        else:
            return jsonify({"error": "Erro ao adicionar tag"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@tags_bp.route('/api/tags/remover', methods=['POST'])
def api_remover_tag():
    """Remove uma tag de um documento"""
    try:
        dados = request.json
        arquivo_id = dados.get('arquivo_id')
        arquivo_tipo = dados.get('arquivo_tipo')
        tag_id = dados.get('tag_id')

        if not arquivo_id or not arquivo_tipo or not tag_id:
            return jsonify({"error": "arquivo_id, arquivo_tipo e tag_id são obrigatórios"}), 400

        sucesso = remover_tag_documento(arquivo_id, arquivo_tipo, tag_id)

        if sucesso:
            return jsonify({"success": True, "message": "Tag removida com sucesso"})
        else:
            return jsonify({"error": "Erro ao remover tag"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@tags_bp.route('/api/tags/sugerir', methods=['POST'])
def api_sugerir_tags():
    """Sugere tags automaticamente para um documento"""
    try:
        dados = request.json
        arquivo_id = dados.get('arquivo_id')
        arquivo_tipo = dados.get('arquivo_tipo')
        nome_arquivo = dados.get('nome_arquivo', '')
        conteudo_texto = dados.get('conteudo_texto', '')

        if not nome_arquivo:
            return jsonify({"error": "nome_arquivo é obrigatório"}), 400

        tags_sugeridas = sugerir_tags_automaticas(arquivo_id, arquivo_tipo, nome_arquivo, conteudo_texto)
        return jsonify(tags_sugeridas)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@tags_bp.route('/api/arquivo/tags', methods=['GET'])
def api_obter_tags_arquivo():
    """Retorna tags de um arquivo físico baseado no caminho"""
    try:
        caminho = request.args.get('caminho', '')

        if not caminho:
            return jsonify({"error": "Caminho do arquivo é obrigatório"}), 400

        # Usar hash do caminho como ID único
        arquivo_id = int(hashlib.md5(caminho.encode()).hexdigest()[:8], 16)
        arquivo_tipo = 'arquivo_fisico'

        tags = obter_tags_documento(arquivo_id, arquivo_tipo)
        return jsonify(tags)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@tags_bp.route('/api/arquivo/tag/adicionar', methods=['POST'])
def api_adicionar_tag_arquivo():
    """Adiciona uma tag a um arquivo físico"""
    try:
        dados = request.json
        caminho = dados.get('caminho', '')
        tag_id = dados.get('tag_id')

        if not caminho or not tag_id:
            return jsonify({"error": "Caminho e tag_id são obrigatórios"}), 400

        # Usar hash do caminho como ID único
        arquivo_id = int(hashlib.md5(caminho.encode()).hexdigest()[:8], 16)
        arquivo_tipo = 'arquivo_fisico'

        sucesso = adicionar_tag_documento(arquivo_id, arquivo_tipo, tag_id, confianca=1.0, manual=True)

        if sucesso:
            return jsonify({"success": True, "message": "Tag adicionada com sucesso"})
        else:
            return jsonify({"error": "Erro ao adicionar tag"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@tags_bp.route('/api/arquivo/tag/remover', methods=['POST'])
def api_remover_tag_arquivo():
    """Remove uma tag de um arquivo físico"""
    try:
        dados = request.json
        caminho = dados.get('caminho', '')
        tag_id = dados.get('tag_id')

        if not caminho or not tag_id:
            return jsonify({"error": "Caminho e tag_id são obrigatórios"}), 400

        # Usar hash do caminho como ID único
        arquivo_id = int(hashlib.md5(caminho.encode()).hexdigest()[:8], 16)
        arquivo_tipo = 'arquivo_fisico'

        sucesso = remover_tag_documento(arquivo_id, arquivo_tipo, tag_id)

        if sucesso:
            return jsonify({"success": True, "message": "Tag removida com sucesso"})
        else:
            return jsonify({"error": "Erro ao remover tag"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@tags_bp.route('/api/tags/criar', methods=['POST'])
def api_criar_tag():
    """Cria uma nova tag personalizada"""
    try:
        dados = request.json
        nome = dados.get('nome', '').strip()
        descricao = dados.get('descricao', '').strip()
        cor = dados.get('cor', '#3B82F6')

        if not nome:
            return jsonify({"error": "Nome da tag é obrigatório"}), 400

        db = get_db()
        cursor = db.execute('INSERT INTO tags (nome, descricao, cor) VALUES (?, ?, ?)',
                           (nome, descricao, cor))
        db.commit()

        return jsonify({
            "success": True,
            "message": "Tag criada com sucesso",
            "tag_id": cursor.lastrowid
        })
    except sqlite3.IntegrityError:
        return jsonify({"error": "Já existe uma tag com esse nome"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
