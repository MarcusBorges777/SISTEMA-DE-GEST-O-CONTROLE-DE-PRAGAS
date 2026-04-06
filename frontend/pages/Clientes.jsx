import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Plus, Search, Trash2, Edit3, Phone, MapPin, Building2, X, RefreshCw, Loader2, CheckCircle2, Database, BookmarkCheck } from 'lucide-react';
import { fetchClientes, createCliente, deleteCliente, fetchCnpjAutocomplete } from '../services/api';
import { searchClientes as searchCacheClientes } from '../services/clienteCache';
import { buscarCNPJ } from '../services/brasilApi';
import { useToast } from '../components/shared/Toast';

export default function Clientes() {
  const { addToast } = useToast();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filtros, setFiltros] = useState({ nome: '', cidade: '', cnpj: '' });
  const [formData, setFormData] = useState({
    nome_fantasia: '', razao_social: '', cnpj: '', cnae: '',
    rua: '', numero: '', bairro: '', cidade: '', uf: 'MG', telefone: '',
  });

  // Suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjStatus, setCnpjStatus] = useState(null); // 'success' | 'error' | null
  const suggestionsRef = useRef(null);
  const nomeDebounceRef = useRef(null);
  const cnpjDebounceRef = useRef(null);

  const loadClientes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchClientes(filtros);
      setClientes(Array.isArray(data) ? data : data.clientes || []);
    } catch (e) {
      addToast('Erro ao carregar clientes', 'error');
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => { loadClientes(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadClientes();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createCliente(formData);
      addToast('Cliente cadastrado com sucesso!', 'success');
      setShowForm(false);
      setFormData({ nome_fantasia: '', razao_social: '', cnpj: '', cnae: '', rua: '', numero: '', bairro: '', cidade: '', uf: 'MG', telefone: '' });
      loadClientes();
    } catch (e) {
      addToast('Erro ao cadastrar cliente', 'error');
    }
  };

  const handleDelete = async (id, nome) => {
    if (!confirm(`Remover cliente "${nome}"?`)) return;
    try {
      await deleteCliente(id);
      addToast('Cliente removido', 'success');
      loadClientes();
    } catch (e) {
      addToast('Erro ao remover cliente', 'error');
    }
  };

  // === SUGGESTION SYSTEM ===

  // Close suggestions on click outside
  useEffect(() => {
    const handler = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced search for nome_fantasia suggestions
  const handleNomeChange = (value) => {
    setFormData(prev => ({ ...prev, nome_fantasia: value }));
    setCnpjStatus(null);

    clearTimeout(nomeDebounceRef.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    nomeDebounceRef.current = setTimeout(async () => {
      try {
        // Search both sources in parallel
        const [cacheResults, dbResults] = await Promise.allSettled([
          Promise.resolve(searchCacheClientes(value)),
          fetchCnpjAutocomplete('nome_fantasia', value, 8),
        ]);

        const merged = [];
        const seenCnpjs = new Set();

        // Cache results first (faster, recent)
        if (cacheResults.status === 'fulfilled' && cacheResults.value.length > 0) {
          cacheResults.value.forEach(c => {
            const cnpjClean = (c.cnpj || '').replace(/[^\d]/g, '');
            if (cnpjClean) seenCnpjs.add(cnpjClean);
            // Check if already a registered client
            const jaCliente = clientes.some(cl =>
              cl.cnpj && cl.cnpj.replace(/[^\d]/g, '') === cnpjClean
            );
            merged.push({ ...c, source: 'cache', jaCliente });
          });
        }

        // CNPJ DB results
        if (dbResults.status === 'fulfilled') {
          const results = dbResults.value?.resultados || [];
          results.forEach(r => {
            const cnpjClean = (r.cnpj || '').replace(/[^\d]/g, '');
            if (cnpjClean && seenCnpjs.has(cnpjClean)) return; // skip duplicates
            seenCnpjs.add(cnpjClean);
            const jaCliente = clientes.some(cl =>
              cl.cnpj && cl.cnpj.replace(/[^\d]/g, '') === cnpjClean
            );
            merged.push({ ...r, source: 'cnpj_db', jaCliente });
          });
        }

        setSuggestions(merged.slice(0, 10));
        setShowSuggestions(merged.length > 0);
      } catch (e) {
        // Silently fail - suggestions are a nice-to-have
      }
    }, 300);
  };

  // Select a suggestion and populate form
  const selectSuggestion = (sug) => {
    if (sug.source === 'cache') {
      setFormData({
        nome_fantasia: sug.fantasia || sug.nome || '',
        razao_social: sug.nome || '',
        cnpj: sug.cnpj || '',
        cnae: sug.atividade || '',
        rua: sug.endereco || '',
        numero: '',
        bairro: '',
        cidade: '',
        uf: 'MG',
        telefone: '',
      });
    } else {
      // From CNPJ DB
      setFormData({
        nome_fantasia: sug.nome_fantasia || sug.razao_social || '',
        razao_social: sug.razao_social || '',
        cnpj: sug.cnpj || '',
        cnae: sug.cnae_descricao ? `${sug.cnae_fiscal || ''} - ${sug.cnae_descricao}` : (sug.cnae_fiscal || ''),
        rua: [sug.tipo_logradouro, sug.logradouro].filter(Boolean).join(' ') || '',
        numero: sug.numero || '',
        bairro: sug.bairro || '',
        cidade: sug.municipio || '',
        uf: sug.uf || 'MG',
        telefone: sug.telefone || '',
      });
    }
    setShowSuggestions(false);
    setCnpjStatus(null);
  };

  // Auto-fill from CNPJ when 14 digits entered
  const handleCnpjChange = (value) => {
    setFormData(prev => ({ ...prev, cnpj: value }));
    setCnpjStatus(null);

    const digits = value.replace(/[^\d]/g, '');
    clearTimeout(cnpjDebounceRef.current);

    if (digits.length === 14) {
      cnpjDebounceRef.current = setTimeout(async () => {
        setCnpjLoading(true);
        try {
          const data = await buscarCNPJ(digits);
          setFormData(prev => ({
            ...prev,
            nome_fantasia: data.fantasia || data.nome || prev.nome_fantasia,
            razao_social: data.nome || prev.razao_social,
            cnae: data.atividade || prev.cnae,
            rua: data.raw?.logradouro || prev.rua,
            numero: data.raw?.numero || prev.numero,
            bairro: data.bairro || prev.bairro,
            cidade: data.municipio || prev.cidade,
            uf: data.uf || prev.uf,
            telefone: data.telefone || prev.telefone,
          }));
          setCnpjStatus('success');
          addToast('Dados do CNPJ preenchidos automaticamente!', 'success');
        } catch (e) {
          setCnpjStatus('error');
        } finally {
          setCnpjLoading(false);
        }
      }, 200);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Clientes</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie sua base de clientes</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition shadow-md">
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? 'Cancelar' : 'Novo Cliente'}
        </button>
      </div>

      {/* Form Novo Cliente */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Cadastrar Novo Cliente</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Nome Fantasia - with autocomplete */}
            <div className="relative" ref={suggestionsRef}>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome Fantasia *</label>
              <input
                type="text"
                value={formData.nome_fantasia}
                onChange={e => handleNomeChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                required
                placeholder="Digite para buscar sugestoes..."
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600
                  bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200
                  focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
              />
              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 max-h-64 overflow-y-auto">
                  {suggestions.map((sug, i) => {
                    const nome = sug.source === 'cache'
                      ? (sug.fantasia || sug.nome)
                      : (sug.nome_fantasia || sug.razao_social);
                    const cnpj = sug.cnpj || '';
                    return (
                      <button key={i} type="button" onClick={() => selectSuggestion(sug)}
                        className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition border-b border-slate-100 dark:border-slate-700 last:border-0
                          ${sug.jaCliente ? 'opacity-60' : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{nome}</p>
                            <p className="text-xs text-slate-400 truncate">{cnpj}</p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {sug.jaCliente && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-medium">
                                <BookmarkCheck size={10} /> Ja cadastrado
                              </span>
                            )}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium
                              ${sug.source === 'cache'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                              }`}>
                              {sug.source === 'cache' ? 'Recente' : 'CNPJ DB'}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Razao Social */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Razao Social</label>
              <input type="text" value={formData.razao_social}
                onChange={e => setFormData(prev => ({ ...prev, razao_social: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600
                  bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200
                  focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition" />
            </div>

            {/* CNPJ - with auto-fill */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                CNPJ
                {cnpjLoading && <Loader2 size={14} className="animate-spin text-brand-500" />}
                {cnpjStatus === 'success' && <CheckCircle2 size={14} className="text-emerald-500" />}
                {cnpjStatus === 'error' && <X size={14} className="text-red-400" />}
              </label>
              <input type="text" value={formData.cnpj}
                onChange={e => handleCnpjChange(e.target.value)}
                placeholder="Digite 14 digitos para busca automatica"
                className={`w-full px-3 py-2 text-sm rounded-xl border transition
                  bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200
                  ${cnpjStatus === 'success' ? 'border-emerald-400 ring-1 ring-emerald-200' :
                    cnpjStatus === 'error' ? 'border-red-400 ring-1 ring-red-200' :
                    'border-slate-300 dark:border-slate-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500'}`} />
            </div>

            {/* Remaining fields */}
            {[
              { name: 'cnae', label: 'CNAE' },
              { name: 'rua', label: 'Rua' },
              { name: 'numero', label: 'Numero' },
              { name: 'bairro', label: 'Bairro' },
              { name: 'cidade', label: 'Cidade' },
              { name: 'uf', label: 'UF' },
              { name: 'telefone', label: 'Telefone' },
            ].map(field => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{field.label}</label>
                <input
                  type="text"
                  value={formData[field.name]}
                  onChange={e => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600
                    bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200
                    focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                />
              </div>
            ))}
            <div className="md:col-span-2 lg:col-span-3 flex justify-end">
              <button type="submit"
                className="px-6 py-2.5 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition">
                Cadastrar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input type="text" placeholder="Buscar por nome..."
            value={filtros.nome} onChange={e => setFiltros(p => ({ ...p, nome: e.target.value }))}
            className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600
              bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400" />
          <input type="text" placeholder="Cidade..."
            value={filtros.cidade} onChange={e => setFiltros(p => ({ ...p, cidade: e.target.value }))}
            className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600
              bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400" />
          <input type="text" placeholder="CNPJ..."
            value={filtros.cnpj} onChange={e => setFiltros(p => ({ ...p, cnpj: e.target.value }))}
            className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600
              bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400" />
          <button type="submit"
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-xl
              bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300
              hover:bg-slate-200 dark:hover:bg-slate-600 font-medium transition">
            <Search size={16} /> Buscar
          </button>
        </form>
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                {['Cliente', 'CNPJ', 'Cidade', 'Telefone', 'Acoes'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                [1,2,3].map(i => (
                  <tr key={i}>
                    {[1,2,3,4,5].map(j => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : clientes.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">Nenhum cliente encontrado</td></tr>
              ) : (
                clientes.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{c.nome_fantasia || c.razao_social}</p>
                      {c.razao_social && c.nome_fantasia && (
                        <p className="text-xs text-slate-400">{c.razao_social}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400">{c.cnpj || '-'}</td>
                    <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400">{c.cidade || '-'}</td>
                    <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400">{c.telefone || '-'}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => handleDelete(c.id, c.nome_fantasia)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center
                          text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
