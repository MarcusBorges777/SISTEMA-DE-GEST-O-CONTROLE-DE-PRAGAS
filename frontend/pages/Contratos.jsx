/**
 * Contratos — Gestão de clientes recorrentes
 *
 * Cadastra contratos com cliente, duração e frequência. Ao salvar, cria
 * automaticamente os agendamentos recorrentes na agenda (categoriaServico='contrato')
 * e abre uma pasta dedicada no OneDrive para os laudos.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, Plus, Edit2, Trash2, Calendar, Clock, Search,
  X, Check, Loader2, Building2, Phone, MapPin, FolderOpen,
  AlertCircle, RefreshCw, FileText,
} from 'lucide-react';
import { contratoApi, clienteApi } from '../services/dbService';
import { criarAgendamentoComRecorrencia, excluirSerieRecorrente } from '../services/agendaService';
import { useToast } from '../components/shared/Toast';
import { ClientePickerModal } from '../components/documentos/ClientePickerModal';
import { useProdutos } from '../contexts/ProdutosContext';

const PEST_OPTIONS = [
  { id: 'baratas', label: 'Baratas' }, { id: 'formigas', label: 'Formigas' },
  { id: 'ratos', label: 'Ratos' }, { id: 'cupins', label: 'Cupins' },
  { id: 'escorpioes', label: 'Escorpiões' }, { id: 'pulgas', label: 'Pulgas' },
  { id: 'moscas', label: 'Moscas' }, { id: 'aranhas', label: 'Aranhas' },
  { id: 'mosquitos', label: 'Mosquitos' }, { id: 'tracas', label: 'Traças' },
];

const fmtBRL = (v) => (typeof v === 'number' ? v : Number(v) || 0)
  .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtData = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR');
  } catch { return iso; }
};

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

const EMPTY_FORM = {
  id: null,
  clienteId: '', clienteNome: '', clienteFantasia: '', clienteCnpj: '',
  clienteTelefone: '', clienteEndereco: '',
  dataInicio: new Date().toISOString().slice(0, 10),
  duracaoMeses: 12,
  frequenciaMeses: 1,
  diaPreferencial: 5,
  horaPreferencial: '08:00',
  valorMensal: 0,
  pragas: [],
  produtos: [],
  garantiaMeses: 1,
  tecnico: '',
  observacoes: '',
  ativo: true,
};

// ─── Componente principal ────────────────────────────────────────────────────

export default function Contratos() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { produtos } = useProdutos();
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

  const carregar = async () => {
    setLoading(true);
    try {
      const lista = await contratoApi.getAll();
      setContratos(Array.isArray(lista) ? lista : []);
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
    setForm(p => ({
      ...p,
      pragas: p.pragas.includes(id) ? p.pragas.filter(x => x !== id) : [...p.pragas, id]
    }));
  };

  const toggleProduto = (id) => {
    setForm(p => ({
      ...p,
      produtos: p.produtos.includes(id) ? p.produtos.filter(x => x !== id) : [...p.produtos, id]
    }));
  };

  const abrirNovo = () => {
    setForm(EMPTY_FORM);
    setErroForm('');
    setShowForm(true);
  };

  const abrirEditar = (c) => {
    setForm({
      ...EMPTY_FORM,
      ...c,
      pragas: c.pragas || [],
      produtos: c.produtos || [],
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
    if (form.duracaoMeses < 1 || form.frequenciaMeses < 1) {
      setErroForm('Duração e frequência devem ser ≥ 1 mês');
      return;
    }

    setSalvando(true);
    try {
      const contratoSalvo = form.id
        ? await contratoApi.update(form.id, form)
        : await contratoApi.create(form);

      // Cria pasta no OneDrive (best-effort)
      try {
        await contratoApi.criarPasta(contratoSalvo.id);
      } catch (e) {
        addToast(`Contrato salvo, mas pasta não criada: ${e.message}`, 'warning');
      }

      // Cria agendamentos recorrentes na agenda (apenas para novos contratos)
      if (!form.id) {
        try {
          const totalVisitas = Math.floor(form.duracaoMeses / form.frequenciaMeses);
          // 1ª visita = dataInicio
          const [y, m, d] = form.dataInicio.split('-').map(Number);
          const dataPrimeira = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

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
            tipoServico: 'Dedetização Geral',
            tecnico: contratoSalvo.tecnico,
            data: dataPrimeira,
            hora: contratoSalvo.horaPreferencial || '08:00',
            status: 'Agendado',
            observacao: `Contrato · ${contratoSalvo.duracaoMeses} meses · visita ${form.frequenciaMeses === 1 ? 'mensal' : `cada ${form.frequenciaMeses} meses`}`,
            recorrente: true,
            frequenciaMeses: form.frequenciaMeses,
            quantidadeVisitas: Math.max(1, totalVisitas),
          });
          addToast(`Contrato criado · ${totalVisitas} visitas agendadas`, 'success');
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
      await contratoApi.delete(confirmDel.id);
      addToast('Contrato excluído', 'success');
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
            <ContratoCard key={c.id} contrato={c}
              onEditar={() => abrirEditar(c)}
              onExcluir={() => setConfirmDel(c)}
              onAgenda={() => navigate('/agenda', { state: { cliente: { nome: c.clienteNome, cnpj: c.clienteCnpj } } })}
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
          produtos={produtos}
          onSelectCliente={() => setPickerOpen(true)}
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

      {confirmDel && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle size={20} className="text-red-500" />
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-white">Excluir contrato?</p>
                <p className="text-xs text-slate-400">Os agendamentos vinculados não são removidos automaticamente.</p>
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

// ─── Card de contrato ────────────────────────────────────────────────────────

function ContratoCard({ contrato, onEditar, onExcluir, onAgenda }) {
  const proxima = calcularProximaVisita(contrato);

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border p-4 transition-shadow hover:shadow-md
      ${contrato.ativo ? 'border-emerald-200 dark:border-emerald-800/30' : 'border-slate-200 dark:border-slate-700 opacity-70'}`}
    >
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

      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
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

      {proxima && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2">
          <Calendar size={11} className="text-emerald-500" />
          <span>Próxima visita: <strong className="text-slate-700 dark:text-slate-200">{proxima.toLocaleDateString('pt-BR')}</strong></span>
        </div>
      )}

      {contrato.pasta && (
        <p className="flex items-center gap-1.5 text-[10px] text-slate-400 truncate" title={contrato.pasta}>
          <FolderOpen size={10} /> {contrato.pasta}
        </p>
      )}

      <button onClick={onAgenda}
        className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold bg-slate-50 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
        <Calendar size={12} /> Ver na Agenda
      </button>
    </div>
  );
}

// ─── Form modal (criar/editar contrato) ──────────────────────────────────────

function ContratoFormModal({
  form, onSet, onTogglePraga, onToggleProduto, produtos,
  onSelectCliente, onSalvar, onCancelar, salvando, erro,
}) {
  const labelCls = 'block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5';
  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500';

  const totalVisitas = Math.floor((form.duracaoMeses || 0) / Math.max(1, form.frequenciaMeses || 1));
  const valorTotal   = (form.valorMensal || 0) * (form.duracaoMeses || 0);

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

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Duração (meses)</label>
              <input type="number" min={1} max={120} value={form.duracaoMeses}
                onChange={e => onSet('duracaoMeses', parseInt(e.target.value, 10) || 1)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Frequência (a cada N meses)</label>
              <input type="number" min={1} max={12} value={form.frequenciaMeses}
                onChange={e => onSet('frequenciaMeses', parseInt(e.target.value, 10) || 1)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Garantia (meses)</label>
              <input type="number" min={0} max={60} value={form.garantiaMeses}
                onChange={e => onSet('garantiaMeses', parseInt(e.target.value, 10) || 0)} className={inputCls} />
            </div>
          </div>

          {/* Resumo calculado */}
          <div className="grid grid-cols-2 gap-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-3">
            <div>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold tracking-wide">Visitas previstas</p>
              <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{totalVisitas}</p>
            </div>
            <div>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold tracking-wide">Valor total</p>
              <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{fmtBRL(valorTotal)}</p>
            </div>
          </div>

          {/* Valor */}
          <div>
            <label className={labelCls}>Valor mensal (R$)</label>
            <input type="number" step="0.01" min={0} value={form.valorMensal}
              onChange={e => onSet('valorMensal', parseFloat(e.target.value) || 0)}
              placeholder="250,00"
              className={inputCls} />
          </div>

          {/* Pragas */}
          <div>
            <label className={labelCls}>Pragas controladas (template)</label>
            <div className="flex flex-wrap gap-1.5">
              {PEST_OPTIONS.map(p => {
                const ativo = (form.pragas || []).includes(p.id);
                return (
                  <button key={p.id} onClick={() => onTogglePraga(p.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition
                      ${ativo
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-emerald-300'
                      }`}
                  >{p.label}</button>
                );
              })}
            </div>
          </div>

          {/* Produtos */}
          {Array.isArray(produtos) && produtos.length > 0 && (
            <div>
              <label className={labelCls}>Produtos padrão (template)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-900/30">
                {produtos.map(p => {
                  const ativo = (form.produtos || []).includes(p.id);
                  return (
                    <label key={p.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition
                      ${ativo
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 font-bold'
                        : 'hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                      <input type="checkbox" checked={ativo}
                        onChange={() => onToggleProduto(p.id)}
                        className="w-3.5 h-3.5 rounded text-emerald-500" />
                      <span className="truncate">{p.nome}</span>
                    </label>
                  );
                })}
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
