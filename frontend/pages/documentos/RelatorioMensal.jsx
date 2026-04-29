import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Edit3, ChevronDown, ChevronUp, Plus, Trash2, Search, Bug,
  Droplets, Zap, Target, ClipboardList, Package,
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

// ── Catálogo de tipos ──────────────────────────────────────────────────────────
const TIPOS_BLOCO = [
  { id: 'desratizacao_quimica', label: 'Desratização (Controle Químico)', icon: Bug,     titulo: 'CONTROLE QUÍMICO DE ROEDORES',   subtitulo: 'Aplicação de produto químico contra ratos e camundongos', isRoedor: true  },
  { id: 'iscagem',              label: 'Desratização (Iscagem)',          icon: Target,  titulo: 'ISCAGEM PARA ROEDORES',           subtitulo: 'Distribuição de iscas em pontos estratégicos',            isRoedor: true  },
  { id: 'desinsetizacao',       label: 'Desinsetização',                  icon: Droplets,titulo: 'DESINSETIZAÇÃO',                  subtitulo: 'Controle químico de insetos rasteiros e voadores',        isRoedor: false },
  { id: 'armadilha_luminosa',   label: 'Armadilhas Luminosas',            icon: Zap,     titulo: 'ARMADILHAS LUMINOSAS',            subtitulo: 'Captura e monitoramento de insetos voadores',             isRoedor: false },
  { id: 'feromonio',            label: 'Armadilhas com Feromônios',       icon: Target,  titulo: 'ARMADILHAS COM FEROMÔNIOS',       subtitulo: 'Monitoramento e captura por atração feromonal',           isRoedor: false },
];

const TIPO_BY_ID = Object.fromEntries(TIPOS_BLOCO.map(t => [t.id, t]));

const STATUS_PORTA_ISCA = [
  { value: 'consumido',                   label: 'Consumido',                         cor: 'text-green-700 bg-green-50 border-green-200'    },
  { value: 'nao_consumido',               label: 'Não consumido',                     cor: 'text-gray-600 bg-gray-50 border-gray-200'       },
  { value: 'consumido_substituido',       label: 'Houve consumo e substituído',       cor: 'text-blue-700 bg-blue-50 border-blue-200'       },
  { value: 'nao_consumido_substituido',   label: 'Não houve consumo / substituído',   cor: 'text-amber-700 bg-amber-50 border-amber-200'    },
];

function novoPortaIsca(num) {
  return { id: `pi-${Date.now()}-${Math.random().toString(36).slice(2,5)}`, numero: String(num), status: 'nao_consumido' };
}

function novoBloco(tipo) {
  return {
    id: `${tipo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tipo,
    dataExecucao: new Date().toISOString().slice(0, 10),
    produtos: [],
    observacao: '',
    portaIscas: [],           // apenas para tipos isRoedor
    periodicidade: 'MENSAL',
    locais: '',
    datas: '',
    proximaVisita: '',
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

// ── Seção de produto químico (roedores) ───────────────────────────────────────
function ProdutoQuimicoInfo({ produto }) {
  if (!produto) return null;
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[9px] mt-2 border-t border-blue-100 pt-2">
      {produto.grupo       && <p><span className="font-bold text-[#254191]">Grupo Químico:</span> {produto.grupo}</p>}
      {produto.principio   && <p><span className="font-bold text-[#254191]">Princípio Ativo:</span> {produto.principio}</p>}
      {produto.registro    && <p><span className="font-bold text-[#254191]">Nº MS:</span> {produto.registro}</p>}
      {produto.concentracao && <p><span className="font-bold text-[#254191]">Conc. de Uso:</span> {produto.concentracao}</p>}
      {produto.diluente    && <p><span className="font-bold text-[#254191]">Diluente:</span> {produto.diluente}</p>}
      {produto.equipamento && <p><span className="font-bold text-[#254191]">Equipamento:</span> {produto.equipamento}</p>}
      {produto.antidoto    && <p className="col-span-2"><span className="font-bold text-[#254191]">Antídoto:</span> {produto.antidoto}</p>}
    </div>
  );
}

// ── Tabela de Porta-iscas (dentro da página A4) ───────────────────────────────
function TabelaPortaIscas({ portaIscas }) {
  if (!portaIscas || portaIscas.length === 0) return null;

  // Agrupa em grupos de 2 colunas para aproveitar largura A4
  return (
    <div className="mb-3">
      <h4 className="text-[10px] font-bold text-[#254191] uppercase tracking-widest border-b border-blue-200 pb-1 mb-2 flex items-center gap-1">
        <Package size={11} /> Monitoramento de Porta-iscas
      </h4>
      <table className="w-full text-[9px] border-collapse border border-[#254191]">
        <thead>
          <tr className="bg-[#254191] text-white print-bg-blue">
            <th className="py-1.5 px-2 text-center font-bold uppercase border border-[#1e3575] w-16">Nº</th>
            <th className="py-1.5 px-2 text-left font-bold uppercase border border-[#1e3575]">Status</th>
            <th className="py-1.5 px-2 text-center font-bold uppercase border border-[#1e3575] w-16">Nº</th>
            <th className="py-1.5 px-2 text-left font-bold uppercase border border-[#1e3575]">Status</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.ceil(portaIscas.length / 2) }, (_, rowIdx) => {
            const a = portaIscas[rowIdx * 2];
            const b = portaIscas[rowIdx * 2 + 1];
            const statusA = STATUS_PORTA_ISCA.find(s => s.value === a?.status);
            const statusB = b ? STATUS_PORTA_ISCA.find(s => s.value === b?.status) : null;
            const bg = rowIdx % 2 === 0 ? 'bg-white' : 'bg-blue-50/40';
            return (
              <tr key={rowIdx} className={bg}>
                <td className="py-1 px-2 text-center border border-blue-200 font-bold text-[#254191]">{a?.numero}</td>
                <td className="py-1 px-2 border border-blue-200">{statusA?.label || '—'}</td>
                <td className="py-1 px-2 text-center border border-blue-200 font-bold text-[#254191]">{b?.numero || ''}</td>
                <td className="py-1 px-2 border border-blue-200">{statusB?.label || ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Seção de visitas/locais ───────────────────────────────────────────────────
function InfoVisita({ bloco }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[9px] mb-3 bg-blue-50/30 border border-blue-100 rounded p-2 print-bg-light-blue">
      {bloco.periodicidade && <p><span className="font-bold text-[#254191]">Periodicidade:</span> {bloco.periodicidade}</p>}
      {bloco.locais        && <p><span className="font-bold text-[#254191]">Locais:</span> {bloco.locais}</p>}
      {bloco.datas         && <p><span className="font-bold text-[#254191]">Datas:</span> {bloco.datas}</p>}
      {bloco.proximaVisita && <p><span className="font-bold text-[#254191]">Próxima visita:</span> {bloco.proximaVisita}</p>}
    </div>
  );
}

// ── Tabela de produtos (para não-roedores) ────────────────────────────────────
function TabelaProdutos({ produtos }) {
  if (!produtos || produtos.length === 0) return null;
  return (
    <div className="mb-2">
      <table className="w-full text-[8px] border-collapse border border-[#254191]">
        <thead>
          <tr className="bg-[#254191] text-white print-bg-blue">
            <th className="py-1 px-2 text-left font-bold uppercase border border-[#1e3575]">Produto</th>
            <th className="py-1 px-2 text-left font-bold uppercase border border-[#1e3575]">Princípio Ativo</th>
            <th className="py-1 px-2 text-left font-bold uppercase border border-[#1e3575]">Nº MS</th>
            <th className="py-1 px-2 text-left font-bold uppercase border border-[#1e3575]">Antídoto</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((p, i) => (
            <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/40'}>
              <td className="py-0.5 px-2 border border-blue-200 font-semibold text-[#254191]">{p.nome}</td>
              <td className="py-0.5 px-2 border border-blue-200">{p.principio || '—'}</td>
              <td className="py-0.5 px-2 border border-blue-200">{p.registro  || '—'}</td>
              <td className="py-0.5 px-2 border border-blue-200">{p.antidoto  || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
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
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10);
  });
  const [dataFim, setDataFim] = useState(new Date().toISOString().slice(0, 10));
  const [blocos, setBlocos] = useState(() => [novoBloco('desratizacao_quimica')]);
  const [clientData, setClientData] = useState({ nome: '', fantasia: '', cnpj: '', endereco: '', atividade: '' });
  const [clientesSalvos, setClientesSalvos] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { cnpjValue, handleCnpjChange, setCnpjExternal, isLoadingCnpj, cnpjStatus } = useCnpjAutofill({
    onFill: (dados) => setClientData(prev => ({ ...prev, nome: dados.nome, fantasia: dados.fantasia, cnpj: dados.cnpj, endereco: dados.endereco, atividade: dados.atividade })),
    onClear: () => setClientData(prev => ({ ...prev, cnpj: '' })),
  });

  useEffect(() => { getClientes().then(setClientesSalvos).catch(() => {}); }, []);
  useEffect(() => {
    fetch('/api/config/logo-mascote', { credentials: 'same-origin' })
      .then(r => r.ok ? r.json() : null).then(d => { if (d?.logo) setLogo(d.logo); }).catch(() => {});
  }, []);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('__editar_documento');
      if (!raw) return;
      const meta = JSON.parse(raw);
      if (meta.__tipo !== 'relatorio_mensal') return;
      sessionStorage.removeItem('__editar_documento');
      if (meta.clientData) { setClientData(meta.clientData); if (meta.clientData.cnpj) setCnpjExternal(meta.clientData.cnpj); }
      if (meta.numeroDoc) setNumeroDoc(meta.numeroDoc);
      if (meta.dataInicio) setDataInicio(meta.dataInicio);
      if (meta.dataFim) setDataFim(meta.dataFim);
      if (Array.isArray(meta.blocos) && meta.blocos.length) setBlocos(meta.blocos);
    } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem('relatorioMensalNumero', numeroDoc); } catch {} }, [numeroDoc]);
  useEffect(() => { setClientData(prev => ({ ...prev, cnpj: cnpjValue })); }, [cnpjValue]);

  // ── Mutações de bloco ────────────────────────────────────────────────────────
  const adicionarBloco     = (tipo) => { setBlocos(prev => [...prev, novoBloco(tipo)]); setTipoMenuAberto(false); };
  const removerBloco       = (id)   => setBlocos(prev => prev.filter(b => b.id !== id));
  const atualizarBloco     = (id, patch) => setBlocos(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));

  const adicionarProduto   = (blocoId, produtoId) => {
    const produto = produtosOptions.find(p => String(p.id) === String(produtoId));
    if (!produto) return;
    setBlocos(prev => prev.map(b => {
      if (b.id !== blocoId || b.produtos.some(p => String(p.id) === String(produto.id))) return b;
      return { ...b, produtos: [...b.produtos, produto] };
    }));
  };
  const removerProduto     = (blocoId, produtoId) =>
    setBlocos(prev => prev.map(b => b.id !== blocoId ? b : { ...b, produtos: b.produtos.filter(p => String(p.id) !== String(produtoId)) }));

  // ── Porta-iscas ──────────────────────────────────────────────────────────────
  const adicionarPortaIsca = (blocoId) =>
    setBlocos(prev => prev.map(b => {
      if (b.id !== blocoId) return b;
      return { ...b, portaIscas: [...(b.portaIscas || []), novoPortaIsca((b.portaIscas?.length || 0) + 1)] };
    }));
  const removerPortaIsca   = (blocoId, piId) =>
    setBlocos(prev => prev.map(b => b.id !== blocoId ? b : { ...b, portaIscas: (b.portaIscas || []).filter(p => p.id !== piId) }));
  const atualizarPortaIsca = (blocoId, piId, patch) =>
    setBlocos(prev => prev.map(b => b.id !== blocoId ? b : {
      ...b, portaIscas: (b.portaIscas || []).map(p => p.id === piId ? { ...p, ...patch } : p),
    }));

  // ── Salvar ───────────────────────────────────────────────────────────────────
  const handleSalvarCliente = async () => {
    if (!clientData.nome?.trim() || !clientData.cnpj?.trim()) return;
    await saveCliente({ nome: clientData.nome, fantasia: clientData.fantasia, cnpj: clientData.cnpj, endereco: clientData.endereco, atividade: clientData.atividade });
    getClientes().then(setClientesSalvos).catch(() => {});
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) { const r = new FileReader(); r.onloadend = () => setLogo(r.result); r.readAsDataURL(file); }
  };

  const handlePrint    = () => window.print();
  const handleSalvarPdf = async () => {
    if (!clientData.nome && !clientData.fantasia) { alert('Selecione ou preencha o cliente antes de salvar.'); return; }
    if (blocos.length === 0) { alert('Adicione pelo menos um bloco de serviço.'); return; }
    setSalvandoPdf(true);
    try {
      const nomeEmpresa = clientData.nome || clientData.fantasia || 'Empresa';
      const result = await salvarDocumento({
        elementId: 'a4-document',
        tipo: 'relatorio_mensal',
        numeroDoc,
        nomeEmpresa,
        metadados: { __tipo: 'relatorio_mensal', clientData, numeroDoc, dataInicio, dataFim, blocos },
      });
      if (result.sucesso) {
        registrarDocumentoNaAgenda('relatorio_mensal', { nome: clientData.nome, fantasia: clientData.fantasia, cnpj: clientData.cnpj, endereco: clientData.endereco }, dataFim, numeroDoc).catch(() => {});
        alert(`PDF salvo: ${result.nomeArquivo}`);
      } else {
        alert(`Erro ao salvar: ${result.erro}`);
      }
    } finally { setSalvandoPdf(false); }
  };

  const periodoLabel = `${formatBR(dataInicio)} a ${formatBR(dataFim)}`;

  // ── Separar blocos por tipo para o layout ────────────────────────────────────
  const blocosRoedores  = blocos.filter(b => TIPO_BY_ID[b.tipo]?.isRoedor);
  const blocosOutros    = blocos.filter(b => !TIPO_BY_ID[b.tipo]?.isRoedor);

  // ── Editor de um bloco ───────────────────────────────────────────────────────
  const renderEditorBloco = (bloco, idx) => {
    const tipoInfo = TIPO_BY_ID[bloco.tipo];
    const Icon = tipoInfo?.icon || Bug;
    const isRoedor = tipoInfo?.isRoedor;

    return (
      <div key={bloco.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon size={18} className="text-[#254191]" />
            <span className="font-bold text-sm text-[#254191]">
              {idx + 1}. {tipoInfo?.label || bloco.tipo}
              {isRoedor && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">Página inteira</span>}
            </span>
          </div>
          <button onClick={() => removerBloco(bloco.id)} className="text-red-400 hover:text-red-600" aria-label="Remover bloco">
            <Trash2 size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">Data de execução</label>
            <input type="date" value={bloco.dataExecucao} onChange={e => atualizarBloco(bloco.id, { dataExecucao: e.target.value })}
              className="w-full p-2 border rounded text-xs outline-none" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">Periodicidade</label>
            <input type="text" value={bloco.periodicidade} onChange={e => atualizarBloco(bloco.id, { periodicidade: e.target.value })}
              className="w-full p-2 border rounded text-xs outline-none" placeholder="ex: SEMANAL, MENSAL..." />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">Locais</label>
            <input type="text" value={bloco.locais} onChange={e => atualizarBloco(bloco.id, { locais: e.target.value })}
              className="w-full p-2 border rounded text-xs outline-none" placeholder="Galpão, refeitório, área externa..." />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">Datas das visitas</label>
            <input type="text" value={bloco.datas} onChange={e => atualizarBloco(bloco.id, { datas: e.target.value })}
              className="w-full p-2 border rounded text-xs outline-none" placeholder="05/03, 12/03, 26/03..." />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-gray-600 mb-1">Próxima visita</label>
            <input type="text" value={bloco.proximaVisita} onChange={e => atualizarBloco(bloco.id, { proximaVisita: e.target.value })}
              className="w-full p-2 border rounded text-xs outline-none" placeholder="ex: 31/03/2026" />
          </div>
        </div>

        {/* Produtos */}
        <div className="mb-3">
          <label className="block text-[11px] font-bold text-gray-600 mb-1">Adicionar produto</label>
          <select onChange={(e) => { adicionarProduto(bloco.id, e.target.value); e.target.value = ''; }}
            className="w-full p-2 border rounded text-xs outline-none bg-white" defaultValue="">
            <option value="" disabled>— selecione um produto —</option>
            {produtosOptions.map(p => (
              <option key={p.id} value={p.id}>{p.nome}{p.principio ? ` (${p.principio})` : ''}</option>
            ))}
          </select>
          {bloco.produtos.length > 0 && (
            <div className="mt-2 space-y-1">
              {bloco.produtos.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-blue-50/50 border border-blue-100 rounded px-3 py-1.5 text-xs">
                  <span className="text-gray-700">
                    <strong className="text-[#254191]">{p.nome}</strong>
                    {p.principio && <span className="text-gray-500"> — {p.principio}</span>}
                    {p.registro  && <span className="text-gray-400"> · MS {p.registro}</span>}
                  </span>
                  <button onClick={() => removerProduto(bloco.id, p.id)} className="text-red-300 hover:text-red-600" aria-label="Remover produto">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Porta-iscas — apenas para roedores */}
        {isRoedor && (
          <div className="mb-3 border border-dashed border-blue-200 rounded-lg p-3 bg-blue-50/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#254191] flex items-center gap-1.5">
                <Package size={13} /> Porta-iscas ({bloco.portaIscas?.length || 0})
              </span>
              <button onClick={() => adicionarPortaIsca(bloco.id)}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-white border border-blue-300 px-2 py-1 rounded hover:bg-blue-50">
                <Plus size={12} /> Adicionar
              </button>
            </div>

            {(bloco.portaIscas || []).length === 0 && (
              <p className="text-[10px] text-gray-400 italic">Nenhum porta-isca adicionado.</p>
            )}

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {(bloco.portaIscas || []).map((pi) => (
                <div key={pi.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={pi.numero}
                    onChange={e => atualizarPortaIsca(bloco.id, pi.id, { numero: e.target.value })}
                    className="w-14 p-1.5 border rounded text-xs text-center font-bold outline-none"
                    placeholder="Nº"
                  />
                  <select
                    value={pi.status}
                    onChange={e => atualizarPortaIsca(bloco.id, pi.id, { status: e.target.value })}
                    className="flex-1 p-1.5 border rounded text-xs outline-none bg-white"
                  >
                    {STATUS_PORTA_ISCA.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <button onClick={() => removerPortaIsca(bloco.id, pi.id)} className="text-red-300 hover:text-red-600 shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Observações */}
        <div>
          <label className="block text-[11px] font-bold text-gray-600 mb-1">Observações</label>
          <textarea rows={2} value={bloco.observacao} onChange={e => atualizarBloco(bloco.id, { observacao: e.target.value })}
            placeholder="Locais aplicados, comportamento de pragas, recomendações..."
            className="w-full p-2 border rounded text-xs outline-none resize-y" />
        </div>
      </div>
    );
  };

  // ── Página A4 de roedores (página inteira cada) ───────────────────────────────
  const renderPaginaRoedor = (bloco, idxGlobal) => {
    const tipoInfo = TIPO_BY_ID[bloco.tipo];
    const primeiroProduto = bloco.produtos[0] || null;

    return (
      <div key={bloco.id} className="a4-page relative bg-white shadow-2xl p-[15mm] flex flex-col print:shadow-none print:m-0 overflow-hidden text-slate-800">
        <DocumentHeader logo={logo} onLogoClick={() => fileInputRef.current?.click()} variant="laudo" />

        {/* Título */}
        <div className="flex justify-between items-end mb-3">
          <h2 className="text-lg font-black text-[#254191] uppercase leading-none tracking-tight">
            RELATÓRIO MENSAL
            <br />
            <span className="text-blue-500 text-[11px] font-bold tracking-widest uppercase italic">
              {tipoInfo?.titulo}
            </span>
          </h2>
          <div className="text-right border-l-4 border-[#254191] pl-3">
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">Nº {numeroDoc}</p>
            <p className="text-[10px] font-black text-gray-800 italic leading-tight">{periodoLabel}</p>
          </div>
        </div>

        <ClienteSection clientData={clientData} mode="document" />

        {/* Corpo */}
        <div className="flex-1 space-y-2 overflow-hidden">
          {/* Cabeçalho do bloco */}
          <div className="bg-[#254191] text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wide print-bg-blue">
            {tipoInfo?.titulo} &nbsp;·&nbsp; <span className="font-normal italic">{tipoInfo?.subtitulo}</span>
          </div>

          {/* Info de visita */}
          <InfoVisita bloco={bloco} />

          {/* Produto + info química */}
          {bloco.produtos.length > 0 && (
            <div className="bg-blue-50/30 border border-blue-100 rounded p-2 print-bg-light-blue">
              <h4 className="text-[10px] font-bold text-[#254191] uppercase tracking-widest mb-1">Produto(s) Utilizado(s)</h4>
              {bloco.produtos.map((p) => (
                <div key={p.id} className="mb-1 last:mb-0">
                  <p className="text-[10px] font-black text-[#254191]">{p.nome}</p>
                  <ProdutoQuimicoInfo produto={p} />
                </div>
              ))}
            </div>
          )}

          {/* Tabela de porta-iscas */}
          <TabelaPortaIscas portaIscas={bloco.portaIscas} />

          {/* Observações */}
          {bloco.observacao && (
            <div className="bg-zinc-50 border border-zinc-200 rounded px-3 py-1.5">
              <p className="text-[9px] font-bold text-zinc-600 uppercase mb-0.5">Observações</p>
              <p className="text-[9px] text-zinc-700 whitespace-pre-wrap">{bloco.observacao}</p>
            </div>
          )}

          {/* ANVISA */}
          <div className="bg-[#fff5f5] border border-[#fee2e2] rounded px-3 py-1.5 text-[8px] text-[#6d2020] italic font-bold">
            <span className="not-italic font-black text-[#a02c2c]">OBSERVAÇÕES: </span>em anexo alvará sanitário.
            N° de telefone no caso de intoxicação: ANVISA – Disque intoxicação - SERVIÇO DE TOXICOLOGIA DE MG:
            <strong className="not-italic"> 0800-722-6001 / (31) 3224-4000 / (31) 3239-9308 / (31) 3239-9223</strong>
          </div>
        </div>

        <DocumentFooter variant="laudo" />
      </div>
    );
  };

  // ── Página A4 de outros serviços (todos juntos) ───────────────────────────────
  const renderPaginaOutros = () => {
    if (blocosOutros.length === 0) return null;
    return (
      <div className="a4-page relative bg-white shadow-2xl p-[15mm] flex flex-col print:shadow-none print:m-0 overflow-hidden text-slate-800">
        <DocumentHeader logo={logo} onLogoClick={() => fileInputRef.current?.click()} variant="laudo" />

        <div className="flex justify-between items-end mb-3">
          <h2 className="text-lg font-black text-[#254191] uppercase leading-none tracking-tight">
            RELATÓRIO MENSAL
            <br />
            <span className="text-blue-500 text-[11px] font-bold tracking-widest uppercase italic">
              CONTROLE DE VETORES E PRAGAS
            </span>
          </h2>
          <div className="text-right border-l-4 border-[#254191] pl-3">
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">Nº {numeroDoc}</p>
            <p className="text-[10px] font-black text-gray-800 italic leading-tight">{periodoLabel}</p>
          </div>
        </div>

        <ClienteSection clientData={clientData} mode="document" />

        <div className="flex-1 space-y-3 overflow-hidden">
          {blocosOutros.map((bloco) => {
            const tipoInfo = TIPO_BY_ID[bloco.tipo];
            return (
              <div key={bloco.id}>
                {/* Cabeçalho do serviço */}
                <div className="bg-[#254191] text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wide print-bg-blue mb-1">
                  {tipoInfo?.titulo} &nbsp;·&nbsp; <span className="font-normal italic">{tipoInfo?.subtitulo}</span>
                </div>

                <InfoVisita bloco={bloco} />
                <TabelaProdutos produtos={bloco.produtos} />

                {bloco.observacao && (
                  <p className="text-[9px] text-zinc-700 italic px-1 mt-1">{bloco.observacao}</p>
                )}
              </div>
            );
          })}

          {/* ANVISA compartilhado */}
          <div className="bg-[#fff5f5] border border-[#fee2e2] rounded px-3 py-1.5 text-[8px] text-[#6d2020] italic font-bold mt-auto">
            <span className="not-italic font-black text-[#a02c2c]">OBSERVAÇÕES: </span>em anexo alvará sanitário.
            N° de telefone no caso de intoxicação: ANVISA – Disque intoxicação - SERVIÇO DE TOXICOLOGIA DE MG:
            <strong className="not-italic"> 0800-722-6001 / (31) 3224-4000 / (31) 3239-9308 / (31) 3239-9223</strong>
          </div>
        </div>

        <DocumentFooter variant="laudo" />
      </div>
    );
  };

  // ── Render principal ─────────────────────────────────────────────────────────
  return (
    <div id="a4-document" className="bg-zinc-200 py-10 print:py-0 print:bg-white flex flex-col print:block items-center gap-4 print:gap-0">

      {/* PAINEL EDITOR */}
      <div className="bg-[#f4f6f9] p-6 md:p-8 rounded-2xl shadow-sm w-full max-w-[210mm] border border-gray-300/60 print:hidden mb-8">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-300/80 cursor-pointer"
          onClick={() => setShowEditor(v => !v)}>
          <h3 className="font-extrabold text-xl text-[#3b4b73] flex items-center gap-3">
            <ClipboardList size={22} /> Editar Relatório Mensal
          </h3>
          <button className="text-gray-500 hover:text-[#3b4b73] transition-colors" aria-label={showEditor ? 'Recolher' : 'Expandir'}>
            {showEditor ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </button>
        </div>

        {showEditor && (
          <div className="space-y-6">
            {/* Dados gerais */}
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
              <div className="flex gap-2">
                <button type="button" onClick={() => setPickerOpen(true)}
                  className="flex-1 flex items-center gap-2 p-2 border border-slate-300 rounded text-sm bg-white hover:bg-slate-50 text-slate-700">
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
                <input type="text" placeholder="Razão Social / Nome" value={clientData.nome} onChange={e => setClientData(p => ({ ...p, nome: e.target.value }))} className="w-full p-2 border rounded text-sm outline-none" />
                <input type="text" placeholder="Nome Fantasia" value={clientData.fantasia} onChange={e => setClientData(p => ({ ...p, fantasia: e.target.value }))} className="w-full p-2 border rounded text-sm outline-none" />
                <CnpjInput value={cnpjValue} onChange={handleCnpjChange} isLoading={isLoadingCnpj} status={cnpjStatus} />
                <input type="text" placeholder="Atividade Econômica" value={clientData.atividade} onChange={e => setClientData(p => ({ ...p, atividade: e.target.value }))} className="w-full p-2 border rounded text-sm outline-none" />
                <input type="text" placeholder="Endereço" value={clientData.endereco} onChange={e => setClientData(p => ({ ...p, endereco: e.target.value }))} className="md:col-span-2 w-full p-2 border rounded text-sm outline-none" />
              </div>
            </div>

            {/* Blocos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-[11px] text-gray-500 uppercase tracking-widest">Blocos de Serviço ({blocos.length})</h4>
                <div className="relative">
                  <button type="button" onClick={() => setTipoMenuAberto(v => !v)}
                    className="flex items-center gap-2 bg-[#3b528b] text-white px-4 py-2 rounded-lg hover:bg-[#2c3d69] font-bold text-xs shadow-md">
                    <Plus size={16} /> Adicionar Bloco
                  </button>
                  {tipoMenuAberto && (
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-20 overflow-hidden">
                      {TIPOS_BLOCO.map(t => {
                        const Icon = t.icon;
                        return (
                          <button key={t.id} onClick={() => adicionarBloco(t.id)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-blue-50 border-b border-gray-100 last:border-0">
                            <Icon size={16} className="text-[#254191] flex-shrink-0" />
                            <div>
                              <p className="text-sm text-gray-700">{t.label}</p>
                              {t.isRoedor && <p className="text-[10px] text-blue-500">Página inteira</p>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Legenda */}
              <div className="flex gap-4 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><Bug size={12} className="text-[#254191]" /> Roedores → página própria</span>
                <span className="flex items-center gap-1"><Droplets size={12} className="text-[#254191]" /> Outros → página compartilhada</span>
              </div>

              {blocos.map((b, i) => renderEditorBloco(b, i))}

              {blocos.length === 0 && (
                <p className="text-center text-sm text-gray-400 italic py-6">Adicione blocos acima para começar.</p>
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
          setClientData(prev => ({ ...prev, nome: c.nome, fantasia: c.fantasia, cnpj: c.cnpj, endereco: c.endereco, atividade: c.atividade }));
        }}
      />

      <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />

      {/* PÁGINAS A4 */}
      {blocosRoedores.map((b, i) => renderPaginaRoedor(b, i))}
      {renderPaginaOutros()}

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
