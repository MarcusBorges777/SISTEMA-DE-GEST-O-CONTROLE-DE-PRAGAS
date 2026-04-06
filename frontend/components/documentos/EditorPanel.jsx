import React, { useState } from 'react';
import { Edit3, ChevronUp, ChevronDown } from 'lucide-react';

/**
 * Painel de edicao colapsivel - Wrapper compartilhado
 *
 * @param {Object} props
 * @param {string} props.title - Titulo do painel
 * @param {boolean} props.defaultOpen - Se inicia aberto
 * @param {React.ReactNode} props.children - Conteudo do editor
 * @param {React.ReactNode} props.actions - Botoes de acao (rodape do painel)
 */
export default function EditorPanel({ title = "Editar Informações do Documento", defaultOpen = true, children, actions }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-[#f4f6f9] p-6 md:p-8 rounded-2xl shadow-sm w-full max-w-[210mm] border border-gray-300/60 print:hidden relative mb-8">
      {/* Cabecalho */}
      <div
        className="flex justify-between items-center mb-6 pb-4 border-b border-gray-300/80 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="font-extrabold text-xl text-[#3b4b73] flex items-center gap-3">
          <Edit3 size={22} className="text-[#3b4b73]" /> {title}
        </h3>
        <button className="text-gray-500 hover:text-[#3b4b73] transition-colors">
          {isOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
        </button>
      </div>

      {/* Conteudo */}
      {isOpen && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          {children}

          {/* Acoes */}
          {actions && (
            <div className="mt-8 pt-5 border-t border-gray-300/80 flex gap-3 justify-end">
              {actions}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
