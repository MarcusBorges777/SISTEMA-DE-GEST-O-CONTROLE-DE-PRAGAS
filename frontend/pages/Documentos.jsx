import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Bug, Calculator, Receipt } from 'lucide-react';
import { buscarFeriados } from '../services/brasilApi';
import { useEmpresa, normalizeCliente } from '../contexts/EmpresaContext';
import Laudos from './documentos/Laudos';
import Orcamentos from './documentos/Orcamentos';
import Recibos from './documentos/Recibos';

const TABS = [
  { id: 'laudo', label: 'Laudo Tecnico', icon: Bug, description: 'Controle de Pragas + Higienizacao' },
  { id: 'orcamento', label: 'Orcamento', icon: Calculator, description: 'Proposta de Servicos' },
  { id: 'recibo', label: 'Recibo', icon: Receipt, description: 'Comprovante de Execucao' },
];

export default function Documentos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'laudo');
  const [feriados, setFeriados] = useState([]);
  const location = useLocation();
  const { empresa, setEmpresa } = useEmpresa();

  // Bridge: se chegou com location.state.cliente e nao ha empresa no context, preencher
  useEffect(() => {
    if (location.state?.cliente && !empresa) {
      setEmpresa(normalizeCliente(location.state.cliente));
    }
  }, []);

  // Carregar feriados uma vez
  useEffect(() => {
    const ano = new Date().getFullYear();
    buscarFeriados(ano)
      .then(data => setFeriados(data))
      .catch(() => {});
  }, []);

  // Sync tab com URL
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  return (
    <div className="flex flex-col items-center">
      {/* Tabs */}
      <nav className="w-full max-w-[210mm] mb-6 print:hidden">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-2 flex gap-2">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-blue-200' : 'text-slate-400'} />
                <div className="text-left">
                  <p className="leading-none">{tab.label}</p>
                  <p className={`text-[10px] font-normal mt-0.5 ${isActive ? 'text-blue-200' : 'text-slate-400'}`}>{tab.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Conteudo da Tab Ativa */}
      <main className="w-full flex flex-col items-center">
        {activeTab === 'laudo' && <Laudos feriados={feriados} />}
        {activeTab === 'orcamento' && <Orcamentos feriados={feriados} />}
        {activeTab === 'recibo' && <Recibos feriados={feriados} />}
      </main>

      {/* Print Styles */}
      <style>{`
        .a4-page {
          width: 210mm; height: 297mm; min-height: 297mm; position: relative;
        }
        .text-shadow-sm { text-shadow: 1px 1px 2px rgba(0,0,0,0.05); }
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; margin: 0; padding: 0; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          .no-print, .print\\:hidden { display: none !important; }
          .a4-page {
            box-shadow: none !important; border: none !important; margin: 0 !important;
            padding: 15mm !important; width: 210mm; height: 297mm; overflow: hidden;
          }
          #a4-document {
            box-shadow: none !important; width: 210mm; padding: 10mm; margin: 0; border-radius: 0;
            position: relative !important; page-break-after: avoid; page-break-inside: avoid;
          }
          .print-page-break, .print\\:page-break { page-break-before: always; }
          .print-avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
          .print-bg-blue { background-color: #254191 !important; color: white !important; }
          .print-bg-header { background-color: #1e3a8a !important; color: white !important; }
          .print-bg-blue-line { background-color: #254191 !important; }
          .print-bg-light-blue { background-color: #eff6ff !important; }
          .print-bg-red { background-color: #fff5f5 !important; }
          .print-bg-row-val { background-color: #eff6ff !important; }
          .print-border-blue { border-left-color: #254191 !important; }
          .print-border-light-blue { border-color: #dbeafe !important; }
        }
        .no-spinner::-webkit-inner-spin-button, .no-spinner::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        textarea { overflow: hidden; }
        input:focus, textarea:focus { outline: none; }
      `}</style>
    </div>
  );
}
