/**
 * salvarDocumento.js
 * Captura um elemento HTML como PDF com paginação A4 automática e envia para o backend.
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
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    const elemento = document.getElementById(elementId);
    if (!elemento) {
      return { sucesso: false, erro: `Elemento #${elementId} não encontrado` };
    }

    // Ocultar elementos que não devem aparecer no PDF (painel editor, botões)
    const noPrintEls = elemento.querySelectorAll('.no-print');
    noPrintEls.forEach(el => { el.style.visibility = 'hidden'; el.style.position = 'absolute'; });

    // Capturar o elemento inteiro em alta resolução
    let canvas;
    try {
      canvas = await html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
    } finally {
      // Restaurar elementos ocultos independente de erro
      noPrintEls.forEach(el => { el.style.visibility = ''; el.style.position = ''; });
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();   // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

    const imgData = canvas.toDataURL('image/jpeg', 0.92);

    // Altura total da imagem em mm mantendo a proporção da largura A4
    const imgHeightMM = (canvas.height / canvas.width) * pdfWidth;

    // Paginação: desloca a imagem para cima a cada página, revelando a próxima fatia
    let heightLeft = imgHeightMM;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeightMM);
    heightLeft -= pdfHeight;

    while (heightLeft > 0.5) {
      position -= pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeightMM);
      heightLeft -= pdfHeight;
    }

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
