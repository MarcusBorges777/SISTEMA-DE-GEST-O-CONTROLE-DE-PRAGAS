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

export async function updateCliente(id, data) {
  return api.put(`/api/clientes/${id}`, data);
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

// === APIs de Prospeccao ===

export async function fetchProspeccaoStats() {
  return api.get('/api/prospeccao/estatisticas');
}

export async function fetchProspeccaoSegmentos() {
  return api.get('/api/prospeccao/segmentos');
}

export async function fetchProspeccaoBuscaGlobal(params = {}) {
  const qs = new URLSearchParams();
  if (params.termo) qs.set('termo', params.termo);
  if (params.cnae) qs.set('cnae', params.cnae);
  if (params.bairro) qs.set('bairro', params.bairro);
  if (params.apenas_leads_frescos) qs.set('apenas_leads_frescos', '1');
  if (params.limite) qs.set('limite', params.limite);
  if (params.offset) qs.set('offset', params.offset);
  if (params.ordenacao) qs.set('ordenacao', params.ordenacao);
  const s = qs.toString();
  return api.get(`/api/prospeccao/busca-global${s ? `?${s}` : ''}`);
}

export async function fetchProspeccaoEmpresas(segmentoId, params = {}) {
  const qs = new URLSearchParams();
  if (params.limite) qs.set('limite', params.limite);
  if (params.offset) qs.set('offset', params.offset);
  if (params.termo) qs.set('termo', params.termo);
  const s = qs.toString();
  return api.get(`/api/prospeccao/empresas/${segmentoId}${s ? `?${s}` : ''}`);
}

// === APIs de Autocomplete CNPJ ===

export async function fetchCnpjAutocomplete(campo, termo, limit = 10) {
  const qs = new URLSearchParams({ campo, termo, limit });
  return api.get(`/api/cnpj/autocomplete?${qs.toString()}`);
}

// === APIs de Imagens da Empresa (Admin) ===

export async function fetchImagensEmpresa() {
  return api.get('/api/config/logo-mascote');
}

export async function uploadImagemEmpresa(tipo, arquivo) {
  const formData = new FormData();
  formData.append('tipo', tipo);
  formData.append('arquivo', arquivo);

  const res = await fetch('/api/config/upload-imagem', {
    method: 'POST',
    credentials: 'same-origin',
    body: formData, // NÃO usar Content-Type header — FormData define automaticamente
  });

  if (res.status === 401 || res.status === 403) {
    window.location.href = '/login';
    throw new Error('Nao autenticado');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Erro ${res.status}`);
  }
  return res.json();
}

export async function removerImagemEmpresa(tipo) {
  return api.post('/api/config/remover-imagem', { tipo });
}
