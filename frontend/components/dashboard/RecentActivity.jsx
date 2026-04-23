import React, { useState, useEffect } from 'react';
import { Clock, FileText, User, Receipt, Eye, Wrench, Bug } from 'lucide-react';
import { getAgendamentos } from '../../services/agendaService';

const typeConfig = {
  laudo:     { icon: Bug,      color: 'text-blue-500',    bg: 'bg-blue-100    dark:bg-blue-900/30'    },
  recibo:    { icon: Receipt,  color: 'text-purple-500',  bg: 'bg-purple-100  dark:bg-purple-900/30'  },
  orcamento: { icon: FileText, color: 'text-amber-500',   bg: 'bg-amber-100   dark:bg-amber-900/30'   },
  servico:   { icon: Wrench,   color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  documento: { icon: FileText, color: 'text-blue-500',    bg: 'bg-blue-100    dark:bg-blue-900/30'    },
  cliente:   { icon: User,     color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
};

const TIPO_LABEL = { laudo: 'Laudo', recibo: 'Recibo', orcamento: 'Orçamento', servico: 'Serviço' };

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

export default function RecentActivity({ onPreview }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    try {
      const eventos = getAgendamentos()
        .sort((a, b) => (b.criadoEm || b.data || '').localeCompare(a.criadoEm || a.data || ''))
        .slice(0, 8)
        .map(e => ({
          id:       e.id,
          tipo:     e.tipo,
          descricao: `${TIPO_LABEL[e.tipo] || e.tipo} — ${e.clienteNome || e.clienteFantasia || 'Cliente'}`,
          data:     e.criadoEm || e.data,
          arquivo:  e.arquivo,
        }));
      setActivities(eventos);
    } catch {
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <section
      aria-label="Atividades recentes"
      className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 h-full"
    >
      <div className="flex items-center gap-2 mb-5">
        <Clock size={18} className="text-brand-500" aria-hidden="true" />
        <h3 className="text-base font-bold text-slate-800 dark:text-white">Atividades Recentes</h3>
      </div>

      {/* Skeleton de carregamento */}
      {loading ? (
        <div className="space-y-3" aria-label="Carregando atividades..." aria-busy="true">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-3/4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-2.5 w-1/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>

      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Clock size={32} className="text-slate-300 dark:text-slate-600 mb-3" aria-hidden="true" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma atividade recente</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">As ações aparecerão aqui</p>
        </div>

      ) : (
        <ol className="space-y-1" aria-label="Lista de atividades">
          {activities.map((activity, i) => {
            const config = typeConfig[activity.tipo] || typeConfig.documento;
            const Icon = config.icon;
            return (
              <li key={activity.id || i}>
                <div
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl
                    hover:bg-slate-50 dark:hover:bg-slate-700/50
                    transition-colors duration-150 group"
                >
                  <div
                    className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}
                    aria-hidden="true"
                  >
                    <Icon size={16} className={config.color} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                      {activity.descricao || activity.titulo}
                    </p>
                    <time
                      className="text-xs text-slate-400 dark:text-slate-500"
                      dateTime={activity.data}
                      title={activity.data}
                    >
                      {timeAgo(activity.data)}
                    </time>
                  </div>

                  {activity.arquivo && onPreview && (
                    <button
                      onClick={() => onPreview(activity.arquivo)}
                      aria-label={`Visualizar documento: ${activity.descricao}`}
                      className="opacity-0 group-hover:opacity-100
                        w-7 h-7 rounded-lg
                        bg-slate-100 dark:bg-slate-700
                        flex items-center justify-center
                        text-slate-400 hover:text-brand-500
                        active:scale-90
                        transition-all duration-150
                        focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
                    >
                      <Eye size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
