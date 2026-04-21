// Cache local de clientes usando localStorage
// Permite autocomplete por nome e preenchimento automatico

const CACHE_KEY = 'dedetizadora_clientes_cache';
const MAX_ENTRIES = 100;

/**
 * Obter todos os clientes do cache
 * @returns {Array} Lista de clientes ordenados por lastUsed (mais recente primeiro)
 */
export function getClientes() {
  try {
    const data = localStorage.getItem(CACHE_KEY);
    if (!data) return [];
    const clientes = JSON.parse(data);
    return clientes.sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed));
  } catch {
    return [];
  }
}

/**
 * Salvar/atualizar cliente no cache
 * @param {Object} cliente - { nome, fantasia, cnpj, endereco, atividade, email, telefone }
 */
export function saveCliente(cliente) {
  if (!cliente || !cliente.cnpj) return;

  const cnpjLimpo = cliente.cnpj.replace(/[^\d]/g, '');
  const clientes = getClientes();

  // Verificar se ja existe (por CNPJ)
  const existingIdx = clientes.findIndex(c =>
    c.cnpj && c.cnpj.replace(/[^\d]/g, '') === cnpjLimpo
  );

  const entry = {
    nome: cliente.nome || '',
    fantasia: cliente.fantasia || '',
    cnpj: cliente.cnpj || '',
    endereco: cliente.endereco || '',
    atividade: cliente.atividade || '',
    email: cliente.email || '',
    telefone: cliente.telefone || '',
    lastUsed: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    // Atualizar existente
    clientes[existingIdx] = entry;
  } else {
    // Adicionar novo
    clientes.unshift(entry);
  }

  // Limitar tamanho do cache
  const trimmed = clientes.slice(0, MAX_ENTRIES);

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
  } catch {
    console.warn('Falha ao salvar cache de clientes');
  }
}

/**
 * Buscar clientes por texto (nome ou fantasia)
 * @param {string} query - Texto para buscar
 * @returns {Array} Clientes que correspondem a busca
 */
export function searchClientes(query) {
  if (!query || query.trim().length < 2) return [];

  const normalizado = query.toLowerCase().trim();
  const clientes = getClientes();

  return clientes.filter(c => {
    const nome = (c.nome || '').toLowerCase();
    const fantasia = (c.fantasia || '').toLowerCase();
    const cnpj = (c.cnpj || '').replace(/[^\d]/g, '');
    const queryLimpo = normalizado.replace(/[^\d]/g, '');

    return nome.includes(normalizado) ||
           fantasia.includes(normalizado) ||
           (queryLimpo.length >= 4 && cnpj.includes(queryLimpo));
  }).slice(0, 10); // Limitar a 10 resultados no dropdown
}

/**
 * Remover cliente do cache por CNPJ
 * @param {string} cnpj - CNPJ do cliente
 */
export function removeCliente(cnpj) {
  if (!cnpj) return;
  const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
  const clientes = getClientes().filter(c =>
    c.cnpj && c.cnpj.replace(/[^\d]/g, '') !== cnpjLimpo
  );

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(clientes));
  } catch {
    console.warn('Falha ao remover cliente do cache');
  }
}

/**
 * Limpar todo o cache de clientes
 */
export function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    console.warn('Falha ao limpar cache');
  }
}
