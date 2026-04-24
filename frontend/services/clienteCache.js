// Adapter: mantém a API pública anterior mas persiste no db.json via backend.
// Todos os métodos são agora async.

import { clienteApi } from './dbService';

function cnpjDigits(cnpj) {
  return (cnpj || '').replace(/[^\d]/g, '');
}

export async function getClientes() {
  try {
    return await clienteApi.getAll();
  } catch {
    return [];
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
