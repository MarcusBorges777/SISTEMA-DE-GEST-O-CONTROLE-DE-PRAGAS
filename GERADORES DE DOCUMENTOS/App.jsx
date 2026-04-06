import React, { useState, useEffect } from 'react';
import { FileText, Receipt, Calculator, ArrowLeft, Bug } from 'lucide-react';
import { buscarFeriados } from './services/brasilApi';
import Laudos from './pages/Laudos';
import Orcamentos from './pages/Orcamentos';
import Recibos from './pages/Recibos';

const TABS = [
  { id: 'laudo', label: 'Laudo Técnico', icon: Bug, description: 'Controle de Pragas + Higienização' },
  { id: 'orcamento', label: 'Orçamento', icon: Calculator, description: 'Proposta de Serviços' },
  { id: 'recibo', label: 'Recibo', icon: Receipt, description: 'Comprovante de Execução' },
];

export default function App() {
  // Tab ativa - ler de URL query param
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'laudo';
  });

  // Feriados carregados uma unica vez
  const [feriados, setFeriados] = useState([]);
  const [feriadosLoaded, setFeriadosLoaded] = useState(false);

  // Carregar feriados na montagem
  useEffect(() => {
    buscarFeriados(2026)
      .then(data => {
        setFeriados(data);
        setFeriadosLoaded(true);
      })
      .catch(() => setFeriadosLoaded(true));
  }, []);

  // Atualizar URL ao trocar tab
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const url = new URL(window.location);
    url.searchParams.set('tab', tabId);
    window.history.replaceState({}, '', url);
  };

  return (
    <div className="min-h-screen bg-[#e8eaef] py-8 flex flex-col items-center font-sans text-slate-900 print:bg-white print:py-0">

      {/* NAVEGACAO - TABS */}
      <nav className="w-full max-w-[210mm] mb-6 print:hidden">
        {/* Botao Voltar */}
        <div className="mb-4">
          <a href="/" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#254191] transition-colors">
            <ArrowLeft size={16} /> Voltar ao Sistema
          </a>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 flex gap-2">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                  isActive
                    ? 'bg-[#254191] text-white shadow-md'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-blue-200' : 'text-gray-400'} />
                <div className="text-left">
                  <p className="leading-none">{tab.label}</p>
                  <p className={`text-[10px] font-normal mt-0.5 ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>{tab.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* CONTEUDO DA TAB ATIVA */}
      <main className="w-full flex flex-col items-center">
        {activeTab === 'laudo' && <Laudos feriados={feriados} />}
        {activeTab === 'orcamento' && <Orcamentos feriados={feriados} />}
        {activeTab === 'recibo' && <Recibos feriados={feriados} />}
      </main>

      {/* ESTILOS GLOBAIS PARA IMPRESSAO */}
      <style>{`
        .a4-page {
          width: 210mm;
          height: 297mm;
          min-height: 297mm;
          position: relative;
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
