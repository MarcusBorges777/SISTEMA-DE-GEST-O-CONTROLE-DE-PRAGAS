import React, { useState, useEffect, useRef } from 'react';
import { Search, LogOut, User, X } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import GarantiaBell from './GarantiaBell';

export default function Topbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const timerRef = useRef(null);

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

  const tipoIcons = { cliente: 'user', documento: 'file-text', boleto: 'receipt' };
  const tipoLabels = { cliente: 'Cliente', documento: 'Documento', boleto: 'Boleto' };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 print:hidden">
      {/* Busca Global */}
      <div className="relative flex-1 max-w-lg" ref={searchRef}>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchResults.length > 0 && setShowResults(true)}
          onKeyDown={(e) => e.key === 'Escape' && (setShowResults(false), e.target.blur())}
          placeholder="Pesquisar clientes, documentos..."
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl
            bg-slate-100 dark:bg-slate-700/50 border border-transparent
            focus:border-brand-500 focus:bg-white dark:focus:bg-slate-700
            text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500
            transition-all"
        />
        {searchQuery && (
          <button onClick={() => { setSearchQuery(''); setShowResults(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        )}

        {/* Resultados */}
        {showResults && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-80 overflow-y-auto">
            {searchResults.length === 0 ? (
              <div className="p-4 text-sm text-slate-500 text-center">Nenhum resultado</div>
            ) : (
              searchResults.map((r, i) => (
                <a
                  key={i}
                  href={r.url}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition text-sm border-b border-slate-100 dark:border-slate-700 last:border-0"
                  onClick={() => setShowResults(false)}
                >
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 dark:bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-brand-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800 dark:text-slate-200 truncate">{r.titulo}</div>
                    <div className="text-xs text-slate-500">{tipoLabels[r.tipo] || r.tipo} {r.subtitulo ? `- ${r.subtitulo}` : ''}</div>
                  </div>
                </a>
              ))
            )}
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 ml-4">
        <ThemeToggle />

        <GarantiaBell />

        <a
          href="/logout"
          className="w-11 h-11 rounded-xl flex items-center justify-center
            bg-slate-100 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/30
            text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-all"
          title="Sair"
        >
          <LogOut size={18} />
        </a>
      </div>
    </header>
  );
}
