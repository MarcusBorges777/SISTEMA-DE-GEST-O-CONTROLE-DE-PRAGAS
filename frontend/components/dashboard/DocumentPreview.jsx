import React from 'react';
import { ExternalLink, Download, X } from 'lucide-react';
import Modal from '../shared/Modal';

export default function DocumentPreview({ isOpen, onClose, filename, caminho }) {
  if (!filename) return null;

  const caminhoParam = caminho ? `?caminho=${encodeURIComponent(caminho)}` : '';
  const viewUrl     = `/api/visualizar/${encodeURIComponent(filename)}${caminhoParam}`;
  const downloadUrl = `/api/download/${encodeURIComponent(filename)}${caminhoParam}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Preview do Documento" maxWidth="max-w-4xl">
      <div className="space-y-4">
        {/* Preview Embed */}
        <div className="w-full h-[60vh] bg-slate-100 dark:bg-slate-700 rounded-xl overflow-hidden">
          <iframe
            src={viewUrl}
            className="w-full h-full border-0"
            title="Document Preview"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs">{filename}</p>
          <div className="flex gap-2">
            <a
              href={downloadUrl}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl
                bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300
                hover:bg-slate-200 dark:hover:bg-slate-600 transition"
            >
              <Download size={16} /> Baixar
            </a>
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl
                bg-brand-500 text-white hover:bg-brand-600 transition"
            >
              <ExternalLink size={16} /> Abrir
            </a>
          </div>
        </div>
      </div>
    </Modal>
  );
}
