/**
 * salvarDocumento.js
 * Captura cada página .a4-page individualmente e gera PDF A4 multipágina.
 * Padrão de nome: "#0001 Razão Social 03-26.pdf"
 */

/**
 * @param {Object} opts
 * @param {string} opts.elementId - ID do container (ex: 'a4-document')
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

    const container = document.getElementById(elementId);
    if (!container) {
      return { sucesso: false, erro: `Elemento #${elementId} não encontrado` };
    }

    // Selecionar apenas as páginas A4 reais (excluindo editor, botões etc.)
    const paginas = Array.from(container.querySelectorAll('.a4-page'));
    if (paginas.length === 0) {
      return { sucesso: false, erro: 'Nenhuma página A4 encontrada para gerar PDF' };
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth  = pdf.internal.pageSize.getWidth();   // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight();  // 297mm

    for (let i = 0; i < paginas.length; i++) {
      const pagina = paginas[i];

      // Capturar a página individualmente
      const canvas = await html2canvas(pagina, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // Calcular altura proporcional mantendo largura A4
      const imgHeightMM = (canvas.height / canvas.width) * pdfWidth;

      if (i > 0) pdf.addPage();

      // Se a página cabe em A4, insere diretamente; senão, pagina com deslocamento
      if (imgHeightMM <= pdfHeight + 1) {
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeightMM);
      } else {
        // Página muito longa: pagina por fatias
        let heightLeft = imgHeightMM;
        let position   = 0;
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeightMM);
        heightLeft -= pdfHeight;
        while (heightLeft > 0.5) {
          position -= pdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeightMM);
          heightLeft -= pdfHeight;
        }
      }
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
