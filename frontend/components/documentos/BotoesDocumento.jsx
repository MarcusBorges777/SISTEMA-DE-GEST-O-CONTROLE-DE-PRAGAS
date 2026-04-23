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
    <div
      className="fixed bottom-6 right-6 z-50 no-print flex flex-col gap-3 items-end"
      role="group"
      aria-label="Ações do documento"
    >
      {/* Salvar PDF */}
      <button
        onClick={onSalvarPdf}
        disabled={salvandoPdf || disabled}
        aria-label={salvandoPdf ? 'Gerando PDF, aguarde...' : 'Salvar documento como PDF'}
        aria-busy={salvandoPdf}
        className={`
          flex items-center gap-3 px-5 py-3 rounded-full shadow-2xl
          font-bold text-white text-xs tracking-tight uppercase
          transition-all duration-200
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-400
          ${salvandoPdf || disabled
            ? 'bg-slate-400 cursor-not-allowed opacity-60'
            : 'bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-500/30 hover:scale-105 active:scale-100'
          }
        `}
      >
        {salvandoPdf
          ? <Loader2 size={20} className="animate-spin" aria-hidden="true" />
          : <Save size={20} aria-hidden="true" />
        }
        <span>{salvandoPdf ? 'Gerando...' : 'Salvar PDF'}</span>
      </button>

      {/* Imprimir A4 */}
      <button
        onClick={onImprimir}
        disabled={disabled}
        aria-label="Imprimir documento em A4"
        className={`
          flex items-center gap-3 px-5 py-3 rounded-full shadow-2xl
          font-bold text-white text-xs tracking-tight uppercase
          transition-all duration-200
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-400
          ${disabled
            ? 'bg-slate-400 cursor-not-allowed opacity-60'
            : 'bg-brand-500 hover:bg-brand-600 hover:shadow-brand-500/30 hover:scale-105 active:scale-100'
          }
        `}
      >
        <ClipboardCheck size={24} aria-hidden="true" />
        <span>Imprimir Documento A4</span>
      </button>
    </div>
  );
}
