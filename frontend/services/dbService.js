const BASE = '/api/db';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function req(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ erro: res.statusText }));
    throw new Error(err.erro || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Clientes ──────────────────────────────────────────────────────────────

export const clienteApi = {
  getAll: (q = '') =>
    req(`${BASE}/clientes${q ? `?q=${encodeURIComponent(q)}` : ''}`),

  upsert: (data) =>
    req(`${BASE}/clientes`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    }),

  update: (id, data) =>
    req(`${BASE}/clientes/${id}`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    req(`${BASE}/clientes/${id}`, { method: 'DELETE' }),

  historico: (clienteId) =>
    req(`${BASE}/clientes/${clienteId}/historico`),
};

// ── Agenda ────────────────────────────────────────────────────────────────

export const agendaApi = {
  getAll: (clienteId = null) =>
    req(`${BASE}/agenda${clienteId ? `?clienteId=${clienteId}` : ''}`),

  upsert: (data) =>
    req(`${BASE}/agenda`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    }),

  update: (id, data) =>
    req(`${BASE}/agenda/${id}`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    req(`${BASE}/agenda/${id}`, { method: 'DELETE' }),

  deleteSerie: (recorrenciaId) =>
    req(`${BASE}/agenda/serie/${recorrenciaId}`, { method: 'DELETE' }),
};

// ── Documentos ────────────────────────────────────────────────────────────

export const documentoApi = {
  getAll: (clienteId = null, tipo = null) => {
    const params = new URLSearchParams();
    if (clienteId) params.set('clienteId', clienteId);
    if (tipo) params.set('tipo', tipo);
    const qs = params.toString();
    return req(`${BASE}/documentos${qs ? `?${qs}` : ''}`);
  },

  registrar: (data) =>
    req(`${BASE}/documentos`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    }),
};

// ── Contratos ─────────────────────────────────────────────────────────────

export const contratoApi = {
  getAll: (ativosApenas = false) =>
    req(`${BASE}/contratos${ativosApenas ? '?ativos=1' : ''}`),

  getById: (id) =>
    req(`${BASE}/contratos/${id}`),

  create: (data) =>
    req(`${BASE}/contratos`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    }),

  update: (id, data) =>
    req(`${BASE}/contratos/${id}`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    req(`${BASE}/contratos/${id}`, { method: 'DELETE' }),

  criarPasta: (id) =>
    fetch(`/api/contratos/${id}/criar-pasta`, { method: 'POST', credentials: 'same-origin' })
      .then(async r => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.erro || `HTTP ${r.status}`);
        }
        return r.json();
      }),
};

// ── Configurações ─────────────────────────────────────────────────────────

export const configApi = {
  get: () => req(`${BASE}/config`),

  proximoNumero: (tipo) =>
    req(`${BASE}/config/proximo-numero`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ tipo }),
    }),
};
