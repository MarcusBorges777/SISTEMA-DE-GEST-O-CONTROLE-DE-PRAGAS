import { Loader2, Save, ClipboardCheck } from 'lucide-react';

/**
 * Botões flutuantes fixos de "Salvar PDF" e "Imprimir Documento A4".
 * Compartilhado entre Laudos, Recibos e Orçamentos.
 *
 * @param {Function} onSalvarPdf  — handler do botão Salvar PDF
 * @param {Function} onImprimir   — handler do botão Imprimir
 * @param {boolean}  salvandoPdf  — true enquanto o PDF está sendo gerado (mostra spinner)
 * @param {boolean}  disabled     — desabilita ambos os botões (ex.: nenhum doc selecionado)
 */
export function BotoesDocumento({ onSalvarPdf, onImprimir, salvandoPdf, disabled = false }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 no-print flex flex-col gap-3 items-end">
      <button
        onClick={onSalvarPdf}
        disabled={salvandoPdf || disabled}
        className={`${disabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'} text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 transition-all transform hover:scale-105 font-bold disabled:opacity-60`}
      >
        {salvandoPdf ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
        <span className="tracking-tight uppercase text-xs">Salvar PDF</span>
      </button>
      <button
        onClick={onImprimir}
        disabled={disabled}
        className={`${disabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#254191] hover:bg-blue-800'} text-white p-4 rounded-full shadow-2xl flex items-center gap-3 transition-all transform hover:scale-105 font-bold`}
      >
        <ClipboardCheck size={24} />
        <span className="pr-2 tracking-tight uppercase text-xs">Imprimir Documento A4</span>
      </button>
    </div>
  );
}
