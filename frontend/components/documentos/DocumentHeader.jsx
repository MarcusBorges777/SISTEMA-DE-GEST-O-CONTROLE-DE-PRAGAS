import React from 'react';
import { Phone, Mail, Globe, Image as ImageIcon } from 'lucide-react';
import { empresa } from '../../data/empresa';

/**
 * Cabecalho compartilhado do documento A4
 * Usado em Laudos, Orcamentos e Recibos
 *
 * @param {Object} props
 * @param {string|null} props.logo - Base64 da imagem do logo
 * @param {Function} props.onLogoClick - Callback para upload de logo
 * @param {'laudo'|'recibo'|'orcamento'} props.variant - Estilo do cabecalho
 */
export default function DocumentHeader({ logo, onLogoClick, variant = 'recibo' }) {
  if (variant === 'laudo') {
    return (
      <header className="flex justify-between items-start mb-6 border-b-2 border-[#254191] pb-4">
        <div className="flex items-center gap-4">
          <div
            onClick={onLogoClick}
            className={`w-60 h-24 flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all group ${!logo ? 'border-2 border-dashed border-blue-200 bg-blue-50/30 print:hidden' : ''}`}
          >
            {logo ? (
              <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain" />
            ) : (
              <div className="text-center p-2 print:hidden">
                <ImageIcon size={24} className="mx-auto text-blue-400 mb-1" />
                <p className="text-[10px] font-bold text-blue-500 uppercase">Sua Logo</p>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 text-right space-y-1 pl-4">
          <h1 className="text-sm font-black text-[#254191] uppercase leading-none tracking-tight">{empresa.razao}</h1>
          <div className="text-[9px] text-gray-600 font-medium leading-tight space-y-0.5">
            <p className="font-bold text-gray-700">{empresa.nome} | CNPJ: {empresa.cnpj}</p>
            <p className="italic">{empresa.endereco}</p>
            <div className="flex justify-end gap-3 text-blue-700 font-bold pt-1">
              <span className="flex items-center gap-1"><Phone size={10} /> {empresa.contatos}</span>
              <span className="flex items-center gap-1"><Mail size={10} /> {empresa.email}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[8px] text-gray-500 pt-2 mt-1 border-t border-blue-200 justify-items-end">
              <p>Alvará Sanitário: <span className="text-[#254191] font-bold">{empresa.alvara}</span></p>
              <p>Licença Ambiental: <span className="text-[#254191] font-bold">{empresa.licenca}</span></p>
              <p>Responsável Técnico: <span className="text-[#254191] font-bold">{empresa.rt}</span></p>
              <p>CRQ / ART: <span className="text-[#254191] font-bold">{empresa.crq}</span></p>
            </div>
          </div>
        </div>
      </header>
    );
  }

  // Variante padrao (recibo / orcamento) - icones de contato verticais
  return (
    <header className="flex justify-between items-start mb-6 relative z-50 h-24">
      <div className="flex items-center h-full">
        <div
          onClick={onLogoClick}
          className={`w-60 h-24 flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all group ${!logo ? 'border-2 border-dashed border-blue-200 bg-blue-50/30 print:hidden' : ''}`}
        >
          {logo ? (
            <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="text-center p-2 print:hidden">
              <ImageIcon size={24} className="mx-auto text-blue-400 mb-1" />
              <p className="text-[10px] font-bold text-blue-500 uppercase">Sua Logo</p>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 text-right pl-4 flex flex-col justify-center h-full gap-1">
        <ContactRow icon={<WhatsAppIcon />} text={empresa.whatsapp} />
        <ContactRow icon={<Phone size={12} />} text={empresa.fixo} />
        <ContactRow icon={<Globe size={12} />} text={empresa.site} />
        <ContactRow icon={<Mail size={12} />} text={empresa.email} />
      </div>
    </header>
  );
}

function ContactRow({ icon, text }) {
  return (
    <div className="flex items-center justify-end gap-2 text-slate-600">
      <span className="text-[10px] font-bold tracking-tight">{text}</span>
      <div className="w-5 h-5 flex items-center justify-center bg-[#254191] rounded-full text-white shadow-sm print-bg-blue">
        {icon}
      </div>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
