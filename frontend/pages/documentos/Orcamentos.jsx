import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Plus, Printer, Image as ImageIcon, X, Globe, Mail, Phone, Shield, User, MapPin, Briefcase, Hash, Edit3, ChevronDown, ChevronUp, Loader2, Search, AlertTriangle, Minus } from 'lucide-react';
import { useEmpresa } from '../../contexts/EmpresaContext';
import ClienteBusca from '../../components/shared/ClienteBusca';
import { buscarCNPJ } from '../../services/brasilApi';
import { getClientes } from '../../services/clienteCache';
import { useDocumentoActions } from '../../hooks/useDocumentoActions';
import { BotoesDocumento } from '../../components/documentos/BotoesDocumento';

export default function Orcamentos() {
  // --- ESTADOS DO PAINEL DE EDIÇÃO ---
  const [showEditor, setShowEditor] = useState(true);

  // --- DADOS DO ORÇAMENTO ---
  const [quoteNumber, setQuoteNumber] = useState('00001');
  const [date, setDate] = useState('31/01/2026');

  React.useEffect(() => {
    const savedQuoteNumber = localStorage.getItem('lastQuoteNumber_orcamento');
    if (savedQuoteNumber) {
      setQuoteNumber(savedQuoteNumber);
    }
  }, []);
  
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
  const [terms, setTerms] = useState('Este orçamento é válido por 15 dias.');
  
  // Inicialização dos itens
  const [items, setItems] = useState([
    { id: 1, service: 'Dedetização', description: 'Aplicação de gel e pulverização líquida', quantity: 1, value: 0 },
    { id: 2, service: '', description: '', quantity: '', value: 0 },
    { id: 3, service: '', description: '', quantity: '', value: 0 },
    { id: 4, service: '', description: '', quantity: '', value: 0 },
  ]);

  // --- SUGESTÕES DE AUTOCOMPLETAR ---
  const sugestoesServicos = [
    "Dedetização",
    "Desratização",
    "Descupinização",
    "Sanitização de Ambientes",
    "Desinsetização",
    "Limpeza de Caixa D'água",
    "Controle Integrado de Pragas (CIP)"
  ];

  const sugestoesDescricoes = [
    "Aplicação de gel e pulverização líquida",
    "Instalação de porta-iscas, mapeamento e monitoramento",
    "Desinfecção contra vírus e bactérias por nebulização",
    "Serviço realizado nas áreas comuns do condominio"
  ];

  const fileInputLogo = useRef(null);
  
  // Cálculo do total
  const total = items.reduce((acc, item) => {
    const qty = item.quantity === '' ? 0 : parseFloat(item.quantity);
    const val = parseFloat(item.value) || 0;
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

  const incrementQuoteNumber = () => {
    const currentNum = parseInt(quoteNumber, 10) || 0;
    setQuoteNumber(String(currentNum + 1).padStart(5, '0'));
  };

  const decrementQuoteNumber = () => {
    const currentNum = parseInt(quoteNumber, 10) || 0;
    if (currentNum > 1) {
      setQuoteNumber(String(currentNum - 1).padStart(5, '0'));
    }
  };

  // --- BRASIL API / CACHE DE CLIENTES ---
  const [isLoadingCnpj, setIsLoadingCnpj] = useState(false);
  const [cnpjError, setCnpjError]         = useState('');
  const [clientesSalvos, setClientesSalvos] = useState([]);

  useEffect(() => { setClientesSalvos(getClientes()); }, []);

  const handleBuscarCNPJ = async () => {
    const raw = clientData.cnpj.replace(/\D/g, '');
    if (raw.length !== 14) { setCnpjError('Digite um CNPJ completo (14 dígitos).'); return; }
    setCnpjError('');
    setIsLoadingCnpj(true);
    try {
      const dados = await buscarCNPJ(raw);
      setClientData(prev => ({
        ...prev,
        nome:     dados.nome     || '',
        fantasia: dados.fantasia || '',
        cnpj:     dados.cnpj     || prev.cnpj,
        endereco: dados.endereco || '',
        atividade: dados.atividade || '',
      }));
    } catch (err) {
      setCnpjError(err.message || 'CNPJ não encontrado na Receita Federal.');
    } finally {
      setIsLoadingCnpj(false);
    }
  };

  // --- AÇÕES DE DOCUMENTO (PDF + SALVAR CLIENTE) via hook compartilhado ---
  const { salvandoPdf, handleSalvarPdf, handleSalvarCliente: salvarClienteHook } = useDocumentoActions({
    tipo: 'orcamento',
    getNumeroDoc:   () => quoteNumber || '00001',
    getNomeEmpresa: () => clientData.nome || clientData.fantasia || 'Empresa',
  });

  const handleSalvarCliente = () => {
    const atualizado = salvarClienteHook(clientData, setCnpjError);
    if (atualizado) setClientesSalvos(atualizado);
  };

  // Auto-incrementa o número APÓS o diálogo de impressão fechar (correto)
  useEffect(() => {
    const onAfterPrint = () => {
      setQuoteNumber(prev => {
        const next = String((parseInt(prev, 10) || 0) + 1).padStart(5, '0');
        localStorage.setItem('lastQuoteNumber_orcamento', next);
        return next;
      });
    };
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, []);

  const handlePrint = () => window.print();

  return (
    <div id="a4-document" className="bg-zinc-200 py-10 print:py-0 print:bg-white flex flex-col print:block items-center gap-4 print:gap-0">

      {/* BOTÕES FLUTUANTES */}
      <BotoesDocumento
        onSalvarPdf={handleSalvarPdf}
        onImprimir={handlePrint}
        salvandoPdf={salvandoPdf}
      />

      <input type="file" ref={fileInputLogo} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setLogo)} />

      {/* PAINEL "EDITAR INFORMAÇÕES DO DOCUMENTO" */}
      <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-4xl border border-blue-200 mb-8 no-print">

        {/* Cabeçalho do Painel */}
        <div className="flex justify-between items-center mb-6 border-b pb-2">
          <h3 className="font-bold text-lg text-blue-900 flex items-center gap-2">
            <Edit3 size={20} /> Editar Informações do Documento
          </h3>
          <button onClick={() => setShowEditor(!showEditor)} className="text-gray-500 hover:text-blue-700">
            {showEditor ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {/* Conteúdo do Painel */}
        {showEditor && (
          <div className="space-y-6">
             
             {/* BLOCO DE DADOS GERAIS E CLIENTE */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                 
                 {/* COLUNA 1: DADOS GERAIS */}
                 <div className="space-y-4">
                     <h4 className="font-bold text-[11px] text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-2">Dados Gerais</h4>
                     
                     {/* Layout flexível para evitar sobreposição */}
                     <div className="flex flex-col xl:flex-row gap-4 items-start w-full">
                         <div className="shrink-0">
                             <label className="block text-xs font-bold text-gray-600 mb-1.5">Nº Documento</label>
                             <div className="flex items-center gap-1.5">
                                 <input 
                                     type="text" 
                                     value={quoteNumber} 
                                     onChange={(e) => setQuoteNumber(e.target.value)} 
                                     className="w-20 p-2.5 bg-gray-200/60 border border-gray-300/50 rounded-md text-sm font-bold text-[#254191] text-center focus:bg-white focus:border-[#324577]/40 focus:ring-2 focus:ring-[#324577]/10 outline-none transition-all" 
                                 />
                                 <button 
                                     type="button"
                                     onClick={decrementQuoteNumber}
                                     className="w-10 h-[42px] flex items-center justify-center bg-red-50/40 border border-red-200 rounded-md text-red-500 hover:bg-red-100 transition-colors cursor-pointer shrink-0"
                                 >
                                     <span className="text-xl font-medium leading-none mb-0.5">-</span>
                                 </button>
                                 <button 
                                     type="button"
                                     onClick={incrementQuoteNumber}
                                     className="w-10 h-[42px] flex items-center justify-center bg-blue-50/40 border border-blue-200 rounded-md text-blue-500 hover:bg-blue-100 transition-colors cursor-pointer shrink-0"
                                 >
                                     <span className="text-xl font-medium leading-none mb-0.5">+</span>
                                 </button>
                             </div>
                             <p className="text-[10px] text-gray-400 italic mt-2">* Salva automaticamente ao imprimir.</p>
                         </div>
                         <div className="flex-1 w-full">
                             <label className="block text-xs font-bold text-gray-600 mb-1.5">Data Emissão</label>
                             <input type="text" value={date} onChange={(e) => setDate(e.target.value)} placeholder="DD/MM/AAAA" className="w-full p-2.5 bg-gray-200/60 border border-gray-300/50 rounded-md text-sm font-semibold text-gray-800 focus:bg-white focus:border-[#324577]/40 focus:ring-2 focus:ring-[#324577]/10 outline-none transition-all" />
                         </div>
                     </div>
                 </div>

                 {/* COLUNA 2: DADOS DO CLIENTE */}
                 <div className="space-y-4">
                     <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider border-b pb-1">Dados do Cliente</h4>

                     <ClienteBusca
                       placeholder="Buscar cliente no sistema..."
                       onSelect={(c) => {
                         setCnpjError('');
                         setClientData(prev => ({
                           ...prev,
                           nome:     c.razao_social || c.nome_fantasia || c.nome || '',
                           fantasia: c.nome_fantasia || c.fantasia || '',
                           cnpj:     c.cnpj || '',
                           endereco: c.endereco_completo || c.endereco || [c.rua, c.numero, c.bairro, c.cidade, c.uf].filter(Boolean).join(', '),
                           atividade: c.cnae || c.atividade || '',
                         }));
                       }}
                     />

                     <div className="flex gap-2 items-end">
                       <div className="flex-1">
                         <label className="block text-xs font-bold text-gray-700 mb-1">Carregar Cliente Salvo</label>
                         <select
                           className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                           value=""
                           onChange={(e) => {
                             const c = clientesSalvos.find(x => x.cnpj === e.target.value);
                             if (c) {
                               setCnpjError('');
                               setClientData(prev => ({ ...prev, nome: c.nome, fantasia: c.fantasia, cnpj: c.cnpj, endereco: c.endereco, atividade: c.atividade }));
                             }
                           }}
                         >
                           <option value="">-- selecione um cliente salvo --</option>
                           {clientesSalvos.map(c => (
                             <option key={c.cnpj} value={c.cnpj}>{c.fantasia || c.nome} — {c.cnpj}</option>
                           ))}
                         </select>
                       </div>
                       <button onClick={handleSalvarCliente}
                         className="px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors flex items-center gap-1 shrink-0">
                         <Plus size={14}/> Salvar Cliente
                       </button>
                     </div>

                     <div>
                         <label className="block text-xs font-bold text-gray-700 mb-1">Razão Social / Nome</label>
                         <input type="text" value={clientData.nome} onChange={(e) => handleClientChange('nome', e.target.value)} className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-gray-700 mb-1">Nome Fantasia</label>
                         <input type="text" value={clientData.fantasia} onChange={(e) => handleClientChange('fantasia', e.target.value)} className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="block text-xs font-bold text-gray-700 mb-1">CNPJ / CPF</label>
                             <div className="flex gap-1">
                               <input type="text" value={clientData.cnpj} onChange={(e) => handleClientChange('cnpj', e.target.value)}
                                 maxLength={18} placeholder="00.000.000/0000-00"
                                 className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                               <button onClick={handleBuscarCNPJ} disabled={isLoadingCnpj}
                                 className="px-3 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors shrink-0 disabled:opacity-60 flex items-center gap-1">
                                 {isLoadingCnpj ? <Loader2 size={14} className="animate-spin"/> : <Search size={14}/>}
                                 {isLoadingCnpj ? 'Buscando...' : 'Buscar'}
                               </button>
                             </div>
                             {cnpjError && (
                               <p className="text-red-500 text-[10px] mt-1 font-bold flex items-center gap-1">
                                 <AlertTriangle size={12}/> {cnpjError}
                               </p>
                             )}
                         </div>
                         <div>
                             <label className="block text-xs font-bold text-gray-700 mb-1">Cód. / Atividade Econômica</label>
                             <input type="text" value={clientData.atividade} onChange={(e) => handleClientChange('atividade', e.target.value)} className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                         </div>
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-gray-700 mb-1">Endereço</label>
                         <input type="text" value={clientData.endereco} onChange={(e) => handleClientChange('endereco', e.target.value)} className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
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
        <div className="a4-page relative bg-white shadow-2xl p-[15mm] flex flex-col print:shadow-none print:m-0 overflow-hidden text-slate-800">
        
        {/* DATALISTS PARA SUGESTÕES DE PREENCHIMENTO */}
        <datalist id="lista-servicos">
          {sugestoesServicos.map((s, i) => <option key={i} value={s} />)}
        </datalist>
        <datalist id="lista-descricoes">
          {sugestoesDescricoes.map((s, i) => <option key={i} value={s} />)}
        </datalist>

        {/* --- CABEÇALHO UNIFORME --- */}
        <header className="flex justify-between items-start mb-3 relative z-50 h-28">
          <div className="flex items-center h-full">
            {/* Logo Area */}
            <div 
              onClick={() => fileInputLogo.current.click()}
              className={`w-64 h-28 flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all group ${!logo ? 'border-2 border-dashed border-blue-200 bg-blue-50/30 no-print' : ''}`}
            >
              {logo ? (
                <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="text-center p-2 no-print">
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
        <div className="w-full h-0.5 bg-[#254191] mb-3 relative z-10 print:bg-[#254191]"></div>

        {/* --- TÍTULO DO DOCUMENTO --- */}
        <div className="flex justify-between items-end mb-4 relative z-10">
          <div className="min-w-0 flex-1 mr-3">
            <h2 className="text-2xl font-black text-[#254191] uppercase leading-none tracking-tight">
              ORÇAMENTO DE PRESTAÇÃO DE SERVIÇOS
            </h2>
          </div>
          <div className="text-right border-l-4 border-[#254191] pl-3 flex-shrink-0 print:border-[#254191]">
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
        <section className="bg-blue-50/30 p-3 rounded-lg border border-blue-100 w-full shadow-sm mb-4 relative z-10 print:bg-blue-50 print:border-blue-100">
          <h3 className="flex items-center gap-2 text-[#254191] font-bold uppercase text-[9px] mb-2 border-b border-blue-200 pb-1 italic print:border-blue-200">
            <Shield size={12} /> Cliente / Contratante
          </h3>
          <div className="text-[10px] space-y-1 text-gray-700">
            <div className="grid grid-cols-2 gap-4">
              
              {/* Coluna 1: Nome, Fantasia e CNPJ */}
              <div className="space-y-1">
                <div className="mb-1">
                    <input 
                      type="text" 
                      value={clientData.nome}
                      onChange={(e) => handleClientChange('nome', e.target.value)}
                      className="font-black text-[#254191] uppercase text-xs leading-tight w-full bg-transparent border-none p-0 focus:ring-0 placeholder-blue-300"
                      placeholder="NOME DO CLIENTE"
                    />
                </div>
                <div className="flex items-center gap-1">
                    <span className="font-bold uppercase text-[9px] tracking-tight text-blue-800 whitespace-nowrap">NOME FANTASIA:</span>
                    <input type="text" value={clientData.fantasia} onChange={(e) => handleClientChange('fantasia', e.target.value)} className="w-full bg-transparent border-b border-blue-100 p-0 text-[10px] focus:ring-0" placeholder="..." />
                </div>
                <div className="flex items-center gap-1">
                    <span className="font-bold uppercase text-[9px] tracking-tight text-blue-800 whitespace-nowrap">CNPJ:</span>
                    <input type="text" value={clientData.cnpj} onChange={(e) => handleClientChange('cnpj', e.target.value)} className="w-full bg-transparent border-b border-blue-100 p-0 text-[10px] focus:ring-0" placeholder="..." />
                </div>
              </div>
              
              {/* Coluna 2: Atividade e Endereço */}
              <div className="border-l border-blue-200 pl-4 space-y-2 print:border-blue-200">
                <div>
                    <label className="font-bold uppercase text-[9px] tracking-tighter text-blue-800 block mb-0.5">Código / Atividade Econômica Principal:</label>
                    <input type="text" value={clientData.atividade} onChange={(e) => handleClientChange('atividade', e.target.value)} className="italic font-medium leading-tight w-full bg-transparent border-b border-blue-100 p-0 text-[10px] focus:ring-0" placeholder="..." />
                </div>
                <div className="pt-1 border-t border-blue-200 print:border-blue-200">
                    <div className="flex items-start gap-1">
                      <span className="font-bold uppercase text-[9px] tracking-tight text-blue-800 whitespace-nowrap mt-0.5">Endereço:</span>
                      <textarea 
                        value={clientData.endereco} 
                        onChange={(e) => handleClientChange('endereco', e.target.value)} 
                        rows="2"
                        className="w-full bg-transparent border-b border-blue-100 p-0 text-[10px] focus:ring-0 resize-none leading-tight overflow-hidden" 
                        placeholder="..." 
                      />
                    </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* --- TABELA DE SERVIÇOS --- */}
        <section className="mb-4 relative z-10">
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
                                    list="lista-servicos"
                                    value={item.service}
                                    onChange={(e) => updateItem(item.id, 'service', e.target.value)}
                                    className="w-full bg-transparent border-none p-0 font-bold text-[#254191] focus:ring-0 placeholder-blue-300 uppercase"
                                    placeholder="SERVIÇO..."
                                />
                            </td>
                            <td className="p-2 border-r border-blue-100 align-middle print:border-blue-100">
                                <input 
                                    type="text"
                                    list="lista-descricoes"
                                    value={item.description}
                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                    className="w-full bg-transparent border-none p-0 text-gray-600 focus:ring-0 placeholder-gray-400 italic leading-tight"
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
        <div className="mt-auto relative z-10 print-avoid-break">
            {/* Barra de Total */}
            <section className="bg-[#254191] text-white py-3 px-5 rounded-lg flex justify-between items-center shadow-md border-b-4 border-blue-900/50 mb-3 print:bg-[#254191] print:text-white print:border-blue-900">
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
            <div className="text-center mb-2 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
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
        <div className="absolute bottom-6 left-0 w-full text-center">
             <p className="text-[9px] text-gray-300 font-bold italic uppercase tracking-widest">
                DEDETIZADORA BORGES • CNPJ: 10.409.228/0001-93
             </p>
        </div>

      </div>{/* fim .a4-page */}

      <style>{`
        .a4-page { width: 210mm; height: 297mm; min-height: 297mm; position: relative; }
        @media print {
          @page { size: A4; margin: 0; }
          /* Força todo o layout a 210mm — elimina qualquer offset do sidebar */
          html { margin: 0 !important; padding: 0 !important; }
          body { margin: 0 !important; padding: 0 !important; width: 210mm !important; height: auto !important; overflow: visible !important; background: white !important; }
          #root, #root > div { margin: 0 !important; padding: 0 !important; height: auto !important; overflow: visible !important; width: 210mm !important; }
          /* Zera margin-left do wrapper do sidebar (inline style) */
          div[style*="margin-left"], div[style*="marginLeft"] { margin-left: 0 !important; }
          /* Zera pelo seletor de classe do MainLayout wrapper */
          .transition-all { margin-left: 0 !important; width: 210mm !important; }
          main { padding: 0 !important; margin: 0 !important; width: 210mm !important; }
          nav, aside { display: none !important; }
          #a4-document header { display: flex !important; }
          #a4-document .no-print { display: none !important; }
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          #a4-document { height: auto !important; padding: 0 !important; margin: 0 !important; gap: 0 !important; display: block !important; background: white !important; width: 210mm !important; }
          .a4-page { box-shadow: none !important; margin: 0 !important; padding: 15mm !important; width: 210mm !important; height: 297mm !important; max-height: 297mm !important; overflow: hidden !important; box-sizing: border-box !important; page-break-inside: avoid; page-break-after: always; }
          .a4-page:last-of-type, .a4-page:last-child { page-break-after: avoid !important; }
        }
        .no-spinner::-webkit-inner-spin-button, .no-spinner::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        textarea { overflow: hidden; }
      `}</style>
    </div>
  );
}