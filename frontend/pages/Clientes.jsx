/**
 * Clientes — CRUD de clientes via localStorage (clienteCache.js)
 *
 * Features:
 * - Modal com autofill de CNPJ via Brasil API (14 dígitos) + máscara CPF/CNPJ
 * - Filtros avançados: Mais Recentes | A-Z | Garantias a Vencer | Últimos Serviços
 * - Deep links → Documentos e Agenda
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Plus, Search, X, Pencil, Trash2,
  CalendarDays, Receipt, Calculator, Wrench, FileText, TrendingUp,
  Phone, Mail, MapPin, Building2, ChevronDown, ChevronUp, Bug,
  Loader2, CheckCircle2, AlertCircle, SortAsc, Clock, Bell, ArrowUpDown,
} from 'lucide-react';
import { getClientes, saveCliente, removeCliente } from '../services/clienteCache';
import { buscarCNPJ } from '../services/brasilApi';
import { getAgendamentos } from '../services/agendaService';
import { api } from '../services/api';
import { documentoApi } from '../services/dbService';
import { ClientePerfilModal } from '../components/documentos/ClientePerfilModal';

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtData(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
  catch { return iso.slice(0, 10); }
}

function fmtValor(v) {
  if (v == null) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

const DOC_CFG = {
  laudo:     { icon: Bug,        color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20',       label: 'Laudo'     },
  recibo:    { icon: Receipt,    color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', label: 'Recibo'    },
  orcamento: { icon: Calculator, color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-900/20',     label: 'Orçamento' },
  servico:   { icon: Wrench,     color: 'text-purple-500',  bg: 'bg-purple-50 dark:bg-purple-900/20',   label: 'Serviço'   },
};

const STATUS_COR = {
  'Agendado':     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Concluído':    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Cancelado':    'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
  'Emitido':      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'Em Andamento': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

function formatDoc(value) {
  const d = value.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 11) {
    // CPF: 000.000.000-00
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
  }
  // CNPJ: 00.000.000/0000-00
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`;
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
}

// ─── Modal de formulário ──────────────────────────────────────────────────────

const emptyForm = {
  nome: '', fantasia: '', cnpj: '',
  telefone: '', email: '', endereco: '', atividade: '',
};

function ClienteModal({ cliente, onSalvar, onClose }) {
  const [form, setForm]           = useState(cliente ? { ...emptyForm, ...cliente } : { ...emptyForm });
  const [cnpjStatus, setCnpjStatus] = useState(null); // null | 'loading' | 'ok' | 'erro'
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  // Autofill via Brasil API ao completar 14 dígitos
  useEffect(() => {
    const digits = (form.cnpj || '').replace(/\D/g, '');
    if (digits.length !== 14) { setCnpjStatus(null); return; }

    let cancelled = false;
    setCnpjStatus('loading');
    buscarCNPJ(digits)
      .then(data => {
        if (cancelled) return;
        if (data && data.nome) {
          setForm(prev => ({
            ...prev,
            nome:      data.nome      || prev.nome,
            fantasia:  data.fantasia  || prev.fantasia,
            endereco:  data.endereco  || prev.endereco,
            telefone:  data.telefone  || prev.telefone,
            atividade: data.atividade || prev.atividade,
            email:     data.email     || prev.email,
          }));
          setCnpjStatus('ok');
        } else {
          setCnpjStatus('erro');
        }
      })
      .catch(() => { if (!cancelled) setCnpjStatus('erro'); });

    return () => { cancelled = true; };
  }, [form.cnpj]);

  const labelCls = 'block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide';
  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return;
    onSalvar(form);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="font-bold text-slate-800 dark:text-white">
            {cliente ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">

            {/* CNPJ / CPF — com máscara e autofill */}
            <div className="col-span-2">
              <label className={labelCls}>CNPJ / CPF</label>
              <div className="relative">
                <input
                  value={form.cnpj}
                  onChange={e => set('cnpj', formatDoc(e.target.value))}
                  className={inputCls}
                  placeholder="Digite o CNPJ (14 dígitos) ou CPF (11 dígitos)"
                  inputMode="numeric"
                />
                {cnpjStatus === 'loading' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 size={15} className="animate-spin text-brand-500" />
                  </div>
                )}
                {cnpjStatus === 'ok' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <CheckCircle2 size={15} className="text-emerald-500" />
                  </div>
                )}
                {cnpjStatus === 'erro' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <AlertCircle size={15} className="text-red-400" />
                  </div>
                )}
              </div>
              {cnpjStatus === 'loading' && (
                <p className="text-[11px] text-brand-500 mt-1">Buscando CNPJ na Receita Federal...</p>
              )}
              {cnpjStatus === 'ok' && (
                <p className="text-[11px] text-emerald-600 mt-1">✓ Dados preenchidos automaticamente</p>
              )}
              {cnpjStatus === 'erro' && (
                <p className="text-[11px] text-red-400 mt-1">CNPJ não encontrado — preencha manualmente</p>
              )}
            </div>

            <div className="col-span-2">
              <label className={labelCls}>Razão Social *</label>
              <input
                required
                value={form.nome}
                onChange={e => set('nome', e.target.value)}
                className={inputCls}
                placeholder="Nome completo / Razão Social"
              />
            </div>
            <div>
              <label className={labelCls}>Nome Fantasia</label>
              <input value={form.fantasia} onChange={e => set('fantasia', e.target.value)} className={inputCls} placeholder="Ex: Padaria do João" />
            </div>
            <div>
              <label className={labelCls}>Telefone</label>
              <input value={form.telefone} onChange={e => set('telefone', e.target.value)} className={inputCls} placeholder="(37) 9 9999-9999" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>E-mail</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} placeholder="contato@empresa.com" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Endereço</label>
              <input value={form.endereco} onChange={e => set('endereco', e.target.value)} className={inputCls} placeholder="Rua, número, bairro, cidade" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Atividade / Segmento</label>
              <input value={form.atividade} onChange={e => set('atividade', e.target.value)} className={inputCls} placeholder="Ex: Restaurante, Escola, Residência" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-bold hover:bg-brand-600 transition"
            >
              {cliente ? 'Salvar Alterações' : 'Adicionar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Card do cliente ──────────────────────────────────────────────────────────

function ClienteCard({ cliente, onEditar, onExcluir, onGerarDoc, onVerAgenda, onVerPerfil, alertaGarantia, servicos = [] }) {
  const [expandido, setExpandido]       = useState(false);
  const [docs, setDocs]                 = useState([]);
  const [docsCarregados, setDocsCarregados] = useState(false);

  const iniciais   = (cliente.nome || '?').split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
  const cnpjDigits = (cliente.cnpj || '').replace(/\D/g, '');
  const hoje       = new Date().toISOString().slice(0, 10);

  // Lazy-load documentos ao abrir pela primeira vez
  useEffect(() => {
    if (!expandido || docsCarregados) return;
    if (!cliente.id) { setDocsCarregados(true); return; }
    documentoApi.getAll(cliente.id)
      .then(data => setDocs(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setDocsCarregados(true));
  }, [expandido, cliente.id, docsCarregados]);

  // Agenda deste cliente filtrada e ordenada (próximos primeiro, depois mais recentes)
  const agendaCliente = servicos
    .filter(s => cnpjDigits && (s.clienteCnpj || '').replace(/\D/g, '') === cnpjDigits)
    .sort((a, b) => {
      const af = (a.data || '') >= hoje, bf = (b.data || '') >= hoje;
      if (af && !bf) return -1;
      if (!af && bf) return 1;
      return af
        ? (a.data || '').localeCompare(b.data || '')
        : (b.data || '').localeCompare(a.data || '');
    });

  const totalFaturado = docs
    .filter(d => d.tipo === 'recibo' && d.valor != null)
    .reduce((acc, d) => acc + (d.valor || 0), 0);

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border shadow-sm hover:shadow-md transition-shadow ${
      alertaGarantia ? 'border-orange-300 dark:border-orange-600' : 'border-slate-200 dark:border-slate-700'
    }`}>

      {/* Badge de garantia */}
      {alertaGarantia && (
        <div className="flex items-center gap-1.5 px-4 pt-3 pb-0">
          <Bell size={11} className="text-orange-500" />
          <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">
            Garantia {alertaGarantia.dias_restantes < 0
              ? `vencida há ${Math.abs(alertaGarantia.dias_restantes)} dias`
              : `vence em ${alertaGarantia.dias_restantes} dias`}
          </span>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex items-start gap-4 p-4">
        <button
          onClick={() => onVerPerfil(cliente)}
          title="Ver perfil completo"
          className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0 hover:bg-brand-200 dark:hover:bg-brand-800/50 transition"
        >
          <span className="text-brand-600 dark:text-brand-400 font-bold text-sm">{iniciais}</span>
        </button>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onVerPerfil(cliente)}>
          <p className="font-bold text-slate-800 dark:text-white leading-tight truncate hover:text-brand-600 dark:hover:text-brand-400 transition-colors">{cliente.nome}</p>
          {cliente.fantasia && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{cliente.fantasia}</p>}
          {cliente.cnpj     && <p className="text-xs font-mono text-slate-400 mt-0.5">{cliente.cnpj}</p>}
        </div>

        <div className="flex gap-1 shrink-0">
          <button onClick={() => onEditar(cliente)} title="Editar"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition">
            <Pencil size={14} />
          </button>
          <button onClick={() => onExcluir(cliente)} title="Excluir"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition">
            <Trash2 size={14} />
          </button>
          <button onClick={() => setExpandido(p => !p)} title={expandido ? 'Recolher' : 'Ver detalhes'}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* ── Seção expandida ─────────────────────────────────────────────── */}
      {expandido && (
        <div className="border-t border-slate-100 dark:border-slate-700">

          {/* Contatos */}
          {(cliente.telefone || cliente.email || cliente.endereco || cliente.atividade) && (
            <div className="px-4 py-3 space-y-1 border-b border-slate-50 dark:border-slate-700/50">
              {cliente.telefone && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Phone size={11} className="shrink-0" /> {cliente.telefone}
                </div>
              )}
              {cliente.email && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Mail size={11} className="shrink-0" />
                  <a href={`mailto:${cliente.email}`} className="hover:text-blue-500 transition-colors truncate">{cliente.email}</a>
                </div>
              )}
              {cliente.endereco && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <MapPin size={11} className="shrink-0" /> <span className="truncate">{cliente.endereco}</span>
                </div>
              )}
              {cliente.atividade && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 italic">
                  <Building2 size={11} className="shrink-0" /> {cliente.atividade}
                </div>
              )}
            </div>
          )}

          {/* Documentos emitidos */}
          <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-700/50">
            <div className="flex items-center gap-1.5 mb-2">
              <FileText size={11} className="text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Documentos Emitidos</span>
            </div>

            {!docsCarregados ? (
              <div className="flex gap-1.5 py-1">
                {[1,2,3].map(i => <div key={i} className="h-2 rounded bg-slate-100 dark:bg-slate-700 animate-pulse flex-1" />)}
              </div>
            ) : docs.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">
                {!cliente.id ? 'Salve um PDF para este cliente para ver o histórico.' : 'Nenhum documento emitido ainda.'}
              </p>
            ) : (() => {
              const recibos    = docs.filter(d => d.tipo === 'recibo');
              const orcamentos = docs.filter(d => d.tipo === 'orcamento');
              const totalRec   = recibos.reduce((s, d) => s + (d.valor || 0), 0);
              const totalOrc   = orcamentos.reduce((s, d) => s + (d.valor || 0), 0);
              const DocRow = ({ doc }) => (
                <div className="flex items-center gap-2 py-0.5">
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">{fmtData(doc.dataCriacao)}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex-1">{doc.numero ? `#${doc.numero}` : '—'}</span>
                  {doc.valor != null && (
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">{fmtValor(doc.valor)}</span>
                  )}
                </div>
              );
              return (
                <div className="space-y-3">
                  {recibos.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <Receipt size={10} className="text-emerald-500" />
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Recibos ({recibos.length})</span>
                        </div>
                        {totalRec > 0 && <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{fmtValor(totalRec)}</span>}
                      </div>
                      <div className="pl-2 border-l-2 border-emerald-100 dark:border-emerald-900/50 space-y-0.5">
                        {recibos.map(doc => <DocRow key={doc.id} doc={doc} />)}
                      </div>
                    </div>
                  )}
                  {orcamentos.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <Calculator size={10} className="text-amber-500" />
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Orçamentos ({orcamentos.length})</span>
                        </div>
                        {totalOrc > 0 && <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{fmtValor(totalOrc)}</span>}
                      </div>
                      <div className="pl-2 border-l-2 border-amber-100 dark:border-amber-900/50 space-y-0.5">
                        {orcamentos.map(doc => <DocRow key={doc.id} doc={doc} />)}
                      </div>
                    </div>
                  )}
                  {totalFaturado > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        <TrendingUp size={11} /> Total faturado (recibos)
                      </div>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{fmtValor(totalFaturado)}</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Agenda do cliente */}
          {agendaCliente.length > 0 && (
            <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-700/50">
              <div className="flex items-center gap-1.5 mb-2">
                <CalendarDays size={11} className="text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Agenda</span>
                <span className="text-[10px] text-slate-400">({agendaCliente.length})</span>
              </div>
              <div className="space-y-1.5">
                {agendaCliente.slice(0, 4).map((ev, i) => {
                  const cfg = DOC_CFG[ev.tipo] || DOC_CFG.laudo;
                  const Icon = cfg.icon;
                  const statusCls = STATUS_COR[ev.status] || 'bg-slate-100 text-slate-500';
                  const isFuturo = (ev.data || '') >= hoje;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-md ${cfg.bg} flex items-center justify-center shrink-0`}>
                        <Icon size={11} className={cfg.color} />
                      </div>
                      <span className={`text-[10px] font-mono shrink-0 ${isFuturo ? 'text-brand-600 dark:text-brand-400 font-bold' : 'text-slate-400'}`}>
                        {ev.data}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex-1 truncate">
                        {cfg.label}{ev.tipoServico ? ` · ${ev.tipoServico}` : ''}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${statusCls}`}>
                        {ev.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Ações rápidas */}
      <div className="flex gap-1.5 px-4 pb-4 pt-2 flex-wrap">
        <button onClick={() => onVerAgenda(cliente)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 hover:bg-brand-100 transition">
          <CalendarDays size={12} /> Agenda
        </button>
        <button onClick={() => onGerarDoc(cliente, 'laudo')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition">
          <Bug size={12} /> Laudo
        </button>
        <button onClick={() => onGerarDoc(cliente, 'recibo')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition">
          <Receipt size={12} /> Recibo
        </button>
        <button onClick={() => onGerarDoc(cliente, 'orcamento')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition">
          <Calculator size={12} /> Orçamento
        </button>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

const ORDENACOES = [
  { value: 'recente',  label: 'Mais Recentes', icon: Clock   },
  { value: 'az',       label: 'A–Z',           icon: SortAsc },
  { value: 'garantia', label: 'Garantias',     icon: Bell    },
  { value: 'servico',  label: 'Últ. Serviço',  icon: ArrowUpDown },
];

export default function Clientes() {
  const navigate = useNavigate();
  const [clientes, setClientes]         = useState([]);
  const [busca, setBusca]               = useState('');
  const [ordenacao, setOrdenacao]       = useState('recente');
  const [modal, setModal]               = useState(null);
  const [clientePerfil, setClientePerfil] = useState(null);
  const [vencimentos, setVencimentos]   = useState([]);
  const [servicos, setServicos]         = useState([]);

  const recarregar = async () => setClientes(await getClientes());

  useEffect(() => {
    recarregar();
    // Carregar dados para os filtros cruzados
    api.get('/api/documentos/vencimentos?dias=60')
      .then(r => setVencimentos(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
    // Todos os eventos (laudos emitidos, serviços concluídos) contam como atendimento
    getAgendamentos().then(setServicos).catch(() => {});
  }, []);

  // Mapa CNPJ → item de vencimento mais próximo
  const mapaGarantias = useMemo(() => {
    const m = {};
    vencimentos.forEach(v => {
      const k = (v.cnpj || '').replace(/\D/g, '');
      if (!k) return;
      if (!m[k] || v.dias_restantes < m[k].dias_restantes) m[k] = v;
    });
    return m;
  }, [vencimentos]);

  // Mapa CNPJ → data do último serviço concluído
  const mapaServico = useMemo(() => {
    const m = {};
    servicos.forEach(s => {
      const k = (s.clienteCnpj || '').replace(/\D/g, '');
      if (!k) return;
      if (!m[k] || s.data > m[k]) m[k] = s.data;
    });
    return m;
  }, [servicos]);

  const clientesFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return clientes;
    const qNum = q.replace(/\D/g, '');
    return clientes.filter(c =>
      (c.nome     || '').toLowerCase().includes(q) ||
      (c.fantasia || '').toLowerCase().includes(q) ||
      (qNum && (c.cnpj || '').replace(/\D/g, '').includes(qNum))
    );
  }, [clientes, busca]);

  const clientesOrdenados = useMemo(() => {
    let lista = [...clientesFiltrados];

    if (ordenacao === 'az') {
      lista.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
    } else if (ordenacao === 'garantia') {
      // Filtrar apenas os que têm garantia vencendo em ±60 dias
      const cnpjsComGarantia = new Set(
        Object.keys(mapaGarantias).filter(k => mapaGarantias[k].dias_restantes <= 30)
      );
      lista = lista.filter(c => cnpjsComGarantia.has((c.cnpj || '').replace(/\D/g, '')));
      // Ordenar pelos que vencem mais cedo primeiro
      lista.sort((a, b) => {
        const da = mapaGarantias[(a.cnpj || '').replace(/\D/g, '')]?.dias_restantes ?? 9999;
        const db = mapaGarantias[(b.cnpj || '').replace(/\D/g, '')]?.dias_restantes ?? 9999;
        return da - db;
      });
    } else if (ordenacao === 'servico') {
      lista.sort((a, b) => {
        const da = mapaServico[(a.cnpj || '').replace(/\D/g, '')] || '';
        const db = mapaServico[(b.cnpj || '').replace(/\D/g, '')] || '';
        return db.localeCompare(da); // mais recente primeiro
      });
    }
    // 'recente' → ordem do getClientes() (lastUsed desc)
    return lista;
  }, [clientesFiltrados, ordenacao, mapaGarantias, mapaServico]);

  const handleSalvar = async (form) => {
    await saveCliente(form);
    recarregar();
    setModal(null);
  };

  const handleExcluir = async (cliente) => {
    if (!window.confirm(`Remover "${cliente.nome}" da lista de clientes?`)) return;
    await removeCliente(cliente.cnpj || cliente.nome);
    recarregar();
  };

  const handleGerarDoc = (cliente, tab) => navigate('/documentos', { state: { cliente, tab } });
  const handleVerAgenda = (cliente)      => navigate('/agenda',    { state: { cliente } });

  const totalGarantias = Object.values(mapaGarantias).filter(v => v.dias_restantes <= 30).length;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Users size={24} className="text-brand-500" />
            Clientes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''}
            {totalGarantias > 0 && (
              <span className="ml-2 text-orange-500 font-medium">
                · {totalGarantias} com garantia vencendo
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setModal('novo')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold shadow-md shadow-brand-500/25 transition"
        >
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      {/* Busca + Ordenação */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, fantasia ou CNPJ..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition"
          />
          {busca && (
            <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Botões de ordenação */}
        <div className="flex gap-1.5 flex-wrap">
          {ORDENACOES.map(o => {
            const Icon = o.icon;
            const ativo = ordenacao === o.value;
            return (
              <button
                key={o.value}
                onClick={() => setOrdenacao(o.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border ${
                  ativo
                    ? o.value === 'garantia'
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : 'bg-brand-500 border-brand-500 text-white'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-brand-300'
                }`}
              >
                <Icon size={12} />
                {o.label}
                {o.value === 'garantia' && totalGarantias > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    ativo ? 'bg-white/30 text-white' : 'bg-orange-100 text-orange-600'
                  }`}>{totalGarantias}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista */}
      {clientesOrdenados.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-slate-400" />
          </div>
          <p className="font-bold text-slate-600 dark:text-slate-300">
            {ordenacao === 'garantia'
              ? 'Nenhum cliente com garantia vencendo nos próximos 30 dias'
              : busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {!busca && ordenacao !== 'garantia' && 'Clique em "Novo Cliente" para começar.'}
          </p>
          {!busca && ordenacao === 'recente' && (
            <p className="text-xs text-slate-400 mt-2">
              Dica: ao salvar documentos (laudos, recibos, orçamentos) o cliente é salvo automaticamente aqui.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {clientesOrdenados.map((c, i) => {
            const cnpjNum = (c.cnpj || '').replace(/\D/g, '');
            const alerta  = cnpjNum ? mapaGarantias[cnpjNum] : null;
            return (
              <ClienteCard
                key={c.cnpj || c.nome || i}
                cliente={c}
                alertaGarantia={alerta && alerta.dias_restantes <= 30 ? alerta : null}
                servicos={servicos}
                onEditar={(cl) => setModal(cl)}
                onExcluir={handleExcluir}
                onGerarDoc={handleGerarDoc}
                onVerAgenda={handleVerAgenda}
                onVerPerfil={setClientePerfil}
              />
            );
          })}
        </div>
      )}

      {/* Modal criar/editar */}
      {modal && (
        <ClienteModal
          cliente={modal === 'novo' ? null : modal}
          onSalvar={handleSalvar}
          onClose={() => setModal(null)}
        />
      )}

      {/* Modal perfil do cliente */}
      <ClientePerfilModal
        cliente={clientePerfil}
        onClose={() => setClientePerfil(null)}
        onUpdate={setClientes}
      />
    </div>
  );
}
