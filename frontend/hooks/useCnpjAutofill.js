/**
 * useCnpjAutofill — Hook de preenchimento automático por CNPJ/CPF
 *
 * Funciona em 2 camadas:
 *  1. BUSCA LOCAL: verifica no db.json via /api/db/clientes?q=
 *     Se encontrado, preenche na hora sem chamar API externa.
 *  2. BUSCA EXTERNA: se não existir na base local e for CNPJ (14 dígitos),
 *     consulta a Brasil API com dados da Receita Federal.
 *
 * @param {Function} onFill  — (dados: ClienteShape, fonte: 'local'|'api') => void
 * @param {Function} [onClear] — () => void — chamado quando o campo é limpo (< 2 dígitos)
 */

import { useState, useEffect, useRef } from 'react';
import { buscarCNPJ } from '../services/brasilApi';
import { clienteApi } from '../services/dbService';

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
  const [value, setValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null); // { text, type: 'success'|'error'|'info'|'loading' }

  const lastDigits = useRef('');
  const cancelled = useRef(false);

  useEffect(() => {
    const digits = value.replace(/\D/g, '');

    if (digits.length < 2) {
      setStatus(null);
      lastDigits.current = '';
      onClear?.();
      return;
    }

    const complete = digits.length === 11 || digits.length === 14;
    if (!complete || digits === lastDigits.current) return;
    lastDigits.current = digits;

    cancelled.current = false;

    async function buscar() {
      // ── 1. BUSCA LOCAL (db.json via backend) ─────────────────────────────
      try {
        const resultados = await clienteApi.getAll(digits);
        if (cancelled.current) return;

        const local = resultados.find(c =>
          c.cnpj && c.cnpj.replace(/\D/g, '') === digits
        );

        if (local) {
          setStatus({ text: 'Cliente encontrado na base local!', type: 'success' });
          onFill?.({
            id:        local.id        || null,
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
      } catch {
        // Se o backend estiver offline, continua para a API externa
      }

      // ── 2. BUSCA EXTERNA (apenas CNPJ, 14 dígitos) ───────────────────────
      if (digits.length !== 14) {
        setStatus({ text: 'CPF não encontrado na base local.', type: 'info' });
        return;
      }

      setIsLoading(true);
      setStatus({ text: 'Consultando Receita Federal...', type: 'loading' });

      try {
        const dados = await buscarCNPJ(digits);
        if (cancelled.current) return;
        setStatus({ text: 'Dados preenchidos automaticamente pela Receita Federal.', type: 'success' });
        onFill?.({
          id:        null,
          nome:      dados.nome      || '',
          fantasia:  dados.fantasia  || '',
          cnpj:      dados.cnpj      || value,
          endereco:  dados.endereco  || '',
          atividade: dados.atividade || '',
          email:     dados.email     || '',
          telefone:  dados.telefone  || '',
        }, 'api');
      } catch (err) {
        if (!cancelled.current)
          setStatus({ text: err.message || 'CNPJ não encontrado.', type: 'error' });
      } finally {
        if (!cancelled.current) setIsLoading(false);
      }
    }

    buscar();

    return () => { cancelled.current = true; };
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(e) {
    const masked = applyMask(e.target.value);
    setValue(masked);
    setStatus(null);
    lastDigits.current = '';
  }

  function setExternal(formatted) {
    setValue(formatted || '');
    lastDigits.current = '';
    setStatus(null);
  }

  return {
    cnpjValue: value,
    handleCnpjChange: handleChange,
    setCnpjExternal: setExternal,
    isLoadingCnpj: isLoading,
    cnpjStatus: status,
  };
}
