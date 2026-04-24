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
    "documentos": []
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
            self._write(dict(EMPTY_DB))

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

    def delete_documento_by_filename(self, nome_arquivo: str):
        """Remove document record whose nomeArquivo basename matches."""
        db = self.read()
        base = nome_arquivo.replace('\\', '/').split('/')[-1]
        db['documentos'] = [
            d for d in db['documentos']
            if d.get('nomeArquivo', '').replace('\\', '/').split('/')[-1] != base
        ]
        self._write(db)

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
