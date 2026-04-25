import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  CalendarDays, LayoutList, Plus, Bell, ChevronDown, ChevronUp,
  Bug, Calendar, Phone, User, Clock, Wrench, Trash2,
  CheckCircle2, XCircle, RefreshCw, Edit2, ChevronLeft, ChevronRight,
  FileText, X, Repeat, Search,
} from 'lucide-react';
import {
  getAgendamentos,
  criarAgendamento,
  criarAgendamentoComRecorrencia,
  atualizarAgendamento,
  excluirAgendamento,
  excluirSerieRecorrente,
  STATUS_OPTIONS,
  TIPO_CORES,
  getTecnicos,
  getEquipes,
} from '../services/agendaService';
import { NovoAgendamentoModal } from '../components/agenda/NovoAgendamentoModal';
import { ClientePerfilModal } from '../components/documentos/ClientePerfilModal';
import { api } from '../services/api';

// ─── helpers ──────────────────────────────────────────────────────────────────

function hojeStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function amanhaStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatarDataLabel(iso) {
  if (iso === hojeStr()) return 'Hoje';
  if (iso === amanhaStr()) return 'Amanhã';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  });
}

function isoParaDisplay(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const TIPO_LABEL = {
  servico:   'Serviço',
  laudo:     'Laudo',
  recibo:    'Recibo',
  orcamento: 'Orçamento',
};

const STATUS_STYLE = {
  'Agendado':  { bg: 'bg-blue-100 dark:bg-blue-900/30',       text: 'text-blue-700 dark:text-blue-300',       dot: 'bg-blue-500'   },
  'Concluído': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  'Cancelado': { bg: 'bg-red-100 dark:bg-red-900/30',         text: 'text-red-700 dark:text-red-300',         dot: 'bg-red-500'    },
  'Emitido':   { bg: 'bg-purple-100 dark:bg-purple-900/30',   text: 'text-purple-700 dark:text-purple-300',   dot: 'bg-purple-500' },
};

// ─── Modal de detalhes ────────────────────────────────────────────────────────

function EventoDetalheModal({ evento, onClose, onEditar, onStatusRapido, onExcluir, onExcluirSerie }) {
  if (!evento) return null;

  const isDoc = evento.tipo !== 'servico';
  const cor   = (TIPO_CORES && TIPO_CORES[evento.tipo]) || { bg: 'bg-blue-500', light: 'bg-blue-100 text-blue-700' };
  const st    = STATUS_STYLE[evento.status] || STATUS_STYLE['Agendado'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${cor.bg} px-5 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/30 text-white">
              {TIPO_LABEL[evento.tipo] || evento.tipo}
            </span>
            {evento.recorrenciaId && (
              <span className="flex items-center gap-1 text-xs text-white/80">
                <Repeat size={11} /> Recorrente
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 transition">
            <X size={18} className="text-white" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-5 space-y-3">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Cliente</p>
            <p className="font-bold text-slate-800 dark:text-white">{evento.clienteNome || '—'}</p>
            {evento.clienteFantasia && <p className="text-sm text-slate-500">{evento.clienteFantasia}</p>}
            {evento.clienteCnpj    && <p className="text-xs font-mono text-slate-400">{evento.clienteCnpj}</p>}
            {evento.clienteTelefone && (
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                <Phone size={11} /> {evento.clienteTelefone}
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Data</p>
              <div className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                <Calendar size={13} /> {isoParaDisplay(evento.data)}
              </div>
            </div>
            {evento.hora && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Hora</p>
                <div className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <Clock size={13} /> {evento.hora}
                </div>
              </div>
            )}
          </div>

          {isDoc ? (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Documento</p>
              <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200">
                <FileText size={13} />
                {TIPO_LABEL[evento.tipo]} #{evento.numeroDoc}
              </div>
            </div>
          ) : (
            <>
              {evento.tipoServico && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Serviço</p>
                  <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200">
                    <Wrench size={13} /> {evento.tipoServico}
                  </div>
                </div>
              )}
              {evento.tecnico && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Técnico</p>
                  <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200">
                    <User size={13} /> {evento.tecnico}
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${st.bg} ${st.text}`}>
              {evento.status}
            </span>
          </div>

          {evento.observacao && (
            <p className="text-xs text-slate-500 italic border-t border-slate-100 dark:border-slate-700 pt-2">
              {evento.observacao}
            </p>
          )}
        </div>

        {/* Ações (só para serviços) */}
        {!isDoc && (
          <div className="px-5 pb-5 space-y-2">
            <div className="flex gap-2">
              {evento.status !== 'Concluído' && (
                <button
                  onClick={() => { onStatusRapido(evento.id, 'Concluído'); onClose(); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition"
                >
                  <CheckCircle2 size={13} /> Concluir
                </button>
              )}
              {evento.status !== 'Cancelado' && (
                <button
                  onClick={() => { onStatusRapido(evento.id, 'Cancelado'); onClose(); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 transition"
                >
                  <XCircle size={13} /> Cancelar
                </button>
              )}
              <button
                onClick={() => { onEditar(evento); onClose(); }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
              >
                <Edit2 size={13} /> Editar
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { onExcluir(evento.id); onClose(); }}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 transition border border-red-100 dark:border-red-800/30"
              >
                Excluir este evento
              </button>
              {evento.recorrenciaId && (
                <button
                  onClick={() => { onExcluirSerie(evento.recorrenciaId); onClose(); }}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 transition"
                >
                  Excluir toda a série
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Calendário mensal ────────────────────────────────────────────────────────

function CalendarioMensal({ mes, eventosPorDia, onEventoClick, onMesChange }) {
  const ano  = mes.getFullYear();
  const mesN = mes.getMonth();

  const primeiroDia  = new Date(ano, mesN, 1).getDay();  // 0=Dom
  const diasNoMes    = new Date(ano, mesN + 1, 0).getDate();
  const totalCelulas = Math.ceil((primeiroDia + diasNoMes) / 7) * 7;

  const celulas = [];
  for (let i = 0; i < totalCelulas; i++) {
    const diaDoMes = i - primeiroDia + 1;
    if (diaDoMes < 1 || diaDoMes > diasNoMes) {
      celulas.push({ dia: null, iso: null });
    } else {
      const iso = `${ano}-${String(mesN + 1).padStart(2, '0')}-${String(diaDoMes).padStart(2, '0')}`;
      celulas.push({ dia: diaDoMes, iso });
    }
  }

  const semanas = [];
  for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7));

  const nomeMes = mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const hoje    = hojeStr();

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Navegação */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => onMesChange(-1)}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          <ChevronLeft size={18} className="text-slate-500" />
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white capitalize">{nomeMes}</h2>
          <button
            onClick={() => onMesChange(0)}
            className="text-xs font-bold px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 hover:bg-brand-100 transition"
          >
            Hoje
          </button>
        </div>
        <button
          onClick={() => onMesChange(1)}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          <ChevronRight size={18} className="text-slate-500" />
        </button>
      </div>

      {/* Cabeçalho dias da semana */}
      <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700/50">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
          <div key={d} className="py-2 text-center text-[11px] font-bold text-slate-400">
            {d}
          </div>
        ))}
      </div>

      {/* Células */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
        {semanas.map((semana, si) => (
          <div key={si} className="grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-700/50">
            {semana.map((celula, ci) => {
              const evs     = celula.iso ? (eventosPorDia[celula.iso] || []) : [];
              const ehHoje  = celula.iso === hoje;
              const visivel = evs.slice(0, 3);
              const extra   = evs.length - 3;

              return (
                <div
                  key={ci}
                  className={`min-h-[90px] p-1.5
                    ${!celula.dia
                      ? 'bg-slate-50 dark:bg-slate-800/50'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors'
                    }`}
                >
                  {celula.dia && (
                    <>
                      {/* Número do dia */}
                      <div className="mb-1">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold
                          ${ehHoje
                            ? 'bg-brand-500 text-white'
                            : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {celula.dia}
                        </span>
                      </div>

                      {/* Pills de eventos */}
                      <div className="space-y-0.5">
                        {visivel.map(ev => {
                          const cor = (TIPO_CORES && TIPO_CORES[ev.tipo]) || { light: 'bg-blue-100 text-blue-700' };
                          return (
                            <button
                              key={ev.id}
                              onClick={() => onEventoClick(ev)}
                              className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate leading-tight ${cor.light} hover:opacity-80 transition`}
                            >
                              {ev.hora ? `${ev.hora.slice(0, 5)} ` : ''}
                              {ev.clienteNome || TIPO_LABEL[ev.tipo] || ev.tipo}
                            </button>
                          );
                        })}
                        {extra > 0 && (
                          <p className="text-[10px] text-slate-400 pl-1">+{extra} mais</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Calendário anual (12 mini-meses) ────────────────────────────────────────

function MiniMes({ ano, mes, eventosPorDia, onClick }) {
  const primeiroDia  = new Date(ano, mes, 1).getDay();
  const diasNoMes    = new Date(ano, mes + 1, 0).getDate();
  const totalCelulas = Math.ceil((primeiroDia + diasNoMes) / 7) * 7;
  const hoje         = hojeStr();
  const nomeMes      = new Date(ano, mes, 1).toLocaleDateString('pt-BR', { month: 'long' });

  let totalEventos = 0;
  const celulas = [];
  for (let i = 0; i < totalCelulas; i++) {
    const diaDoMes = i - primeiroDia + 1;
    if (diaDoMes < 1 || diaDoMes > diasNoMes) {
      celulas.push({ dia: null, iso: null, count: 0 });
    } else {
      const iso  = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(diaDoMes).padStart(2, '0')}`;
      const count = (eventosPorDia[iso] || []).length;
      totalEventos += count;
      celulas.push({ dia: diaDoMes, iso, count });
    }
  }

  return (
    <button
      onClick={onClick}
      className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-left hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-md transition"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-slate-800 dark:text-white capitalize">{nomeMes}</span>
        {totalEventos > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
            {totalEventos}
          </span>
        )}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {['D','S','T','Q','Q','S','S'].map((d, i) => (
          <div key={i} className="text-center text-[8px] font-bold text-slate-400 leading-none py-0.5">{d}</div>
        ))}
        {celulas.map((c, i) => {
          const ehHoje = c.iso === hoje;
          return (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center text-[9px] rounded relative
                ${!c.dia ? '' : ehHoje ? 'bg-brand-500 text-white font-bold' : 'text-slate-500 dark:text-slate-400'}
              `}
            >
              {c.dia || ''}
              {c.count > 0 && !ehHoje && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-500" />
              )}
            </div>
          );
        })}
      </div>
    </button>
  );
}

function CalendarioAnual({ ano, eventosPorDia, onSelectMes, onAnoChange }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onAnoChange(-1)}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          <ChevronLeft size={18} className="text-slate-500" />
        </button>
        <h2 className="text-base font-bold text-slate-800 dark:text-white">{ano}</h2>
        <button
          onClick={() => onAnoChange(1)}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          <ChevronRight size={18} className="text-slate-500" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: 12 }, (_, m) => (
          <MiniMes
            key={m}
            ano={ano}
            mes={m}
            eventosPorDia={eventosPorDia}
            onClick={() => onSelectMes(new Date(ano, m, 1))}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

function TimelineView({ eventos, onEventoClick, onEditar, onExcluir, onStatusRapido }) {
  const porData = useMemo(() => {
    const map = {};
    eventos.forEach(ev => {
      if (!map[ev.data]) map[ev.data] = [];
      map[ev.data].push(ev);
    });
    return map;
  }, [eventos]);

  const datasOrdenadas = Object.keys(porData).sort();

  if (datasOrdenadas.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
          <CalendarDays size={28} className="text-slate-400" />
        </div>
        <p className="font-bold text-slate-600 dark:text-slate-300">Nenhum evento encontrado</p>
        <p className="text-sm text-slate-400 mt-1">Ajuste os filtros ou crie um novo agendamento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {datasOrdenadas.map(data => {
        const isHoje = data === hojeStr();
        const evs = porData[data];
        return (
          <div key={data}>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${isHoje ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <h2 className={`text-sm font-bold capitalize ${isHoje ? 'text-brand-600 dark:text-brand-400' : 'text-slate-600 dark:text-slate-300'}`}>
                  {formatarDataLabel(data)}
                </h2>
              </div>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              <span className="text-xs text-slate-400">{evs.length} evento{evs.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {evs.map(ev => {
                const cor   = (TIPO_CORES && TIPO_CORES[ev.tipo]) || { light: 'bg-blue-100 text-blue-700' };
                const st    = STATUS_STYLE[ev.status] || STATUS_STYLE['Agendado'];
                const isDoc = ev.tipo !== 'servico';

                return (
                  <div
                    key={ev.id}
                    className={`rounded-2xl border p-4 shadow-sm transition-shadow cursor-pointer
                      ${ev.deletado
                        ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 opacity-60'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md'
                      }`}
                    onClick={() => onEventoClick(ev)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cor.light}`}>
                          {TIPO_LABEL[ev.tipo] || ev.tipo}
                        </span>
                        {ev.deletado ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            Excluído
                          </span>
                        ) : (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                            {ev.status}
                          </span>
                        )}
                      </div>
                      {ev.hora && (
                        <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                          <Clock size={11} /> {ev.hora.slice(0, 5)}
                        </div>
                      )}
                    </div>

                    <p className={`font-bold text-sm leading-tight ${ev.deletado ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-white'}`}>{ev.clienteNome || '—'}</p>
                    {ev.clienteFantasia && <p className="text-xs text-slate-400 truncate">{ev.clienteFantasia}</p>}

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                      {isDoc ? <FileText size={11} /> : <Wrench size={11} />}
                      <span className="truncate">
                        {isDoc
                          ? `${TIPO_LABEL[ev.tipo]} #${ev.numeroDoc}`
                          : ev.tipoServico}
                      </span>
                    </div>

                    {ev.tecnico && !isDoc && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <User size={11} /> {ev.tecnico}
                      </div>
                    )}

                    {/* Ações rápidas (apenas serviços) */}
                    {!isDoc && (
                      <div
                        className="flex gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700"
                        onClick={e => e.stopPropagation()}
                      >
                        {ev.status !== 'Concluído' && (
                          <button
                            onClick={() => onStatusRapido(ev.id, 'Concluído')}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100 transition"
                          >
                            <CheckCircle2 size={11} /> Concluir
                          </button>
                        )}
                        {ev.status !== 'Cancelado' && (
                          <button
                            onClick={() => onStatusRapido(ev.id, 'Cancelado')}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition"
                          >
                            <XCircle size={11} /> Cancelar
                          </button>
                        )}
                        <div className="ml-auto flex gap-1">
                          <button onClick={() => onEditar(ev)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition">
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => onExcluir(ev.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Painel de vencimentos ────────────────────────────────────────────────────

function PainelVencimentos({ onAgendarRetorno }) {
  const [vencimentos, setVencimentos]     = useState([]);
  const [loading, setLoading]             = useState(false);
  const [expandido, setExpandido]         = useState(true);
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
            {loading
              ? [1, 2, 3].map(i => <div key={i} className="h-28 rounded-xl bg-slate-100 dark:bg-slate-700 animate-pulse" />)
              : vencimentos.map((v, idx) => {
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
                          <Phone size={11} /> <span>{v.telefone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Calendar size={11} />
                        <span>Vence em {v.data_vencimento}</span>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => onAgendarRetorno({
                            nome: v.nome_cliente, fantasia: v.fantasia,
                            cnpj: v.cnpj, telefone: v.telefone || '', endereco: v.endereco || '',
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
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                        >
                          <User size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })
            }
          </div>
        )}
      </div>

      <ClientePerfilModal cliente={clientePerfil} onClose={() => setClientePerfil(null)} />
    </>
  );
}

// ─── Painel de filtros ────────────────────────────────────────────────────────

function PainelFiltros({ filtros, onChange }) {
  const [listaTecnicos, setListaTecnicos] = useState([]);
  useEffect(() => {
    const tecs = getTecnicos();
    const eqs  = getEquipes().map(e => e.nome);
    setListaTecnicos([...tecs, ...eqs]);
  }, []);
  const toggle = (campo, valor) => {
    const atual = filtros[campo];
    onChange({
      ...filtros,
      [campo]: atual.includes(valor) ? atual.filter(v => v !== valor) : [...atual, valor],
    });
  };

  const limpar = () => onChange({ tipos: [], status: [], tecnicos: [] });
  const temFiltros = filtros.tipos.length > 0 || filtros.status.length > 0 || filtros.tecnicos.length > 0;

  const chipBase  = 'px-2.5 py-1 rounded-xl text-xs font-bold transition border cursor-pointer';
  const chipAtivo = 'border-brand-500 bg-brand-500 text-white';
  const chipOff   = 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-brand-300 dark:hover:border-brand-600';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Filtros</p>
        {temFiltros && (
          <button onClick={limpar} className="text-xs text-brand-500 hover:text-brand-600 font-medium">
            Limpar
          </button>
        )}
      </div>

      <div>
        <p className="text-[11px] text-slate-400 mb-1.5">Tipo</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            { value: 'servico',   label: 'Serviço'   },
            { value: 'laudo',     label: 'Laudo'     },
            { value: 'recibo',    label: 'Recibo'    },
            { value: 'orcamento', label: 'Orçamento' },
          ].map(c => (
            <button key={c.value} onClick={() => toggle('tipos', c.value)}
              className={`${chipBase} ${filtros.tipos.includes(c.value) ? chipAtivo : chipOff}`}
            >{c.label}</button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] text-slate-400 mb-1.5">Status</p>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map(s => (
            <button key={s.value} onClick={() => toggle('status', s.value)}
              className={`${chipBase} ${filtros.status.includes(s.value) ? chipAtivo : chipOff}`}
            >{s.label}</button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] text-slate-400 mb-1.5">Técnico</p>
        <div className="flex flex-wrap gap-1.5">
          {listaTecnicos.map(t => (
            <button key={t} onClick={() => toggle('tecnicos', t)}
              className={`${chipBase} ${filtros.tecnicos.includes(t) ? chipAtivo : chipOff}`}
            >{t.split(' ')[0]}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Agenda() {
  const location = useLocation();
  const [eventos, setEventos]                     = useState([]);
  const [view, setView]                           = useState('calendario');
  const [mesAtual, setMesAtual]                   = useState(() => new Date());
  const [anoVisao, setAnoVisao]                   = useState(() => new Date().getFullYear());
  const [filtros, setFiltros]                     = useState({ tipos: [], status: [], tecnicos: [] });
  const [busca, setBusca]                         = useState('');
  const [eventoSelecionado, setEventoSelecionado] = useState(null);
  const [modalOpen, setModalOpen]                 = useState(false);
  const [eventoEditar, setEventoEditar]           = useState(null);
  const [clienteInicial, setClienteInicial]       = useState(null);

  const recarregar = useCallback(async () => setEventos(await getAgendamentos()), []);
  useEffect(() => { recarregar(); }, [recarregar]);

  // ── Deep link: chegou com cliente via navigate state ──
  useEffect(() => {
    if (location.state?.cliente) {
      const c = location.state.cliente;
      const termo = c.nome || c.fantasia || c.cnpj || '';
      setBusca(termo);
      setView('timeline');
    }
  }, [location.state]);

  // ── Filtro ──
  const eventosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return eventos.filter(ev => {
      if (filtros.tipos.length    > 0 && !filtros.tipos.includes(ev.tipo))       return false;
      if (filtros.status.length   > 0 && !filtros.status.includes(ev.status))    return false;
      if (filtros.tecnicos.length > 0 && !filtros.tecnicos.includes(ev.tecnico)) return false;
      if (q) {
        const nome     = (ev.clienteNome     || '').toLowerCase();
        const fantasia = (ev.clienteFantasia || '').toLowerCase();
        const cnpj     = (ev.clienteCnpj    || '').replace(/\D/g, '');
        const qNum     = q.replace(/\D/g, '');
        if (!nome.includes(q) && !fantasia.includes(q) && !(qNum && cnpj.includes(qNum))) return false;
      }
      return true;
    });
  }, [eventos, filtros, busca]);

  // ── Eventos indexados por data (para o calendário) ──
  const eventosPorDia = useMemo(() => {
    const map = {};
    eventosFiltrados
      .filter(ev => !ev.deletado)
      .forEach(ev => {
        if (!ev.data) return;
        if (!map[ev.data]) map[ev.data] = [];
        map[ev.data].push(ev);
      });
    return map;
  }, [eventosFiltrados]);

  // ── Handlers ──
  const handleSalvar = async (dados) => {
    if (eventoEditar) {
      await atualizarAgendamento(eventoEditar.id, dados);
    } else if (dados.recorrente) {
      await criarAgendamentoComRecorrencia(dados);
    } else {
      await criarAgendamento(dados);
    }
    recarregar();
  };

  const handleStatusRapido = async (id, status) => {
    await atualizarAgendamento(id, { status });
    recarregar();
  };

  const handleExcluir = async (id) => {
    if (window.confirm('Remover este agendamento?')) {
      await excluirAgendamento(id);
      recarregar();
    }
  };

  const handleExcluirSerie = async (recorrenciaId) => {
    if (window.confirm('Remover TODOS os eventos desta série?')) {
      await excluirSerieRecorrente(recorrenciaId);
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

  const handleMesChange = (delta) => {
    if (delta === 0) {
      setMesAtual(new Date());
    } else {
      setMesAtual(prev => {
        const d = new Date(prev.getFullYear(), prev.getMonth() + delta, 1);
        return d;
      });
    }
  };

  // ── Resumo ──
  const totalAgendados = eventos.filter(e => e.status === 'Agendado').length;
  const totalServicos  = eventos.filter(e => e.tipo === 'servico').length;
  const totalDocs      = eventos.filter(e => e.tipo !== 'servico').length;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CalendarDays size={24} className="text-brand-500" />
            Agenda — Centro de Comando
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Serviços, documentos emitidos e alertas de garantia em um só lugar.
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
            onClick={() => { setEventoEditar(null); setClienteInicial(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold shadow-md shadow-brand-500/25 transition"
          >
            <Plus size={16} /> Novo Agendamento
          </button>
        </div>
      </div>

      {/* Barra de busca */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar cliente por nome ou CNPJ..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition"
        />
        {busca && (
          <button
            onClick={() => setBusca('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800/30">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalAgendados}</p>
          <p className="text-xs font-medium text-blue-500 mt-0.5">Agendados</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-4 border border-purple-100 dark:border-purple-800/30">
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalServicos}</p>
          <p className="text-xs font-medium text-purple-500 mt-0.5">Serviços</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-2xl font-bold text-slate-600 dark:text-slate-300">{totalDocs}</p>
          <p className="text-xs font-medium text-slate-400 mt-0.5">Documentos</p>
        </div>
      </div>

      {/* Painel de garantias */}
      <PainelVencimentos onAgendarRetorno={handleAgendarRetorno} />

      {/* Layout: filtros + calendário/timeline */}
      <div className="flex flex-col xl:flex-row gap-4">

        {/* Filtros */}
        <div className="xl:w-60 shrink-0">
          <PainelFiltros filtros={filtros} onChange={setFiltros} />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('calendario')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition border
                ${view === 'calendario'
                  ? 'bg-brand-500 border-brand-500 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-300'
                }`}
            >
              <CalendarDays size={15} /> Calendário
            </button>
            <button
              onClick={() => setView('timeline')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition border
                ${view === 'timeline'
                  ? 'bg-brand-500 border-brand-500 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-300'
                }`}
            >
              <LayoutList size={15} /> Timeline
            </button>
            <button
              onClick={() => setView('ano')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition border
                ${view === 'ano'
                  ? 'bg-brand-500 border-brand-500 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-300'
                }`}
            >
              <CalendarDays size={15} /> Ano
            </button>
            <span className="ml-auto text-xs text-slate-400">
              {eventosFiltrados.length} evento{eventosFiltrados.length !== 1 ? 's' : ''}
            </span>
          </div>

          {view === 'calendario' && (
            <CalendarioMensal
              mes={mesAtual}
              eventosPorDia={eventosPorDia}
              onEventoClick={setEventoSelecionado}
              onMesChange={handleMesChange}
            />
          )}
          {view === 'timeline' && (
            <TimelineView
              eventos={eventosFiltrados}
              onEventoClick={setEventoSelecionado}
              onEditar={handleEditar}
              onExcluir={handleExcluir}
              onStatusRapido={handleStatusRapido}
            />
          )}
          {view === 'ano' && (
            <CalendarioAnual
              ano={anoVisao}
              eventosPorDia={eventosPorDia}
              onSelectMes={(d) => { setMesAtual(d); setView('calendario'); }}
              onAnoChange={(delta) => setAnoVisao(a => a + delta)}
            />
          )}
        </div>
      </div>

      {/* Modal de detalhes */}
      <EventoDetalheModal
        evento={eventoSelecionado}
        onClose={() => setEventoSelecionado(null)}
        onEditar={handleEditar}
        onStatusRapido={handleStatusRapido}
        onExcluir={handleExcluir}
        onExcluirSerie={handleExcluirSerie}
      />

      {/* Modal criação/edição */}
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
