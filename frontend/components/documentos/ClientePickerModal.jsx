import { useState, useEffect } from 'react';
import { Search, Building2, ExternalLink, ArrowDownAZ, Clock } from 'lucide-react';
import Modal from '../shared/Modal';
import { searchClientes, getClientes } from '../../services/clienteCache';

/**
 * Modal de busca para carregar um cliente salvo no cache.
 *
 * @param {boolean} isOpen
 * @param {() => void} onClose
 * @param {(cliente: object) => void} onSelect  — chamado ao selecionar um card
 * @param {Array} [clientes]  — lista opcional; se omitida, carrega via getClientes()
 * @param {(cliente: object) => void} [onVerPerfil]  — abre o perfil completo do cliente
 */
export function ClientePickerModal({ isOpen, onClose, onSelect, clientes, onVerPerfil }) {
  const [query, setQuery] = useState('');
  const [sortPicker, setSortPicker] = useState('recente');
  const [base, setBase] = useState([]);
  const [results, setResults] = useState([]);

  // Carrega a lista base quando o modal abre (ou quando clientes muda)
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSortPicker('recente');
      setBase([]);
      setResults([]);
      return;
    }
    if (clientes) {
      setBase(clientes);
    } else {
      getClientes().then(setBase).catch(() => setBase([]));
    }
  }, [isOpen, clientes]);

  // Filtra e ordena quando query ou base mudam
  useEffect(() => {
    let active = true;
    const q = query.trim();

    async function filtrar() {
      let lista;
      if (q) {
        lista = await searchClientes(q).catch(() => []);
      } else {
        lista = [...base];
      }

      if (!active) return;

      if (sortPicker === 'az') {
        lista = [...lista].sort((a, b) =>
          (a.nome || a.fantasia || '').localeCompare(b.nome || b.fantasia || '', 'pt-BR')
        );
      }
      setResults(lista);
    }

    filtrar();
    return () => { active = false; };
  }, [query, base, sortPicker]);

  const handlePick = (c) => {
    onSelect(c);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Carregar Cliente Salvo" maxWidth="max-w-2xl" zClassName="z-[99999]">
      <div className="space-y-3">
        {/* Input de busca */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            autoFocus
            type="text"
            placeholder="Buscar por nome, fantasia, CNPJ ou endereço..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results[0]) handlePick(results[0]);
            }}
            className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Barra de info + ordenação */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {results.length} de {base.length} cliente{base.length === 1 ? '' : 's'} salvo{base.length === 1 ? '' : 's'}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSortPicker('recente')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors
                ${sortPicker === 'recente'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              <Clock size={11} /> Recentes
            </button>
            <button
              type="button"
              onClick={() => setSortPicker('az')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors
                ${sortPicker === 'az'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              <ArrowDownAZ size={11} /> A–Z
            </button>
          </div>
        </div>

        {/* Lista de cards */}
        <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-1">
          {results.length === 0 ? (
            <p className="text-center text-slate-500 py-10 text-sm">
              {base.length === 0
                ? 'Nenhum cliente salvo ainda.'
                : 'Nenhum cliente encontrado para esta busca.'}
            </p>
          ) : (
            results.map((c) => (
              <div
                key={c.id || c.cnpj}
                className="flex items-stretch border border-slate-200 rounded-lg bg-white
                  hover:border-blue-400 hover:shadow-sm transition-colors overflow-hidden"
              >
                {/* Área clicável para selecionar */}
                <button
                  type="button"
                  onClick={() => handlePick(c)}
                  className="flex-1 text-left p-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Building2 size={18} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">
                        {c.nome || '—'}
                      </p>
                      {c.fantasia && (
                        <p className="text-xs text-slate-500 truncate">{c.fantasia}</p>
                      )}
                      <p className="text-xs font-mono text-slate-600 mt-0.5">
                        {c.cnpj || '—'}
                      </p>
                      {c.endereco && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {c.endereco}
                        </p>
                      )}
                    </div>
                  </div>
                </button>

                {/* Botão Ver Perfil */}
                {onVerPerfil && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onVerPerfil(c); }}
                    className="shrink-0 px-3 border-l border-slate-200 text-slate-400
                      hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center"
                    title="Ver perfil completo"
                  >
                    <ExternalLink size={15} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
