import React, { useState, useEffect, useRef, useId } from 'react';
import { Search, Loader2, CheckCircle2, XCircle, User, MapPin, Briefcase } from 'lucide-react';
import { buscarCNPJ, buscarCEP } from '../../services/brasilApi';
import { searchClientes, saveCliente } from '../../services/clienteCache';

/**
 * Secao de dados do cliente com autocomplete e autofill
 * Compartilhada entre Laudos, Orcamentos e Recibos
 *
 * @param {Object} props
 * @param {Object} props.clientData - { nome, fantasia, cnpj, endereco, atividade }
 * @param {Function} props.onChange - (field, value) => void
 * @param {Function} props.onClientLoaded - (clientData) => void
 * @param {'editor'|'document'} props.mode - Modo de exibicao
 * @param {'laudo'|'recibo'|'orcamento'} props.variant - Variante visual
 */
export default function ClienteSection({ clientData, onChange, onClientLoaded, mode = 'editor', variant = 'recibo' }) {
  const [cnpjLoading, setCnpjLoading]     = useState(false);
  const [cnpjStatus, setCnpjStatus]       = useState(null); // 'success' | 'error' | null
  const [cnpjError, setCnpjError]         = useState('');
  const [cepLoading, setCepLoading]       = useState(false);
  const [suggestions, setSuggestions]     = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestionsRef = useRef(null);
  const inputNomeRef   = useRef(null);
  const suggestionsId  = useId();

  // Estilo base para inputs do editor — tokens unificados
  const inputCls = (extra = '') =>
    `w-full p-2.5 bg-white border rounded-md text-sm text-slate-800
     focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20
     focus:outline-none transition-all duration-150 shadow-sm
     placeholder:text-slate-400 ${extra}`;

  const labelCls = 'block text-[12px] font-bold text-slate-700 mb-1.5';

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
        inputNomeRef.current  && !inputNomeRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autocomplete por nome
  const handleNomeChange = (value) => {
    onChange('nome', value);
    if (value.length >= 2) {
      const results = searchClientes(value);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (cliente) => {
    onChange('nome', cliente.nome);
    onChange('fantasia', cliente.fantasia);
    onChange('cnpj', cliente.cnpj);
    onChange('endereco', cliente.endereco);
    onChange('atividade', cliente.atividade);
    setShowSuggestions(false);
    if (onClientLoaded) onClientLoaded(cliente);
  };

  // Autofill CNPJ
  const handleCnpjChange = async (value) => {
    onChange('cnpj', value);
    const cnpjLimpo = value.replace(/[^\d]/g, '');
    if (cnpjLimpo.length === 14) {
      setCnpjLoading(true);
      setCnpjStatus(null);
      setCnpjError('');
      try {
        const data = await buscarCNPJ(cnpjLimpo);
        onChange('nome', data.nome);
        onChange('fantasia', data.fantasia);
        onChange('endereco', data.endereco);
        onChange('atividade', data.atividade);
        setCnpjStatus('success');
        saveCliente({ nome: data.nome, fantasia: data.fantasia, cnpj: value, endereco: data.endereco, atividade: data.atividade });
        if (onClientLoaded) onClientLoaded(data);
      } catch (err) {
        setCnpjStatus('error');
        setCnpjError(err.message);
      } finally {
        setCnpjLoading(false);
        setTimeout(() => setCnpjStatus(null), 5000);
      }
    }
  };

  // Autofill CEP
  const handleEnderecoChange = async (value) => {
    onChange('endereco', value);
    const cepMatch = value.match(/(\d{5})-?(\d{3})$/);
    if (cepMatch) {
      const cep = cepMatch[1] + cepMatch[2];
      setCepLoading(true);
      try {
        const data = await buscarCEP(cep);
        if (data.endereco && !value.includes(data.cidade)) onChange('endereco', data.endereco);
      } catch { /* silencioso */ } finally {
        setCepLoading(false);
      }
    }
  };

  // ── Modo documento (dentro do A4) ──────────────────────────────────────────
  if (mode === 'document') {
    return (
      <section className="bg-blue-50/30 p-3 rounded-lg border border-blue-100 w-full shadow-sm mb-4 print-bg-light-blue">
        <h3 className="flex items-center gap-2 text-brand-500 font-bold uppercase text-[9px] mb-2 border-b border-blue-200 pb-1 italic">
          <User size={12} aria-hidden="true" /> Cliente / Contratante
        </h3>
        <div className="text-[10px] space-y-1 text-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="font-black text-brand-500 uppercase text-xs leading-tight mb-1">{clientData.nome || 'NOME DO CLIENTE'}</p>
              <p><span className="font-bold uppercase text-[9px] tracking-tight text-blue-900">NOME FANTASIA:</span> {clientData.fantasia}</p>
              <p><span className="font-bold uppercase text-[9px] tracking-tight text-blue-900">CNPJ:</span> {clientData.cnpj}</p>
            </div>
            <div className="md:border-l md:border-blue-200 md:pl-4 space-y-2">
              <div>
                <p className="font-bold uppercase text-[9px] tracking-tighter text-blue-900">Código / Atividade Econômica Principal:</p>
                <p className="italic font-medium leading-tight">{clientData.atividade}</p>
              </div>
              <div className="pt-1 border-t border-blue-200">
                <p><span className="font-bold uppercase text-[9px] tracking-tight text-blue-900">Endereço:</span> {clientData.endereco}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── Modo editor (formulário) ───────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <h4 className="font-bold text-[13px] text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2 mb-5">
        Dados do Cliente
      </h4>

      {/* Razão Social com Autocomplete */}
      <div className="relative">
        <label htmlFor="cliente-nome" className={`${labelCls} flex items-center gap-1`}>
          <Search size={12} aria-hidden="true" /> Razão Social / Nome
        </label>
        <input
          id="cliente-nome"
          ref={inputNomeRef}
          type="text"
          autoComplete="organization"
          aria-autocomplete="list"
          aria-controls={showSuggestions ? suggestionsId : undefined}
          aria-expanded={showSuggestions}
          value={clientData.nome || ''}
          onChange={(e) => handleNomeChange(e.target.value)}
          onFocus={() => {
            if (clientData.nome?.length >= 2) {
              const results = searchClientes(clientData.nome);
              setSuggestions(results);
              setShowSuggestions(results.length > 0);
            }
          }}
          className={inputCls('border-slate-200')}
          placeholder="Digite o nome ou selecione do histórico..."
        />

        {/* Dropdown de sugestões */}
        {showSuggestions && suggestions.length > 0 && (
          <ul
            id={suggestionsId}
            ref={suggestionsRef}
            role="listbox"
            aria-label="Clientes sugeridos"
            className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto
              animate-[slideUp_0.15s_cubic-bezier(0.16,1,0.3,1)_both]"
          >
            {suggestions.map((s, i) => (
              <li key={i} role="option" aria-selected="false">
                <button
                  type="button"
                  className="w-full text-left px-4 py-2.5 hover:bg-brand-50 focus:bg-brand-50
                    border-b border-slate-100 last:border-0 transition-colors duration-100
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/30"
                  onClick={() => selectSuggestion(s)}
                >
                  <p className="text-sm font-bold text-slate-800 truncate">{s.nome}</p>
                  <p className="text-[10px] text-slate-500">{s.cnpj} — {s.fantasia}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Nome Fantasia */}
      <div>
        <label htmlFor="cliente-fantasia" className={labelCls}>Nome Fantasia</label>
        <input
          id="cliente-fantasia"
          type="text"
          autoComplete="organization"
          value={clientData.fantasia || ''}
          onChange={(e) => onChange('fantasia', e.target.value)}
          className={inputCls('border-slate-200')}
        />
      </div>

      {/* CNPJ + Atividade */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="cliente-cnpj" className={`${labelCls} flex items-center gap-1.5`}>
            CNPJ
            {cnpjLoading && <Loader2 size={12} className="animate-spin text-brand-500" aria-label="Buscando CNPJ..." />}
            {cnpjStatus === 'success' && <CheckCircle2 size={12} className="text-emerald-500" aria-label="CNPJ encontrado" />}
            {cnpjStatus === 'error'   && <XCircle     size={12} className="text-red-500"     aria-label="CNPJ não encontrado" />}
          </label>
          <input
            id="cliente-cnpj"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-describedby={cnpjError ? 'cnpj-error' : undefined}
            aria-invalid={cnpjStatus === 'error'}
            value={clientData.cnpj || ''}
            onChange={(e) => handleCnpjChange(e.target.value)}
            className={inputCls(
              cnpjStatus === 'success' ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/20' :
              cnpjStatus === 'error'   ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' :
              'border-slate-200'
            )}
            placeholder="00.000.000/0000-00"
          />
          {cnpjError && (
            <p id="cnpj-error" role="alert" className="text-[10px] text-red-500 mt-1">{cnpjError}</p>
          )}
        </div>

        <div>
          <label htmlFor="cliente-atividade" className={`${labelCls} flex items-center gap-1`}>
            <Briefcase size={12} aria-hidden="true" /> Cód. / Atividade
          </label>
          <input
            id="cliente-atividade"
            type="text"
            value={clientData.atividade || ''}
            onChange={(e) => onChange('atividade', e.target.value)}
            className={inputCls('border-slate-200')}
          />
        </div>
      </div>

      {/* Endereço */}
      <div>
        <label htmlFor="cliente-endereco" className={`${labelCls} flex items-center gap-1.5`}>
          <MapPin size={12} aria-hidden="true" /> Endereço
          {cepLoading && <Loader2 size={12} className="animate-spin text-brand-500" aria-label="Buscando CEP..." />}
        </label>
        <input
          id="cliente-endereco"
          type="text"
          autoComplete="street-address"
          value={clientData.endereco || ''}
          onChange={(e) => handleEnderecoChange(e.target.value)}
          className={inputCls('border-slate-200')}
          placeholder="Rua, Nº — Bairro — Cidade/UF  CEP 00000-000"
        />
      </div>
    </div>
  );
}
