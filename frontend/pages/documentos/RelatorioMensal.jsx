import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChevronDown, ChevronUp, Plus, Trash2, Search, Bug,
  Droplets, Zap, Target, ClipboardList, Package, CheckCircle2,
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
  { id: 'desratizacao_quimica', label: 'Desratização (Controle Químico)', icon: Bug,      titulo: 'CONTROLE QUÍMICO DE ROEDORES',  subtitulo: 'Aplicação de produto químico contra ratos e camundongos', isRoedor: true  },
  { id: 'iscagem',              label: 'Desratização (Iscagem)',          icon: Target,   titulo: 'ISCAGEM PARA ROEDORES',          subtitulo: 'Distribuição de iscas em pontos estratégicos',            isRoedor: true  },
  { id: 'desinsetizacao',       label: 'Desinsetização',                  icon: Droplets, titulo: 'DESINSETIZAÇÃO',                 subtitulo: 'Controle químico de insetos rasteiros e voadores',        isRoedor: false },
  { id: 'armadilha_luminosa',   label: 'Armadilhas Luminosas',            icon: Zap,      titulo: 'ARMADILHAS LUMINOSAS',           subtitulo: 'Captura e monitoramento de insetos voadores',             isRoedor: false },
  { id: 'feromonio',            label: 'Armadilhas com Feromônios',       icon: Target,   titulo: 'ARMADILHAS COM FEROMÔNIOS',      subtitulo: 'Monitoramento e captura por atração feromonal',           isRoedor: false },
];

const TIPO_BY_ID = Object.fromEntries(TIPOS_BLOCO.map(t => [t.id, t]));

// Targets que identificam produtos para combate de roedores
const ROEDOR_TARGETS = ['ratos', 'ratazana', 'camundongo', 'rato'];
const PORTA_ISCAS_OVERFLOW = 16; // acima disso → página extra

// Opções de pragas (igual a Laudos)
const PEST_OPTIONS = [
  { id: 'baratas',    label: 'Baratas'    },
  { id: 'formigas',   label: 'Formigas'   },
  { id: 'cupins',     label: 'Cupins'     },
  { id: 'escorpioes', label: 'Escorpiões' },
  { id: 'pulgas',     label: 'Pulgas'     },
  { id: 'moscas',     label: 'Moscas'     },
  { id: 'aranhas',    label: 'Aranhas'    },
  { id: 'mosquitos',  label: 'Mosquitos'  },
  { id: 'tracas',     label: 'Traças'     },
  { id: 'carrapatos', label: 'Carrapatos' },
  { id: 'percevejos', label: 'Percevejos' },
  { id: 'barbeiros',  label: 'Barbeiros'  },
];

const STATUS_PORTA_ISCA = [
  { value: 'consumido',                 label: 'Consumido'                       },
  { value: 'nao_consumido',             label: 'Não consumido'                   },
  { value: 'consumido_substituido',     label: 'Houve consumo e substituído'     },
  { value: 'nao_consumido_substituido', label: 'Não houve consumo / substituído' },
];

function novoPortaIsca(num) {
  return { id: `pi-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, numero: String(num), status: 'nao_consumido' };
}

function novoBloco(tipo) {
  const base = {
    id: `${tipo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tipo,
    dataExecucao: new Date().toISOString().slice(0, 10),
    produtos: [],
    observacao: '',
    portaIscas: [],
    qtdPortaIscas: '',
    periodicidade: 'MENSAL',
    locais: '',
    datas: '',
    proximaVisita: '',
    selectedPests: [],
    controlType: 'quimico', // 'quimico' | 'nao_quimico' | 'ambos'
  };
  if (tipo === 'desinsetizacao') {
    return { ...base, selectedPests: ['baratas', 'formigas'], controlType: 'quimico' };
  }
  if (tipo === 'armadilha_luminosa') {
    return {
      ...base,
      selectedPests: ['moscas', 'mosquitos'],
      controlType: 'nao_quimico',
      observacao: 'Para o controle de insetos voadores, especialmente moscas (Diptera), foram instaladas armadilhas luminosas equipadas com lâmpadas UV e placas adesivas internas em pontos estratégicos, como áreas de manipulação de alimentos, armazenamento e salão de atendimento ao público.',
    };
  }
  if (tipo === 'feromonio') {
    return {
      ...base,
      selectedPests: ['moscas'],
      controlType: 'nao_quimico',
      observacao: 'Para o controle de insetos voadores, especialmente moscas (Diptera), foram instaladas armadilhas atrativas com feromônio em pontos estratégicos na área externa.',
    };
  }
  // Roedores
  return { ...base, selectedPests: [], controlType: 'quimico' };
}

const formatBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

// ── Tabela de porta-iscas (dentro da página A4) ───────────────────────────────
function TabelaPortaIscas({ portaIscas, qtdPortaIscas }) {
  const temIndividuais = portaIscas && portaIscas.length > 0;
  const temQtd = qtdPortaIscas && String(qtdPortaIscas).trim() !== '';
  if (!temQtd && !temIndividuais) return null;

  return (
    <div className="mb-3">
      <h4 className="text-[10px] font-bold text-[#254191] uppercase tracking-widest border-b border-blue-200 pb-1 mb-2 flex items-center gap-1">
        Monitoramento de Porta-iscas
        {temQtd && (
          <span className="ml-2 text-[9px] font-semibold text-gray-600 normal-case">
            — Total instalados: <strong className="text-[#254191]">{qtdPortaIscas}</strong>
          </span>
        )}
      </h4>
      {temIndividuais && (
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
      )}
    </div>
  );
}

// ── Tabela de produtos — idêntica à de Laudos ─────────────────────────────────
function TabelaProdutos({ produtos, produtosOptions, onAdd, onRemove, onUpdate }) {
  return (
    <div className="mb-2">
      <div className="text-[#254191] font-bold uppercase text-[10px] mb-2 border-b-2 border-blue-600 pb-1">
        Detalhamento do Controle de Vetores e Pragas
      </div>
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
          {produtos.map((prod, idx) => (
            <React.Fragment key={prod.id}>
              <tr className="group relative hover:bg-blue-50/50 transition-colors">
                <td className="p-1 border text-center text-[8px] relative">
                  {prod.grupo}
                  {onUpdate && (
                    <select
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer no-print"
                      value={prod.id}
                      onChange={(e) => onUpdate(prod.id, e.target.value)}
                      title="Clique para trocar o produto"
                    >
                      {(produtosOptions || []).map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                  )}
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
                  {onRemove && (
                    <button onClick={() => onRemove(prod.id)}
                      className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                      title="Remover linha">
                      <Trash2 size={12} />
                    </button>
                  )}
                </td>
              </tr>
              <tr>
                <td colSpan="7" className="p-1 border text-[8px] italic text-zinc-600 bg-gray-50/50">
                  {prod.antidoto}
                </td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
      {onAdd && (
        <div className="mt-2 text-center no-print">
          <button onClick={onAdd}
            className="text-xs flex items-center justify-center gap-1 mx-auto text-blue-600 hover:text-blue-800 font-bold py-1 px-3 rounded border border-blue-200 hover:bg-blue-50 transition-colors">
            <Plus size={12} /> Adicionar Produto
          </button>
        </div>
      )}
    </div>
  );
}

// ── Seção de visitas/locais ───────────────────────────────────────────────────
function InfoVisita({ bloco }) {
  const temAlgum = bloco.periodicidade || bloco.locais || bloco.datas || bloco.proximaVisita;
  if (!temAlgum) return null;
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[9px] mb-3 bg-blue-50/30 border border-blue-100 rounded p-2 print-bg-light-blue">
      {bloco.periodicidade && <p><span className="font-bold text-[#254191]">Periodicidade:</span> {bloco.periodicidade}</p>}
      {bloco.locais        && <p><span className="font-bold text-[#254191]">Locais:</span> {bloco.locais}</p>}
      {bloco.datas         && <p><span className="font-bold text-[#254191]">Datas:</span> {bloco.datas}</p>}
      {bloco.proximaVisita && <p><span className="font-bold text-[#254191]">Próxima visita:</span> {bloco.proximaVisita}</p>}
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
  const produtosById = useMemo(
    () => Object.fromEntries((produtosCtx || []).map(p => [String(p.id), p])),
    [produtosCtx]
  );

  const [numeroDoc, setNumeroDoc] = useState(() => {
    try { return localStorage.getItem('relatorioMensalNumero') || '0001'; } catch { return '0001'; }
  });
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
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
  // Pre-fill de cliente + histórico vindo de Contratos ("Emitir Documento")
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('__prefill_cliente');
      if (!raw) return;
      sessionStorage.removeItem('__prefill_cliente');
      const c = JSON.parse(raw);

      // Preencher dados do cliente
      setClientData(prev => ({
        ...prev,
        nome:      c.nome      || '',
        fantasia:  c.fantasia  || '',
        cnpj:      c.cnpj      || '',
        endereco:  c.endereco  || '',
        atividade: c.atividade || '',
      }));
      if (c.cnpj) setCnpjExternal(c.cnpj);

      // Importar blocos do último relatório mensal deste cliente
      if (c.historico?.blocos && Array.isArray(c.historico.blocos) && c.historico.blocos.length > 0) {
        const dataHoje = new Date().toISOString().slice(0, 10);
        const blocosImportados = c.historico.blocos.map(b => ({
          ...b,
          // Novo ID para não colidir com estado anterior
          id: 'bloco_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
          // Resetar campos de data/agendamento para o novo período
          dataExecucao: dataHoje,
          datas:        '',
          proximaVisita: '',
          // Manter: tipo, produtos, portaIscas, qtdPortaIscas, observacao,
          //         selectedPests, controlType, periodicidade, locais
        }));
        setBlocos(blocosImportados);
      }
    } catch {}
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
      if (meta.data) setData(meta.data);
      if (Array.isArray(meta.blocos) && meta.blocos.length) setBlocos(meta.blocos);
    } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem('relatorioMensalNumero', numeroDoc); } catch {} }, [numeroDoc]);
  useEffect(() => { setClientData(prev => ({ ...prev, cnpj: cnpjValue })); }, [cnpjValue]);

  // ── Mutações de bloco ────────────────────────────────────────────────────────
  const adicionarBloco   = (tipo) => { setBlocos(prev => [...prev, novoBloco(tipo)]); setTipoMenuAberto(false); };
  const removerBloco     = (id)   => setBlocos(prev => prev.filter(b => b.id !== id));
  const atualizarBloco   = (id, patch) => setBlocos(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));

  // ── Produtos por bloco ───────────────────────────────────────────────────────
  // opcoes: lista já filtrada (roedores ou todos) passada pelo caller
  const adicionarProduto = (blocoId, opcoes) => {
    setBlocos(prev => prev.map(b => {
      if (b.id !== blocoId) return b;
      const jaIds = new Set(b.produtos.map(p => String(p.id)));
      const lista = opcoes && opcoes.length > 0 ? opcoes : produtosOptions;
      const proximo = lista.find(p => !jaIds.has(String(p.id)));
      if (!proximo) return b;
      return { ...b, produtos: [...b.produtos, proximo] };
    }));
  };
  const removerProduto   = (blocoId, produtoId) =>
    setBlocos(prev => prev.map(b => b.id !== blocoId ? b : { ...b, produtos: b.produtos.filter(p => String(p.id) !== String(produtoId)) }));
  const atualizarProduto = (blocoId, oldId, newId) =>
    setBlocos(prev => prev.map(b => {
      if (b.id !== blocoId) return b;
      const novo = produtosById[String(newId)];
      if (!novo) return b;
      return { ...b, produtos: b.produtos.map(p => String(p.id) === String(oldId) ? novo : p) };
    }));

  // ── Porta-iscas ──────────────────────────────────────────────────────────────
  const adicionarPortaIsca = (blocoId) =>
    setBlocos(prev => prev.map(b => {
      if (b.id !== blocoId) return b;
      const lista = b.portaIscas || [];
      // Próximo número: o maior entre qtdPortaIscas e a lista atual, + 1
      const baseQtd = parseInt(b.qtdPortaIscas || '0', 10) || 0;
      const baseLen = lista.length;
      const proximoNum = Math.max(baseQtd, baseLen) + 1;
      const novaLista = [...lista, novoPortaIsca(proximoNum)];
      // qtdPortaIscas sempre reflete o total da lista
      return { ...b, portaIscas: novaLista, qtdPortaIscas: String(novaLista.length) };
    }));
  const removerPortaIsca   = (blocoId, piId) =>
    setBlocos(prev => prev.map(b => {
      if (b.id !== blocoId) return b;
      const novaLista = (b.portaIscas || []).filter(p => p.id !== piId);
      return { ...b, portaIscas: novaLista, qtdPortaIscas: String(novaLista.length) };
    }));
  const atualizarPortaIsca = (blocoId, piId, patch) =>
    setBlocos(prev => prev.map(b => b.id !== blocoId ? b : {
      ...b, portaIscas: (b.portaIscas || []).map(p => p.id === piId ? { ...p, ...patch } : p),
    }));

  // Gera/remove porta-iscas automaticamente ao digitar a quantidade total
  const handleQtdPortaIscasChange = (blocoId, valorStr) => {
    const novaQtd = parseInt(valorStr, 10);
    setBlocos(prev => prev.map(b => {
      if (b.id !== blocoId) return b;
      const lista = b.portaIscas || [];
      if (isNaN(novaQtd) || novaQtd < 0) return { ...b, qtdPortaIscas: valorStr };
      if (novaQtd > lista.length) {
        // Adiciona as entradas faltantes
        const extras = Array.from({ length: novaQtd - lista.length }, (_, i) =>
          novoPortaIsca(lista.length + i + 1)
        );
        return { ...b, portaIscas: [...lista, ...extras], qtdPortaIscas: valorStr };
      }
      if (novaQtd < lista.length) {
        // Remove as últimas entradas
        return { ...b, portaIscas: lista.slice(0, novaQtd), qtdPortaIscas: valorStr };
      }
      return { ...b, qtdPortaIscas: valorStr };
    }));
  };

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

  const handlePrint     = () => window.print();
  const handleSalvarPdf = async () => {
    if (!clientData.nome && !clientData.fantasia) { alert('Selecione ou preencha o cliente antes de salvar.'); return; }
    if (blocos.length === 0) { alert('Adicione pelo menos um bloco de serviço.'); return; }
    setSalvandoPdf(true);
    try {
      const nomeEmpresa = clientData.nome || clientData.fantasia || 'Empresa';
      // Aguarda React re-renderizar o DOM antes do html2canvas (igual a Laudos)
      await new Promise(r => setTimeout(r, 50));
      const result = await salvarDocumento({
        elementId: 'a4-document',
        tipo: 'relatorio_mensal',
        numeroDoc,
        nomeEmpresa,
        metadados: { __tipo: 'relatorio_mensal', clientData, numeroDoc, data, blocos },
      });
      if (result.sucesso) {
        registrarDocumentoNaAgenda('relatorio_mensal', { nome: clientData.nome, fantasia: clientData.fantasia, cnpj: clientData.cnpj, endereco: clientData.endereco }, data, numeroDoc).catch(() => {});
        alert(`PDF salvo: ${result.nomeArquivo}`);
      } else {
        alert(`Erro ao salvar: ${result.erro}`);
      }
    } finally { setSalvandoPdf(false); }
  };

  const periodoLabel = formatBR(data);

  // Filtra produtos por tipo de bloco
  const getProdutosParaBloco = (bloco) => {
    if (TIPO_BY_ID[bloco.tipo]?.isRoedor) {
      // Roedores: apenas produtos com targets de roedores
      const filtrados = produtosOptions.filter(p =>
        (p.targets || []).some(t => ROEDOR_TARGETS.includes(t.toLowerCase()))
      );
      return filtrados.length > 0 ? filtrados : produtosOptions;
    }
    if (bloco.tipo === 'desinsetizacao') {
      const pests = bloco.selectedPests || [];
      // Sempre exclui produtos de roedores
      const semRoedor = produtosOptions.filter(p =>
        !(p.targets || []).some(t => ROEDOR_TARGETS.includes(t.toLowerCase()))
      );
      if (pests.length > 0) {
        // Filtra pelos targets das pragas selecionadas (igual Laudos getCompatibleProducts)
        const compativel = semRoedor.filter(p =>
          (p.targets || []).some(t => pests.includes(t))
        );
        return compativel.length > 0 ? compativel : semRoedor;
      }
      return semRoedor.length > 0 ? semRoedor : produtosOptions;
    }
    return produtosOptions;
  };

  const togglePestBloco = (blocoId, pestId) =>
    setBlocos(prev => prev.map(b => {
      if (b.id !== blocoId) return b;
      const cur = b.selectedPests || [];
      const next = cur.includes(pestId) ? cur.filter(p => p !== pestId) : [...cur, pestId];
      return { ...b, selectedPests: next };
    }));
  const blocosRoedores   = blocos.filter(b => TIPO_BY_ID[b.tipo]?.isRoedor);
  const blocosDesinset   = blocos.filter(b => b.tipo === 'desinsetizacao');
  const blocosArmadilhas = blocos.filter(b => b.tipo === 'armadilha_luminosa' || b.tipo === 'feromonio');

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
            <label className="block text-xs font-bold text-gray-700 mb-1">Data de execução</label>
            <input type="date" value={bloco.dataExecucao} onChange={e => atualizarBloco(bloco.id, { dataExecucao: e.target.value })}
              className="w-full p-2 border rounded text-xs outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Periodicidade</label>
            <input type="text" value={bloco.periodicidade} onChange={e => atualizarBloco(bloco.id, { periodicidade: e.target.value })}
              className="w-full p-2 border rounded text-xs outline-none" placeholder="ex: SEMANAL, MENSAL..." />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Locais</label>
            <input type="text" value={bloco.locais} onChange={e => atualizarBloco(bloco.id, { locais: e.target.value })}
              className="w-full p-2 border rounded text-xs outline-none" placeholder="Galpão, refeitório, área externa..." />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Datas das visitas</label>
            <input type="text" value={bloco.datas} onChange={e => atualizarBloco(bloco.id, { datas: e.target.value })}
              className="w-full p-2 border rounded text-xs outline-none" placeholder="05/03, 12/03, 26/03..." />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-700 mb-1">Próxima visita</label>
            <input type="text" value={bloco.proximaVisita} onChange={e => atualizarBloco(bloco.id, { proximaVisita: e.target.value })}
              className="w-full p-2 border rounded text-xs outline-none" placeholder="ex: 31/03/2026" />
          </div>
        </div>

        {/* Seleção de pragas — apenas para Desinsetização */}
        {bloco.tipo === 'desinsetizacao' && (
          <div className="mb-3 border border-blue-100 rounded-lg p-3 bg-blue-50/30">
            <label className="block text-xs font-bold text-blue-900 mb-2 uppercase tracking-wider">
              Tipo de Controle
            </label>
            <div className="flex gap-2 mb-3">
              {[
                { v: 'quimico',     l: 'Controle Químico'     },
                { v: 'nao_quimico', l: 'Controle Não Químico'  },
                { v: 'ambos',       l: 'Ambos'                 },
              ].map(opt => (
                <button key={opt.v}
                  onClick={() => atualizarBloco(bloco.id, { controlType: opt.v })}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded border transition-all ${
                    bloco.controlType === opt.v
                      ? 'bg-[#254191] text-white border-blue-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}>
                  {opt.l}
                </button>
              ))}
            </div>
            <label className="block text-xs font-bold text-blue-900 mb-2 uppercase tracking-wider">
              Pragas / Vetores
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PEST_OPTIONS.map(pest => {
                const sel = (bloco.selectedPests || []).includes(pest.id);
                return (
                  <button key={pest.id}
                    onClick={() => togglePestBloco(bloco.id, pest.id)}
                    className={`flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded border transition-all ${
                      sel
                        ? 'bg-blue-600 text-white border-blue-700'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}>
                    {sel && <CheckCircle2 size={11} />}
                    {pest.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Porta-iscas — apenas para roedores */}
        {isRoedor && (
          <div className="mb-3 border border-dashed border-blue-200 rounded-lg p-3 bg-blue-50/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#254191] flex items-center gap-1.5">
                <Package size={13} /> Porta-iscas
              </span>
              <button onClick={() => adicionarPortaIsca(bloco.id)}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-white border border-blue-300 px-2 py-1 rounded hover:bg-blue-50">
                <Plus size={12} /> Adicionar
              </button>
            </div>

            {/* Quantidade total */}
            <div className="mb-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">Quantidade total instalada</label>
              <input
                type="number"
                min="0"
                value={bloco.qtdPortaIscas}
                onChange={e => handleQtdPortaIscasChange(bloco.id, e.target.value)}
                className="w-28 p-1.5 border rounded text-xs text-center font-bold outline-none"
                placeholder="0"
              />
              <span className="text-[10px] text-gray-400 ml-2">porta-iscas</span>
            </div>

            {(bloco.portaIscas || []).length === 0 && (
              <p className="text-[10px] text-gray-400 italic">Clique "+ Adicionar" para detalhar cada porta-isca individualmente.</p>
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
          <label className="block text-xs font-bold text-gray-700 mb-1">Observações</label>
          <textarea rows={2} value={bloco.observacao} onChange={e => atualizarBloco(bloco.id, { observacao: e.target.value })}
            placeholder="Locais aplicados, comportamento de pragas, recomendações..."
            className="w-full p-2 border rounded text-xs outline-none resize-y" />
        </div>
      </div>
    );
  };

  // ── Página A4 de roedores (página inteira cada) ───────────────────────────────
  const renderPaginaRoedor = (bloco) => {
    const tipoInfo = TIPO_BY_ID[bloco.tipo];
    const produtosFiltrados = getProdutosParaBloco(bloco);
    const portaIscas = bloco.portaIscas || [];
    const overflow = portaIscas.length > PORTA_ISCAS_OVERFLOW;

    const cabecalhoDoc = (
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
    );

    return (
      <React.Fragment key={bloco.id}>
        {/* Página principal do bloco */}
        <div className="a4-page relative bg-white shadow-2xl p-[15mm] flex flex-col print:shadow-none print:m-0 overflow-hidden text-slate-800">
          <DocumentHeader logo={logo} onLogoClick={() => fileInputRef.current?.click()} variant="laudo" />
          {cabecalhoDoc}
          <ClienteSection clientData={clientData} mode="document" />

          <div className="flex-1 space-y-2 overflow-hidden">
            <div className="bg-[#254191] text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wide print-bg-blue">
              {tipoInfo?.titulo} &nbsp;·&nbsp; <span className="font-normal italic">{tipoInfo?.subtitulo}</span>
            </div>

            <InfoVisita bloco={bloco} />

            {/* Tabela de produtos (filtrada para roedores) */}
            <TabelaProdutos
              produtos={bloco.produtos}
              produtosOptions={produtosFiltrados}
              onAdd={() => adicionarProduto(bloco.id, produtosFiltrados)}
              onRemove={(pid) => removerProduto(bloco.id, pid)}
              onUpdate={(oldId, newId) => atualizarProduto(bloco.id, oldId, newId)}
            />

            {/* Porta-iscas: só aparece aqui se NÃO ultrapassar o limite */}
            {!overflow && (
              <TabelaPortaIscas portaIscas={portaIscas} qtdPortaIscas={bloco.qtdPortaIscas} />
            )}
            {overflow && (bloco.qtdPortaIscas || portaIscas.length > 0) && (
              <div className="bg-blue-50 border border-blue-200 rounded px-3 py-1.5 text-[9px] text-[#254191] font-bold no-print">
                ⚠ Tabela de porta-iscas ({portaIscas.length} itens) será exibida na próxima página.
              </div>
            )}
            {overflow && (
              <p className="text-[9px] text-blue-700 font-bold italic border border-blue-200 rounded px-2 py-1 print:block hidden">
                Monitoramento de Porta-iscas — ver página seguinte
              </p>
            )}

            {bloco.observacao && (
              <div className="bg-zinc-50 border border-zinc-200 rounded px-3 py-1.5">
                <p className="text-[9px] font-bold text-zinc-600 uppercase mb-0.5">Observações</p>
                <p className="text-[9px] text-zinc-700 whitespace-pre-wrap">{bloco.observacao}</p>
              </div>
            )}

            <div className="bg-[#fff5f5] border border-[#fee2e2] rounded px-3 py-1.5 text-[8px] text-[#6d2020] italic font-bold">
              <span className="not-italic font-black text-[#a02c2c]">OBSERVAÇÕES: </span>em anexo alvará sanitário.
              N° de telefone no caso de intoxicação: ANVISA – Disque intoxicação - SERVIÇO DE TOXICOLOGIA DE MG:
              <strong className="not-italic"> 0800-722-6001 / (31) 3224-4000 / (31) 3239-9308 / (31) 3239-9223</strong>
            </div>
          </div>

          <DocumentFooter variant="laudo" />
        </div>

        {/* Página extra de porta-iscas (apenas quando > PORTA_ISCAS_OVERFLOW) */}
        {overflow && (
          <div className="a4-page relative bg-white shadow-2xl p-[15mm] flex flex-col print:shadow-none print:m-0 overflow-hidden text-slate-800">
            <DocumentHeader logo={logo} onLogoClick={() => fileInputRef.current?.click()} variant="laudo" />
            {cabecalhoDoc}

            <div className="flex-1">
              <TabelaPortaIscas portaIscas={portaIscas} qtdPortaIscas={bloco.qtdPortaIscas} />
            </div>

            <DocumentFooter variant="laudo" />
          </div>
        )}
      </React.Fragment>
    );
  };

  // ── Página A4 de desinsetização (uma página por bloco) ───────────────────────
  const renderPaginaDesinsetizacao = (bloco) => {
    const tipoInfo = TIPO_BY_ID[bloco.tipo];
    const produtosFiltrados = getProdutosParaBloco(bloco);

    return (
      <div key={bloco.id} className="a4-page relative bg-white shadow-2xl p-[15mm] flex flex-col print:shadow-none print:m-0 overflow-hidden text-slate-800">
        <DocumentHeader logo={logo} onLogoClick={() => fileInputRef.current?.click()} variant="laudo" />

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

        <div className="flex-1 space-y-2 overflow-hidden">
          {/* Cabeçalho + checkboxes controle */}
          <div className="flex justify-between items-end border-b-2 border-blue-600 pb-1 mb-1">
            <div className="flex items-center gap-2 text-[#254191] font-bold uppercase text-[10px]">
              {React.createElement(tipoInfo?.icon || Bug, { size: 14 })}
              {tipoInfo?.titulo}
            </div>
            <div className="flex gap-4 text-[9px] font-bold text-gray-700">
              <div className="flex items-center gap-1">
                <div className={`w-3.5 h-3.5 border border-blue-800 flex items-center justify-center ${['quimico','ambos'].includes(bloco.controlType) ? 'bg-blue-800' : 'bg-white'}`}>
                  {['quimico','ambos'].includes(bloco.controlType) && <CheckCircle2 size={10} className="text-white" />}
                </div>
                <span className="uppercase">Controle Químico</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-3.5 h-3.5 border border-blue-800 flex items-center justify-center ${['nao_quimico','ambos'].includes(bloco.controlType) ? 'bg-blue-800' : 'bg-white'}`}>
                  {['nao_quimico','ambos'].includes(bloco.controlType) && <CheckCircle2 size={10} className="text-white" />}
                </div>
                <span className="uppercase">Controle Não Químico</span>
              </div>
            </div>
          </div>

          {/* Badges de pragas */}
          {(bloco.selectedPests || []).length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] w-full gap-1 mb-2 text-[8px] font-black uppercase text-center">
              {(bloco.selectedPests || []).map(pestId => {
                const pest = PEST_OPTIONS.find(p => p.id === pestId);
                return pest ? (
                  <div key={pestId} className="bg-[#254191] text-white py-1 rounded shadow-sm border-b-2 border-blue-900/50 flex items-center justify-center px-1 print-bg-blue">
                    {pest.label}
                  </div>
                ) : null;
              })}
            </div>
          )}

          <InfoVisita bloco={bloco} />

          <TabelaProdutos
            produtos={bloco.produtos}
            produtosOptions={produtosFiltrados}
            onAdd={() => adicionarProduto(bloco.id, produtosFiltrados)}
            onRemove={(pid) => removerProduto(bloco.id, pid)}
            onUpdate={(oldId, newId) => atualizarProduto(bloco.id, oldId, newId)}
          />

          {bloco.observacao && (
            <div className="bg-zinc-50 border border-zinc-200 rounded px-3 py-1.5">
              <p className="text-[9px] font-bold text-zinc-600 uppercase mb-0.5">Observações</p>
              <p className="text-[9px] text-zinc-700 whitespace-pre-wrap">{bloco.observacao}</p>
            </div>
          )}

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

  // ── Página A4 de armadilhas (luminosas + feromônios juntas) ───────────────────
  const renderPaginaArmadilhas = () => {
    if (blocosArmadilhas.length === 0) return null;
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

        <div className="flex-1 space-y-4 overflow-hidden">
          {blocosArmadilhas.map((bloco) => {
            const tipoInfo = TIPO_BY_ID[bloco.tipo];
            return (
              <div key={bloco.id}>
                {/* Cabeçalho + checkboxes */}
                <div className="flex justify-between items-end mb-1 border-b-2 border-blue-600 pb-1">
                  <div className="text-[#254191] font-bold uppercase text-[10px]">
                    {tipoInfo?.titulo}
                  </div>
                  <div className="flex gap-2">
                    <span className={`text-[8px] font-black uppercase tracking-tight px-2 py-0.5 rounded ${['quimico','ambos'].includes(bloco.controlType) ? 'bg-[#254191] text-white' : 'bg-gray-100 text-gray-400'}`}>
                      Controle Químico
                    </span>
                    <span className={`text-[8px] font-black uppercase tracking-tight px-2 py-0.5 rounded ${['nao_quimico','ambos'].includes(bloco.controlType) ? 'bg-[#254191] text-white' : 'bg-gray-100 text-gray-400'}`}>
                      Controle Não Químico
                    </span>
                  </div>
                </div>

                {/* Badges de pragas */}
                {(bloco.selectedPests || []).length > 0 && (
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] w-full gap-1 mb-2 text-[8px] font-black uppercase text-center">
                    {(bloco.selectedPests || []).map(pestId => {
                      const pest = PEST_OPTIONS.find(p => p.id === pestId);
                      return pest ? (
                        <div key={pestId} className="bg-[#254191] text-white py-1 rounded shadow-sm border-b-2 border-blue-900/50 flex items-center justify-center px-1 print-bg-blue">
                          {pest.label}
                        </div>
                      ) : null;
                    })}
                  </div>
                )}

                <InfoVisita bloco={bloco} />

                {bloco.observacao && (
                  <div className="bg-zinc-50 border border-zinc-200 rounded px-3 py-1.5 mt-1">
                    <p className="text-[9px] text-zinc-700 whitespace-pre-wrap">{bloco.observacao}</p>
                  </div>
                )}
              </div>
            );
          })}

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
      <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-4xl border border-blue-200 mb-8 no-print">
        <div className="flex justify-between items-center mb-6 border-b pb-2">
          <h3 className="font-bold text-lg text-blue-900 flex items-center gap-2">
            <ClipboardList size={20} /> Editar Informações do Documento
          </h3>
          <button onClick={() => setShowEditor(v => !v)} className="text-gray-500 hover:text-blue-700" aria-label={showEditor ? 'Recolher' : 'Expandir'}>
            {showEditor ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {showEditor && (
          <div className="space-y-6">
            {/* Dados gerais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nº Relatório</label>
                <input type="text" value={numeroDoc} onChange={e => setNumeroDoc(e.target.value)}
                  className="w-full p-2 border rounded text-sm font-semibold text-blue-700 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Data do Relatório</label>
                <input type="date" value={data} onChange={e => setData(e.target.value)}
                  className="w-full p-2 border rounded text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>

            {/* Cliente */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider border-b pb-1 mb-3">Cliente</h4>
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
                <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider">Blocos de Serviço ({blocos.length})</h4>
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

              <div className="flex gap-4 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><Bug size={12} className="text-[#254191]" /> Roedores → página própria</span>
                <span className="flex items-center gap-1"><Droplets size={12} className="text-[#254191]" /> Outros → página compartilhada</span>
              </div>

              <p className="text-[10px] text-blue-600 italic bg-blue-50 border border-blue-100 rounded px-3 py-2">
                💡 Os produtos são adicionados diretamente na pré-visualização abaixo — clique em "Adicionar Produto" dentro de cada bloco.
              </p>

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
      {blocosRoedores.map((b) => renderPaginaRoedor(b))}
      {blocosDesinset.map((b) => renderPaginaDesinsetizacao(b))}
      {renderPaginaArmadilhas()}

      <style>{`
        .a4-page {
          width: 210mm;
          height: 297mm;
          min-height: 297mm;
          position: relative;
        }

        .text-shadow-sm {
          text-shadow: 1px 1px 2px rgba(0,0,0,0.05);
        }

        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          /* Reset absoluto — body, html, root não podem ter altura de viewport */
          html, body, #root, #root > div {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Zera margin-left do wrapper do sidebar (inline style tem precedência — precisa !important) */
          div[style*="margin-left"],
          div[style*="marginLeft"] {
            margin-left: 0 !important;
          }

          /* Remove padding do main */
          main { padding: 0 !important; }

          /* Esconde sidebar e drawer */
          nav, aside { display: none !important; }

          /* Garante que o header do documento A4 seja exibido na impressão */
          #a4-document header {
            display: flex !important;
          }

          /* Logo: esconde o botão de upload (no-print) e exibe a versão de impressão */
          #a4-document .no-print { display: none !important; }
          #a4-document .print\\:flex { display: flex !important; }

          /* Wrapper do componente */
          #a4-document {
            height: auto !important;
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            gap: 0 !important;
            display: block !important;
            background: white !important;
          }

          .no-print { display: none !important; }

          .a4-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 15mm !important;
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            page-break-inside: avoid;
            page-break-after: always;
          }

          /* Última página visível NÃO cria folha em branco */
          .a4-page:last-of-type,
          .a4-page:last-child {
            page-break-after: avoid !important;
          }

          .print\\:page-break {
            page-break-before: always !important;
          }
        }
      `}</style>
    </div>
  );
}
