import { useState, useEffect, useMemo } from 'react';
import { Search, Building2 } from 'lucide-react';
import Modal from '../shared/Modal';
import { searchClientes, getClientes } from '../../services/clienteCache';

/**
 * Modal de busca para carregar um cliente salvo no cache.
 *
 * @param {boolean} isOpen
 * @param {() => void} onClose
 * @param {(cliente: object) => void} onSelect  — chamado ao selecionar um card
 * @param {Array} [clientes]  — lista opcional; se omitida, carrega via getClientes()
 */
export function ClientePickerModal({ isOpen, onClose, onSelect, clientes }) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isOpen) setQuery('');
  }, [isOpen]);

  const base = useMemo(
    () => (clientes ?? (isOpen ? getClientes() : [])),
    [clientes, isOpen]
  );

  const results = useMemo(
    () => (query.trim() ? searchClientes(query) : base),
    [query, base]
  );

  const handlePick = (c) => {
    onSelect(c);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Carregar Cliente Salvo" maxWidth="max-w-2xl">
      <div className="space-y-3">
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

        <p className="text-xs text-slate-500">
          {results.length} de {base.length} cliente{base.length === 1 ? '' : 's'} salvo{base.length === 1 ? '' : 's'}
        </p>

        <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-1">
          {results.length === 0 ? (
            <p className="text-center text-slate-500 py-10 text-sm">
              {base.length === 0
                ? 'Nenhum cliente salvo ainda.'
                : 'Nenhum cliente encontrado para esta busca.'}
            </p>
          ) : (
            results.map((c) => (
              <button
                key={c.cnpj}
                type="button"
                onClick={() => handlePick(c)}
                className="w-full text-left p-3 border border-slate-200 rounded-lg bg-white
                  hover:bg-slate-50 hover:border-blue-400 hover:shadow-sm
                  transition-colors cursor-pointer"
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
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
