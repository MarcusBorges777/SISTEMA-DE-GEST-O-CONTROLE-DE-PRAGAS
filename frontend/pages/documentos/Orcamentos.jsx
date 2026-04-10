import React, { useState, useRef, useEffect } from 'react';
import { Plus, Image as ImageIcon, Shield, Hash, Trash2, ClipboardCheck, Calendar } from 'lucide-react';
import { empresa } from '../../data/empresa';
import DocumentHeader from '../../components/documentos/DocumentHeader';
import DocumentFooter from '../../components/documentos/DocumentFooter';
import EditorPanel from '../../components/documentos/EditorPanel';
import ClienteSection from '../../components/documentos/ClienteSection';
import HolidayAlert from '../../components/documentos/HolidayAlert';
import ServiceTable from '../../components/documentos/ServiceTable';

export default function Orcamentos({ feriados = [] }) {
  const [quoteNumber, setQuoteNumber] = useState('00001');
  const [date, setDate] = useState(new Date().toLocaleDateString('pt-BR'));
  const [dateIso, setDateIso] = useState(new Date().toISOString().split('T')[0]);
  const [feriadoAtual, setFeriadoAtual] = useState(null);

  const [clientData, setClientData] = useState({
    nome: '', fantasia: '', cnpj: '', endereco: '', atividade: ''
  });

  const [logo, setLogo] = useState(null);
  const fileInputLogo = useRef(null);

  // Auto-load logo do servidor
  useEffect(() => {
    fetch('/api/config/logo-mascote', { credentials: 'same-origin' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.logo && !logo) setLogo(data.logo); })
      .catch(() => {});
  }, []);

  const [paymentMethod, setPaymentMethod] = useState('Dinheiro, Pix, Cartão de credito (contém juros)');
  const [terms, setTerms] = useState('Este orçamento é válido por 15 dias.');
  const [items, setItems] = useState([
    { id: 1, service: 'Dedetização', description: 'Aplicação de gel e pulverização líquida', quantity: 1, value: 777 },
    { id: 2, service: '', description: '', quantity: '', value: 777 },
    { id: 3, service: '', description: '', quantity: '', value: 777 },
    { id: 4, service: '', description: '', quantity: '', value: 777 },
  ]);

  const total = items.reduce((acc, item) => {
    const qty = item.quantity === '' ? 0 : parseFloat(item.quantity) || 0;
    const val = parseFloat(item.value) || 0;
    return acc + (val * qty);
  }, 0);

  // Verificar feriado
  useEffect(() => {
    if (dateIso && feriados.length > 0) {
      setFeriadoAtual(feriados.find(f => f.date === dateIso) || null);
    }
  }, [dateIso, feriados]);

  const handleClientChange = (field, value) => {
    setClientData(prev => ({ ...prev, [field]: value }));
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      if (field === 'quantity') return { ...item, [field]: value === '' ? '' : (parseFloat(value) || 0) };
      if (field === 'value') return { ...item, [field]: parseFloat(value) || 0 };
      return { ...item, [field]: value };
    }));
  };

  const addItem = () => {
    const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
    setItems([...items, { id: newId, service: '', description: '', quantity: '', value: 0 }]);
  };

  const removeItem = (id) => setItems(items.filter(item => item.id !== id));

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogo(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleDateChange = (value) => {
    setDate(value);
    // Tentar converter para ISO
    const parts = value.split('/');
    if (parts.length === 3 && parts[2].length === 4) {
      setDateIso(`${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <HolidayAlert feriado={feriadoAtual} dataFormatada={date} />

      <input type="file" ref={fileInputLogo} className="hidden" accept="image/*" onChange={handleImageUpload} />

      <EditorPanel title="Editar Informações do Orçamento" actions={
        <>
          <button onClick={() => fileInputLogo.current.click()} className="flex items-center gap-2 bg-[#3b4b73] text-white px-5 py-2.5 rounded-lg hover:bg-[#2c3d69] transition-all font-bold text-sm shadow-sm">
            <ImageIcon size={18} /> Alterar Logo
          </button>
          <button onClick={addItem} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-700 transition-all font-bold text-sm shadow-sm">
            <Plus size={18} /> Adicionar Novo Serviço
          </button>
        </>
      }>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          {/* DADOS GERAIS */}
          <div>
            <h4 className="font-bold text-[13px] text-[#5c6a8a] uppercase tracking-widest border-b border-gray-300/80 pb-2 mb-5">Dados Gerais</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-bold text-[#3b4b73] mb-1.5">Nº Documento</label>
                <input type="text" value={quoteNumber} onChange={(e) => setQuoteNumber(e.target.value)}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-md text-sm focus:border-[#3b4b73] focus:ring-1 focus:ring-[#3b4b73] outline-none shadow-sm" />
              </div>
              <div className="relative">
                <label className="block text-[12px] font-bold text-[#3b4b73] mb-1.5">Data Emissão</label>
                <div className="relative">
                  <input type="text" value={date} onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-md text-sm focus:border-[#3b4b73] focus:ring-1 focus:ring-[#3b4b73] outline-none pr-10 shadow-sm" />
                  <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-800" />
                </div>
              </div>
            </div>
          </div>

          {/* DADOS DO CLIENTE */}
          <ClienteSection clientData={clientData} onChange={handleClientChange} mode="editor" />
        </div>
      </EditorPanel>

      {/* BOTAO FLUTUANTE */}
      <div className="fixed bottom-10 right-10 z-50 print:hidden">
        <button onClick={() => window.print()}
          className="bg-[#3a5082] hover:bg-[#2c3d69] text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 transition-all transform hover:scale-105 font-bold">
          <ClipboardCheck size={24} />
          <span className="tracking-tight uppercase text-[13px]">Imprimir Documento A4</span>
        </button>
      </div>

      {/* DOCUMENTO A4 */}
      <div id="a4-document" className="bg-white w-[210mm] min-h-[297mm] shadow-[0_0_60px_rgba(0,0,0,0.1)] relative overflow-hidden flex flex-col p-[15mm] text-slate-800 print:shadow-none print:m-0">
        <DocumentHeader logo={logo} onLogoClick={() => fileInputLogo.current.click()} variant="recibo" />
        <div className="w-full h-0.5 bg-[#254191] mb-8 relative z-10"></div>

        {/* TITULO */}
        <div className="flex justify-between items-end mb-10 relative z-10">
          <h2 className="text-2xl font-black text-[#254191] uppercase leading-none tracking-tight">ORÇAMENTO DE PRESTAÇÃO DE SERVIÇOS</h2>
          <div className="text-right border-l-4 border-[#254191] pl-3">
            <div className="flex items-center gap-1 justify-end text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              Nº <input type="text" value={quoteNumber} onChange={(e) => setQuoteNumber(e.target.value)}
                className="bg-transparent border-none text-right w-12 p-0 text-gray-500 font-bold" />
            </div>
            <div className="flex items-center gap-1 justify-end">
              <span className="text-[10px] font-bold text-[#254191]">DATA:</span>
              <input type="text" value={date} onChange={(e) => handleDateChange(e.target.value)}
                className="text-sm font-black text-gray-800 leading-tight text-right bg-transparent border-none p-0 w-24" />
            </div>
          </div>
        </div>

        {/* CLIENTE (inline no documento) */}
        <section className="bg-blue-50/30 p-3 rounded-lg border border-blue-100 w-full shadow-sm mb-10 relative z-10">
          <h3 className="flex items-center gap-2 text-[#254191] font-bold uppercase text-[9px] mb-2 border-b border-blue-200 pb-1 italic">
            <Shield size={12} /> Cliente / Contratante
          </h3>
          <div className="text-[10px] space-y-1 text-gray-700">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <input type="text" value={clientData.nome} onChange={(e) => handleClientChange('nome', e.target.value)}
                  className="font-black text-[#254191] uppercase text-xs leading-tight w-full bg-transparent border-none p-0 placeholder-blue-300" placeholder="NOME DO CLIENTE" />
                <div className="flex items-center gap-1">
                  <span className="font-bold uppercase text-[9px] tracking-tight text-blue-800 whitespace-nowrap">NOME FANTASIA:</span>
                  <input type="text" value={clientData.fantasia} onChange={(e) => handleClientChange('fantasia', e.target.value)}
                    className="w-full bg-transparent border-b border-blue-100 p-0 text-[10px]" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-bold uppercase text-[9px] tracking-tight text-blue-800 whitespace-nowrap">CNPJ:</span>
                  <input type="text" value={clientData.cnpj} onChange={(e) => handleClientChange('cnpj', e.target.value)}
                    className="w-full bg-transparent border-b border-blue-100 p-0 text-[10px]" />
                </div>
              </div>
              <div className="border-l border-blue-200 pl-4 space-y-2">
                <div>
                  <label className="font-bold uppercase text-[9px] tracking-tighter text-blue-800 block mb-0.5">Código / Atividade Econômica Principal:</label>
                  <input type="text" value={clientData.atividade} onChange={(e) => handleClientChange('atividade', e.target.value)}
                    className="italic font-medium leading-tight w-full bg-transparent border-b border-blue-100 p-0 text-[10px]" />
                </div>
                <div className="pt-1 border-t border-blue-200">
                  <div className="flex items-center gap-1">
                    <span className="font-bold uppercase text-[9px] tracking-tight text-blue-800 whitespace-nowrap">Endereço:</span>
                    <input type="text" value={clientData.endereco} onChange={(e) => handleClientChange('endereco', e.target.value)}
                      className="w-full bg-transparent border-b border-blue-100 p-0 text-[10px]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TABELA + TOTAL */}
        <ServiceTable items={items} onUpdateItem={updateItem} onRemoveItem={removeItem} onAddItem={addItem}
          total={total} totalLabel="Valor Total do Orçamento" variant="orcamento" />

        {/* PAGAMENTO + CONDICOES */}
        <div className="grid grid-cols-2 gap-8 mb-4 text-[10px]">
          <div>
            <h4 className="font-bold text-[#254191] uppercase border-b border-blue-100 pb-1 mb-2 text-[9px]">Forma de Pagamento</h4>
            <textarea value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border-none p-0 text-gray-600 bg-transparent resize-none h-10 leading-snug font-medium" />
          </div>
          <div>
            <h4 className="font-bold text-[#254191] uppercase border-b border-blue-100 pb-1 mb-2 text-[9px]">Validade e Condições</h4>
            <textarea value={terms} onChange={(e) => setTerms(e.target.value)}
              className="w-full border-none p-0 text-gray-600 bg-transparent resize-none h-10 leading-snug font-medium" />
          </div>
        </div>

        <DocumentFooter variant="orcamento" />
      </div>
    </div>
  );
}
