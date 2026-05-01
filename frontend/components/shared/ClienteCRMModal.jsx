import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import { documentoApi, agendaApi } from '../../services/dbService';
import { fetchArquivos, api } from '../../services/api';
import DocumentPreview from '../dashboard/DocumentPreview';
import {
  MapPin, Tag, Phone, Mail, Pencil, Check, X,
  CalendarDays, Receipt, Calculator, Bug, Wrench, FileText,
  Clock, Plus, FolderOpen,
  Eye, Download, Trash2, File, Image as ImageIcon, FileArchive,
  AlertTriangle,
} from 'lucide-react';
import { saveCliente, getClientes } from '../../services/clienteCache';
import { formatCpfCnpj } from '../../utils/formatters';

// ─── Constantes ───────────────────────────────────────────────────────────────

const DOC_CFG = {
  laudo:     { icon: Bug,        color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20',       badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',     label: 'Laudo'     },
  recibo:    { icon: Receipt,    color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', label: 'Recibo'    },
  orcamento: { icon: Calculator, color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-900/20',     badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: 'Orçamento' },
  servico:   { icon: Wrench,     color: 'text-purple-500',  bg: 'bg-purple-50 dark:bg-purple-900/20',   badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', label: 'Serviço'   },
};

const STATUS_COR = {
  'Agendado':     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Concluído':    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Cancelado':    'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
  'Emitido':      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'Em Andamento': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtData(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch {
    return iso.slice(0, 10);
  }
}

function fmtValor(v) {
  if (v == null || v === '') return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function getFileIconLocal(filename) {
  if (!filename) return File;
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'pdf') return FileText;
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return ImageIcon;
  if (['zip', 'rar', '7z'].includes(ext)) return FileArchive;
  return File;
}

function getTipoBadgeLocal(arq) {
  const s = ((arq.tipo || '') + ' ' + (arq.origem || '')).toLowerCase();
  if (s.includes('laudo'))     return { label: 'Laudo',     color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' };
  if (s.includes('recibo'))    return { label: 'Recibo',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' };
  if (s.includes('orcamento')) return { label: 'Orçamento', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' };
  return null;
}

function isLixeiraLocal(arq) {
  return arq.status === 'lixeira' ||
    ((arq.caminho || arq.origem || '')).toLowerCase().includes('lixeira');
}

// ─── Sub-componentes internos ─────────────────────────────────────────────────

function TabButton({ id, label, count, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      role="tab"
      aria-selected={active}
      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
        active
          ? 'border-brand-500 text-brand-600 dark:text-brand-400'
          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300'
      }`}
    >
      {label}
      {count > 0 && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
          active ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Aba 1: Cadastro ──────────────────────────────────────────────────────────

function TabCadastro({ cliente, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({});
  const [saved, setSaved]     = useState(false);
  const savedTimerRef         = useRef(null);

  useEffect(() => {
    setForm({
      nome:      cliente.nome      || '',
      fantasia:  cliente.fantasia  || '',
      cnpj:      formatCpfCnpj(cliente.cnpj || ''),
      endereco:  cliente.endereco  || '',
      atividadeEconomica: cliente.atividadeEconomica || cliente.atividade || '',
      atividade: cliente.atividadeEconomica || cliente.atividade || '',
      email:     cliente.email     || '',
      telefone:  cliente.telefone  || '',
    });
    setEditing(false);
    setSaved(false);
  }, [cliente]);

  useEffect(() => () => clearTimeout(savedTimerRef.current), []);

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleSalvar = async () => {
    if (!form.nome?.trim() && !form.fantasia?.trim()) return;
    await saveCliente(form);
    setSaved(true);
    setEditing(false);
    if (onUpdate) getClientes().then(onUpdate).catch(() => {});
    clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2500);
  };

  const inputCls = 'w-full text-sm text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600 focus:border-brand-400 focus:outline-none bg-transparent py-1 transition-colors';
  const labelCls = 'text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5';

  return (
    <div className="space-y-5">
      {saved && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2">
          <Check size={13} /> Dados atualizados com sucesso.
        </div>
      )}

      <div className="flex justify-end">
        {editing ? (
          <div className="flex gap-2">
            <button onClick={handleSalvar}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition">
              <Check size={13} /> Salvar
            </button>
            <button onClick={() => setEditing(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold transition">
              <X size={13} /> Cancelar
            </button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-brand-50 dark:hover:bg-brand-900/30 text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 text-xs font-semibold transition">
            <Pencil size={12} /> Editar dados
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <p className={labelCls}>Razão Social</p>
          {editing
            ? <input value={form.nome} onChange={e => set('nome', e.target.value)} className={inputCls} placeholder="Razão Social" />
            : <p className="text-sm text-slate-700 dark:text-slate-200">{form.nome || '—'}</p>}
        </div>
        <div>
          <p className={labelCls}>Nome Fantasia</p>
          {editing
            ? <input value={form.fantasia} onChange={e => set('fantasia', e.target.value)} className={inputCls} placeholder="Nome Fantasia" />
            : <p className="text-sm text-slate-700 dark:text-slate-200">{form.fantasia || '—'}</p>}
        </div>
        <div>
          <p className={labelCls}>CNPJ / CPF</p>
          {editing
            ? <input value={form.cnpj} onChange={e => set('cnpj', formatCpfCnpj(e.target.value))} className={inputCls} maxLength={18} placeholder="CNPJ ou CPF" />
            : <p className="text-sm font-mono text-slate-700 dark:text-slate-200">{form.cnpj ? formatCpfCnpj(form.cnpj) : '—'}</p>}
        </div>
        <div className="sm:col-span-2">
          <p className={labelCls}>Endereço</p>
          {editing
            ? <input value={form.endereco} onChange={e => set('endereco', e.target.value)} className={inputCls} placeholder="Rua, número, bairro, cidade" />
            : form.endereco
              ? <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"><MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" /><span>{form.endereco}</span></div>
              : <p className="text-sm text-slate-400 italic">Não informado</p>}
        </div>
        <div className="sm:col-span-2">
          <p className={labelCls}>Atividade / Segmento</p>
          {editing
            ? <input value={form.atividadeEconomica || ''} onChange={e => setForm(p => ({ ...p, atividadeEconomica: e.target.value, atividade: e.target.value }))} className={inputCls} placeholder="Ex: 8122-2/00 - Imunizacao e controle de pragas urbanas" />
            : (form.atividadeEconomica || form.atividade)
              ? <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 italic"><Tag size={14} className="text-slate-400 mt-0.5 shrink-0" /><span>{form.atividadeEconomica || form.atividade}</span></div>
              : <p className="text-sm text-slate-400 italic">Não informado</p>}
        </div>
        <div>
          <p className={labelCls}>Telefone</p>
          {editing
            ? <input value={form.telefone} onChange={e => set('telefone', e.target.value)} className={inputCls} placeholder="(00) 9 0000-0000" />
            : form.telefone
              ? <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><Phone size={14} className="text-slate-400 shrink-0" /><span>{form.telefone}</span></div>
              : <p className="text-sm text-slate-400 italic">Não informado</p>}
        </div>
        <div>
          <p className={labelCls}>E-mail</p>
          {editing
            ? <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} placeholder="contato@empresa.com" />
            : form.email
              ? <div className="flex items-center gap-2 text-sm"><Mail size={14} className="text-slate-400 shrink-0" /><a href={`mailto:${form.email}`} className="text-brand-600 dark:text-brand-400 hover:underline truncate">{form.email}</a></div>
              : <p className="text-sm text-slate-400 italic">Não informado</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Aba 2: Agenda ────────────────────────────────────────────────────────────

function TabAgenda({ eventos, loading, onNovaAgenda }) {
  const hoje = new Date().toISOString().slice(0, 10);

  if (loading) return <LoadingRows />;

  if (eventos.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Nenhum agendamento"
        desc="Este cliente ainda não possui serviços agendados."
        action={onNovaAgenda ? { label: '+ Nova Agenda', onClick: onNovaAgenda } : null}
      />
    );
  }

  const proximos  = eventos.filter(e => (e.data || '') >= hoje).sort((a, b) => (a.data || '').localeCompare(b.data || ''));
  const historico = eventos.filter(e => (e.data || '') <  hoje).sort((a, b) => (b.data || '').localeCompare(a.data || ''));

  const EventRow = ({ ev, futuro }) => {
    const cfg   = DOC_CFG[ev.tipo] || DOC_CFG.laudo;
    const Icon  = cfg.icon;
    const stCls = STATUS_COR[ev.status] || 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400';
    return (
      <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 dark:border-slate-700/50 last:border-0">
        <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
          <Icon size={14} className={cfg.color} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
            {cfg.label}{ev.tipoServico ? ` · ${ev.tipoServico}` : ''}
          </p>
          {ev.observacoes && <p className="text-xs text-slate-400 truncate">{ev.observacoes}</p>}
        </div>
        <span className={`text-[10px] font-mono shrink-0 ${futuro ? 'text-brand-600 dark:text-brand-400 font-bold' : 'text-slate-400'}`}>
          {fmtData(ev.data)}
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${stCls}`}>
          {ev.status}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {proximos.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-brand-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Clock size={10} /> Próximos ({proximos.length})
          </p>
          {proximos.map((ev, i) => <EventRow key={ev.id || i} ev={ev} futuro />)}
        </div>
      )}
      {historico.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Histórico ({historico.length})
          </p>
          {historico.map((ev, i) => <EventRow key={ev.id || i} ev={ev} futuro={false} />)}
        </div>
      )}
    </div>
  );
}

// ─── Aba 3: Arquivos (reais do filesystem) ────────────────────────────────────

function TabArquivos({ arquivos, loading, onPreview, onDelete, onGerarDoc, cliente }) {
  if (loading) return <LoadingRows />;

  const lista = [...arquivos].sort((a, b) =>
    ((b.data_modificacao || b.data || '')).localeCompare(a.data_modificacao || a.data || '')
  );

  if (lista.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Nenhum arquivo encontrado"
        desc="Laudos, recibos e orçamentos gerados para este cliente aparecerão aqui."
        action={onGerarDoc ? { label: '+ Gerar Documento', onClick: () => onGerarDoc(cliente, 'laudo') } : null}
      />
    );
  }

  return (
    <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
      {lista.map((arq, i) => {
        const filename = arq.nome || arq.filename || `arquivo_${i}`;
        const Icon     = getFileIconLocal(filename);
        const badge    = getTipoBadgeLocal(arq);
        const lixeira  = isLixeiraLocal(arq);

        return (
          <div
            key={i}
            className={`flex items-center gap-3 py-3 px-1 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-lg transition-colors group ${lixeira ? 'opacity-60' : ''}`}
          >
            {/* Ícone */}
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              lixeira ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
            }`}>
              <Icon size={16} className={lixeira ? 'text-red-400' : 'text-blue-500'} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                {badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.color}`}>
                    {badge.label}
                  </span>
                )}
                {lixeira && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                    Lixeira
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate leading-tight">
                {filename}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {fmtData(arq.data_modificacao || arq.data)}
                {arq.tamanho ? ` · ${arq.tamanho < 1024 * 1024
                  ? `${(arq.tamanho / 1024).toFixed(0)} KB`
                  : `${(arq.tamanho / 1024 / 1024).toFixed(1)} MB`}` : ''}
              </p>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onPreview(arq)}
                title="Visualizar"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
              >
                <Eye size={14} />
              </button>
              <a
                href={`/api/download/${encodeURIComponent(filename)}${arq.caminho ? `?caminho=${encodeURIComponent(arq.caminho)}` : ''}`}
                title="Baixar"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition"
              >
                <Download size={14} />
              </a>
              <button
                onClick={() => onDelete(arq)}
                title="Excluir"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Helpers de UI ────────────────────────────────────────────────────────────

function LoadingRows() {
  return (
    <div className="space-y-3 py-2">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 rounded bg-slate-100 dark:bg-slate-700 animate-pulse w-3/4" />
            <div className="h-2 rounded bg-slate-100 dark:bg-slate-700 animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
        <Icon size={22} className="text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</p>
      <p className="text-xs text-slate-400 mt-1 max-w-xs">{desc}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition"
        >
          <Plus size={12} /> {action.label}
        </button>
      )}
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function ClienteCRMModal({ cliente, onClose, onUpdate, onVerAgenda, onGerarDoc }) {
  const navigate                = useNavigate();
  const [activeTab, setTab]     = useState('cadastro');
  const [docs, setDocs]         = useState([]);
  const [eventos, setEventos]   = useState([]);
  const [arquivos, setArquivos] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [previewFile, setPreviewFile]   = useState(null);   // { nome, caminho }
  const [deleteTarget, setDeleteTarget] = useState(null);   // arquivo a excluir
  const [deleting, setDeleting]         = useState(false);

  useEffect(() => {
    if (!cliente) return;
    let alive = true;
    setTab('cadastro');
    setDocs([]);
    setEventos([]);
    setArquivos([]);
    setLoading(true);

    const cnpjDigits   = (cliente.cnpj    || '').replace(/\D/g, '');
    const nomeNorm     = (cliente.nome     || '').toLowerCase().trim();
    const fantasiaNorm = (cliente.fantasia || '').toLowerCase().trim();

    // Palavras com 3+ chars para match no filename
    const palavras = [nomeNorm, fantasiaNorm]
      .join(' ')
      .split(/\s+/)
      .filter(p => p.length >= 3);

    Promise.all([
      documentoApi.getAll().catch(() => []),
      agendaApi.getAll().catch(() => []),
      fetchArquivos().catch(() => []),
    ]).then(([docsData, agendaData, arquivosData]) => {
      if (!alive) return;

      // ── Filtro de documentos db.json ─────────────────────────────
      const allDocs = Array.isArray(docsData) ? docsData : [];
      setDocs(allDocs.filter(d => {
        if (cliente.id && d.clienteId === cliente.id) return true;
        if (cnpjDigits && (d.clienteCnpj || '').replace(/\D/g, '') === cnpjDigits) return true;
        const dNome = (d.clienteNome || '').toLowerCase().trim();
        if (nomeNorm && dNome === nomeNorm) return true;
        if (fantasiaNorm && dNome === fantasiaNorm) return true;
        return false;
      }));

      // ── Filtro de agenda ──────────────────────────────────────────
      const allEvts = Array.isArray(agendaData) ? agendaData : [];
      setEventos(allEvts.filter(e => {
        if (e.deletado) return false;
        if (cliente.id && e.clienteId === cliente.id) return true;
        if (cnpjDigits && (e.clienteCnpj || '').replace(/\D/g, '') === cnpjDigits) return true;
        const eNome = (e.clienteNome || '').toLowerCase().trim();
        if (nomeNorm && eNome === nomeNorm) return true;
        if (fantasiaNorm && eNome === fantasiaNorm) return true;
        return false;
      }));

      // ── Filtro de arquivos reais do filesystem ────────────────────
      const todosArq = Array.isArray(arquivosData)
        ? arquivosData
        : (arquivosData?.arquivos || []);

      setArquivos(todosArq.filter(arq => {
        const fname = (arq.nome || arq.filename || '').toLowerCase();
        if (!fname) return false;
        if (cnpjDigits && fname.includes(cnpjDigits)) return true;
        return palavras.some(p => fname.includes(p));
      }));

    }).finally(() => {
      if (alive) setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [cliente]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleNovaAgenda = () => {
    onClose();
    if (onVerAgenda) onVerAgenda(cliente);
    else navigate('/agenda', { state: { cliente } });
  };

  const handleGerarDoc = (cl, tipo) => {
    onClose();
    if (onGerarDoc) onGerarDoc(cl, tipo);
    else navigate('/documentos', { state: { cliente: cl, tab: tipo } });
  };

  const handleDeleteArquivo = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.post('/api/arquivo/excluir', {
        caminho: deleteTarget.caminho || deleteTarget.nome || deleteTarget.filename,
      });
      setArquivos(prev => prev.filter(a => a.caminho !== deleteTarget.caminho || a.nome !== deleteTarget.nome));
      setDeleteTarget(null);
    } catch {
      // silencioso — pode mostrar toast se disponível
    } finally {
      setDeleting(false);
    }
  };

  const iniciais = (cliente?.nome || '?').split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();

  const TABS = [
    { id: 'cadastro', label: 'Cadastro',  count: 0              },
    { id: 'agenda',   label: 'Agenda',    count: eventos.length },
    { id: 'arquivos', label: 'Arquivos',  count: arquivos.length },
  ];

  return (
    <>
      <Modal isOpen={!!cliente} onClose={onClose} title="" maxWidth="max-w-2xl">
        {cliente && (
          <div className="-mx-6 -mt-4">

            {/* ── Header ───────────────────────────────────────────────── */}
            <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700 flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center shrink-0">
                <span className="text-brand-600 dark:text-brand-400 font-bold text-lg">{iniciais}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 dark:text-white leading-tight truncate text-base">
                      {cliente.nome || '—'}
                    </h3>
                    {cliente.fantasia && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{cliente.fantasia}</p>
                    )}
                    {cliente.cnpj && (
                      <p className="text-xs font-mono text-slate-400 mt-1 bg-slate-100 dark:bg-slate-700 inline-block px-2 py-0.5 rounded">
                        {cliente.cnpj}
                      </p>
                    )}
                  </div>
                  <button onClick={onClose} aria-label="Fechar"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition shrink-0">
                    <X size={16} />
                  </button>
                </div>

                {/* Ações rápidas */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  <button onClick={handleNovaAgenda}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition shadow-sm shadow-brand-500/20">
                    <Plus size={12} /> Nova Agenda
                  </button>
                  <button
                    onClick={() => { onClose(); navigate('/arquivos', { state: { clienteId: cliente.id, clienteNome: cliente.nome || cliente.fantasia || '', clienteCnpj: cliente.cnpj || '' } }); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-xs font-bold transition shadow-sm shadow-violet-500/20">
                    <FolderOpen size={12} /> Histórico de Arquivos
                  </button>
                  <button onClick={() => handleGerarDoc(cliente, 'laudo')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400 transition">
                    <Bug size={12} /> Laudo
                  </button>
                  <button onClick={() => handleGerarDoc(cliente, 'recibo')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:border-emerald-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                    <Receipt size={12} /> Recibo
                  </button>
                  <button onClick={() => handleGerarDoc(cliente, 'orcamento')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:border-amber-300 hover:text-amber-600 dark:hover:text-amber-400 transition">
                    <Calculator size={12} /> Orçamento
                  </button>
                </div>
              </div>
            </div>

            {/* ── Abas ─────────────────────────────────────────────────── */}
            <div className="flex border-b border-slate-100 dark:border-slate-700 px-2 overflow-x-auto scrollbar-none" role="tablist">
              {TABS.map(t => (
                <TabButton key={t.id} id={t.id} label={t.label} count={t.count}
                  active={activeTab === t.id} onClick={setTab} />
              ))}
            </div>

            {/* ── Conteúdo ─────────────────────────────────────────────── */}
            <div className="px-6 py-5 min-h-[220px] max-h-[60vh] overflow-y-auto" role="tabpanel">
              {activeTab === 'cadastro' && (
                <TabCadastro cliente={cliente} onUpdate={onUpdate} />
              )}
              {activeTab === 'agenda' && (
                <TabAgenda eventos={eventos} loading={loading} onNovaAgenda={handleNovaAgenda} />
              )}
              {activeTab === 'arquivos' && (
                <TabArquivos
                  arquivos={arquivos}
                  loading={loading}
                  onPreview={(arq) => setPreviewFile({ nome: arq.nome || arq.filename, caminho: arq.caminho })}
                  onDelete={setDeleteTarget}
                  onGerarDoc={onGerarDoc ? handleGerarDoc : null}
                  cliente={cliente}
                />
              )}
            </div>

          </div>
        )}
      </Modal>

      {/* Preview do arquivo */}
      <DocumentPreview
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        filename={previewFile?.nome}
        caminho={previewFile?.caminho}
      />

      {/* Confirmação de exclusão */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-white text-sm">Excluir arquivo?</p>
                <p className="text-xs text-slate-400 mt-0.5">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2 font-mono truncate mb-5">
              {deleteTarget.nome || deleteTarget.filename}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition">
                Cancelar
              </button>
              <button
                onClick={handleDeleteArquivo}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white transition disabled:opacity-60">
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
