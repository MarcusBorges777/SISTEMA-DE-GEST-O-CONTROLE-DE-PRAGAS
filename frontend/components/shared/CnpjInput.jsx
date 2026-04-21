/**
 * CnpjInput — Input de CNPJ/CPF com busca automática e feedback visual.
 *
 * Usa o hook useCnpjAutofill internamente; o componente pai apenas passa
 * o valor e o onChange exposto pelo hook.
 */
import { Loader2, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

const statusStyles = {
  success: 'text-emerald-600',
  error:   'text-red-500',
  info:    'text-blue-500',
  loading: 'text-slate-400',
};

const StatusIcon = ({ type }) => {
  if (type === 'loading') return <Loader2 size={11} className="animate-spin shrink-0" />;
  if (type === 'success') return <CheckCircle2 size={11} className="shrink-0" />;
  if (type === 'error')   return <AlertTriangle size={11} className="shrink-0" />;
  return <Info size={11} className="shrink-0" />;
};

export function CnpjInput({
  value,
  onChange,
  isLoading,
  status,          // { text, type } | null
  className = '',
  label = 'CNPJ / CPF',
  inputClassName = '',
}) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-bold text-gray-700 mb-1">{label}</label>
      )}

      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={onChange}
          maxLength={18}
          placeholder="000.000.000-00 ou 00.000.000/0000-00"
          className={`w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none pr-8 transition-colors
            ${isLoading ? 'border-blue-300 bg-blue-50' : ''}
            ${status?.type === 'error' ? 'border-red-300' : ''}
            ${status?.type === 'success' ? 'border-emerald-300' : ''}
            ${inputClassName}`}
        />
        {isLoading && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400">
            <Loader2 size={14} className="animate-spin" />
          </span>
        )}
      </div>

      {status && (
        <p className={`flex items-center gap-1 text-[10px] mt-1 font-medium ${statusStyles[status.type] || 'text-slate-400'}`}>
          <StatusIcon type={status.type} />
          {status.text}
        </p>
      )}
    </div>
  );
}
