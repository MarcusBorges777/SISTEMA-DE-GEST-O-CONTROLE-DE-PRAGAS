/**
 * useVencimentos — hook centralizado para /api/documentos/vencimentos
 *
 * Elimina as 4 implementações independentes espalhadas por:
 *   Agenda.jsx, Arquivos.jsx, Clientes.jsx, Garantias.jsx
 *
 * @param {number|null} dias  — filtra por janela de dias (ex: 60, 365).
 *                              null/undefined = sem filtro (retorna todos).
 * @returns {{ data: Array, loading: boolean, refetch: Function }}
 */
import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useVencimentos(dias = null) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);

  const url = dias != null
    ? `/api/documentos/vencimentos?dias=${dias}`
    : '/api/documentos/vencimentos';

  const refetch = useCallback(() => {
    setLoading(true);
    api.get(url)
      .then(r  => setData(Array.isArray(r.data) ? r.data : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [url]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
}
