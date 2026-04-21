/**
 * useCnpjAutofill — Hook de preenchimento automático por CNPJ/CPF
 *
 * Funciona em 2 camadas:
 *  1. BUSCA LOCAL: verifica se o CNPJ/CPF já existe no clienteCache (localStorage).
 *     Se sim, preenche na hora sem nenhuma requisição de rede.
 *  2. BUSCA EXTERNA: se não existir na base local e for CNPJ (14 dígitos),
 *     consulta a Brasil API e auto-preenche com os dados da Receita Federal.
 *
 * @param {Function} onFill  — (dados: ClienteShape, fonte: 'local'|'api') => void
 *                             Chamado quando os dados estão prontos para preencher o form.
 *                             ClienteShape: { nome, fantasia, cnpj, endereco, atividade, email, telefone }
 * @param {Function} [onClear] — () => void — chamado quando o campo é limpo (< 2 dígitos)
 */

import { useState, useEffect, useRef } from 'react';
import { buscarCNPJ } from '../services/brasilApi';
import { getClientes } from '../services/clienteCache';

// ─── Helpers de máscara ───────────────────────────────────────────────────────

function maskCpf(d) {
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

function maskCnpj(d) {
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
}

export function applyMask(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) return maskCpf(digits);
  return maskCnpj(digits);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCnpjAutofill({ onFill, onClear } = {}) {
  const [value, setValue] = useState('');          // valor formatado exibido no input
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null);      // { text, type: 'success'|'error'|'info' }

  const lastDigits = useRef('');                   // evita re-busca do mesmo número

  // Gatilho automático: observa o valor e dispara quando completo
  useEffect(() => {
    const digits = value.replace(/\D/g, '');

    // Limpa ao apagar
    if (digits.length < 2) {
      setStatus(null);
      lastDigits.current = '';
      if (onClear) onClear();
      return;
    }

    // Só age quando atingir 11 (CPF) ou 14 (CNPJ) dígitos
    const complete = digits.length === 11 || digits.length === 14;
    if (!complete || digits === lastDigits.current) return;
    lastDigits.current = digits;

    // ── 1. BUSCA LOCAL ────────────────────────────────────────────────────────
    const clientes = getClientes();
    const local = clientes.find(c =>
      c.cnpj && c.cnpj.replace(/\D/g, '') === digits
    );
    if (local) {
      setStatus({ text: 'Cliente encontrado na base local!', type: 'success' });
      if (onFill) onFill({
        nome:      local.nome      || '',
        fantasia:  local.fantasia  || '',
        cnpj:      local.cnpj      || value,
        endereco:  local.endereco  || '',
        atividade: local.atividade || '',
        email:     local.email     || '',
        telefone:  local.telefone  || '',
      }, 'local');
      return;
    }

    // ── 2. BUSCA EXTERNA (apenas CNPJ, 14 dígitos) ────────────────────────────
    if (digits.length !== 14) {
      // CPF não encontrado localmente — sem API externa disponível
      setStatus({ text: 'CPF não encontrado na base local.', type: 'info' });
      return;
    }

    setIsLoading(true);
    setStatus({ text: 'Consultando Receita Federal...', type: 'loading' });

    buscarCNPJ(digits)
      .then(dados => {
        setStatus({ text: 'Dados preenchidos automaticamente pela Receita Federal.', type: 'success' });
        if (onFill) onFill({
          nome:      dados.nome      || '',
          fantasia:  dados.fantasia  || '',
          cnpj:      dados.cnpj      || value,
          endereco:  dados.endereco  || '',
          atividade: dados.atividade || '',
          email:     dados.email     || '',
          telefone:  dados.telefone  || '',
        }, 'api');
      })
      .catch(err => {
        setStatus({ text: err.message || 'CNPJ não encontrado.', type: 'error' });
      })
      .finally(() => setIsLoading(false));

  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handler que o input deve usar no onChange
  function handleChange(e) {
    const raw = e.target.value;
    const masked = applyMask(raw);
    setValue(masked);
    setStatus(null);           // limpa mensagem antiga ao redigitar
    lastDigits.current = '';   // permite re-busca se o usuário apagou e redigitou
  }

  // Permite setar externamente (ex: ao carregar metadados de um PDF salvo)
  function setExternal(formatted) {
    setValue(formatted || '');
    lastDigits.current = '';
    setStatus(null);
  }

  return {
    cnpjValue: value,        // valor formatado para o input
    handleCnpjChange: handleChange,
    setCnpjExternal: setExternal,
    isLoadingCnpj: isLoading,
    cnpjStatus: status,      // { text, type } ou null
  };
}
