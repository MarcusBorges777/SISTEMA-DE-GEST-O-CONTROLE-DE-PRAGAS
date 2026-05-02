import { configApi } from '../services/dbService';

function digits(value) {
  return (value || '').replace(/\D/g, '');
}

function padNumero(numero, tipo) {
  const width = ['recibo', 'orcamento'].includes(tipo) ? 5 : 4;
  return String(parseInt(numero, 10) || 1).padStart(width, '0');
}

function refCliente(clienteOrCnpj) {
  if (typeof clienteOrCnpj === 'string') {
    return { cnpj: digits(clienteOrCnpj) };
  }
  return {
    clienteId: clienteOrCnpj?.id || clienteOrCnpj?.clienteId || null,
    cnpj: digits(clienteOrCnpj?.cnpj || ''),
  };
}

async function obterNumero(clienteOrCnpj, tipo, incrementar = false) {
  const ref = refCliente(clienteOrCnpj);
  if (!ref.clienteId && !ref.cnpj) return null;
  if (!ref.clienteId && ref.cnpj.length < 11) return null;
  try {
    const data = await configApi.proximoNumero(tipo, { ...ref, incrementar });
    return {
      ...data,
      numeroFormatado: padNumero(data.numero, tipo),
    };
  } catch {
    return null;
  }
}

export async function fetchProximoNumero(clienteOrCnpj, tipo) {
  const data = await obterNumero(clienteOrCnpj, tipo, false);
  return data?.numeroFormatado || null;
}

export async function incrementarProximoNumero(clienteOrCnpj, tipo) {
  const data = await obterNumero(clienteOrCnpj, tipo, true);
  return data?.numeroFormatado || null;
}

export async function fetchConfigDocumento(clienteOrCnpj, tipo) {
  return obterNumero(clienteOrCnpj, tipo, false);
}
