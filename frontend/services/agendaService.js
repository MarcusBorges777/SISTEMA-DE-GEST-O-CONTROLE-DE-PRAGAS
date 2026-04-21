/**
 * agendaService — Persistência local de agendamentos (localStorage)
 *
 * Evento (AgendaEvent):
 * {
 *   id:              string   — UUID gerado localmente
 *   clienteNome:     string
 *   clienteFantasia: string
 *   clienteCnpj:     string
 *   clienteTelefone: string
 *   clienteEndereco: string
 *   tipoServico:     string   — 'Desinsetização' | 'Desratização' | 'Descupinização' | 'Higienização' | 'Limpeza de Caixa d\'Água' | 'Outro'
 *   data:            string   — 'YYYY-MM-DD'
 *   hora:            string   — 'HH:MM'
 *   status:          string   — 'Agendado' | 'Concluído' | 'Cancelado'
 *   observacao:      string
 *   criadoEm:        string   — ISO8601
 * }
 */

const AGENDA_KEY = 'dedetizadora_agenda';

function gerarId() {
  return `ag_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Retorna todos os agendamentos ordenados por data+hora (ASC) */
export function getAgendamentos() {
  try {
    const raw = localStorage.getItem(AGENDA_KEY);
    if (!raw) return [];
    const lista = JSON.parse(raw);
    return lista.sort((a, b) => {
      const da = `${a.data}T${a.hora || '00:00'}`;
      const db = `${b.data}T${b.hora || '00:00'}`;
      return da < db ? -1 : da > db ? 1 : 0;
    });
  } catch {
    return [];
  }
}

/** Salva novo agendamento — retorna o evento criado */
export function criarAgendamento(dados) {
  const lista = getAgendamentos();
  const evento = {
    id:              gerarId(),
    clienteNome:     dados.clienteNome     || '',
    clienteFantasia: dados.clienteFantasia || '',
    clienteCnpj:     dados.clienteCnpj     || '',
    clienteTelefone: dados.clienteTelefone || '',
    clienteEndereco: dados.clienteEndereco || '',
    tipoServico:     dados.tipoServico     || 'Desinsetização',
    data:            dados.data            || '',
    hora:            dados.hora            || '',
    status:          dados.status          || 'Agendado',
    observacao:      dados.observacao      || '',
    criadoEm:        new Date().toISOString(),
  };
  lista.push(evento);
  _salvar(lista);
  return evento;
}

/** Atualiza campos de um agendamento existente */
export function atualizarAgendamento(id, campos) {
  const lista = getAgendamentos().map(ev =>
    ev.id === id ? { ...ev, ...campos } : ev
  );
  _salvar(lista);
}

/** Remove um agendamento pelo id */
export function excluirAgendamento(id) {
  const lista = getAgendamentos().filter(ev => ev.id !== id);
  _salvar(lista);
}

/** Retorna agendamentos de um cliente específico (por CNPJ) */
export function getAgendamentosCliente(cnpj) {
  const cnpjLimpo = (cnpj || '').replace(/\D/g, '');
  return getAgendamentos().filter(ev =>
    ev.clienteCnpj.replace(/\D/g, '') === cnpjLimpo
  );
}

function _salvar(lista) {
  try {
    localStorage.setItem(AGENDA_KEY, JSON.stringify(lista));
  } catch {
    console.warn('Falha ao salvar agenda');
  }
}

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

export const STATUS_OPTIONS = [
  { value: 'Agendado',  label: 'Agendado',  color: 'blue'  },
  { value: 'Concluído', label: 'Concluído', color: 'green' },
  { value: 'Cancelado', label: 'Cancelado', color: 'red'   },
];
