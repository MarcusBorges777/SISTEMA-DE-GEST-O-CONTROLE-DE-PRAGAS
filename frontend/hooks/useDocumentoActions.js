import { useState } from 'react';
import { salvarDocumento } from '../utils/salvarDocumento';
import { saveCliente, getClientes } from '../services/clienteCache';
import { documentoApi } from '../services/dbService';
import { useEmpresa } from '../contexts/EmpresaContext';

/**
 * Hook compartilhado para ações de documento (PDF + salvar cliente + registar no db.json).
 *
 * @param {object} options
 * @param {'laudo'|'recibo'|'orcamento'} options.tipo  — tipo do documento
 * @param {() => string} options.getNumeroDoc           — retorna o número atual do doc
 * @param {() => string} options.getNomeEmpresa         — retorna o nome do cliente/empresa
 * @param {Array}  [options.items]                      — itens do documento (para calcular valor)
 *
 * @returns {{ salvandoPdf, handleSalvarPdf, handleSalvarCliente }}
 */
export function useDocumentoActions({ tipo, getNumeroDoc, getNomeEmpresa, items = [] }) {
  const [salvandoPdf, setSalvandoPdf] = useState(false);
  const { empresa } = useEmpresa();

  const _calcularValorTotal = () => {
    if (!items.length) return null;
    return items.reduce((acc, i) => {
      const val = parseFloat(i.value) || 0;
      const qty = parseFloat(i.quantity) || 1;
      return acc + val * qty;
    }, 0);
  };

  /** Captura o #a4-document como PDF, envia ao backend e regista metadados financeiros. */
  const handleSalvarPdf = async () => {
    setSalvandoPdf(true);
    try {
      const result = await salvarDocumento({
        elementId: 'a4-document',
        tipo,
        numeroDoc: getNumeroDoc(),
        nomeEmpresa: getNomeEmpresa(),
      });

      if (result.sucesso) {
        alert(`PDF salvo: ${result.nomeArquivo}`);

        // Registar metadados financeiros no db.json
        try {
          const valorTotal = tipo === 'laudo' ? null : _calcularValorTotal();
          await documentoApi.registrar({
            clienteId:   empresa?.id    || null,
            clienteCnpj: empresa?.cnpj  || '',
            tipo,
            numero:      getNumeroDoc(),
            valor:       valorTotal,
            nomeArquivo: result.nomeArquivo || '',
            dataCriacao: new Date().toISOString(),
          });
        } catch (dbErr) {
          console.warn('[useDocumentoActions] Falha ao registar no db.json:', dbErr);
        }
      } else {
        alert(`Erro ao salvar: ${result.erro}`);
      }
    } finally {
      setSalvandoPdf(false);
    }
  };

  /**
   * Salva o cliente no db.json (via clienteCache adapter).
   * @param {object} clientData  — { nome, fantasia, cnpj, endereco, atividade }
   * @param {Function} setCnpjError — setter de erro do campo CNPJ (opcional)
   */
  const handleSalvarCliente = async (clientData, setCnpjError) => {
    if (!clientData.nome?.trim() || !clientData.cnpj?.trim()) {
      setCnpjError?.('Preencha ao menos Nome e CNPJ antes de salvar.');
      return;
    }
    await saveCliente({
      nome:      clientData.nome,
      fantasia:  clientData.fantasia,
      cnpj:      clientData.cnpj,
      endereco:  clientData.endereco,
      atividade: clientData.atividade,
      telefone:  clientData.telefone,
      email:     clientData.email,
    });
    setCnpjError?.('');
    return getClientes();
  };

  return { salvandoPdf, handleSalvarPdf, handleSalvarCliente };
}
