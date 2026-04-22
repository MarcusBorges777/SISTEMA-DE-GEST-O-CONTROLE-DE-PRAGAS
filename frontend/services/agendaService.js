/**
 * agendaService — Persistência local de todos os eventos da Agenda (localStorage)
 *
 * Evento unificado (AgendaEvent):
 * {
 *   id:              string   — gerado localmente
 *   tipo:            'servico' | 'laudo' | 'recibo' | 'orcamento'
 *   clienteNome:     string
 *   clienteFantasia: string
 *   clienteCnpj:     string
 *   clienteTelefone: string
 *   clienteEndereco: string
 *   tipoServico:     string
 *   tecnico:         string
 *   recorrente:      boolean
 *   frequenciaMeses: number   — 1 | 3 | 6
 *   recorrenciaId:   string
 *   numeroDoc:       string
 *   data:            string   — 'YYYY-MM-DD'
 *   hora:            string   — 'HH:MM'
 *   status:          string   — 'Agendado' | 'Concluído' | 'Cancelado' | 'Emitido'
 *   observacao:      string
 *   criadoEm:        string   — ISO8601
 * }
 */

const AGENDA_KEY = 'dedetizadora_agenda';

function gerarId() {
  return `ag_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Leitura ───────────────────────────────────────────────────────────────────

export function getAgendamentos() {
  try {
    const raw = localStorage.getItem(AGENDA_KEY);
    if (!raw) return [];
    return JSON.parse(raw).sort((a, b) => {
      const da = `${a.data}T${a.hora || '00:00'}`;
      const db = `${b.data}T${b.hora || '00:00'}`;
      return da < db ? -1 : da > db ? 1 : 0;
    });
  } catch {
    return [];
  }
}

export function getServicos() {
  return getAgendamentos().filter(ev => ev.tipo === 'servico');
}

export function getAgendamentosCliente(cnpj) {
  const cnpjLimpo = (cnpj || '').replace(/\D/g, '');
  return getAgendamentos().filter(ev =>
    (ev.clienteCnpj || '').replace(/\D/g, '') === cnpjLimpo
  );
}

// ─── Escrita ───────────────────────────────────────────────────────────────────

export function criarAgendamento(dados) {
  const lista = getRawLista();
  const evento = _buildEvento(dados);
  lista.push(evento);
  _salvar(lista);
  return evento;
}

export function criarAgendamentoComRecorrencia(dados) {
  const eventos = [];
  const primeiro = criarAgendamento(dados);
  eventos.push(primeiro);

  if (!dados.recorrente || !dados.frequenciaMeses) return eventos;

  const freq = parseInt(dados.frequenciaMeses, 10) || 1;
  const [baseYear, baseMonth, baseDay] = dados.data.split('-').map(Number);
  const MAX_MESES = 12;
  const passos = Math.floor(MAX_MESES / freq);

  for (let i = 1; i <= passos; i++) {
    const totalMeses = (baseYear * 12 + baseMonth - 1) + i * freq;
    const novoAno   = Math.floor(totalMeses / 12);
    const novoMes   = (totalMeses % 12) + 1;
    const ultimoDia = new Date(novoAno, novoMes, 0).getDate();
    const novoDia   = Math.min(baseDay, ultimoDia);
    const novaData  = `${novoAno}-${String(novoMes).padStart(2, '0')}-${String(novoDia).padStart(2, '0')}`;

    const ev = criarAgendamento({
      ...dados,
      data: novaData,
      status: 'Agendado',
      recorrenciaId: primeiro.id,
    });
    eventos.push(ev);
  }

  atualizarAgendamento(primeiro.id, { recorrenciaId: primeiro.id });
  return eventos;
}

export function registrarDocumentoNaAgenda(tipo, cliente, data, numeroDoc, observacao = '') {
  const lista = getRawLista();
  const jaExiste = lista.some(
    ev => ev.tipo === tipo && ev.numeroDoc === numeroDoc && ev.data === data
      && (ev.clienteCnpj || '').replace(/\D/g, '') === (cliente.cnpj || '').replace(/\D/g, '')
  );
  if (jaExiste) return;

  const evento = _buildEvento({
    tipo,
    clienteNome:     cliente.nome     || cliente.fantasia || '',
    clienteFantasia: cliente.fantasia || '',
    clienteCnpj:     cliente.cnpj     || '',
    clienteTelefone: cliente.telefone || '',
    clienteEndereco: cliente.endereco || '',
    numeroDoc,
    data,
    hora:        '',
    status:      'Emitido',
    observacao,
    tipoServico: '',
    tecnico:     '',
  });
  lista.push(evento);
  _salvar(lista);
}

export function atualizarAgendamento(id, campos) {
  const lista = getRawLista().map(ev =>
    ev.id === id ? { ...ev, ...campos } : ev
  );
  _salvar(lista);
}

export function excluirAgendamento(id) {
  _salvar(getRawLista().filter(ev => ev.id !== id));
}

export function excluirSerieRecorrente(recorrenciaId) {
  _salvar(getRawLista().filter(ev => ev.recorrenciaId !== recorrenciaId));
}

// ─── Internos ─────────────────────────────────────────────────────────────────

function getRawLista() {
  try {
    return JSON.parse(localStorage.getItem(AGENDA_KEY) || '[]');
  } catch { return []; }
}

function _salvar(lista) {
  try { localStorage.setItem(AGENDA_KEY, JSON.stringify(lista)); }
  catch { console.warn('Falha ao salvar agenda'); }
}

function _buildEvento(dados) {
  return {
    id:              gerarId(),
    tipo:            dados.tipo            || 'servico',
    clienteNome:     dados.clienteNome     || '',
    clienteFantasia: dados.clienteFantasia || '',
    clienteCnpj:     dados.clienteCnpj     || '',
    clienteTelefone: dados.clienteTelefone || '',
    clienteEndereco: dados.clienteEndereco || '',
    tipoServico:     dados.tipoServico     || '',
    tecnico:         dados.tecnico         || '',
    recorrente:      dados.recorrente      || false,
    frequenciaMeses: dados.frequenciaMeses || 0,
    recorrenciaId:   dados.recorrenciaId   || '',
    numeroDoc:       dados.numeroDoc       || '',
    data:            dados.data            || '',
    hora:            dados.hora            || '',
    status:          dados.status          || 'Agendado',
    observacao:      dados.observacao      || '',
    criadoEm:        new Date().toISOString(),
  };
}

// ─── Constantes ───────────────────────────────────────────────────────────────

export const TIPOS_SERVICO = [
  'Desinsetização',
  'Desratização',
  'Descupinização',
  'Higienização de Caixa d\'Água',
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

// ─── Técnicos e Equipes dinâmicos (Admin) ────────────────────────────────────

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

export const STATUS_CORES = {
  'Agendado':  'bg-blue-500',
  'Concluído': 'bg-emerald-500',
  'Cancelado': 'bg-red-500',
  'Emitido':   'bg-purple-500',
};
