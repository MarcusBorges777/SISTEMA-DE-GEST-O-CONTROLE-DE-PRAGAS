import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, User, X } from 'lucide-react';

/**
 * ClienteBusca — campo de busca de clientes cadastrados com dropdown
 * Props:
 *   onSelect(clienteObj) — chamado ao selecionar um cliente
 *   placeholder — texto do input (opcional)
 *   className — classes extras no wrapper (opcional)
 */
export default function ClienteBusca({ onSelect, placeholder = 'Buscar cliente cadastrado...', className = '' }) {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickFora = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  // Busca com debounce de 300ms
  const buscar = useCallback(async (termo) => {
    if (!termo || termo.trim().length < 2) {
      setResultados([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`/api/clientes?q=${encodeURIComponent(termo)}&limit=10`, {
        credentials: 'same-origin',
      });
      if (!resp.ok) throw new Error('Erro na busca');
      const data = await resp.json();
      const lista = Array.isArray(data) ? data : data.clientes || data.data || [];
      setResultados(lista);
      setOpen(lista.length > 0);
    } catch (e) {
      setResultados([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setClienteSelecionado(null);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscar(val), 300);
  };

  const handleSelecionar = (cliente) => {
    setClienteSelecionado(cliente);
    setQuery('');
    setOpen(false);
    setResultados([]);
    onSelect(cliente);
  };

  const handleLimpar = () => {
    setClienteSelecionado(null);
    setQuery('');
    setResultados([]);
    setOpen(false);
  };

  const getNomeExibicao = (c) =>
    c.nome_fantasia || c.razao_social || c.nome || 'Cliente';

  const getCnpjFormatado = (cnpj) => {
    if (!cnpj) return '';
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length === 14) {
      return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return cnpj;
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Campo selecionado */}
      {clienteSelecionado ? (
        <div className="flex items-center gap-3 px-3 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 rounded-lg">
          <User size={16} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 truncate">
              {getNomeExibicao(clienteSelecionado)}
            </p>
            {clienteSelecionado.cnpj && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                {getCnpjFormatado(clienteSelecionado.cnpj)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleLimpar}
            className="p-1 rounded-md text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition flex-shrink-0"
            title="Remover seleção"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        /* Input de busca */
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <input
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={() => resultados.length > 0 && setOpen(true)}
            placeholder={placeholder}
            className="w-full pl-9 pr-8 py-2.5 text-sm rounded-lg border border-blue-200 dark:border-slate-600
              bg-blue-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400
              focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
          />
        </div>
      )}

      {/* Dropdown de resultados */}
      {open && resultados.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-64 overflow-y-auto">
          {resultados.map((c, i) => (
            <button
              key={c.id || i}
              type="button"
              onClick={() => handleSelecionar(c)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 transition border-b border-slate-100 dark:border-slate-700 last:border-0"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                <User size={14} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {getNomeExibicao(c)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {getCnpjFormatado(c.cnpj)}
                  {c.cidade ? ` · ${c.cidade}${c.uf ? `/${c.uf}` : ''}` : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
