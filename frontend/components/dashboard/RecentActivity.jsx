import React, { useState, useEffect } from 'react';
import { Clock, FileText, User, Receipt, CreditCard, Eye, Wrench, Bug } from 'lucide-react';
import { getAgendamentos } from '../../services/agendaService';

const typeConfig = {
  laudo:     { icon: Bug,      color: 'text-blue-500',    bg: 'bg-blue-100 dark:bg-blue-900/30'    },
  recibo:    { icon: Receipt,  color: 'text-purple-500',  bg: 'bg-purple-100 dark:bg-purple-900/30' },
  orcamento: { icon: FileText, color: 'text-amber-500',   bg: 'bg-amber-100 dark:bg-amber-900/30'  },
  servico:   { icon: Wrench,   color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  documento: { icon: FileText, color: 'text-blue-500',    bg: 'bg-blue-100 dark:bg-blue-900/30'    },
  cliente:   { icon: User,     color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atras`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atras`;
  const days = Math.floor(hours / 24);
  return `${days}d atras`;
}

export default function RecentActivity({ onPreview }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const TIPO_LABEL = { laudo: 'Laudo', recibo: 'Recibo', orcamento: 'Orçamento', servico: 'Serviço' };
    getAgendamentos()
      .then(todos => {
        const eventos = todos
          .sort((a, b) => (b.criadoEm || b.data || '').localeCompare(a.criadoEm || a.data || ''))
          .slice(0, 8)
          .map(e => ({
            id:        e.id,
            tipo:      e.tipo,
            descricao: `${TIPO_LABEL[e.tipo] || e.tipo} — ${e.clienteNome || e.clienteFantasia || 'Cliente'}`,
            data:      e.criadoEm || e.data,
          }));
        setActivities(eventos);
      })
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-2 mb-5">
        <Clock size={18} className="text-brand-500" />
        <h3 className="text-base font-bold text-slate-800 dark:text-white">Atividades Recentes</h3>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-3.5 w-3/4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-2.5 w-1/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">Nenhuma atividade recente</p>
      ) : (
        <div className="space-y-2">
          {activities.slice(0, 8).map((activity, i) => {
            const config = typeConfig[activity.tipo] || typeConfig.documento;
            const Icon = config.icon;
            return (
              <div key={i}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl
                  hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={16} className={config.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                    {activity.descricao || activity.titulo}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{timeAgo(activity.data)}</p>
                </div>
                {activity.arquivo && onPreview && (
                  <button
                    onClick={() => onPreview(activity.arquivo)}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg
                      bg-slate-100 dark:bg-slate-700 flex items-center justify-center
                      text-slate-400 hover:text-brand-500 transition-all"
                    title="Visualizar"
                  >
                    <Eye size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
