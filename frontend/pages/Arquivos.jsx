import React, { useState, useEffect } from 'react';
import { FolderOpen, Download, Eye, Trash2, Search, File, FileText, Image as ImageIcon, RefreshCw, RotateCcw } from 'lucide-react';
import { fetchArquivos, api } from '../services/api';
import { useToast } from '../components/shared/Toast';
import DocumentPreview from '../components/dashboard/DocumentPreview';

const TIPO_LABELS = {
  all: 'Todos',
  download_laudo: 'Laudos',
  download_recibo: 'Recibos',
  download_orcamento: 'Orçamentos',
  upload_laudo: 'Laudos',
  upload_recibo: 'Recibos',
  upload_orcamento: 'Orçamentos',
  documentos: 'Documentos',
  output: 'Outros',
};

const FILTER_TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'laudo', label: 'Laudos' },
  { id: 'recibo', label: 'Recibos' },
  { id: 'orcamento', label: 'Orçamentos' },
  { id: 'lixeira', label: 'Lixeira' },
];

function matchesTipo(arquivo, filtro) {
  if (filtro === 'all') return true;
  if (filtro === 'lixeira') {
    return (arquivo.status === 'lixeira') || (arquivo.caminho || arquivo.origem || '').toLowerCase().includes('lixeira');
  }
  const tipo = (arquivo.tipo || '').toLowerCase();
  const origem = (arquivo.origem || '').toLowerCase();
  const caminho = (arquivo.caminho || arquivo.nome || '').toLowerCase();
  return tipo.includes(filtro) || origem.includes(filtro) || caminho.includes(filtro);
}

export default function Arquivos() {
  const { addToast } = useToast();
  const [arquivos, setArquivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('all');
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
    const matchSearch = name.includes(searchTerm.toLowerCase());
    return matchSearch && matchesTipo(f, filtroTipo);
  });

  // Contagens por tipo para badges
  const counts = {
    all: arquivos.length,
    laudo: arquivos.filter(f => matchesTipo(f, 'laudo')).length,
    recibo: arquivos.filter(f => matchesTipo(f, 'recibo')).length,
    orcamento: arquivos.filter(f => matchesTipo(f, 'orcamento')).length,
    lixeira: arquivos.filter(f => matchesTipo(f, 'lixeira')).length,
  };

  const getFileIcon = (filename) => {
    if (!filename) return File;
    const ext = filename.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return FileText;
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return ImageIcon;
    return File;
  };

  const getTipoBadge = (arquivo) => {
    const tipo = arquivo.tipo || arquivo.origem || '';
    if (tipo.includes('laudo')) return { label: 'Laudo', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' };
    if (tipo.includes('recibo')) return { label: 'Recibo', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' };
    if (tipo.includes('orcamento')) return { label: 'Orçamento', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
    return null;
  };

  const isLixeira = (arquivo) =>
    (arquivo.status === 'lixeira') || (arquivo.caminho || arquivo.origem || '').toLowerCase().includes('lixeira');

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return iso; }
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

      {/* Filtros por tipo */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_TABS.map(tab => (
          <button key={tab.id} onClick={() => setFiltroTipo(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${
              filtroTipo === tab.id
                ? tab.id === 'lixeira'
                  ? 'bg-red-500 text-white shadow-md'
                  : 'bg-brand-500 text-white shadow-md'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}>
            {tab.label}
            {counts[tab.id] > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                filtroTipo === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
              }`}>{counts[tab.id]}</span>
            )}
          </button>
        ))}
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

      {/* File List */}
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
            {filtroTipo !== 'all' && (
              <button onClick={() => setFiltroTipo('all')} className="mt-2 text-xs text-brand-500 hover:underline">
                Ver todos os arquivos
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {filteredFiles.map((arquivo, i) => {
              const filename = arquivo.nome || arquivo.filename || `arquivo_${i}`;
              const Icon = getFileIcon(filename);
              const badge = getTipoBadge(arquivo);
              const lixeira = isLixeira(arquivo);
              return (
                <div key={i} className={`flex items-center gap-4 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition group ${lixeira ? 'opacity-70' : ''}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    lixeira ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                    <Icon size={18} className={lixeira ? 'text-red-400' : 'text-blue-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{filename}</p>
                      {badge && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badge.color}`}>{badge.label}</span>
                      )}
                      {lixeira && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">Lixeira</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {formatSize(arquivo.tamanho)}{arquivo.data_modificacao ? ` · ${formatDate(arquivo.data_modificacao)}` : arquivo.data ? ` · ${arquivo.data}` : ''}
                    </p>
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
