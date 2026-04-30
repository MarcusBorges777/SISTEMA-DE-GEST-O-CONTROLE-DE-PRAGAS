import React, { useState, useEffect, useRef } from 'react';
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
 * @param {Function} props.onClientLoaded - (clientData) => void - Chamado quando API preenche dados
 * @param {'editor'|'document'} props.mode - Modo de exibicao
 * @param {'laudo'|'recibo'|'orcamento'} props.variant - Variante visual
 */
export default function ClienteSection({ clientData, onChange, onClientLoaded, mode = 'editor', variant = 'recibo' }) {
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjStatus, setCnpjStatus] = useState(null); // 'success' | 'error' | null
  const [cnpjError, setCnpjError] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef(null);
  const inputNomeRef = useRef(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
          inputNomeRef.current && !inputNomeRef.current.contains(e.target)) {
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
        // Salvar no db.json (fire-and-forget: não bloqueia o autofill)
        saveCliente({
          nome: data.nome,
          fantasia: data.fantasia,
          cnpj: value,
          endereco: data.endereco,
          atividade: data.atividade
        }).catch(() => {});
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

  // Autofill CEP (extrai do endereco se tiver)
  const handleEnderecoChange = async (value) => {
    onChange('endereco', value);
    // Detectar CEP no texto digitado
    const cepMatch = value.match(/(\d{5})-?(\d{3})$/);
    if (cepMatch) {
      const cep = cepMatch[1] + cepMatch[2];
      setCepLoading(true);
      try {
        const data = await buscarCEP(cep);
        if (data.endereco && !value.includes(data.cidade)) {
          onChange('endereco', data.endereco);
        }
      } catch {
        // Silencioso - usuario pode digitar manualmente
      } finally {
        setCepLoading(false);
      }
    }
  };

  // Modo documento (dentro do A4)
  if (mode === 'document') {
    return (
      <section className="bg-blue-50/30 p-3 rounded-lg border border-blue-100 w-full shadow-sm mb-4 print-bg-light-blue">
        <h3 className="flex items-center gap-2 leading-none text-[#254191] font-bold uppercase text-[9px] mb-2 border-b border-blue-200 pb-1 italic">
          <User size={12} className="shrink-0" /> Cliente / Contratante
        </h3>
        <div className="text-[10px] space-y-1 text-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="font-black text-[#254191] uppercase text-xs leading-tight mb-1">{clientData.nome || 'NOME DO CLIENTE'}</p>
              <p><span className="font-bold uppercase text-[9px] tracking-tight text-blue-800">NOME FANTASIA:</span> {clientData.fantasia}</p>
              <p><span className="font-bold uppercase text-[9px] tracking-tight text-blue-800">CNPJ:</span> {clientData.cnpj}</p>
            </div>
            <div className="md:border-l md:border-blue-200 md:pl-4 space-y-2">
              <div>
                <p className="font-bold uppercase text-[9px] tracking-tighter text-blue-800">Código / Atividade Econômica Principal:</p>
                <p className="italic font-medium leading-tight">{clientData.atividade}</p>
              </div>
              <div className="pt-1 border-t border-blue-200">
                <p><span className="font-bold uppercase text-[9px] tracking-tight text-blue-800">Endereço:</span> {clientData.endereco}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Modo editor (formulario)
  return (
    <div className="space-y-4">
      <h4 className="font-bold text-[13px] text-[#5c6a8a] uppercase tracking-widest border-b border-gray-300/80 pb-2 mb-5">
        Dados do Cliente
      </h4>

      {/* Razao Social com Autocomplete */}
      <div className="relative">
        <label className="block text-[12px] font-bold text-[#3b4b73] mb-1.5 flex items-center gap-1">
          <Search size={12} /> Razão Social / Nome
        </label>
        <input
          ref={inputNomeRef}
          type="text"
          value={clientData.nome || ''}
          onChange={(e) => handleNomeChange(e.target.value)}
          onFocus={() => {
            if (clientData.nome && clientData.nome.length >= 2) {
              const results = searchClientes(clientData.nome);
              setSuggestions(results);
              setShowSuggestions(results.length > 0);
            }
          }}
          className="w-full p-2.5 bg-white border border-gray-200 rounded-md text-sm text-gray-800 focus:border-[#3b4b73] focus:ring-1 focus:ring-[#3b4b73] outline-none transition-all shadow-sm"
          placeholder="Digite o nome ou selecione do histórico..."
        />
        {/* Dropdown de sugestoes */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto"
          >
            {suggestions.map((s, i) => (
              <button
                key={i}
                className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors"
                onClick={() => selectSuggestion(s)}
              >
                <p className="text-sm font-bold text-gray-800 truncate">{s.nome}</p>
                <p className="text-[10px] text-gray-500">{s.cnpj} — {s.fantasia}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Nome Fantasia */}
      <div>
        <label className="block text-[12px] font-bold text-[#3b4b73] mb-1.5">Nome Fantasia</label>
        <input
          type="text"
          value={clientData.fantasia || ''}
          onChange={(e) => onChange('fantasia', e.target.value)}
          className="w-full p-2.5 bg-white border border-gray-200 rounded-md text-sm text-gray-800 focus:border-[#3b4b73] focus:ring-1 focus:ring-[#3b4b73] outline-none transition-all shadow-sm"
        />
      </div>

      {/* CNPJ + Atividade */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[12px] font-bold text-[#3b4b73] mb-1.5 flex items-center gap-1">
            CNPJ
            {cnpjLoading && <Loader2 size={12} className="animate-spin text-blue-500" />}
            {cnpjStatus === 'success' && <CheckCircle2 size={12} className="text-green-500" />}
            {cnpjStatus === 'error' && <XCircle size={12} className="text-red-500" />}
          </label>
          <input
            type="text"
            value={clientData.cnpj || ''}
            onChange={(e) => handleCnpjChange(e.target.value)}
            className={`w-full p-2.5 bg-white border rounded-md text-sm text-gray-800 focus:border-[#3b4b73] focus:ring-1 focus:ring-[#3b4b73] outline-none transition-all shadow-sm ${
              cnpjStatus === 'success' ? 'border-green-300' : cnpjStatus === 'error' ? 'border-red-300' : 'border-gray-200'
            }`}
            placeholder="00.000.000/0000-00"
          />
          {cnpjError && <p className="text-[10px] text-red-500 mt-1">{cnpjError}</p>}
        </div>
        <div>
          <label className="block text-[12px] font-bold text-[#3b4b73] mb-1.5 flex items-center gap-1">
            <Briefcase size={12} /> Cód. / Atividade
          </label>
          <input
            type="text"
            value={clientData.atividade || ''}
            onChange={(e) => onChange('atividade', e.target.value)}
            className="w-full p-2.5 bg-white border border-gray-200 rounded-md text-sm text-gray-800 focus:border-[#3b4b73] focus:ring-1 focus:ring-[#3b4b73] outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Endereco */}
      <div>
        <label className="block text-[12px] font-bold text-[#3b4b73] mb-1.5 flex items-center gap-1">
          <MapPin size={12} /> Endereço
          {cepLoading && <Loader2 size={12} className="animate-spin text-blue-500" />}
        </label>
        <input
          type="text"
          value={clientData.endereco || ''}
          onChange={(e) => handleEnderecoChange(e.target.value)}
          className="w-full p-2.5 bg-white border border-gray-200 rounded-md text-sm text-gray-800 focus:border-[#3b4b73] focus:ring-1 focus:ring-[#3b4b73] outline-none transition-all shadow-sm"
          placeholder="Rua, Nº - Bairro - Cidade/UF CEP 00000-000"
        />
      </div>
    </div>
  );
}
