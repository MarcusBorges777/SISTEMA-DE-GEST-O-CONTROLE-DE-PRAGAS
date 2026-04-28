import React, { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';

/**
 * Modal acessível com:
 * - role="dialog" + aria-modal + aria-labelledby
 * - Trap de foco (Tab/Shift+Tab ficam dentro do modal)
 * - Fechamento via Escape
 * - Animação suave scale+fade na entrada
 * - Backdrop com blur e fade animado
 * - zClassName: permite sobrescrever z-index (default z-50)
 */
export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl', zClassName = 'z-50' }) {
  const modalRef   = useRef(null);
  const titleId    = useId();

  // Gerenciar overflow do body e fechar com Escape
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';

    const handleKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }

      // Focus trap: Tab e Shift+Tab ficam dentro do modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
        } else {
          if (document.activeElement === last)  { e.preventDefault(); first?.focus(); }
        }
      }
    };

    document.addEventListener('keydown', handleKey);

    // Mover foco para o primeiro elemento focável do modal
    const timer = setTimeout(() => {
      const firstFocusable = modalRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }, 50);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKey);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 ${zClassName} flex items-center justify-center p-4 print:hidden`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      {/* Backdrop animado */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-[backdropIn_0.2s_ease-out_both]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Painel do modal com animação scale+fade */}
      <div
        ref={modalRef}
        className={`relative w-full ${maxWidth} bg-white dark:bg-slate-800 rounded-2xl shadow-2xl
          border border-slate-200 dark:border-slate-700
          animate-[modalIn_0.22s_cubic-bezier(0.16,1,0.3,1)_both]`}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h3
              id={titleId}
              className="text-lg font-bold text-slate-800 dark:text-white"
            >
              {title}
            </h3>
            <button
              onClick={onClose}
              aria-label="Fechar modal"
              className="w-8 h-8 rounded-lg flex items-center justify-center
                text-slate-400 hover:text-slate-600 dark:hover:text-slate-300
                hover:bg-slate-100 dark:hover:bg-slate-700
                active:scale-90
                transition-all duration-150
                focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-1"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto scrollbar-thin">
          {children}
        </div>
      </div>
    </div>
  );
}
