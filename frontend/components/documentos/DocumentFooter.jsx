import React from 'react';
import { empresa } from '../../data/empresa';

/**
 * Rodape compartilhado do documento A4
 * Dados da empresa + Alvara + Licenca + RT + CRQ
 *
 * @param {Object} props
 * @param {'laudo'|'recibo'|'orcamento'} props.variant - Estilo do rodape
 */
export default function DocumentFooter({ variant = 'recibo' }) {
  if (variant === 'laudo') {
    return (
      <footer className="mt-auto text-center pt-4 border-t border-blue-200">
        <p className="text-[9px] text-gray-300 font-bold italic uppercase tracking-widest">
          DEDETIZADORA BORGES &bull; CNPJ: {empresa.cnpj}
        </p>
      </footer>
    );
  }

  return (
    <div className="print-avoid-break">
      {/* INFO DA EMPRESA */}
      <div className="text-center mb-8">
        <h3 className="text-blue-900 font-black uppercase text-sm">{empresa.razao}</h3>
        <p className="text-blue-900 font-bold text-[10px]">{empresa.nome} | CNPJ: {empresa.cnpj}</p>
        <p className="text-gray-500 italic text-[9px] mt-1">{empresa.endereco}</p>
        <p className="text-blue-900 font-bold text-[9px]">{empresa.email}</p>

        <div className="mt-4 bg-blue-50/50 border border-blue-100 rounded-xl p-3 inline-block print-bg-light-blue">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-left">
            <p className="text-[9px] text-gray-600">Alvará Sanitário: <span className="font-bold text-blue-900">{empresa.alvara}</span></p>
            <p className="text-[9px] text-gray-600">Licença Ambiental: <span className="font-bold text-blue-900">{empresa.licenca}</span></p>
            <p className="text-[9px] text-gray-600">Responsável Técnico: <span className="font-bold text-blue-900">{empresa.rt}</span></p>
            <p className="text-[9px] text-gray-600">CRQ / ART: <span className="font-bold text-blue-900">{empresa.crq}</span></p>
          </div>
        </div>
      </div>

      {/* RODAPE FIXO */}
      <div className="absolute bottom-4 left-0 w-full text-center">
        <p className="text-[9px] text-gray-300 font-bold italic uppercase tracking-widest">
          DEDETIZADORA BORGES &bull; CNPJ: {empresa.cnpj}
        </p>
      </div>
    </div>
  );
}
