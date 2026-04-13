import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Plus, Printer, Image as ImageIcon, X, Globe, Mail, Phone, Shield, User, MapPin, Briefcase, Hash, Edit3, ChevronDown, ChevronUp, ClipboardCheck, Calendar, Minus, Save, Loader2 } from 'lucide-react';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { salvarDocumento } from '../../utils/salvarDocumento';
import ClienteBusca from '../../components/shared/ClienteBusca';

export default function Recibos() {
  // --- ESTADOS DO PAINEL DE EDIÇÃO ---
  const [showEditor, setShowEditor] = useState(true);

  // --- DADOS DO RECIBO ---
  const [quoteNumber, setQuoteNumber] = useState(() => {
    try {
      return localStorage.getItem('receiptNumber') || '00001';
    } catch (e) {
      return '00001';
    }
  });
  const [date, setDate] = useState(new Date().toLocaleDateString('pt-BR'));
  const [garantiaMeses, setGarantiaMeses] = useState('6');
  const [proximaManutencao, setProximaManutencao] = useState('31/07/2026');
  
  // --- DADOS DO CLIENTE ---
  const [clientData, setClientData] = useState({
    nome: 'COOPRAFAD - Cooperativa dos Produtores',
    fantasia: 'COOPRAFAD',
    cnpj: '21.378.985/0001-63',
    endereco: 'R. Adelino Gomes, Nº 525 - Divinópolis/MG',
    atividade: '47.24-5-00 - Comércio Varejista'
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
  
  // --- EMPRESA CONTEXT: auto-fill do cliente ---
  const { empresa: empresaCtx } = useEmpresa();
  useEffect(() => {
    if (!empresaCtx) return;
    setClientData({
      nome: empresaCtx.nome || empresaCtx.fantasia || '',
      fantasia: empresaCtx.fantasia || '',
      cnpj: empresaCtx.cnpj || '',
      endereco: empresaCtx.endereco || '',
      atividade: empresaCtx.atividade || '',
    });
  }, [empresaCtx]);

  // --- ESTADOS DAS IMAGENS ---
  const [logo, setLogo] = useState(null);

  // Auto-load logo do servidor
  useEffect(() => {
    fetch('/api/config/logo-mascote', { credentials: 'same-origin' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.logo) setLogo(data.logo); })
      .catch(() => {});
  }, []);

  // --- ITENS E TEXTOS ---
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro, Pix, Cartão de credito (contém juros)');
  
  // Inicialização dos itens (Apenas 1 linha)
  const [items, setItems] = useState([
    { id: 1, service: 'Dedetização', description: 'Aplicação de gel e pulverização líquida', quantity: 1, value: 777 }
  ]);

  // --- FUNÇÕES DE MANIPULAÇÃO DE NÚMERO E GARANTIA ---
  const incrementQuoteNumber = () => {
    setQuoteNumber(prev => {
      const num = parseInt(prev, 10);
      if (isNaN(num)) return prev;
      return String(num + 1).padStart(5, '0');
    });
  };

  const decrementQuoteNumber = () => {
    setQuoteNumber(prev => {
      const num = parseInt(prev, 10);
      if (isNaN(num) || num <= 1) return prev;
      return String(num - 1).padStart(5, '0');
    });
  };

  const incrementGarantia = () => {
    setGarantiaMeses(prev => {
      const num = parseInt(prev, 10);
      if (isNaN(num)) return '1';
      return String(num + 1);
    });
  };

  const decrementGarantia = () => {
    setGarantiaMeses(prev => {
      const num = parseInt(prev, 10);
      if (isNaN(num) || num <= 0) return '0';
      return String(num - 1);
    });
  };

  // --- EFEITOS (ATUALIZAÇÃO AUTOMÁTICA) ---
  useEffect(() => {
    try {
      localStorage.setItem('receiptNumber', quoteNumber);
    } catch (e) {
      console.warn('Armazenamento local indisponível neste ambiente.');
    }
  }, [quoteNumber]);

  useEffect(() => {
    const handleAfterPrint = () => {
      setQuoteNumber((prev) => {
        const num = parseInt(prev, 10);
        if (isNaN(num)) return prev;
        return String(num + 1).padStart(5, '0');
      });
    };
    
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  // --- FUNÇÃO PARA AUTO-REDIMENSIONAR TEXTAREAS ---
  const handleAutoResize = (e) => {
    e.target.style.height = '20px';
    e.target.style.height = `${Math.max(20, e.target.scrollHeight)}px`;
  };

  const initResize = (el) => {
    if (el) {
      el.style.height = '20px';
      el.style.height = `${Math.max(20, el.scrollHeight)}px`;
    }
  };

  // --- SUGESTÕES DE AUTOCOMPLETAR ---
  const sugestoesServicos = [
    "Dedetização (Insetos rasteiros e voadores)",
    "Desratização (Controle de roedores)",
    "Descupinização (Tratamento contra cupins)",
    "Sanitização de Ambientes (Vírus e Bactérias)",
    "Desinsetização (Mosquitos e pernilongos)",
    "Limpeza e Higienização de Caixa D'água",
    "Controle Integrado de Pragas (CIP)",
    "Manejo de Pombos e Morcegos (Barreiras Físicas)",
    "Controle de Aracnídeos (Aranhas e Escorpiões)",
    "Tratamento Fitossanitário",
    "Expurgo / Fumigação"
  ];

  const sugestoesDescricoes = [
    "Aplicação de gel inseticida e pulverização líquida focal em frestas e rodapés.",
    "Instalação de porta-iscas (PIP), mapeamento e monitoramento de roedores.",
    "Tratamento em madeiramento através de injeção e pincelamento de calda cupinicida.",
    "Barreira química no perímetro externo e solo para controle de cupins subterrâneos.",
    "Termonebulização (Fumacê) espacial para controle de insetos voadores.",
    "Pulverização espacial e residual focada no controle de aracnídeos e escorpiões.",
    "Sanitização por nebulização a frio com quaternário de amônio de 5ª geração.",
    "Esvaziamento, escovação mecânica, desinfecção química e emissão de laudo técnico.",
    "Instalação de barreiras físicas (telas, passarinheiras, espículas) para repelência de aves.",
    "Serviço preventivo e corretivo realizado nas áreas comuns e lixeiras.",
    "Inspeção técnica, identificação de focos e aplicação de iscas granuladas."
  ];

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

  const [salvandoPdf, setSalvandoPdf] = useState(false);

  const handleSalvarPdf = async () => {
    setSalvandoPdf(true);
    try {
      const nomeEmpresa = clientData.nome || clientData.fantasia || 'Empresa';
      const result = await salvarDocumento({
        elementId: 'a4-document',
        tipo: 'recibo',
        numeroDoc: quoteNumber || '00001',
        nomeEmpresa,
      });
      if (result.sucesso) alert(`PDF salvo: ${result.nomeArquivo}`);
      else alert(`Erro ao salvar: ${result.erro}`);
    } finally {
      setSalvandoPdf(false);
    }
  };

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex flex-col items-center font-sans text-slate-900 print:p-0 print:bg-white print:block">
      
      {/* BOTÃO FLUTUANTE DE IMPRESSÃO + SALVAR */}
      <div className="fixed bottom-6 right-6 z-50 print:hidden flex flex-col gap-3 items-end">
        <button
          onClick={handleSalvarPdf}
          disabled={salvandoPdf}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 transition-all transform hover:scale-105 font-bold disabled:opacity-60"
        >
          {salvandoPdf ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          <span className="tracking-tight uppercase text-xs">Salvar PDF</span>
        </button>
        <button
         onClick={handlePrint}
         className="bg-[#254191] hover:bg-blue-800 text-white p-4 rounded-full shadow-2xl flex items-center gap-3 transition-all transform hover:scale-105 font-bold"
        >
          <ClipboardCheck size={24} />
          <span className="pr-2 tracking-tight uppercase text-xs">Imprimir Documento A4</span>
        </button>
      </div>

      <input type="file" ref={fileInputLogo} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setLogo)} />

      {/* PAINEL "EDITAR INFORMAÇÕES DO DOCUMENTO" */}
      <div className="bg-[#f4f5f8] p-6 md:p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] w-full max-w-[210mm] border border-gray-200/60 mb-8 print:hidden">
        
        {/* Cabeçalho do Painel */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 cursor-pointer" onClick={() => setShowEditor(!showEditor)}>
          <h3 className="font-extrabold text-lg text-[#324577] flex items-center gap-2">
            <Edit3 size={20} className="text-[#324577]" /> Editar Informações do Documento
          </h3>
          <button className="text-gray-500 hover:text-[#254191] transition-colors bg-gray-200/80 p-1.5 rounded-full">
            {showEditor ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
        
        {/* Conteúdo do Painel */}
        {showEditor && (
          <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
             
             {/* BLOCO DE DADOS GERAIS E CLIENTE */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                 
                 {/* COLUNA 1: DADOS GERAIS */}
                 <div className="space-y-4">
                     <h4 className="font-bold text-[11px] text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-2">Dados Gerais</h4>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="block text-xs font-bold text-gray-600 mb-1.5">Nº Documento</label>
                             <div className="flex gap-2">
                                 <input 
                                     type="text" 
                                     value={quoteNumber} 
                                     onChange={(e) => setQuoteNumber(e.target.value)} 
                                     className="w-full p-2.5 text-center bg-white border border-gray-200 rounded-md text-sm font-semibold text-blue-700 focus:border-[#324577]/40 focus:ring-2 focus:ring-[#324577]/10 outline-none transition-all shadow-sm" 
                                 />
                                 <button onClick={decrementQuoteNumber} className="flex items-center justify-center bg-red-50 hover:bg-red-100 border border-red-200 rounded-md w-11 shrink-0 text-red-500 transition-colors shadow-sm">
                                     <Minus size={16} />
                                 </button>
                                 <button onClick={incrementQuoteNumber} className="flex items-center justify-center bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md w-11 shrink-0 text-blue-500 transition-colors shadow-sm">
                                     <Plus size={16} />
                                 </button>
                             </div>
                             <p className="text-[10px] text-gray-400 italic mt-1.5">* Salva automaticamente ao imprimir.</p>
                         </div>
                         <div className="relative">
                             <label className="block text-[12px] font-bold text-[#3b4b73] mb-1.5">Data Execução</label>
                             <div className="relative">
                               <input type="text" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-md text-sm text-gray-800 focus:border-[#3b4b73] focus:ring-1 focus:ring-[#3b4b73] outline-none transition-all pr-10 shadow-sm" />
                               <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-800" />
                             </div>
                         </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="block text-[12px] font-bold text-[#3b4b73] mb-1.5">Garantia Pragas (Meses)</label>
                             <div className="flex gap-2">
                                 <input 
                                     type="text" 
                                     value={garantiaMeses} 
                                     onChange={(e) => setGarantiaMeses(e.target.value)} 
                                     className="w-full p-2.5 text-center bg-white border border-gray-200 rounded-md text-sm font-semibold text-blue-700 focus:border-[#324577]/40 focus:ring-2 focus:ring-[#324577]/10 outline-none transition-all shadow-sm" 
                                 />
                                 <button onClick={decrementGarantia} className="flex items-center justify-center bg-red-50 hover:bg-red-100 border border-red-200 rounded-md w-11 shrink-0 text-red-500 transition-colors shadow-sm">
                                     <Minus size={16} />
                                 </button>
                                 <button onClick={incrementGarantia} className="flex items-center justify-center bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md w-11 shrink-0 text-blue-500 transition-colors shadow-sm">
                                     <Plus size={16} />
                                 </button>
                             </div>
                         </div>
                         <div>
                             <label className="block text-[12px] font-bold text-[#3b4b73] mb-1.5">Próxima Manutenção</label>
                             <input type="text" value={proximaManutencao} onChange={(e) => setProximaManutencao(e.target.value)} className="w-full p-2.5 bg-[#e9ecef] border border-gray-200 rounded-md text-sm text-gray-600 outline-none shadow-inner" />
                         </div>
                     </div>
                 </div>

                 {/* COLUNA 2: DADOS DO CLIENTE */}
                 <div className="space-y-4">
                     <h4 className="font-bold text-[11px] text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-2">Dados do Cliente</h4>
                     <ClienteBusca
                       placeholder="Importar cliente cadastrado..."
                       onSelect={(c) => setClientData(prev => ({
                         ...prev,
                         nome: c.razao_social || c.nome_fantasia || '',
                         fantasia: c.nome_fantasia || '',
                         cnpj: c.cnpj || '',
                         endereco: c.endereco_completo || [c.rua, c.numero, c.bairro, c.cidade, c.uf].filter(Boolean).join(', '),
                         atividade: c.cnae || '',
                       }))}
                     />
                     <div>
                         <label className="block text-xs font-bold text-gray-600 mb-1.5">Razão Social / Nome</label>
                         <input type="text" value={clientData.nome} onChange={(e) => handleClientChange('nome', e.target.value)} className="w-full p-2.5 bg-gray-200/60 border border-gray-300/50 rounded-md text-sm font-semibold text-gray-800 focus:bg-white focus:border-[#324577]/40 focus:ring-2 focus:ring-[#324577]/10 outline-none transition-all" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="block text-xs font-bold text-gray-600 mb-1.5">Nome Fantasia</label>
                             <input type="text" value={clientData.fantasia} onChange={(e) => handleClientChange('fantasia', e.target.value)} className="w-full p-2.5 bg-gray-200/60 border border-gray-300/50 rounded-md text-sm font-semibold text-gray-800 focus:bg-white focus:border-[#324577]/40 focus:ring-2 focus:ring-[#324577]/10 outline-none transition-all" />
                         </div>
                         <div>
                             <label className="block text-xs font-bold text-gray-600 mb-1.5">CNPJ / CPF</label>
                             <input type="text" value={clientData.cnpj} onChange={(e) => handleClientChange('cnpj', e.target.value)} className="w-full p-2.5 bg-gray-200/60 border border-gray-300/50 rounded-md text-sm font-semibold text-gray-800 focus:bg-white focus:border-[#324577]/40 focus:ring-2 focus:ring-[#324577]/10 outline-none transition-all" />
                         </div>
                     </div>
                     <div className="grid grid-cols-1 gap-4">
                         <div>
                             <label className="block text-xs font-bold text-gray-600 mb-1.5">Atividade Econômica</label>
                             <input type="text" value={clientData.atividade} onChange={(e) => handleClientChange('atividade', e.target.value)} className="w-full p-2.5 bg-gray-200/60 border border-gray-300/50 rounded-md text-sm font-semibold text-gray-800 focus:bg-white focus:border-[#324577]/40 focus:ring-2 focus:ring-[#324577]/10 outline-none transition-all" />
                         </div>
                         <div>
                             <label className="block text-xs font-bold text-gray-600 mb-1.5">Endereço Completo</label>
                             <input type="text" value={clientData.endereco} onChange={(e) => handleClientChange('endereco', e.target.value)} className="w-full p-2.5 bg-gray-200/60 border border-gray-300/50 rounded-md text-sm font-semibold text-gray-800 focus:bg-white focus:border-[#324577]/40 focus:ring-2 focus:ring-[#324577]/10 outline-none transition-all" />
                         </div>
                     </div>
                 </div>

             </div>

             {/* AÇÕES DO ORÇAMENTO */}
             <div className="mt-8 pt-6 border-t border-gray-200 flex gap-4 flex-wrap items-center">
                <button onClick={() => fileInputLogo.current.click()} className="flex items-center justify-center gap-2 bg-white text-[#324577] border border-[#324577]/20 px-5 py-2.5 rounded-lg hover:bg-[#324577]/5 transition-all font-bold text-sm shadow-sm flex-1 sm:flex-none">
                  <ImageIcon size={18} /> Alterar Logo
                </button>
                <button onClick={addItem} className="flex items-center justify-center gap-2 bg-[#3b528b] text-white px-6 py-2.5 rounded-lg hover:bg-[#2c3d69] transition-all font-bold text-sm shadow-md flex-1 sm:flex-none sm:ml-auto">
                  <Plus size={18} /> Adicionar Novo Serviço
                </button>
             </div>

          </div>
        )}
      </div>

      {/* DOCUMENTO A4 */}
      <div id="a4-document" className="bg-white w-[210mm] min-h-[297mm] shadow-[0_0_60px_rgba(0,0,0,0.1)] relative overflow-hidden flex flex-col p-[15mm] text-slate-800">
        
        {/* DATALISTS PARA SUGESTÕES DE PREENCHIMENTO */}
        <datalist id="lista-servicos">
          {sugestoesServicos.map((s, i) => <option key={i} value={s} />)}
        </datalist>

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
        <div className="flex justify-between items-end mb-10 relative z-10 print-color-exact">
          <div>
            <h2 className="text-3xl font-black text-[#254191] uppercase leading-none tracking-wide mb-1" style={{ color: '#254191' }}>
              RECIBO
            </h2>
            <p className="text-[#4285f4] text-[16px] font-extrabold italic uppercase tracking-[0.15em]" style={{ color: '#4285f4' }}>
              COMPROVANTE DE EXECUÇÃO DE SERVIÇOS
            </p>
          </div>
          <div className="text-right border-l-4 border-[#254191] pl-3 print:border-[#254191]">
             <div className="flex items-center justify-end text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">
                Nº <input 
                  type="text" 
                  value={quoteNumber} 
                  onChange={(e) => setQuoteNumber(e.target.value)}
                  className="bg-transparent border-none text-right w-12 p-0 focus:ring-0 text-gray-400 font-bold"
                />
             </div>
             <div className="flex items-center justify-end mt-1">
                <input 
                    type="text" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)}
                    className="text-sm font-black text-gray-800 italic leading-tight text-right bg-transparent border-none p-0 w-24 focus:ring-0"
                />
             </div>
          </div>
        </div>

        {/* --- SEÇÃO CLIENTE --- */}
        <section className="bg-blue-50/30 p-3 rounded-lg border border-blue-100 w-full shadow-sm mb-10 relative z-10 print:bg-blue-50 print:border-blue-100 print:mb-10">
          <h3 className="flex items-center gap-2 text-[#254191] font-bold uppercase text-[9px] mb-2 border-b border-blue-200 pb-1 italic print:border-blue-200">
            <Shield size={12} /> Cliente / Contratante
          </h3>
          <div className="text-[10px] space-y-1 text-gray-700">
            <div className="grid grid-cols-2 gap-4">
              
              {/* Coluna 1: Nome, Fantasia e CNPJ */}
              <div className="space-y-1">
                <div className="mb-1">
                    <textarea 
                      value={clientData.nome}
                      onChange={(e) => handleClientChange('nome', e.target.value)}
                      onInput={handleAutoResize}
                      ref={initResize}
                      rows="1"
                      className="font-black text-[#254191] uppercase text-xs leading-tight w-full bg-transparent border-none p-0 focus:ring-0 placeholder-blue-300 resize-none overflow-hidden block"
                      placeholder="NOME DO CLIENTE"
                    />
                </div>
                <div className="flex items-start gap-1">
                    <span className="font-bold uppercase text-[9px] tracking-tight text-blue-800 whitespace-nowrap mt-0.5">NOME FANTASIA:</span>
                    <textarea value={clientData.fantasia} onChange={(e) => handleClientChange('fantasia', e.target.value)} onInput={handleAutoResize} ref={initResize} rows="1" className="w-full bg-transparent border-b border-blue-100 p-0 text-[10px] focus:ring-0 resize-none overflow-hidden block leading-tight" placeholder="..." />
                </div>
                <div className="flex items-start gap-1">
                    <span className="font-bold uppercase text-[9px] tracking-tight text-blue-800 whitespace-nowrap mt-0.5">CNPJ/CPF:</span>
                    <textarea value={clientData.cnpj} onChange={(e) => handleClientChange('cnpj', e.target.value)} onInput={handleAutoResize} ref={initResize} rows="1" className="w-full bg-transparent border-b border-blue-100 p-0 text-[10px] focus:ring-0 resize-none overflow-hidden block leading-tight" placeholder="..." />
                </div>
              </div>
              
              {/* Coluna 2: Atividade e Endereço */}
              <div className="border-l border-blue-200 pl-4 space-y-2 print:border-blue-200">
                <div>
                    <label className="font-bold uppercase text-[9px] tracking-tighter text-blue-800 block mb-0.5">Código / Atividade Econômica Principal:</label>
                    <textarea value={clientData.atividade} onChange={(e) => handleClientChange('atividade', e.target.value)} onInput={handleAutoResize} ref={initResize} rows="1" className="italic font-medium leading-tight w-full bg-transparent border-b border-blue-100 p-0 text-[10px] focus:ring-0 resize-none overflow-hidden block" placeholder="..." />
                </div>
                <div className="pt-1 border-t border-blue-200 print:border-blue-200">
                    <div className="flex items-start gap-1">
                      <span className="font-bold uppercase text-[9px] tracking-tight text-blue-800 whitespace-nowrap mt-0.5">Endereço:</span>
                      <textarea 
                        value={clientData.endereco} 
                        onChange={(e) => handleClientChange('endereco', e.target.value)} 
                        onInput={handleAutoResize}
                        ref={initResize}
                        rows="1"
                        className="w-full bg-transparent border-b border-blue-100 p-0 text-[10px] focus:ring-0 resize-none leading-tight overflow-hidden block" 
                        placeholder="..." 
                      />
                    </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* --- TABELA DE SERVIÇOS --- */}
        <section className="mb-10 relative z-10">
            <table className="w-full text-left border-collapse border border-blue-200 text-[10px] shadow-sm rounded-lg overflow-visible print:border-blue-200">
                <thead className="bg-[#254191] text-white uppercase font-black text-[9px] print:bg-[#254191] print:text-white">
                    <tr>
                        <th className="p-2 border-r border-blue-800 text-left w-[30%] rounded-tl-lg print:rounded-none">Serviço</th>
                        <th className="p-2 border-r border-blue-800 text-left w-[40%]">Descrição / Procedimento</th>
                        <th className="p-2 border-r border-blue-800 text-center w-[10%]">Quant</th>
                        <th className="p-2 text-right w-[20%] rounded-tr-lg print:rounded-none">Valor Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-blue-100 text-gray-700 bg-white print:divide-blue-100">
                    {items.map((item) => (
                        <tr key={item.id} className="group hover:bg-blue-50 transition-colors print:bg-white">
                            <td className="p-2 border-r border-blue-100 align-middle print:border-blue-100 relative">
                                <input 
                                    type="text" 
                                    list="lista-servicos"
                                    value={item.service}
                                    onChange={(e) => updateItem(item.id, 'service', e.target.value)}
                                    style={{ minHeight: '20px' }}
                                    className="w-full bg-transparent border-none p-0 font-bold text-[#254191] outline-none focus:outline-none focus:ring-0 placeholder-blue-300 uppercase"
                                    placeholder="SERVIÇO..."
                                />
                            </td>
                            <td className="p-2 border-r border-blue-100 align-middle print:border-blue-100 relative">
                                <textarea 
                                    value={item.description}
                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                    onInput={handleAutoResize}
                                    ref={initResize}
                                    rows="1"
                                    style={{ minHeight: '20px' }}
                                    className="w-full bg-transparent border-none p-0 text-gray-600 resize-none outline-none focus:outline-none focus:ring-0 placeholder-gray-400 italic leading-tight overflow-hidden block"
                                    placeholder="Descrição técnica..."
                                />
                            </td>
                            <td className="p-2 border-r border-blue-100 align-middle text-center print:border-blue-100">
                                <input 
                                    type="number" 
                                    min="0"
                                    value={item.quantity}
                                    onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                                    style={{ minHeight: '20px' }}
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
                                        style={{ minHeight: '20px' }}
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
        <div className="mt-auto relative z-10 print-avoid-break">
            {/* Barra de Total */}
            <section className="bg-[#254191] text-white py-3 px-5 rounded-lg flex justify-between items-center shadow-md border-b-4 border-blue-900/50 mb-10 print:bg-[#254191] print:text-white print:border-blue-900">
                <div className="flex items-center gap-2 opacity-90">
                    <div className="bg-white/10 p-1.5 rounded border border-white/20">
                        <Hash size={16} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Valor Total do Recibo</span>
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
                        onInput={handleAutoResize}
                        ref={initResize}
                        rows="1"
                        className="w-full border-none p-0 text-gray-600 bg-transparent resize-none focus:ring-0 leading-snug font-medium overflow-hidden block"
                    />
                </div>
                <div>
                    <h4 className="font-bold text-[#254191] uppercase border-b border-blue-100 pb-1 mb-2 text-[9px] print:border-blue-100">Validade e Condições</h4>
                    <div className="text-gray-600 italic font-medium leading-snug">
                        garantia {garantiaMeses} meses...
                    </div>
                </div>
            </div>

            {/* INFO DA EMPRESA CENTRALIZADA (COM PROTEÇÃO CONTRA QUEBRA DE PÁGINA) */}
            <div className="text-center mb-10 print:mb-10 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                <h3 className="text-[#1e3a8a] font-black uppercase text-sm">{empresa.razao}</h3>
                <p className="text-[#1e3a8a] font-bold text-[10px]">Dedetizadora Borges | CNPJ: {empresa.cnpj}</p>
                <p className="text-gray-500 italic text-[9px] mt-1">{empresa.endereco}</p>
                <p className="text-[#1e3a8a] font-bold text-[9px] mt-1 mb-2">{empresa.email}</p>

                <div className="mt-2 bg-blue-50/50 border border-blue-100 rounded-xl p-3 inline-block print:bg-blue-50 print:border-blue-100">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-left">
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
          html, body {
            width: 210mm;
            height: 297mm;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          body { 
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
            width: 210mm !important; 
            height: 297mm !important; 
            min-height: 297mm !important;
            padding: 15mm !important; 
            margin: 0 !important; 
            border-radius: 0;
            overflow: hidden;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            page-break-after: avoid;
            page-break-before: avoid;
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
}