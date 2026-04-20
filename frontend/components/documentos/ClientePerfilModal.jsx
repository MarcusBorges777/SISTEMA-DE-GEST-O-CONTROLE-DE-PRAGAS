import { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import { getHistoricoCliente } from '../../services/reciboHistorico';
import { saveCliente, getClientes } from '../../services/clienteCache';
import { Building2, FileText, DollarSign, Clock, MapPin, Tag, Phone, Pencil, Check, X } from 'lucide-react';

/**
 * Modal de perfil completo de um cliente.
 * Exibe dados cadastrais + histórico e métricas financeiras de recibos.
 * Permite editar os dados cadastrais salvos no cache local.
 *
 * @param {object|null} cliente  — objeto do clienteCache { nome, fantasia, cnpj, endereco, atividade }
 * @param {() => void} onClose
 * @param {(clientesAtualizados: Array) => void} [onUpdate]  — chamado após salvar edição
 */
export function ClientePerfilModal({ cliente, onClose, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(false);

  // Sincroniza o form sempre que o cliente mudar ou entrar em modo edição
  useEffect(() => {
    if (cliente) {
      setForm({
        nome:      cliente.nome     || '',
        fantasia:  cliente.fantasia || '',
        cnpj:      cliente.cnpj     || '',
        endereco:  cliente.endereco || '',
        atividade: cliente.atividade || '',
      });
    }
    setEditing(false);
    setSaved(false);
  }, [cliente]);

  if (!cliente) return null;

  const historico = getHistoricoCliente(cliente.cnpj);

  const totalFormatado = (historico.total || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const ultimoReciboFormatado = historico.ultimoRecibo
    ? new Date(historico.ultimoRecibo).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : null;

  const handleChange = (field, value) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSalvar = () => {
    if (!form.nome?.trim() && !form.fantasia?.trim()) return;
    saveCliente(form);
    setSaved(true);
    setEditing(false);
    if (onUpdate) onUpdate(getClientes());
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCancelar = () => {
    setForm({
      nome:      cliente.nome     || '',
      fantasia:  cliente.fantasia || '',
      cnpj:      cliente.cnpj     || '',
      endereco:  cliente.endereco || '',
      atividade: cliente.atividade || '',
    });
    setEditing(false);
  };

  /* ─── display values (editado ou original) ─── */
  const display = editing ? form : {
    nome:      cliente.nome,
    fantasia:  cliente.fantasia,
    cnpj:      cliente.cnpj,
    endereco:  cliente.endereco,
    atividade: cliente.atividade,
  };

  return (
    <Modal isOpen={!!cliente} onClose={onClose} title="Perfil do Cliente" maxWidth="max-w-lg">

      {/* ── Cabeçalho ── */}
      <div className="flex items-start gap-4 pb-4 border-b border-slate-200">
        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          <Building2 size={22} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              value={form.nome}
              onChange={e => handleChange('nome', e.target.value)}
              placeholder="Razão Social"
              className="w-full font-bold text-slate-800 border-b border-blue-400 focus:outline-none bg-transparent pb-0.5 mb-1"
            />
          ) : (
            <h4 className="font-bold text-slate-800 leading-tight">{display.nome || '—'}</h4>
          )}
          {editing ? (
            <input
              value={form.fantasia}
              onChange={e => handleChange('fantasia', e.target.value)}
              placeholder="Nome Fantasia"
              className="w-full text-sm text-slate-500 border-b border-slate-200 focus:outline-none bg-transparent pb-0.5"
            />
          ) : (
            display.fantasia && (
              <p className="text-sm text-slate-500 truncate">{display.fantasia}</p>
            )
          )}
          {editing ? (
            <input
              value={form.cnpj}
              onChange={e => handleChange('cnpj', e.target.value)}
              placeholder="CNPJ / CPF"
              maxLength={18}
              className="w-full text-xs font-mono text-slate-600 mt-1 border-b border-slate-200 focus:outline-none bg-transparent pb-0.5"
            />
          ) : (
            <p className="text-xs font-mono text-slate-600 mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded">
              {display.cnpj || '—'}
            </p>
          )}
        </div>

        {/* Botão Editar / Confirmar / Cancelar */}
        <div className="shrink-0 flex gap-1">
          {editing ? (
            <>
              <button
                onClick={handleSalvar}
                className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-600 transition-colors"
                title="Salvar alterações"
              >
                <Check size={16} />
              </button>
              <button
                onClick={handleCancelar}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
                title="Cancelar edição"
              >
                <X size={16} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
              title="Editar dados do cliente"
            >
              <Pencil size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Feedback de salvo */}
      {saved && (
        <div className="mt-3 text-xs text-emerald-600 font-medium flex items-center gap-1">
          <Check size={13} /> Dados atualizados no cache com sucesso.
        </div>
      )}

      {/* ── Dados Cadastrais ── */}
      <div className="py-4 border-b border-slate-100 space-y-2">
        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          Dados Cadastrais
        </h5>

        {editing ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-slate-400 shrink-0" />
              <input
                value={form.endereco}
                onChange={e => handleChange('endereco', e.target.value)}
                placeholder="Endereço completo"
                className="flex-1 text-sm text-slate-600 border-b border-slate-200 focus:outline-none bg-transparent pb-0.5"
              />
            </div>
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-slate-400 shrink-0" />
              <input
                value={form.atividade}
                onChange={e => handleChange('atividade', e.target.value)}
                placeholder="Atividade econômica"
                className="flex-1 text-sm text-slate-600 border-b border-slate-200 focus:outline-none bg-transparent pb-0.5 italic"
              />
            </div>
          </div>
        ) : (
          <>
            {display.endereco && (
              <div className="flex items-start gap-2 text-sm text-slate-600">
                <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                <span>{display.endereco}</span>
              </div>
            )}
            {display.atividade && (
              <div className="flex items-start gap-2 text-sm text-slate-600">
                <Tag size={14} className="text-slate-400 mt-0.5 shrink-0" />
                <span className="italic">{display.atividade}</span>
              </div>
            )}
            {!display.endereco && !display.atividade && (
              <p className="text-xs text-slate-400 italic">
                Nenhum dado adicional cadastrado.{' '}
                <button onClick={() => setEditing(true)} className="underline hover:text-blue-500 transition-colors">
                  Adicionar
                </button>
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Histórico e Métricas ── */}
      <div className="pt-4 space-y-3">
        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Histórico e Métricas
        </h5>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <FileText size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700 leading-none">{historico.contagem}</p>
              <p className="text-xs text-slate-500 mt-0.5">Recibos emitidos</p>
            </div>
          </div>

          <div className="bg-emerald-50 rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <DollarSign size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-700 leading-none">{totalFormatado}</p>
              <p className="text-xs text-slate-500 mt-0.5">Total faturado</p>
            </div>
          </div>
        </div>

        {ultimoReciboFormatado && (
          <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
            <Clock size={13} className="shrink-0" />
            <span>Último recibo: <span className="font-medium text-slate-500">{ultimoReciboFormatado}</span></span>
          </div>
        )}

        {historico.contagem === 0 && (
          <p className="text-center text-slate-400 text-xs pt-2 pb-1 italic">
            Nenhum recibo registrado para este cliente ainda.
            <br />
            <span className="text-slate-300">Os valores são registrados automaticamente ao salvar um PDF de recibo.</span>
          </p>
        )}
      </div>
    </Modal>
  );
}
