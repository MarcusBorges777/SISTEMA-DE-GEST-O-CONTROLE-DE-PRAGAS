/**
 * Contratos — Gestão de clientes recorrentes
 *
 * Cadastra contratos com cliente, duração e frequência. Ao salvar, cria
 * automaticamente os agendamentos recorrentes na agenda (categoriaServico='contrato')
 * e abre uma pasta dedicada no OneDrive para os laudos.
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, Plus, Edit2, Trash2, Calendar, Clock, Search,
  X, Check, Loader2, Building2, Phone, MapPin, FolderOpen,
  AlertCircle, RefreshCw, FileText, ChevronDown, ChevronUp,
  ClipboardList, Receipt, DollarSign, BarChart2, Users,
} from 'lucide-react';
import { contratoApi, clienteApi } from '../services/dbService';
import { criarAgendamentoComRecorrencia, excluirSerieRecorrente, getAgendamentos } from '../services/agendaService';
import { useToast } from '../components/shared/Toast';
import { ClientePickerModal } from '../components/documentos/ClientePickerModal';
import { ClienteCRMModal } from '../components/shared/ClienteCRMModal';
import { useProdutos } from '../contexts/ProdutosContext';

const PEST_OPTIONS = [
  { id: 'baratas',    label: 'Baratas'     },
  { id: 'formigas',   label: 'Formigas'    },
  { id: 'ratos',      label: 'Ratos'       },
  { id: 'cupins',     label: 'Cupins'      },
  { id: 'escorpioes', label: 'Escorpiões'  },
  { id: 'pulgas',     label: 'Pulgas'      },
  { id: 'moscas',     label: 'Moscas'      },
  { id: 'aranhas',    label: 'Aranhas'     },
  { id: 'mosquitos',  label: 'Mosquitos'   },
  { id: 'tracas',     label: 'Traças'      },
  { id: 'carrapatos', label: 'Carrapatos'  },
  { id: 'percevejos', label: 'Percevejos'  },
  { id: 'barbeiros',  label: 'Barbeiros'   },
];

/** Gera lista de IDs sugeridos usando o mapeamento configurado no Admin */
function gerarProdutosSugeridos(pragas, productsDb, mapeamento = {}) {
  const added = new Set();
  const result = [];
  const tryAdd = (prodId) => {
    const prod = productsDb[prodId];
    if (!prod) return;
    const key = prod.registro || prod.id;
    if (!added.has(key)) { result.push(prod.id); added.add(key); }
  };
  for (const pest of pragas) {
    const preferido = mapeamento[pest];
    if (preferido) {
      tryAdd(preferido);
    } else {
      const fallback = Object.values(productsDb).find(p => (p.targets || []).includes(pest));
      if (fallback) tryAdd(fallback.id);
    }
  }
  return result;
}

const fmtBRL = (v) => (typeof v === 'number' ? v : Number(v) || 0)
  .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtData = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR');
  } catch { return iso; }
};

const getAtividadeCliente = (obj = {}) =>
  obj.clienteAtividade || obj.atividadeEconomica || obj.atividade || '';

// Calcula próxima visita: dataInicio + (visitas já realizadas × frequenciaMeses)
function calcularProximaVisita(contrato) {
  if (!contrato.dataInicio) return null;
  try {
    const [y, m, d] = contrato.dataInicio.split('-').map(Number);
    const inicio = new Date(y, m - 1, d);
    const hoje = new Date();
    if (inicio > hoje) return inicio;
    // Avança N meses até passar de hoje
    const freq = Math.max(1, contrato.frequenciaMeses || 1);
    let proxima = new Date(inicio);
    while (proxima < hoje) {
      proxima.setMonth(proxima.getMonth() + freq);
    }
    return proxima;
  } catch { return null; }
}

// ─── Tipos de serviço por contrato ──────────────────────────────────────────

export const TIPOS_SERVICO_CONTRATO = [
  { id: 'dedetizacao',      label: 'Dedetização'                  },
  { id: 'caixa_agua',       label: "Higienização de Caixa d'Água"  },
  { id: 'descupinizacao',   label: 'Descupinização'                },
  { id: 'desratizacao',     label: 'Desratização'                  },
  { id: 'escorpioes',       label: 'Controle de Escorpiões'        },
  { id: 'pombos',           label: 'Controle de Pombos'            },
  { id: 'relatorio_mensal', label: 'Relatório Mensal'              },
  { id: 'relatorio_branco', label: 'Relatório Livre'               },
  { id: 'outro',            label: 'Outro'                         },
];

// Tipos de documento emitível e a aba correspondente em /documentos
const TIPOS_DOCUMENTO_EMITIR = [
  { id: 'laudo',            label: 'Laudo Técnico',   tab: 'laudo',            icon: FileText    },
  { id: 'orcamento',        label: 'Orçamento',       tab: 'orcamento',        icon: DollarSign  },
  { id: 'recibo',           label: 'Recibo',          tab: 'recibo',           icon: Receipt     },
  { id: 'relatorio_mensal', label: 'Relatório Mensal',tab: 'relatorio_mensal', icon: ClipboardList },
  { id: 'relatorio_branco', label: 'Relatório Livre', tab: 'relatorio_branco', icon: BarChart2   },
];

const SERVICO_DEFAULT = { id: 'dedetizacao', label: 'Dedetização', frequenciaMeses: 1, ativo: true };

const EMPTY_FORM = {
  id: null,
  clienteId: '', clienteNome: '', clienteFantasia: '', clienteCnpj: '',
  clienteTelefone: '', clienteEndereco: '', clienteAtividade: '',
  dataInicio: new Date().toISOString().slice(0, 10),
  duracaoMeses: 12,
  frequenciaMeses: 1,      // mantido para compatibilidade (= menor freq dos serviços)
  diaPreferencial: 5,
  horaPreferencial: '08:00',
  valorMensal: '',
  pragas: [],
  produtos: [],
  garantiaMeses: 1,
  tecnico: '',
  observacoes: '',
  ativo: true,
  servicos: [{ ...SERVICO_DEFAULT }],
};

// ─── Componente principal ────────────────────────────────────────────────────

export default function Contratos() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { produtos: produtosCtx, addProduto: addProdutoCtx, mapeamento } = useProdutos();

  // Produtos vindos do banco via contexto global (fonte única de verdade)
  const productsDb = useMemo(
    () => Object.fromEntries((produtosCtx || []).map(p => [p.id, p])),
    [produtosCtx]
  );

  const [contratos, setContratos] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [busca, setBusca]         = useState('');
  const [filtroStatus, setFiltroStatus] = useState('ativos');
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [salvando, setSalvando]   = useState(false);
  const [erroForm, setErroForm]   = useState('');
  const [confirmDel, setConfirmDel] = useState(null);
  const [agenda, setAgenda]       = useState([]);
  const [clientePerfil, setClientePerfil] = useState(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const [lista, eventos] = await Promise.all([
        contratoApi.getAll(),
        getAgendamentos().catch(() => []),
      ]);
      setContratos(Array.isArray(lista) ? lista : []);
      setAgenda(Array.isArray(eventos) ? eventos : []);
    } catch (e) {
      addToast(e.message || 'Erro ao carregar contratos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const contratosFiltrados = useMemo(() => {
    let lista = [...contratos];
    if (filtroStatus === 'ativos')   lista = lista.filter(c => c.ativo);
    if (filtroStatus === 'inativos') lista = lista.filter(c => !c.ativo);
    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      lista = lista.filter(c =>
        (c.clienteNome || '').toLowerCase().includes(q) ||
        (c.clienteFantasia || '').toLowerCase().includes(q) ||
        (c.clienteCnpj || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''))
      );
    }
    return lista;
  }, [contratos, busca, filtroStatus]);

  const stats = useMemo(() => ({
    total: contratos.length,
    ativos: contratos.filter(c => c.ativo).length,
    valorMensal: contratos.filter(c => c.ativo).reduce((s, c) => s + (c.valorMensal || 0), 0),
  }), [contratos]);

  // ── Form helpers ────────────────────────────────────────────────────────────

  const set = (campo, valor) => setForm(p => ({ ...p, [campo]: valor }));

  const togglePraga = (id) => {
    setForm(p => {
      const novasPragas = p.pragas.includes(id)
        ? p.pragas.filter(x => x !== id)
        : [...p.pragas, id];
      // Auto-seleciona produtos compatíveis com as novas pragas
      const sugeridos = gerarProdutosSugeridos(novasPragas, productsDb, mapeamento);
      return { ...p, pragas: novasPragas, produtos: sugeridos };
    });
  };

  const toggleProduto = (id) => {
    setForm(p => ({
      ...p,
      produtos: p.produtos.includes(id) ? p.produtos.filter(x => x !== id) : [...p.produtos, id]
    }));
  };

  const adicionarServico = (tipoId) => {
    const tipo = TIPOS_SERVICO_CONTRATO.find(t => t.id === tipoId);
    if (!tipo) return;
    setForm(p => ({
      ...p,
      servicos: [...(p.servicos || []), { id: tipo.id, label: tipo.label, frequenciaMeses: 1, ativo: true }],
    }));
  };

  const atualizarServico = (idx, campo, valor) => {
    setForm(p => {
      const novos = [...(p.servicos || [])];
      novos[idx] = { ...novos[idx], [campo]: valor };
      return { ...p, servicos: novos };
    });
  };

  const removerServico = (idx) => {
    setForm(p => ({
      ...p,
      servicos: (p.servicos || []).filter((_, i) => i !== idx),
    }));
  };

  const abrirNovo = () => {
    setForm(EMPTY_FORM);
    setErroForm('');
    setShowForm(true);
  };

  const abrirEditar = (c) => {
    // Migração suave: contratos antigos sem campo "servicos" recebem default
    const servicos = Array.isArray(c.servicos) && c.servicos.length > 0
      ? c.servicos
      : [{ id: 'dedetizacao', label: 'Dedetização', frequenciaMeses: c.frequenciaMeses || 1, ativo: true }];
    setForm({
      ...EMPTY_FORM,
      ...c,
      pragas: c.pragas || [],
      produtos: c.produtos || [],
      valorMensal: c.valorMensal || '',
      servicos,
    });
    setErroForm('');
    setShowForm(true);
  };

  const handleSelectCliente = (c) => {
    setForm(p => ({
      ...p,
      clienteId: c.id || '',
      clienteNome: c.nome || '',
      clienteFantasia: c.fantasia || '',
      clienteCnpj: c.cnpj || '',
      clienteTelefone: c.telefone || '',
      clienteEndereco: c.endereco || '',
      clienteAtividade: getAtividadeCliente(c),
    }));
    setPickerOpen(false);
  };

  // ── Salvar contrato (cria/edita + agendamentos + pasta) ────────────────────

  const salvar = async () => {
    setErroForm('');
    if (!form.clienteNome.trim() && !form.clienteFantasia.trim()) {
      setErroForm('Selecione um cliente');
      return;
    }
    if (!form.dataInicio) {
      setErroForm('Defina a data de início');
      return;
    }
    if (form.duracaoMeses < 1) {
      setErroForm('Duração deve ser ≥ 1 mês');
      return;
    }
    const servicosAtivos = (form.servicos || []).filter(s => s.ativo);
    if (servicosAtivos.length === 0) {
      setErroForm('Adicione ao menos um serviço ao contrato');
      return;
    }

    // Calcular frequenciaMeses como o menor intervalo entre os serviços (para calcularProximaVisita)
    const freqMinima = Math.min(...servicosAtivos.map(s => s.frequenciaMeses || 1));

    setSalvando(true);
    try {
      const dadosContrato = {
        ...form,
        valorMensal: parseFloat(form.valorMensal) || 0,
        frequenciaMeses: freqMinima,
        servicos: form.servicos,
      };

      const contratoSalvo = form.id
        ? await contratoApi.update(form.id, dadosContrato)
        : await contratoApi.create(dadosContrato);

      // Cria pasta no OneDrive (best-effort)
      try {
        await contratoApi.criarPasta(contratoSalvo.id);
      } catch (e) {
        addToast(`Contrato salvo, mas pasta não criada: ${e.message}`, 'warning');
      }

      // Cria agendamentos recorrentes na agenda (apenas para novos contratos)
      if (!form.id) {
        try {
          const [y, m, d] = form.dataInicio.split('-').map(Number);
          const dataPrimeira = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          let totalVisitasGeral = 0;

          for (const servico of servicosAtivos) {
            const freq = servico.frequenciaMeses || 1;
            const totalVisitas = Math.max(1, Math.floor(form.duracaoMeses / freq));
            totalVisitasGeral += totalVisitas;

            await criarAgendamentoComRecorrencia({
              tipo: 'servico',
              categoriaServico: 'contrato',
              contratoId: contratoSalvo.id,
              clienteId: contratoSalvo.clienteId,
              clienteNome: contratoSalvo.clienteNome,
              clienteFantasia: contratoSalvo.clienteFantasia,
              clienteCnpj: contratoSalvo.clienteCnpj,
              clienteTelefone: contratoSalvo.clienteTelefone,
              clienteEndereco: contratoSalvo.clienteEndereco,
              clienteAtividade: getAtividadeCliente(contratoSalvo),
              tipoServico: servico.label,
              tecnico: contratoSalvo.tecnico,
              data: dataPrimeira,
              hora: contratoSalvo.horaPreferencial || '08:00',
              status: 'Agendado',
              observacao: `Contrato · ${servico.label} · ${freq === 1 ? 'mensal' : `cada ${freq} meses`}`,
              recorrente: true,
              frequenciaMeses: freq,
              quantidadeVisitas: totalVisitas,
            });
          }
          addToast(`Contrato criado · ${totalVisitasGeral} visitas agendadas`, 'success');
        } catch (e) {
          addToast(`Contrato salvo, mas falhou ao criar agendamentos: ${e.message}`, 'warning');
        }
      } else {
        addToast('Contrato atualizado', 'success');
      }

      setShowForm(false);
      carregar();
    } catch (e) {
      setErroForm(e.message || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async () => {
    if (!confirmDel) return;
    try {
      const resp = await contratoApi.delete(confirmDel.id);
      const totalAgenda = resp?.agendamentosExcluidos || 0;
      addToast('Contrato excluído', 'success');
      if (totalAgenda > 0) {
        addToast(`${totalAgenda} serviÃ§o(s) removido(s) da agenda`, 'success');
      }
      setConfirmDel(null);
      carregar();
    } catch (e) {
      addToast(e.message || 'Erro ao excluir', 'error');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Briefcase size={24} className="text-emerald-500" />
            Contratos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Clientes recorrentes com agendamentos automáticos e pasta dedicada.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={carregar}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            title="Atualizar"
          >
            <RefreshCw size={16} />
          </button>
          <button onClick={abrirNovo}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow-md shadow-emerald-500/25 transition"
          >
            <Plus size={16} /> Novo Contrato
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Ativos"     value={stats.ativos}  color="emerald" icon={Check} />
        <StatCard label="Total"      value={stats.total}   color="slate"   icon={Briefcase} />
        <StatCard label="Receita/mês" value={fmtBRL(stats.valorMensal)} color="brand" icon={null} small />
      </div>

      {/* Busca + Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por cliente ou CNPJ..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
          />
          {busca && (
            <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          {[
            { v: 'ativos',   l: 'Ativos'   },
            { v: 'todos',    l: 'Todos'    },
            { v: 'inativos', l: 'Inativos' },
          ].map(f => (
            <button key={f.v} onClick={() => setFiltroStatus(f.v)}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold transition border ${
                filtroStatus === f.v
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300'
              }`}
            >{f.l}</button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
          {[1, 2, 3].map(i => (
            <div key={i} className="px-5 py-4">
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/3" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/2 mt-2" />
            </div>
          ))}
        </div>
      ) : contratosFiltrados.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <Briefcase size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="font-bold text-slate-600 dark:text-slate-300">Nenhum contrato encontrado</p>
          <p className="text-sm text-slate-400 mt-1">
            {contratos.length === 0 ? 'Crie seu primeiro contrato.' : 'Ajuste os filtros.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {contratosFiltrados.map(c => (
            <ContratoCard key={c.id} contrato={c} agenda={agenda}
              onEditar={() => abrirEditar(c)}
              onExcluir={() => setConfirmDel(c)}
              onAgenda={() => navigate('/agenda', { state: { cliente: { nome: c.clienteNome, cnpj: c.clienteCnpj } } })}
              onVerPerfil={() => setClientePerfil({ nome: c.clienteNome, fantasia: c.clienteFantasia, cnpj: c.clienteCnpj, endereco: c.clienteEndereco, telefone: c.clienteTelefone, atividade: getAtividadeCliente(c), email: '' })}
            />
          ))}
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <ContratoFormModal
          form={form}
          onChange={setForm}
          onSet={set}
          onTogglePraga={togglePraga}
          onToggleProduto={toggleProduto}
          productsDb={productsDb}
          onAddProduto={(p) => {
            addProdutoCtx(p);
            setForm(f => ({ ...f, produtos: [...(f.produtos || []), p.id] }));
          }}
          onSelectCliente={() => setPickerOpen(true)}
          onAdicionarServico={adicionarServico}
          onAtualizarServico={atualizarServico}
          onRemoverServico={removerServico}
          onSalvar={salvar}
          onCancelar={() => setShowForm(false)}
          salvando={salvando}
          erro={erroForm}
        />
      )}

      <ClientePickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelectCliente}
      />

      <ClienteCRMModal
        cliente={clientePerfil}
        onClose={() => setClientePerfil(null)}
        onVerAgenda={(c) => { setClientePerfil(null); navigate('/agenda', { state: { cliente: { nome: c.nome, cnpj: c.cnpj } } }); }}
      />

      {confirmDel && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle size={20} className="text-red-500" />
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-white">Excluir contrato?</p>
                <p className="text-xs text-slate-400">Os serviços agendados por este contrato também serão removidos.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2 mb-5 truncate">
              {confirmDel.clienteFantasia || confirmDel.clienteNome}
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDel(null)}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition">
                Cancelar
              </button>
              <button onClick={excluir}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white transition">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stat card simples ───────────────────────────────────────────────────────

function StatCard({ label, value, color, icon: Icon, small }) {
  const cls = {
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400',
    slate:   'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300',
    brand:   'bg-brand-50 dark:bg-brand-900/20 border-brand-100 dark:border-brand-800/30 text-brand-600 dark:text-brand-400',
  }[color] || '';
  return (
    <div className={`rounded-2xl p-4 border ${cls}`}>
      <p className={`${small ? 'text-lg' : 'text-2xl'} font-bold leading-none`}>{value}</p>
      <p className="text-xs font-medium mt-1 opacity-80">{label}</p>
    </div>
  );
}

// ─── helpers de tipo de documento ───────────────────────────────────────────

const TIPO_DOC_META = {
  laudo:             { label: 'Laudo',       color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',       icon: FileText     },
  recibo:            { label: 'Recibo',      color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: Receipt },
  orcamento:         { label: 'Orçamento',   color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',   icon: DollarSign   },
  relatorio_mensal:  { label: 'Rel. Mensal', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300', icon: ClipboardList },
  relatorio_branco:  { label: 'Rel. Livre',  color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300', icon: BarChart2    },
  servico:           { label: 'Visita',      color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',      icon: Calendar     },
};

const STATUS_COLOR = {
  'Agendado':  'text-blue-500',
  'Concluído': 'text-emerald-500',
  'Cancelado': 'text-red-400',
  'Emitido':   'text-violet-500',
};

// ─── Card de contrato ────────────────────────────────────────────────────────

function ContratoCard({ contrato, agenda, onEditar, onExcluir, onAgenda, onVerPerfil }) {
  const navigate = useNavigate();
  const proxima = calcularProximaVisita(contrato);
  const [expandido, setExpandido] = useState(false);
  const [emitirOpen, setEmitirOpen] = useState(false);

  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  const handleEmitirDocumento = async (tipo) => {
    setEmitirOpen(false);
    setCarregandoHistorico(true);

    const cnpjDigits = (contrato.clienteCnpj || '').replace(/\D/g, '');
    let historico = null;
    let clienteDb = null;

    // Buscar histórico do último documento desse tipo para o cliente
    if (cnpjDigits) {
      try {
        const resp = await fetch(
          `/api/documentos/historico-cliente?cnpj=${cnpjDigits}&tipo=${tipo.id}`,
          { credentials: 'same-origin' }
        );
        if (resp.ok) {
          const data = await resp.json();
          if (data.encontrado) historico = data.metadados;
        }
      } catch {}
    }

    const atividadeContrato = getAtividadeCliente(contrato);
    if (!atividadeContrato && (contrato.clienteId || cnpjDigits)) {
      try {
        const clientes = await clienteApi.getAll(cnpjDigits || '');
        const lista = Array.isArray(clientes) ? clientes : [];
        clienteDb = lista.find(c => contrato.clienteId && c.id === contrato.clienteId)
          || lista.find(c => cnpjDigits && (c.cnpj || '').replace(/\D/g, '') === cnpjDigits)
          || lista[0]
          || null;
      } catch {}
    }

    const atividade = atividadeContrato || getAtividadeCliente(clienteDb);

    setCarregandoHistorico(false);

    try {
      sessionStorage.setItem('__prefill_cliente', JSON.stringify({
        id:        contrato.clienteId       || clienteDb?.id || '',
        nome:      contrato.clienteNome     || '',
        fantasia:  contrato.clienteFantasia || '',
        cnpj:      contrato.clienteCnpj    || '',
        endereco:  contrato.clienteEndereco || '',
        atividade,
        atividadeEconomica: atividade,
        configuracoes: contrato.configuracoes || clienteDb?.configuracoes,
        historico, // metadados do último doc deste tipo para este cliente
      }));
    } catch {}

    // Passa o tab na URL para que Documentos.jsx inicialize já no tab certo,
    // evitando que outro componente monte primeiro e consuma o sessionStorage
    navigate(`/documentos?tab=${tipo.tab}`, { state: { tab: tipo.tab } });
  };

  // Filtra eventos da agenda vinculados a este contrato ou ao CNPJ do cliente
  const cnpjLimpo = (contrato.clienteCnpj || '').replace(/\D/g, '');
  const eventosCliente = useMemo(() => {
    if (!agenda?.length) return [];
    return agenda.filter(ev => {
      if (contrato.id && ev.contratoId === contrato.id) return true;
      if (cnpjLimpo && (ev.clienteCnpj || '').replace(/\D/g, '') === cnpjLimpo) return true;
      return false;
    }).sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  }, [agenda, contrato.id, cnpjLimpo]);

  // Separa visitas agendadas das emissões de documentos
  const visitas   = eventosCliente.filter(ev => ev.tipo === 'servico');
  const docs      = eventosCliente.filter(ev => ev.tipo !== 'servico');

  // Estatísticas rápidas
  const concluidas  = visitas.filter(v => v.status === 'Concluído').length;
  const agendadas   = visitas.filter(v => v.status === 'Agendado').length;
  const laudos      = docs.filter(d => d.tipo === 'laudo').length;
  const relatorios  = docs.filter(d => d.tipo?.startsWith('relatorio')).length;

  // Próximas 3 visitas agendadas (futuras)
  const hoje = new Date().toISOString().slice(0, 10);
  const proximasVisitas = visitas
    .filter(v => v.status === 'Agendado' && v.data >= hoje)
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 3);

  // Últimos 5 documentos emitidos
  const ultimosDocs = docs.slice(0, 5);

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border transition-shadow hover:shadow-md flex flex-col
      ${contrato.ativo ? 'border-emerald-200 dark:border-emerald-800/30' : 'border-slate-200 dark:border-slate-700 opacity-70'}`}
    >
      {/* Cabeçalho */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
              <Briefcase size={15} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-slate-800 dark:text-white leading-tight truncate">
                {contrato.clienteFantasia || contrato.clienteNome}
              </p>
              {contrato.clienteCnpj && (
                <p className="text-[10px] font-mono text-slate-400 truncate">{contrato.clienteCnpj}</p>
              )}
            </div>
          </div>
          <div className="flex gap-0.5 shrink-0">
            <button onClick={onEditar} title="Editar"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition">
              <Edit2 size={13} />
            </button>
            <button onClick={onExcluir} title="Excluir"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Chips de informações */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg px-2 py-1.5">
            <p className="text-[9px] text-slate-400 uppercase font-bold">Duração</p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{contrato.duracaoMeses}m</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg px-2 py-1.5">
            <p className="text-[9px] text-slate-400 uppercase font-bold">Frequência</p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              {contrato.frequenciaMeses === 1 ? 'Mensal' : `${contrato.frequenciaMeses}/m`}
            </p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-2 py-1.5 col-span-2">
            <p className="text-[9px] text-emerald-700 dark:text-emerald-400 uppercase font-bold">Valor mensal</p>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{fmtBRL(contrato.valorMensal)}</p>
          </div>
        </div>

        {/* Resumo agenda em linha */}
        {eventosCliente.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {concluidas > 0 && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-bold">
                <Check size={9} /> {concluidas} {concluidas === 1 ? 'visita concluída' : 'visitas concluídas'}
              </span>
            )}
            {agendadas > 0 && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold">
                <Calendar size={9} /> {agendadas} {agendadas === 1 ? 'agendada' : 'agendadas'}
              </span>
            )}
            {laudos > 0 && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold">
                <FileText size={9} /> {laudos} {laudos === 1 ? 'laudo' : 'laudos'}
              </span>
            )}
            {relatorios > 0 && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-bold">
                <ClipboardList size={9} /> {relatorios} {relatorios === 1 ? 'relatório' : 'relatórios'}
              </span>
            )}
          </div>
        )}

        {/* Próxima visita */}
        {proxima && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2">
            <Calendar size={11} className="text-emerald-500" />
            <span>Próxima visita: <strong className="text-slate-700 dark:text-slate-200">{proxima.toLocaleDateString('pt-BR')}</strong></span>
          </div>
        )}

        {contrato.pasta && (
          <p className="flex items-center gap-1.5 text-[10px] text-slate-400 truncate mb-2" title={contrato.pasta}>
            <FolderOpen size={10} /> {contrato.pasta}
          </p>
        )}
      </div>

      {/* Seção expandível — linha do tempo */}
      {eventosCliente.length > 0 && (
        <>
          <button
            onClick={() => setExpandido(v => !v)}
            className="mx-4 mb-3 flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-50 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <span className="flex items-center gap-1.5">
              <BarChart2 size={12} /> Histórico & Documentos ({eventosCliente.length})
            </span>
            {expandido ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {expandido && (
            <div className="px-4 pb-4 space-y-3">

              {/* Próximas visitas agendadas */}
              {proximasVisitas.length > 0 && (
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Próximas Visitas</p>
                  <div className="space-y-1">
                    {proximasVisitas.map(ev => (
                      <div key={ev.id} className="flex items-center gap-2 text-xs py-1.5 px-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                        <Calendar size={11} className="text-blue-500 shrink-0" />
                        <span className="font-bold text-blue-700 dark:text-blue-300">{fmtData(ev.data)}</span>
                        {ev.hora && <span className="text-blue-400">{ev.hora}</span>}
                        <span className="text-slate-500 truncate flex-1">{ev.tipoServico || 'Visita'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documentos emitidos */}
              {ultimosDocs.length > 0 && (
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Documentos Emitidos</p>
                  <div className="space-y-1">
                    {ultimosDocs.map(ev => {
                      const meta = TIPO_DOC_META[ev.tipo] || TIPO_DOC_META.laudo;
                      const Icon = meta.icon;
                      return (
                        <div key={ev.id} className="flex items-center gap-2 text-xs py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
                          <Icon size={11} className="shrink-0 text-slate-400" />
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${meta.color}`}>{meta.label}</span>
                          {ev.numeroDoc && <span className="font-mono text-slate-500 shrink-0">#{ev.numeroDoc}</span>}
                          <span className="text-slate-400 shrink-0">{fmtData(ev.data)}</span>
                          {ev.status && (
                            <span className={`ml-auto font-bold shrink-0 ${STATUS_COLOR[ev.status] || 'text-slate-400'}`}>{ev.status}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Visitas passadas resumidas */}
              {visitas.filter(v => v.data < hoje).length > 0 && (
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Visitas Realizadas</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {visitas
                      .filter(v => v.data < hoje)
                      .slice(0, 10)
                      .map(ev => (
                        <div key={ev.id} className="flex items-center gap-2 text-xs py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/30">
                          <Calendar size={10} className="text-slate-300 shrink-0" />
                          <span className="text-slate-500 shrink-0">{fmtData(ev.data)}</span>
                          <span className="text-slate-400 truncate flex-1">{ev.tipoServico || 'Visita'}</span>
                          <span className={`font-bold shrink-0 ${STATUS_COLOR[ev.status] || 'text-slate-400'}`}>{ev.status}</span>
                        </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Rodapé */}
      <div className="px-4 pb-4 mt-auto space-y-2">
        {/* Botão Emitir Documento */}
        <div className="relative">
          <button
            onClick={() => !carregandoHistorico && setEmitirOpen(v => !v)}
            disabled={carregandoHistorico}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm shadow-blue-500/20 disabled:opacity-70"
          >
            {carregandoHistorico
              ? <><Loader2 size={13} className="animate-spin" /> Carregando histórico…</>
              : <><FileText size={13} /> Emitir Documento {emitirOpen ? <ChevronUp size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}</>
            }
          </button>
          {emitirOpen && (
            <>
              {/* Overlay para fechar ao clicar fora */}
              <div className="fixed inset-0 z-40" onClick={() => setEmitirOpen(false)} />
              <div className="absolute bottom-full mb-1 left-0 right-0 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <p className="px-3 pt-2.5 pb-1 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Emitir para {contrato.clienteFantasia || contrato.clienteNome}
                </p>
                {TIPOS_DOCUMENTO_EMITIR.map(tipo => {
                  const Icon = tipo.icon;
                  return (
                    <button
                      key={tipo.id}
                      onClick={() => handleEmitirDocumento(tipo)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 transition border-t border-slate-100 dark:border-slate-700 first:border-0"
                    >
                      <Icon size={14} className="text-blue-500 shrink-0" />
                      {tipo.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={onVerPerfil}
            className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/40 transition border border-brand-100 dark:border-brand-800/30">
            <Users size={12} /> Perfil 360°
          </button>
          <button onClick={onAgenda}
            className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold bg-slate-50 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <Calendar size={12} /> Agenda
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Form modal (criar/editar contrato) ──────────────────────────────────────

function ContratoFormModal({
  form, onSet, onTogglePraga, onToggleProduto, productsDb, onAddProduto,
  onSelectCliente, onAdicionarServico, onAtualizarServico, onRemoverServico,
  onSalvar, onCancelar, salvando, erro,
}) {
  const labelCls = 'block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5';
  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500';
  const [showAddServico, setShowAddServico] = useState(false);
  const [showNovoProduto, setShowNovoProduto] = useState(false);
  const [novoProduto, setNovoProduto] = useState({ nome: '', grupo: '', principio: '', registro: '', concentracao: '', diluente: '', equipamento: '', antidoto: '', targets: [] });
  const [erroProduto, setErroProduto] = useState('');

  const servicos = form.servicos || [];
  const servicosAtivos = servicos.filter(s => s.ativo);
  const idsJaAdicionados = servicos.map(s => s.id);
  const tiposDisponiveis = TIPOS_SERVICO_CONTRATO.filter(t => !idsJaAdicionados.includes(t.id));

  // Resumo por serviço
  const resumoServicos = servicosAtivos.map(s => {
    const freq = s.frequenciaMeses || 1;
    const visitas = Math.max(1, Math.floor((form.duracaoMeses || 0) / freq));
    return { ...s, visitas, freq };
  });
  const totalVisitas = resumoServicos.reduce((acc, s) => acc + s.visitas, 0);
  const valorTotal   = (parseFloat(form.valorMensal) || 0) * (form.duracaoMeses || 0);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/30">
              <Briefcase size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">
                {form.id ? 'Editar Contrato' : 'Novo Contrato'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {form.id ? 'Altera dados; agendamentos não são recriados.' : 'Será gerada a pasta + agendamentos automáticos.'}
              </p>
            </div>
          </div>
          <button onClick={onCancelar}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Cliente */}
          <div>
            <label className={labelCls}>Cliente</label>
            {form.clienteNome || form.clienteFantasia ? (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                  <Building2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{form.clienteNome}</p>
                  {form.clienteFantasia && <p className="text-xs text-slate-500 truncate">{form.clienteFantasia}</p>}
                  {form.clienteCnpj && <p className="text-[10px] font-mono text-slate-400">{form.clienteCnpj}</p>}
                </div>
                <button onClick={onSelectCliente}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium shrink-0">
                  Trocar
                </button>
              </div>
            ) : (
              <button onClick={onSelectCliente}
                className="w-full flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 hover:border-emerald-400 hover:text-emerald-600 dark:hover:border-emerald-500 transition text-sm font-medium">
                <Search size={16} /> Selecionar cliente...
              </button>
            )}
          </div>

          {/* Datas e prazos */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Data de Início</label>
              <input type="date" value={form.dataInicio}
                onChange={e => onSet('dataInicio', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Hora preferencial</label>
              <input type="time" value={form.horaPreferencial}
                onChange={e => onSet('horaPreferencial', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Duração (meses)</label>
              <input type="number" min={1} max={120} value={form.duracaoMeses}
                onChange={e => onSet('duracaoMeses', parseInt(e.target.value, 10) || 1)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Garantia (meses)</label>
              <input type="number" min={0} max={60} value={form.garantiaMeses}
                onChange={e => onSet('garantiaMeses', parseInt(e.target.value, 10) || 0)} className={inputCls} />
            </div>
          </div>

          {/* Valor */}
          <div>
            <label className={labelCls}>Valor mensal (R$)</label>
            <input type="number" step="0.01" min={0}
              value={form.valorMensal === 0 || form.valorMensal === '' ? '' : form.valorMensal}
              onChange={e => onSet('valorMensal', e.target.value === '' ? '' : e.target.value)}
              placeholder="0,00"
              className={inputCls} />
          </div>

          {/* Serviços do contrato */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls + ' mb-0'}>Serviços do Contrato</label>
              {tiposDisponiveis.length > 0 && (
                <div className="relative">
                  <button onClick={() => setShowAddServico(o => !o)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 transition">
                    <Plus size={12} /> Adicionar
                  </button>
                  {showAddServico && (
                    <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 z-10 overflow-hidden">
                      {tiposDisponiveis.map(t => (
                        <button key={t.id}
                          onClick={() => { onAdicionarServico(t.id); setShowAddServico(false); }}
                          className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition">
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {servicos.length === 0 && (
                <p className="text-xs text-slate-400 italic py-2">Nenhum serviço adicionado.</p>
              )}
              {servicos.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/30">
                  <input type="checkbox" checked={s.ativo}
                    onChange={e => onAtualizarServico(idx, 'ativo', e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 shrink-0" />
                  <span className={`flex-1 text-sm font-medium truncate ${s.ativo ? 'text-slate-800 dark:text-white' : 'text-slate-400 line-through'}`}>
                    {s.label}
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">a cada</span>
                  <input type="number" min={1} max={60}
                    value={s.frequenciaMeses}
                    onChange={e => onAtualizarServico(idx, 'frequenciaMeses', parseInt(e.target.value, 10) || 1)}
                    className="w-14 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-center text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  <span className="text-xs text-slate-400 shrink-0">mês(es)</span>
                  {servicos.length > 1 && (
                    <button onClick={() => onRemoverServico(idx)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition shrink-0">
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Resumo calculado */}
          <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-3 space-y-1.5">
            {resumoServicos.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-emerald-800 dark:text-emerald-300 font-medium">{s.label}</span>
                <span className="text-emerald-700 dark:text-emerald-400">
                  <strong>{s.visitas}</strong> visita{s.visitas !== 1 ? 's' : ''}
                  <span className="text-emerald-500 ml-1">· {s.freq === 1 ? 'mensal' : `cada ${s.freq} meses`}</span>
                </span>
              </div>
            ))}
            {resumoServicos.length > 0 && (
              <div className="pt-1.5 mt-1 border-t border-emerald-200 dark:border-emerald-800/40 flex justify-between">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold tracking-wide">
                  Total · {totalVisitas} visita{totalVisitas !== 1 ? 's' : ''}
                </span>
                <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">{fmtBRL(valorTotal)}</span>
              </div>
            )}
          </div>

          {/* Pragas */}
          <div>
            <label className={labelCls}>Pragas controladas</label>
            <div className="flex flex-wrap gap-1.5">
              {PEST_OPTIONS.map(p => {
                const ativo = (form.pragas || []).includes(p.id);
                return (
                  <button key={p.id} type="button" onClick={() => onTogglePraga(p.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition
                      ${ativo
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-emerald-300'
                      }`}
                  >{p.label}</button>
                );
              })}
            </div>
            {(form.pragas || []).length > 0 && (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
                <Check size={10} /> Produtos sugeridos atualizados automaticamente
              </p>
            )}
          </div>

          {/* Produtos — compatíveis com as pragas selecionadas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls + ' mb-0'}>Produtos aplicados</label>
              <button type="button" onClick={() => setShowNovoProduto(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition">
                <Plus size={11} /> Novo produto
              </button>
            </div>

            {(() => {
              const pragas = form.pragas || [];
              const selecionados = form.produtos || [];
              const allProds = Object.values(productsDb || {});

              // compatíveis com pelo menos uma praga selecionada
              const compativeis = pragas.length === 0
                ? allProds
                : allProds.filter(p => p.targets?.some(t => pragas.includes(t)));

              // incompatíveis mas selecionados manualmente
              const incompativeisSelecionados = selecionados
                .filter(id => !compativeis.find(p => p.id === id))
                .map(id => productsDb[id])
                .filter(Boolean);

              const listar = [...compativeis, ...incompativeisSelecionados];

              if (listar.length === 0) {
                return (
                  <p className="text-xs text-slate-400 italic py-2 text-center">
                    Selecione as pragas acima para ver os produtos compatíveis.
                  </p>
                );
              }

              return (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                  {listar.map(p => {
                    const ativo = selecionados.includes(p.id);
                    const ehCompativel = pragas.length === 0 || p.targets?.some(t => pragas.includes(t));
                    // pragas que este produto cobre (dentre as selecionadas)
                    const pragasCobe = PEST_OPTIONS.filter(po =>
                      pragas.includes(po.id) && p.targets?.includes(po.id)
                    );
                    return (
                      <label key={p.id}
                        className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition
                          ${ativo
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
                            : 'bg-white dark:bg-slate-700/30 border-slate-200 dark:border-slate-600 hover:border-slate-300'
                          }`}
                      >
                        <input type="checkbox" checked={ativo}
                          onChange={() => onToggleProduto(p.id)}
                          className="mt-0.5 w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-sm font-bold truncate ${ativo ? 'text-emerald-800 dark:text-emerald-200' : 'text-slate-700 dark:text-slate-200'}`}>
                              {p.nome}
                            </span>
                            {!ehCompativel && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-bold shrink-0">manual</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{p.principio} · {p.concentracao}</p>
                          {pragasCobe.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {pragasCobe.map(pc => (
                                <span key={pc.id} className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium">
                                  {pc.label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Modal: novo produto */}
          {showNovoProduto && (
            <div className="fixed inset-0 z-[199999] flex items-center justify-center p-4 bg-black/60">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-700">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 dark:text-white">Novo Produto</h4>
                  <button onClick={() => { setShowNovoProduto(false); setErroProduto(''); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                    <X size={14} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  {[
                    ['nome', 'Nome do produto *'],
                    ['grupo', 'Grupo químico'],
                    ['principio', 'Princípio ativo'],
                    ['registro', 'Nº Registro MS'],
                    ['concentracao', 'Concentração / dose'],
                    ['diluente', 'Diluente'],
                    ['equipamento', 'Equipamento'],
                    ['antidoto', 'Antídoto / emergência'],
                  ].map(([campo, label]) => (
                    <div key={campo}>
                      <label className={labelCls}>{label}</label>
                      <input value={novoProduto[campo]}
                        onChange={e => setNovoProduto(p => ({ ...p, [campo]: e.target.value }))}
                        className={inputCls} />
                    </div>
                  ))}
                  <div>
                    <label className={labelCls}>Pragas que combate *</label>
                    <div className="flex flex-wrap gap-1.5">
                      {PEST_OPTIONS.map(po => {
                        const sel = novoProduto.targets.includes(po.id);
                        return (
                          <button key={po.id} type="button"
                            onClick={() => setNovoProduto(p => ({
                              ...p,
                              targets: sel ? p.targets.filter(t => t !== po.id) : [...p.targets, po.id]
                            }))}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border-2 transition
                              ${sel ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 text-slate-500 hover:border-emerald-300'}`}>
                            {po.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {erroProduto && (
                    <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{erroProduto}</p>
                  )}
                </div>
                <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 flex gap-2 justify-end">
                  <button onClick={() => { setShowNovoProduto(false); setErroProduto(''); }}
                    className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition">
                    Cancelar
                  </button>
                  <button onClick={() => {
                    if (!novoProduto.nome.trim()) { setErroProduto('Nome obrigatório.'); return; }
                    if (novoProduto.targets.length === 0) { setErroProduto('Selecione ao menos uma praga.'); return; }
                    const reg = (novoProduto.registro || '').trim();
                    if (reg && reg !== '-') {
                      const dup = Object.values(productsDb).find(p => p.registro === reg);
                      if (dup) { setErroProduto(`Já existe produto com este Nº MS (${dup.nome}).`); return; }
                    }
                    const id = 'prod_' + Date.now();
                    onAddProduto({ id, ...novoProduto, registro: reg || '-', grupo: novoProduto.grupo || '-', principio: novoProduto.principio || '-', concentracao: novoProduto.concentracao || '-', diluente: novoProduto.diluente || '-', equipamento: novoProduto.equipamento || '-', antidoto: novoProduto.antidoto || '-' });
                    setNovoProduto({ nome: '', grupo: '', principio: '', registro: '', concentracao: '', diluente: '', equipamento: '', antidoto: '', targets: [] });
                    setErroProduto('');
                    setShowNovoProduto(false);
                  }}
                    className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition">
                    Salvar produto
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Observações */}
          <div>
            <label className={labelCls}>Observações</label>
            <textarea rows={2} value={form.observacoes}
              onChange={e => onSet('observacoes', e.target.value)}
              placeholder="Detalhes do contrato, instruções especiais..."
              className={inputCls} />
          </div>

          {/* Ativo */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.ativo}
              onChange={e => onSet('ativo', e.target.checked)}
              className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500" />
            <span className="text-sm text-slate-700 dark:text-slate-200">Contrato ativo</span>
          </label>

          {erro && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {erro}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex gap-2 justify-end bg-slate-50 dark:bg-slate-900/30">
          <button onClick={onCancelar} disabled={salvando}
            className="px-4 py-2.5 rounded-xl text-sm font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition disabled:opacity-60">
            Cancelar
          </button>
          <button onClick={onSalvar} disabled={salvando}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition shadow-md shadow-emerald-500/30 disabled:opacity-60">
            {salvando ? <><Loader2 size={13} className="animate-spin" /> Salvando…</> : <><Check size={13} /> {form.id ? 'Salvar alterações' : 'Criar Contrato'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
