import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CalendarX, CalendarCheck, RefreshCw, ChevronDown, ChevronUp, Phone } from 'lucide-react';
import { fetchGarantiasVencendo } from '../../services/api';
import { groupGarantias } from '../../utils/garantias';

export default function GarantiaAlerts({ compact = false }) {
  const [data, setData] = useState({ vencidas: [], esta_semana: [], proximas: [] });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchGarantiasVencendo();
      setData(groupGarantias(result));
    } catch (e) {
      console.warn('Erro ao carregar garantias:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const total = data.vencidas.length + data.esta_semana.length + data.proximas.length;

  if (!loading && total === 0) return null;

  // ── Versão compacta: mesmo tamanho dos StatCards ─────────────────────────
  if (compact) {
    return (
      <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-lg p-4 text-white flex flex-col justify-between h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle size={16} />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">Avisos de Garantia</h3>
              <p className="text-orange-100 text-[11px] leading-tight">Vencidas ou próximas</p>
            </div>
          </div>
          <button onClick={loadData}
            className="w-7 h-7 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition shrink-0">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Contadores */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/15 rounded-xl p-2 text-center">
            <p className="text-xl font-bold leading-none">{loading ? '-' : data.vencidas.length}</p>
            <p className="text-[10px] text-orange-100 mt-0.5">Vencidas</p>
          </div>
          <div className="bg-white/15 rounded-xl p-2 text-center">
            <p className="text-xl font-bold leading-none">{loading ? '-' : data.esta_semana.length}</p>
            <p className="text-[10px] text-orange-100 mt-0.5">Esta Semana</p>
          </div>
          <div className="bg-white/15 rounded-xl p-2 text-center">
            <p className="text-xl font-bold leading-none">{loading ? '-' : data.proximas.length}</p>
            <p className="text-[10px] text-orange-100 mt-0.5">Próx. 30d</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Versão completa (coluna lateral) ────────────────────────────────────
  return (
    <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-lg p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="font-bold text-lg">Avisos de Garantia</h3>
            <p className="text-orange-100 text-xs">Clientes com garantia vencida ou proxima</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData}
            className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setExpanded(!expanded)}
            className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{loading ? '-' : data.vencidas.length}</p>
          <p className="text-xs text-orange-100">Vencidas</p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{loading ? '-' : data.esta_semana.length}</p>
          <p className="text-xs text-orange-100">Esta Semana</p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{loading ? '-' : data.proximas.length}</p>
          <p className="text-xs text-orange-100">Prox. 30 dias</p>
        </div>
      </div>

      {/* Lista expandida */}
      {expanded && !loading && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {data.vencidas.map((item, i) => (
            <div key={`v-${i}`} className="flex items-center gap-3 bg-white/10 rounded-lg p-2.5 text-sm">
              <CalendarX size={14} className="text-red-200 flex-shrink-0" />
              <span className="truncate flex-1">{item.nome_fantasia || item.razao_social}</span>
              <span className="text-xs text-orange-200">{item.data_garantia}</span>
            </div>
          ))}
          {data.esta_semana.map((item, i) => (
            <div key={`s-${i}`} className="flex items-center gap-3 bg-white/10 rounded-lg p-2.5 text-sm">
              <Clock size={14} className="text-yellow-200 flex-shrink-0" />
              <span className="truncate flex-1">{item.nome_fantasia || item.razao_social}</span>
              <span className="text-xs text-orange-200">{item.data_garantia}</span>
            </div>
          ))}
          {data.proximas.map((item, i) => (
            <div key={`p-${i}`} className="flex items-center gap-3 bg-white/10 rounded-lg p-2.5 text-sm">
              <CalendarCheck size={14} className="text-green-200 flex-shrink-0" />
              <span className="truncate flex-1">{item.nome_fantasia || item.razao_social}</span>
              <span className="text-xs text-orange-200">{item.data_garantia}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
