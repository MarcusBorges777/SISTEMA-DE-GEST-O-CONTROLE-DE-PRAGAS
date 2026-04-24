import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { clienteApi, agendaApi } from '../services/dbService';

const DbContext = createContext(null);

export function DbProvider({ children }) {
  const [clientes, setClientes] = useState([]);
  const [agenda, setAgenda] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingAgenda, setLoadingAgenda] = useState(false);

  // ── Clientes ──────────────────────────────────────────────────────────

  const loadClientes = useCallback(async (query = '') => {
    setLoadingClientes(true);
    try {
      const data = await clienteApi.getAll(query);
      setClientes(data);
      return data;
    } catch (err) {
      console.error('[DbContext] loadClientes:', err);
      return [];
    } finally {
      setLoadingClientes(false);
    }
  }, []);

  const createCliente = useCallback(async (data) => {
    const entry = await clienteApi.upsert(data);
    setClientes(prev => {
      const idx = prev.findIndex(c => c.id === entry.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = entry;
        return next;
      }
      return [entry, ...prev];
    });
    return entry;
  }, []);

  const updateCliente = useCallback(async (id, data) => {
    const entry = await clienteApi.update(id, data);
    setClientes(prev => prev.map(c => (c.id === id ? entry : c)));
    return entry;
  }, []);

  const deleteCliente = useCallback(async (id) => {
    await clienteApi.delete(id);
    setClientes(prev => prev.filter(c => c.id !== id));
  }, []);

  const searchClientes = useCallback(async (query) => {
    try {
      return await clienteApi.getAll(query);
    } catch {
      return [];
    }
  }, []);

  // ── Agenda ────────────────────────────────────────────────────────────

  const loadAgenda = useCallback(async () => {
    setLoadingAgenda(true);
    try {
      const data = await agendaApi.getAll();
      setAgenda(data);
      return data;
    } catch (err) {
      console.error('[DbContext] loadAgenda:', err);
      return [];
    } finally {
      setLoadingAgenda(false);
    }
  }, []);

  const createAgendamento = useCallback(async (data) => {
    const entry = await agendaApi.upsert(data);
    setAgenda(prev => [...prev, entry].sort((a, b) =>
      (a.data + a.hora).localeCompare(b.data + b.hora)
    ));
    return entry;
  }, []);

  const updateAgendamento = useCallback(async (id, data) => {
    const entry = await agendaApi.update(id, data);
    setAgenda(prev => prev.map(a => (a.id === id ? entry : a)));
    return entry;
  }, []);

  const deleteAgendamento = useCallback(async (id) => {
    await agendaApi.delete(id);
    setAgenda(prev => prev.filter(a => a.id !== id));
  }, []);

  const deleteSerie = useCallback(async (recorrenciaId) => {
    await agendaApi.deleteSerie(recorrenciaId);
    setAgenda(prev => prev.filter(
      a => a.recorrenciaId !== recorrenciaId && a.id !== recorrenciaId
    ));
  }, []);

  // ── Boot ──────────────────────────────────────────────────────────────

  useEffect(() => {
    loadClientes();
    loadAgenda();
  }, []);

  const value = {
    // state
    clientes,
    agenda,
    loadingClientes,
    loadingAgenda,
    // clientes CRUD
    loadClientes,
    createCliente,
    updateCliente,
    deleteCliente,
    searchClientes,
    // agenda CRUD
    loadAgenda,
    createAgendamento,
    updateAgendamento,
    deleteAgendamento,
    deleteSerie,
  };

  return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
}

export function useDb() {
  const ctx = useContext(DbContext);
  if (!ctx) throw new Error('useDb deve ser usado dentro de <DbProvider>');
  return ctx;
}
