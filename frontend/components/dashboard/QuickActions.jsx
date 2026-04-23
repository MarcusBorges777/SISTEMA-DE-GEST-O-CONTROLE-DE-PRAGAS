import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bug, Calculator, Receipt, Plus } from 'lucide-react';

const actions = [
  {
    label:       'Novo Laudo',
    description: 'Controle de Pragas',
    tab:         'laudo',
    icon:        Bug,
    gradient:    'from-blue-600 to-indigo-600',
    shadow:      'shadow-blue-500/30',
    ring:        'focus-visible:ring-blue-400/60',
  },
  {
    label:       'Novo Orçamento',
    description: 'Proposta de Serviço',
    tab:         'orcamento',
    icon:        Calculator,
    gradient:    'from-emerald-600 to-teal-600',
    shadow:      'shadow-emerald-500/30',
    ring:        'focus-visible:ring-emerald-400/60',
  },
  {
    label:       'Novo Recibo',
    description: 'Comprovante',
    tab:         'recibo',
    icon:        Receipt,
    gradient:    'from-purple-600 to-fuchsia-600',
    shadow:      'shadow-purple-500/30',
    ring:        'focus-visible:ring-purple-400/60',
  },
];

export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-2 mb-5">
        <Plus size={18} className="text-brand-500" aria-hidden="true" />
        <h3 className="text-base font-bold text-slate-800 dark:text-white">Ações Rápidas</h3>
      </div>

      <div className="space-y-3" role="group" aria-label="Criar novo documento">
        {actions.map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.tab}
              onClick={() => navigate(`/documentos?tab=${action.tab}`)}
              aria-label={`${action.label} — ${action.description}`}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl
                bg-gradient-to-r ${action.gradient} text-white
                shadow-lg ${action.shadow}
                hover:shadow-xl hover:scale-[1.02]
                active:scale-[0.98]
                transition-all duration-200
                focus-visible:outline-none focus-visible:ring-2 ${action.ring} focus-visible:ring-offset-1
                group`}
            >
              <div
                className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0
                  group-hover:bg-white/30 transition-colors duration-200"
                aria-hidden="true"
              >
                <Icon size={20} />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">{action.label}</p>
                <p className="text-xs text-white/75">{action.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
