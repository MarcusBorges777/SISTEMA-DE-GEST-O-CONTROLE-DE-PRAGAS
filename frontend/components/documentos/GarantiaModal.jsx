import { useEffect, useMemo, useState } from 'react';
import {
  Shield, Calendar, Clock, X, Check, AlertTriangle,
  CalendarCheck, Hash,
} from 'lucide-react';
import Modal from '../shared/Modal';

const PRESETS = [
  { meses: 3,  label: '3 meses',  desc: 'Pontual'        },
  { meses: 6,  label: '6 meses',  desc: 'Padrão curto'   },
  { meses: 12, label: '12 meses', desc: 'Padrão anual'   },
  { meses: 24, label: '24 meses', desc: 'Estendida'      },
];

// Calcula data de vencimento somando N meses (com tratamento de overflow,
// igual à lógica server-side em app.py:3315-3320)
function calcularVencimento(dataExecucao, meses) {
  if (!dataExecucao || !meses || meses <= 0) return null;
  try {
    const [y, mo, d] = dataExecucao.split('-').map(Number);
    if (!y || !mo || !d) return null;
    const base = new Date(y, mo - 1, d);
    const totalMes = base.getMonth() + Number(meses);
    const novoAno = base.getFullYear() + Math.floor(totalMes / 12);
    const novoMes = ((totalMes % 12) + 12) % 12;
    // Último dia do novoMes (clamp do dia)
    const ultimoDia = new Date(novoAno, novoMes + 1, 0).getDate();
    const novoDia = Math.min(d, ultimoDia);
    return new Date(novoAno, novoMes, novoDia);
  } catch {
    return null;
  }
}

function fmtBR(d) {
  if (!d) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function diffDays(a, b) {
  if (!a || !b) return 0;
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}

export default function GarantiaModal({
  isOpen,
  onClose,
  onConfirm,
  tipoDocumento = 'laudo',
  initialData = {},
  clienteNome = '',
}) {
  const hojeISO = new Date().toISOString().slice(0, 10);

  const [dataExecucao, setDataExecucao] = useState(initialData.dataExecucao || hojeISO);
  const [meses, setMeses]               = useState(initialData.garantiaMeses || null);
  const [customMode, setCustomMode]     = useState(false);
  const [customValue, setCustomValue]   = useState('');
  const [semGarantia, setSemGarantia]   = useState(false);

  // Reseta o estado ao abrir
  useEffect(() => {
    if (!isOpen) return;
    setDataExecucao(initialData.dataExecucao || hojeISO);
    const m = Number(initialData.garantiaMeses) || 0;
    if (m > 0) {
      const isPreset = PRESETS.some(p => p.meses === m);
      if (isPreset) {
        setMeses(m);
        setCustomMode(false);
        setCustomValue('');
      } else {
        setMeses(m);
        setCustomMode(true);
        setCustomValue(String(m));
      }
      setSemGarantia(false);
    } else {
      setMeses(null);
      setCustomMode(false);
      setCustomValue('');
      setSemGarantia(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const mesesEfetivo = semGarantia
    ? 0
    : (customMode ? Math.max(0, Math.min(60, Number(customValue) || 0)) : (meses || 0));

  const dataVenc = useMemo(
    () => semGarantia ? null : calcularVencimento(dataExecucao, mesesEfetivo),
    [dataExecucao, mesesEfetivo, semGarantia]
  );

  const dias = useMemo(() => {
    if (!dataVenc) return 0;
    const exec = new Date(dataExecucao);
    return diffDays(dataVenc, exec);
  }, [dataVenc, dataExecucao]);

  const podeConfirmar = !!dataExecucao && (semGarantia || mesesEfetivo > 0);

  const escolherPreset = (m) => {
    setMeses(m);
    setCustomMode(false);
    setCustomValue('');
    setSemGarantia(false);
  };

  const ativarCustom = () => {
    setCustomMode(true);
    setMeses(null);
    setSemGarantia(false);
  };

  const toggleSemGarantia = () => {
    setSemGarantia(s => {
      const novo = !s;
      if (novo) {
        setMeses(null);
        setCustomMode(false);
        setCustomValue('');
      }
      return novo;
    });
  };

  const handleConfirmar = () => {
    if (!podeConfirmar) return;
    onConfirm({
      dataExecucao,
      garantiaMeses: mesesEfetivo,
    });
  };

  const tipoLabel = tipoDocumento === 'recibo' ? 'Recibo' : 'Laudo';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-lg">
      <div className="-mx-6 -mt-4">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shrink-0 shadow-md shadow-brand-500/30">
              <Shield size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-slate-800 dark:text-white text-base">
                Garantia Técnica
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {tipoLabel}
                {clienteNome && <> · <span className="font-medium text-slate-700 dark:text-slate-200">{clienteNome}</span></>}
              </p>
            </div>
            <button onClick={onClose} aria-label="Fechar"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition shrink-0">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Data de execução */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
              <Calendar size={12} /> Data de Execução
            </label>
            <input
              type="date"
              value={dataExecucao}
              onChange={e => setDataExecucao(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Período */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
              <Clock size={12} /> Período de Garantia
            </label>

            <div className={`grid grid-cols-5 gap-2 ${semGarantia ? 'opacity-40 pointer-events-none' : ''}`}>
              {PRESETS.map(p => {
                const ativo = !customMode && meses === p.meses;
                return (
                  <button
                    key={p.meses}
                    type="button"
                    onClick={() => escolherPreset(p.meses)}
                    disabled={semGarantia}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border-2 transition
                      ${ativo
                        ? 'bg-brand-500 border-brand-500 text-white shadow-md shadow-brand-500/30'
                        : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/30 text-slate-700 dark:text-slate-200 hover:border-brand-300'
                      }`}
                  >
                    <span className="text-base font-black leading-none">{p.meses}</span>
                    <span className={`text-[9px] font-bold mt-0.5 leading-tight ${ativo ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                      {p.meses === 1 ? 'mês' : 'meses'}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={ativarCustom}
                disabled={semGarantia}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border-2 transition
                  ${customMode
                    ? 'bg-brand-500 border-brand-500 text-white shadow-md shadow-brand-500/30'
                    : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/30 text-slate-700 dark:text-slate-200 hover:border-brand-300'
                  }`}
              >
                <Hash size={14} />
                <span className={`text-[9px] font-bold mt-1 leading-none ${customMode ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                  custom
                </span>
              </button>
            </div>

            {customMode && !semGarantia && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={customValue}
                  onChange={e => setCustomValue(e.target.value)}
                  autoFocus
                  placeholder="Quantos meses?"
                  className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-brand-300 dark:border-brand-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <span className="text-xs text-slate-400">meses (1–60)</span>
              </div>
            )}

            {/* Banner verde — vencimento calculado */}
            {!semGarantia && dataVenc && mesesEfetivo > 0 && (
              <div className="mt-4 flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                  <CalendarCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200 leading-tight">
                    Vence em {fmtBR(dataVenc)}
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {dias} dia{dias !== 1 ? 's' : ''} de cobertura · {mesesEfetivo} {mesesEfetivo === 1 ? 'mês' : 'meses'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Divisor */}
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white dark:bg-slate-800 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">ou</span>
            </div>
          </div>

          {/* Sem garantia */}
          <label className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition
            ${semGarantia
              ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
              : 'border-slate-200 dark:border-slate-600 hover:border-amber-300'
            }`}>
            <input
              type="checkbox"
              checked={semGarantia}
              onChange={toggleSemGarantia}
              className="w-4 h-4 mt-0.5 rounded text-amber-500 focus:ring-amber-500"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 dark:text-white">
                Emitir SEM garantia técnica
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Para serviços pontuais que não geram cobertura: caixa de gordura,
                desentupimento, dedetização emergencial única, etc.
              </p>
            </div>
          </label>

          {semGarantia && (
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl px-4 py-3">
              <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                <strong>Atenção:</strong> este {tipoLabel.toLowerCase()} será emitido sem cobertura
                de garantia. Não aparecerá nos alertas de remarketing.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex gap-2 justify-end bg-slate-50 dark:bg-slate-900/30">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={!podeConfirmar}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-md
              ${podeConfirmar
                ? 'bg-gradient-to-br from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white shadow-brand-500/30'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed shadow-none'
              }`}
          >
            <Check size={14} /> Confirmar e Emitir
          </button>
        </div>
      </div>
    </Modal>
  );
}
