import React, { useState, useEffect, useRef, useId } from 'react';
import { Search, Bell, LogOut, User, X } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Topbar() {
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults]   = useState(false);
  const searchRef  = useRef(null);
  const timerRef   = useRef(null);
  const listboxId  = useId();

  // Busca global debounced
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/busca-global?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.resultados || []);
          setShowResults(true);
        }
      } catch (e) {
        console.warn('Busca falhou:', e);
      }
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [searchQuery]);

  // Fechar ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const tipoLabels = { cliente: 'Cliente', documento: 'Documento', boleto: 'Boleto' };

  return (
    <header
      className="sticky top-0 z-20 h-16 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl
        border-b border-slate-200 dark:border-slate-700
        flex items-center justify-between px-6 print:hidden"
      role="banner"
    >
      {/* Busca Global */}
      <div className="relative flex-1 max-w-lg" ref={searchRef}>
        <label htmlFor="global-search" className="sr-only">
          Pesquisar clientes, documentos e boletos
        </label>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
        <input
          id="global-search"
          type="search"
          role="combobox"
          autoComplete="off"
          aria-expanded={showResults && searchResults.length > 0}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-label="Pesquisar no sistema"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchResults.length > 0 && setShowResults(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setShowResults(false); e.target.blur(); }
          }}
          placeholder="Pesquisar clientes, documentos..."
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl
            bg-slate-100 dark:bg-slate-700/50
            border border-transparent
            hover:bg-slate-200/70 dark:hover:bg-slate-700
            focus:border-brand-500 focus:bg-white dark:focus:bg-slate-700
            focus:outline-none focus:ring-2 focus:ring-brand-500/30
            text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500
            transition-all duration-200"
        />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(''); setShowResults(false); }}
            aria-label="Limpar pesquisa"
            className="absolute right-3 top-1/2 -translate-y-1/2
              text-slate-400 hover:text-slate-600 dark:hover:text-slate-300
              active:scale-90 transition-all duration-150
              focus-visible:outline-2 focus-visible:outline-brand-500 rounded"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}

        {/* Resultados */}
        {showResults && (
          <div
            id={listboxId}
            role="listbox"
            aria-label="Resultados da pesquisa"
            className="absolute top-full left-0 right-0 mt-2
              bg-white dark:bg-slate-800
              border border-slate-200 dark:border-slate-700
              rounded-xl shadow-xl max-h-80 overflow-y-auto
              animate-[slideUp_0.18s_cubic-bezier(0.16,1,0.3,1)_both]"
          >
            {searchResults.length === 0 ? (
              <div role="option" aria-selected="false" className="p-4 text-sm text-slate-500 text-center">
                Nenhum resultado encontrado
              </div>
            ) : (
              searchResults.map((r, i) => (
                <a
                  key={i}
                  href={r.url}
                  role="option"
                  aria-selected="false"
                  className="flex items-center gap-3 px-4 py-3
                    hover:bg-slate-50 dark:hover:bg-slate-700/50
                    focus:bg-slate-50 dark:focus:bg-slate-700/50
                    transition-colors duration-150 text-sm
                    border-b border-slate-100 dark:border-slate-700 last:border-0
                    outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/40"
                  onClick={() => setShowResults(false)}
                >
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 dark:bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-brand-500" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800 dark:text-slate-200 truncate">{r.titulo}</div>
                    <div className="text-xs text-slate-500">
                      {tipoLabels[r.tipo] || r.tipo}{r.subtitulo ? ` — ${r.subtitulo}` : ''}
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 ml-4" role="toolbar" aria-label="Ações do cabeçalho">
        <ThemeToggle />

        <button
          aria-label="Notificações"
          className="w-11 h-11 rounded-xl flex items-center justify-center relative
            bg-slate-100 dark:bg-slate-700
            hover:bg-slate-200 dark:hover:bg-slate-600
            active:scale-95
            text-slate-600 dark:text-slate-300
            transition-all duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
        >
          <Bell size={18} aria-hidden="true" />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"
            aria-label="Você tem notificações não lidas"
          />
        </button>

        <a
          href="/logout"
          aria-label="Sair da conta"
          className="w-11 h-11 rounded-xl flex items-center justify-center
            bg-slate-100 dark:bg-slate-700
            hover:bg-red-50 dark:hover:bg-red-900/30
            active:scale-95
            text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400
            transition-all duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
        >
          <LogOut size={18} aria-hidden="true" />
        </a>
      </div>
    </header>
  );
}
