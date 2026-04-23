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
  CalendarDays, Receipt, Calculator,
  Phone, Mail, MapPin, Building2, ChevronDown, ChevronUp, Bug,
  Loader2, CheckCircle2, AlertCircle, SortAsc, Clock, Bell, ArrowUpDown,
} from 'lucide-react';
import { getClientes, saveCliente, removeCliente } from '../services/clienteCache';
import { buscarCNPJ } from '../services/brasilApi';
import { getAgendamentos } from '../services/agendaService';
import { api } from '../services/api';

// ─── helpers ──────────────────────────────────────────────────────────────────

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
  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all duration-150';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return;
    onSalvar(form);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={cliente ? 'Editar cliente' : 'Novo cliente'}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdropIn_0.2s_ease-out_both]"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto animate-[modalIn_0.22s_cubic-bezier(0.16,1,0.3,1)_both]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="font-bold text-slate-800 dark:text-white">
            {cliente ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar modal"
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-90
              transition-all duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">

            {/* CNPJ / CPF — com máscara e autofill */}
            <div className="col-span-2">
              <label htmlFor="cli-cnpj" className={labelCls}>CNPJ / CPF</label>
              <div className="relative">
                <input
                  id="cli-cnpj"
                  value={form.cnpj}
                  onChange={e => set('cnpj', formatDoc(e.target.value))}
                  className={inputCls}
                  placeholder="Digite o CNPJ (14 dígitos) ou CPF (11 dígitos)"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-describedby="cli-cnpj-status"
                />
                {cnpjStatus === 'loading' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
                    <Loader2 size={15} className="animate-spin text-brand-500" />
                  </div>
                )}
                {cnpjStatus === 'ok' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
                    <CheckCircle2 size={15} className="text-emerald-500" />
                  </div>
                )}
                {cnpjStatus === 'erro' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
                    <AlertCircle size={15} className="text-red-400" />
                  </div>
                )}
              </div>
              <div id="cli-cnpj-status" aria-live="polite" aria-atomic="true">
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
            </div>

            <div className="col-span-2">
              <label htmlFor="cli-nome" className={labelCls}>
                Razão Social <span className="text-red-400" aria-hidden="true">*</span>
              </label>
              <input
                id="cli-nome"
                required
                aria-required="true"
                value={form.nome}
                onChange={e => set('nome', e.target.value)}
                className={inputCls}
                placeholder="Nome completo / Razão Social"
                autoComplete="organization"
              />
            </div>
            <div>
              <label htmlFor="cli-fantasia" className={labelCls}>Nome Fantasia</label>
              <input id="cli-fantasia" value={form.fantasia} onChange={e => set('fantasia', e.target.value)} className={inputCls} placeholder="Ex: Padaria do João" />
            </div>
            <div>
              <label htmlFor="cli-telefone" className={labelCls}>Telefone</label>
              <input id="cli-telefone" type="tel" autoComplete="tel" value={form.telefone} onChange={e => set('telefone', e.target.value)} className={inputCls} placeholder="(37) 9 9999-9999" />
            </div>
            <div className="col-span-2">
              <label htmlFor="cli-email" className={labelCls}>E-mail</label>
              <input id="cli-email" type="email" autoComplete="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} placeholder="contato@empresa.com" />
            </div>
            <div className="col-span-2">
              <label htmlFor="cli-endereco" className={labelCls}>Endereço</label>
              <input id="cli-endereco" autoComplete="street-address" value={form.endereco} onChange={e => set('endereco', e.target.value)} className={inputCls} placeholder="Rua, número, bairro, cidade" />
            </div>
            <div className="col-span-2">
              <label htmlFor="cli-atividade" className={labelCls}>Atividade / Segmento</label>
              <input id="cli-atividade" value={form.atividade} onChange={e => set('atividade', e.target.value)} className={inputCls} placeholder="Ex: Restaurante, Escola, Residência" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600
                text-sm font-medium text-slate-600 dark:text-slate-300
                hover:bg-slate-50 dark:hover:bg-slate-700
                active:scale-[0.97]
                transition-all duration-150
                focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-bold
                hover:bg-brand-600
                active:scale-[0.97]
                transition-all duration-150
                focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50"
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

function ClienteCard({ cliente, onEditar, onExcluir, onGerarDoc, onVerAgenda, alertaGarantia }) {
  const [expandido, setExpandido] = useState(false);
  const iniciais = (cliente.nome || '?')
    .split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border shadow-sm hover:shadow-md transition-shadow ${
      alertaGarantia ? 'border-orange-300 dark:border-orange-600' : 'border-slate-200 dark:border-slate-700'
    }`}>

      {/* Badge de garantia */}
      {alertaGarantia && (
        <div className="flex items-center gap-1.5 px-4 pt-3 pb-0">
          <Bell size={11} className="text-orange-500" />
          <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">
            Garantia vence em {alertaGarantia.dias_restantes < 0
              ? `${Math.abs(alertaGarantia.dias_restantes)} dias (vencida)`
              : `${alertaGarantia.dias_restantes} dias`}
          </span>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex items-start gap-4 p-4">
        <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
          <span className="text-brand-600 dark:text-brand-400 font-bold text-sm">{iniciais}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 dark:text-white leading-tight truncate">{cliente.nome}</p>
          {cliente.fantasia && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{cliente.fantasia}</p>}
          {cliente.cnpj     && <p className="text-xs font-mono text-slate-400 mt-0.5">{cliente.cnpj}</p>}
        </div>

        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onEditar(cliente)}
            aria-label={`Editar cliente ${cliente.nome}`}
            className="w-8 h-8 rounded-lg flex items-center justify-center
              text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30
              active:scale-90 transition-all duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
          >
            <Pencil size={14} aria-hidden="true" />
          </button>
          <button
            onClick={() => onExcluir(cliente)}
            aria-label={`Excluir cliente ${cliente.nome}`}
            className="w-8 h-8 rounded-lg flex items-center justify-center
              text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30
              active:scale-90 transition-all duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
          <button
            onClick={() => setExpandido(p => !p)}
            aria-label={expandido ? `Recolher detalhes de ${cliente.nome}` : `Ver detalhes de ${cliente.nome}`}
            aria-expanded={expandido}
            className="w-8 h-8 rounded-lg flex items-center justify-center
              text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700
              active:scale-90 transition-all duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40"
          >
            {expandido ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Detalhes */}
      {expandido && (
        <div className="px-4 pb-3 space-y-1.5 border-t border-slate-100 dark:border-slate-700 pt-3">
          {cliente.telefone && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Phone size={12} /> {cliente.telefone}
            </div>
          )}
          {cliente.email && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Mail size={12} /> {cliente.email}
            </div>
          )}
          {cliente.endereco && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <MapPin size={12} /> <span className="truncate">{cliente.endereco}</span>
            </div>
          )}
          {cliente.atividade && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Building2 size={12} /> {cliente.atividade}
            </div>
          )}
        </div>
      )}

      {/* Ações rápidas */}
      <div className="flex gap-1.5 px-4 pb-4 pt-2 flex-wrap" role="group" aria-label={`Ações para ${cliente.nome}`}>
        <button
          onClick={() => onVerAgenda(cliente)}
          aria-label={`Ver agenda de ${cliente.nome}`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold
            bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400
            hover:bg-brand-100 dark:hover:bg-brand-900/40
            active:scale-[0.96] transition-all duration-150
            focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50"
        >
          <CalendarDays size={12} aria-hidden="true" /> Agenda
        </button>
        <button
          onClick={() => onGerarDoc(cliente, 'laudo')}
          aria-label={`Gerar laudo para ${cliente.nome}`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold
            bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400
            hover:bg-blue-100 dark:hover:bg-blue-900/40
            active:scale-[0.96] transition-all duration-150
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
        >
          <Bug size={12} aria-hidden="true" /> Laudo
        </button>
        <button
          onClick={() => onGerarDoc(cliente, 'recibo')}
          aria-label={`Gerar recibo para ${cliente.nome}`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold
            bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400
            hover:bg-emerald-100 dark:hover:bg-emerald-900/40
            active:scale-[0.96] transition-all duration-150
            focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
        >
          <Receipt size={12} aria-hidden="true" /> Recibo
        </button>
        <button
          onClick={() => onGerarDoc(cliente, 'orcamento')}
          aria-label={`Gerar orçamento para ${cliente.nome}`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold
            bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400
            hover:bg-amber-100 dark:hover:bg-amber-900/40
            active:scale-[0.96] transition-all duration-150
            focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
        >
          <Calculator size={12} aria-hidden="true" /> Orçamento
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
  const [clientes, setClientes]       = useState([]);
  const [busca, setBusca]             = useState('');
  const [ordenacao, setOrdenacao]     = useState('recente');
  const [modal, setModal]             = useState(null);
  const [vencimentos, setVencimentos] = useState([]);
  const [servicos, setServicos]       = useState([]);

  const recarregar = () => setClientes(getClientes());

  useEffect(() => {
    recarregar();
    // Carregar dados para os filtros cruzados
    api.get('/api/documentos/vencimentos?dias=60')
      .then(r => setVencimentos(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
    // Todos os eventos (laudos emitidos, serviços concluídos) contam como atendimento
    setServicos(getAgendamentos());
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

  const handleSalvar = (form) => {
    saveCliente(form);
    recarregar();
    setModal(null);
  };

  const handleExcluir = (cliente) => {
    if (!window.confirm(`Remover "${cliente.nome}" da lista de clientes?`)) return;
    removeCliente(cliente.cnpj || cliente.nome);
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
                onEditar={(cl) => setModal(cl)}
                onExcluir={handleExcluir}
                onGerarDoc={handleGerarDoc}
                onVerAgenda={handleVerAgenda}
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
    </div>
  );
}
