/**
 * NovoAgendamentoModal — Modal para criar ou editar um agendamento.
 *
 * Props:
 *   isOpen          boolean
 *   onClose         () => void
 *   onSalvar        (dados) => void
 *   clienteInicial  object | null  — pré-preenche dados do cliente
 *   eventoEditar    object | null  — se passado, modo de edição
 */
import { useState, useEffect, useId } from 'react';
import { X, User, Calendar, Clock, Wrench, FileText, Search } from 'lucide-react';
import Modal from '../shared/Modal';
import { ClientePickerModal } from '../documentos/ClientePickerModal';
import { getClientes } from '../../services/clienteCache';
import { TIPOS_SERVICO, STATUS_OPTIONS, getTecnicos, getEquipes } from '../../services/agendaService';

export function NovoAgendamentoModal({ isOpen, onClose, onSalvar, clienteInicial = null, eventoEditar = null }) {
  const hoje = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const emptyForm = {
    clienteNome:     '',
    clienteFantasia: '',
    clienteCnpj:     '',
    clienteTelefone: '',
    clienteEndereco: '',
    tipoServico:     TIPOS_SERVICO[0],
    tecnico:         '',
    recorrente:      false,
    frequenciaMeses: 3,
    data:            hoje,
    hora:            '08:00',
    status:          'Agendado',
    observacao:      '',
  };

  const [form, setForm]                   = useState(emptyForm);
  const [pickerOpen, setPickerOpen]       = useState(false);
  const [clientesSalvos, setClientesSalvos] = useState([]);
  const [opcoesTecnico, setOpcoesTecnico]   = useState([]);

  // IDs únicos para acessibilidade
  const uid = useId();
  const id = (name) => `${uid}-${name}`;

  useEffect(() => {
    setClientesSalvos(getClientes());
    const tecs = getTecnicos();
    const eqs  = getEquipes().map(e => e.nome);
    setOpcoesTecnico([...tecs, ...eqs]);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (eventoEditar) {
      setForm({ ...emptyForm, ...eventoEditar });
    } else if (clienteInicial) {
      setForm({
        ...emptyForm,
        clienteNome:     clienteInicial.nome      || clienteInicial.clienteNome     || '',
        clienteFantasia: clienteInicial.fantasia  || clienteInicial.clienteFantasia || '',
        clienteCnpj:     clienteInicial.cnpj      || clienteInicial.clienteCnpj     || '',
        clienteTelefone: clienteInicial.telefone  || clienteInicial.clienteTelefone || '',
        clienteEndereco: clienteInicial.endereco  || clienteInicial.clienteEndereco || '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [isOpen, clienteInicial, eventoEditar]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSelectCliente = (c) => {
    set('clienteNome',     c.nome      || '');
    set('clienteFantasia', c.fantasia  || '');
    set('clienteCnpj',     c.cnpj      || '');
    set('clienteTelefone', c.telefone  || '');
    set('clienteEndereco', c.endereco  || '');
    setPickerOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.clienteNome.trim() || !form.data) return;
    onSalvar(form);
    onClose();
  };

  // Classes base reutilizadas (compatíveis com o Design System)
  const labelCls = 'block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide';
  const inputCls = `w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600
    bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white
    focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500
    transition-all duration-150`;

  // Classe de botão toggle (frequência / status)
  const toggleBtn = (active, colorActive = 'brand') => {
    const activeColors = {
      brand:   'bg-brand-500 border-brand-500 text-white',
      blue:    'bg-blue-500 border-blue-500 text-white',
      green:   'bg-emerald-500 border-emerald-500 text-white',
      red:     'bg-red-500 border-red-500 text-white',
    };
    return `flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-150 border-2
      active:scale-[0.97]
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
      ${active
        ? `${activeColors[colorActive] || activeColors.brand} focus-visible:ring-brand-400/60`
        : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500 focus-visible:ring-slate-400/40'
      }`;
  };

  const clienteSelecionado = !!form.clienteNome;
  const titulo = eventoEditar ? 'Editar Agendamento' : 'Novo Agendamento';

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={titulo} maxWidth="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>

          {/* ── Cliente ─────────────────────────────────────────── */}
          <div>
            <label id={id('cliente-label')} className={labelCls}>
              Cliente <span className="text-red-400 ml-0.5" aria-hidden="true">*</span>
            </label>
            {clienteSelecionado ? (
              <div
                className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700"
                aria-labelledby={id('cliente-label')}
              >
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-800 flex items-center justify-center shrink-0" aria-hidden="true">
                  <User size={18} className="text-blue-600 dark:text-blue-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800 dark:text-white leading-tight truncate">{form.clienteNome}</p>
                  {form.clienteFantasia && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{form.clienteFantasia}</p>}
                  {form.clienteCnpj    && <p className="text-xs font-mono text-slate-400 mt-0.5">{form.clienteCnpj}</p>}
                  {form.clienteTelefone && <p className="text-xs text-slate-500 dark:text-slate-400">{form.clienteTelefone}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  aria-label={`Trocar cliente — atualmente: ${form.clienteNome}`}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0 font-medium
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 rounded px-1"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                aria-required="true"
                aria-label="Selecionar cliente para o agendamento"
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl
                  border-2 border-dashed border-slate-300 dark:border-slate-600
                  text-slate-500 dark:text-slate-400
                  hover:border-brand-400 hover:text-brand-600 dark:hover:border-brand-500 dark:hover:text-brand-400
                  active:scale-[0.98]
                  transition-all duration-150 text-sm font-medium
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
              >
                <Search size={16} aria-hidden="true" />
                Selecionar cliente...
              </button>
            )}
          </div>

          {/* ── Data e Hora ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={id('data')} className={labelCls}>
                <Calendar size={11} className="inline mr-1" aria-hidden="true" /> Data
                <span className="text-red-400 ml-0.5" aria-hidden="true">*</span>
              </label>
              <input
                id={id('data')}
                type="date"
                value={form.data}
                onChange={e => set('data', e.target.value)}
                required
                aria-required="true"
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor={id('hora')} className={labelCls}>
                <Clock size={11} className="inline mr-1" aria-hidden="true" /> Hora
              </label>
              <input
                id={id('hora')}
                type="time"
                value={form.hora}
                onChange={e => set('hora', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* ── Tipo de Serviço ─────────────────────────────────── */}
          <div>
            <label htmlFor={id('tipo-servico')} className={labelCls}>
              <Wrench size={11} className="inline mr-1" aria-hidden="true" /> Tipo de Serviço
            </label>
            <select
              id={id('tipo-servico')}
              value={form.tipoServico}
              onChange={e => set('tipoServico', e.target.value)}
              className={inputCls}
            >
              {TIPOS_SERVICO.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* ── Técnico Responsável ─────────────────────────────── */}
          <div>
            <label htmlFor={id('tecnico')} className={labelCls}>Técnico Responsável</label>
            <select
              id={id('tecnico')}
              value={form.tecnico}
              onChange={e => set('tecnico', e.target.value)}
              className={inputCls}
            >
              <option value="">— Sem técnico —</option>
              {opcoesTecnico.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* ── Recorrência ─────────────────────────────────────── */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                id={id('recorrente')}
                type="checkbox"
                checked={form.recorrente}
                onChange={e => set('recorrente', e.target.checked)}
                className="w-4 h-4 rounded accent-brand-500
                  focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-1"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                Serviço Recorrente (Contrato)
              </span>
            </label>

            {form.recorrente && (
              <div className="ml-6 animate-[slideUp_0.2s_cubic-bezier(0.16,1,0.3,1)_both]">
                <p id={id('freq-label')} className={`${labelCls} mb-2`}>Frequência</p>
                <div className="flex gap-2" role="group" aria-labelledby={id('freq-label')}>
                  {[1, 3, 6].map(f => (
                    <button
                      key={f}
                      type="button"
                      aria-pressed={form.frequenciaMeses === f}
                      onClick={() => set('frequenciaMeses', f)}
                      className={toggleBtn(form.frequenciaMeses === f, 'brand')}
                    >
                      {f === 1 ? 'Mensal' : f === 3 ? 'Trimestral' : 'Semestral'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Status ──────────────────────────────────────────── */}
          <div>
            <p id={id('status-label')} className={labelCls}>Status</p>
            <div className="flex gap-2" role="group" aria-labelledby={id('status-label')}>
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  aria-pressed={form.status === s.value}
                  onClick={() => set('status', s.value)}
                  className={toggleBtn(
                    form.status === s.value,
                    s.color === 'blue' ? 'blue' : s.color === 'green' ? 'green' : 'red'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Observação ──────────────────────────────────────── */}
          <div>
            <label htmlFor={id('observacao')} className={labelCls}>
              <FileText size={11} className="inline mr-1" aria-hidden="true" /> Observação
            </label>
            <textarea
              id={id('observacao')}
              value={form.observacao}
              onChange={e => set('observacao', e.target.value)}
              rows={2}
              placeholder="Instruções, ponto de referência, etc."
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* ── Botões ──────────────────────────────────────────── */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium
                border border-slate-200 dark:border-slate-600
                text-slate-600 dark:text-slate-300
                hover:bg-slate-50 dark:hover:bg-slate-700
                active:scale-[0.97]
                transition-all duration-150
                focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!clienteSelecionado || !form.data}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white
                bg-brand-500 hover:bg-brand-600
                active:scale-[0.97]
                disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none
                transition-all duration-150
                focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50"
            >
              {eventoEditar ? 'Salvar Alterações' : 'Agendar'}
            </button>
          </div>
        </form>
      </Modal>

      <ClientePickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        clientes={clientesSalvos}
        onSelect={handleSelectCliente}
      />
    </>
  );
}
