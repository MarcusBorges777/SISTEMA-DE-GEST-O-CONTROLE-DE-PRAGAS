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

          // ── Fix: html2canvas opera em uma cópia do DOM (clone).
          // React seta a propriedade JS "value" dos inputs, mas html2canvas
          // lê o atributo HTML "value". Usamos onclone para substituir cada
          // <input>/<textarea> por um <span> com o valor correto,
          // SEM tocar no DOM real da página.
          onclone: (_clonedDoc, clonedEl) => {
            // Ocultar .no-print no clone
            clonedEl.querySelectorAll('.no-print').forEach(el => {
              el.style.setProperty('display', 'none', 'important');
            });

            // Substituir inputs/textareas por spans com o valor atual
            // Precisa mapear do clone → original para ler o valor correto do React
            const liveInputs  = Array.from(pagina.querySelectorAll('input, textarea'));
            const cloneInputs = Array.from(clonedEl.querySelectorAll('input, textarea'));

            cloneInputs.forEach((cloneInput, idx) => {
              const liveInput = liveInputs[idx];
              const currentValue = liveInput ? liveInput.value : (cloneInput.value || cloneInput.getAttribute('value') || '');

              const cs = window.getComputedStyle(liveInput || cloneInput);
              const span = _clonedDoc.createElement('span');
              span.textContent = currentValue;
              span.style.cssText = [
                `font-size:${cs.fontSize}`,
                `font-family:${cs.fontFamily}`,
                `font-weight:${cs.fontWeight}`,
                `color:${cs.color}`,
                `text-transform:${cs.textTransform}`,
                `letter-spacing:${cs.letterSpacing}`,
                `text-align:${cs.textAlign}`,
                `display:block`,
                `width:100%`,
                `padding:${cs.padding}`,
                `line-height:${cs.lineHeight}`,
                `white-space:pre-wrap`,
                `word-break:break-word`,
                `box-sizing:border-box`,
              ].join(';');
              cloneInput.parentNode.replaceChild(span, cloneInput);
            });
          },
        });
      } finally {
        // Nada para restaurar: o onclone opera apenas no clone, não no DOM real
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
