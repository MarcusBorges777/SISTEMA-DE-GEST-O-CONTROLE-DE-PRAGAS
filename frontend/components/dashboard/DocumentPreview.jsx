import React, { useEffect, useCallback } from 'react';
import {
  X, Download, ExternalLink, ChevronLeft, ChevronRight,
  FileText, File, Calendar, HardDrive, Tag, Hash,
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

const TYPE_BADGE = {
  laudo:     { label: 'Laudo',     color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  recibo:    { label: 'Recibo',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  orcamento: { label: 'Orçamento', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  lixeira:   { label: 'Lixeira',   color: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300' },
};

function getTipoFromArquivo(arquivo) {
  if (!arquivo) return null;
  const n = (arquivo.nome || arquivo.filename || '').toLowerCase();
  const o = (arquivo.origem || arquivo.caminho || '').toLowerCase();
  if (o.includes('lixeira') || arquivo.status === 'lixeira') return 'lixeira';
  if (n.includes('laudo')   || o.includes('laudo'))   return 'laudo';
  if (n.includes('recibo')  || o.includes('recibo'))  return 'recibo';
  if (n.includes('orcamento') || n.includes('orçamento') || o.includes('orcamento')) return 'orcamento';
  return null;
}

// ─── Componente ──────────────────────────────────────────────────────────────

/**
 * Painel lateral de preview de documento.
 *
 * Props:
 *   arquivo      – objeto completo do arquivo (nome, caminho, tamanho, data_modificacao…)
 *   onClose      – função de fechar
 *   files        – lista completa de arquivos filtrados (para navegação prev/next)
 *   currentIndex – índice do arquivo atual na lista
 *   onNavigate   – (newIndex) => void
 *   docMeta      – metadados do documento (valor, dataCriacao…) — opcional
 */
export default function DocumentPreview({ arquivo, onClose, files = [], currentIndex = 0, onNavigate, docMeta }) {
  if (!arquivo) return null;

  const filename  = arquivo.nome || arquivo.filename || '';
  const caminho   = arquivo.caminho || '';
  const caminhoQ  = caminho ? `?caminho=${encodeURIComponent(caminho)}` : '';
  const viewUrl   = `/api/visualizar/${encodeURIComponent(filename)}${caminhoQ}`;
  const downloadUrl = `/api/download/${encodeURIComponent(filename)}${caminhoQ}`;
  const tipo      = getTipoFromArquivo(arquivo);
  const badge     = TYPE_BADGE[tipo];
  const hasPrev   = currentIndex > 0;
  const hasNext   = currentIndex < files.length - 1;

  const fmtBRL = v =>
    typeof v === 'number' && !isNaN(v)
      ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : null;

  // Fechar com Esc
  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft'  && hasPrev) onNavigate(currentIndex - 1);
    if (e.key === 'ArrowRight' && hasNext) onNavigate(currentIndex + 1);
  }, [onClose, hasPrev, hasNext, currentIndex, onNavigate]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const metadataItems = [
    {
      icon: FileText,
      label: 'Nome',
      value: filename,
      mono: true,
      wrap: true,
    },
    badge && {
      icon: Tag,
      label: 'Tipo',
      value: (
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${badge.color}`}>
          {badge.label}
        </span>
      ),
    },
    {
      icon: HardDrive,
      label: 'Tamanho',
      value: formatSize(arquivo.tamanho),
    },
    {
      icon: Calendar,
      label: 'Data',
      value: formatDate(docMeta?.dataCriacao || arquivo.data_modificacao || arquivo.data),
    },
    docMeta?.valor != null && {
      icon: Hash,
      label: 'Valor',
      value: fmtBRL(docMeta.valor) || '—',
      bold: true,
      green: true,
    },
    arquivo.origem && {
      icon: File,
      label: 'Pasta',
      value: arquivo.origem,
    },
  ].filter(Boolean);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Painel lateral */}
      <div
        className="fixed top-0 right-0 z-[1001] h-full flex flex-col
          w-full sm:w-[92vw] md:w-[78vw] lg:w-[68vw] xl:w-[60vw]
          bg-white dark:bg-slate-900 shadow-2xl
          animate-[slideInRight_0.25s_cubic-bezier(0.16,1,0.3,1)]"
      >

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-900">

          {/* Navegação prev/next */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => hasPrev && onNavigate(currentIndex - 1)}
              disabled={!hasPrev}
              title="Anterior (←)"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition
                text-slate-400 hover:text-slate-700 hover:bg-slate-100
                dark:hover:text-slate-200 dark:hover:bg-slate-800
                disabled:opacity-25 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => hasNext && onNavigate(currentIndex + 1)}
              disabled={!hasNext}
              title="Próximo (→)"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition
                text-slate-400 hover:text-slate-700 hover:bg-slate-100
                dark:hover:text-slate-200 dark:hover:bg-slate-800
                disabled:opacity-25 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
            {files.length > 1 && (
              <span className="text-xs text-slate-400 ml-1 tabular-nums">
                {currentIndex + 1} / {files.length}
              </span>
            )}
          </div>

          {/* Nome + badge */}
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {badge && (
              <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold ${badge.color}`}>
                {badge.label}
              </span>
            )}
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate" title={filename}>
              {filename}
            </p>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-1 shrink-0">
            <a
              href={downloadUrl}
              title="Baixar arquivo"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400
                hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition"
            >
              <Download size={16} />
            </a>
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir em nova aba"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400
                hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition"
            >
              <ExternalLink size={16} />
            </a>
            <button
              onClick={onClose}
              title="Fechar (Esc)"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400
                hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Corpo: iframe + barra de metadata ── */}
        <div className="flex flex-1 min-h-0">

          {/* iframe */}
          <div className="flex-1 bg-slate-100 dark:bg-slate-800 min-w-0">
            <iframe
              key={viewUrl}
              src={viewUrl}
              className="w-full h-full border-0"
              title={`Preview — ${filename}`}
            />
          </div>

          {/* Sidebar de metadata */}
          <div className="hidden lg:flex flex-col w-56 shrink-0 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-y-auto">
            <p className="px-4 pt-4 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Informações
            </p>
            <div className="px-4 pb-4 space-y-4">
              {metadataItems.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Icon size={11} className="text-slate-400" />
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {item.label}
                      </span>
                    </div>
                    {typeof item.value === 'string' ? (
                      <p className={`text-xs leading-snug
                        ${item.wrap ? 'break-all' : 'truncate'}
                        ${item.mono  ? 'font-mono' : ''}
                        ${item.bold  ? 'font-bold' : 'font-medium'}
                        ${item.green ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}
                      `}>
                        {item.value}
                      </p>
                    ) : (
                      item.value
                    )}
                  </div>
                );
              })}
            </div>

            {/* Atalhos de teclado */}
            <div className="mt-auto px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300 dark:text-slate-600 mb-2">Atalhos</p>
              {[
                ['←  →', 'Navegar'],
                ['Esc',  'Fechar'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between mb-1">
                  <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">{key}</kbd>
                  <span className="text-[10px] text-slate-400">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Animação keyframe — injetada uma vez */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0.6; }
          to   { transform: translateX(0);    opacity: 1;   }
        }
      `}</style>
    </>
  );
}
