/**
 * Clientes — CRUD de clientes via localStorage (clienteCache.js)
 *
 * Features:
 * - Listagem com busca em tempo real
 * - Adicionar / Editar / Excluir cliente
 * - Deep link → Documentos: botões "Laudo / Recibo / Orçamento"
 * - Deep link → Agenda: botão "Agenda"
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Plus, Search, X, Pencil, Trash2,
  CalendarDays, Receipt, Calculator,
  Phone, Mail, MapPin, Building2, ChevronDown, ChevronUp, Bug,
} from 'lucide-react';
import { getClientes, saveCliente, removeCliente } from '../services/clienteCache';

// ─── Modal de formulário ──────────────────────────────────────────────────────

const emptyForm = {
  nome: '', fantasia: '', cnpj: '',
  telefone: '', email: '', endereco: '', atividade: '',
};

function ClienteModal({ cliente, onSalvar, onClose }) {
  const [form, setForm] = useState(cliente ? { ...emptyForm, ...cliente } : { ...emptyForm });
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

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
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-bold text-slate-800 dark:text-white">
            {cliente ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
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
              <label className={labelCls}>CNPJ / CPF</label>
              <input value={form.cnpj} onChange={e => set('cnpj', e.target.value)} className={inputCls} placeholder="00.000.000/0000-00" />
            </div>
            <div>
              <label className={labelCls}>Telefone</label>
              <input value={form.telefone} onChange={e => set('telefone', e.target.value)} className={inputCls} placeholder="(11) 9 9999-9999" />
            </div>
            <div>
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

function ClienteCard({ cliente, onEditar, onExcluir, onGerarDoc, onVerAgenda }) {
  const [expandido, setExpandido] = useState(false);
  const iniciais = (cliente.nome || '?')
    .split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">

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
          <button onClick={() => onEditar(cliente)} title="Editar"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition">
            <Pencil size={14} />
          </button>
          <button onClick={() => onExcluir(cliente)} title="Excluir"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition">
            <Trash2 size={14} />
          </button>
          <button onClick={() => setExpandido(p => !p)} title={expandido ? 'Recolher' : 'Detalhes'}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
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

export default function Clientes() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca]       = useState('');
  const [modal, setModal]       = useState(null); // null | 'novo' | objeto cliente

  const recarregar = () => setClientes(getClientes());
  useEffect(() => { recarregar(); }, []);

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

  const handleGerarDoc = (cliente, tab) => {
    navigate('/documentos', { state: { cliente, tab } });
  };

  const handleVerAgenda = (cliente) => {
    navigate('/agenda', { state: { cliente } });
  };

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
            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} cadastrado{clientes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setModal('novo')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold shadow-md shadow-brand-500/25 transition"
        >
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
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

      {/* Lista */}
      {clientesFiltrados.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-slate-400" />
          </div>
          <p className="font-bold text-slate-600 dark:text-slate-300">
            {busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {busca
              ? 'Tente outros termos de busca.'
              : 'Clique em "Novo Cliente" para começar.'}
          </p>
          {!busca && (
            <p className="text-xs text-slate-400 mt-2">
              Dica: ao salvar documentos (laudos, recibos, orçamentos) o cliente é salvo automaticamente aqui.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {clientesFiltrados.map((c, i) => (
            <ClienteCard
              key={c.cnpj || c.nome || i}
              cliente={c}
              onEditar={(cl) => setModal(cl)}
              onExcluir={handleExcluir}
              onGerarDoc={handleGerarDoc}
              onVerAgenda={handleVerAgenda}
            />
          ))}
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
