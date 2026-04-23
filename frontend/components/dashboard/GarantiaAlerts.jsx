import React, { useState, useEffect, useId } from 'react';
import { AlertTriangle, Clock, CalendarX, CalendarCheck, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchGarantiasVencendo } from '../../services/api';

export default function GarantiaAlerts() {
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

  // Oculta apenas quando carregamento terminar sem dados
  if (!loading && total === 0) return null;

  return (
    <section
      aria-label={`Avisos de garantia — ${loading ? 'carregando' : `${total} cliente${total !== 1 ? 's' : ''}`}`}
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
            <p className="text-orange-100 text-xs">Clientes com garantia vencida ou próxima</p>
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
        </div>
      </div>

      {/* Resumo de contadores */}
      <div className="grid grid-cols-3 gap-3 mb-4" role="group" aria-label="Resumo de garantias">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
          <p className="text-2xl font-bold tabular-nums" aria-label={`${loading ? 'carregando' : data.vencidas.length} garantias vencidas`}>
            {loading ? '—' : data.vencidas.length}
          </p>
          <p className="text-xs text-orange-100">Vencidas</p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
          <p className="text-2xl font-bold tabular-nums" aria-label={`${loading ? 'carregando' : data.esta_semana.length} garantias vencendo esta semana`}>
            {loading ? '—' : data.esta_semana.length}
          </p>
          <p className="text-xs text-orange-100">Esta Semana</p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
          <p className="text-2xl font-bold tabular-nums" aria-label={`${loading ? 'carregando' : data.proximas.length} garantias vencendo nos próximos 30 dias`}>
            {loading ? '—' : data.proximas.length}
          </p>
          <p className="text-xs text-orange-100">Próx. 30 dias</p>
        </div>
      </div>

      {/* Lista expandida com animação */}
      {expanded && !loading && (
        <div
          id={listId}
          aria-label="Lista de clientes com garantias"
          className="space-y-2 max-h-64 overflow-y-auto animate-[slideUp_0.2s_cubic-bezier(0.16,1,0.3,1)_both]"
        >
          {data.vencidas.map((item, i) => (
            <div key={`v-${i}`} className="flex items-center gap-3 bg-white/10 hover:bg-white/15 rounded-lg p-2.5 text-sm transition-colors duration-150">
              <CalendarX size={14} className="text-red-200 flex-shrink-0" aria-hidden="true" />
              <span className="truncate flex-1" title={item.nome_fantasia || item.razao_social}>
                {item.nome_fantasia || item.razao_social}
              </span>
              <time className="text-xs text-orange-200 flex-shrink-0">{item.data_garantia}</time>
            </div>
          ))}
          {data.esta_semana.map((item, i) => (
            <div key={`s-${i}`} className="flex items-center gap-3 bg-white/10 hover:bg-white/15 rounded-lg p-2.5 text-sm transition-colors duration-150">
              <Clock size={14} className="text-yellow-200 flex-shrink-0" aria-hidden="true" />
              <span className="truncate flex-1" title={item.nome_fantasia || item.razao_social}>
                {item.nome_fantasia || item.razao_social}
              </span>
              <time className="text-xs text-orange-200 flex-shrink-0">{item.data_garantia}</time>
            </div>
          ))}
          {data.proximas.map((item, i) => (
            <div key={`p-${i}`} className="flex items-center gap-3 bg-white/10 hover:bg-white/15 rounded-lg p-2.5 text-sm transition-colors duration-150">
              <CalendarCheck size={14} className="text-green-200 flex-shrink-0" aria-hidden="true" />
              <span className="truncate flex-1" title={item.nome_fantasia || item.razao_social}>
                {item.nome_fantasia || item.razao_social}
              </span>
              <time className="text-xs text-orange-200 flex-shrink-0">{item.data_garantia}</time>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
