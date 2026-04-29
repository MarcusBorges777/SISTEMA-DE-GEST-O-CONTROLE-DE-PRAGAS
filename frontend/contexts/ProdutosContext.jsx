import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ProdutosContext = createContext(null);

// Usa fetch direto (sem api.get) para não acionar o auto-redirect em 401
async function fetchJson(url, options = {}) {
  const resp = await fetch(url, { credentials: 'same-origin', ...options });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

export function ProdutosProvider({ children }) {
  const [produtos, setProdutos] = useState([]);
  const [mapeamento, setMapeamento] = useState({});

  const loadProdutos = useCallback(async () => {
    try {
      const data = await fetchJson('/api/produtos');
      setProdutos(Array.isArray(data) ? data : []);
    } catch (e) {
      // Silencioso — usuário pode não estar logado ainda
    }
  }, []);

  const loadMapeamento = useCallback(async () => {
    try {
      const data = await fetchJson('/api/config/mapeamento-pragas');
      setMapeamento(data && typeof data === 'object' ? data : {});
    } catch (e) {
      // Silencioso
    }
  }, []);

  useEffect(() => {
    loadProdutos();
    loadMapeamento();
  }, [loadProdutos, loadMapeamento]);

  const addProduto = async (produto) => {
    try {
      await fetchJson('/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(produto),
      });
      await loadProdutos();
      return true;
    } catch (e) {
      console.error('Erro ao adicionar produto:', e);
      return false;
    }
  };

  const updateProduto = async (id, produto) => {
    try {
      await fetchJson(`/api/produtos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(produto),
      });
      await loadProdutos();
      return true;
    } catch (e) {
      console.error('Erro ao atualizar produto:', e);
      return false;
    }
  };

  const removeProduto = async (id) => {
    try {
      await fetchJson(`/api/produtos/${id}`, { method: 'DELETE' });
      await loadProdutos();
      return true;
    } catch (e) {
      console.error('Erro ao remover produto:', e);
      return false;
    }
  };

  const saveMapeamento = async (novoMapa) => {
    try {
      await fetchJson('/api/config/mapeamento-pragas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoMapa),
      });
      setMapeamento(novoMapa);
      return true;
    } catch (e) {
      console.error('Erro ao salvar mapeamento:', e);
      return false;
    }
  };

  return (
    <ProdutosContext.Provider value={{ produtos, loadProdutos, addProduto, updateProduto, removeProduto, mapeamento, saveMapeamento }}>
      {children}
    </ProdutosContext.Provider>
  );
}

export function useProdutos() {
  const ctx = useContext(ProdutosContext);
  if (!ctx) throw new Error('useProdutos deve ser usado dentro de ProdutosProvider');
  return ctx;
}
