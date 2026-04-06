import React, { useState, useRef, useEffect } from 'react';
import { Mail, Phone, Shield, Droplets, Bug, ClipboardCheck, Calendar, Info, CheckCircle2, Upload, AlertTriangle, Plus, Trash2, FileText, Image as ImageIcon } from 'lucide-react';
import { empresa } from '../data/empresa';
import { pestOptions, productsDatabase, procedimentosHigienizacao, generateSmartProductList, getCompatibleProducts } from '../data/produtos';
import EditorPanel from '../components/EditorPanel';
import ClienteSection from '../components/ClienteSection';
import HolidayAlert from '../components/HolidayAlert';

export default function Laudos({ feriados = [] }) {
  const [logo, setLogo] = useState(null);
  const fileInputRef = useRef(null);
  const [showPestControl, setShowPestControl] = useState(true);
  const [showWaterTank, setShowWaterTank] = useState(true);
  const [alvaraImage, setAlvaraImage] = useState(null);
  const alvaraInputRef = useRef(null);
  const [feriadoAtual, setFeriadoAtual] = useState(null);

  const [formData, setFormData] = useState({
    laudoNumero: "0001",
    dataExecucao: new Date().toISOString().split('T')[0],
    garantiaMeses: 6,
    selectedPests: ['baratas', 'formigas', 'ratos', 'cupins', 'escorpioes'],
    observacao: "",
    reservatorios: [
      { quantidade: "01", tipo: "Caixa de Fibra", volume: "1.000 Litros", identificacao: "Água Potável" }
    ],
    responsaveis: "PAULO BORGES DE CASTRO e MARIA APARECIDA DE OLIVEIRA BORGES",
    cliente: {
      nome: "",
      fantasia: "",
      cnpj: "",
      endereco: "",
      atividade: ""
    }
  });

  const [productRows, setProductRows] = useState([]);

  // Logica inteligente de produtos
  useEffect(() => {
    setProductRows(generateSmartProductList(formData.selectedPests));
  }, [formData.selectedPests]);

  // Verificar feriado na data
  useEffect(() => {
    if (formData.dataExecucao && feriados.length > 0) {
      const found = feriados.find(f => f.date === formData.dataExecucao);
      setFeriadoAtual(found || null);
    }
  }, [formData.dataExecucao, feriados]);

  // Funcoes auxiliares
  const addRow = () => setProductRows([...productRows, 'fendona']);
  const removeRow = (index) => { const r = [...productRows]; r.splice(index, 1); setProductRows(r); };
  const updateRow = (index, productId) => { const r = [...productRows]; r[index] = productId; setProductRows(r); };

  const addReservatorio = () => {
    setFormData(prev => ({
      ...prev,
      reservatorios: [...prev.reservatorios, { quantidade: "", tipo: "", volume: "", identificacao: "" }]
    }));
  };
  const updateReservatorio = (index, field, value) => {
    const newRes = [...formData.reservatorios];
    newRes[index] = { ...newRes[index], [field]: value };
    setFormData(prev => ({ ...prev, reservatorios: newRes }));
  };
  const removeReservatorio = (index) => {
    const newRes = [...formData.reservatorios];
    newRes.splice(index, 1);
    setFormData(prev => ({ ...prev, reservatorios: newRes }));
  };

  const getControlTypes = () => ({
    quimico: formData.selectedPests.length > 0,
    naoQuimico: formData.selectedPests.includes('ratos')
  });

  const formatDate = (isoDate) => {
    if (!isoDate) return "";
    const parts = isoDate.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const getExpiryDate = (baseDateIso, monthsToAdd) => {
    if (!baseDateIso) return "";
    const parts = baseDateIso.split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    date.setMonth(date.getMonth() + parseInt(monthsToAdd || 0));
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('cliente.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({ ...prev, cliente: { ...prev.cliente, [field]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleClientChange = (field, value) => {
    setFormData(prev => ({ ...prev, cliente: { ...prev.cliente, [field]: value } }));
  };

  const togglePest = (pestId) => {
    setFormData(prev => {
      const current = prev.selectedPests;
      if (current.includes(pestId)) {
        return { ...prev, selectedPests: current.filter(p => p !== pestId) };
      } else {
        return { ...prev, selectedPests: [...current, pestId] };
      }
    });
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogo(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAlvaraUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAlvaraImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handlePrint = () => {
    if (!showPestControl && !showWaterTank) {
      alert("Selecione pelo menos um documento para impressão (Pragas ou Higienização).");
      return;
    }
    window.print();
  };

  const compatibleProducts = getCompatibleProducts(formData.selectedPests);

  // ===== RENDER HEADER (laudo style) =====
  const renderHeader = () => (
    <header className="flex justify-between items-start mb-6 border-b-2 border-[#254191] pb-4">
      <div className="flex items-center gap-4">
        <div
          onClick={() => fileInputRef.current.click()}
          className={`w-60 h-24 flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-all hover:bg-gray-50 group no-print ${logo ? 'border-transparent' : 'border-blue-200 bg-blue-50/30'}`}
        >
          <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
          {logo ? (
            <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="text-center p-2">
              <Upload size={24} className="mx-auto text-blue-400 group-hover:text-blue-600 mb-1" />
              <p className="text-[10px] font-bold text-blue-500 uppercase leading-tight italic">Clique para carregar<br/>Sua Logo</p>
            </div>
          )}
        </div>
        <div className="hidden print:flex w-60 h-24 items-center justify-start overflow-hidden">
          {logo && <img src={logo} className="max-w-full max-h-full object-contain" alt="Logo Impressa" />}
        </div>
      </div>
      <div className="flex-1 text-right space-y-1 pl-4">
        <h1 className="text-sm font-black text-[#254191] uppercase leading-none tracking-tight">{empresa.razao}</h1>
        <div className="text-[9px] text-gray-600 font-medium leading-tight space-y-0.5">
          <p className="font-bold text-gray-700">{empresa.nome} | CNPJ: {empresa.cnpj}</p>
          <p className="italic">{empresa.endereco}</p>
          <div className="flex justify-end gap-3 text-blue-700 font-bold pt-1">
            <span className="flex items-center gap-1"><Phone size={9} /> {empresa.contatos}</span>
            <span className="flex items-center gap-1"><Mail size={9} /> {empresa.email}</span>
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

  const renderClientSection = () => (
    <section className="bg-blue-50/30 p-3 rounded-lg border border-blue-100 w-full shadow-sm">
      <h3 className="flex items-center gap-2 text-[#254191] font-bold uppercase text-[9px] mb-2 border-b border-blue-200 pb-1 italic">
        <Shield size={12} /> Cliente / Contratante
      </h3>
      <div className="text-[10px] space-y-1 text-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="font-black text-[#254191] uppercase text-xs leading-tight mb-1">{formData.cliente.nome || 'NOME DO CLIENTE'}</p>
            <p><span className="font-bold uppercase text-[9px] tracking-tight text-blue-800">NOME FANTASIA:</span> {formData.cliente.fantasia}</p>
            <p><span className="font-bold uppercase text-[9px] tracking-tight text-blue-800">CNPJ:</span> {formData.cliente.cnpj}</p>
          </div>
          <div className="md:border-l md:border-blue-200 md:pl-4 space-y-2">
            <div>
              <p className="font-bold uppercase text-[9px] tracking-tighter text-blue-800">Código / Atividade Econômica Principal:</p>
              <p className="italic font-medium leading-tight">{formData.cliente.atividade}</p>
            </div>
            <div className="pt-1 border-t border-blue-200">
              <p><span className="font-bold uppercase text-[9px] tracking-tight text-blue-800">Endereço:</span> {formData.cliente.endereco}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  const renderWarrantySection = (className = "mb-4", months) => {
    const activeMonths = months !== undefined ? months : formData.garantiaMeses;
    const formattedMonths = String(activeMonths).padStart(2, '0');
    return (
      <section className={`${className} bg-[#254191] text-white py-3 px-5 rounded-lg flex justify-between items-center shadow-md border-b-4 border-blue-900/50`}>
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-1.5 rounded-md border border-white/20"><Calendar size={22} /></div>
          <div>
            <p className="text-[8px] uppercase font-bold text-blue-200 mb-0 tracking-wider opacity-80">Garantia Técnica do Serviço</p>
            <p className="text-lg font-black leading-none uppercase tracking-tight italic">{formattedMonths} Meses</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[8px] uppercase font-bold text-blue-200 mb-0 tracking-wider opacity-80">Data da Próxima Manutenção</p>
          <p className="text-lg font-black italic leading-none tracking-tight">{getExpiryDate(formData.dataExecucao, activeMonths)}</p>
        </div>
      </section>
    );
  };

  const renderSignatureSection = () => (
    <div className="grid grid-cols-2 gap-12 mt-auto pb-4 pt-4 border-t border-dashed border-gray-200">
      <div className="text-center space-y-1">
        <p className="text-[8px] font-bold uppercase text-zinc-400 italic">Responsável Contratada</p>
        <p className="text-[10px] font-black uppercase text-[#254191] italic tracking-tight leading-none">Dedetizadora Borges</p>
      </div>
      <div className="text-center space-y-1">
        <p className="text-[8px] font-bold uppercase text-zinc-400 italic">Responsável Contratante</p>
        <p className="text-[10px] font-black uppercase text-zinc-800 tracking-tight leading-none">Assinatura / Carimbo</p>
      </div>
    </div>
  );

  const renderFooterInfo = () => (
    <div className="absolute bottom-6 left-0 right-0 text-center text-[8px] text-zinc-300 font-bold tracking-[0.4em] uppercase italic">
      {empresa.nome} • CNPJ: {empresa.cnpj}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4">
      {/* ALERTA DE FERIADO */}
      <HolidayAlert feriado={feriadoAtual} dataFormatada={formatDate(formData.dataExecucao)} />

      {/* EDITOR PANEL */}
      <EditorPanel title="Editar Informações do Laudo">
        <div className="space-y-6">
          {/* SELECAO DE DOCUMENTOS */}
          <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
            <h4 className="font-bold text-sm text-[#254191] uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText size={16}/> Documentos a Emitir
            </h4>
            <div className="flex flex-col md:flex-row gap-3">
              <button onClick={() => setShowPestControl(!showPestControl)}
                className={`flex-1 p-3 text-sm font-bold rounded-lg border transition-all flex items-center justify-center gap-2 ${
                  showPestControl ? 'bg-[#254191] text-white border-blue-900 shadow-md' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                }`}>
                <Bug size={18} className={showPestControl ? 'text-blue-300' : 'text-gray-400'}/> Laudo de Controle de Pragas
                {showPestControl && <CheckCircle2 size={16} className="ml-auto" />}
              </button>
              <button onClick={() => setShowWaterTank(!showWaterTank)}
                className={`flex-1 p-3 text-sm font-bold rounded-lg border transition-all flex items-center justify-center gap-2 ${
                  showWaterTank ? 'bg-[#254191] text-white border-blue-900 shadow-md' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                }`}>
                <Droplets size={18} className={showWaterTank ? 'text-blue-300' : 'text-gray-400'}/> Certificado de Higienização (Caixa D'água)
                {showWaterTank && <CheckCircle2 size={16} className="ml-auto" />}
              </button>
            </div>
            {(!showPestControl && !showWaterTank) && (
              <p className="text-red-500 text-xs mt-3 font-bold flex items-center gap-1 justify-center bg-red-50 p-2 rounded">
                <AlertTriangle size={14} /> Atenção: Selecione pelo menos um documento para poder imprimir.
              </p>
            )}
          </div>

          {/* SELECAO DE PRAGAS */}
          {showPestControl && (
            <div>
              <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider border-b pb-1 mb-3">Seleção de Pragas e Vetores</h4>
              <div className="flex flex-wrap gap-2">
                {pestOptions.map(pest => (
                  <button key={pest.id} onClick={() => togglePest(pest.id)}
                    className={`flex-1 min-w-[100px] p-2 text-xs font-bold rounded border transition-all flex items-center justify-center gap-1 ${
                      formData.selectedPests.includes(pest.id)
                        ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}>
                    {formData.selectedPests.includes(pest.id) && <CheckCircle2 size={14} />}
                    {pest.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* DADOS GERAIS + CLIENTE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-4">
              <h4 className="font-bold text-[13px] text-[#5c6a8a] uppercase tracking-widest border-b border-gray-300/80 pb-2 mb-5">Dados Gerais</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-[#3b4b73] mb-1.5">Nº Laudo</label>
                  <input type="text" name="laudoNumero" value={formData.laudoNumero} onChange={handleInputChange}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-md text-sm focus:border-[#3b4b73] focus:ring-1 focus:ring-[#3b4b73] outline-none shadow-sm" />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[#3b4b73] mb-1.5">Data Execução</label>
                  <input type="date" name="dataExecucao" value={formData.dataExecucao} onChange={handleInputChange}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-md text-sm focus:border-[#3b4b73] focus:ring-1 focus:ring-[#3b4b73] outline-none shadow-sm" />
                </div>
                {showPestControl && (
                  <>
                    <div>
                      <label className="block text-[12px] font-bold text-[#3b4b73] mb-1.5">Garantia Pragas (Meses)</label>
                      <input type="number" name="garantiaMeses" value={formData.garantiaMeses} onChange={handleInputChange}
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-md text-sm focus:border-[#3b4b73] focus:ring-1 focus:ring-[#3b4b73] outline-none shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-[#3b4b73] mb-1.5">Próxima Manutenção</label>
                      <input type="text" value={getExpiryDate(formData.dataExecucao, formData.garantiaMeses)} disabled
                        className="w-full p-2.5 bg-[#e9ecef] border border-gray-200 rounded-md text-sm text-gray-500 cursor-not-allowed shadow-inner" />
                    </div>
                  </>
                )}
              </div>
            </div>

            <ClienteSection
              clientData={formData.cliente}
              onChange={handleClientChange}
              mode="editor"
            />
          </div>

          {/* RESERVATORIOS */}
          {showWaterTank && (
            <div className="border-t pt-4 mt-2">
              <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider border-b pb-1 mb-3">Reservatórios (Higienização)</h4>
              {formData.reservatorios.map((res, idx) => (
                <div key={idx} className="flex gap-2 mb-2 items-end bg-gray-50 p-2 rounded">
                  <div className="w-20">
                    <label className="block text-[10px] font-bold text-gray-500">Qtd</label>
                    <input type="text" value={res.quantidade} onChange={(e) => updateReservatorio(idx, 'quantidade', e.target.value)} className="w-full p-1 border rounded text-xs" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-500">Tipo</label>
                    <input type="text" value={res.tipo} onChange={(e) => updateReservatorio(idx, 'tipo', e.target.value)} className="w-full p-1 border rounded text-xs" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-500">Volume</label>
                    <input type="text" value={res.volume} onChange={(e) => updateReservatorio(idx, 'volume', e.target.value)} className="w-full p-1 border rounded text-xs" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-500">Identificação</label>
                    <input type="text" value={res.identificacao} onChange={(e) => updateReservatorio(idx, 'identificacao', e.target.value)} className="w-full p-1 border rounded text-xs" />
                  </div>
                  <button onClick={() => removeReservatorio(idx)} className="p-1.5 text-red-500 hover:bg-red-100 rounded"><Trash2 size={16}/></button>
                </div>
              ))}
              <button onClick={addReservatorio} className="text-xs flex items-center gap-1 text-blue-600 font-bold mt-2 hover:bg-blue-50 px-2 py-1 rounded">
                <Plus size={14} /> Adicionar Reservatório
              </button>
            </div>
          )}

          {/* RESPONSAVEIS */}
          <div className="mt-4 border-t pt-4">
            <label className="block text-xs font-bold text-gray-700 mb-1">Responsáveis pela Execução</label>
            <input type="text" name="responsaveis" value={formData.responsaveis} onChange={handleInputChange}
              list="responsaveis-suggestions"
              className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            <datalist id="responsaveis-suggestions">
              <option value="MARIA APARECIDA DE OLIVEIRA BORGES" />
              <option value="PAULO BORGES DE CASTRO" />
              <option value="PAULO BORGES DE CASTRO e MARIA APARECIDA DE OLIVEIRA BORGES" />
            </datalist>
          </div>

          {/* OBSERVACOES */}
          {showPestControl && (
            <div className="mt-4 border-t pt-4">
              <label className="block text-xs font-bold text-gray-700 mb-1">Observações Adicionais (Página Controle de Pragas)</label>
              <textarea name="observacao" value={formData.observacao} onChange={handleInputChange} rows="2"
                className="w-full p-2 border rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none min-h-[40px]"
                placeholder="Digite aqui alguma observação específica..." />
            </div>
          )}
        </div>
      </EditorPanel>

      {/* BOTAO IMPRIMIR FLUTUANTE */}
      <div className="fixed bottom-6 right-6 z-50 no-print">
        <button onClick={handlePrint} disabled={!showPestControl && !showWaterTank}
          className={`${(!showPestControl && !showWaterTank) ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#254191] hover:bg-blue-800'} text-white p-4 rounded-full shadow-2xl flex items-center gap-3 transition-all transform hover:scale-105 font-bold`}>
          <ClipboardCheck size={24} />
          <span className="pr-2 tracking-tight uppercase text-xs">Imprimir Documentos A4</span>
        </button>
      </div>

      {/* ==================== PAGINA 1: LAUDO PRAGAS ==================== */}
      {showPestControl && (
        <div className="a4-page relative bg-white shadow-2xl p-[15mm] flex flex-col print:shadow-none print:m-0 overflow-hidden">
          {renderHeader()}
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-xl font-black text-[#254191] uppercase leading-none tracking-tight">
              COMPROVANTE DE EXECUÇÃO DE SERVIÇOS <br/>
              <span className="text-blue-500 text-sm font-bold tracking-widest uppercase italic">CONTROLE DE VETORES E PRAGAS URBANAS</span>
            </h2>
            <div className="text-right border-l-4 border-[#254191] pl-3">
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">Nº {formData.laudoNumero}</p>
              <p className="text-sm font-black text-gray-800 italic leading-tight">{formatDate(formData.dataExecucao)}</p>
            </div>
          </div>

          <div className="mb-4">{renderClientSection()}</div>

          {/* DETALHAMENTO PRAGAS */}
          <section className="mb-4">
            <div className="flex justify-between items-end mb-2 border-b-2 border-blue-600 pb-1">
              <div className="flex items-center gap-2 text-[#254191] font-bold uppercase text-[10px]">
                <Bug size={14} /> Detalhamento do Controle de Vetores e Pragas
              </div>
              <div className="flex gap-4 text-[9px] font-bold text-gray-700 pb-0.5">
                <div className="flex items-center gap-1">
                  <div className={`w-3.5 h-3.5 border border-blue-800 flex items-center justify-center ${getControlTypes().quimico ? 'bg-blue-800' : 'bg-white'}`}>
                    {getControlTypes().quimico && <CheckCircle2 size={10} className="text-white" />}
                  </div>
                  <span className="uppercase">Controle Químico</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-3.5 h-3.5 border border-blue-800 flex items-center justify-center ${getControlTypes().naoQuimico ? 'bg-blue-800' : 'bg-white'}`}>
                    {getControlTypes().naoQuimico && <CheckCircle2 size={10} className="text-white" />}
                  </div>
                  <span className="uppercase">Controle Não Químico</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(90px,1fr))] w-full gap-1 mb-3 text-[8px] font-black uppercase text-center">
              {pestOptions.map(p => (
                formData.selectedPests.includes(p.id) && (
                  <div key={p.id} className="bg-[#254191] text-white py-1 rounded shadow-sm border-b-2 border-blue-900/50 flex items-center justify-center whitespace-nowrap px-1">
                    <span className="mr-1">✓</span> {p.label}
                  </div>
                )
              ))}
            </div>

            {/* TABELA DE PRODUTOS */}
            <table className="w-full text-left border-collapse border border-gray-100 text-[9px]">
              <thead className="bg-blue-50 text-[#254191] uppercase font-black text-[8px]">
                <tr>
                  <th className="p-1 border text-center">Grupo Químico</th>
                  <th className="p-1 border">Princípio Ativo</th>
                  <th className="p-1 border text-center">Nº MS</th>
                  <th className="p-1 border text-center">Conc. de Uso</th>
                  <th className="p-1 border text-center">Diluente</th>
                  <th className="p-1 border">Equipamento</th>
                  <th className="p-1 border text-center w-6 no-print"></th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-700 italic font-medium leading-none">
                {productRows.map((prodKey, idx) => {
                  const prod = productsDatabase[prodKey];
                  if (!prod) return null;
                  return (
                    <React.Fragment key={idx}>
                      <tr className="group relative hover:bg-blue-50/50 transition-colors">
                        <td className="p-1 border text-center text-[8px] relative">
                          {prod.grupo}
                          <select className="absolute inset-0 w-full h-full opacity-0 cursor-pointer no-print" value={prodKey}
                            onChange={(e) => updateRow(idx, e.target.value)}>
                            {compatibleProducts.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                          </select>
                        </td>
                        <td className="p-1 border font-bold uppercase not-italic relative">
                          {prod.principio}
                          <span className="block text-[7px] text-gray-400 font-normal no-print">{prod.nome}</span>
                        </td>
                        <td className="p-1 border text-center font-mono tracking-tighter text-[8px]">{prod.registro}</td>
                        <td className="p-1 border text-center text-[8px] italic">{prod.concentracao}</td>
                        <td className="p-1 border text-center">{prod.diluente}</td>
                        <td className="p-1 border">{prod.equipamento}</td>
                        <td className="p-0 border text-center no-print align-middle">
                          <button onClick={() => removeRow(idx)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"><Trash2 size={12} /></button>
                        </td>
                      </tr>
                      <tr>
                        <td colSpan="7" className="p-1 border text-[8px] italic text-zinc-600 bg-gray-50/50">{prod.antidoto}</td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-2 text-center no-print">
              <button onClick={addRow} className="text-xs flex items-center justify-center gap-1 mx-auto text-blue-600 hover:text-blue-800 font-bold py-1 px-3 rounded border border-blue-200 hover:bg-blue-50">
                <Plus size={12} /> Adicionar Produto
              </button>
            </div>
          </section>

          {/* OBSERVACOES */}
          {formData.observacao && (
            <section className="bg-zinc-50 py-1.5 px-3 rounded-lg border border-zinc-200 mb-2 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-zinc-400 opacity-50"></div>
              <div className="flex items-center gap-2 font-black uppercase mb-0.5 border-b border-zinc-200 pb-0.5 text-zinc-600 text-[9px] tracking-tight italic">
                <Info size={12} /> Observações
              </div>
              <p className="text-[8px] text-zinc-700 leading-[1.1] font-bold italic whitespace-pre-wrap">{formData.observacao}</p>
            </section>
          )}

          {/* RECOMENDACOES ANVISA */}
          <section className="bg-[#fff5f5] py-2 px-4 rounded-lg border border-[#fee2e2] mb-3 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#a02c2c] opacity-10"></div>
            <div className="flex items-center gap-2 font-black uppercase mb-1 border-b border-red-100 pb-1 text-[#a02c2c] text-[10px] tracking-tight italic">
              <Info size={14} /> RECOMENDAÇÕES E SEGURANÇA (ANVISA)
            </div>
            <div className="text-[9px] text-[#6d2020] leading-[1.1] italic font-bold space-y-1">
              <p>• Em anexo alvará sanitário.</p>
              <p className="text-justify leading-[1.1]">
                • Não permaneçam pessoas nos locais no momento da desinsetização. Cuidados com crianças e animais.
                Recomenda-se aguardar pelo menos 12 horas antes de reocupar o espaço e mantenha o local com uma boa ventilação.
                Limpeza leve das superfícies.
              </p>
              <div className="pt-1 border-t border-red-100/50 mt-1">
                <p className="font-black text-[#a02c2c] not-italic text-[9px] uppercase tracking-tighter leading-snug">
                  • Nº de telefone no caso de intoxicação: ANVISA – Disque intoxicação - SERVIÇO DE TOXICOLOGIA DE MG:
                  <span className="block text-[10px] mt-0.5">0800-722-6001 / (31) 3224-4000 / (31) 3239-9308 / (31) 3239-9223</span>
                </p>
              </div>
            </div>
          </section>

          {renderWarrantySection("mb-4")}
          {renderSignatureSection()}
          {renderFooterInfo()}
        </div>
      )}

      {/* ==================== PAGINA 2: HIGIENIZACAO ==================== */}
      {showWaterTank && (
        <div className={`a4-page relative bg-white shadow-2xl p-[15mm] flex flex-col print:shadow-none print:m-0 overflow-hidden ${showPestControl ? 'print-page-break' : ''}`}>
          {renderHeader()}
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-xl font-black text-[#254191] uppercase leading-none tracking-tight">
              Certificado de Higienização <br/>
              <span className="text-blue-500 text-sm font-bold tracking-widest uppercase italic">Reservatórios de Água</span>
            </h2>
            <div className="text-right border-l-4 border-blue-500 pl-3">
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">Nº {formData.laudoNumero}</p>
              <p className="text-sm font-black text-gray-800 italic leading-tight">{formatDate(formData.dataExecucao)}</p>
            </div>
          </div>

          <div className="mb-4">{renderClientSection()}</div>

          {/* ESPECIFICACOES */}
          <section className="mb-4 bg-blue-50/30 p-4 rounded-lg border border-blue-100 shadow-sm">
            <p className="font-bold text-[#254191] uppercase text-[9px] mb-2 flex items-center gap-2 italic border-b border-blue-200 pb-1">
              <Droplets size={12} /> Especificações do Serviço
            </p>
            <div className="text-[9px] text-zinc-700 leading-tight">
              <p className="mb-2 italic"><span className="font-bold text-blue-800">ESPECIFICA-SE:</span> A higienização da caixa d'água é o processo de retirada de matéria depositada ou em suspensão no reservatório de água potável.</p>
              <div className="mb-2 pl-2 border-l-2 border-blue-300">
                <p className="font-bold text-blue-800 mb-0.5">Lavagem e higienização dos reservatórios de d'água:</p>
                {formData.reservatorios.map((res, index) => (
                  <p key={index}>• {res.quantidade} {res.tipo} de {res.volume} cada ({res.identificacao})</p>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 mb-2 pt-2 border-t border-blue-200">
                <div className="space-y-1 border-r border-blue-200 pr-2">
                  <p><span className="font-bold text-blue-800">PRODUTO:</span> Qboa (Hipoclorito de Sódio 2.0% a 2.5%)</p>
                  <p><span className="font-bold text-blue-800">FINALIDADE:</span> Limpeza física e desinfeção bacteriológica.</p>
                </div>
                <div className="space-y-1 pl-2">
                  <p><span className="font-bold text-blue-800">Dosagem Técnica:</span> Solução técnica concentrada 1/5.</p>
                  <p><span className="font-bold text-blue-800">CONCENTRAÇÃO:</span> Teor de cloro ativo: 2,0% a 2,5% - Reg.MS 3.1940.0002.003-7</p>
                </div>
              </div>
              <p className="pt-2 border-t border-blue-200"><span className="font-bold text-blue-800">Responsáveis pela execução do serviço:</span> {formData.responsaveis}.</p>
            </div>
          </section>

          {/* PROTOCOLO TECNICO */}
          <section className="mb-4 overflow-hidden">
            <div className="flex items-center gap-2 text-[#254191] font-bold uppercase text-[10px] mb-2 border-b border-blue-200 pb-1 italic">
              <ClipboardCheck size={14} /> Protocolo Técnico Operacional Realizado
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0">
              {procedimentosHigienizacao.map((step, index) => (
                <div key={index} className="flex items-start gap-1 bg-zinc-50/50 p-[2px] rounded border border-zinc-100 mb-0.5">
                  <span className="text-[#254191] font-black text-[9px] min-w-[12px] text-right mr-1 leading-[0.9]">{index + 1}.</span>
                  <p className="text-[8px] leading-[0.95] text-zinc-700 font-bold italic tracking-tight text-justify">{step}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="bg-red-50 border border-red-200 py-3 px-3 rounded-lg mb-4 flex items-center justify-start gap-3 shadow-sm">
            <AlertTriangle size={16} className="text-[#a02c2c] shrink-0" />
            <div className="flex items-center gap-2 flex-wrap leading-none">
              <span className="font-bold text-[#a02c2c] text-[8px] uppercase tracking-tight">Nº DE TELEFONE NO CASO DE INTOXICAÇÃO: ANVISA – DISQUE INTOXICAÇÃO</span>
              <span className="text-red-300 font-light hidden md:inline">|</span>
              <span className="font-black text-[#a02c2c] text-[8px] uppercase tracking-tight">SERVIÇO DE TOXICOLOGIA DE MG: 0800-722-6001 / (31) 3224-4000 / (31) 3239-9308</span>
            </div>
          </div>

          {renderWarrantySection("mb-4", 6)}
          {renderSignatureSection()}
          {renderFooterInfo()}
        </div>
      )}

      {/* ==================== PAGINA 3: ALVARA (ANEXO) ==================== */}
      <div className={`a4-page relative bg-white shadow-2xl flex flex-col items-center justify-center print:shadow-none print:m-0 overflow-hidden ${(!showPestControl && !showWaterTank) ? 'hidden' : ''} ${(showPestControl || showWaterTank) ? 'print-page-break' : ''} ${!alvaraImage ? 'print:hidden' : ''}`}>
        {!alvaraImage ? (
          <div onClick={() => alvaraInputRef.current.click()}
            className="w-full h-full flex flex-col items-center justify-center border-4 border-dashed border-gray-200 m-[15mm] rounded-2xl cursor-pointer hover:bg-blue-50/50 transition-colors no-print group p-10 text-center"
            style={{ width: 'calc(100% - 30mm)', height: 'calc(100% - 30mm)' }}>
            <input type="file" ref={alvaraInputRef} onChange={handleAlvaraUpload} accept="image/*" className="hidden" />
            <div className="bg-white p-6 rounded-full shadow-sm mb-6 group-hover:scale-110 transition-transform">
              <Upload size={64} className="text-blue-300 group-hover:text-blue-600 transition-colors" />
            </div>
            <h2 className="text-3xl font-black text-gray-400 group-hover:text-blue-800 uppercase tracking-tight transition-colors">Anexar Alvará Sanitário</h2>
            <p className="text-gray-400 mt-4 text-base max-w-md">Clique para adicionar uma imagem <strong className="text-gray-600">(JPG ou PNG)</strong> do seu Alvará Sanitário escaneado.</p>
            <p className="text-red-400 mt-4 text-xs font-bold uppercase tracking-widest">* Esta página não será impressa se estiver vazia.</p>
          </div>
        ) : (
          <div className="w-full h-full relative group p-[5mm]">
            <img src={alvaraImage} alt="Alvará Sanitário Anexado" className="w-full h-full object-contain" />
            <button onClick={() => setAlvaraImage(null)}
              className="absolute top-6 right-6 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-all no-print flex items-center gap-2 font-bold text-sm transform hover:scale-105">
              <Trash2 size={16} /> Remover Anexo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
