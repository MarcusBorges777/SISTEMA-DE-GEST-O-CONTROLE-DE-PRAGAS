/**
 * salvarDocumento.js
 * Captura cada página .a4-page individualmente e gera PDF A4 multipágina.
 * Cada página é forçada a ocupar exatamente 210×297mm (A4 retrato),
 * garantindo alinhamento perfeito e sem deslocamento de conteúdo.
 * Padrão de nome: "#0001 Razão Social 03-26.pdf"
 */

export async function salvarDocumento({ elementId, tipo, numeroDoc, nomeEmpresa, mesAno }) {
  try {
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    const container = document.getElementById(elementId);
    if (!container) {
      return { sucesso: false, erro: `Elemento #${elementId} não encontrado` };
    }

    // Selecionar apenas as páginas A4 reais
    const paginas = Array.from(container.querySelectorAll('.a4-page'));
    if (paginas.length === 0) {
      return { sucesso: false, erro: 'Nenhuma página A4 encontrada para gerar PDF' };
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const A4_W = pdf.internal.pageSize.getWidth();  // 210mm
    const A4_H = pdf.internal.pageSize.getHeight(); // 297mm

    for (let i = 0; i < paginas.length; i++) {
      const pagina = paginas[i];

      // Garantir que o elemento está completamente renderizado antes de capturar
      const elW = pagina.offsetWidth  || pagina.scrollWidth;
      const elH = pagina.offsetHeight || pagina.scrollHeight;

      const canvas = await html2canvas(pagina, {
        scale: 3,                   // Alta resolução (3× = ~225dpi para A4)
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: elW,
        height: elH,
        windowWidth: elW,
        windowHeight: elH,
        scrollX: 0,
        scrollY: -window.scrollY,   // Evita deslocamento pelo scroll da página
      });

      // Usar PNG para qualidade máxima (sem artefatos de compressão JPEG)
      const imgData = canvas.toDataURL('image/png');

      if (i > 0) pdf.addPage();

      // Forçar cada página a ocupar EXATAMENTE A4 (210×297mm)
      // Isso elimina qualquer deslocamento por diferença de proporção
      pdf.addImage(imgData, 'PNG', 0, 0, A4_W, A4_H);
    }

    const pdfBlob = pdf.output('blob');

    const agora = new Date();
    const mesAnoFinal = mesAno || `${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getFullYear()).slice(-2)}`;

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
