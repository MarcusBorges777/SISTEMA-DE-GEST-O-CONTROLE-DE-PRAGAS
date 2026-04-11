import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const ProdutosContext = createContext(null);

export function ProdutosProvider({ children }) {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadProdutos = useCallback(async () => {
    try {
      const data = await api.get('/api/produtos');
      setProdutos(Array.isArray(data) ? data : []);
    } catch (e) {
      // Silencioso — banco pode estar vazio
    }
  }, []);

  useEffect(() => { loadProdutos(); }, [loadProdutos]);

  const addProduto = async (produto) => {
    try {
      await api.post('/api/produtos', produto);
      await loadProdutos();
      return true;
    } catch (e) {
      console.error('Erro ao adicionar produto:', e);
      return false;
    }
  };

  const updateProduto = async (id, produto) => {
    try {
      await api.put(`/api/produtos/${id}`, produto);
      await loadProdutos();
      return true;
    } catch (e) {
      console.error('Erro ao atualizar produto:', e);
      return false;
    }
  };

  const removeProduto = async (id) => {
    try {
      await api.del(`/api/produtos/${id}`);
      await loadProdutos();
      return true;
    } catch (e) {
      console.error('Erro ao remover produto:', e);
      return false;
    }
  };

  return (
    <ProdutosContext.Provider value={{ produtos, loading, loadProdutos, addProduto, updateProduto, removeProduto }}>
      {children}
    </ProdutosContext.Provider>
  );
}

export function useProdutos() {
  const ctx = useContext(ProdutosContext);
  if (!ctx) throw new Error('useProdutos deve ser usado dentro de ProdutosProvider');
  return ctx;
}
