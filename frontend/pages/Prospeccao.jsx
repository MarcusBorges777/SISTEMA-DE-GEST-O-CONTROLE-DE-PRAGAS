import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Target, Search, Building2, TrendingUp, UserPlus, Phone, MapPin, Sparkles, ChevronLeft, ChevronRight, Filter, Loader2, CheckCircle2, FileText } from 'lucide-react';
import { fetchProspeccaoStats, fetchProspeccaoSegmentos, fetchProspeccaoBuscaGlobal, fetchProspeccaoEmpresas, createCliente } from '../services/api';
import { useToast } from '../components/shared/Toast';
import { useNavigate } from 'react-router-dom';

export default function Prospeccao() {
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [segmentos, setSegmentos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [totalGeral, setTotalGeral] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [addingId, setAddingId] = useState(null); // CNPJ being added as client
  const [addedIds, setAddedIds] = useState(new Set()); // CNPJs already added

  const [filtros, setFiltros] = useState({
    termo: '',
    segmentoId: null,
    apenas_leads_frescos: false,
    offset: 0,
    limite: 30,
  });

  const searchTimeout = useRef(null);
  const searchInputRef = useRef(null);

  // Load stats + segments on mount
  useEffect(() => {
    const load = async () => {
      setStatsLoading(true);
      try {
        const [statsData, segData] = await Promise.allSettled([
          fetchProspeccaoStats(),
          fetchProspeccaoSegmentos(),
        ]);
        if (statsData.status === 'fulfilled') setStats(statsData.value);
        if (segData.status === 'fulfilled') {
          const segs = Array.isArray(segData.value) ? segData.value : segData.value.segmentos || [];
          setSegmentos(segs);
        }
      } catch (e) {
        addToast('Erro ao carregar dados de prospeccao', 'error');
      } finally {
        setStatsLoading(false);
      }
    };
    load();
  }, []);

  // Search when filters change
  const buscar = useCallback(async (f) => {
    setLoading(true);
    try {
      let data;
      if (f.segmentoId) {
        data = await fetchProspeccaoEmpresas(f.segmentoId, {
          limite: f.limite,
          offset: f.offset,
          termo: f.termo || undefined,
        });
      } else {
        data = await fetchProspeccaoBuscaGlobal({
          termo: f.termo || undefined,
          apenas_leads_frescos: f.apenas_leads_frescos || undefined,
          limite: f.limite,
          offset: f.offset,
        });
      }
      setEmpresas(data.empresas || []);
      setTotalGeral(data.total_geral || data.total || 0);
    } catch (e) {
      addToast('Erro na busca', 'error');
      setEmpresas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger search on filter changes (debounced for text)
  useEffect(() => {
    buscar(filtros);
  }, [filtros.segmentoId, filtros.apenas_leads_frescos, filtros.offset]);

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
    setFiltros(prev => ({
      ...prev,
      segmentoId: prev.segmentoId === id ? null : id,
      offset: 0,
    }));
  };

  const toggleLeadsFrescos = () => {
    setFiltros(prev => ({
      ...prev,
      apenas_leads_frescos: !prev.apenas_leads_frescos,
      segmentoId: null,
      offset: 0,
    }));
  };

  // Add prospect as client
  const addAsCliente = async (empresa) => {
    const cnpj = empresa.cnpj;
    setAddingId(cnpj);
    try {
      const end = empresa.endereco || {};
      await createCliente({
        nome_fantasia: empresa.nome_fantasia || empresa.razao_social || '',
        razao_social: empresa.razao_social || '',
        cnpj: cnpj,
        cnae: empresa.cnae_descricao ? `${empresa.cnae} - ${empresa.cnae_descricao}` : empresa.cnae || '',
        rua: [end.tipo_logradouro, end.logradouro].filter(Boolean).join(' '),
        numero: end.numero || '',
        bairro: end.bairro || '',
        cidade: end.municipio || 'Divinopolis',
        uf: end.uf || 'MG',
        telefone: empresa.telefone || '',
      });
      setAddedIds(prev => new Set([...prev, cnpj]));
      addToast(`${empresa.nome_fantasia || empresa.razao_social} adicionado como cliente!`, 'success');
    } catch (e) {
      addToast('Erro ao adicionar cliente', 'error');
    } finally {
      setAddingId(null);
    }
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statsLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 animate-pulse">
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          ))
        ) : stats ? (
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
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats.total_segmentos_estrategicos || 0}
              </p>
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
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats.leads_frescos_90_dias || 0}
              </p>
              <p className="text-xs text-slate-400 mt-1">Abertos nos ultimos 90 dias</p>
            </button>
          </>
        ) : null}
      </div>

      {/* Search + Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={filtros.termo}
              onChange={e => handleSearchInput(e.target.value)}
              placeholder="Buscar por nome, CNPJ, endereco..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-600
                bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400
                focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
            />
          </div>
          <button type="submit"
            className="px-5 py-2.5 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition text-sm">
            Buscar
          </button>
        </form>

        {/* Segment chips */}
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
                  filtros.segmentoId === seg.id
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400'
                }`}>
                  {seg.total_empresas || 0}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Active filters */}
        {(filtros.apenas_leads_frescos || filtros.segmentoId) && (
          <div className="flex items-center gap-2 mt-3 text-xs text-slate-500 dark:text-slate-400">
            <Filter size={12} />
            {filtros.apenas_leads_frescos && (
              <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                Leads Frescos
              </span>
            )}
            {filtros.segmentoId && (
              <span className="bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 px-2 py-0.5 rounded-full">
                {segmentos.find(s => s.id === filtros.segmentoId)?.titulo || filtros.segmentoId}
              </span>
            )}
            <button onClick={() => setFiltros(prev => ({ ...prev, segmentoId: null, apenas_leads_frescos: false, offset: 0 }))}
              className="text-red-400 hover:text-red-500 underline ml-1">
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Results header */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {loading ? 'Buscando...' : `${totalGeral.toLocaleString('pt-BR')} empresas encontradas`}
          </p>
          {totalPages > 1 && (
            <p className="text-xs text-slate-400">Pagina {currentPage} de {totalPages}</p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                {['Empresa', 'CNPJ', 'Segmento', 'Bairro', 'Telefone', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i}>
                    {[1, 2, 3, 4, 5, 6].map(j => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : empresas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <Search size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {filtros.termo ? 'Nenhuma empresa encontrada para essa busca' : 'Use a busca ou selecione um segmento para comecar'}
                    </p>
                  </td>
                </tr>
              ) : (
                empresas.map((emp, i) => {
                  const cnpj = emp.cnpj || '';
                  const isAdded = addedIds.has(cnpj);
                  const isAdding = addingId === cnpj;
                  const end = emp.endereco || {};

                  return (
                    <tr key={cnpj || i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition group">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {emp.nome_fantasia || emp.razao_social}
                        </p>
                        {emp.nome_fantasia && emp.razao_social && emp.nome_fantasia !== emp.razao_social && (
                          <p className="text-xs text-slate-400 truncate max-w-[250px]">{emp.razao_social}</p>
                        )}
                        {emp.lead_fresco && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mt-1">
                            <Sparkles size={10} /> Novo ({emp.dias_desde_abertura}d)
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono text-xs">{cnpj}</td>
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
                              <button onClick={() => navigate('/documentos?tab=laudo')}
                                title="Gerar documento"
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition">
                                <FileText size={15} />
                              </button>
                            </>
                          ) : (
                            <button onClick={() => addAsCliente(emp)} disabled={isAdding}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                                bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition
                                opacity-0 group-hover:opacity-100">
                              {isAdding ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                              {isAdding ? 'Adicionando...' : 'Adicionar Cliente'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setFiltros(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limite) }))}
              disabled={filtros.offset === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-slate-100 dark:bg-slate-700
                text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600
                disabled:opacity-40 disabled:cursor-not-allowed transition">
              <ChevronLeft size={16} /> Anterior
            </button>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {filtros.offset + 1} - {Math.min(filtros.offset + filtros.limite, totalGeral)} de {totalGeral.toLocaleString('pt-BR')}
            </span>
            <button
              onClick={() => setFiltros(prev => ({ ...prev, offset: prev.offset + prev.limite }))}
              disabled={filtros.offset + filtros.limite >= totalGeral}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-slate-100 dark:bg-slate-700
                text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600
                disabled:opacity-40 disabled:cursor-not-allowed transition">
              Proximo <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
