import { useState } from 'react';
import { salvarDocumento } from '../utils/salvarDocumento';
import { saveCliente, getClientes } from '../services/clienteCache';

/**
 * Hook compartilhado para ações de documento (PDF + salvar cliente).
 *
 * @param {object} options
 * @param {'laudo'|'recibo'|'orcamento'} options.tipo  — tipo do documento
 * @param {() => string} options.getNumeroDoc           — retorna o número atual do doc
 * @param {() => string} options.getNomeEmpresa         — retorna o nome do cliente/empresa
 *
 * @returns {{ salvandoPdf, handleSalvarPdf, handleSalvarCliente }}
 */
export function useDocumentoActions({ tipo, getNumeroDoc, getNomeEmpresa }) {
  const [salvandoPdf, setSalvandoPdf] = useState(false);

  /** Captura o #a4-document como PDF e envia ao backend. */
  const handleSalvarPdf = async () => {
    setSalvandoPdf(true);
    try {
      const result = await salvarDocumento({
        elementId: 'a4-document',
        tipo,
        numeroDoc: getNumeroDoc(),
        nomeEmpresa: getNomeEmpresa(),
      });
      if (result.sucesso) alert(`PDF salvo: ${result.nomeArquivo}`);
      else alert(`Erro ao salvar: ${result.erro}`);
    } finally {
      setSalvandoPdf(false);
    }
  };

  /**
   * Salva o cliente no cache local (localStorage).
   * @param {object} clientData  — { nome, fantasia, cnpj, endereco, atividade }
   * @param {Function} setCnpjError — setter de erro do campo CNPJ (opcional)
   * @returns {Array|undefined} lista atualizada de clientes, ou undefined se inválido
   */
  const handleSalvarCliente = (clientData, setCnpjError) => {
    if (!clientData.nome?.trim() || !clientData.cnpj?.trim()) {
      setCnpjError?.('Preencha ao menos Nome e CNPJ antes de salvar.');
      return;
    }
    saveCliente({
      nome:     clientData.nome,
      fantasia: clientData.fantasia,
      cnpj:     clientData.cnpj,
      endereco: clientData.endereco,
      atividade: clientData.atividade,
    });
    setCnpjError?.('');
    return getClientes();
  };

  return { salvandoPdf, handleSalvarPdf, handleSalvarCliente };
}
