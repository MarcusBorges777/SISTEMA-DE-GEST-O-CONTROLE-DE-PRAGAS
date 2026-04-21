/**
 * salvarDocumento.js
 * Captura cada página .a4-page individualmente e gera PDF A4 multipágina.
 * Cada página é forçada a ocupar exatamente 210×297mm (A4 retrato),
 * garantindo alinhamento perfeito e sem deslocamento de conteúdo.
 * Padrão de nome: "#0001 Razão Social 03-26.pdf"
 */

export async function salvarDocumento({ elementId, tipo, numeroDoc, nomeEmpresa, mesAno, metadados }) {
  try {
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    const container = document.getElementById(elementId);
    if (!container) {
      return { sucesso: false, erro: `Elemento #${elementId} não encontrado` };
    }

    // Selecionar páginas A4: prioriza .a4-page filhos, senão usa o próprio container
    let paginas = Array.from(container.querySelectorAll('.a4-page'));
    if (paginas.length === 0) {
      // Fallback: Recibos e Orçamentos usam o container inteiro como página única
      paginas = [container];
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const A4_W = pdf.internal.pageSize.getWidth();  // 210mm
    const A4_H = pdf.internal.pageSize.getHeight(); // 297mm

    for (let i = 0; i < paginas.length; i++) {
      const pagina = paginas[i];

      // Garantir que o elemento está completamente renderizado antes de capturar
      const elW = pagina.offsetWidth  || pagina.scrollWidth;
      const elH = pagina.offsetHeight || pagina.scrollHeight;

      // Ocultar elementos no-print dentro desta página antes de capturar
      const noPrintEls = pagina.querySelectorAll('.no-print');
      noPrintEls.forEach(el => {
        el.dataset._origDisplay = el.style.display;
        el.style.display = 'none';
      });

      // ── Fix html2canvas: substitui <input>/<textarea> por <span> com o valor ──
      // html2canvas lê o atributo HTML "value", mas React seta a propriedade JS.
      // Solução: clonar cada campo como <span> e esconder o original.
      const inputEls = Array.from(pagina.querySelectorAll('input, textarea'));
      const inputRestores = inputEls.map(el => {
        const span = document.createElement('span');
        // Copia estilos computados essenciais para manter aparência
        const cs = window.getComputedStyle(el);
        span.style.cssText = [
          `font-size:${cs.fontSize}`,
          `font-family:${cs.fontFamily}`,
          `font-weight:${cs.fontWeight}`,
          `color:${cs.color}`,
          `text-transform:${cs.textTransform}`,
          `letter-spacing:${cs.letterSpacing}`,
          `text-align:${cs.textAlign}`,
          `display:inline-block`,
          `width:${cs.width}`,
          `padding:${cs.padding}`,
          `line-height:${cs.lineHeight}`,
          `white-space:pre-wrap`,
          `word-break:break-word`,
        ].join(';');
        span.textContent = el.value;
        el.parentNode.insertBefore(span, el);
        el.style.display = 'none';
        return { el, span };
      });

      let canvas;
      try {
        canvas = await html2canvas(pagina, {
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
      } finally {
        // Restaurar inputs/textareas
        inputRestores.forEach(({ el, span }) => {
          el.style.display = '';
          span.parentNode?.removeChild(span);
        });
        // Restaurar elementos no-print
        noPrintEls.forEach(el => {
          el.style.display = el.dataset._origDisplay || '';
          delete el.dataset._origDisplay;
        });
      }

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
    if (metadados) {
      formData.append('metadados', JSON.stringify(metadados));
    }

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
