import React, { useState, useRef, useEffect } from 'react';
import {
  Shield, Edit3, ChevronDown, ChevronUp,
  Plus, Minus, Trash2, Hash, Search,
  Image as ImageIcon, Upload,
} from 'lucide-react';
import { getClientes, saveCliente } from '../../services/clienteCache';
import { useCnpjAutofill } from '../../hooks/useCnpjAutofill';
import { CnpjInput } from '../../components/shared/CnpjInput';
import { salvarDocumento } from '../../utils/salvarDocumento';
import { fetchConfigDocumento, incrementarProximoNumero } from '../../utils/proximoNumeroDoc';
import { BotoesDocumento } from '../../components/documentos/BotoesDocumento';
import { ClientePickerModal } from '../../components/documentos/ClientePickerModal';
import { ClientePerfilModal } from '../../components/documentos/ClientePerfilModal';
import { registrarDocumentoNaAgenda } from '../../services/agendaService';

export default function Orcamentos() {
  const fileInputRef = useRef(null);

  const empresa = {
    razao: "MARIA APARECIDA DE OLIVEIRA BORGES",
    nome: "Dedetizadora Borges",
    cnpj: "10.409.228/0001-93",
    endereco: "RUA YARA, 701 – B. CENTRO IND CEL JOVELINO RABELO DIVINÓPOLIS/ MG – CEP 35502-289",
    contatos: "(37) 99964-4205",
    email: "dedetizadoraborges@yahoo.com.br",
    site: "dedetizadoraborges.com.br",
    alvara: "Nº 164/2025 (Venc: 03/07/2028)",
    rt: "Maria Aparecida de Oliveira Borges",
    crq: "02404889 | ART 9.353",
    licencaAmbiental: "Protocolo: 59009480/2019"
  };

  // ─── ESTADOS ────────────────────────────────────────────────────────────────
  const [showEditor, setShowEditor] = useState(true);
  const [logo, setLogo] = useState(null);
  const [salvandoPdf, setSalvandoPdf] = useState(false);

  const [orcamentoNumero, setOrcamentoNumero] = useState(() => {
    try { return localStorage.getItem('lastQuoteNumber_orcamento') || '00001'; } catch { return '00001'; }
  });
  const [dataOrcamento, setDataOrcamento] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const dataOrcamentoDisplay = dataOrcamento
    ? dataOrcamento.split('-').reverse().join('/')
    : '';
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro, Pix, Cartão de crédito (contém juros)');
  const [terms, setTerms] = useState('Este orçamento é válido por 15 dias.');

  const [items, setItems] = useState([
    { id: 1, service: 'DEDETIZAÇÃO', description: 'Aplicação de gel e pulverização líquida', quantity: '1', value: 0 },
  ]);

  const [clientData, setClientData] = useState({ nome: '', fantasia: '', cnpj: '', endereco: '', atividade: '' });
  const [clientesSalvos, setClientesSalvos] = useState([]);

  const { cnpjValue, handleCnpjChange, setCnpjExternal, isLoadingCnpj, cnpjStatus } = useCnpjAutofill({
    onFill: (dados) => {
      setClientData(prev => ({
        ...prev,
        nome:      dados.nome,
        fantasia:  dados.fantasia,
        cnpj:      dados.cnpj,
        endereco:  dados.endereco,
        atividade: dados.atividade,
      }));
    },
    onClear: () => setClientData(prev => ({ ...prev, nome: '', fantasia: '', cnpj: '', endereco: '', atividade: '' })),
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [perfilCliente, setPerfilCliente] = useState(null);

  // ─── INICIALIZAÇÃO ───────────────────────────────────────────────────────────
  useEffect(() => { getClientes().then(setClientesSalvos).catch(() => {}); }, []);

  // Pre-fill de cliente + histórico vindo de Contratos ("Emitir Documento")
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('__prefill_cliente');
      if (!raw) return;
      sessionStorage.removeItem('__prefill_cliente');
      const c = JSON.parse(raw);
      setClientData(prev => ({ ...prev, id: c.id, nome: c.nome || '', fantasia: c.fantasia || '', cnpj: c.cnpj || '', endereco: c.endereco || '', atividade: c.atividadeEconomica || c.atividade || '', configuracoes: c.configuracoes }));
      if (c.cnpj) setCnpjExternal(c.cnpj);
      // Importar itens do último orçamento deste cliente
      if (c.historico?.items && Array.isArray(c.historico.items) && c.historico.items.length > 0) {
        setItems(c.historico.items.map(i => ({ ...i, id: Date.now() + Math.random() })));
      }
    } catch {}
  }, []);

  // Pré-preencher a partir de edição iniciada em Arquivos.jsx
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('__editar_documento');
      if (!raw) return;
      const meta = JSON.parse(raw);
      if (meta.__tipo !== 'orcamento') return;
      sessionStorage.removeItem('__editar_documento');
      if (meta.clientData) {
        setClientData(meta.clientData);
        if (meta.clientData.cnpj) setCnpjExternal(meta.clientData.cnpj);
      }
      if (meta.items) setItems(meta.items);
      if (meta.orcamentoNumero) setOrcamentoNumero(meta.orcamentoNumero);
      if (meta.dataOrcamento) setDataOrcamento(meta.dataOrcamento);
      if (meta.paymentMethod) setPaymentMethod(meta.paymentMethod);
      if (meta.terms) setTerms(meta.terms);
    } catch {}
  }, []);

  // Carrega logo do servidor (igual ao Laudos)
  useEffect(() => {
    fetch('/api/config/logo-mascote', { credentials: 'same-origin' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.logo) setLogo(data.logo); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try { localStorage.setItem('lastQuoteNumber_orcamento', orcamentoNumero); } catch {}
  }, [orcamentoNumero]);

  // Número por cliente: busca do servidor quando CNPJ é preenchido
  useEffect(() => {
    if (!clientData.cnpj) return;
    fetchConfigDocumento(clientData, 'orcamento').then(data => {
      if (data?.numeroFormatado) setOrcamentoNumero(data.numeroFormatado);
    }).catch(() => {});
  }, [clientData.cnpj]);

  useEffect(() => {
    const onAfterPrint = () => {
      setOrcamentoNumero(prev => {
        const next = String((parseInt(prev, 10) || 0) + 1).padStart(5, '0');
        localStorage.setItem('lastQuoteNumber_orcamento', next);
        return next;
      });
    };
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, []);

  // ─── HANDLERS ────────────────────────────────────────────────────────────────
  const handleClientChange = (field, value) => setClientData(prev => ({ ...prev, [field]: value }));

  // Sincroniza cnpjValue do hook -> clientData.cnpj para o documento
  useEffect(() => {
    setClientData(prev => ({ ...prev, cnpj: cnpjValue }));
  }, [cnpjValue]);

  // Idêntico ao Laudos
  const handleSalvarPdf = async () => {
    setSalvandoPdf(true);
    try {
      const nomeEmpresa = clientData.nome || clientData.fantasia || 'Empresa';
      const result = await salvarDocumento({
        elementId: 'a4-document',
        tipo: 'orcamento',
        numeroDoc: orcamentoNumero || '00001',
        nomeEmpresa,
        cnpj: clientData.cnpj,
        metadados: {
          __tipo: 'orcamento',
          clientData,
          items,
          orcamentoNumero,
          dataOrcamento,
          paymentMethod,
          terms,
        },
      });
      if (result.sucesso) {
        incrementarProximoNumero(clientData, 'orcamento').then(num => {
          if (num) setOrcamentoNumero(num);
        }).catch(() => {});
        registrarDocumentoNaAgenda(
          'orcamento',
          { nome: clientData.nome, fantasia: clientData.fantasia,
            cnpj: clientData.cnpj, telefone: clientData.telefone,
            endereco: clientData.endereco },
          dataOrcamento,
          orcamentoNumero
        ).catch(() => {});
        alert(`PDF salvo: ${result.nomeArquivo}`);
      } else alert(`Erro ao salvar: ${result.erro}`);
    } finally {
      setSalvandoPdf(false);
    }
  };

  const handleSalvarCliente = async () => {
    if (!clientData.nome?.trim() || !clientData.cnpj?.trim()) return;
    await saveCliente({
      nome: clientData.nome, fantasia: clientData.fantasia,
      cnpj: clientData.cnpj, endereco: clientData.endereco, atividade: clientData.atividade,
    });
    getClientes().then(setClientesSalvos).catch(() => {});
  };

  const handlePrint = () => window.print();

  const addItem    = () => setItems(prev => [...prev, { id: Date.now(), service: '', description: '', quantity: '1', value: 0 }]);
  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id));
  const updateItem = (id, field, value) => setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  const total = items.reduce((acc, i) => acc + (parseFloat(i.value) || 0) * (parseFloat(i.quantity) || 0), 0);
  const formatCurrency = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) { const r = new FileReader(); r.onloadend = () => setLogo(r.result); r.readAsDataURL(file); }
  };

  const incrementNumero = () => setOrcamentoNumero(p => String((parseInt(p, 10) || 0) + 1).padStart(5, '0'));
  const decrementNumero = () => setOrcamentoNumero(p => { const n = parseInt(p, 10) || 0; return n > 1 ? String(n - 1).padStart(5, '0') : p; });

  // ─── RENDER: CABEÇALHO (idêntico ao Laudos) ─────────────────────────────────
  const renderHeader = () => (
    <header className="flex justify-between items-start mb-4 border-b-2 border-[#254191] pb-4 print:flex">
      <div className="w-48 h-20 flex items-center justify-center overflow-hidden flex-shrink-0">
        <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
        {logo ? (
          <img src={logo} alt="Logo da Empresa" className="max-w-full max-h-full object-contain cursor-pointer"
            onClick={() => fileInputRef.current?.click()} title="Clique para trocar a logo" />
        ) : (
          <div onClick={() => fileInputRef.current?.click()}
            className="no-print w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-blue-200 bg-blue-50/30 rounded-lg cursor-pointer hover:bg-gray-50 transition-all group">
            <Upload size={22} className="text-blue-400 group-hover:text-blue-600 mb-1" />
            <p className="text-[9px] font-bold text-blue-500 uppercase leading-tight italic text-center">Clique para<br/>carregar logo</p>
          </div>
        )}
      </div>
      <div className="flex-1 text-right space-y-0.5 pl-4">
        <h1 className="text-sm font-black text-[#254191] uppercase leading-none tracking-tight">{empresa.razao}</h1>
        <div className="text-[9px] text-gray-600 font-medium leading-tight space-y-0.5">
          <p className="font-bold text-gray-700">{empresa.nome} | CNPJ: {empresa.cnpj}</p>
          <p className="italic">{empresa.endereco}</p>
          <p className="text-[9px] text-blue-700 font-semibold pt-0.5 tracking-tight">
            <span className="px-1">{empresa.contatos}</span>
            <span className="px-1">•</span>
            <span className="px-1">{empresa.email}</span>
            <span className="px-1">•</span>
            <span className="px-1">{empresa.site}</span>
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[8px] text-gray-500 pt-1 justify-items-end">
            <p className="whitespace-nowrap">Alvará Sanitário: <span className="text-[#254191] font-bold">{empresa.alvara}</span></p>
            <p className="whitespace-nowrap">Licença Ambiental: <span className="text-[#254191] font-bold">{empresa.licencaAmbiental}</span></p>
            <p className="whitespace-nowrap">Responsável Técnico: <span className="text-[#254191] font-bold">{empresa.rt}</span></p>
            <p className="whitespace-nowrap">CRQ / ART: <span className="text-[#254191] font-bold">{empresa.crq}</span></p>
          </div>
        </div>
      </div>
    </header>
  );

  // ─── RENDER: SEÇÃO CLIENTE — texto estático (idêntico ao Laudos) ─────────────
  const renderClientSection = () => (
    <section className="bg-blue-50/30 p-3 rounded-lg border border-blue-100 w-full shadow-sm mb-4 print:bg-blue-50 print:border-blue-100">
      <h3 className="text-[#254191] font-bold uppercase text-[9px] mb-2 border-b border-blue-200 pb-1 italic">
        Cliente / Contratante
      </h3>
      <div className="text-[10px] space-y-1 text-gray-700">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="font-black text-[#254191] uppercase text-[9px] leading-tight mb-1">{clientData.nome}</p>
            <p><span className="font-bold uppercase text-[9px] tracking-tight text-blue-800">NOME FANTASIA:</span> {clientData.fantasia}</p>
            <p><span className="font-bold uppercase text-[9px] tracking-tight text-blue-800">CNPJ / CPF:</span> {clientData.cnpj}</p>
          </div>
          <div className="border-l border-blue-200 pl-4 space-y-2">
            <div>
              <p className="font-bold uppercase text-[9px] tracking-tighter text-blue-800">Código / Atividade Econômica Principal:</p>
              <p className="italic font-medium leading-tight">{clientData.atividade}</p>
            </div>
            <div className="pt-1 border-t border-blue-200">
              <p><span className="font-bold uppercase text-[9px] tracking-tight text-blue-800">Endereço:</span> {clientData.endereco}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  // ─── RENDER: PAINEL DO EDITOR (no-print) ────────────────────────────────────
  const renderEditorPanel = () => (
    <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-4xl border border-blue-200 mb-8 no-print">
      <div className="flex justify-between items-center mb-6 border-b pb-2">
        <h3 className="font-bold text-lg text-blue-900 flex items-center gap-2">
          <Edit3 size={20} /> Editar Informações do Orçamento
        </h3>
        <button onClick={() => setShowEditor(v => !v)} className="text-gray-500 hover:text-blue-700">
          {showEditor ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {showEditor && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">

            {/* COLUNA 1 — Dados Gerais */}
            <div className="space-y-4">
              <h4 className="font-bold text-[11px] text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-2">Dados Gerais</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Nº Orçamento</label>
                  <div className="flex gap-2">
                    <input type="text" value={orcamentoNumero} onChange={e => setOrcamentoNumero(e.target.value)}
                      className="w-full p-2.5 text-center bg-white border border-gray-200 rounded-md text-sm font-semibold text-blue-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none shadow-sm" />
                    <button onClick={decrementNumero} className="flex items-center justify-center bg-red-50 hover:bg-red-100 border border-red-200 rounded-md w-11 shrink-0 text-red-500"><Minus size={16} /></button>
                    <button onClick={incrementNumero}  className="flex items-center justify-center bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md w-11 shrink-0 text-blue-500"><Plus size={16} /></button>
                  </div>
                  <p className="text-[10px] text-gray-400 italic mt-1.5">* Salva automaticamente ao imprimir.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#3b4b73] mb-1.5">Data do Orçamento</label>
                  <input type="date" value={dataOrcamento} onChange={e => setDataOrcamento(e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-md text-sm text-gray-800 focus:border-blue-400 focus:ring-1 outline-none shadow-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3b4b73] mb-1.5">Forma de Pagamento</label>
                <textarea value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} rows={2}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-md text-sm text-gray-800 focus:ring-1 focus:ring-blue-400 outline-none resize-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3b4b73] mb-1.5">Validade / Termos</label>
                <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={2}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-md text-sm text-gray-800 focus:ring-1 focus:ring-blue-400 outline-none resize-none" />
              </div>
            </div>

            {/* COLUNA 2 — Dados do Cliente */}
            <div className="space-y-4">
              <h4 className="font-bold text-[11px] text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-2">Dados do Cliente</h4>

              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Carregar Cliente Salvo</label>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="w-full flex items-center gap-2 p-2 border border-slate-300 rounded text-sm bg-white hover:bg-slate-50 text-slate-700 transition-colors"
                  >
                    <Search size={16} className="text-slate-400" />
                    <span className="truncate">Buscar cliente salvo...</span>
                    <span className="ml-auto text-xs text-slate-400 shrink-0">{clientesSalvos.length} salvo{clientesSalvos.length === 1 ? '' : 's'}</span>
                  </button>
                </div>
                <button onClick={handleSalvarCliente}
                  className="px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded flex items-center gap-1 shrink-0">
                  <Plus size={14} /> Salvar Cliente
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Razão Social / Nome</label>
                <input type="text" value={clientData.nome} onChange={e => handleClientChange('nome', e.target.value)}
                  className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome Fantasia</label>
                <input type="text" value={clientData.fantasia} onChange={e => handleClientChange('fantasia', e.target.value)}
                  className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <CnpjInput
                  value={cnpjValue}
                  onChange={handleCnpjChange}
                  isLoading={isLoadingCnpj}
                  status={cnpjStatus}
                />
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Atividade Econômica</label>
                  <input type="text" value={clientData.atividade} onChange={e => handleClientChange('atividade', e.target.value)}
                    className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Endereço</label>
                <input type="text" value={clientData.endereco} onChange={e => handleClientChange('endereco', e.target.value)}
                  className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="mt-6 pt-6 border-t border-gray-200 flex gap-4 flex-wrap items-center">
            <button onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-white text-[#324577] border border-[#324577]/20 px-5 py-2.5 rounded-lg hover:bg-[#324577]/5 font-bold text-sm shadow-sm">
              <ImageIcon size={18} /> Alterar Logo
            </button>
            <button onClick={addItem}
              className="flex items-center gap-2 bg-[#3b528b] text-white px-6 py-2.5 rounded-lg hover:bg-[#2c3d69] font-bold text-sm shadow-md ml-auto">
              <Plus size={18} /> Adicionar Serviço
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ─── RENDER PRINCIPAL ────────────────────────────────────────────────────────
  return (
    <div id="a4-document" className="bg-zinc-200 py-10 print:py-0 print:bg-white flex flex-col print:block items-center gap-4 print:gap-0">

      {renderEditorPanel()}

      <BotoesDocumento onSalvarPdf={handleSalvarPdf} onImprimir={handlePrint} salvandoPdf={salvandoPdf} />

      <ClientePickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        clientes={clientesSalvos}
        onSelect={(c) => {
          setCnpjExternal(c.cnpj || '');
          setClientData(prev => ({
            ...prev,
            id: c.id, nome: c.nome, fantasia: c.fantasia, cnpj: c.cnpj,
            endereco: c.endereco, atividade: c.atividade,
            configuracoes: c.configuracoes,
          }));
        }}
        onVerPerfil={(c) => { setPickerOpen(false); setPerfilCliente(c); }}
      />

      <ClientePerfilModal
        cliente={perfilCliente}
        onClose={() => setPerfilCliente(null)}
        onUpdate={(lista) => setClientesSalvos(lista)}
      />

      {/* ══════════════════════════════════════════════════════════════════════
          PÁGINA A4 — ORÇAMENTO
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="a4-page relative bg-white shadow-2xl p-[15mm] flex flex-col print:shadow-none print:m-0 overflow-hidden text-slate-800">

        {renderHeader()}

        {/* Título + Número/Data — idêntico ao Laudos */}
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-xl font-black text-[#254191] uppercase leading-none tracking-tight">
            ORÇAMENTO<br/>
            <span className="text-blue-500 text-sm font-bold tracking-widest uppercase italic">Prestação de Serviços</span>
          </h2>
          <div className="text-right border-l-4 border-[#254191] pl-3">
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">Nº {orcamentoNumero}</p>
            <p className="text-sm font-black text-gray-800 italic leading-tight">{dataOrcamentoDisplay}</p>
          </div>
        </div>

        {/* Seção Cliente — texto estático idêntico ao Laudos */}
        {renderClientSection()}

        {/* Tabela de Serviços */}
        <section className="mb-3">
          <table className="w-full text-[10px] border-collapse border border-[#254191]">
            <thead>
              <tr className="bg-[#254191] text-white print:bg-[#254191] print:text-white">
                <th className="py-2 px-3 text-left font-bold uppercase tracking-widest text-[9px] w-[26%] border border-[#1e3575]">Serviço</th>
                <th className="py-2 px-3 text-left font-bold uppercase tracking-widest text-[9px] border border-[#1e3575]">Descrição / Procedimento</th>
                <th className="py-2 px-2 text-center font-bold uppercase tracking-widest text-[9px] w-[9%] border border-[#1e3575]">Qtd</th>
                <th className="py-2 px-3 text-right font-bold uppercase tracking-widest text-[9px] w-[14%] border border-[#1e3575]">Valor Total</th>
                <th className="py-2 px-1 w-5 no-print border border-[#1e3575]" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                  <td className="py-1.5 px-3 border border-blue-200">
                    <input type="text" value={item.service} onChange={e => updateItem(item.id, 'service', e.target.value)}
                      className="w-full bg-transparent border-none p-0 text-[10px] font-semibold text-[#254191] uppercase focus:ring-0 outline-none" placeholder="SERVIÇO..." />
                  </td>
                  <td className="py-1.5 px-3 border border-blue-200">
                    <input type="text" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)}
                      className="w-full bg-transparent border-none p-0 text-[10px] focus:ring-0 outline-none" placeholder="Descrição técnica..." />
                  </td>
                  <td className="py-1.5 px-2 text-center border border-blue-200">
                    <input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                      className="w-full bg-transparent border-none p-0 text-[10px] text-center focus:ring-0 outline-none no-spinner" />
                  </td>
                  <td className="py-1.5 px-3 text-right border border-blue-200">
                    <div className="flex items-center justify-end gap-0.5">
                      <span className="text-gray-400 text-[9px]">R$</span>
                      <input type="number" value={item.value} onChange={e => updateItem(item.id, 'value', e.target.value)}
                        className="w-14 bg-transparent border-none p-0 text-[10px] text-right focus:ring-0 outline-none no-spinner" />
                    </div>
                  </td>
                  <td className="py-1.5 px-1 no-print border border-blue-200">
                    {items.length > 1 && (
                      <button onClick={() => removeItem(item.id)} className="text-red-300 hover:text-red-600">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Rodapé do documento */}
        <div className="mt-auto">
          <section className="bg-[#254191] text-white py-3 px-5 rounded-lg flex justify-between items-center shadow-md border-b-4 border-blue-900/50 mb-3 print:bg-[#254191] print:text-white">
            <div className="flex items-center gap-2 opacity-90">
              <div className="bg-white/10 p-1.5 rounded border border-white/20"><Hash size={15} /></div>
              <span className="text-[10px] font-bold uppercase tracking-widest">Valor Total do Orçamento</span>
            </div>
            <div className="text-2xl font-black italic tracking-tight">{formatCurrency(total)}</div>
          </section>

          <div className="grid grid-cols-2 gap-6 mb-3 text-[10px]">
            <div>
              <h4 className="font-bold text-[#254191] uppercase border-b border-blue-100 pb-1 mb-1.5 text-[9px]">Forma de Pagamento</h4>
              <p className="text-gray-600 font-medium leading-snug">{paymentMethod}</p>
            </div>
            <div>
              <h4 className="font-bold text-[#254191] uppercase border-b border-blue-100 pb-1 mb-1.5 text-[9px]">Validade e Condições</h4>
              <p className="text-gray-600 italic font-medium leading-snug">{terms}</p>
            </div>
          </div>

          <div className="text-center mb-1">
            <h3 className="text-[#1e3a8a] font-black uppercase text-[11px]">{empresa.razao}</h3>
            <p className="text-[#1e3a8a] font-bold text-[9px]">{empresa.nome} | CNPJ: {empresa.cnpj}</p>
            <p className="text-gray-500 italic text-[8px] mt-0.5">{empresa.endereco}</p>
            <p className="text-[#1e3a8a] font-bold text-[8px] mt-0.5">{empresa.email}</p>
          </div>
        </div>

        <div className="absolute bottom-4 left-0 w-full text-center">
          <p className="text-[8px] text-gray-300 font-bold italic uppercase tracking-widest">
            {empresa.nome} • CNPJ: {empresa.cnpj}
          </p>
        </div>
      </div>

      <style>{`
        .a4-page { width: 210mm; height: 297mm; min-height: 297mm; position: relative; }
        @media print {
          @page { size: A4; margin: 0; }
          html, body, #root, #root > div {
            height: auto !important; min-height: 0 !important; overflow: visible !important;
            background: white !important; margin: 0 !important; padding: 0 !important;
          }
          div[style*="margin-left"], div[style*="marginLeft"] { margin-left: 0 !important; }
          main { padding: 0 !important; }
          nav, aside { display: none !important; }
          #a4-document header { display: flex !important; }
          #a4-document .no-print { display: none !important; }
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          #a4-document {
            height: auto !important; min-height: 0 !important; padding: 0 !important;
            margin: 0 !important; gap: 0 !important; display: block !important; background: white !important;
          }
          .a4-page {
            box-shadow: none !important; border: none !important; margin: 0 !important;
            padding: 15mm !important; width: 210mm !important; height: 297mm !important;
            max-height: 297mm !important; overflow: hidden !important;
            box-sizing: border-box !important; page-break-inside: avoid; page-break-after: always;
          }
          .a4-page:last-of-type, .a4-page:last-child { page-break-after: avoid !important; }
        }
        .no-spinner::-webkit-inner-spin-button,
        .no-spinner::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
    </div>
  );
}
