/**
 * NovoAgendamentoModal — Modal para criar ou editar um agendamento.
 *
 * Props:
 *   isOpen          boolean
 *   onClose         () => void
 *   onSalvar        (dados) => void
 *   clienteInicial  object | null  — pré-preenche dados do cliente (ex: "Agendar Retorno")
 *   eventoEditar    object | null  — se passado, modo de edição
 */
import { useState, useEffect } from 'react';
import { X, User, Calendar, Clock, Wrench, FileText, Search } from 'lucide-react';
import Modal from '../shared/Modal';
import { ClientePickerModal } from '../documentos/ClientePickerModal';
import { getClientes } from '../../services/clienteCache';
import { TIPOS_SERVICO, STATUS_OPTIONS } from '../../services/agendaService';

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
    data:            hoje,
    hora:            '08:00',
    status:          'Agendado',
    observacao:      '',
  };

  const [form, setForm]           = useState(emptyForm);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [clientesSalvos, setClientesSalvos] = useState([]);

  // Carrega clientes salvos
  useEffect(() => { setClientesSalvos(getClientes()); }, [isOpen]);

  // Inicializa form ao abrir
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

  const labelCls = 'block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide';
  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition';

  const clienteSelecionado = !!form.clienteNome;
  const titulo = eventoEditar ? 'Editar Agendamento' : 'Novo Agendamento';

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={titulo} maxWidth="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Cliente ─────────────────────────────────────────── */}
          <div>
            <label className={labelCls}>Cliente</label>
            {clienteSelecionado ? (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-800 flex items-center justify-center shrink-0">
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
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0 font-medium"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-brand-400 hover:text-brand-600 dark:hover:border-brand-500 dark:hover:text-brand-400 transition text-sm font-medium"
              >
                <Search size={16} />
                Selecionar cliente...
              </button>
            )}
          </div>

          {/* ── Data e Hora ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>
                <Calendar size={11} className="inline mr-1" /> Data
              </label>
              <input
                type="date"
                value={form.data}
                onChange={e => set('data', e.target.value)}
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>
                <Clock size={11} className="inline mr-1" /> Hora
              </label>
              <input
                type="time"
                value={form.hora}
                onChange={e => set('hora', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* ── Tipo de Serviço ─────────────────────────────────── */}
          <div>
            <label className={labelCls}>
              <Wrench size={11} className="inline mr-1" /> Tipo de Serviço
            </label>
            <select
              value={form.tipoServico}
              onChange={e => set('tipoServico', e.target.value)}
              className={inputCls}
            >
              {TIPOS_SERVICO.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* ── Status ──────────────────────────────────────────── */}
          <div>
            <label className={labelCls}>Status</label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => set('status', s.value)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition border-2
                    ${form.status === s.value
                      ? s.color === 'blue'  ? 'bg-blue-500 border-blue-500 text-white'
                      : s.color === 'green' ? 'bg-emerald-500 border-emerald-500 text-white'
                      :                       'bg-red-500 border-red-500 text-white'
                      : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500'
                    }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Observação ──────────────────────────────────────── */}
          <div>
            <label className={labelCls}>
              <FileText size={11} className="inline mr-1" /> Observação
            </label>
            <textarea
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
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!clienteSelecionado || !form.data}
              className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-bold hover:bg-brand-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {eventoEditar ? 'Salvar Alterações' : 'Agendar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Picker de clientes */}
      <ClientePickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        clientes={clientesSalvos}
        onSelect={handleSelectCliente}
      />
    </>
  );
}
