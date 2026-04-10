import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Banner de alerta de feriado
 * Exibido quando a data de execucao coincide com um feriado nacional
 *
 * @param {Object} props
 * @param {Object|null} props.feriado - Objeto do feriado { date, name, type } ou null
 * @param {string} props.dataFormatada - Data formatada para exibicao (DD/MM/YYYY)
 */
export default function HolidayAlert({ feriado, dataFormatada }) {
  if (!feriado) return null;

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-6 flex items-center gap-3 shadow-sm print:hidden">
      <div className="bg-amber-100 p-2 rounded-lg">
        <AlertTriangle size={24} className="text-amber-600" />
      </div>
      <div>
        <p className="font-bold text-amber-800 text-sm">
          Atenção: Data selecionada é feriado nacional!
        </p>
        <p className="text-amber-700 text-xs mt-0.5">
          {dataFormatada} — <span className="font-bold">{feriado.name}</span>
          {feriado.type && <span className="text-amber-500 ml-1">({feriado.type})</span>}
        </p>
      </div>
    </div>
  );
}
