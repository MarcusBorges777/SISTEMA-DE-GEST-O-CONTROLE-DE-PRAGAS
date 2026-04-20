import Modal from '../shared/Modal';
import { getHistoricoCliente } from '../../services/reciboHistorico';
import { Building2, FileText, DollarSign, Clock, MapPin, Tag, Phone } from 'lucide-react';

/**
 * Modal de perfil completo de um cliente.
 * Exibe dados cadastrais + histórico e métricas financeiras de recibos.
 *
 * @param {object|null} cliente — objeto do clienteCache { nome, fantasia, cnpj, endereco, atividade }
 * @param {() => void} onClose
 */
export function ClientePerfilModal({ cliente, onClose }) {
  if (!cliente) return null;

  const historico = getHistoricoCliente(cliente.cnpj);

  const totalFormatado = (historico.total || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const ultimoReciboFormatado = historico.ultimoRecibo
    ? new Date(historico.ultimoRecibo).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <Modal isOpen={!!cliente} onClose={onClose} title="Perfil do Cliente" maxWidth="max-w-lg">
      {/* ── Cabeçalho ── */}
      <div className="flex items-start gap-4 pb-4 border-b border-slate-200">
        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          <Building2 size={22} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-800 leading-tight">
            {cliente.nome || '—'}
          </h4>
          {cliente.fantasia && (
            <p className="text-sm text-slate-500 truncate">{cliente.fantasia}</p>
          )}
          <p className="text-xs font-mono text-slate-600 mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded">
            {cliente.cnpj || '—'}
          </p>
        </div>
      </div>

      {/* ── Dados Cadastrais ── */}
      <div className="py-4 border-b border-slate-100 space-y-2">
        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          Dados Cadastrais
        </h5>
        {cliente.endereco && (
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
            <span>{cliente.endereco}</span>
          </div>
        )}
        {cliente.atividade && (
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <Tag size={14} className="text-slate-400 mt-0.5 shrink-0" />
            <span className="italic">{cliente.atividade}</span>
          </div>
        )}
        {cliente.telefone && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Phone size={14} className="text-slate-400 shrink-0" />
            <span>{cliente.telefone}</span>
          </div>
        )}
        {!cliente.endereco && !cliente.atividade && !cliente.telefone && (
          <p className="text-xs text-slate-400 italic">Nenhum dado adicional cadastrado.</p>
        )}
      </div>

      {/* ── Histórico e Métricas ── */}
      <div className="pt-4 space-y-3">
        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Histórico e Métricas
        </h5>

        <div className="grid grid-cols-2 gap-3">
          {/* Recibos emitidos */}
          <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <FileText size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700 leading-none">
                {historico.contagem}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Recibos emitidos</p>
            </div>
          </div>

          {/* Total faturado */}
          <div className="bg-emerald-50 rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <DollarSign size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-700 leading-none">
                {totalFormatado}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Total faturado</p>
            </div>
          </div>
        </div>

        {/* Último recibo */}
        {ultimoReciboFormatado && (
          <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
            <Clock size={13} className="shrink-0" />
            <span>Último recibo: <span className="font-medium text-slate-500">{ultimoReciboFormatado}</span></span>
          </div>
        )}

        {/* Estado vazio */}
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
