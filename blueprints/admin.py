# -*- coding: utf-8 -*-
"""Database Admin and Configuration Blueprint."""
import json
import os
from pathlib import Path
from flask import Blueprint, request, jsonify
from services.database import get_db

admin_bp = Blueprint('admin', __name__)

# Will be set during init
BASE_DIR = None
CONFIG_FILE = None
MEDIA_DIR = None
OUTPUT_DIR = None

ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'svg', 'webp'}


def init(base_dir, config_file=None):
    """Initialize module-level variables for paths."""
    global BASE_DIR, CONFIG_FILE, MEDIA_DIR, OUTPUT_DIR
    BASE_DIR = Path(base_dir)
    CONFIG_FILE = config_file or str(BASE_DIR / 'config_tema.json')
    MEDIA_DIR = BASE_DIR / 'static' / 'media'
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR = BASE_DIR / 'output'


def allowed_image(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS


# ==================== DATABASE ADMIN ====================

@admin_bp.route('/api/database/tables', methods=['GET'])
def listar_tabelas():
    """Lista todas as tabelas do banco de dados"""
    try:
        conn = get_db()
        tabelas = conn.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        """).fetchall()

        resultado = []
        for tabela in tabelas:
            nome_tabela = tabela['name']
            # Contar registros
            count = conn.execute(f"SELECT COUNT(*) as total FROM {nome_tabela}").fetchone()['total']
            resultado.append({
                'nome': nome_tabela,
                'registros': count
            })

        return jsonify(resultado)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/api/database/table/<table_name>', methods=['GET'])
def listar_registros_tabela(table_name):
    """Lista todos os registros de uma tabela específica"""
    try:
        # Validar nome da tabela (segurança)
        tabelas_permitidas = ['clientes_web', 'documentos_gerados', 'boletos', 'recibos']
        if table_name not in tabelas_permitidas:
            return jsonify({"error": "Tabela não permitida"}), 403

        conn = get_db()
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)

        registros = conn.execute(f"SELECT * FROM {table_name} LIMIT ? OFFSET ?",
                                (limit, offset)).fetchall()

        # Pegar informações das colunas
        colunas_info = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
        colunas = [col['name'] for col in colunas_info]

        return jsonify({
            'colunas': colunas,
            'registros': [dict(row) for row in registros],
            'total': conn.execute(f"SELECT COUNT(*) as total FROM {table_name}").fetchone()['total']
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/api/database/table/<table_name>/record/<int:record_id>', methods=['PUT'])
def editar_registro(table_name, record_id):
    """Edita um registro específico"""
    try:
        tabelas_permitidas = ['clientes_web', 'documentos_gerados', 'boletos', 'recibos']
        if table_name not in tabelas_permitidas:
            return jsonify({"error": "Tabela não permitida"}), 403

        dados = request.json
        conn = get_db()

        # Construir UPDATE dinamicamente
        campos = [f"{k} = ?" for k in dados.keys() if k != 'id']
        valores = [v for k, v in dados.items() if k != 'id']
        valores.append(record_id)

        query = f"UPDATE {table_name} SET {', '.join(campos)} WHERE id = ?"
        conn.execute(query, valores)
        conn.commit()

        return jsonify({"message": "Registro atualizado com sucesso"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/api/database/table/<table_name>/record/<int:record_id>', methods=['DELETE'])
def deletar_registro(table_name, record_id):
    """Deleta um registro específico"""
    try:
        tabelas_permitidas = ['clientes_web', 'documentos_gerados', 'boletos', 'recibos']
        if table_name not in tabelas_permitidas:
            return jsonify({"error": "Tabela não permitida"}), 403

        conn = get_db()
        conn.execute(f"DELETE FROM {table_name} WHERE id = ?", (record_id,))
        conn.commit()

        return jsonify({"message": "Registro deletado com sucesso"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/api/database/table/<table_name>/clear', methods=['POST'])
def limpar_tabela(table_name):
    """Limpa todos os registros de uma tabela (mantém estrutura)"""
    try:
        tabelas_permitidas = ['clientes_web', 'documentos_gerados', 'boletos', 'recibos']
        if table_name not in tabelas_permitidas:
            return jsonify({"error": "Tabela não permitida"}), 403

        conn = get_db()
        conn.execute(f"DELETE FROM {table_name}")
        # Resetar autoincrement
        conn.execute(f"DELETE FROM sqlite_sequence WHERE name = '{table_name}'")
        conn.commit()

        return jsonify({"message": f"Tabela {table_name} limpa com sucesso"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/api/database/limpar-laudos', methods=['POST'])
def limpar_laudos():
    """Limpa apenas os laudos da tabela documentos_gerados"""
    try:
        conn = get_db()
        # Contar quantos serão deletados
        count = conn.execute("SELECT COUNT(*) as total FROM documentos_gerados WHERE tipo_doc = 'LAUDO'").fetchone()['total']

        # Deletar apenas laudos
        conn.execute("DELETE FROM documentos_gerados WHERE tipo_doc = 'LAUDO'")
        conn.commit()

        return jsonify({
            "message": f"Laudos limpos com sucesso",
            "deletados": count
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== CONFIGURAÇÕES DE TEMA ====================

@admin_bp.route('/api/config/tema', methods=['GET', 'POST'])
def config_tema():
    """Salva/carrega configurações de tema"""
    config_file = Path(CONFIG_FILE)

    if request.method == 'GET':
        if config_file.exists():
            with open(config_file, 'r', encoding='utf-8') as f:
                return jsonify(json.load(f))
        else:
            return jsonify({
                'modo': 'claro',
                'cor_primaria': '#4f46e5',
                'cor_secundaria': '#10b981',
                'cor_destaque': '#f59e0b'
            })

    else:  # POST
        try:
            dados = request.json
            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump(dados, f, ensure_ascii=False, indent=2)
            return jsonify({"message": "Tema salvo com sucesso"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500


# ==================== CONFIGURAÇÕES DE LOGO E MASCOTE ====================

@admin_bp.route('/api/config/logo-mascote', methods=['GET'])
def get_logo_mascote():
    """Retorna caminhos atuais da logo e mascote"""
    logo_path = ''
    mascote_path = ''

    for ext in ALLOWED_IMAGE_EXTENSIONS:
        if (MEDIA_DIR / f'logo.{ext}').exists():
            logo_path = f'/static/media/logo.{ext}'
            break
    for ext in ALLOWED_IMAGE_EXTENSIONS:
        if (MEDIA_DIR / f'mascote.{ext}').exists():
            mascote_path = f'/static/media/mascote.{ext}'
            break

    return jsonify({
        'logo': logo_path,
        'mascote': mascote_path
    })


@admin_bp.route('/api/config/upload-imagem', methods=['POST'])
def upload_imagem_config():
    """Upload de logo ou mascote da empresa"""
    try:
        tipo = request.form.get('tipo')  # 'logo' ou 'mascote'
        if tipo not in ('logo', 'mascote'):
            return jsonify({'erro': 'Tipo deve ser "logo" ou "mascote"'}), 400

        if 'arquivo' not in request.files:
            return jsonify({'erro': 'Nenhum arquivo enviado'}), 400

        arquivo = request.files['arquivo']
        if arquivo.filename == '':
            return jsonify({'erro': 'Nome de arquivo vazio'}), 400

        if not allowed_image(arquivo.filename):
            return jsonify({'erro': f'Formato não suportado. Use: {", ".join(ALLOWED_IMAGE_EXTENSIONS)}'}), 400

        ext = arquivo.filename.rsplit('.', 1)[1].lower()

        # Remover arquivos antigos do mesmo tipo
        for old_ext in ALLOWED_IMAGE_EXTENSIONS:
            old_file = MEDIA_DIR / f'{tipo}.{old_ext}'
            if old_file.exists():
                old_file.unlink()

        # Salvar novo arquivo
        nome_arquivo = f'{tipo}.{ext}'
        caminho = MEDIA_DIR / nome_arquivo
        arquivo.save(str(caminho))

        print(f"[OK] {tipo.capitalize()} salvo: {caminho}")

        return jsonify({
            'sucesso': True,
            'caminho': f'/static/media/{nome_arquivo}',
            'tipo': tipo
        })

    except Exception as e:
        print(f"[ERRO] Upload {tipo}: {e}")
        return jsonify({'erro': str(e)}), 500


@admin_bp.route('/api/config/remover-imagem', methods=['POST'])
def remover_imagem_config():
    """Remove logo ou mascote"""
    try:
        dados = request.json
        tipo = dados.get('tipo')
        if tipo not in ('logo', 'mascote'):
            return jsonify({'erro': 'Tipo deve ser "logo" ou "mascote"'}), 400

        removido = False
        for ext in ALLOWED_IMAGE_EXTENSIONS:
            arquivo = MEDIA_DIR / f'{tipo}.{ext}'
            if arquivo.exists():
                arquivo.unlink()
                removido = True

        return jsonify({
            'sucesso': True,
            'removido': removido
        })
    except Exception as e:
        return jsonify({'erro': str(e)}), 500
