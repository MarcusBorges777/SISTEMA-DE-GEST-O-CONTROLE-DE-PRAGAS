import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Shield, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { fetchGarantiasVencendo } from '../../services/api';
import { groupGarantias, labelPrazo, corStatus } from '../../utils/garantias';

const POLL_INTERVAL_MS = 60_000; // refresh a cada 60s

export default function GarantiaBell() {
  const [data, setData]   = useState({ vencidas: [], esta_semana: [], proximas: [] });
  const [open, setOpen]   = useState(false);
  const [loading, setLoading] = useState(true);
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  const refresh = async () => {
    try {
      const result = await fetchGarantiasVencendo();
      setData(groupGarantias(result));
    } catch (e) {
      // silencioso — o badge só pisca quando há dados reais
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const urgentes = data.vencidas.length + data.esta_semana.length;
  const total    = urgentes + data.proximas.length;
  const todos    = [...data.vencidas, ...data.esta_semana, ...data.proximas];

  const irPara = (g) => {
    setOpen(false);
    navigate('/garantias');
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title={`${total} garantia${total !== 1 ? 's' : ''} no radar`}
        aria-label="Notificações de garantia"
        className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all
          ${urgentes > 0
            ? 'bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400'
            : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300'
          }`}
      >
        <Bell size={18} className={urgentes > 0 ? 'animate-pulse' : ''} />
        {total > 0 && (
          <span
            className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full
              text-[10px] font-bold text-white flex items-center justify-center shadow-sm
              ${urgentes > 0 ? 'bg-red-500' : 'bg-amber-500'}`}
          >
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-[360px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-800/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-sm shadow-brand-500/30">
                <Shield size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">Garantias Técnicas</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {loading ? 'Carregando…'
                    : urgentes > 0
                      ? `${urgentes} urgente${urgentes !== 1 ? 's' : ''} · ${total} no radar`
                      : total > 0
                        ? `${total} próximas a vencer`
                        : 'Tudo em dia'}
                </p>
              </div>
            </div>
          </div>

          {/* Resumo (3 mini-stats) */}
          {!loading && total > 0 && (
            <div className="grid grid-cols-3 gap-1 p-2 bg-slate-50 dark:bg-slate-900/30">
              <Stat label="Vencidas"   count={data.vencidas.length}    icon={AlertTriangle} color="red" />
              <Stat label="≤ 7 dias"   count={data.esta_semana.length} icon={Clock}         color="amber" />
              <Stat label="Próximas"   count={data.proximas.length}    icon={CheckCircle2}  color="blue" />
            </div>
          )}

          {/* Lista */}
          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 mx-auto animate-pulse" />
              </div>
            ) : todos.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 mx-auto flex items-center justify-center mb-2">
                  <CheckCircle2 size={20} className="text-emerald-500" />
                </div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Tudo em dia!</p>
                <p className="text-[11px] text-slate-400 mt-1">Nenhuma garantia próxima do vencimento.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {todos.slice(0, 8).map((g, i) => {
                  const cor = corStatus(g);
                  return (
                    <button
                      key={i}
                      onClick={() => irPara(g)}
                      className="w-full px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 flex items-center gap-3 text-left transition group"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${cor.bg}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                          {g.nome_cliente || g.fantasia || 'Sem nome'}
                        </p>
                        <p className={`text-[11px] font-medium ${cor.text} dark:opacity-90 mt-0.5`}>
                          {labelPrazo(g)}
                          {g.ja_contatado && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-bold">
                              ✓ contatado
                            </span>
                          )}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <button
            onClick={() => { setOpen(false); navigate('/garantias'); }}
            className="w-full py-3 text-xs font-bold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 border-t border-slate-100 dark:border-slate-700 transition"
          >
            Ver todas as garantias →
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, count, icon: Icon, color }) {
  const cls = {
    red:   'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    blue:  'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  }[color] || '';
  return (
    <div className={`rounded-xl p-2 text-center ${cls}`}>
      <p className="text-base font-black leading-none">{count}</p>
      <p className="text-[9px] font-bold mt-1 uppercase tracking-wider opacity-80 leading-none">{label}</p>
    </div>
  );
}
