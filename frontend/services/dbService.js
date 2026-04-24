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

  deleteByFilename: (filename) =>
    req(`${BASE}/documentos/por-arquivo/${encodeURIComponent(filename)}`, { method: 'DELETE' }),
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
