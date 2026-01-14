"""
Blueprint para gerenciamento de arquivos
- Upload de arquivos
- Compartilhamento
- Visualização
- Download
"""

from flask import Blueprint, request, jsonify, send_file, url_for
from werkzeug.utils import secure_filename
import os
import hashlib
import json
from datetime import datetime, timedelta
from pathlib import Path
import mimetypes

file_manager_bp = Blueprint('file_manager', __name__, url_prefix='/api')

# Configurações
UPLOAD_FOLDER = Path('uploads')
UPLOAD_FOLDER.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'txt', 'csv', 'json', 'xml',
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg',
    'zip', 'rar', '7z'
}

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

# Armazenamento em memória para links de compartilhamento
# Em produção, usar banco de dados
share_links = {}
uploaded_files = {}


def allowed_file(filename):
    """Verifica se a extensão do arquivo é permitida"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def get_file_type(filename):
    """Determina o tipo do arquivo"""
    mime_type, _ = mimetypes.guess_type(filename)
    if mime_type:
        if mime_type.startswith('image'):
            return 'image'
        elif mime_type.startswith('video'):
            return 'video'
        elif 'pdf' in mime_type:
            return 'pdf'
        elif 'spreadsheet' in mime_type or 'excel' in mime_type:
            return 'spreadsheet'
        elif 'word' in mime_type or 'document' in mime_type:
            return 'document'
        elif 'text' in mime_type:
            return 'text'
    return 'file'


def generate_file_id(filename):
    """Gera ID único para o arquivo"""
    timestamp = str(datetime.now().timestamp())
    return hashlib.md5(f"{filename}{timestamp}".encode()).hexdigest()


def generate_share_token():
    """Gera token único para compartilhamento"""
    return hashlib.md5(str(datetime.now().timestamp()).encode()).hexdigest()[:16]


@file_manager_bp.route('/upload', methods=['POST'])
def upload_file():
    """Upload de arquivo"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'Nenhum arquivo enviado'}), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({'success': False, 'message': 'Nome de arquivo vazio'}), 400

        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'message': f'Tipo de arquivo não permitido. Extensões aceitas: {", ".join(ALLOWED_EXTENSIONS)}'
            }), 400

        # Verificar tamanho do arquivo
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        if file_size > MAX_FILE_SIZE:
            return jsonify({
                'success': False,
                'message': f'Arquivo muito grande. Tamanho máximo: {MAX_FILE_SIZE // (1024*1024)}MB'
            }), 400

        # Salvar arquivo
        filename = secure_filename(file.filename)
        file_id = generate_file_id(filename)
        file_ext = filename.rsplit('.', 1)[1].lower()
        new_filename = f"{file_id}.{file_ext}"
        file_path = UPLOAD_FOLDER / new_filename

        file.save(str(file_path))

        # Registrar arquivo
        file_info = {
            'id': file_id,
            'original_name': filename,
            'stored_name': new_filename,
            'size': file_size,
            'type': get_file_type(filename),
            'mime_type': mimetypes.guess_type(filename)[0],
            'upload_date': datetime.now().isoformat(),
            'path': str(file_path)
        }

        uploaded_files[file_id] = file_info

        return jsonify({
            'success': True,
            'message': 'Arquivo enviado com sucesso',
            'fileId': file_id,
            'filename': filename,
            'size': file_size,
            'url': url_for('file_manager.download_file', file_id=file_id, _external=True)
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@file_manager_bp.route('/files/<file_id>', methods=['GET'])
def get_file_info(file_id):
    """Obter informações do arquivo"""
    if file_id not in uploaded_files:
        return jsonify({'success': False, 'message': 'Arquivo não encontrado'}), 404

    file_info = uploaded_files[file_id]
    return jsonify({
        'success': True,
        'file': {
            'id': file_info['id'],
            'name': file_info['original_name'],
            'size': file_info['size'],
            'type': file_info['type'],
            'date': file_info['upload_date'],
            'url': url_for('file_manager.download_file', file_id=file_id, _external=True)
        }
    })


@file_manager_bp.route('/files/<file_id>', methods=['DELETE'])
def delete_file(file_id):
    """Excluir arquivo"""
    try:
        if file_id not in uploaded_files:
            return jsonify({'success': False, 'message': 'Arquivo não encontrado'}), 404

        file_info = uploaded_files[file_id]
        file_path = Path(file_info['path'])

        # Excluir arquivo físico
        if file_path.exists():
            file_path.unlink()

        # Remover do registro
        del uploaded_files[file_id]

        # Remover links de compartilhamento associados
        tokens_to_remove = [token for token, info in share_links.items() if info['file_id'] == file_id]
        for token in tokens_to_remove:
            del share_links[token]

        return jsonify({
            'success': True,
            'message': 'Arquivo excluído com sucesso'
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@file_manager_bp.route('/files/recent', methods=['GET'])
def get_recent_files():
    """Listar arquivos recentes"""
    try:
        limit = request.args.get('limit', 10, type=int)

        # Ordenar por data de upload (mais recente primeiro)
        files_list = sorted(
            uploaded_files.values(),
            key=lambda x: x['upload_date'],
            reverse=True
        )[:limit]

        files_data = []
        for file_info in files_list:
            upload_date = datetime.fromisoformat(file_info['upload_date'])
            now = datetime.now()
            diff = now - upload_date

            if diff.days == 0:
                date_str = upload_date.strftime('Hoje às %H:%M')
            elif diff.days == 1:
                date_str = upload_date.strftime('Ontem às %H:%M')
            elif diff.days < 7:
                date_str = f"{diff.days} dias atrás"
            else:
                date_str = upload_date.strftime('%d/%m/%Y')

            files_data.append({
                'id': file_info['id'],
                'name': file_info['original_name'],
                'size': file_info['size'],
                'type': file_info['type'],
                'date': date_str,
                'url': url_for('file_manager.download_file', file_id=file_info['id'], _external=True)
            })

        # Calcular estatísticas de armazenamento
        total_size = sum(f['size'] for f in uploaded_files.values())
        storage_limit = 10 * 1024 * 1024 * 1024  # 10GB
        storage_used_percent = (total_size / storage_limit) * 100

        return jsonify({
            'success': True,
            'files': files_data,
            'storage': {
                'used': total_size,
                'limit': storage_limit,
                'percent': round(storage_used_percent, 2),
                'files_count': len(uploaded_files)
            }
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@file_manager_bp.route('/download/<file_id>', methods=['GET'])
def download_file(file_id):
    """Download de arquivo"""
    try:
        if file_id not in uploaded_files:
            return jsonify({'success': False, 'message': 'Arquivo não encontrado'}), 404

        file_info = uploaded_files[file_id]
        file_path = Path(file_info['path'])

        if not file_path.exists():
            return jsonify({'success': False, 'message': 'Arquivo físico não encontrado'}), 404

        return send_file(
            file_path,
            as_attachment=True,
            download_name=file_info['original_name'],
            mimetype=file_info['mime_type']
        )

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@file_manager_bp.route('/view/<file_id>', methods=['GET'])
def view_file(file_id):
    """Visualizar arquivo inline"""
    try:
        if file_id not in uploaded_files:
            return jsonify({'success': False, 'message': 'Arquivo não encontrado'}), 404

        file_info = uploaded_files[file_id]
        file_path = Path(file_info['path'])

        if not file_path.exists():
            return jsonify({'success': False, 'message': 'Arquivo físico não encontrado'}), 404

        return send_file(
            file_path,
            mimetype=file_info['mime_type']
        )

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@file_manager_bp.route('/share/create', methods=['POST'])
def create_share_link():
    """Criar link de compartilhamento"""
    try:
        data = request.get_json()
        file_id = data.get('fileId')

        if not file_id or file_id not in uploaded_files:
            return jsonify({'success': False, 'message': 'Arquivo não encontrado'}), 404

        # Verificar se já existe link ativo
        existing_token = None
        for token, info in share_links.items():
            if info['file_id'] == file_id and info['expires_at'] > datetime.now():
                existing_token = token
                break

        if existing_token:
            share_url = url_for('file_manager.shared_file', token=existing_token, _external=True)
            return jsonify({
                'success': True,
                'shareLink': share_url,
                'token': existing_token,
                'expiresAt': share_links[existing_token]['expires_at'].isoformat()
            })

        # Criar novo link
        token = generate_share_token()
        expires_at = datetime.now() + timedelta(days=7)  # Link válido por 7 dias

        share_links[token] = {
            'file_id': file_id,
            'created_at': datetime.now(),
            'expires_at': expires_at,
            'views': 0
        }

        share_url = url_for('file_manager.shared_file', token=token, _external=True)

        return jsonify({
            'success': True,
            'shareLink': share_url,
            'token': token,
            'expiresAt': expires_at.isoformat()
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@file_manager_bp.route('/share/<token>', methods=['GET'])
def shared_file(token):
    """Acessar arquivo compartilhado"""
    try:
        if token not in share_links:
            return jsonify({'success': False, 'message': 'Link inválido'}), 404

        share_info = share_links[token]

        # Verificar expiração
        if share_info['expires_at'] < datetime.now():
            return jsonify({'success': False, 'message': 'Link expirado'}), 410

        file_id = share_info['file_id']

        if file_id not in uploaded_files:
            return jsonify({'success': False, 'message': 'Arquivo não encontrado'}), 404

        # Incrementar contador de visualizações
        share_links[token]['views'] += 1

        file_info = uploaded_files[file_id]
        file_path = Path(file_info['path'])

        if not file_path.exists():
            return jsonify({'success': False, 'message': 'Arquivo físico não encontrado'}), 404

        # Retornar arquivo
        return send_file(
            file_path,
            as_attachment=request.args.get('download', 'false').lower() == 'true',
            download_name=file_info['original_name'],
            mimetype=file_info['mime_type']
        )

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@file_manager_bp.route('/share/<token>/info', methods=['GET'])
def share_info(token):
    """Informações do link de compartilhamento"""
    try:
        if token not in share_links:
            return jsonify({'success': False, 'message': 'Link inválido'}), 404

        share_info = share_links[token]
        file_info = uploaded_files[share_info['file_id']]

        return jsonify({
            'success': True,
            'share': {
                'token': token,
                'filename': file_info['original_name'],
                'size': file_info['size'],
                'type': file_info['type'],
                'created_at': share_info['created_at'].isoformat(),
                'expires_at': share_info['expires_at'].isoformat(),
                'views': share_info['views'],
                'is_expired': share_info['expires_at'] < datetime.now()
            }
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@file_manager_bp.route('/share/<token>', methods=['DELETE'])
def delete_share_link(token):
    """Excluir link de compartilhamento"""
    try:
        if token not in share_links:
            return jsonify({'success': False, 'message': 'Link não encontrado'}), 404

        del share_links[token]

        return jsonify({
            'success': True,
            'message': 'Link de compartilhamento removido'
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@file_manager_bp.route('/storage/stats', methods=['GET'])
def storage_stats():
    """Estatísticas de armazenamento"""
    try:
        total_size = sum(f['size'] for f in uploaded_files.values())
        storage_limit = 10 * 1024 * 1024 * 1024  # 10GB

        # Estatísticas por tipo
        types_stats = {}
        for file_info in uploaded_files.values():
            file_type = file_info['type']
            if file_type not in types_stats:
                types_stats[file_type] = {'count': 0, 'size': 0}
            types_stats[file_type]['count'] += 1
            types_stats[file_type]['size'] += file_info['size']

        return jsonify({
            'success': True,
            'storage': {
                'used': total_size,
                'limit': storage_limit,
                'available': storage_limit - total_size,
                'percent': round((total_size / storage_limit) * 100, 2),
                'files_count': len(uploaded_files),
                'by_type': types_stats
            }
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# Cleanup de arquivos antigos e links expirados
@file_manager_bp.route('/cleanup', methods=['POST'])
def cleanup():
    """Limpeza de arquivos antigos e links expirados"""
    try:
        removed_links = 0
        removed_files = 0

        # Remover links expirados
        expired_tokens = [
            token for token, info in share_links.items()
            if info['expires_at'] < datetime.now()
        ]
        for token in expired_tokens:
            del share_links[token]
            removed_links += 1

        # Remover arquivos muito antigos (opcional - descomentado se necessário)
        # cutoff_date = datetime.now() - timedelta(days=30)
        # old_files = [
        #     file_id for file_id, info in uploaded_files.items()
        #     if datetime.fromisoformat(info['upload_date']) < cutoff_date
        # ]
        # for file_id in old_files:
        #     file_info = uploaded_files[file_id]
        #     file_path = Path(file_info['path'])
        #     if file_path.exists():
        #         file_path.unlink()
        #     del uploaded_files[file_id]
        #     removed_files += 1

        return jsonify({
            'success': True,
            'message': 'Limpeza concluída',
            'removed': {
                'links': removed_links,
                'files': removed_files
            }
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
