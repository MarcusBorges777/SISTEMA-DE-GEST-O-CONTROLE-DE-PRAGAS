import json
import re
import uuid
import threading
from pathlib import Path
from datetime import datetime

_lock = threading.Lock()

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


class JsonDbService:
    """
    LowDB-equivalent for Python: reads from disk on every call,
    writes immediately on every mutation. Thread-safe via a module-level lock.
    The db.json lives in the OneDrive folder so it syncs across PCs.
    """

    def __init__(self, path: Path):
        self.path = path
        if not path.exists():
            self._write({k: (dict(v) if isinstance(v, dict) else list(v)) for k, v in EMPTY_DB.items()})
        self._seed_admin_if_empty()

    # ── Seed inicial de admin (se "usuarios" estiver vazia) ───────────────

    def _seed_admin_if_empty(self):
        try:
            from werkzeug.security import generate_password_hash
            db = self.read()
            if db.get('usuarios'):
                return
            now = datetime.utcnow().isoformat()
            db['usuarios'] = [{
                'id': str(uuid.uuid4()),
                'nome': 'Administrador',
                'email': 'admin@borges.com',
                'role': 'admin',
                'senhaHash': generate_password_hash('admin123', method='pbkdf2:sha256'),
                'ativo': True,
                'criadoEm': now,
                'atualizadoEm': now,
                'ultimoLogin': None,
            }]
            self._write(db)
            print('[seed] Usuário admin@borges.com criado em db.json (senha inicial: admin123)')
        except Exception as e:
            print(f'[seed] Falha ao criar admin: {e}')

    # ── Core I/O ──────────────────────────────────────────────────────────

    def read(self) -> dict:
        with _lock:
            try:
                raw = self.path.read_text(encoding='utf-8')
                data = json.loads(raw)
                # Ensure all collections exist (forward-compat)
                for key in EMPTY_DB:
                    data.setdefault(key, EMPTY_DB[key] if isinstance(EMPTY_DB[key], dict) else [])
                return data
            except Exception:
                return {k: (dict(v) if isinstance(v, dict) else list(v)) for k, v in EMPTY_DB.items()}

    def _write(self, data: dict):
        with _lock:
            self.path.write_text(
                json.dumps(data, ensure_ascii=False, indent=2, default=str),
                encoding='utf-8'
            )

    # ── Clientes ──────────────────────────────────────────────────────────

    def get_clientes(self, query: str = None) -> list:
        clientes = self.read()['clientes']
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
        return next((c for c in self.read()['clientes'] if c['id'] == cliente_id), None)

    def get_cliente_by_cnpj(self, cnpj: str) -> dict | None:
        digits = _cnpj_digits(cnpj)
        return next(
            (c for c in self.read()['clientes'] if _cnpj_digits(c.get('cnpj', '')) == digits),
            None
        )

    def upsert_cliente(self, data: dict) -> dict:
        db = self.read()
        now = datetime.utcnow().isoformat()

        # Find existing by id or CNPJ
        cnpj_digits = _cnpj_digits(data.get('cnpj', ''))
        idx = None
        for i, c in enumerate(db['clientes']):
            if data.get('id') and c['id'] == data['id']:
                idx = i
                break
            if cnpj_digits and _cnpj_digits(c.get('cnpj', '')) == cnpj_digits:
                idx = i
                break

        if idx is not None:
            existing = db['clientes'][idx]
            merged = {**existing, **data, 'atualizadoEm': now}
            # Preserve id and criadoEm
            merged['id'] = existing['id']
            merged['criadoEm'] = existing.get('criadoEm', now)
            db['clientes'][idx] = merged
            entry = merged
        else:
            entry = {
                'id': data.get('id') or str(uuid.uuid4()),
                'nome': data.get('nome', ''),
                'fantasia': data.get('fantasia', ''),
                'cnpj': data.get('cnpj', ''),
                'telefone': data.get('telefone', ''),
                'email': data.get('email', ''),
                'endereco': data.get('endereco', ''),
                'atividade': data.get('atividade', ''),
                'criadoEm': now,
                'atualizadoEm': now,
                **{k: v for k, v in data.items() if k not in (
                    'id', 'criadoEm', 'atualizadoEm'
                )},
            }
            db['clientes'].append(entry)

        self._write(db)
        return entry

    def update_cliente(self, cliente_id: str, data: dict) -> dict | None:
        db = self.read()
        idx = next((i for i, c in enumerate(db['clientes']) if c['id'] == cliente_id), None)
        if idx is None:
            return None
        db['clientes'][idx] = {
            **db['clientes'][idx],
            **data,
            'id': cliente_id,
            'atualizadoEm': datetime.utcnow().isoformat()
        }
        self._write(db)
        return db['clientes'][idx]

    def delete_cliente(self, cliente_id: str):
        db = self.read()
        db['clientes'] = [c for c in db['clientes'] if c['id'] != cliente_id]
        self._write(db)

    # ── Agenda ────────────────────────────────────────────────────────────

    def get_agenda(self, cliente_id: str = None) -> list:
        items = self.read()['agenda']
        if cliente_id:
            items = [a for a in items if a.get('clienteId') == cliente_id]
        return sorted(items, key=lambda x: (x.get('data', ''), x.get('hora', '')))

    def get_agendamento_by_id(self, ag_id: str) -> dict | None:
        return next((a for a in self.read()['agenda'] if a['id'] == ag_id), None)

    def upsert_agendamento(self, data: dict) -> dict:
        db = self.read()
        now = datetime.utcnow().isoformat()
        idx = next((i for i, a in enumerate(db['agenda']) if a['id'] == data.get('id')), None)
        if idx is not None:
            db['agenda'][idx] = {**db['agenda'][idx], **data}
            entry = db['agenda'][idx]
        else:
            entry = {
                **data,
                'id': data.get('id') or str(uuid.uuid4()),
                'criadoEm': data.get('criadoEm') or now,
            }
            db['agenda'].append(entry)
        self._write(db)
        return entry

    def update_agendamento(self, ag_id: str, data: dict) -> dict | None:
        db = self.read()
        idx = next((i for i, a in enumerate(db['agenda']) if a['id'] == ag_id), None)
        if idx is None:
            return None
        db['agenda'][idx] = {**db['agenda'][idx], **data, 'id': ag_id}
        self._write(db)
        return db['agenda'][idx]

    def delete_agendamento(self, ag_id: str):
        db = self.read()
        db['agenda'] = [a for a in db['agenda'] if a['id'] != ag_id]
        self._write(db)

    def delete_serie_recorrente(self, recorrencia_id: str):
        db = self.read()
        db['agenda'] = [
            a for a in db['agenda']
            if a.get('recorrenciaId') != recorrencia_id and a.get('id') != recorrencia_id
        ]
        self._write(db)

    # ── Documentos ────────────────────────────────────────────────────────

    def registrar_documento(self, data: dict) -> dict:
        db = self.read()
        entry = {
            **data,
            'id': data.get('id') or str(uuid.uuid4()),
            'dataCriacao': data.get('dataCriacao') or datetime.utcnow().isoformat(),
        }
        db['documentos'].append(entry)
        self._write(db)
        return entry

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
        db = self.read()
        atual = db['configuracoes'].get(campo, 1)
        db['configuracoes'][campo] = atual + 1
        self._write(db)
        return atual

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
        db = self.read()
        email = (data.get('email') or '').strip().lower()
        if not email or not data.get('nome') or not data.get('senha'):
            raise ValueError('nome, email e senha são obrigatórios')
        if any((u.get('email', '').lower() == email) for u in db.get('usuarios', [])):
            raise ValueError('Já existe um usuário com este email')
        role = data.get('role', 'atendimento')
        if role not in ('admin', 'atendimento', 'tecnico'):
            raise ValueError('role inválido')
        now = datetime.utcnow().isoformat()
        entry = {
            'id': str(uuid.uuid4()),
            'nome': data['nome'].strip(),
            'email': email,
            'role': role,
            'senhaHash': generate_password_hash(data['senha'], method='pbkdf2:sha256'),
            'ativo': bool(data.get('ativo', True)),
            'criadoEm': now,
            'atualizadoEm': now,
            'ultimoLogin': None,
        }
        db.setdefault('usuarios', []).append(entry)
        self._write(db)
        return self._sanitize_user(entry)

    def atualizar_usuario(self, user_id: str, data: dict) -> dict | None:
        from werkzeug.security import generate_password_hash
        db = self.read()
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
                raise ValueError('Já existe um usuário com este email')
            atualizado['email'] = novo_email
        if 'role' in data and data['role']:
            if data['role'] not in ('admin', 'atendimento', 'tecnico'):
                raise ValueError('role inválido')
            atualizado['role'] = data['role']
        if 'ativo' in data:
            atualizado['ativo'] = bool(data['ativo'])
        if data.get('senha'):
            atualizado['senhaHash'] = generate_password_hash(data['senha'], method='pbkdf2:sha256')
        atualizado['atualizadoEm'] = datetime.utcnow().isoformat()
        db['usuarios'][idx] = atualizado
        self._write(db)
        return self._sanitize_user(atualizado)

    def deletar_usuario(self, user_id: str):
        db = self.read()
        db['usuarios'] = [u for u in db.get('usuarios', []) if u['id'] != user_id]
        self._write(db)

    def registrar_ultimo_login(self, user_id: str):
        db = self.read()
        idx = next((i for i, u in enumerate(db.get('usuarios', [])) if u['id'] == user_id), None)
        if idx is not None:
            db['usuarios'][idx]['ultimoLogin'] = datetime.utcnow().isoformat()
            self._write(db)

    @staticmethod
    def _sanitize_user(u: dict) -> dict:
        if not u:
            return u
        return {k: v for k, v in u.items() if k != 'senhaHash'}

    # ── Contatos de Garantia (rastreabilidade do remarketing) ─────────────

    def registrar_contato_garantia(self, data: dict) -> dict:
        db = self.read()
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
        self._write(db)
        return entry

    def get_contatos_garantia(self, laudo_numero: str = None) -> list:
        items = self.read().get('contatosGarantia', [])
        if laudo_numero is not None:
            items = [c for c in items if str(c.get('laudoNumero', '')) == str(laudo_numero)]
        return sorted(items, key=lambda x: x.get('dataContato', ''), reverse=True)

    def deletar_contato_garantia(self, contato_id: str):
        db = self.read()
        db['contatosGarantia'] = [c for c in db.get('contatosGarantia', []) if c.get('id') != contato_id]
        self._write(db)

    # ── Contratos (clientes recorrentes) ──────────────────────────────────

    def get_contratos(self, ativos_apenas: bool = False) -> list:
        items = self.read().get('contratos', [])
        if ativos_apenas:
            items = [c for c in items if c.get('ativo', True)]
        return sorted(items, key=lambda x: x.get('atualizadoEm', ''), reverse=True)

    def get_contrato_by_id(self, contrato_id: str) -> dict | None:
        return next((c for c in self.read().get('contratos', []) if c.get('id') == contrato_id), None)

    def criar_contrato(self, data: dict) -> dict:
        if not (data.get('clienteNome') or data.get('clienteCnpj')):
            raise ValueError('clienteNome ou clienteCnpj obrigatório')
        db = self.read()
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
            'criadoEm':        now,
            'atualizadoEm':    now,
            'criadoPor':       data.get('criadoPor'),
        }
        db.setdefault('contratos', []).append(entry)
        self._write(db)
        return entry

    def atualizar_contrato(self, contrato_id: str, data: dict) -> dict | None:
        db = self.read()
        idx = next((i for i, c in enumerate(db.get('contratos', [])) if c.get('id') == contrato_id), None)
        if idx is None:
            return None
        db['contratos'][idx] = {
            **db['contratos'][idx],
            **data,
            'id': contrato_id,
            'atualizadoEm': datetime.utcnow().isoformat()
        }
        self._write(db)
        return db['contratos'][idx]

    def deletar_contrato(self, contrato_id: str):
        db = self.read()
        db['contratos'] = [c for c in db.get('contratos', []) if c.get('id') != contrato_id]
        self._write(db)
