import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen, Download, Eye, Trash2, Search, File, FileText,
  Image as ImageIcon, RefreshCw, Pencil, X, FolderInput,
  CheckCircle2, AlertTriangle, FileArchive, Layers,
  Bell, ChevronDown, ChevronUp, User, Calendar, Bug, CalendarDays, ArrowUpDown
} from 'lucide-react';
import { fetchArquivos, api } from '../services/api';
import { documentoApi } from '../services/dbService';
import { useToast } from '../components/shared/Toast';
import { getAgendamentos, atualizarAgendamento } from '../services/agendaService';
import DocumentPreview from '../components/dashboard/DocumentPreview';
import { ClientePerfilModal } from '../components/documentos/ClientePerfilModal';

// ─── helpers ────────────────────────────────────────────────────────────────

const FILTER_TABS = [
  { id: 'all',       label: 'Todos'       },
  { id: 'laudo',     label: 'Laudos'      },
  { id: 'recibo',    label: 'Recibos'     },
  { id: 'orcamento', label: 'Orçamentos'  },
  { id: 'lixeira',   label: 'Lixeira'     },
];

function matchesTipo(arquivo, filtro) {
  if (filtro === 'all') return true;
  if (filtro === 'lixeira') {
    return arquivo.status === 'lixeira' ||
      (arquivo.caminho || arquivo.origem || '').toLowerCase().includes('lixeira');
  }
  const tipo    = (arquivo.tipo    || '').toLowerCase();
  const origem  = (arquivo.origem  || '').toLowerCase();
  const caminho = (arquivo.caminho || arquivo.nome || '').toLowerCase();
  return tipo.includes(filtro) || origem.includes(filtro) || caminho.includes(filtro);
}

function isLixeira(arquivo) {
  return arquivo.status === 'lixeira' ||
    (arquivo.caminho || arquivo.origem || '').toLowerCase().includes('lixeira');
}

function getTipoBadge(arquivo) {
  const tipo = (arquivo.tipo || arquivo.origem || '').toLowerCase();
  if (tipo.includes('laudo'))     return { label: 'Laudo',     color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' };
  if (tipo.includes('recibo'))    return { label: 'Recibo',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' };
  if (tipo.includes('orcamento')) return { label: 'Orçamento', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
  return null;
}

function getFileIcon(filename) {
  if (!filename) return File;
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'pdf')                              return FileText;
  if (['png','jpg','jpeg','gif','webp'].includes(ext)) return ImageIcon;
  if (['zip','rar','7z'].includes(ext))           return FileArchive;
  return File;
}

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024)    return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return iso; }
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-700">
      {[1,2,3,4,5].map(i => (
        <div key={i} className="flex items-center gap-4 px-5 py-3">
          <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-2/3" />
            <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/3" />
          </div>
          <div className="flex gap-2">
            {[1,2,3].map(j => <div key={j} className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Modal de confirmação de exclusão ────────────────────────────────────────
function ModalConfirmar({ filename, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Excluir arquivo?</h3>
            <p className="text-xs text-slate-500 mt-0.5">Esta ação não pode ser desfeita.</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-3 py-2 font-mono truncate">
          {filename}
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition">
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de edição / mover ─────────────────────────────────────────────────
function ModalEditar({ arquivo, diretorios, onSalvar, onCancel }) {
  const filename = arquivo.nome || arquivo.filename || '';
  const [novoNome, setNovoNome] = useState(filename);
  const [dirSelecionado, setDirSelecionado] = useState('');
  const [customDir, setCustomDir] = useState('');
  const [salvando, setSalvando] = useState(false);

  const dirOptions = [
    { label: 'Laudos',     path: diretorios.laudos     },
    { label: 'Recibos',    path: diretorios.recibos    },
    { label: 'Orçamentos', path: diretorios.orcamentos },
  ].filter(d => d.path);

  const handleSalvar = async () => {
    const destino = dirSelecionado === 'custom' ? customDir.trim() : dirSelecionado;
    if (!destino) return;
    setSalvando(true);
    await onSalvar({ novoNome: novoNome.trim(), novoDir: destino });
    setSalvando(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Pencil size={18} className="text-blue-500" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Editar arquivo</h3>
              <p className="text-xs text-slate-500">Renomear e escolher destino</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <X size={16} />
          </button>
        </div>

        {/* Nome */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Novo nome</label>
          <input
            type="text"
            value={novoNome}
            onChange={e => setNovoNome(e.target.value)}
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Diretório destino */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <FolderInput size={12} /> Salvar em
          </label>
          <div className="space-y-2">
            {dirOptions.map(d => (
              <label key={d.path} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                dirSelecionado === d.path
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}>
                <input type="radio" name="dir" value={d.path} checked={dirSelecionado === d.path}
                  onChange={() => setDirSelecionado(d.path)} className="sr-only" />
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  dirSelecionado === d.path ? 'border-blue-500' : 'border-slate-300 dark:border-slate-500'
                }`}>
                  {dirSelecionado === d.path && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{d.label}</p>
                  <p className="text-[10px] text-slate-400 truncate font-mono">{d.path}</p>
                </div>
              </label>
            ))}
            {/* Diretório personalizado */}
            <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
              dirSelecionado === 'custom'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}>
              <input type="radio" name="dir" value="custom" checked={dirSelecionado === 'custom'}
                onChange={() => setDirSelecionado('custom')} className="sr-only" />
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                dirSelecionado === 'custom' ? 'border-blue-500' : 'border-slate-300 dark:border-slate-500'
              }`}>
                {dirSelecionado === 'custom' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Outro diretório</p>
                {dirSelecionado === 'custom' && (
                  <input
                    type="text"
                    value={customDir}
                    onChange={e => setCustomDir(e.target.value)}
                    placeholder="C:\caminho\absoluto\do\diretório"
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onClick={e => e.stopPropagation()}
                  />
                )}
              </div>
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando || !dirSelecionado || (dirSelecionado === 'custom' && !customDir.trim()) || !novoNome.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition flex items-center justify-center gap-2">
            {salvando ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function Arquivos() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [arquivos, setArquivos]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [searchTerm, setSearchTerm]   = useState('');
  const [filtroTipo, setFiltroTipo]   = useState('all');
  const [previewFile, setPreviewFile] = useState(null); // { nome, caminho }
  const [deleteModal, setDeleteModal]           = useState(null);
  const [editModal, setEditModal]               = useState(null);
  const [esvaziandoLixeira, setEsvaziandoLixeira]   = useState(false);
  const [confirmarLixeira, setConfirmarLixeira]     = useState(false);
  const [vencimentos, setVencimentos]               = useState([]);
  const [loadingVenc, setLoadingVenc]               = useState(false);
  const [expandVenc, setExpandVenc]                 = useState(true);
  const [clientePerfil, setClientePerfil]           = useState(null);
  const [diretorios, setDiretorios]   = useState({ laudos: '', recibos: '', orcamentos: '' });
  const [sortOrder, setSortOrder]     = useState('recente');
  const [mapaValores, setMapaValores] = useState({});

  const loadArquivos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchArquivos();
      setArquivos(Array.isArray(data) ? data : data.arquivos || []);
    } catch {
      addToast('Erro ao carregar arquivos', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDiretorios = useCallback(async () => {
    try {
      const resp = await api.get('/api/config/diretorios');
      const cfg  = resp.data || {};
      const dl   = cfg.download || {};
      setDiretorios({
        laudos:     dl.laudos     || '',
        recibos:    dl.recibos    || '',
        orcamentos: dl.orcamentos || '',
      });
    } catch { /* sem configuração, sem problema */ }
  }, []);

  useEffect(() => {
    loadArquivos();
    loadDiretorios();
    documentoApi.getAll()
      .then(docs => {
        const mapa = {};
        (Array.isArray(docs) ? docs : []).forEach(doc => {
          if (doc.nomeArquivo && doc.valor != null) {
            const base = doc.nomeArquivo.split(/[\\/]/).pop();
            mapa[base] = doc;
          }
        });
        setMapaValores(mapa);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const loadVencimentos = async () => {
      setLoadingVenc(true);
      try {
        const resp = await api.get('/api/documentos/vencimentos');
        setVencimentos(resp.data || []);
      } catch { /* sem laudos ou pasta ainda não configurada */ }
      finally { setLoadingVenc(false); }
    };
    loadVencimentos();
  }, []);

  // Filtros + Ordenação
  const filteredFiles = useMemo(() => {
    let lista = arquivos.filter(f => {
      const name = (f.nome || f.filename || '').toLowerCase();
      return name.includes(searchTerm.toLowerCase()) && matchesTipo(f, filtroTipo);
    });
    if (sortOrder === 'recente') lista.sort((a, b) => (b.data_modificacao || b.data || '').localeCompare(a.data_modificacao || a.data || ''));
    if (sortOrder === 'antigo')  lista.sort((a, b) => (a.data_modificacao || a.data || '').localeCompare(b.data_modificacao || b.data || ''));
    if (sortOrder === 'az')      lista.sort((a, b) => (a.nome || a.filename || '').localeCompare(b.nome || b.filename || ''));
    if (sortOrder === 'za')      lista.sort((a, b) => (b.nome || b.filename || '').localeCompare(a.nome || a.filename || ''));
    return lista;
  }, [arquivos, searchTerm, filtroTipo, sortOrder]);

  const counts = {
    all:       arquivos.length,
    laudo:     arquivos.filter(f => matchesTipo(f, 'laudo')).length,
    recibo:    arquivos.filter(f => matchesTipo(f, 'recibo')).length,
    orcamento: arquivos.filter(f => matchesTipo(f, 'orcamento')).length,
    lixeira:   arquivos.filter(f => matchesTipo(f, 'lixeira')).length,
  };

  // Ações
  const handleDelete = async () => {
    if (!deleteModal) return;
    const filename = deleteModal.nome || deleteModal.filename;
    const caminho  = deleteModal.caminho;
    try {
      // Envia o caminho completo para exclusão direta sem busca
      await api.post('/api/arquivo/excluir', { caminho: caminho || filename });
      addToast('Arquivo excluído', 'success');
      // Remove registro de valor do db.json
      documentoApi.deleteByFilename(filename).catch(() => {});
      setMapaValores(prev => { const n = { ...prev }; delete n[filename]; return n; });
      loadArquivos();

      // Marcar evento correspondente na Agenda como deletado
      try {
        // Determinar tipo do documento pelo arquivo
        const tipoArq = (deleteModal.tipo || deleteModal.origem || filename || '').toLowerCase();
        const tipoAgenda = ['laudo', 'recibo', 'orcamento'].find(t => tipoArq.includes(t));

        // Extrair número do documento: última sequência numérica antes da extensão
        // Ex: "Laudo_Empresa_2026-04-22_0001.pdf" → "0001"
        //     "Laudo_Empresa_20260422_1.pdf"       → "1"
        const numMatch = (filename || '').match(/[_\s](\d{1,6})(?:\.[^.]+)?$/);
        if (numMatch && tipoAgenda) {
          const num = numMatch[1].replace(/^0+/, '') || '0'; // sem zeros à esquerda
          const eventos = await getAgendamentos();
          const alvo = eventos.find(e =>
            e.tipo === tipoAgenda &&
            e.numeroDoc !== undefined &&
            (String(e.numeroDoc).replace(/^0+/, '') || '0') === num
          );
          if (alvo) await atualizarAgendamento(alvo.id, { deletado: true });
        }
      } catch { /* silencioso — não bloqueia exclusão */ }
    } catch {
      addToast('Erro ao excluir arquivo', 'error');
    } finally {
      setDeleteModal(null);
    }
  };

  const handleMover = async ({ novoNome, novoDir }) => {
    if (!editModal) return;
    try {
      await api.post('/api/arquivo/mover', {
        caminho:  editModal.caminho,
        novo_nome: novoNome,
        novo_dir:  novoDir,
      });
      addToast('Arquivo salvo com sucesso!', 'success');
      loadArquivos();
    } catch {
      addToast('Erro ao mover arquivo', 'error');
    } finally {
      setEditModal(null);
    }
  };

  // Abre o documento no editor (busca sidecar JSON e navega)
  const handleAbrirEditor = async (arquivo) => {
    const caminho = arquivo.caminho;
    if (!caminho) {
      addToast('Caminho do arquivo não encontrado', 'error');
      return;
    }

    // Detectar tipo a partir do arquivo
    const tipo = (arquivo.tipo || arquivo.origem || '').toLowerCase();
    let tab = 'laudo';
    if (tipo.includes('recibo')) tab = 'recibo';
    else if (tipo.includes('orcamento')) tab = 'orcamento';

    try {
      const resp = await api.get(`/api/documentos/metadados?caminho=${encodeURIComponent(caminho)}`);
      sessionStorage.setItem('__editar_documento', JSON.stringify({
        ...resp.data,
        __caminho_original: caminho,
        __tipo: tab,
      }));
    } catch {
      // Sem sidecar — abre o editor vazio com apenas o tipo pré-selecionado
      sessionStorage.removeItem('__editar_documento');
      addToast('Metadados não encontrados — editor abrirá em branco', 'warning');
    }

    navigate(`/documentos?tab=${tab}`);
  };

  // Navega para a Agenda pré-buscando o cliente desse arquivo
  const handleVerNaAgenda = async (arquivo) => {
    const caminho = arquivo.caminho;
    if (!caminho) { addToast('Caminho do arquivo não encontrado', 'error'); return; }
    try {
      const resp = await api.get(`/api/documentos/metadados?caminho=${encodeURIComponent(caminho)}`);
      const meta = resp.data || {};
      // Laudos guardam dados em formData.cliente; recibos/orcamentos em clientData
      const c = meta.formData?.cliente || meta.clientData || meta.cliente || {};
      const cliente = {
        nome:     c.nome     || c.razaoSocial || '',
        fantasia: c.fantasia || '',
        cnpj:     c.cnpj     || '',
        telefone: c.telefone || '',
        endereco: c.endereco || '',
      };
      navigate('/agenda', { state: { cliente } });
    } catch {
      // Sem metadados — navega mesmo assim para a Agenda
      navigate('/agenda');
    }
  };

  const handleEsvaziarLixeira = async () => {
    setEsvaziandoLixeira(true);
    try {
      await api.post('/api/arquivo/esvaziar-lixeira');
      addToast('Lixeira esvaziada com sucesso!', 'success');
      loadArquivos();
    } catch {
      addToast('Erro ao esvaziar lixeira', 'error');
    } finally {
      setEsvaziandoLixeira(false);
      setConfirmarLixeira(false);
    }
  };

  // ── render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Arquivos</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gerenciador de documentos gerados</p>
        </div>
        <div className="flex gap-2">
          {filtroTipo === 'lixeira' && counts.lixeira > 0 && (
            confirmarLixeira ? (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl px-4 py-2.5">
                <span className="text-sm font-medium text-red-700 dark:text-red-300">Apagar {counts.lixeira} arquivo{counts.lixeira !== 1 ? 's' : ''} permanentemente?</span>
                <button onClick={handleEsvaziarLixeira} disabled={esvaziandoLixeira}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg disabled:opacity-60 flex items-center gap-1 transition">
                  {esvaziandoLixeira ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />} Confirmar
                </button>
                <button onClick={() => setConfirmarLixeira(false)}
                  className="px-3 py-1 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-300 transition">
                  Cancelar
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmarLixeira(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition">
                <Trash2 size={16} /> Esvaziar Lixeira
              </button>
            )
          )}
          <button onClick={loadArquivos}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Atualizar
          </button>
        </div>
      </div>

      {/* ── Painel de Vencimentos / Remarketing ─────────────────────────────── */}
      {(loadingVenc || vencimentos.length > 0) && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-orange-200 dark:border-orange-700/50 shadow-sm overflow-hidden">
          {/* Header colapsável */}
          <button
            onClick={() => setExpandVenc(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Bell size={15} className="text-orange-600 dark:text-orange-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-800 dark:text-white leading-none">
                  Vencimentos / Remarketing
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {loadingVenc ? 'Verificando garantias...' : `${vencimentos.length} garantia${vencimentos.length !== 1 ? 's' : ''} vencendo em ±30 dias`}
                </p>
              </div>
            </div>
            {expandVenc ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>

          {expandVenc && (
            <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {loadingVenc ? (
                [1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-700 animate-pulse" />)
              ) : vencimentos.map((v, idx) => {
                const vencido  = v.dias_restantes < 0;
                const urgente  = !vencido && v.dias_restantes <= 7;
                const badgeCls = vencido
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  : urgente
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
                const badgeLabel = vencido
                  ? `Vencido há ${Math.abs(v.dias_restantes)} dia${Math.abs(v.dias_restantes) !== 1 ? 's' : ''}`
                  : v.dias_restantes === 0
                    ? 'Vence hoje!'
                    : `Vence em ${v.dias_restantes} dia${v.dias_restantes !== 1 ? 's' : ''}`;

                return (
                  <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 flex flex-col gap-2 hover:border-orange-300 dark:hover:border-orange-600 transition">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight truncate flex-1">
                        {v.nome_cliente}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${badgeCls}`}>
                        {badgeLabel}
                      </span>
                    </div>

                    {v.pragas?.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Bug size={11} />
                        <span className="truncate capitalize">{v.pragas.join(', ')}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar size={11} />
                      <span>Vence em {v.data_vencimento} • Garantia {v.garanti_meses} {v.garanti_meses === 1 ? 'mês' : 'meses'}</span>
                    </div>

                    <button
                      onClick={() => setClientePerfil({
                        nome: v.nome_cliente, fantasia: v.fantasia,
                        cnpj: v.cnpj, endereco: v.endereco,
                      })}
                      className="mt-1 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:text-orange-700 dark:hover:text-orange-300 transition"
                    >
                      <User size={12} /> Ver Cliente
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',      count: counts.all,       icon: Layers,    color: 'text-slate-500',   bg: 'bg-slate-100 dark:bg-slate-700'            },
          { label: 'Laudos',     count: counts.laudo,     icon: FileText,  color: 'text-blue-600',    bg: 'bg-blue-100 dark:bg-blue-900/30'            },
          { label: 'Recibos',    count: counts.recibo,    icon: FileText,  color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30'      },
          { label: 'Orçamentos', count: counts.orcamento, icon: FileText,  color: 'text-amber-600',   bg: 'bg-amber-100 dark:bg-amber-900/30'          },
        ].map(({ label, count, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{count}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros + busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-wrap flex-1">
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
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative max-w-sm w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Filtrar arquivos..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <ArrowUpDown size={14} className="text-slate-400" />
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              className="text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="recente">Mais Recentes</option>
              <option value="antigo">Mais Antigos</option>
              <option value="az">A → Z</option>
              <option value="za">Z → A</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <Skeleton />
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
              const filename  = arquivo.nome || arquivo.filename || `arquivo_${i}`;
              const Icon      = getFileIcon(filename);
              const badge     = getTipoBadge(arquivo);
              const lixeira   = isLixeira(arquivo);
              const docDb     = mapaValores[filename];
              const temValor  = docDb && docDb.valor != null && (badge?.label === 'Recibo' || badge?.label === 'Orçamento');
              const fmtV      = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

              return (
                <div key={i} className={`flex items-center gap-4 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition ${lixeira ? 'opacity-70' : ''}`}>
                  {/* Ícone */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    lixeira ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                    <Icon size={18} className={lixeira ? 'text-red-400' : 'text-blue-500'} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate max-w-xs">{filename}</p>
                      {badge && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badge.color}`}>{badge.label}</span>
                      )}
                      {temValor && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                          badge?.label === 'Recibo'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        }`}>{fmtV(docDb.valor)}</span>
                      )}
                      {lixeira && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">Lixeira</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatSize(arquivo.tamanho)}
                      {(arquivo.data_modificacao || arquivo.data) && ` · ${formatDate(arquivo.data_modificacao || arquivo.data)}`}
                    </p>
                  </div>

                  {/* Ações — sempre visíveis */}
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setPreviewFile({ nome: filename, caminho: arquivo.caminho })} title="Visualizar"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition">
                      <Eye size={15} />
                    </button>
                    <a href={`/api/download/${encodeURIComponent(filename)}${arquivo.caminho ? '?caminho=' + encodeURIComponent(arquivo.caminho) : ''}`} title="Baixar"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition">
                      <Download size={15} />
                    </a>
                    {!lixeira && (
                      <button onClick={() => handleAbrirEditor(arquivo)} title="Editar no editor"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition">
                        <Pencil size={15} />
                      </button>
                    )}
                    {!lixeira && (
                      <button onClick={() => handleVerNaAgenda(arquivo)} title="Ver na Agenda"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition">
                        <CalendarDays size={15} />
                      </button>
                    )}
                    <button onClick={() => setDeleteModal(arquivo)} title="Excluir"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Barra de totais — só para recibos e orçamentos */}
        {!loading && filteredFiles.length > 0 && (filtroTipo === 'recibo' || filtroTipo === 'orcamento') && (() => {
          const fmtV = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
          const total = filteredFiles.reduce((acc, arq) => {
            const nome = arq.nome || arq.filename || '';
            const doc  = mapaValores[nome];
            return acc + (doc?.valor || 0);
          }, 0);
          const comValor = filteredFiles.filter(arq => {
            const nome = arq.nome || arq.filename || '';
            return mapaValores[nome]?.valor != null;
          }).length;
          if (total === 0) return null;
          return (
            <div className={`flex items-center justify-between px-5 py-3 border-t-2 ${
              filtroTipo === 'recibo'
                ? 'border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/10'
                : 'border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10'
            }`}>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Total de {comValor} {filtroTipo === 'recibo' ? 'recibos' : 'orçamentos'} com valor registrado
              </span>
              <span className={`text-base font-black ${
                filtroTipo === 'recibo' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
              }`}>{fmtV(total)}</span>
            </div>
          );
        })()}
      </div>

      {/* Modais */}
      <DocumentPreview
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        filename={previewFile?.nome}
        caminho={previewFile?.caminho}
      />

      {deleteModal && (
        <ModalConfirmar
          filename={deleteModal.nome || deleteModal.filename}
          onConfirm={handleDelete}
          onCancel={() => setDeleteModal(null)}
        />
      )}

      {editModal && (
        <ModalEditar
          arquivo={editModal}
          diretorios={diretorios}
          onSalvar={handleMover}
          onCancel={() => setEditModal(null)}
        />
      )}

      <ClientePerfilModal
        cliente={clientePerfil}
        onClose={() => setClientePerfil(null)}
      />
    </div>
  );
}
