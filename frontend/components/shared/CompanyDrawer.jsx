import React from 'react';
import { X, Building2, MapPin, Briefcase, Phone, Hash, CheckCircle2, Trash2, TrendingUp } from 'lucide-react';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { useSidebar } from '../../contexts/SidebarContext';
import HistoricoFinanceiro from './HistoricoFinanceiro';

export default function CompanyDrawer() {
  const { empresa, drawerOpen, clearEmpresa, toggleDrawer } = useEmpresa();
  const { collapsed } = useSidebar();

  const sidebarLeft = collapsed ? 68 : 256;

  return (
    <aside
      style={{ left: sidebarLeft }}
      className={`fixed top-0 h-screen z-20 flex flex-col
        bg-white dark:bg-slate-800
        border-r border-slate-200 dark:border-slate-700
        shadow-xl transition-all duration-300 print:hidden
        ${drawerOpen ? 'w-72' : 'w-0 overflow-hidden'}`}
    >
      {/* Conteudo — só renderiza quando aberto para evitar layout shift */}
      {drawerOpen && empresa && (
        <div className="flex flex-col h-full w-72">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 dark:border-slate-700 bg-brand-500 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-white" />
              <span className="text-sm font-bold text-white">Empresa Selecionada</span>
            </div>
            <button
              onClick={toggleDrawer}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition"
              title="Recolher painel"
            >
              <X size={16} />
            </button>
          </div>

          {/* Badge */}
          <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-900/30 flex-shrink-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 size={13} />
              Dados preenchidos automaticamente
            </div>
          </div>

          {/* Dados da Empresa */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {/* Nome */}
            <div>
              <p className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {empresa.fantasia || empresa.nome}
              </p>
              {empresa.fantasia && empresa.nome && empresa.fantasia !== empresa.nome && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                  {empresa.nome}
                </p>
              )}
            </div>

            {/* CNPJ */}
            {empresa.cnpj && (
              <div className="flex items-start gap-2.5">
                <Hash size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">CNPJ</p>
                  <p className="text-xs font-mono text-slate-700 dark:text-slate-300">{empresa.cnpj}</p>
                </div>
              </div>
            )}

            {/* Endereço */}
            {empresa.endereco && (
              <div className="flex items-start gap-2.5">
                <MapPin size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Endereço</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{empresa.endereco}</p>
                </div>
              </div>
            )}

            {/* Atividade */}
            {empresa.atividade && (
              <div className="flex items-start gap-2.5">
                <Briefcase size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Atividade</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{empresa.atividade}</p>
                </div>
              </div>
            )}

            {/* Telefone */}
            {empresa.telefone && (
              <div className="flex items-start gap-2.5">
                <Phone size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Telefone</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300">{empresa.telefone}</p>
                </div>
              </div>
            )}
          </div>

          {/* Histórico Financeiro */}
          {empresa?.id && (
            <div className="border-t border-slate-200 dark:border-slate-700 flex-shrink-0 pt-3 pb-2">
              <div className="flex items-center gap-1.5 px-4 mb-2">
                <TrendingUp size={12} className="text-emerald-500" />
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Histórico Financeiro
                </p>
              </div>
              <HistoricoFinanceiro clienteId={empresa.id} />
            </div>
          )}

          {/* Rodapé — Limpar */}
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
            <button
              onClick={clearEmpresa}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium
                text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20
                border border-red-200 dark:border-red-900/40 transition"
            >
              <Trash2 size={13} />
              Limpar Seleção
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
