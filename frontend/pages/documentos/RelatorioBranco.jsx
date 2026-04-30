import React, { useState, useEffect, useRef } from 'react';
import { Edit3, ChevronDown, ChevronUp, Plus, Search, FileText } from 'lucide-react';
import { useCnpjAutofill } from '../../hooks/useCnpjAutofill';
import { CnpjInput } from '../../components/shared/CnpjInput';
import { salvarDocumento } from '../../utils/salvarDocumento';
import { fetchProximoNumero } from '../../utils/proximoNumeroDoc';
import { BotoesDocumento } from '../../components/documentos/BotoesDocumento';
import { ClientePickerModal } from '../../components/documentos/ClientePickerModal';
import DocumentHeader from '../../components/documentos/DocumentHeader';
import DocumentFooter from '../../components/documentos/DocumentFooter';
import ClienteSection from '../../components/documentos/ClienteSection';
import { getClientes, saveCliente } from '../../services/clienteCache';
import { registrarDocumentoNaAgenda } from '../../services/agendaService';

export default function RelatorioBranco() {
  const fileInputRef = useRef(null);
  const [logo, setLogo] = useState(null);
  const [showEditor, setShowEditor] = useState(true);
  const [salvandoPdf, setSalvandoPdf] = useState(false);

  const [numeroDoc, setNumeroDoc] = useState(() => {
    try { return localStorage.getItem('relatorioBrancoNumero') || '0001'; } catch { return '0001'; }
  });
  const [titulo, setTitulo] = useState('RELATÓRIO TÉCNICO');
  const [data, setData] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [conteudoLivre, setConteudoLivre] = useState('');

  const [clientData, setClientData] = useState({ nome: '', fantasia: '', cnpj: '', endereco: '', atividade: '' });
  const [clientesSalvos, setClientesSalvos] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);

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
    onClear: () => setClientData(prev => ({ ...prev, cnpj: '' })),
  });

  useEffect(() => { getClientes().then(setClientesSalvos).catch(() => {}); }, []);

  useEffect(() => {
    fetch('/api/config/logo-mascote', { credentials: 'same-origin' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.logo) setLogo(d.logo); })
      .catch(() => {});
  }, []);

  // Pre-fill de cliente vindo de Contratos ("Emitir Documento")
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('__prefill_cliente');
      if (!raw) return;
      sessionStorage.removeItem('__prefill_cliente');
      const c = JSON.parse(raw);
      setClientData(prev => ({ ...prev, nome: c.nome || '', fantasia: c.fantasia || '', cnpj: c.cnpj || '', endereco: c.endereco || '', atividade: c.atividade || '' }));
      if (c.cnpj) setCnpjExternal(c.cnpj);
    } catch {}
  }, []);

  // Re-edição via Arquivos.jsx
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('__editar_documento');
      if (!raw) return;
      const meta = JSON.parse(raw);
      if (meta.__tipo !== 'relatorio_branco') return;
      sessionStorage.removeItem('__editar_documento');
      if (meta.clientData) {
        setClientData(meta.clientData);
        if (meta.clientData.cnpj) setCnpjExternal(meta.clientData.cnpj);
      }
      if (meta.numeroDoc) setNumeroDoc(meta.numeroDoc);
      if (meta.titulo) setTitulo(meta.titulo);
      if (meta.data) setData(meta.data);
      if (meta.conteudoLivre) setConteudoLivre(meta.conteudoLivre);
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('relatorioBrancoNumero', numeroDoc); } catch {}
  }, [numeroDoc]);

  useEffect(() => {
    setClientData(prev => ({ ...prev, cnpj: cnpjValue }));
  }, [cnpjValue]);

  const handleClientChange = (field, value) => setClientData(prev => ({ ...prev, [field]: value }));

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) { const r = new FileReader(); r.onloadend = () => setLogo(r.result); r.readAsDataURL(file); }
  };

  // Número por cliente: busca do servidor quando CNPJ é preenchido
  useEffect(() => {
    if (!clientData.cnpj) return;
    fetchProximoNumero(clientData.cnpj, 'relatorio_branco').then(num => {
      if (num) setNumeroDoc(num);
    });
  }, [clientData.cnpj]);

  const handleSalvarCliente = async () => {
    if (!clientData.nome?.trim() || !clientData.cnpj?.trim()) return;
    await saveCliente({
      nome: clientData.nome, fantasia: clientData.fantasia,
      cnpj: clientData.cnpj, endereco: clientData.endereco, atividade: clientData.atividade,
    });
    getClientes().then(setClientesSalvos).catch(() => {});
  };

  const handlePrint = () => window.print();

  const handleSalvarPdf = async () => {
    if (!clientData.nome && !clientData.fantasia) {
      alert('Selecione ou preencha o cliente antes de salvar.');
      return;
    }
    setSalvandoPdf(true);
    try {
      const nomeEmpresa = clientData.nome || clientData.fantasia || 'Empresa';
      // Aguarda React re-renderizar o DOM antes do html2canvas (igual a Laudos)
      await new Promise(r => setTimeout(r, 50));
      const result = await salvarDocumento({
        elementId: 'a4-document',
        tipo: 'relatorio_branco',
        numeroDoc,
        nomeEmpresa,
        cnpj: clientData.cnpj,
        metadados: { __tipo: 'relatorio_branco', clientData, numeroDoc, titulo, data, conteudoLivre },
      });
      if (result.sucesso) {
        registrarDocumentoNaAgenda(
          'relatorio_branco',
          { nome: clientData.nome, fantasia: clientData.fantasia, cnpj: clientData.cnpj, endereco: clientData.endereco },
          data,
          numeroDoc,
        ).catch(() => {});
        alert(`PDF salvo: ${result.nomeArquivo}`);
      } else {
        alert(`Erro ao salvar: ${result.erro}`);
      }
    } finally {
      setSalvandoPdf(false);
    }
  };

  const dataDisplay = data ? data.split('-').reverse().join('/') : '';

  return (
    <div id="a4-document" className="bg-zinc-200 py-10 print:py-0 print:bg-white flex flex-col print:block items-center gap-4 print:gap-0">

      {/* PAINEL EDITOR */}
      <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-4xl border border-blue-200 mb-8 no-print">
        <div className="flex justify-between items-center mb-6 border-b pb-2">
          <h3 className="font-bold text-lg text-blue-900 flex items-center gap-2">
            <Edit3 size={20} /> Editar Informações do Documento
          </h3>
          <button onClick={() => setShowEditor(v => !v)} className="text-gray-500 hover:text-blue-700" aria-label={showEditor ? 'Recolher editor' : 'Expandir editor'}>
            {showEditor ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {showEditor && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nº do Relatório</label>
                <input type="text" value={numeroDoc} onChange={e => setNumeroDoc(e.target.value)}
                  className="w-full p-2 border rounded text-sm font-semibold text-blue-700 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-gray-700 mb-1">Data</label>
                <input type="date" value={data} onChange={e => setData(e.target.value)}
                  className="w-full p-2 border rounded text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-gray-700 mb-1">Título</label>
                <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)}
                  className="w-full p-2 border rounded text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>

            <div className="flex gap-2 items-end">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="flex-1 flex items-center gap-2 p-2 border border-slate-300 rounded text-sm bg-white hover:bg-slate-50 text-slate-700 transition-colors"
              >
                <Search size={16} className="text-slate-400" />
                <span className="truncate">Buscar cliente salvo...</span>
                <span className="ml-auto text-xs text-slate-400">{clientesSalvos.length} salvo{clientesSalvos.length === 1 ? '' : 's'}</span>
              </button>
              <button onClick={handleSalvarCliente}
                className="px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded flex items-center gap-1 shrink-0">
                <Plus size={14} /> Salvar Cliente
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Razão Social / Nome</label>
                <input type="text" value={clientData.nome} onChange={e => handleClientChange('nome', e.target.value)}
                  className="w-full p-2 border rounded text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome Fantasia</label>
                <input type="text" value={clientData.fantasia} onChange={e => handleClientChange('fantasia', e.target.value)}
                  className="w-full p-2 border rounded text-sm outline-none" />
              </div>
              <CnpjInput value={cnpjValue} onChange={handleCnpjChange} isLoading={isLoadingCnpj} status={cnpjStatus} />
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Atividade Econômica</label>
                <input type="text" value={clientData.atividade} onChange={e => handleClientChange('atividade', e.target.value)}
                  className="w-full p-2 border rounded text-sm outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Endereço</label>
                <input type="text" value={clientData.endereco} onChange={e => handleClientChange('endereco', e.target.value)}
                  className="w-full p-2 border rounded text-sm outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Conteúdo do Relatório</label>
              <textarea
                value={conteudoLivre}
                onChange={e => setConteudoLivre(e.target.value)}
                rows={14}
                placeholder="Digite livremente o conteúdo deste relatório..."
                className="w-full p-2 border rounded text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none resize-y leading-relaxed"
              />
            </div>
          </div>
        )}
      </div>

      <BotoesDocumento onSalvarPdf={handleSalvarPdf} onImprimir={handlePrint} salvandoPdf={salvandoPdf} />

      <ClientePickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        clientes={clientesSalvos}
        onSelect={(c) => {
          setCnpjExternal(c.cnpj || '');
          setClientData(prev => ({
            ...prev,
            nome: c.nome, fantasia: c.fantasia, cnpj: c.cnpj,
            endereco: c.endereco, atividade: c.atividade,
          }));
        }}
      />

      <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />

      {/* PÁGINA A4 */}
      <div className="a4-page relative bg-white shadow-2xl p-[15mm] flex flex-col print:shadow-none print:m-0 overflow-hidden text-slate-800">
        <DocumentHeader logo={logo} onLogoClick={() => fileInputRef.current?.click()} variant="laudo" />

        {/* Título + número/data */}
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-xl font-black text-[#254191] uppercase leading-none tracking-tight">
            {titulo || 'RELATÓRIO'}
            <br/>
            <span className="text-blue-500 text-sm font-bold tracking-widest uppercase italic">Documento Técnico</span>
          </h2>
          <div className="text-right border-l-4 border-[#254191] pl-3">
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">Nº {numeroDoc}</p>
            <p className="text-sm font-black text-gray-800 italic leading-tight">{dataDisplay}</p>
          </div>
        </div>

        <ClienteSection clientData={clientData} mode="document" />

        {/* Conteúdo livre */}
        <section className="flex-1 mb-4">
          <div
            className="text-[11px] text-gray-700 leading-relaxed whitespace-pre-wrap font-medium"
            style={{ wordBreak: 'break-word' }}
          >
            {conteudoLivre || (
              <span className="italic text-gray-300 print:hidden">
                (O conteúdo digitado no editor aparecerá aqui na visualização do documento.)
              </span>
            )}
          </div>
        </section>

        <DocumentFooter variant="laudo" />
      </div>

      <style>{`
        .a4-page { width: 210mm; height: 297mm; min-height: 297mm; position: relative; }
        @media print {
          @page { size: A4; margin: 0; }
          html, body, #root, #root > div {
            height: auto !important; min-height: 0 !important; overflow: visible !important;
            background: white !important; margin: 0 !important; padding: 0 !important;
          }
          main { padding: 0 !important; }
          nav, aside { display: none !important; }
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
      `}</style>
    </div>
  );
}
