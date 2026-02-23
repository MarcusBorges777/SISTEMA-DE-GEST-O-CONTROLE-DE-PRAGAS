import React, { useState, useRef } from 'react';
import { Trash2, Plus, Printer, Image as ImageIcon, Globe, Mail, Phone, User, MapPin, Briefcase, Hash } from 'lucide-react';
const ReceiptApp = () => {
  // --- DADOS DO RECIBO ---
  const [receiptNumber, setReceiptNumber] = useState('00001');
  const [date, setDate] = useState(new Date().toLocaleDateString('pt-BR'));

  // --- DADOS DO PAGADOR (CLIENTE) ---
  const [clientData, setClientData] = useState({
    nome: '',
    fantasia: '',
    cnpj: '',
    endereco: '',
    atividade: ''
  });
  // --- DADOS DA EMPRESA (RECEBEDOR) ---
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

  // --- ITENS E TEXTOS ---
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro, Pix, Cartão de credito (contém juros)');
  const [terms, setTerms] = useState('garantia meses...');

  // Inicialização dos serviços pagos
  const [items, setItems] = useState([
    { id: 1, service: 'Dedetização', description: 'Serviço realizado conforme contratado', quantity: 1, value: 777 },
  ]);
  const fileInputLogo = useRef(null);

  // Cálculo do total
  const total = items.reduce((acc, item) => {
    const qty = item.quantity === '' ? 0 : parseFloat(item.quantity);
    const val = parseFloat(item.value) || 0;
    return acc + (val * (isNaN(qty) ? 0 : qty));
  }, 0);
  const updateItem = (id, field, value) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  const handleClientChange = (field, value) => {
    setClientData(prev => ({ ...prev, [field]: value }));
  };
  const addItem = () => {
    const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
    setItems([...items, { id: newId, service: '', description: '', quantity: 1, value: 0 }]);
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

      {/* BARRA DE FERRAMENTAS (NÃO SAI NA IMPRESSÃO) */}
      <div className="mb-8 flex flex-wrap justify-between items-center gap-4 print:hidden w-full max-w-[210mm] bg-white p-5 rounded-2xl shadow-lg border border-slate-200">
        <div className="flex gap-3 flex-wrap">
          <button onClick={() => fileInputLogo.current.click()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-all font-bold text-sm shadow-sm">
            <ImageIcon size={18} /> Logo
          </button>
        </div>
        <div className="flex gap-3 ml-auto">
          <button onClick={addItem} className="flex items-center gap-2 bg-emerald-500 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-all font-bold text-sm shadow-sm">
            <Plus size={18} /> Add Item
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-900 text-white px-8 py-2.5 rounded-xl hover:bg-black transition-all font-bold text-sm shadow-xl ring-2 ring-slate-900 ring-offset-2">
            <Printer size={18} /> Imprimir / Salvar PDF
          </button>
        </div>

        <input type="file" ref={fileInputLogo} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setLogo)} />
      </div>
      {/* DOCUMENTO A4 */}
      <div id="a4-document" className="bg-white w-[210mm] min-h-[296mm] shadow-[0_0_60px_rgba(0,0,0,0.1)] relative overflow-hidden flex flex-col p-[12mm] text-slate-800 print:shadow-none print:m-0 print:p-[10mm]">

        {/* --- CABEÇALHO UNIFORME --- */}
        <header className="flex justify-between items-start mb-6 relative z-50 h-24 print-color-exact">
          <div className="flex items-center h-full">
            {/* Logo Area */}
            <div
              onClick={() => fileInputLogo.current.click()}
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
             {/* LISTA DE CONTATOS UNIFORME */}

             {/* WhatsApp */}
             <div className="flex items-center justify-end gap-2 text-slate-600">
                <span className="text-[10px] font-bold tracking-tight">{empresa.whatsapp}</span>
                <div className="w-5 h-5 flex items-center justify-center bg-[#254191] rounded-full text-white shadow-sm print-bg-blue">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </div>
             </div>
             {/* Telefone Fixo */}
             <div className="flex items-center justify-end gap-2 text-slate-600">
                <span className="text-[10px] font-bold tracking-tight">{empresa.fixo}</span>
                <div className="w-5 h-5 flex items-center justify-center bg-[#254191] rounded-full text-white shadow-sm print-bg-blue">
                    <Phone size={12} />
                </div>
             </div>
             {/* Site */}
             <div className="flex items-center justify-end gap-2 text-slate-600">
                <span className="text-[10px] font-bold tracking-tight">{empresa.site}</span>
                <div className="w-5 h-5 flex items-center justify-center bg-[#254191] rounded-full text-white shadow-sm print-bg-blue">
                    <Globe size={12} />
                </div>
             </div>
             {/* Email */}
             <div className="flex items-center justify-end gap-2 text-slate-600">
                <span className="text-[10px] font-bold tracking-tight">{empresa.email}</span>
                <div className="w-5 h-5 flex items-center justify-center bg-[#254191] rounded-full text-white shadow-sm print-bg-blue">
                    <Mail size={12} />
                </div>
             </div>
          </div>
        </header>
        <div className="w-full h-0.5 bg-[#1e3a8a] mb-5 relative z-10 print-bg-blue-line"></div>
        {/* --- TÍTULO DO RECIBO --- */}
        <div className="flex justify-between items-end mb-5 relative z-10 print-color-exact">
          <div>
            <h2 className="text-3xl font-black text-[#1e3a8a] uppercase leading-none tracking-tight">
              RECIBO
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase mt-1 tracking-widest pl-1">COMPROVANTE DE PRESTAÇÃO DE SERVIÇOS</p>
          </div>

          {/* Seção Data e Número */}
          <div className="text-right border-l-4 border-[#254191] pl-3 print-border-blue">
             <div className="flex items-center gap-1 justify-end text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                Nº <input
                  type="text"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
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
        {/* --- DADOS DO PAGADOR --- */}
        <section className="bg-blue-50/20 p-3 rounded-xl border border-blue-100 w-full shadow-sm mb-5 relative z-10 print-bg-light-blue print-border-light-blue">
          <h3 className="flex items-center gap-2 text-[#1e3a8a] font-bold uppercase text-[10px] mb-2 border-b border-blue-200 pb-1">
            <User size={14} /> Cliente / Contratante
          </h3>
          <div className="text-[10px] space-y-1 text-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              <div className="space-y-2">
                <div className="flex flex-col border-b border-blue-200 pb-1">
                    <label className="font-bold uppercase text-[8px] tracking-tight text-[#1e3a8a]">Razão Social / Nome:</label>
                    <input
                    type="text"
                    value={clientData.nome}
                    onChange={(e) => handleClientChange('nome', e.target.value)}
                    className="font-black text-[#1e3a8a] uppercase text-sm leading-tight w-full bg-transparent border-none p-0 focus:ring-0 placeholder-blue-300"
                    placeholder="NOME DO CLIENTE"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="border-b border-blue-200 pb-1">
                        <label className="font-bold uppercase text-[8px] tracking-tight text-[#1e3a8a] block">Nome Fantasia:</label>
                        <input type="text" value={clientData.fantasia} onChange={(e) => handleClientChange('fantasia', e.target.value)} className="w-full bg-transparent border-none p-0 text-[10px] focus:ring-0 text-gray-600 italic" placeholder="..." />
                    </div>
                    <div className="border-b border-blue-200 pb-1">
                        <label className="font-bold uppercase text-[8px] tracking-tight text-[#1e3a8a] block">CNPJ / CPF:</label>
                        <input type="text" value={clientData.cnpj} onChange={(e) => handleClientChange('cnpj', e.target.value)} className="w-full bg-transparent border-none p-0 text-[10px] focus:ring-0 text-gray-600" placeholder="..." />
                    </div>
                </div>
              </div>

              <div className="space-y-2 md:border-l md:border-blue-200 md:pl-4">
                <div className="border-b border-blue-200 pb-1">
                    <label className="font-bold uppercase text-[8px] tracking-tighter text-[#1e3a8a] flex items-center gap-1"><MapPin size={10}/> Endereço:</label>
                    <input type="text" value={clientData.endereco} onChange={(e) => handleClientChange('endereco', e.target.value)} className="italic font-medium leading-tight w-full bg-transparent border-none p-0 text-[10px] focus:ring-0 text-gray-600" placeholder="Endereço completo..." />
                </div>
                 <div className="border-b border-blue-200 pb-1">
                    <label className="font-bold uppercase text-[8px] tracking-tighter text-[#1e3a8a] flex items-center gap-1"><Briefcase size={10}/> Atividade Econômica:</label>
                    <input type="text" value={clientData.atividade} onChange={(e) => handleClientChange('atividade', e.target.value)} className="italic font-medium leading-tight w-full bg-transparent border-none p-0 text-[10px] focus:ring-0 text-gray-600" placeholder="..." />
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* --- LISTA DE SERVIÇOS (TABELA) --- */}
        <section className="mb-6 relative z-10 flex-grow print-color-exact">
            <table className="w-full text-left border-collapse border border-blue-200 text-[10px] shadow-sm rounded-lg overflow-hidden">
                <thead className="bg-[#1e3a8a] text-white uppercase font-black text-[9px] print-bg-header">
                    <tr>
                        <th className="p-2 border-r border-blue-700 w-[30%]">Serviço Realizado</th>
                        <th className="p-2 border-r border-blue-700 w-[40%]">Detalhes / Procedimento</th>
                        <th className="p-2 border-r border-blue-700 text-center w-[10%]">Qtd</th>
                        <th className="p-2 text-right w-[20%]">Valor</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-blue-100 text-gray-700 bg-white">
                    {items.map((item) => (
                        <tr key={item.id} className="group hover:bg-blue-50 transition-colors">
                            <td className="p-2 border-r border-blue-100 align-middle">
                                <input
                                    type="text"
                                    value={item.service}
                                    onChange={(e) => updateItem(item.id, 'service', e.target.value)}
                                    className="w-full bg-transparent border-none p-0 font-bold text-[#1e3a8a] focus:ring-0 placeholder-blue-300 uppercase"
                                    placeholder="NOME DO SERVIÇO"
                                />
                            </td>
                            <td className="p-2 border-r border-blue-100 align-middle">
                                <textarea
                                    value={item.description}
                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                    rows="1"
                                    className="w-full bg-transparent border-none p-0 text-gray-600 resize-none focus:ring-0 placeholder-gray-400 italic leading-tight"
                                    placeholder="Descrição técnica..."
                                />
                            </td>
                            <td className="p-2 border-r border-blue-100 align-middle text-center">
                                <input
                                    type="number" min="1"
                                    value={item.quantity}
                                    onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                                    className="w-full text-center bg-transparent border-none p-0 font-bold text-gray-600 focus:ring-0"
                                />
                            </td>
                            <td className="p-2 align-middle text-right font-bold text-gray-800 relative bg-blue-50/30 print-bg-row-val">
                                <div className="flex justify-end items-center gap-1">
                                    <span className="text-[8px] text-gray-400">R$</span>
                                    <input
                                        type="number" step="0.01"
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
        {/* --- TOTAIS E RODAPÉ --- */}
        <div className="mt-auto relative z-10 print-avoid-break">
            {/* Valor Total - COR AZUL ESCURA */}
            <section className="bg-[#1e3a8a] text-white py-3 px-5 rounded-lg flex justify-between items-center shadow-md mb-6 print-bg-header print-color-exact">
                <div className="flex items-center gap-2 opacity-90">
                    <div className="bg-white/10 p-1.5 rounded border border-white/20"><Hash size={16} /></div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Valor Total</span>
                </div>
                <div className="text-3xl font-black italic tracking-tight">
                    {formatCurrency(total)}
                </div>
            </section>
            <div className="grid grid-cols-2 gap-8 mb-6 text-[10px]">
                <div>
                    <h4 className="font-bold text-[#1e3a8a] uppercase border-b border-blue-200 pb-1 mb-2 text-[9px]">Forma de Pagamento</h4>
                    <textarea
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full border-none p-0 text-gray-600 bg-transparent resize-none h-10 focus:ring-0 leading-snug font-medium"
                    />
                </div>
                <div>
                    <h4 className="font-bold text-[#1e3a8a] uppercase border-b border-blue-200 pb-1 mb-2 text-[9px]">Validade e Condições</h4>
                    <textarea
                        value={terms}
                        onChange={(e) => setTerms(e.target.value)}
                        className="w-full border-none p-0 text-gray-600 bg-transparent resize-none h-14 focus:ring-0 leading-tight italic"
                    />
                </div>
            </div>
            {/* INFO DA EMPRESA CENTRALIZADA - COM PROTEÇÃO DE QUEBRA */}
            <div className="text-center mb-8 print-avoid-break">
                <h3 className="text-[#1e3a8a] font-black uppercase text-sm">{empresa.razao}</h3>
                <p className="text-[#1e3a8a] font-bold text-[10px]">Dedetizadora Borges | CNPJ: {empresa.cnpj}</p>
                <p className="text-gray-500 italic text-[9px] mt-1">{empresa.endereco}</p>
                <p className="text-[#1e3a8a] font-bold text-[9px]">{empresa.email}</p>
                <div className="mt-4 bg-blue-50/50 border border-blue-100 rounded-xl p-3 inline-block print-bg-light-blue print-border-light-blue">
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
        <div className="absolute bottom-4 left-0 w-full text-center">
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
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
          }
          .print\\:hidden { display: none !important; }
          #a4-document {
              box-shadow: none !important;
              width: 210mm;
              height: 296mm;
              padding: 10mm;
              margin: 0;
              border-radius: 0;
              position: relative !important;
              page-break-after: avoid;
              page-break-inside: avoid;
          }
          /* Classes para evitar quebra de página */
          .print-avoid-break {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
          }

          /* Forçar cores de fundo na impressão */
          .print-bg-header { background-color: #1e3a8a !important; color: white !important; -webkit-print-color-adjust: exact; }
          .print-bg-blue { background-color: #254191 !important; color: white !important; -webkit-print-color-adjust: exact; }
          .print-bg-blue-line { background-color: #1e3a8a !important; height: 2px !important; -webkit-print-color-adjust: exact; }
          .print-border-blue { border-left-color: #254191 !important; -webkit-print-color-adjust: exact; }
          .print-bg-light-blue { background-color: #eff6ff !important; -webkit-print-color-adjust: exact; }
          .print-border-light-blue { border-color: #dbeafe !important; -webkit-print-color-adjust: exact; }
          .print-bg-row-val { background-color: #eff6ff !important; -webkit-print-color-adjust: exact; }
        }
        .no-spinner::-webkit-inner-spin-button, .no-spinner::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        textarea { overflow: hidden; }
      `}} />
    </div>
  );
};
export default ReceiptApp;
