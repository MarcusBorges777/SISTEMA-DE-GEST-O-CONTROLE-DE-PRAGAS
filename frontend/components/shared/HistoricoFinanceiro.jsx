import React, { useState, useEffect } from 'react';
import { TrendingUp, FileText, Receipt, Loader2, AlertCircle } from 'lucide-react';
import { clienteApi } from '../../services/dbService';

const formatCurrency = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR');
  } catch {
    return iso;
  }
};

const TIPO_CONFIG = {
  recibo: {
    label: 'Recibo',
    icon: Receipt,
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    valor: 'text-emerald-700 dark:text-emerald-400',
  },
  orcamento: {
    label: 'Orçamento',
    icon: FileText,
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    valor: 'text-blue-700 dark:text-blue-400',
  },
};

export default function HistoricoFinanceiro({ clienteId }) {
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!clienteId) return;
    let active = true;
    setLoading(true);
    setErro(null);

    clienteApi.historico(clienteId)
      .then(data => {
        if (!active) return;
        // Dupla salvaguarda: re-sort por dataCriacao DESC
        const sorted = [...data].sort((a, b) =>
          (b.dataCriacao || '').localeCompare(a.dataCriacao || '')
        );
        setHistorico(sorted);
      })
      .catch(() => {
        if (active) setErro('Não foi possível carregar o histórico.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [clienteId]);

  if (!clienteId) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 text-xs text-slate-400">
        <Loader2 size={12} className="animate-spin" />
        Carregando histórico...
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-xs text-red-500">
        <AlertCircle size={12} />
        {erro}
      </div>
    );
  }

  if (historico.length === 0) {
    return (
      <p className="px-4 py-2 text-xs text-slate-400 italic">
        Nenhum orçamento ou recibo registado.
      </p>
    );
  }

  const totalRecibos = historico
    .filter(d => d.tipo === 'recibo')
    .reduce((acc, d) => acc + (d.valor ?? 0), 0);

  return (
    <div className="px-4">
      {/* Resumo */}
      <div className="flex items-center gap-1.5 mb-2">
        <TrendingUp size={11} className="text-emerald-500" />
        <span className="text-[10px] text-slate-500 dark:text-slate-400">
          Total faturado:{' '}
          <strong className="text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalRecibos)}
          </strong>
        </span>
      </div>

      {/* Lista cronológica */}
      <ul className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
        {historico.map((doc) => {
          const cfg = TIPO_CONFIG[doc.tipo] || TIPO_CONFIG.orcamento;
          const Icon = cfg.icon;
          return (
            <li
              key={doc.id}
              className="flex items-center gap-2 py-1.5 border-b border-slate-100 dark:border-slate-700/50 last:border-0"
            >
              <Icon size={12} className="text-slate-400 flex-shrink-0" />

              <span className="text-[10px] text-slate-400 w-16 flex-shrink-0 tabular-nums">
                {formatDate(doc.dataCriacao)}
              </span>

              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${cfg.badge}`}>
                {cfg.label}
              </span>

              <span className={`text-xs font-bold ml-auto flex-shrink-0 ${cfg.valor}`}>
                {formatCurrency(doc.valor)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
