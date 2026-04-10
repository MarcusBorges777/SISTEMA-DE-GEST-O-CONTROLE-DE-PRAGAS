import React, { createContext, useContext, useState, useCallback } from 'react';

const EmpresaContext = createContext();

/**
 * Normaliza dados de cliente de qualquer fonte para o formato padrao.
 * Aceita: registro DB local, resultado Brasil API, cache, ou objeto misto.
 */
export function normalizeCliente(record) {
  if (!record) return null;

  // Nome / Fantasia
  const fantasia = record.nome_fantasia || record.fantasia || '';
  const nome = record.razao_social || record.nome || '';

  // CNPJ
  const cnpj = record.cnpj || '';

  // Atividade / CNAE
  const atividade = record.cnae || record.atividade || '';

  // Telefone
  const telefone = record.telefone || record.ddd_telefone_1 || '';

  // Cidade / UF
  const cidade = record.cidade || record.municipio || '';
  const uf = record.uf || 'MG';

  // Endereco — montar a partir de campos separados ou usar o completo
  let endereco = '';
  if (record.endereco_completo) {
    endereco = record.endereco_completo;
  } else if (record.endereco && typeof record.endereco === 'string' && record.endereco.length > 5) {
    endereco = record.endereco;
  } else {
    const rua = record.rua || record.logradouro || '';
    const numero = record.numero || '';
    const bairro = record.bairro || '';
    const partes = [rua, numero ? `N° ${numero}` : '', bairro].filter(Boolean).join(', ');
    const cidadeUf = [cidade, uf].filter(Boolean).join('/');
    endereco = [partes, cidadeUf].filter(Boolean).join(' - ');
  }

  return { nome, fantasia, cnpj, endereco, atividade, telefone, cidade, uf };
}

export function EmpresaProvider({ children }) {
  const [empresa, setEmpresaState] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const setEmpresa = useCallback((empresaObj) => {
    setEmpresaState(empresaObj);
    if (empresaObj) setDrawerOpen(true);
  }, []);

  const clearEmpresa = useCallback(() => {
    setEmpresaState(null);
    setDrawerOpen(false);
  }, []);

  const toggleDrawer = useCallback(() => {
    setDrawerOpen(prev => !prev);
  }, []);

  return (
    <EmpresaContext.Provider value={{ empresa, drawerOpen, setEmpresa, clearEmpresa, toggleDrawer }}>
      {children}
    </EmpresaContext.Provider>
  );
}

export function useEmpresa() {
  const ctx = useContext(EmpresaContext);
  if (!ctx) throw new Error('useEmpresa must be used within EmpresaProvider');
  return ctx;
}
