/**
 * salvarDocumento.js
 * Captura um elemento HTML como PDF e envia para o backend salvar com nomenclatura correta.
 * Padrão de nome: "#0001 Razão Social 03-26.pdf"
 */

/**
 * @param {Object} opts
 * @param {string} opts.elementId - ID do elemento HTML a capturar (ex: 'a4-document')
 * @param {string} opts.tipo - 'laudo' | 'orcamento' | 'recibo'
 * @param {string} opts.numeroDoc - número do documento (ex: '0001')
 * @param {string} opts.nomeEmpresa - razão social ou nome fantasia
 * @param {string} [opts.mesAno] - 'MM-AA', default: mês/ano atual
 * @returns {Promise<{sucesso: boolean, nomeArquivo?: string, erro?: string}>}
 */
export async function salvarDocumento({ elementId, tipo, numeroDoc, nomeEmpresa, mesAno }) {
  try {
    // Import dinâmico para não afetar o bundle inicial se não usado
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    const elemento = document.getElementById(elementId);
    if (!elemento) {
      return { sucesso: false, erro: `Elemento #${elementId} não encontrado` };
    }

    // Capturar o elemento como canvas
    const canvas = await html2canvas(elemento, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    // Converter para PDF A4
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    // Converter para Blob
    const pdfBlob = pdf.output('blob');

    // Gerar mes-ano padrão se não informado
    const agora = new Date();
    const mesAnoFinal = mesAno || `${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getFullYear()).slice(-2)}`;

    // Enviar para o backend
    const formData = new FormData();
    formData.append('arquivo', pdfBlob, 'documento.pdf');
    formData.append('tipo', tipo);
    formData.append('numero_doc', String(numeroDoc).padStart(4, '0'));
    formData.append('nome_empresa', nomeEmpresa || 'Empresa');
    formData.append('mes_ano', mesAnoFinal);

    const resp = await fetch('/api/documentos/salvar-pdf', {
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return { sucesso: false, erro: err.error || 'Erro ao salvar no servidor' };
    }

    const data = await resp.json();
    return { sucesso: true, nomeArquivo: data.nome_arquivo };
  } catch (e) {
    console.error('[salvarDocumento]', e);
    return { sucesso: false, erro: e.message || 'Erro inesperado' };
  }
}
