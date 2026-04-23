/**
 * useSearch — hook genérico de busca com debounce
 *
 * Elimina o padrão duplicado de [busca, setBusca] + useMemo filter
 * em Agenda.jsx, Arquivos.jsx, Clientes.jsx e Garantias.jsx.
 *
 * @param {Array}    items       — lista original a filtrar
 * @param {Function} filterFn   — (items, query) => filteredItems
 * @param {number}   debounceMs — atraso em ms antes de aplicar o filtro (default: 150)
 *
 * @returns {{
 *   query:     string,
 *   setQuery:  Function,
 *   filtered:  Array,
 *   isFiltering: boolean   — true enquanto há debounce pendente
 * }}
 *
 * Exemplo de uso:
 *   const { query, setQuery, filtered } = useSearch(
 *     clientes,
 *     (list, q) => list.filter(c => c.nome.toLowerCase().includes(q.toLowerCase()))
 *   );
 */
import { useState, useEffect, useMemo, useRef } from 'react';

export function useSearch(items, filterFn, debounceMs = 150) {
  const [query, setQuery]             = useState('');
  const [debouncedQuery, setDebounced] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebounced(query), debounceMs);
    return () => clearTimeout(timerRef.current);
  }, [query, debounceMs]);

  const filtered = useMemo(
    () => debouncedQuery.trim() ? filterFn(items, debouncedQuery) : items,
    [items, debouncedQuery, filterFn]
  );

  const isFiltering = query !== debouncedQuery;

  return { query, setQuery, filtered, isFiltering };
}
