import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Edit3, ChevronDown, ChevronUp, Plus, Trash2, Search, Bug,
  Droplets, Zap, Target, ClipboardList,
} from 'lucide-react';
import { useCnpjAutofill } from '../../hooks/useCnpjAutofill';
import { CnpjInput } from '../../components/shared/CnpjInput';
import { useProdutos } from '../../contexts/ProdutosContext';
import { salvarDocumento } from '../../utils/salvarDocumento';
import { BotoesDocumento } from '../../components/documentos/BotoesDocumento';
import { ClientePickerModal } from '../../components/documentos/ClientePickerModal';
import DocumentHeader from '../../components/documentos/DocumentHeader';
import DocumentFooter from '../../components/documentos/DocumentFooter';
import ClienteSection from '../../components/documentos/ClienteSection';
import { getClientes, saveCliente } from '../../services/clienteCache';
import { registrarDocumentoNaAgenda } from '../../services/agendaService';

// Catálogo dos tipos de bloco que o relatório mensal pode conter
const TIPOS_BLOCO = [
  { id: 'desratizacao_quimica', label: 'Desratização (Controle Químico)', icon: Bug,      titulo: 'CONTROLE QUÍMICO DE ROEDORES',     subtitulo: 'Aplicação de produto químico contra ratos e camundongos' },
  { id: 'iscagem',               label: 'Desratização (Iscagem)',          icon: Target,    titulo: 'ISCAGEM PARA ROEDORES',             subtitulo: 'Distribuição de iscas em pontos estratégicos' },
  { id: 'desinsetizacao',        label: 'Desinsetização',                  icon: Droplets,  titulo: 'DESINSETIZAÇÃO',                    subtitulo: 'Controle químico de insetos rasteiros e voadores' },
  { id: 'armadilha_luminosa',    label: 'Armadilhas Luminosas',            icon: Zap,       titulo: 'ARMADILHAS LUMINOSAS',              subtitulo: 'Captura e monitoramento de insetos voadores' },
  { id: 'feromonio',             label: 'Armadilhas com Feromônios',       icon: Target,    titulo: 'ARMADILHAS COM FEROMÔNIOS',         subtitulo: 'Monitoramento e captura por atração feromonal' },
];

const TIPO_BY_ID = Object.fromEntries(TIPOS_BLOCO.map(t => [t.id, t]));

function novoBloco(tipo) {
  return {
    id: `${tipo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tipo,
    dataExecucao: new Date().toISOString().slice(0, 10),
    produtos: [],
    observacao: '',
  };
}

export default function RelatorioMensal() {
  const fileInputRef = useRef(null);
  const [logo, setLogo] = useState(null);
  const [showEditor, setShowEditor] = useState(true);
  const [salvandoPdf, setSalvandoPdf] = useState(false);
  const [tipoMenuAberto, setTipoMenuAberto] = useState(false);

  const { produtos: produtosCtx } = useProdutos();
  const produtosOptions = useMemo(() => (produtosCtx || []), [produtosCtx]);

  const [numeroDoc, setNumeroDoc] = useState(() => {
    try { return localStorage.getItem('relatorioMensalNumero') || '0001'; } catch { return '0001'; }
  });

  const hojeIso = new Date().toISOString().slice(0, 10);
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [dataFim, setDataFim] = useState(hojeIso);

  const [blocos, setBlocos] = useState(() => [novoBloco('desratizacao_quimica')]);

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

  // Re-edição
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('__editar_documento');
      if (!raw) return;
      const meta = JSON.parse(raw);
      if (meta.__tipo !== 'relatorio_mensal') return;
      sessionStorage.removeItem('__editar_documento');
      if (meta.clientData) {
        setClientData(meta.clientData);
        if (meta.clientData.cnpj) setCnpjExternal(meta.clientData.cnpj);
      }
      if (meta.numeroDoc) setNumeroDoc(meta.numeroDoc);
      if (meta.dataInicio) setDataInicio(meta.dataInicio);
      if (meta.dataFim) setDataFim(meta.dataFim);
      if (Array.isArray(meta.blocos) && meta.blocos.length) setBlocos(meta.blocos);
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('relatorioMensalNumero', numeroDoc); } catch {}
  }, [numeroDoc]);

  useEffect(() => {
    setClientData(prev => ({ ...prev, cnpj: cnpjValue }));
  }, [cnpjValue]);

  const handleClientChange = (field, value) => setClientData(prev => ({ ...prev, [field]: value }));

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) { const r = new FileReader(); r.onloadend = () => setLogo(r.result); r.readAsDataURL(file); }
  };

  const handleSalvarCliente = async () => {
    if (!clientData.nome?.trim() || !clientData.cnpj?.trim()) return;
    await saveCliente({
      nome: clientData.nome, fantasia: clientData.fantasia,
      cnpj: clientData.cnpj, endereco: clientData.endereco, atividade: clientData.atividade,
    });
    getClientes().then(setClientesSalvos).catch(() => {});
  };

  const adicionarBloco = (tipo) => {
    setBlocos(prev => [...prev, novoBloco(tipo)]);
    setTipoMenuAberto(false);
  };

  const removerBloco = (id) => setBlocos(prev => prev.filter(b => b.id !== id));

  const atualizarBloco = (id, patch) =>
    setBlocos(prev => prev.map(b => (b.id === id ? { ...b, ...patch } : b)));

  const adicionarProduto = (blocoId, produtoId) => {
    if (!produtoId) return;
    const produto = produtosOptions.find(p => String(p.id) === String(produtoId));
    if (!produto) return;
    setBlocos(prev => prev.map(b => {
      if (b.id !== blocoId) return b;
      if (b.produtos.some(p => String(p.id) === String(produto.id))) return b;
      return { ...b, produtos: [...b.produtos, produto] };
    }));
  };

  const removerProduto = (blocoId, produtoId) => {
    setBlocos(prev => prev.map(b => (
      b.id !== blocoId ? b : { ...b, produtos: b.produtos.filter(p => String(p.id) !== String(produtoId)) }
    )));
  };

  const handlePrint = () => window.print();

  const handleSalvarPdf = async () => {
    if (!clientData.nome && !clientData.fantasia) {
      alert('Selecione ou preencha o cliente antes de salvar.');
      return;
    }
    if (blocos.length === 0) {
      alert('Adicione pelo menos um bloco de serviço ao relatório.');
      return;
    }
    setSalvandoPdf(true);
    try {
      const nomeEmpresa = clientData.nome || clientData.fantasia || 'Empresa';
      const result = await salvarDocumento({
        elementId: 'a4-document',
        tipo: 'relatorio_mensal',
        numeroDoc,
        nomeEmpresa,
        metadados: {
          __tipo: 'relatorio_mensal',
          clientData, numeroDoc, dataInicio, dataFim,
          blocos: blocos.map(b => ({
            ...b,
            produtos: b.produtos.map(p => ({
              id: p.id, nome: p.nome, principio: p.principio,
              registro: p.registro, grupo: p.grupo, concentracao: p.concentracao,
              diluente: p.diluente, equipamento: p.equipamento, antidoto: p.antidoto,
            })),
          })),
        },
      });
      if (result.sucesso) {
        registrarDocumentoNaAgenda(
          'relatorio_mensal',
          { nome: clientData.nome, fantasia: clientData.fantasia, cnpj: clientData.cnpj, endereco: clientData.endereco },
          dataFim,
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

  const formatBR = (iso) => iso ? iso.split('-').reverse().join('/') : '';
  const periodoLabel = `${formatBR(dataInicio)} a ${formatBR(dataFim)}`;

  return (
    <div id="a4-document" className="bg-zinc-200 py-10 print:py-0 print:bg-white flex flex-col print:block items-center gap-4 print:gap-0">

      {/* PAINEL EDITOR */}
      <div className="bg-[#f4f6f9] p-6 md:p-8 rounded-2xl shadow-sm w-full max-w-[210mm] border border-gray-300/60 print:hidden relative mb-8">
        <div
          className="flex justify-between items-center mb-6 pb-4 border-b border-gray-300/80 cursor-pointer"
          onClick={() => setShowEditor(v => !v)}
        >
          <h3 className="font-extrabold text-xl text-[#3b4b73] flex items-center gap-3">
            <ClipboardList size={22} /> Editar Relatório Mensal
          </h3>
          <button className="text-gray-500 hover:text-[#3b4b73] transition-colors" aria-label={showEditor ? 'Recolher editor' : 'Expandir editor'}>
            {showEditor ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </button>
        </div>

        {showEditor && (
          <div className="space-y-6">

            {/* Dados Gerais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#3b4b73] mb-1.5">Nº Relatório</label>
                <input type="text" value={numeroDoc} onChange={e => setNumeroDoc(e.target.value)}
                  className="w-full p-2.5 text-center bg-white border border-gray-200 rounded-md text-sm font-semibold text-blue-700 outline-none shadow-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#3b4b73] mb-1.5">Início do Período</label>
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-md text-sm text-gray-800 outline-none shadow-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#3b4b73] mb-1.5">Fim do Período</label>
                <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-md text-sm text-gray-800 outline-none shadow-sm" />
              </div>
            </div>

            {/* Cliente */}
            <div className="space-y-3">
              <h4 className="font-bold text-[11px] text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-2">Cliente</h4>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input type="text" placeholder="Razão Social / Nome" value={clientData.nome}
                  onChange={e => handleClientChange('nome', e.target.value)}
                  className="w-full p-2 border rounded text-sm outline-none" />
                <input type="text" placeholder="Nome Fantasia" value={clientData.fantasia}
                  onChange={e => handleClientChange('fantasia', e.target.value)}
                  className="w-full p-2 border rounded text-sm outline-none" />
                <CnpjInput value={cnpjValue} onChange={handleCnpjChange} isLoading={isLoadingCnpj} status={cnpjStatus} />
                <input type="text" placeholder="Atividade Econômica" value={clientData.atividade}
                  onChange={e => handleClientChange('atividade', e.target.value)}
                  className="w-full p-2 border rounded text-sm outline-none" />
                <input type="text" placeholder="Endereço" value={clientData.endereco}
                  onChange={e => handleClientChange('endereco', e.target.value)}
                  className="md:col-span-2 w-full p-2 border rounded text-sm outline-none" />
              </div>
            </div>

            {/* Blocos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-[11px] text-gray-500 uppercase tracking-widest">Blocos de Serviço ({blocos.length})</h4>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setTipoMenuAberto(v => !v)}
                    className="flex items-center gap-2 bg-[#3b528b] text-white px-4 py-2 rounded-lg hover:bg-[#2c3d69] font-bold text-xs shadow-md"
                  >
                    <Plus size={16} /> Adicionar Bloco
                  </button>
                  {tipoMenuAberto && (
                    <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl z-20 overflow-hidden">
                      {TIPOS_BLOCO.map(t => {
                        const Icon = t.icon;
                        return (
                          <button
                            key={t.id}
                            onClick={() => adicionarBloco(t.id)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-blue-50 border-b border-gray-100 last:border-0"
                          >
                            <Icon size={16} className="text-[#254191] flex-shrink-0" />
                            <span className="text-sm text-gray-700">{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {blocos.map((bloco, idx) => {
                const tipoInfo = TIPO_BY_ID[bloco.tipo];
                const Icon = tipoInfo?.icon || Bug;
                return (
                  <div key={bloco.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon size={18} className="text-[#254191]" />
                        <span className="font-bold text-sm text-[#254191]">
                          Bloco {idx + 1}: {tipoInfo?.label || bloco.tipo}
                        </span>
                      </div>
                      <button onClick={() => removerBloco(bloco.id)}
                        className="text-red-400 hover:text-red-600" aria-label="Remover bloco">
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">Data de execução</label>
                        <input type="date" value={bloco.dataExecucao}
                          onChange={e => atualizarBloco(bloco.id, { dataExecucao: e.target.value })}
                          className="w-full p-2 border rounded text-xs outline-none" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">Adicionar produto</label>
                        <select
                          onChange={(e) => { adicionarProduto(bloco.id, e.target.value); e.target.value = ''; }}
                          className="w-full p-2 border rounded text-xs outline-none bg-white"
                          defaultValue=""
                        >
                          <option value="" disabled>— selecione um produto —</option>
                          {produtosOptions.map(p => (
                            <option key={p.id} value={p.id}>{p.nome}{p.principio ? ` (${p.principio})` : ''}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {bloco.produtos.length > 0 && (
                      <div className="mb-3 space-y-1">
                        {bloco.produtos.map(p => (
                          <div key={p.id} className="flex items-center justify-between bg-blue-50/50 border border-blue-100 rounded px-3 py-1.5 text-xs">
                            <span className="text-gray-700">
                              <strong className="text-[#254191]">{p.nome}</strong>
                              {p.principio && <span className="text-gray-500"> — {p.principio}</span>}
                              {p.registro && <span className="text-gray-400"> · MS {p.registro}</span>}
                            </span>
                            <button onClick={() => removerProduto(bloco.id, p.id)}
                              className="text-red-300 hover:text-red-600" aria-label="Remover produto">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">Observações</label>
                      <textarea
                        rows={2}
                        value={bloco.observacao}
                        onChange={e => atualizarBloco(bloco.id, { observacao: e.target.value })}
                        placeholder="Locais aplicados, comportamento de pragas, recomendações..."
                        className="w-full p-2 border rounded text-xs outline-none resize-y"
                      />
                    </div>
                  </div>
                );
              })}

              {blocos.length === 0 && (
                <p className="text-center text-sm text-gray-400 italic py-6">
                  Nenhum bloco adicionado. Clique em "Adicionar Bloco" para começar.
                </p>
              )}
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

      {/* PÁGINAS A4 — uma por bloco */}
      {blocos.map((bloco, idx) => {
        const tipoInfo = TIPO_BY_ID[bloco.tipo];
        return (
          <div key={bloco.id} className="a4-page relative bg-white shadow-2xl p-[15mm] flex flex-col print:shadow-none print:m-0 overflow-hidden text-slate-800">
            <DocumentHeader logo={logo} onLogoClick={() => fileInputRef.current?.click()} variant="laudo" />

            {/* Cabeçalho do relatório */}
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-xl font-black text-[#254191] uppercase leading-none tracking-tight">
                RELATÓRIO MENSAL
                <br/>
                <span className="text-blue-500 text-sm font-bold tracking-widest uppercase italic">
                  {tipoInfo?.titulo || 'SERVIÇO'} ({idx + 1}/{blocos.length})
                </span>
              </h2>
              <div className="text-right border-l-4 border-[#254191] pl-3">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">Nº {numeroDoc}</p>
                <p className="text-[10px] font-black text-gray-800 italic leading-tight">{periodoLabel}</p>
              </div>
            </div>

            <ClienteSection clientData={clientData} mode="document" />

            {/* Bloco de serviço */}
            <section className="flex-1 mb-4">
              <div className="bg-blue-50/30 border border-blue-100 rounded-lg p-3 mb-3 print-bg-light-blue">
                <h3 className="text-[#254191] font-black uppercase text-xs tracking-tight mb-1">{tipoInfo?.titulo || 'SERVIÇO'}</h3>
                <p className="text-[10px] text-gray-600 italic">{tipoInfo?.subtitulo}</p>
                <p className="text-[10px] text-gray-700 mt-2">
                  <span className="font-bold text-[#254191]">Data de execução:</span> {formatBR(bloco.dataExecucao)}
                </p>
              </div>

              {bloco.produtos.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-[10px] font-bold text-[#254191] uppercase tracking-widest border-b border-blue-200 pb-1 mb-2">
                    Produtos Aplicados
                  </h4>
                  <table className="w-full text-[9px] border-collapse border border-[#254191]">
                    <thead>
                      <tr className="bg-[#254191] text-white print-bg-blue">
                        <th className="py-1.5 px-2 text-left font-bold uppercase tracking-widest border border-[#1e3575]">Produto</th>
                        <th className="py-1.5 px-2 text-left font-bold uppercase tracking-widest border border-[#1e3575]">Princípio Ativo</th>
                        <th className="py-1.5 px-2 text-left font-bold uppercase tracking-widest border border-[#1e3575]">Grupo</th>
                        <th className="py-1.5 px-2 text-left font-bold uppercase tracking-widest border border-[#1e3575]">Reg. MS</th>
                        <th className="py-1.5 px-2 text-left font-bold uppercase tracking-widest border border-[#1e3575]">Antídoto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bloco.produtos.map((p, i) => (
                        <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                          <td className="py-1 px-2 border border-blue-200 font-semibold text-[#254191]">{p.nome}</td>
                          <td className="py-1 px-2 border border-blue-200">{p.principio || '—'}</td>
                          <td className="py-1 px-2 border border-blue-200">{p.grupo || '—'}</td>
                          <td className="py-1 px-2 border border-blue-200">{p.registro || '—'}</td>
                          <td className="py-1 px-2 border border-blue-200">{p.antidoto || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {bloco.observacao && (
                <div>
                  <h4 className="text-[10px] font-bold text-[#254191] uppercase tracking-widest border-b border-blue-200 pb-1 mb-2">
                    Observações Técnicas
                  </h4>
                  <p className="text-[10px] text-gray-700 leading-relaxed whitespace-pre-wrap">{bloco.observacao}</p>
                </div>
              )}
            </section>

            <DocumentFooter variant="laudo" />
          </div>
        );
      })}

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
