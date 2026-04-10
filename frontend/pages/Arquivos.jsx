import React, { useState, useEffect } from 'react';
import { FolderOpen, Download, Eye, Trash2, Upload, Search, File, FileText, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { fetchArquivos, api } from '../services/api';
import { useToast } from '../components/shared/Toast';
import DocumentPreview from '../components/dashboard/DocumentPreview';

export default function Arquivos() {
  const { addToast } = useToast();
  const [arquivos, setArquivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewFile, setPreviewFile] = useState(null);

  const loadArquivos = async () => {
    setLoading(true);
    try {
      const data = await fetchArquivos();
      setArquivos(Array.isArray(data) ? data : data.arquivos || []);
    } catch (e) {
      addToast('Erro ao carregar arquivos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadArquivos(); }, []);

  const handleDelete = async (filename) => {
    if (!confirm(`Excluir "${filename}"?`)) return;
    try {
      await api.post('/api/arquivo/excluir', { arquivo: filename });
      addToast('Arquivo excluido', 'success');
      loadArquivos();
    } catch (e) {
      addToast('Erro ao excluir arquivo', 'error');
    }
  };

  const filteredFiles = arquivos.filter(f => {
    const name = (f.nome || f.filename || '').toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  const getFileIcon = (filename) => {
    if (!filename) return File;
    const ext = filename.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return FileText;
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return ImageIcon;
    return File;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Arquivos</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gerenciador de documentos gerados</p>
        </div>
        <button onClick={loadArquivos}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Filtrar arquivos..."
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-600
            bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400"
        />
      </div>

      {/* File Grid */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
                <div className="flex-1 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="p-12 text-center">
            <FolderOpen size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm text-slate-500">Nenhum arquivo encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {filteredFiles.map((arquivo, i) => {
              const filename = arquivo.nome || arquivo.filename || `arquivo_${i}`;
              const Icon = getFileIcon(filename);
              return (
                <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition group">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Icon size={18} className="text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{filename}</p>
                    <p className="text-xs text-slate-400">{arquivo.tamanho || ''} {arquivo.data ? `- ${arquivo.data}` : ''}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => setPreviewFile(filename)} title="Visualizar"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition">
                      <Eye size={16} />
                    </button>
                    <a href={`/api/download/${encodeURIComponent(filename)}`} title="Baixar"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition">
                      <Download size={16} />
                    </a>
                    <button onClick={() => handleDelete(filename)} title="Excluir"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DocumentPreview isOpen={!!previewFile} onClose={() => setPreviewFile(null)} filename={previewFile} />
    </div>
  );
}
