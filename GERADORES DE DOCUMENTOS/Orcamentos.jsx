import React, { useState, useRef } from 'react';
import { Trash2, Plus, Printer, Image as ImageIcon, X, Globe, Mail, Phone, Shield, User, MapPin, Briefcase, Hash } from 'lucide-react';
const App = () => {
  // --- DADOS DO ORÇAMENTO ---
  const [quoteNumber, setQuoteNumber] = useState('00001');
  const [date, setDate] = useState('31/01/2026');

  // --- DADOS DO CLIENTE ---
  const [clientData, setClientData] = useState({
    nome: 'Nome do Cliente',
    fantasia: '',
    cnpj: '',
    endereco: 'Endereço, numero - Cidade/MG',
    atividade: ''
  });
  // --- DADOS DA EMPRESA ---
  const empresa = {
    razao: "MARIA APARECIDA DE OLIVEIRA BORGES",
    nome: "Dedetizadora Borges",
    cnpj: "10.409.228/0001-93",
    endereco: "RUA YARA, 701 – B. CENTRO IND CEL JOVELINO RABELO DIVINÓPOLIS/ MG – CEP 35502-289",
    whatsapp: "(37) 99964-4205",
    fixo: "(37) 3214-7599",
    email: "dedetizadoraborges@yahoo.com.br",
    site: "dedetizadoraborges.com.br",
    alvara: "Nº 164/2025 (Venc: 03/07/2028)",
    licenca: "Dispensa Protocolo: 59009480/2019",
    rt: "Maria Aparecida de Oliveira Borges",
    crq: "02404889 | ART 9.353"
  };

  // --- ESTADOS DAS IMAGENS ---
  const [logo, setLogo] = useState(null);

  // --- CONFIGURAÇÕES FIXAS DAS IMAGENS ---
  const logoConfig = { height: 160, x: 10, y: 15 };

  // --- ITENS E TEXTOS ---
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro, Pix, Cartão de credito (contém juros)');
  const [terms, setTerms] = useState('Este orçamento é válido por 15 dias.');

  // Inicialização dos itens
  const [items, setItems] = useState([
    { id: 1, service: 'Dedetização', description: 'Aplicação de gel e pulverização líquida', quantity: 1, value: 777 },
    { id: 2, service: '', description: '', quantity: '', value: 777 },
    { id: 3, service: '', description: '', quantity: '', value: 777 },
    { id: 4, service: '', description: '', quantity: '', value: 777 },
  ]);
  const fileInputLogo = useRef(null);

  // Cálculo do total: Se quantidade for vazia, considera 0 para o cálculo (não soma)
  const total = items.reduce((acc, item) => {
    // Se estiver vazio, usa 0. Se for número, usa o número.
    const qty = item.quantity === '' ? 0 : parseFloat(item.quantity);
    const val = parseFloat(item.value) || 0;
    // Se qty for NaN ou 0, multiplica por 0.
    const lineTotal = val * (isNaN(qty) ? 0 : qty);
    return acc + lineTotal;
  }, 0);
  const updateItem = (id, field, value) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  const handleClientChange = (field, value) => {
    setClientData(prev => ({ ...prev, [field]: value }));
  };
  const addItem = () => {
    const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
    // Novo item começa com quantidade vazia
    setItems([...items, { id: newId, service: '', description: '', quantity: '', value: 0 }]);
  };
  const removeItem = (id) => setItems(items.filter(item => item.id !== id));
  const handleImageUpload = (e, setter) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result);
      reader.readAsDataURL(file);
    }
  };
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };
  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex flex-col items-center font-sans text-slate-900">

      {/* BARRA DE FERRAMENTAS */}
      <div className="mb-8 flex flex-wrap justify-between items-center gap-4 print:hidden w-full max-w-[210mm] bg-white p-5 rounded-2xl shadow-lg border border-slate-200">
        <div className="flex gap-3 flex-wrap">
          <button onClick={() => fileInputLogo.current.click()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-all font-bold text-sm">
            <ImageIcon size={18} /> Carregar Logo
          </button>
        </div>
        <div className="flex gap-3 ml-auto">
          <button onClick={addItem} className="flex items-center gap-2 bg-emerald-500 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-all font-bold text-sm">
            <Plus size={18} /> Add Serviço
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-900 text-white px-8 py-2.5 rounded-xl hover:bg-black transition-all font-bold text-sm shadow-xl">
            <Printer size={18} /> Imprimir PDF
          </button>
        </div>

        <input type="file" ref={fileInputLogo} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setLogo)} />
      </div>
      {/* DOCUMENTO A4 */}
      <div id="a4-document" className="bg-white w-[210mm] min-h-[297mm] shadow-[0_0_60px_rgba(0,0,0,0.1)] relative overflow-hidden flex flex-col p-[15mm] text-slate-800">

        {/* --- CABEÇALHO UNIFORME --- */}
        <header className="flex justify-between items-start mb-8 relative z-50 h-28">
          <div className="flex items-center h-full">
            {/* Logo Area */}
            <div
              onClick={() => fileInputLogo.current.click()}
              className={`w-64 h-28 flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all group ${!logo ? 'border-2 border-dashed border-blue-200 bg-blue-50/30 print:hidden' : ''}`}
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

          <div className="flex-1 text-right pl-4 flex flex-col justify-center h-full gap-1.5">
             {/* LISTA DE CONTATOS UNIFORME */}

             {/* WhatsApp */}
             <div className="flex items-center justify-end gap-2 text-slate-600">
                <span className="text-xs font-bold tracking-tight">{empresa.whatsapp}</span>
                <div className="w-5 h-5 flex items-center justify-center bg-[#254191] rounded-full text-white shadow-sm print:bg-[#254191] print:text-white">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </div>
             </div>
             {/* Telefone Fixo */}
             <div className="flex items-center justify-end gap-2 text-slate-600">
                <span className="text-xs font-bold tracking-tight">{empresa.fixo}</span>
                <div className="w-5 h-5 flex items-center justify-center bg-[#254191] rounded-full text-white shadow-sm print:bg-[#254191] print:text-white">
                    <Phone size={12} />
                </div>
             </div>
             {/* Site */}
             <div className="flex items-center justify-end gap-2 text-slate-600">
                <span className="text-xs font-bold tracking-tight">{empresa.site}</span>
                <div className="w-5 h-5 flex items-center justify-center bg-[#254191] rounded-full text-white shadow-sm print:bg-[#254191] print:text-white">
                    <Globe size={12} />
                </div>
             </div>
             {/* Email */}
             <div className="flex items-center justify-end gap-2 text-slate-600">
                <span className="text-xs font-bold tracking-tight">{empresa.email}</span>
                <div className="w-5 h-5 flex items-center justify-center bg-[#254191] rounded-full text-white shadow-sm print:bg-[#254191] print:text-white">
                    <Mail size={12} />
                </div>
             </div>
          </div>
        </header>
        {/* --- LINHA DIVISÓRIA --- */}
        <div className="w-full h-0.5 bg-[#254191] mb-8 relative z-10 print:bg-[#254191]"></div>
        {/* --- TÍTULO DO DOCUMENTO --- */}
        <div className="flex justify-between items-end mb-10 relative z-10">
          <div>
            <h2 className="text-2xl font-black text-[#254191] uppercase leading-none tracking-tight">
              ORÇAMENTO DE PRESTAÇÃO DE SERVIÇOS
            </h2>
          </div>
          <div className="text-right border-l-4 border-[#254191] pl-3 print:border-[#254191]">
             <div className="flex items-center gap-1 justify-end text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                Nº <input
                  type="text"
                  value={quoteNumber}
                  onChange={(e) => setQuoteNumber(e.target.value)}
                  className="bg-transparent border-none text-right w-12 p-0 focus:ring-0 text-gray-500 font-bold"
                />
             </div>
             <div className="flex items-center gap-1 justify-end">
                <span className="text-[10px] font-bold text-[#254191]">DATA:</span>
                <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="text-sm font-black text-gray-800 leading-tight text-right bg-transparent border-none p-0 w-24 focus:ring-0"
                />
             </div>
          </div>
        </div>
        {/* --- SEÇÃO CLIENTE --- */}
        <section className="bg-blue-50/30 p-3 rounded-lg border border-blue-100 w-full shadow-sm mb-10 relative z-10 print:bg-blue-50 print:border-blue-100">
          <h3 className="flex items-center gap-2 text-[#254191] font-bold uppercase text-[9px] mb-2 border-b border-blue-200 pb-1 italic print:border-blue-200">
            <User size={12} /> Cliente / Contratante
          </h3>
          <div className="text-[10px] space-y-1 text-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              <div className="space-y-1">
                <div className="flex flex-col">
                    <label className="font-bold uppercase text-[8px] tracking-tight text-blue-800">Razão Social / Nome:</label>
                    <input
                    type="text"
                    value={clientData.nome}
                    onChange={(e) => handleClientChange('nome', e.target.value)}
                    className="font-black text-[#254191] uppercase text-xs leading-tight w-full bg-transparent border-none p-0 focus:ring-0 placeholder-blue-300"
                    placeholder="DIGITE O NOME AQUI"
                    />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                        <label className="font-bold uppercase text-[8px] tracking-tight text-blue-800 block">Nome Fantasia:</label>
                        <input type="text" value={clientData.fantasia} onChange={(e) => handleClientChange('fantasia', e.target.value)} className="w-full bg-transparent border-b border-blue-100 p-0 text-[10px] focus:ring-0 italic" placeholder="..." />
                    </div>
                    <div>
                        <label className="font-bold uppercase text-[8px] tracking-tight text-blue-800 block">CNPJ / CPF:</label>
                        <input type="text" value={clientData.cnpj} onChange={(e) => handleClientChange('cnpj', e.target.value)} className="w-full bg-transparent border-b border-blue-100 p-0 text-[10px] focus:ring-0" placeholder="..." />
                    </div>
                </div>
              </div>

              <div className="md:border-l md:border-blue-200 md:pl-4 space-y-1 print:border-blue-200">
                <div>
                    <label className="font-bold uppercase text-[8px] tracking-tighter text-blue-800 flex items-center gap-1"><MapPin size={8}/> Endereço:</label>
                    <input type="text" value={clientData.endereco} onChange={(e) => handleClientChange('endereco', e.target.value)} className="italic font-medium leading-tight w-full bg-transparent border-b border-blue-100 p-0 text-[10px] focus:ring-0" />
                </div>
                <div className="pt-1">
                    <label className="font-bold uppercase text-[8px] tracking-tighter text-blue-800 flex items-center gap-1"><Briefcase size={8}/> Atividade Econômica:</label>
                    <input type="text" value={clientData.atividade} onChange={(e) => handleClientChange('atividade', e.target.value)} className="italic font-medium leading-tight w-full bg-transparent border-b border-blue-100 p-0 text-[10px] focus:ring-0" placeholder="..." />
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* --- TABELA DE SERVIÇOS --- */}
        <section className="mb-10 relative z-10">
            <table className="w-full text-left border-collapse border border-blue-200 text-[10px] shadow-sm rounded-lg overflow-hidden print:border-blue-200">
                <thead className="bg-[#254191] text-white uppercase font-black text-[9px] print:bg-[#254191] print:text-white">
                    <tr>
                        <th className="p-2 border-r border-blue-800 text-left w-[30%]">Serviço</th>
                        <th className="p-2 border-r border-blue-800 text-left w-[40%]">Descrição / Procedimento</th>
                        <th className="p-2 border-r border-blue-800 text-center w-[10%]">Quant</th>
                        <th className="p-2 text-right w-[20%]">Valor Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-blue-100 text-gray-700 bg-white print:divide-blue-100">
                    {items.map((item) => (
                        <tr key={item.id} className="group hover:bg-blue-50 transition-colors print:bg-white">
                            <td className="p-2 border-r border-blue-100 align-middle print:border-blue-100">
                                <input
                                    type="text"
                                    value={item.service}
                                    onChange={(e) => updateItem(item.id, 'service', e.target.value)}
                                    className="w-full bg-transparent border-none p-0 font-bold text-[#254191] focus:ring-0 placeholder-blue-300 uppercase"
                                    placeholder="SERVIÇO..."
                                />
                            </td>
                            <td className="p-2 border-r border-blue-100 align-middle print:border-blue-100">
                                <textarea
                                    value={item.description}
                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                    rows="1"
                                    className="w-full bg-transparent border-none p-0 text-gray-600 resize-none focus:ring-0 placeholder-gray-400 italic leading-tight"
                                    placeholder="Descrição técnica..."
                                />
                            </td>
                            <td className="p-2 border-r border-blue-100 align-middle text-center print:border-blue-100">
                                <input
                                    type="number"
                                    min="0"
                                    value={item.quantity}
                                    onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                                    className="w-full text-center bg-transparent border-none p-0 font-bold text-gray-600 focus:ring-0"
                                    placeholder=""
                                />
                            </td>
                            <td className="p-2 align-middle text-right font-bold text-gray-800 relative bg-blue-50/30 print:bg-blue-50">
                                <div className="flex justify-end items-center gap-1">
                                    <span className="text-[8px] text-gray-400">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={item.value}
                                        onChange={(e) => updateItem(item.id, 'value', e.target.value)}
                                        className="w-20 text-right bg-transparent border-none p-0 focus:ring-0"
                                    />
                                </div>
                                <button onClick={() => removeItem(item.id)} className="absolute left-1 top-1/2 -translate-y-1/2 text-red-300 opacity-0 group-hover:opacity-100 print:hidden transition-all hover:text-red-500"><Trash2 size={12} /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
        {/* --- RODAPÉ E TOTAIS --- */}
        <div className="mt-auto relative z-10">
            {/* Barra de Total */}
            <section className="bg-[#254191] text-white py-3 px-5 rounded-lg flex justify-between items-center shadow-md border-b-4 border-blue-900/50 mb-10 print:bg-[#254191] print:text-white print:border-blue-900">
                <div className="flex items-center gap-2 opacity-90">
                    <div className="bg-white/10 p-1.5 rounded border border-white/20">
                        <Hash size={16} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Valor Total do Orçamento</span>
                </div>
                <div className="text-2xl font-black italic tracking-tight">
                    {formatCurrency(total)}
                </div>
            </section>
            <div className="grid grid-cols-2 gap-8 mb-4 text-[10px]">
                <div>
                    <h4 className="font-bold text-[#254191] uppercase border-b border-blue-100 pb-1 mb-2 text-[9px] print:border-blue-100">Forma de Pagamento</h4>
                    <textarea
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full border-none p-0 text-gray-600 bg-transparent resize-none h-10 focus:ring-0 leading-snug font-medium"
                    />
                </div>
                <div>
                    <h4 className="font-bold text-[#254191] uppercase border-b border-blue-100 pb-1 mb-2 text-[9px] print:border-blue-100">Validade e Condições</h4>
                    <textarea
                        value={terms}
                        onChange={(e) => setTerms(e.target.value)}
                        className="w-full border-none p-0 text-gray-600 bg-transparent resize-none h-10 focus:ring-0 leading-snug font-medium"
                    />
                </div>
            </div>
            {/* INFO DA EMPRESA CENTRALIZADA (COM PROTEÇÃO CONTRA QUEBRA DE PÁGINA) */}
            <div className="text-center mb-10 print:mb-10 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                <h3 className="text-[#1e3a8a] font-black uppercase text-sm">{empresa.razao}</h3>
                <p className="text-[#1e3a8a] font-bold text-[10px]">Dedetizadora Borges | CNPJ: {empresa.cnpj}</p>
                <p className="text-gray-500 italic text-[9px] mt-1">{empresa.endereco}</p>
                <p className="text-[#1e3a8a] font-bold text-[9px] mt-1 mb-2">{empresa.email}</p>
                <div className="mt-2 bg-blue-50/50 border border-blue-100 rounded-xl p-3 inline-block print:bg-blue-50 print:border-blue-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-left">
                         <p className="text-[9px] text-gray-600">Alvará Sanitário: <span className="font-bold text-[#1e3a8a]">{empresa.alvara}</span></p>
                         <p className="text-[9px] text-gray-600">Licença Ambiental: <span className="font-bold text-[#1e3a8a]">{empresa.licenca}</span></p>
                         <p className="text-[9px] text-gray-600">Responsável Técnico: <span className="font-bold text-[#1e3a8a]">{empresa.rt}</span></p>
                         <p className="text-[9px] text-gray-600">CRQ / ART: <span className="font-bold text-[#1e3a8a]">{empresa.crq}</span></p>
                      </div>
                </div>
            </div>
        </div>
        {/* --- RODAPÉ MINIMALISTA (FIXO EM BAIXO) --- */}
        <div className="absolute bottom-6 left-0 w-full text-center print:bottom-6">
             <p className="text-[9px] text-gray-300 font-bold italic uppercase tracking-widest">
                DEDETIZADORA BORGES • CNPJ: 10.409.228/0001-93
             </p>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A4; margin: 0; }
        @media print {
          body {
            background: white !important;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .print\\:hidden { display: none !important; }
          #a4-document {
            box-shadow: none !important;
            width: 210mm;
            height: 297mm;
            padding: 15mm;
            margin: 0;
            border-radius: 0;
            overflow: hidden;
          }
          .print\\:border-blue-200 { border-color: #bfdbfe !important; }
          .print\\:bg-blue-50 { background-color: #eff6ff !important; }
          .print\\:bg-blue-50\\/30 { background-color: #eff6ff !important; }
          .break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
        .no-spinner::-webkit-inner-spin-button, .no-spinner::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        textarea { overflow: hidden; }
      `}} />
    </div>
  );
};
export default App;
