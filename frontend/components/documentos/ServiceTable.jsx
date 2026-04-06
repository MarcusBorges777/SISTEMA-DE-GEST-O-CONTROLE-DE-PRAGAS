import React from 'react';
import { Trash2, Plus, Hash } from 'lucide-react';

/**
 * Tabela de servicos/itens reutilizavel
 * Usada em Recibos e Orcamentos
 *
 * @param {Object} props
 * @param {Array} props.items - [{ id, service, description, quantity, value }]
 * @param {Function} props.onUpdateItem - (id, field, value) => void
 * @param {Function} props.onRemoveItem - (id) => void
 * @param {Function} props.onAddItem - () => void
 * @param {number} props.total - Valor total calculado
 * @param {string} props.totalLabel - Label do total (ex: "Valor Total")
 * @param {'recibo'|'orcamento'} props.variant - Variante visual
 */
export default function ServiceTable({ items, onUpdateItem, onRemoveItem, onAddItem, total, totalLabel = "Valor Total", variant = 'recibo' }) {
  const primaryColor = variant === 'orcamento' ? '#254191' : '#1e3a8a';

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  return (
    <>
      {/* TABELA */}
      <section className="mb-6 relative z-10 flex-grow">
        <table className="w-full text-left border-collapse border border-blue-200 text-[10px] shadow-sm rounded-lg overflow-hidden">
          <thead className="text-white uppercase font-black text-[9px] print-bg-header" style={{ backgroundColor: primaryColor }}>
            <tr>
              <th className="p-2 border-r border-blue-700 w-[30%]">
                {variant === 'orcamento' ? 'Serviço' : 'Serviço Realizado'}
              </th>
              <th className="p-2 border-r border-blue-700 w-[40%]">
                {variant === 'orcamento' ? 'Descrição / Procedimento' : 'Detalhes / Procedimento'}
              </th>
              <th className="p-2 border-r border-blue-700 text-center w-[10%]">
                {variant === 'orcamento' ? 'Quant' : 'Qtd'}
              </th>
              <th className="p-2 text-right w-[20%]">
                {variant === 'orcamento' ? 'Valor Total' : 'Valor'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-100 text-gray-700 bg-white">
            {items.map(item => (
              <tr key={item.id} className="group hover:bg-blue-50 transition-colors">
                <td className="p-2 border-r border-blue-100 align-middle">
                  <input
                    type="text"
                    value={item.service || ''}
                    onChange={(e) => onUpdateItem(item.id, 'service', e.target.value)}
                    className="w-full bg-transparent border-none p-0 font-bold uppercase placeholder-blue-300"
                    style={{ color: primaryColor }}
                    placeholder="SERVIÇO..."
                  />
                </td>
                <td className="p-2 border-r border-blue-100 align-middle">
                  <textarea
                    value={item.description || ''}
                    onChange={(e) => onUpdateItem(item.id, 'description', e.target.value)}
                    rows="1"
                    className="w-full bg-transparent border-none p-0 text-gray-600 resize-none placeholder-gray-400 italic leading-tight"
                    placeholder="Descrição técnica..."
                  />
                </td>
                <td className="p-2 border-r border-blue-100 align-middle text-center">
                  <input
                    type="number"
                    min="0"
                    value={item.quantity === '' ? '' : item.quantity}
                    onChange={(e) => onUpdateItem(item.id, 'quantity', e.target.value)}
                    className="w-full text-center bg-transparent border-none p-0 font-bold text-gray-600"
                  />
                </td>
                <td className="p-2 align-middle text-right font-bold text-gray-800 relative bg-blue-50/30 print-bg-row-val">
                  <div className="flex justify-end items-center gap-1">
                    <span className="text-[8px] text-gray-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={item.value || 0}
                      onChange={(e) => onUpdateItem(item.id, 'value', e.target.value)}
                      className="w-20 text-right bg-transparent border-none p-0"
                    />
                  </div>
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="absolute left-1 top-1/2 -translate-y-1/2 text-red-300 opacity-0 group-hover:opacity-100 print:hidden transition-all hover:text-red-500"
                  >
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Botao Add inline */}
        <div className="mt-2 print:hidden">
          <button
            onClick={onAddItem}
            className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold py-1 px-3 rounded border border-blue-200 hover:bg-blue-50 transition-colors"
          >
            <Plus size={12} /> Adicionar Serviço
          </button>
        </div>
      </section>

      {/* BARRA DE TOTAL */}
      <section className="text-white py-3 px-5 rounded-lg flex justify-between items-center shadow-md mb-6 print-bg-header" style={{ backgroundColor: primaryColor }}>
        <div className="flex items-center gap-2 opacity-90">
          <div className="bg-white/10 p-1.5 rounded border border-white/20"><Hash size={16} /></div>
          <span className="text-[10px] font-bold uppercase tracking-widest">{totalLabel}</span>
        </div>
        <div className="text-3xl font-black italic tracking-tight">{formatCurrency(total)}</div>
      </section>
    </>
  );
}
