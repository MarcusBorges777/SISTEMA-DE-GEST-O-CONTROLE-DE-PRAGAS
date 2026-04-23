import React, { useState, useEffect, useId } from 'react';
import { AlertTriangle, Clock, CalendarX, CalendarCheck, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchGarantiasVencendo } from '../../services/api';

/**
 * GarantiaAlerts
 * Props:
 *   compact  boolean  — modo card compacto (ao lado dos stat cards)
 */
export default function GarantiaAlerts({ compact = false }) {
  const [data, setData]         = useState({ vencidas: [], esta_semana: [], proximas: [] });
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(false);
  const listId = useId();

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchGarantiasVencendo();
      setData({
        vencidas:     result.vencidas     || [],
        esta_semana:  result.esta_semana  || [],
        proximas:     result.proximas     || [],
      });
    } catch (e) {
      console.warn('Erro ao carregar garantias:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const total = data.vencidas.length + data.esta_semana.length + data.proximas.length;
  const semPendencias = !loading && total === 0;

  /* ── Modo compacto — card no mesmo grid dos StatCards ──────── */
  if (compact) {
    return (
      <section
        aria-label="Avisos de garantia"
        className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-lg p-5 text-white flex flex-col justify-between h-full"
      >
        {/* Topo */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">Avisos de Garantia</p>
              <p className="text-orange-100 text-xs leading-tight mt-0.5">
                {semPendencias ? 'Tudo em dia ✓' : 'Vencidas ou próximas'}
              </p>
            </div>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            aria-label={loading ? 'Atualizando...' : 'Atualizar garantias'}
            className="w-7 h-7 bg-white/20 hover:bg-white/30 active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed
              rounded-lg flex items-center justify-center flex-shrink-0
              transition-all duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
          </button>
        </div>

        {/* Total grande */}
        <p className="text-4xl font-bold tabular-nums mt-3 mb-2">
          {loading ? '—' : total}
        </p>

        {/* Sub-contadores */}
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: 'Vencidas',    value: data.vencidas.length },
            { label: 'Esta semana', value: data.esta_semana.length },
            { label: '30 dias',     value: data.proximas.length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/10 rounded-lg p-1.5 text-center">
              <p className="text-base font-bold tabular-nums">{loading ? '—' : value}</p>
              <p className="text-[10px] text-orange-100 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  /* ── Modo completo (legado / uso futuro) ───────────────────── */
  return (
    <section
      aria-label={`Avisos de garantia — ${loading ? 'carregando' : semPendencias ? 'nenhuma pendência' : `${total} cliente${total !== 1 ? 's' : ''}`}`}
      className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-lg p-6 text-white"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center" aria-hidden="true">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="font-bold text-lg">Avisos de Garantia</h3>
            <p className="text-orange-100 text-xs">
              {semPendencias ? 'Todas as garantias em dia ✓' : 'Clientes com garantia vencida ou próxima'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            aria-label={loading ? 'Atualizando garantias...' : 'Atualizar lista de garantias'}
            className="w-9 h-9 bg-white/20 hover:bg-white/30 active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed
              rounded-lg flex items-center justify-center
              transition-all duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
          </button>

          {total > 0 && (
            <button
              onClick={() => setExpanded(v => !v)}
              aria-expanded={expanded}
              aria-controls={listId}
              aria-label={expanded ? 'Recolher lista de garantias' : 'Expandir lista de garantias'}
              className="w-9 h-9 bg-white/20 hover:bg-white/30 active:scale-95
                rounded-lg flex items-center justify-center
                transition-all duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              {expanded
                ? <ChevronUp size={16} aria-hidden="true" />
                : <ChevronDown size={16} aria-hidden="true" />
              }
            </button>
          )}
        </div>
      </div>

      {/* Resumo de contadores */}
      <div className="grid grid-cols-3 gap-3 mb-4" role="group" aria-label="Resumo de garantias">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
          <p className="text-2xl font-bold tabular-nums">{loading ? '—' : data.vencidas.length}</p>
          <p className="text-xs text-orange-100">Vencidas</p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
          <p className="text-2xl font-bold tabular-nums">{loading ? '—' : data.esta_semana.length}</p>
          <p className="text-xs text-orange-100">Esta Semana</p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
          <p className="text-2xl font-bold tabular-nums">{loading ? '—' : data.proximas.length}</p>
          <p className="text-xs text-orange-100">Próx. 30 dias</p>
        </div>
      </div>

      {/* Lista expandida */}
      {expanded && !loading && (
        <div
          id={listId}
          aria-label="Lista de clientes com garantias"
          className="space-y-2 max-h-64 overflow-y-auto animate-[slideUp_0.2s_cubic-bezier(0.16,1,0.3,1)_both]"
        >
          {data.vencidas.map((item, i) => (
            <div key={`v-${i}`} className="flex items-center gap-3 bg-white/10 hover:bg-white/15 rounded-lg p-2.5 text-sm transition-colors duration-150">
              <CalendarX size={14} className="text-red-200 flex-shrink-0" aria-hidden="true" />
              <span className="truncate flex-1">{item.nome_fantasia || item.razao_social}</span>
              <time className="text-xs text-orange-200 flex-shrink-0">{item.data_garantia}</time>
            </div>
          ))}
          {data.esta_semana.map((item, i) => (
            <div key={`s-${i}`} className="flex items-center gap-3 bg-white/10 hover:bg-white/15 rounded-lg p-2.5 text-sm transition-colors duration-150">
              <Clock size={14} className="text-yellow-200 flex-shrink-0" aria-hidden="true" />
              <span className="truncate flex-1">{item.nome_fantasia || item.razao_social}</span>
              <time className="text-xs text-orange-200 flex-shrink-0">{item.data_garantia}</time>
            </div>
          ))}
          {data.proximas.map((item, i) => (
            <div key={`p-${i}`} className="flex items-center gap-3 bg-white/10 hover:bg-white/15 rounded-lg p-2.5 text-sm transition-colors duration-150">
              <CalendarCheck size={14} className="text-green-200 flex-shrink-0" aria-hidden="true" />
              <span className="truncate flex-1">{item.nome_fantasia || item.razao_social}</span>
              <time className="text-xs text-orange-200 flex-shrink-0">{item.data_garantia}</time>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
