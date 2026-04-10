import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Target, Search, Building2, TrendingUp, UserPlus, Phone, MapPin, Sparkles, ChevronLeft, ChevronRight, Filter, Loader2, CheckCircle2, FileText, Globe, Mail, Hash, AlertTriangle, Calendar, DollarSign, Briefcase, BadgeCheck, Users } from 'lucide-react';
import { fetchProspeccaoStats, fetchProspeccaoSegmentos, fetchProspeccaoBuscaGlobal, fetchProspeccaoEmpresas, createCliente } from '../services/api';
import { buscarCNPJ } from '../services/brasilApi';
import { useToast } from '../components/shared/Toast';
import { useNavigate } from 'react-router-dom';
import { useEmpresa, normalizeCliente } from '../contexts/EmpresaContext';

// Formata CNPJ enquanto digita
function formatCnpj(value) {
  const d = value.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`;
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
}

export default function Prospeccao() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { setEmpresa } = useEmpresa();

  // Search mode: 'nome' (local DB) or 'cnpj' (Brasil API)
  const [searchMode, setSearchMode] = useState('nome');
  const [dbIndisponivel, setDbIndisponivel] = useState(false);

  // Local DB search state
  const [stats, setStats] = useState(null);
  const [segmentos, setSegmentos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [totalGeral, setTotalGeral] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

  // CNPJ search state
  const [cnpjInput, setCnpjInput] = useState('');
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjResult, setCnpjResult] = useState(null);
  const [cnpjError, setCnpjError] = useState('');

  // Shared state
  const [addingId, setAddingId] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());

  const [filtros, setFiltros] = useState({
    termo: '',
    segmentoId: null,
    apenas_leads_frescos: false,
    offset: 0,
    limite: 30,
  });

  const searchTimeout = useRef(null);

  // Load stats + segments on mount
  useEffect(() => {
    const load = async () => {
      setStatsLoading(true);
      try {
        const [statsData, segData] = await Promise.allSettled([
          fetchProspeccaoStats(),
          fetchProspeccaoSegmentos(),
        ]);
        if (statsData.status === 'fulfilled') {
          setStats(statsData.value);
        } else {
          // DB provavelmente indisponível
          setDbIndisponivel(true);
          setSearchMode('cnpj');
        }
        if (segData.status === 'fulfilled') {
          const segs = Array.isArray(segData.value) ? segData.value : segData.value.segmentos || [];
          setSegmentos(segs);
        }
      } catch (e) {
        setDbIndisponivel(true);
        setSearchMode('cnpj');
      } finally {
        setStatsLoading(false);
      }
    };
    load();
  }, []);

  // Local DB search
  const buscar = useCallback(async (f) => {
    setLoading(true);
    try {
      let data;
      if (f.segmentoId) {
        data = await fetchProspeccaoEmpresas(f.segmentoId, {
          limite: f.limite, offset: f.offset, termo: f.termo || undefined,
        });
      } else {
        data = await fetchProspeccaoBuscaGlobal({
          termo: f.termo || undefined,
          apenas_leads_frescos: f.apenas_leads_frescos || undefined,
          limite: f.limite, offset: f.offset,
        });
      }
      setEmpresas(data.empresas || []);
      setTotalGeral(data.total_geral || data.total || 0);
      setDbIndisponivel(false);
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('503') || msg.includes('indisponivel') || msg.includes('indisponível')) {
        setDbIndisponivel(true);
        setSearchMode('cnpj');
        addToast('Banco de dados local indisponivel. Use a busca por CNPJ.', 'warning');
      } else {
        addToast('Erro na busca', 'error');
      }
      setEmpresas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchMode === 'nome' && !dbIndisponivel) {
      buscar(filtros);
    }
  }, [filtros.segmentoId, filtros.apenas_leads_frescos, filtros.offset, searchMode]);

  const handleSearchInput = (value) => {
    setFiltros(prev => ({ ...prev, termo: value, offset: 0 }));
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      buscar({ ...filtros, termo: value, offset: 0 });
    }, 400);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    clearTimeout(searchTimeout.current);
    buscar(filtros);
  };

  const selectSegmento = (id) => {
    setFiltros(prev => ({ ...prev, segmentoId: prev.segmentoId === id ? null : id, offset: 0 }));
  };

  const toggleLeadsFrescos = () => {
    setFiltros(prev => ({ ...prev, apenas_leads_frescos: !prev.apenas_leads_frescos, segmentoId: null, offset: 0 }));
  };

  // CNPJ search via Brasil API
  const handleCnpjSearch = async () => {
    const digits = cnpjInput.replace(/\D/g, '');
    if (digits.length !== 14) {
      setCnpjError('CNPJ deve conter 14 digitos');
      return;
    }
    setCnpjLoading(true);
    setCnpjError('');
    setCnpjResult(null);
    try {
      const data = await buscarCNPJ(digits);
      setCnpjResult(data);
    } catch (e) {
      setCnpjError(e.message || 'CNPJ nao encontrado');
    } finally {
      setCnpjLoading(false);
    }
  };

  // Add as client (works for both local DB and CNPJ results)
  const addAsCliente = async (empresa) => {
    const cnpj = empresa.cnpj || '';
    setAddingId(cnpj);
    try {
      // Suporte para ambos formatos: local DB (endereco object) e Brasil API (campos diretos)
      const end = (typeof empresa.endereco === 'object' && empresa.endereco !== null) ? empresa.endereco : {};
      await createCliente({
        nome_fantasia: empresa.nome_fantasia || empresa.fantasia || empresa.razao_social || empresa.nome || '',
        razao_social: empresa.razao_social || empresa.nome || '',
        cnpj: cnpj,
        cnae: empresa.cnae_descricao ? `${empresa.cnae_fiscal || empresa.cnae} - ${empresa.cnae_descricao}` : (empresa.atividade || empresa.cnae || ''),
        rua: empresa.logradouro || [end.tipo_logradouro, end.logradouro].filter(Boolean).join(' ') || '',
        numero: empresa.numero || end.numero || '',
        bairro: empresa.bairro || end.bairro || '',
        cidade: empresa.municipio || end.municipio || 'Divinopolis',
        uf: empresa.uf || end.uf || 'MG',
        telefone: empresa.telefone || '',
      });
      setAddedIds(prev => new Set([...prev, cnpj]));
      addToast(`Cliente adicionado com sucesso!`, 'success');
    } catch (e) {
      addToast('Erro ao adicionar cliente', 'error');
    } finally {
      setAddingId(null);
    }
  };

  // Add CNPJ result as client
  const addCnpjAsCliente = async () => {
    if (!cnpjResult) return;
    await addAsCliente(cnpjResult);
  };

  const totalPages = Math.ceil(totalGeral / filtros.limite);
  const currentPage = Math.floor(filtros.offset / filtros.limite) + 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <Target className="text-brand-500" size={28} /> Prospeccao
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Encontre empresas e transforme em clientes</p>
      </div>

      {/* Stats (only when DB available) */}
      {!dbIndisponivel && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statsLoading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 animate-pulse">
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
                <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            ))
          ) : stats && (
            <>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 border-l-4 border-l-blue-500">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
                  <Building2 size={16} className="text-blue-500" /> Total Empresas
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {(stats.total_empresas_divinopolis || 0).toLocaleString('pt-BR')}
                </p>
                <p className="text-xs text-slate-400 mt-1">Divinopolis - MG</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 border-l-4 border-l-purple-500">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
                  <Target size={16} className="text-purple-500" /> Segmentos
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total_segmentos_estrategicos || 0}</p>
                <p className="text-xs text-slate-400 mt-1">Estrategicos (ANVISA)</p>
              </div>
              <button onClick={toggleLeadsFrescos}
                className={`text-left rounded-2xl p-5 border border-l-4 transition
                  ${filtros.apenas_leads_frescos
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 border-l-emerald-500'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 border-l-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10'
                  }`}>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
                  <TrendingUp size={16} className="text-emerald-500" /> Leads Frescos
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.leads_frescos_90_dias || 0}</p>
                <p className="text-xs text-slate-400 mt-1">Abertos nos ultimos 90 dias</p>
              </button>
            </>
          )}
        </div>
      )}

      {/* Search Mode Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex gap-2 mb-4">
          <button onClick={() => setSearchMode('nome')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition
              ${searchMode === 'nome'
                ? 'bg-brand-500 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}>
            <Search size={15} /> Busca por Nome
          </button>
          <button onClick={() => setSearchMode('cnpj')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition
              ${searchMode === 'cnpj'
                ? 'bg-brand-500 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}>
            <Globe size={15} /> Busca por CNPJ (Brasil API)
          </button>
        </div>

        {/* DB Warning */}
        {dbIndisponivel && searchMode === 'nome' && (
          <div className="flex items-center gap-3 p-4 mb-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm">
            <AlertTriangle size={18} className="flex-shrink-0" />
            <div>
              <p className="font-medium">Banco de dados local indisponivel</p>
              <p className="text-xs mt-0.5 opacity-80">Use a <button onClick={() => setSearchMode('cnpj')} className="underline font-medium">busca por CNPJ</button> para consultar empresas via Brasil API.</p>
            </div>
          </div>
        )}

        {/* Nome Search */}
        {searchMode === 'nome' && (
          <>
            <form onSubmit={handleSearchSubmit} className="flex gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={filtros.termo}
                  onChange={e => handleSearchInput(e.target.value)}
                  placeholder="Buscar por nome, CNPJ, endereco..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-600
                    bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400
                    focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition" />
              </div>
              <button type="submit" className="px-5 py-2.5 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition text-sm">
                Buscar
              </button>
            </form>

            {segmentos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {segmentos.map(seg => (
                  <button key={seg.id} onClick={() => selectSegmento(seg.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition
                      ${filtros.segmentoId === seg.id
                        ? 'bg-brand-500 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}>
                    {seg.titulo}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      filtros.segmentoId === seg.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400'
                    }`}>{seg.total_empresas || 0}</span>
                  </button>
                ))}
              </div>
            )}

            {(filtros.apenas_leads_frescos || filtros.segmentoId) && (
              <div className="flex items-center gap-2 mt-3 text-xs text-slate-500 dark:text-slate-400">
                <Filter size={12} />
                {filtros.apenas_leads_frescos && (
                  <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">Leads Frescos</span>
                )}
                {filtros.segmentoId && (
                  <span className="bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 px-2 py-0.5 rounded-full">
                    {segmentos.find(s => s.id === filtros.segmentoId)?.titulo}
                  </span>
                )}
                <button onClick={() => setFiltros(prev => ({ ...prev, segmentoId: null, apenas_leads_frescos: false, offset: 0 }))}
                  className="text-red-400 hover:text-red-500 underline ml-1">Limpar</button>
              </div>
            )}
          </>
        )}

        {/* CNPJ Search */}
        {searchMode === 'cnpj' && (
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Consulte dados de qualquer empresa do Brasil em tempo real pela <strong>Brasil API</strong> (Receita Federal).
            </p>
            <form onSubmit={e => { e.preventDefault(); handleCnpjSearch(); }} className="flex gap-3">
              <div className="relative flex-1">
                <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={cnpjInput}
                  onChange={e => { setCnpjInput(formatCnpj(e.target.value)); setCnpjError(''); }}
                  placeholder="00.000.000/0000-00"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-600
                    bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400
                    focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition font-mono" />
              </div>
              <button type="submit" disabled={cnpjLoading}
                className="px-5 py-2.5 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 disabled:opacity-50 transition text-sm flex items-center gap-2">
                {cnpjLoading ? <Loader2 size={15} className="animate-spin" /> : <Globe size={15} />}
                Consultar
              </button>
            </form>
            {cnpjError && (
              <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                <AlertTriangle size={12} /> {cnpjError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* CNPJ Result Card - Moderno e Completo */}
      {searchMode === 'cnpj' && cnpjResult && (() => {
        const r = cnpjResult;
        const situacaoColor = (r.situacao_cadastral || '').toLowerCase().includes('ativa')
          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
        const capitalFormatado = r.capital_social
          ? `R$ ${Number(r.capital_social).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          : '-';
        const dataAbertura = r.data_inicio_atividade
          ? r.data_inicio_atividade.split('-').reverse().join('/')
          : '-';

        return (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Header com gradient */}
            <div className="px-6 py-5 bg-gradient-to-r from-brand-500 via-blue-600 to-indigo-600 relative">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold text-white leading-tight">
                    {r.fantasia || r.nome}
                  </h3>
                  {r.fantasia && r.nome && r.fantasia !== r.nome && (
                    <p className="text-blue-100 text-sm mt-1 opacity-90">{r.nome}</p>
                  )}
                </div>
                {r.situacao_cadastral && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${situacaoColor} flex-shrink-0 ml-4`}>
                    <BadgeCheck size={14} /> {r.situacao_cadastral}
                  </span>
                )}
              </div>
              {r.atividade && (
                <p className="text-blue-200 text-xs mt-2 opacity-80">{r.atividade}</p>
              )}
            </div>

            <div className="p-6 space-y-6">
              {/* Grid de Informacoes Principais */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3.5 border border-slate-100 dark:border-slate-600">
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-1.5">
                    <Hash size={13} /> CNPJ
                  </div>
                  <p className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200">{formatCnpj(r.cnpj)}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3.5 border border-slate-100 dark:border-slate-600">
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-1.5">
                    <Calendar size={13} /> Data de Abertura
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{dataAbertura}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3.5 border border-slate-100 dark:border-slate-600">
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-1.5">
                    <DollarSign size={13} /> Capital Social
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{capitalFormatado}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3.5 border border-slate-100 dark:border-slate-600">
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-1.5">
                    <Briefcase size={13} /> Natureza Juridica
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{r.natureza_juridica || '-'}</p>
                </div>
              </div>

              {/* Endereco + Contatos lado a lado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Bloco Endereco */}
                <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30">
                  <h4 className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-3">
                    <MapPin size={14} /> Endereco
                  </h4>
                  <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                    {r.logradouro && (
                      <p className="font-medium">{r.logradouro}{r.numero ? `, N° ${r.numero}` : ''}</p>
                    )}
                    {r.complemento && <p className="text-slate-500">{r.complemento}</p>}
                    {r.bairro && <p>{r.bairro}</p>}
                    <p className="font-medium">
                      {[r.municipio, r.uf].filter(Boolean).join('/')}
                      {r.cep && <span className="text-slate-400 ml-2">CEP {r.cep}</span>}
                    </p>
                  </div>
                </div>

                {/* Bloco Contatos */}
                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900/30">
                  <h4 className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-3">
                    <Phone size={14} /> Contatos
                  </h4>
                  <div className="space-y-2.5">
                    {r.telefone ? (
                      <div className="flex items-center gap-2.5">
                        <Phone size={15} className="text-emerald-500 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-slate-400">Telefone Principal</p>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{r.telefone}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">Nenhum telefone registrado</p>
                    )}
                    {r.telefone2 && (
                      <div className="flex items-center gap-2.5">
                        <Phone size={15} className="text-emerald-500 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-slate-400">Telefone Secundario</p>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{r.telefone2}</p>
                        </div>
                      </div>
                    )}
                    {r.email && (
                      <div className="flex items-center gap-2.5">
                        <Mail size={15} className="text-emerald-500 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-slate-400">E-mail</p>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 break-all">{r.email}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Info extras: Porte + Socios */}
              {(r.porte || (r.qsa && r.qsa.length > 0)) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {r.porte && (
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 border border-slate-100 dark:border-slate-600">
                      <Building2 size={18} className="text-purple-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-400 font-medium">Porte da Empresa</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{r.porte}</p>
                      </div>
                    </div>
                  )}
                  {r.qsa && r.qsa.length > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 border border-slate-100 dark:border-slate-600">
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-2">
                        <Users size={13} /> Quadro Societario ({r.qsa.length})
                      </div>
                      <div className="space-y-1.5 max-h-24 overflow-y-auto">
                        {r.qsa.slice(0, 5).map((socio, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{socio.nome_socio}</span>
                            <span className="text-slate-400 text-[10px] flex-shrink-0 ml-2">{socio.qualificacao_socio}</span>
                          </div>
                        ))}
                        {r.qsa.length > 5 && (
                          <p className="text-[10px] text-slate-400 italic">+{r.qsa.length - 5} socios...</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Acoes */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                {addedIds.has(r.cnpj) ? (
                  <>
                    <span className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                      <CheckCircle2 size={18} /> Cliente adicionado!
                    </span>
                    <button onClick={() => { setEmpresa(normalizeCliente(r)); navigate('/documentos?tab=laudo'); }}
                      className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition shadow-md">
                      <FileText size={16} /> Gerar Documento
                    </button>
                  </>
                ) : (
                  <button onClick={addCnpjAsCliente} disabled={addingId === r.cnpj}
                    className="flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition shadow-lg shadow-brand-500/25">
                    {addingId === r.cnpj ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                    Adicionar como Cliente
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Results Table (Nome search mode) */}
      {searchMode === 'nome' && !dbIndisponivel && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {loading ? 'Buscando...' : `${totalGeral.toLocaleString('pt-BR')} empresas encontradas`}
            </p>
            {totalPages > 1 && <p className="text-xs text-slate-400">Pagina {currentPage} de {totalPages}</p>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  {['Empresa', 'CNPJ', 'Segmento', 'Bairro', 'Telefone', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {loading ? (
                  [1,2,3,4,5].map(i => (
                    <tr key={i}>{[1,2,3,4,5,6].map(j => (
                      <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4" /></td>
                    ))}</tr>
                  ))
                ) : empresas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <Search size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {filtros.termo ? 'Nenhuma empresa encontrada' : 'Use a busca ou selecione um segmento'}
                      </p>
                    </td>
                  </tr>
                ) : empresas.map((emp, i) => {
                  const cnpj = emp.cnpj || '';
                  const isAdded = addedIds.has(cnpj);
                  const isAdding = addingId === cnpj;
                  const end = emp.endereco || {};

                  return (
                    <tr key={cnpj || i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition group">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{emp.nome_fantasia || emp.razao_social}</p>
                        {emp.nome_fantasia && emp.razao_social && emp.nome_fantasia !== emp.razao_social && (
                          <p className="text-xs text-slate-400 truncate max-w-[250px]">{emp.razao_social}</p>
                        )}
                        {emp.lead_fresco && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mt-1">
                            <Sparkles size={10} /> Novo ({emp.dias_desde_abertura}d)
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{cnpj}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-medium">
                          {emp.segmento || emp.cnae_descricao || emp.cnae || '-'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400">{end.bairro || '-'}</td>
                      <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400">{emp.telefone || '-'}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          {isAdded ? (
                            <>
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                <CheckCircle2 size={14} /> Adicionado
                              </span>
                              <button onClick={() => { setEmpresa(normalizeCliente(emp)); navigate('/documentos?tab=laudo'); }} title="Gerar documento"
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition">
                                <FileText size={15} />
                              </button>
                            </>
                          ) : (
                            <button onClick={() => addAsCliente(emp)} disabled={isAdding}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                                bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition
                                opacity-100 md:opacity-0 md:group-hover:opacity-100">
                              {isAdding ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                              {isAdding ? 'Adicionando...' : 'Adicionar Cliente'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setFiltros(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limite) }))}
                disabled={filtros.offset === 0}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40 transition">
                <ChevronLeft size={16} /> Anterior
              </button>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {filtros.offset + 1} - {Math.min(filtros.offset + filtros.limite, totalGeral)} de {totalGeral.toLocaleString('pt-BR')}
              </span>
              <button onClick={() => setFiltros(prev => ({ ...prev, offset: prev.offset + prev.limite }))}
                disabled={filtros.offset + filtros.limite >= totalGeral}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40 transition">
                Proximo <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
