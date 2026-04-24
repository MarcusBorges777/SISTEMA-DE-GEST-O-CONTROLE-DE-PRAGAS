import { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import { saveCliente, getClientes } from '../../services/clienteCache';
import { Building2, MapPin, Tag, Phone, Mail, Pencil, Check, X } from 'lucide-react';

/**
 * Modal de perfil completo de um cliente.
 * Exibe e permite editar dados cadastrais salvos no cache local.
 *
 * @param {object|null} cliente  — objeto do clienteCache { nome, fantasia, cnpj, endereco, atividade, email, telefone }
 * @param {() => void} onClose
 * @param {(clientesAtualizados: Array) => void} [onUpdate]  — chamado após salvar edição
 */
export function ClientePerfilModal({ cliente, onClose, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (cliente) {
      setForm({
        nome:      cliente.nome      || '',
        fantasia:  cliente.fantasia  || '',
        cnpj:      cliente.cnpj      || '',
        endereco:  cliente.endereco  || '',
        atividade: cliente.atividade || '',
        email:     cliente.email     || '',
        telefone:  cliente.telefone  || '',
      });
    }
    setEditing(false);
    setSaved(false);
  }, [cliente]);

  if (!cliente) return null;

  const handleChange = (field, value) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSalvar = async () => {
    if (!form.nome?.trim() && !form.fantasia?.trim()) return;
    await saveCliente(form);
    setSaved(true);
    setEditing(false);
    if (onUpdate) getClientes().then(onUpdate).catch(() => {});
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCancelar = () => {
    setForm({
      nome:      cliente.nome      || '',
      fantasia:  cliente.fantasia  || '',
      cnpj:      cliente.cnpj      || '',
      endereco:  cliente.endereco  || '',
      atividade: cliente.atividade || '',
      email:     cliente.email     || '',
      telefone:  cliente.telefone  || '',
    });
    setEditing(false);
  };

  const display = editing ? form : {
    nome:      cliente.nome,
    fantasia:  cliente.fantasia,
    cnpj:      cliente.cnpj,
    endereco:  cliente.endereco,
    atividade: cliente.atividade,
    email:     cliente.email,
    telefone:  cliente.telefone,
  };

  const inputCls = "flex-1 text-sm text-slate-600 border-b border-slate-200 focus:outline-none bg-transparent pb-0.5";

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
          <Check size={13} /> Dados atualizados com sucesso.
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
                className={inputCls}
              />
            </div>
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-slate-400 shrink-0" />
              <input
                value={form.atividade}
                onChange={e => handleChange('atividade', e.target.value)}
                placeholder="Atividade econômica"
                className={`${inputCls} italic`}
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

      {/* ── Contatos ── */}
      <div className="py-4 space-y-2">
        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          Contatos
        </h5>

        {editing ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-slate-400 shrink-0" />
              <input
                value={form.telefone}
                onChange={e => handleChange('telefone', e.target.value)}
                placeholder="Telefone / WhatsApp"
                className={inputCls}
              />
            </div>
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-slate-400 shrink-0" />
              <input
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="E-mail"
                type="email"
                className={inputCls}
              />
            </div>
          </div>
        ) : (
          <>
            {display.telefone && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone size={14} className="text-slate-400 shrink-0" />
                <span>{display.telefone}</span>
              </div>
            )}
            {display.email && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail size={14} className="text-slate-400 shrink-0" />
                <a href={`mailto:${display.email}`} className="text-blue-500 hover:underline">
                  {display.email}
                </a>
              </div>
            )}
            {!display.telefone && !display.email && (
              <p className="text-xs text-slate-400 italic">
                Nenhum contato cadastrado.{' '}
                <button onClick={() => setEditing(true)} className="underline hover:text-blue-500 transition-colors">
                  Adicionar
                </button>
              </p>
            )}
          </>
        )}
      </div>

    </Modal>
  );
}
