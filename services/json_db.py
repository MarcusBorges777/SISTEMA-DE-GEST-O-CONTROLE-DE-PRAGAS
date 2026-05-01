import json
import os
import re
import uuid
import secrets
import threading
from pathlib import Path
from datetime import datetime

_lock = threading.RLock()

EMPTY_DB = {
    "configuracoes": {
        "proximoLaudo": 1,
        "proximoOrcamento": 1,
        "proximoRecibo": 1
    },
    "clientes": [],
    "agenda": [],
    "documentos": [],
    "usuarios": [],
    "contatosGarantia": [],
    "contratos": []
}


def resolve_db_path(base_dir: Path) -> Path:
    config = base_dir / 'config_diretorios_duplos.json'
    if config.exists():
        try:
            cfg = json.loads(config.read_text(encoding='utf-8'))
            principal = cfg.get('principal', '')
            if principal and Path(principal).exists():
                return Path(principal) / 'db.json'
        except Exception:
            pass
    return base_dir / 'db.json'


def _cnpj_digits(cnpj: str) -> str:
    return re.sub(r'[^\d]', '', cnpj or '')


def _format_cnpj(cnpj: str) -> str:
    digits = _cnpj_digits(cnpj)
    if len(digits) == 14:
        return f'{digits[:2]}.{digits[2:5]}.{digits[5:8]}/{digits[8:12]}-{digits[12:14]}'
    return cnpj or ''


def _empty_db_copy() -> dict:
    return {k: (dict(v) if isinstance(v, dict) else list(v)) for k, v in EMPTY_DB.items()}


class JsonDbService:
    """
    LowDB-equivalent for Python: reads from disk on every call,
    writes immediately on every mutation. Thread-safe via a module-level lock.
    The db.json lives in the OneDrive folder so it syncs across PCs.
    """

    def __init__(self, path: Path):
        self.path = path
        if not path.exists():
            self._write(_empty_db_copy())
        self._seed_admin_if_empty()

    # ── Seed inicial de admin (se "usuarios" estiver vazia) ───────────────

    def _seed_admin_if_empty(self):
        try:
            from werkzeug.security import generate_password_hash
            db = self.read()
            if db.get('usuarios'):
                return
            now = datetime.utcnow().isoformat()
            temp_password = os.environ.get('INITIAL_ADMIN_PASSWORD') or secrets.token_urlsafe(18)
            db['usuarios'] = [{
                'id': str(uuid.uuid4()),
                'nome': 'Administrador',
                'email': 'admin@borges.com',
                'role': 'admin',
                'senhaHash': generate_password_hash(temp_password, method='pbkdf2:sha256'),
                'ativo': True,
                'trocarSenha': True,
                'criadoEm': now,
                'atualizadoEm': now,
                'ultimoLogin': None,
            }]
            self._write(db)
            print(f'[seed] Usuario admin@borges.com criado com senha temporaria: {temp_password}')
        except Exception as e:
            print(f'[seed] Falha ao criar admin: {e}')

    # ── Core I/O ──────────────────────────────────────────────────────────

    def read(self) -> dict:
        with _lock:
            return self._read_unlocked()

    def _write(self, data: dict):
        with _lock:
            self._write_unlocked(data)

    def _read_unlocked(self) -> dict:
        try:
            raw = self.path.read_text(encoding='utf-8')
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise RuntimeError(
                f'db.json invalido ou parcialmente sincronizado: {self.path}'
            ) from exc
        except FileNotFoundError:
            data = _empty_db_copy()
        except Exception as exc:
            raise RuntimeError(f'Falha ao ler db.json: {self.path}') from exc

        for key, value in EMPTY_DB.items():
            data.setdefault(key, dict(value) if isinstance(value, dict) else [])
        return data

    def _write_unlocked(self, data: dict):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = json.dumps(data, ensure_ascii=False, indent=2, default=str)
        tmp_path = self.path.with_name(f'.{self.path.name}.{uuid.uuid4().hex}.tmp')
        tmp_path.write_text(payload, encoding='utf-8')
        tmp_path.replace(self.path)

    def _mutate(self, mutator):
        with _lock:
            db = self._read_unlocked()
            result = mutator(db)
            self._write_unlocked(db)
            return result

    # ── Clientes ──────────────────────────────────────────────────────────

    def get_clientes(self, query: str = None) -> list:
        clientes = [c for c in self.read()['clientes'] if not c.get('deletado')]
        if query:
            q = query.lower().strip()
            q_digits = _cnpj_digits(q)
            def matches(c):
                text = (c.get('nome', '') + ' ' + c.get('fantasia', '')).lower()
                cnpj_d = _cnpj_digits(c.get('cnpj', ''))
                return q in text or (len(q_digits) >= 4 and q_digits in cnpj_d)
            clientes = [c for c in clientes if matches(c)]
        return sorted(clientes, key=lambda x: x.get('atualizadoEm', ''), reverse=True)

    def get_cliente_by_id(self, cliente_id: str) -> dict | None:
        return next((c for c in self.read()['clientes'] if c['id'] == cliente_id and not c.get('deletado')), None)

    def get_cliente_by_cnpj(self, cnpj: str) -> dict | None:
        digits = _cnpj_digits(cnpj)
        return next(
            (c for c in self.read()['clientes'] if not c.get('deletado') and _cnpj_digits(c.get('cnpj', '')) == digits),
            None
        )

    def upsert_cliente(self, data: dict) -> dict:
        def mutator(db):
            now = datetime.utcnow().isoformat()
            cnpj_digits = _cnpj_digits(data.get('cnpj', ''))
            cnpj_formatado = _format_cnpj(data.get('cnpj', ''))
            atividade_economica = data.get('atividadeEconomica') or data.get('atividade') or ''
            normalized_data = {**data, 'cnpj': cnpj_formatado, 'atividadeEconomica': atividade_economica, 'atividade': atividade_economica}
            idx = None
            for i, c in enumerate(db['clientes']):
                if normalized_data.get('id') and c['id'] == normalized_data['id']:
                    idx = i
                    break
                if cnpj_digits and _cnpj_digits(c.get('cnpj', '')) == cnpj_digits:
                    idx = i
                    break

            if idx is not None:
                existing = db['clientes'][idx]
                merged = {**existing, **normalized_data, 'deletado': False, 'atualizadoEm': now}
                merged['id'] = existing['id']
                merged['criadoEm'] = existing.get('criadoEm', now)
                db['clientes'][idx] = merged
                return merged

            entry = {
                'id': normalized_data.get('id') or str(uuid.uuid4()),
                'nome': normalized_data.get('nome', ''),
                'fantasia': normalized_data.get('fantasia', ''),
                'cnpj': normalized_data.get('cnpj', ''),
                'telefone': normalized_data.get('telefone', ''),
                'email': normalized_data.get('email', ''),
                'endereco': normalized_data.get('endereco', ''),
                'atividadeEconomica': normalized_data.get('atividadeEconomica', ''),
                'atividade': normalized_data.get('atividadeEconomica', ''),
                'deletado': False,
                'criadoEm': now,
                'atualizadoEm': now,
                **{k: v for k, v in normalized_data.items() if k not in (
                    'id', 'criadoEm', 'atualizadoEm'
                )},
            }
            db['clientes'].append(entry)
            return entry

        return self._mutate(mutator)

    def update_cliente(self, cliente_id: str, data: dict) -> dict | None:
        def mutator(db):
            idx = next((i for i, c in enumerate(db['clientes']) if c['id'] == cliente_id), None)
            if idx is None:
                return None
            atividade_economica = data.get('atividadeEconomica') or data.get('atividade') or db['clientes'][idx].get('atividadeEconomica') or db['clientes'][idx].get('atividade') or ''
            normalized_data = {
                **data,
                'cnpj': _format_cnpj(data.get('cnpj', db['clientes'][idx].get('cnpj', ''))),
                'atividadeEconomica': atividade_economica,
                'atividade': atividade_economica,
            }
            db['clientes'][idx] = {
                **db['clientes'][idx],
                **normalized_data,
                'id': cliente_id,
                'atualizadoEm': datetime.utcnow().isoformat()
            }
            return db['clientes'][idx]

        return self._mutate(mutator)

    def delete_cliente(self, cliente_id: str):
        def mutator(db):
            now = datetime.utcnow().isoformat()
            cliente = next((c for c in db['clientes'] if c.get('id') == cliente_id), None)
            if not cliente:
                return None
            cnpj_digits = _cnpj_digits(cliente.get('cnpj', ''))
            cliente['deletado'] = True
            cliente['deletadoEm'] = now
            cliente['atualizadoEm'] = now

            def linked(item):
                return (
                    item.get('clienteId') == cliente_id
                    or (cnpj_digits and _cnpj_digits(item.get('clienteCnpj', '')) == cnpj_digits)
                )

            for agendamento in db.get('agenda', []):
                if linked(agendamento):
                    agendamento['deletado'] = True
                    agendamento['deletadoEm'] = now
                    agendamento['clienteArquivado'] = True

            for documento in db.get('documentos', []):
                if linked(documento):
                    documento['clienteArquivado'] = True
                    documento['arquivadoEm'] = now

            for contrato in db.get('contratos', []):
                if linked(contrato):
                    contrato['ativo'] = False
                    contrato['clienteArquivado'] = True
                    contrato['atualizadoEm'] = now

            for contato in db.get('contatosGarantia', []):
                if cnpj_digits and _cnpj_digits(contato.get('clienteCnpj', '')) == cnpj_digits:
                    contato['clienteArquivado'] = True
            return cliente

        return self._mutate(mutator)

    # ── Agenda ────────────────────────────────────────────────────────────

    def get_agenda(self, cliente_id: str = None) -> list:
        items = [a for a in self.read()['agenda'] if not a.get('deletado')]
        if cliente_id:
            items = [a for a in items if a.get('clienteId') == cliente_id]
        return sorted(items, key=lambda x: (x.get('data', ''), x.get('hora', '')))

    def get_agendamento_by_id(self, ag_id: str) -> dict | None:
        return next((a for a in self.read()['agenda'] if a['id'] == ag_id), None)

    def upsert_agendamento(self, data: dict) -> dict:
        def mutator(db):
            now = datetime.utcnow().isoformat()
            idx = next((i for i, a in enumerate(db['agenda']) if a['id'] == data.get('id')), None)
            if idx is not None:
                db['agenda'][idx] = {**db['agenda'][idx], **data, 'deletado': False}
                return db['agenda'][idx]
            entry = {
                **data,
                'id': data.get('id') or str(uuid.uuid4()),
                'criadoEm': data.get('criadoEm') or now,
                'deletado': False,
            }
            db['agenda'].append(entry)
            return entry

        return self._mutate(mutator)

    def update_agendamento(self, ag_id: str, data: dict) -> dict | None:
        def mutator(db):
            idx = next((i for i, a in enumerate(db['agenda']) if a['id'] == ag_id), None)
            if idx is None:
                return None
            db['agenda'][idx] = {**db['agenda'][idx], **data, 'id': ag_id}
            return db['agenda'][idx]

        return self._mutate(mutator)

    def delete_agendamento(self, ag_id: str):
        def mutator(db):
            now = datetime.utcnow().isoformat()
            for agendamento in db['agenda']:
                if agendamento.get('id') == ag_id:
                    agendamento['deletado'] = True
                    agendamento['deletadoEm'] = now
                    return agendamento
            return None

        return self._mutate(mutator)

    def delete_serie_recorrente(self, recorrencia_id: str):
        def mutator(db):
            now = datetime.utcnow().isoformat()
            for agendamento in db['agenda']:
                if agendamento.get('recorrenciaId') == recorrencia_id or agendamento.get('id') == recorrencia_id:
                    agendamento['deletado'] = True
                    agendamento['deletadoEm'] = now

        return self._mutate(mutator)

    # ── Documentos ────────────────────────────────────────────────────────

    def registrar_documento(self, data: dict) -> dict:
        def mutator(db):
            entry = {
                **data,
                'id': data.get('id') or str(uuid.uuid4()),
                'dataCriacao': data.get('dataCriacao') or datetime.utcnow().isoformat(),
            }
            db['documentos'].append(entry)
            return entry

        return self._mutate(mutator)

    def get_documentos(self, cliente_id: str = None, tipo: str = None) -> list:
        docs = self.read()['documentos']
        if cliente_id:
            docs = [d for d in docs if d.get('clienteId') == cliente_id]
        if tipo:
            docs = [d for d in docs if d.get('tipo') == tipo]
        return sorted(docs, key=lambda x: x.get('dataCriacao', ''), reverse=True)

    def get_historico_cliente(self, cliente_id: str) -> list:
        """Returns Recibos and Orçamentos for a client, sorted most-recent first."""
        docs = [
            d for d in self.read()['documentos']
            if d.get('clienteId') == cliente_id
            and d.get('tipo') in ('recibo', 'orcamento')
            and d.get('valor') is not None
        ]
        return sorted(docs, key=lambda x: x.get('dataCriacao', ''), reverse=True)

    # ── Configurações (auto-increment counters) ───────────────────────────

    def proximo_numero(self, tipo: str) -> int:
        """Atomically reads and increments the document counter for tipo."""
        campo_map = {
            'laudo': 'proximoLaudo',
            'orcamento': 'proximoOrcamento',
            'recibo': 'proximoRecibo',
        }
        campo = campo_map.get(tipo)
        if not campo:
            return 1
        def mutator(db):
            atual = db['configuracoes'].get(campo, 1)
            db['configuracoes'][campo] = atual + 1
            return atual

        return self._mutate(mutator)

    def get_configuracoes(self) -> dict:
        return self.read()['configuracoes']

    # ── Usuários (auth + RBAC) ────────────────────────────────────────────

    def get_usuarios(self) -> list:
        """Retorna usuários sem o campo senhaHash (seguro p/ envio ao cliente)."""
        return [self._sanitize_user(u) for u in self.read().get('usuarios', [])]

    def get_usuario_by_id(self, user_id: str) -> dict | None:
        u = next((u for u in self.read().get('usuarios', []) if u['id'] == user_id), None)
        return self._sanitize_user(u) if u else None

    def get_usuario_raw_by_email(self, email: str) -> dict | None:
        """Inclui senhaHash — uso INTERNO apenas (validação de login)."""
        e = (email or '').strip().lower()
        return next(
            (u for u in self.read().get('usuarios', []) if (u.get('email', '').lower() == e)),
            None
        )

    def criar_usuario(self, data: dict) -> dict:
        from werkzeug.security import generate_password_hash

        def mutator(db):
            email = (data.get('email') or '').strip().lower()
            if not email or not data.get('nome') or not data.get('senha'):
                raise ValueError('nome, email e senha sao obrigatorios')
            if any((u.get('email', '').lower() == email) for u in db.get('usuarios', [])):
                raise ValueError('Ja existe um usuario com este email')
            role = data.get('role', 'atendimento')
            if role not in ('admin', 'atendimento', 'tecnico'):
                raise ValueError('role invalido')
            now = datetime.utcnow().isoformat()
            entry = {
                'id': str(uuid.uuid4()),
                'nome': data['nome'].strip(),
                'email': email,
                'role': role,
                'senhaHash': generate_password_hash(data['senha'], method='pbkdf2:sha256'),
                'ativo': bool(data.get('ativo', True)),
                'trocarSenha': bool(data.get('trocarSenha', False)),
                'criadoEm': now,
                'atualizadoEm': now,
                'ultimoLogin': None,
            }
            db.setdefault('usuarios', []).append(entry)
            return self._sanitize_user(entry)

        return self._mutate(mutator)

    def atualizar_usuario(self, user_id: str, data: dict) -> dict | None:
        from werkzeug.security import generate_password_hash

        def mutator(db):
            idx = next((i for i, u in enumerate(db.get('usuarios', [])) if u['id'] == user_id), None)
            if idx is None:
                return None
            atual = db['usuarios'][idx]
            atualizado = dict(atual)
            if 'nome' in data and data['nome']:
                atualizado['nome'] = data['nome'].strip()
            if 'email' in data and data['email']:
                novo_email = data['email'].strip().lower()
                if novo_email != atual.get('email', '').lower() and any(
                    (u.get('email', '').lower() == novo_email and u['id'] != user_id) for u in db['usuarios']
                ):
                    raise ValueError('Ja existe um usuario com este email')
                atualizado['email'] = novo_email
            if 'role' in data and data['role']:
                if data['role'] not in ('admin', 'atendimento', 'tecnico'):
                    raise ValueError('role invalido')
                atualizado['role'] = data['role']
            if 'ativo' in data:
                atualizado['ativo'] = bool(data['ativo'])
            if data.get('senha'):
                atualizado['senhaHash'] = generate_password_hash(data['senha'], method='pbkdf2:sha256')
                atualizado['trocarSenha'] = bool(data.get('trocarSenha', False))
            atualizado['atualizadoEm'] = datetime.utcnow().isoformat()
            db['usuarios'][idx] = atualizado
            return self._sanitize_user(atualizado)

        return self._mutate(mutator)

    def deletar_usuario(self, user_id: str):
        def mutator(db):
            db['usuarios'] = [u for u in db.get('usuarios', []) if u['id'] != user_id]

        return self._mutate(mutator)

    def registrar_ultimo_login(self, user_id: str):
        def mutator(db):
            idx = next((i for i, u in enumerate(db.get('usuarios', [])) if u['id'] == user_id), None)
            if idx is not None:
                db['usuarios'][idx]['ultimoLogin'] = datetime.utcnow().isoformat()

        return self._mutate(mutator)

    @staticmethod
    def _sanitize_user(u: dict) -> dict:
        if not u:
            return u
        return {k: v for k, v in u.items() if k != 'senhaHash'}
    # ── Contatos de Garantia (rastreabilidade do remarketing) ─────────────

    def registrar_contato_garantia(self, data: dict) -> dict:
        def mutator(db):
            entry = {
                'id': str(uuid.uuid4()),
                'laudoNumero': str(data.get('laudoNumero', '') or ''),
                'clienteCnpj': data.get('clienteCnpj', '') or '',
                'clienteNome': data.get('clienteNome', '') or '',
                'dataContato': datetime.utcnow().isoformat(),
                'usuario': data.get('usuario'),
                'observacao': data.get('observacao', '') or '',
            }
            db.setdefault('contatosGarantia', []).append(entry)
            return entry

        return self._mutate(mutator)

    def get_contatos_garantia(self, laudo_numero: str = None) -> list:
        items = self.read().get('contatosGarantia', [])
        if laudo_numero is not None:
            items = [c for c in items if str(c.get('laudoNumero', '')) == str(laudo_numero)]
        return sorted(items, key=lambda x: x.get('dataContato', ''), reverse=True)

    def deletar_contato_garantia(self, contato_id: str):
        def mutator(db):
            db['contatosGarantia'] = [c for c in db.get('contatosGarantia', []) if c.get('id') != contato_id]

        return self._mutate(mutator)

    # Contratos (clientes recorrentes)

    def get_contratos(self, ativos_apenas: bool = False) -> list:
        items = [c for c in self.read().get('contratos', []) if not c.get('deletado')]
        if ativos_apenas:
            items = [c for c in items if c.get('ativo', True)]
        return sorted(items, key=lambda x: x.get('atualizadoEm', ''), reverse=True)

    def get_contrato_by_id(self, contrato_id: str) -> dict | None:
        return next((c for c in self.read().get('contratos', []) if c.get('id') == contrato_id and not c.get('deletado')), None)

    def criar_contrato(self, data: dict) -> dict:
        if not (data.get('clienteNome') or data.get('clienteCnpj')):
            raise ValueError('clienteNome ou clienteCnpj obrigatorio')

        def mutator(db):
            now = datetime.utcnow().isoformat()
            entry = {
                'id': data.get('id') or str(uuid.uuid4()),
                'clienteId':       data.get('clienteId', ''),
                'clienteNome':     data.get('clienteNome', ''),
                'clienteFantasia': data.get('clienteFantasia', ''),
                'clienteCnpj':     data.get('clienteCnpj', ''),
                'clienteTelefone': data.get('clienteTelefone', ''),
                'clienteEndereco': data.get('clienteEndereco', ''),
                'dataInicio':      data.get('dataInicio', ''),
                'duracaoMeses':    int(data.get('duracaoMeses', 12)),
                'frequenciaMeses': int(data.get('frequenciaMeses', 1)),
                'diaPreferencial': int(data.get('diaPreferencial', 1) or 1),
                'horaPreferencial': data.get('horaPreferencial', '08:00'),
                'valorMensal':     float(data.get('valorMensal', 0) or 0),
                'pragas':          data.get('pragas', []) or [],
                'produtos':        data.get('produtos', []) or [],
                'garantiaMeses':   int(data.get('garantiaMeses', 1) or 1),
                'tecnico':         data.get('tecnico', ''),
                'observacoes':     data.get('observacoes', ''),
                'pasta':           data.get('pasta', ''),
                'ativo':           bool(data.get('ativo', True)),
                'deletado':        False,
                'criadoEm':        now,
                'atualizadoEm':    now,
                'criadoPor':       data.get('criadoPor'),
            }
            db.setdefault('contratos', []).append(entry)
            return entry

        return self._mutate(mutator)

    def atualizar_contrato(self, contrato_id: str, data: dict) -> dict | None:
        def mutator(db):
            idx = next((i for i, c in enumerate(db.get('contratos', [])) if c.get('id') == contrato_id), None)
            if idx is None:
                return None
            db['contratos'][idx] = {
                **db['contratos'][idx],
                **data,
                'id': contrato_id,
                'atualizadoEm': datetime.utcnow().isoformat()
            }
            return db['contratos'][idx]

        return self._mutate(mutator)

    def deletar_contrato(self, contrato_id: str):
        def mutator(db):
            now = datetime.utcnow().isoformat()
            for contrato in db.get('contratos', []):
                if contrato.get('id') == contrato_id:
                    contrato['ativo'] = False
                    contrato['deletado'] = True
                    contrato['deletadoEm'] = now
                    contrato['atualizadoEm'] = now
                    return contrato
            return None

        return self._mutate(mutator)



