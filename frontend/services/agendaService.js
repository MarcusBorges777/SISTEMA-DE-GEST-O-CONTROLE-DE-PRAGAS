/**
 * agendaService — Persistência no db.json via backend (/api/db/agenda).
 * Todas as funções de escrita são agora async.
 * Constantes e funções de Admin (técnicos/equipes) continuam em localStorage.
 */

import { agendaApi } from './dbService';

function gerarId() {
  return `ag_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function _buildEvento(dados) {
  return {
    id:               dados.id              || gerarId(),
    tipo:             dados.tipo             || 'servico',
    clienteId:        dados.clienteId       || null,
    clienteNome:      dados.clienteNome      || '',
    clienteFantasia:  dados.clienteFantasia  || '',
    clienteCnpj:      dados.clienteCnpj      || '',
    clienteTelefone:  dados.clienteTelefone  || '',
    clienteEndereco:  dados.clienteEndereco  || '',
    tipoServico:      dados.tipoServico      || '',
    categoriaServico: dados.categoriaServico || '',  // Cor visual (Contrato, Dedet+Caixa, etc.)
    contratoId:       dados.contratoId       || null,  // Vínculo com /contratos
    tecnico:          dados.tecnico          || '',
    recorrente:       dados.recorrente       || false,
    frequenciaMeses:  dados.frequenciaMeses  || 0,
    recorrenciaId:    dados.recorrenciaId    || '',
    numeroDoc:        dados.numeroDoc        || '',
    data:             dados.data             || '',
    hora:             dados.hora             || '',
    status:           dados.status           || 'Agendado',
    observacao:       dados.observacao       || '',
    criadoEm:         dados.criadoEm         || new Date().toISOString(),
  };
}

// ─── Leitura ───────────────────────────────────────────────────────────────────

export async function getAgendamentos() {
  try {
    return await agendaApi.getAll();
  } catch {
    return [];
  }
}

export async function getServicos() {
  const todos = await getAgendamentos();
  return todos.filter(ev => ev.tipo === 'servico');
}

export async function getAgendamentosCliente(cnpj) {
  const cnpjLimpo = (cnpj || '').replace(/\D/g, '');
  const todos = await getAgendamentos();
  return todos.filter(ev =>
    (ev.clienteCnpj || '').replace(/\D/g, '') === cnpjLimpo
  );
}

// ─── Escrita ───────────────────────────────────────────────────────────────────

export async function criarAgendamento(dados) {
  const evento = _buildEvento(dados);
  return agendaApi.upsert(evento);
}

export async function criarAgendamentoComRecorrencia(dados) {
  const eventos = [];
  const primeiro = await criarAgendamento(dados);
  eventos.push(primeiro);

  if (!dados.recorrente || !dados.frequenciaMeses) return eventos;

  const freq = parseInt(dados.frequenciaMeses, 10) || 1;
  const [baseYear, baseMonth, baseDay] = dados.data.split('-').map(Number);
  // quantidadeVisitas vem dos contratos (duracaoMeses / freq).
  // Para serviços avulsos, default = 12 / freq (1 ano).
  const passos = dados.quantidadeVisitas
    ? Math.max(0, parseInt(dados.quantidadeVisitas, 10) - 1) // -1 porque já criou o primeiro
    : Math.floor(12 / freq);

  for (let i = 1; i <= passos; i++) {
    const totalMeses = (baseYear * 12 + baseMonth - 1) + i * freq;
    const novoAno = Math.floor(totalMeses / 12);
    const novoMes = (totalMeses % 12) + 1;
    const ultimoDia = new Date(novoAno, novoMes, 0).getDate();
    const novoDia = Math.min(baseDay, ultimoDia);
    const novaData = `${novoAno}-${String(novoMes).padStart(2, '0')}-${String(novoDia).padStart(2, '0')}`;

    const ev = await criarAgendamento({
      ...dados,
      data: novaData,
      status: 'Agendado',
      recorrenciaId: primeiro.id,
    });
    eventos.push(ev);
  }

  // Mark the first event with its own recorrenciaId
  await atualizarAgendamento(primeiro.id, { recorrenciaId: primeiro.id });
  return eventos;
}

export async function registrarDocumentoNaAgenda(tipo, cliente, data, numeroDoc, observacao = '') {
  // Idempotency: check if already registered
  try {
    const lista = await agendaApi.getAll();
    const cnpjLimpo = (cliente.cnpj || '').replace(/\D/g, '');
    const jaExiste = lista.some(ev =>
      ev.tipo === tipo &&
      ev.numeroDoc === numeroDoc &&
      ev.data === data &&
      (ev.clienteCnpj || '').replace(/\D/g, '') === cnpjLimpo
    );
    if (jaExiste) return;
  } catch {
    // Se não conseguir verificar, tenta criar mesmo assim
  }

  const evento = _buildEvento({
    tipo,
    clienteNome:     cliente.nome     || cliente.fantasia || '',
    clienteFantasia: cliente.fantasia || '',
    clienteCnpj:     cliente.cnpj     || '',
    clienteTelefone: cliente.telefone || '',
    clienteEndereco: cliente.endereco || '',
    clienteId:       cliente.id       || null,
    numeroDoc,
    data,
    hora:        '',
    status:      'Emitido',
    observacao,
    tipoServico: '',
    tecnico:     '',
  });
  await agendaApi.upsert(evento);
}

export async function atualizarAgendamento(id, campos) {
  return agendaApi.update(id, campos);
}

export async function excluirAgendamento(id) {
  return agendaApi.delete(id);
}

export async function excluirSerieRecorrente(recorrenciaId) {
  return agendaApi.deleteSerie(recorrenciaId);
}

// ─── Técnicos e Equipes dinâmicos (Admin — mantém localStorage) ──────────────

const TECNICOS_KEY = 'dedetizadora_tecnicos';
const EQUIPES_KEY  = 'dedetizadora_equipes';
const TECNICOS_DEFAULT = ['Paulo Borges', 'Maria Aparecida', 'Equipe A', 'Equipe B'];

export function getTecnicos() {
  try {
    const raw = localStorage.getItem(TECNICOS_KEY);
    if (!raw) return [...TECNICOS_DEFAULT];
    const lista = JSON.parse(raw);
    return Array.isArray(lista) && lista.length > 0 ? lista : [...TECNICOS_DEFAULT];
  } catch { return [...TECNICOS_DEFAULT]; }
}

export function salvarTecnicos(lista) {
  try { localStorage.setItem(TECNICOS_KEY, JSON.stringify(lista)); } catch {}
}

export function getEquipes() {
  try {
    return JSON.parse(localStorage.getItem(EQUIPES_KEY) || '[]');
  } catch { return []; }
}

export function salvarEquipes(lista) {
  try { localStorage.setItem(EQUIPES_KEY, JSON.stringify(lista)); } catch {}
}

// ─── Constantes ───────────────────────────────────────────────────────────────

export const TIPOS_SERVICO = [
  'Desinsetização',
  'Desratização',
  'Descupinização',
  "Higienização de Caixa d'Água",
  'Dedetização Geral',
  'Controle de Escorpiões',
  'Controle de Pombos',
  'Outro',
];

export const TECNICOS = [
  'Paulo Borges',
  'Maria Aparecida',
  'Equipe A',
  'Equipe B',
];

export const STATUS_OPTIONS = [
  { value: 'Agendado',  label: 'Agendado',  color: 'blue'   },
  { value: 'Concluído', label: 'Concluído', color: 'green'  },
  { value: 'Cancelado', label: 'Cancelado', color: 'red'    },
  { value: 'Emitido',   label: 'Emitido',   color: 'purple' },
];

export const TIPO_CORES = {
  servico:   { bg: 'bg-blue-500',   light: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',       dot: 'bg-blue-500'   },
  laudo:     { bg: 'bg-purple-500', light: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', dot: 'bg-purple-500' },
  recibo:    { bg: 'bg-orange-500', light: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', dot: 'bg-orange-500' },
  orcamento: { bg: 'bg-yellow-500', light: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', dot: 'bg-yellow-500' },
};

// ─── Categorias de Serviço (cor diferente por tipo de visita) ───────────────
// Permite filtrar e identificar visualmente Contratos vs serviços avulsos.
export const CATEGORIAS_SERVICO = [
  {
    value: 'contrato',
    label: 'Contrato',
    desc:  'Cliente recorrente / mensalidade',
    bg:    'bg-emerald-500',
    light: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    border:'border-emerald-300 dark:border-emerald-700',
    dot:   'bg-emerald-500',
  },
  {
    value: 'dedetizacao_caixa',
    label: 'Dedetização + Caixa',
    desc:  'Combo de dedetização e higienização',
    bg:    'bg-violet-500',
    light: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
    border:'border-violet-300 dark:border-violet-700',
    dot:   'bg-violet-500',
  },
  {
    value: 'dedetizacao',
    label: 'Apenas Dedetização',
    desc:  'Controle de pragas',
    bg:    'bg-blue-500',
    light: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    border:'border-blue-300 dark:border-blue-700',
    dot:   'bg-blue-500',
  },
  {
    value: 'caixa',
    label: "Apenas Caixa d'Água",
    desc:  'Higienização de caixa',
    bg:    'bg-cyan-500',
    light: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200',
    border:'border-cyan-300 dark:border-cyan-700',
    dot:   'bg-cyan-500',
  },
  {
    value: 'outro',
    label: 'Outro',
    desc:  'Serviço pontual',
    bg:    'bg-slate-500',
    light: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    border:'border-slate-300 dark:border-slate-600',
    dot:   'bg-slate-500',
  },
];

export function getCategoriaCor(categoria) {
  return CATEGORIAS_SERVICO.find(c => c.value === categoria) || CATEGORIAS_SERVICO[CATEGORIAS_SERVICO.length - 1];
}

export const STATUS_CORES = {
  'Agendado':  'bg-blue-500',
  'Concluído': 'bg-emerald-500',
  'Cancelado': 'bg-red-500',
  'Emitido':   'bg-purple-500',
};
