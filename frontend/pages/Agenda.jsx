import { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays, Plus, Bell, ChevronDown, ChevronUp,
  Bug, Calendar, Phone, User, Clock, Wrench, Trash2,
  CheckCircle2, XCircle, RefreshCw, Edit2,
} from 'lucide-react';
import {
  getAgendamentos, criarAgendamento, atualizarAgendamento,
  excluirAgendamento, STATUS_OPTIONS,
} from '../services/agendaService';
import { NovoAgendamentoModal } from '../components/agenda/NovoAgendamentoModal';
import { ClientePerfilModal } from '../components/documentos/ClientePerfilModal';
import { api } from '../services/api';

// ─── helpers ──────────────────────────────────────────────────────────────────

function hoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function amanha() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatarDataLabel(iso) {
  if (iso === hoje()) return 'Hoje';
  if (iso === amanha()) return 'Amanhã';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  });
}

function formatarHora(hora) {
  if (!hora) return '';
  return hora.slice(0, 5);
}

const STATUS_STYLE = {
  'Agendado':  { bg: 'bg-blue-100 dark:bg-blue-900/30',   text: 'text-blue-700 dark:text-blue-300',   dot: 'bg-blue-500'   },
  'Concluído': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  'Cancelado': { bg: 'bg-red-100 dark:bg-red-900/30',     text: 'text-red-700 dark:text-red-300',     dot: 'bg-red-500'   },
};

// ─── componente de card de evento ─────────────────────────────────────────────

function EventoCard({ ev, onEditar, onExcluir, onStatusRapido }) {
  const st = STATUS_STYLE[ev.status] || STATUS_STYLE['Agendado'];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Topo: status + hora + ações */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
            {ev.status}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Clock size={11} />
          {formatarHora(ev.hora) || '—'}
        </div>
      </div>

      {/* Cliente */}
      <div className="mb-2">
        <p className="font-bold text-sm text-slate-800 dark:text-white leading-tight">
          {ev.clienteNome || '—'}
        </p>
        {ev.clienteFantasia && (
          <p className="text-xs text-slate-400 truncate">{ev.clienteFantasia}</p>
        )}
        {ev.clienteTelefone && (
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <Phone size={10} />
            <span>{ev.clienteTelefone}</span>
          </div>
        )}
      </div>

      {/* Tipo de serviço */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-3">
        <Wrench size={11} />
        <span>{ev.tipoServico}</span>
      </div>

      {ev.observacao && (
        <p className="text-xs text-slate-400 italic border-t border-slate-100 dark:border-slate-700 pt-2 mb-3">
          {ev.observacao}
        </p>
      )}

      {/* Ações rápidas de status */}
      <div className="flex gap-2">
        {ev.status !== 'Concluído' && (
          <button
            onClick={() => onStatusRapido(ev.id, 'Concluído')}
            title="Marcar como Concluído"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition"
          >
            <CheckCircle2 size={12} /> Concluído
          </button>
        )}
        {ev.status !== 'Cancelado' && (
          <button
            onClick={() => onStatusRapido(ev.id, 'Cancelado')}
            title="Cancelar"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition"
          >
            <XCircle size={12} /> Cancelar
          </button>
        )}
        <div className="ml-auto flex gap-1">
          <button onClick={() => onEditar(ev)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition" title="Editar">
            <Edit2 size={13} />
          </button>
          <button onClick={() => onExcluir(ev.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition" title="Excluir">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── painel de vencimentos ────────────────────────────────────────────────────

function PainelVencimentos({ onAgendarRetorno }) {
  const [vencimentos, setVencimentos]   = useState([]);
  const [loading, setLoading]           = useState(false);
  const [expandido, setExpandido]       = useState(true);
  const [clientePerfil, setClientePerfil] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get('/api/documentos/vencimentos')
      .then(r => setVencimentos(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && vencimentos.length === 0) return null;

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-orange-200 dark:border-orange-700/50 shadow-sm overflow-hidden">
        <button
          onClick={() => setExpandido(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Bell size={15} className="text-orange-600 dark:text-orange-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-slate-800 dark:text-white leading-none">
                Garantias Vencendo / Vencidas
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {loading ? 'Verificando...' : `${vencimentos.length} garantia${vencimentos.length !== 1 ? 's' : ''} em ±30 dias`}
              </p>
            </div>
          </div>
          {expandido ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {expandido && (
          <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-28 rounded-xl bg-slate-100 dark:bg-slate-700 animate-pulse" />)
            ) : vencimentos.map((v, idx) => {
              const vencido = v.dias_restantes < 0;
              const urgente = !vencido && v.dias_restantes <= 7;
              const badgeCls = vencido
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                : urgente
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
              const badgeLabel = vencido
                ? `Vencido há ${Math.abs(v.dias_restantes)} dia${Math.abs(v.dias_restantes) !== 1 ? 's' : ''}`
                : v.dias_restantes === 0 ? 'Vence hoje!'
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

                  {v.telefone && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Phone size={11} />
                      <span>{v.telefone}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar size={11} />
                    <span>Vence em {v.data_vencimento} • {v.garanti_meses} {v.garanti_meses === 1 ? 'mês' : 'meses'}</span>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => onAgendarRetorno({
                        nome:      v.nome_cliente,
                        fantasia:  v.fantasia,
                        cnpj:      v.cnpj,
                        telefone:  v.telefone || '',
                        endereco:  v.endereco || '',
                      })}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition"
                    >
                      <CalendarDays size={11} /> Agendar Retorno
                    </button>
                    <button
                      onClick={() => setClientePerfil({
                        nome: v.nome_cliente, fantasia: v.fantasia,
                        cnpj: v.cnpj, endereco: v.endereco, telefone: v.telefone,
                      })}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                    >
                      <User size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ClientePerfilModal
        cliente={clientePerfil}
        onClose={() => setClientePerfil(null)}
      />
    </>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Agenda() {
  const [eventos, setEventos]         = useState([]);
  const [modalOpen, setModalOpen]     = useState(false);
  const [eventoEditar, setEventoEditar] = useState(null);
  const [clienteInicial, setClienteInicial] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('todos');

  const recarregar = useCallback(() => setEventos(getAgendamentos()), []);

  useEffect(() => { recarregar(); }, [recarregar]);

  const handleSalvar = (dados) => {
    if (eventoEditar) {
      atualizarAgendamento(eventoEditar.id, dados);
    } else {
      criarAgendamento(dados);
    }
    recarregar();
  };

  const handleStatusRapido = (id, status) => {
    atualizarAgendamento(id, { status });
    recarregar();
  };

  const handleExcluir = (id) => {
    if (window.confirm('Remover este agendamento?')) {
      excluirAgendamento(id);
      recarregar();
    }
  };

  const handleEditar = (ev) => {
    setEventoEditar(ev);
    setClienteInicial(null);
    setModalOpen(true);
  };

  const handleAgendarRetorno = (cliente) => {
    setEventoEditar(null);
    setClienteInicial(cliente);
    setModalOpen(true);
  };

  const abrirNovo = () => {
    setEventoEditar(null);
    setClienteInicial(null);
    setModalOpen(true);
  };

  // Filtro de status
  const eventosFiltrados = filtroStatus === 'todos'
    ? eventos
    : eventos.filter(ev => ev.status === filtroStatus);

  // Agrupa por data
  const porData = eventosFiltrados.reduce((acc, ev) => {
    if (!acc[ev.data]) acc[ev.data] = [];
    acc[ev.data].push(ev);
    return acc;
  }, {});
  const datasOrdenadas = Object.keys(porData).sort();

  // Contadores
  const totalAgendados  = eventos.filter(e => e.status === 'Agendado').length;
  const totalConcluidos = eventos.filter(e => e.status === 'Concluído').length;
  const totalCancelados = eventos.filter(e => e.status === 'Cancelado').length;

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CalendarDays size={24} className="text-brand-500" />
            Agenda de Serviços
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Gerencie os serviços agendados e acompanhe garantias vencendo.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={recarregar}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            title="Atualizar"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={abrirNovo}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold shadow-md shadow-brand-500/25 transition"
          >
            <Plus size={16} /> Novo Agendamento
          </button>
        </div>
      </div>

      {/* ── Cards de resumo ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Agendados',  value: totalAgendados,  color: 'blue'    },
          { label: 'Concluídos', value: totalConcluidos, color: 'emerald' },
          { label: 'Cancelados', value: totalCancelados, color: 'red'     },
        ].map(c => (
          <div key={c.label} className={`bg-${c.color}-50 dark:bg-${c.color}-900/20 rounded-2xl p-4 border border-${c.color}-100 dark:border-${c.color}-800/30`}>
            <p className={`text-2xl font-bold text-${c.color}-600 dark:text-${c.color}-400`}>{c.value}</p>
            <p className={`text-xs font-medium text-${c.color}-500 dark:text-${c.color}-500 mt-0.5`}>{c.label}</p>
          </div>
        ))}
      </div>

      {/* ── Painel de Remarketing ───────────────────────────────────────────── */}
      <PainelVencimentos onAgendarRetorno={handleAgendarRetorno} />

      {/* ── Filtros ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'todos',      label: 'Todos' },
          { value: 'Agendado',   label: 'Agendados' },
          { value: 'Concluído',  label: 'Concluídos' },
          { value: 'Cancelado',  label: 'Cancelados' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFiltroStatus(f.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition
              ${filtroStatus === f.value
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-300 dark:hover:border-brand-600'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Timeline de Eventos ─────────────────────────────────────────────── */}
      {datasOrdenadas.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
            <CalendarDays size={28} className="text-slate-400" />
          </div>
          <p className="font-bold text-slate-600 dark:text-slate-300">Nenhum agendamento encontrado</p>
          <p className="text-sm text-slate-400 mt-1">
            {filtroStatus !== 'todos' ? 'Tente mudar o filtro de status.' : 'Clique em "Novo Agendamento" para começar.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {datasOrdenadas.map(data => (
            <div key={data}>
              {/* Label da data */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${data === hoje() ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                  <h2 className={`text-sm font-bold capitalize ${data === hoje() ? 'text-brand-600 dark:text-brand-400' : 'text-slate-600 dark:text-slate-300'}`}>
                    {formatarDataLabel(data)}
                  </h2>
                </div>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-xs text-slate-400">{porData[data].length} serviço{porData[data].length !== 1 ? 's' : ''}</span>
              </div>

              {/* Cards da data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {porData[data].map(ev => (
                  <EventoCard
                    key={ev.id}
                    ev={ev}
                    onEditar={handleEditar}
                    onExcluir={handleExcluir}
                    onStatusRapido={handleStatusRapido}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal ───────────────────────────────────────────────────────────── */}
      <NovoAgendamentoModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEventoEditar(null); setClienteInicial(null); }}
        onSalvar={handleSalvar}
        clienteInicial={clienteInicial}
        eventoEditar={eventoEditar}
      />
    </div>
  );
}
