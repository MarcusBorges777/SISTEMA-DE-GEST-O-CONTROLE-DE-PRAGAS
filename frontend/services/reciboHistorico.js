/**
 * Histórico financeiro de recibos por cliente, armazenado em localStorage.
 * Chave: 'dedetizadora_recibos_historico'
 * Formato: { [cnpj_ou_cpf_numerico]: { total, contagem, ultimoRecibo } }
 */

const CHAVE = 'dedetizadora_recibos_historico';

/**
 * Retorna o histórico acumulado de um cliente pelo CPF/CNPJ.
 * @param {string} cnpj — CPF ou CNPJ (qualquer formatação)
 * @returns {{ total: number, contagem: number, ultimoRecibo: string|null }}
 */
export function getHistoricoCliente(cnpj) {
  try {
    const raw = localStorage.getItem(CHAVE);
    const data = raw ? JSON.parse(raw) : {};
    const key = (cnpj || '').replace(/\D/g, '');
    if (!key) return { total: 0, contagem: 0, ultimoRecibo: null };
    return data[key] || { total: 0, contagem: 0, ultimoRecibo: null };
  } catch {
    return { total: 0, contagem: 0, ultimoRecibo: null };
  }
}

/**
 * Registra um novo recibo para o cliente, acumulando ao total existente.
 * @param {string} cnpj  — CPF ou CNPJ do cliente
 * @param {number} valor — Valor total do recibo em reais (número)
 */
export function registrarRecibo(cnpj, valor) {
  try {
    const raw = localStorage.getItem(CHAVE);
    const data = raw ? JSON.parse(raw) : {};
    const key = (cnpj || '').replace(/\D/g, '');
    if (!key) return;
    const atual = data[key] || { total: 0, contagem: 0, ultimoRecibo: null };
    data[key] = {
      total: (atual.total || 0) + (valor || 0),
      contagem: (atual.contagem || 0) + 1,
      ultimoRecibo: new Date().toISOString(),
    };
    localStorage.setItem(CHAVE, JSON.stringify(data));
  } catch {
    // silently ignore storage errors
  }
}

/**
 * Retorna todo o histórico (útil para debug ou listagens futuras).
 * @returns {object}
 */
export function getTodoHistorico() {
  try {
    const raw = localStorage.getItem(CHAVE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Remove o histórico de um cliente específico.
 * @param {string} cnpj
 */
export function limparHistoricoCliente(cnpj) {
  try {
    const raw = localStorage.getItem(CHAVE);
    const data = raw ? JSON.parse(raw) : {};
    const key = (cnpj || '').replace(/\D/g, '');
    delete data[key];
    localStorage.setItem(CHAVE, JSON.stringify(data));
  } catch {}
}
