/**
 * Fetch wrapper centralizado para chamadas ao backend Flask.
 * Trata erros, JSON parsing e autenticacao automaticamente.
 */

const BASE = '';  // Mesmo domínio (Flask) ou proxy (Vite dev)

async function request(method, url, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${url}`, opts);

  // Redirect para login se nao autenticado
  if (res.status === 401 || res.status === 403) {
    window.location.href = '/login';
    throw new Error('Nao autenticado');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Erro ${res.status}`);
  }

  // Algumas respostas podem ser vazias
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  del: (url) => request('DELETE', url),
};

// === APIs Especificas do Dashboard ===

export async function fetchDashboardStats() {
  return api.get('/api/dashboard/stats');
}

export async function fetchAtividadesRecentes() {
  return api.get('/api/dashboard/atividades-recentes');
}

export async function fetchGarantiasVencendo() {
  return api.get('/api/garantias/vencimentos');
}

// === APIs de Clientes ===

export async function fetchClientes(filtros = {}) {
  const params = new URLSearchParams();
  if (filtros.nome) params.set('nome', filtros.nome);
  if (filtros.cidade) params.set('cidade', filtros.cidade);
  if (filtros.cnpj) params.set('cnpj', filtros.cnpj);
  const qs = params.toString();
  return api.get(`/api/clientes${qs ? `?${qs}` : ''}`);
}

export async function createCliente(data) {
  return api.post('/api/clientes', data);
}

export async function deleteCliente(id) {
  return api.del(`/api/clientes/${id}`);
}

// === APIs de Documentos ===

export async function fetchDocumentos() {
  return api.get('/api/documentos');
}

export async function fetchArquivos() {
  return api.get('/api/arquivos');
}

// === APIs de Boletos ===

export async function fetchBoletosVencendo() {
  return api.get('/api/boletos/vencendo');
}
