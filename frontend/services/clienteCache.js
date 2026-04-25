// Adapter: mantém a API pública anterior mas persiste no db.json via backend.
// Todos os métodos são agora async.

import { clienteApi } from './dbService';

function cnpjDigits(cnpj) {
  return (cnpj || '').replace(/[^\d]/g, '');
}

export async function getClientes() {
  try {
    const fromDb = await clienteApi.getAll();
    // One-time migration: if db.json is empty, seed from localStorage
    if (fromDb.length === 0) {
      const legacy = JSON.parse(localStorage.getItem('clientes') || '[]');
      if (legacy.length > 0) {
        await Promise.all(legacy.map(c => clienteApi.upsert(c).catch(() => {})));
        localStorage.removeItem('clientes');
        return await clienteApi.getAll();
      }
    }
    return fromDb;
  } catch {
    // Backend unavailable — fall back to localStorage
    return JSON.parse(localStorage.getItem('clientes') || '[]');
  }
}

export async function saveCliente(cliente) {
  if (!cliente || (!cliente.cnpj && !cliente.nome)) return;
  try {
    return await clienteApi.upsert({
      nome:      cliente.nome || '',
      fantasia:  cliente.fantasia || '',
      cnpj:      cliente.cnpj || '',
      endereco:  cliente.endereco || '',
      atividade: cliente.atividade || '',
      email:     cliente.email || '',
      telefone:  cliente.telefone || '',
    });
  } catch (err) {
    console.warn('[clienteCache] saveCliente falhou:', err);
  }
}

export async function searchClientes(query) {
  if (!query || query.trim().length < 2) return [];
  try {
    return await clienteApi.getAll(query);
  } catch {
    return [];
  }
}

export async function removeCliente(cnpj) {
  if (!cnpj) return;
  try {
    const digits = cnpjDigits(cnpj);
    const all = await clienteApi.getAll();
    const match = all.find(c => cnpjDigits(c.cnpj) === digits);
    if (match?.id) await clienteApi.delete(match.id);
  } catch (err) {
    console.warn('[clienteCache] removeCliente falhou:', err);
  }
}

export async function clearCache() {
  // Não suportado — o db.json é a fonte de verdade
}
