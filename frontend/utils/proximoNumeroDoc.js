/**
 * Busca o próximo número de documento para um cliente+tipo no servidor.
 * O número é derivado da contagem de documentos ativos — quando um doc
 * é excluído, o contador regride automaticamente.
 *
 * @param {string} cnpj  CNPJ do cliente (qualquer formato)
 * @param {string} tipo  'laudo' | 'recibo' | 'orcamento' | 'relatorio_mensal' | 'relatorio_branco'
 * @returns {Promise<string|null>}  Número zero-preenchido (ex: "0010") ou null se não disponível
 */
export async function fetchProximoNumero(cnpj, tipo) {
  const digits = (cnpj || '').replace(/\D/g, '');
  if (digits.length < 11) return null;
  try {
    const resp = await fetch(
      `/api/documentos/proximo-numero?cnpj=${digits}&tipo=${tipo.toUpperCase()}`,
      { credentials: 'same-origin' }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.numero || null;
  } catch {
    return null;
  }
}
