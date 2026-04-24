/**
 * Garantias — Central de Remarketing de Garantias
 *
 * Lista todos os laudos com garantia vencida ou próxima do vencimento.
 * Permite agendar retorno diretamente para a Agenda via deep link.
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CalendarDays, Phone, RefreshCw, Search, X,
  AlertTriangle, Clock, CheckCircle2, ChevronDown, ChevronUp,
  Bug, MapPin,
} from 'lucide-react';
import { api } from '../services/api';
import { saveCliente } from '../services/clienteCache';
import { registrarDocumentoNaAgenda } from '../services/agendaService';

// ─── helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ dias }) {
  if (dias < 0) return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
      <AlertTriangle size={10} /> Vencida há {Math.abs(dias)}d
    </span>
  );
  if (dias <= 7) return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
      <Clock size={10} /> Vence em {dias}d
    </span>
  );
  if (dias <= 15) return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
      <Clock size={10} /> Vence em {dias}d
    </span>
  );
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
      <CheckCircle2 size={10} /> Vence em {dias}d
    </span>
  );
}

const FILTROS = [
  { value: 'todas',    label: 'Todas'        },
  { value: 'vencidas', label: 'Vencidas'     },
  { value: '7dias',    label: 'Urgente ≤7d'  },
  { value: '15dias',   label: '≤ 15 dias'    },
  { value: '30dias',   label: '≤ 30 dias'    },
];

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Garantias() {
  const navigate = useNavigate();
  const [dados, setDados]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filtro, setFiltro]     = useState('todas');
  const [busca, setBusca]       = useState('');
  const [expandidos, setExpandidos] = useState({});

  const carregar = () => {
    setLoading(true);
    api.get('/api/documentos/vencimentos?dias=365')
      .then(r => {
        const lista = Array.isArray(r.data) ? r.data : [];
        setDados(lista);

        // ── Integração automática ────────────────────────────────────────────
        // Para cada laudo com garantia, sincroniza o cliente no cache e
        // registra o evento na Agenda (sem duplicatas — registrarDocumentoNaAgenda
        // verifica se já existe antes de inserir)
        // Sincronização assíncrona: fire-and-forget (não bloqueia a UI)
        lista.forEach(async (item) => {
          try {
            if (item.cnpj || item.nome_cliente) {
              const cliente = {
                nome:     item.nome_cliente || item.fantasia || '',
                fantasia: item.fantasia     || '',
                cnpj:     item.cnpj         || '',
                telefone: item.telefone     || '',
                endereco: item.endereco     || '',
              };
              await saveCliente(cliente);

              // Converter data execução de DD/MM/YYYY → YYYY-MM-DD para a Agenda
              let dataAgenda = item.data_execucao || '';
              if (dataAgenda.includes('/')) {
                const [d, m, y] = dataAgenda.split('/');
                dataAgenda = `${y}-${m}-${d}`;
              }
              await registrarDocumentoNaAgenda(
                'laudo',
                cliente,
                dataAgenda,
                item.laudo_numero || ''
              );
            }
          } catch { /* silencioso */ }
        });
      })
      .catch(() => setDados([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const dadosFiltrados = useMemo(() => {
    let lista = [...dados];

    // Filtro por chip
    if (filtro === 'vencidas') lista = lista.filter(d => d.dias_restantes < 0);
    else if (filtro === '7dias')  lista = lista.filter(d => d.dias_restantes >= 0 && d.dias_restantes <= 7);
    else if (filtro === '15dias') lista = lista.filter(d => d.dias_restantes >= 0 && d.dias_restantes <= 15);
    else if (filtro === '30dias') lista = lista.filter(d => d.dias_restantes >= 0 && d.dias_restantes <= 30);

    // Filtro por busca textual
    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      lista = lista.filter(d =>
        (d.nome_cliente || '').toLowerCase().includes(q) ||
        (d.fantasia     || '').toLowerCase().includes(q) ||
        (d.cnpj         || '').includes(q)
      );
    }

    return lista;
  }, [dados, filtro, busca]);

  const toggleExpandido = (idx) => setExpandidos(p => ({ ...p, [idx]: !p[idx] }));

  const handleAgendarRetorno = (item) => {
    navigate('/agenda', {
      state: {
        cliente: {
          nome:     item.nome_cliente || item.fantasia || '',
          fantasia: item.fantasia     || '',
          cnpj:     item.cnpj         || '',
          telefone: item.telefone     || '',
          endereco: item.endereco     || '',
        },
      },
    });
  };

  // Contadores para os chips
  const contadores = useMemo(() => ({
    vencidas: dados.filter(d => d.dias_restantes < 0).length,
    '7dias':  dados.filter(d => d.dias_restantes >= 0 && d.dias_restantes <= 7).length,
    '15dias': dados.filter(d => d.dias_restantes >= 0 && d.dias_restantes <= 15).length,
    '30dias': dados.filter(d => d.dias_restantes >= 0 && d.dias_restantes <= 30).length,
  }), [dados]);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Bell size={24} className="text-orange-500" />
            Central de Garantias
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Remarketing de garantias — acompanhe e agende retornos
          </p>
        </div>
        <button
          onClick={carregar}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 border border-red-100 dark:border-red-800/30">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{contadores.vencidas}</p>
          <p className="text-xs font-medium text-red-500 mt-0.5">Vencidas</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-4 border border-orange-100 dark:border-orange-800/30">
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{contadores['7dias']}</p>
          <p className="text-xs font-medium text-orange-500 mt-0.5">Urgentes ≤7 dias</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-4 border border-yellow-100 dark:border-yellow-800/30">
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{contadores['15dias']}</p>
          <p className="text-xs font-medium text-yellow-500 mt-0.5">Vencem em ≤15d</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800/30">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{dados.length}</p>
          <p className="text-xs font-medium text-blue-500 mt-0.5">Total no período</p>
        </div>
      </div>

      {/* Busca + Chips de filtro */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar cliente..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition"
          />
          {busca && (
            <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {FILTROS.map(f => {
            const count = f.value !== 'todas' ? contadores[f.value] : dados.length;
            const ativo = filtro === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFiltro(f.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border ${
                  ativo
                    ? f.value === 'vencidas' ? 'bg-red-500 border-red-500 text-white'
                    : f.value === '7dias'    ? 'bg-orange-500 border-orange-500 text-white'
                    : f.value === '15dias'   ? 'bg-yellow-500 border-yellow-500 text-white'
                    : 'bg-brand-500 border-brand-500 text-white'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                {f.label}
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    ativo ? 'bg-white/30 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabela / Lista */}
      {loading ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-2/5" />
                <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/3" />
              </div>
              <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      ) : dadosFiltrados.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
            <Bell size={28} className="text-slate-400" />
          </div>
          <p className="font-bold text-slate-600 dark:text-slate-300">Nenhuma garantia encontrada</p>
          <p className="text-sm text-slate-400 mt-1">
            {filtro === 'todas'
              ? 'Nenhum laudo com garantia no período analisado.'
              : 'Sem registros para este filtro.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Cabeçalho da tabela — desktop */}
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Cliente</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Serviço / Laudo</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Vencimento</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Status</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Ação</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {dadosFiltrados.map((item, idx) => {
              const exp = expandidos[idx];
              const pragas = Array.isArray(item.pragas) ? item.pragas.join(', ') : '';

              return (
                <div key={idx} className={`px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition ${
                  item.dias_restantes < 0 ? 'border-l-4 border-l-red-400' :
                  item.dias_restantes <= 7 ? 'border-l-4 border-l-orange-400' : ''
                }`}>

                  {/* Layout desktop: grid */}
                  <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center">

                    {/* Cliente */}
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-800 dark:text-white truncate">
                        {item.nome_cliente || item.fantasia || '—'}
                      </p>
                      {item.fantasia && item.fantasia !== item.nome_cliente && (
                        <p className="text-xs text-slate-400 truncate">{item.fantasia}</p>
                      )}
                      {item.cnpj && (
                        <p className="text-[11px] font-mono text-slate-400">{item.cnpj}</p>
                      )}
                    </div>

                    {/* Serviço */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                        <Bug size={11} className="shrink-0" />
                        <span className="truncate">{pragas || 'Controle de Pragas'}</span>
                      </div>
                      {item.laudo_numero && (
                        <p className="text-[11px] text-slate-400 mt-0.5">Laudo #{item.laudo_numero}</p>
                      )}
                    </div>

                    {/* Vencimento */}
                    <div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{item.data_vencimento}</p>
                      <p className="text-[11px] text-slate-400">Exec: {item.data_execucao}</p>
                    </div>

                    {/* Status */}
                    <div>
                      <StatusBadge dias={item.dias_restantes} />
                    </div>

                    {/* Ação */}
                    <button
                      onClick={() => handleAgendarRetorno(item)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 hover:bg-brand-100 transition whitespace-nowrap"
                    >
                      <CalendarDays size={13} /> Agendar Retorno
                    </button>
                  </div>

                  {/* Layout mobile: stacked */}
                  <div className="md:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-800 dark:text-white truncate">
                          {item.nome_cliente || item.fantasia || '—'}
                        </p>
                        {item.cnpj && (
                          <p className="text-[11px] font-mono text-slate-400">{item.cnpj}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <StatusBadge dias={item.dias_restantes} />
                          <span className="text-xs text-slate-500">Vence {item.data_vencimento}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleExpandido(idx)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition shrink-0"
                      >
                        {exp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>

                    {exp && (
                      <div className="mt-3 space-y-2">
                        {pragas && (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Bug size={12} /> {pragas}
                          </div>
                        )}
                        {item.endereco && (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <MapPin size={12} /> {item.endereco}
                          </div>
                        )}
                        <p className="text-xs text-slate-500">Executado em: {item.data_execucao}</p>
                      </div>
                    )}

                    <button
                      onClick={() => handleAgendarRetorno(item)}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 hover:bg-brand-100 transition"
                    >
                      <CalendarDays size={13} /> Agendar Retorno
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-400">
              {dadosFiltrados.length} registro{dadosFiltrados.length !== 1 ? 's' : ''} exibido{dadosFiltrados.length !== 1 ? 's' : ''}
              {filtro !== 'todas' && ` (filtro: ${FILTROS.find(f => f.value === filtro)?.label})`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
