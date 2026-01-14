"""
EXEMPLO DE INTEGRAÇÃO DO SISTEMA DE ARQUIVOS
Adicione estas linhas ao seu app.py existente
"""

# ====================================
# 1. IMPORTS (adicionar no topo do app.py)
# ====================================
from blueprints.file_manager import file_manager_bp

# ====================================
# 2. REGISTRAR BLUEPRINT (após criar app)
# ====================================
# Exemplo:
# app = Flask(__name__)

# Registrar o blueprint do gerenciador de arquivos
app.register_blueprint(file_manager_bp)

# ====================================
# 3. CONFIGURAÇÕES OPCIONAIS
# ====================================
# Configurar pasta de upload (se necessário)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB

# ====================================
# 4. ADICIONAR NO TEMPLATE base.html
# ====================================
"""
<!-- No <head>, adicionar bibliotecas necessárias -->
<script src="https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js"></script>

<!-- Antes do </body>, adicionar o script -->
<script src="{{ url_for('static', filename='js/file-manager.js') }}"></script>
"""

# ====================================
# 5. ADICIONAR NO dashboard_novo.html
# ====================================
"""
<!-- Adicionar onde quiser o widget de upload -->
{% include 'components/file_upload_widget.html' %}

<!-- OU apenas a área de drag & drop -->
<div id="dropzone-upload" class="border-4 border-dashed...">
    <!-- Ver file_upload_widget.html para código completo -->
</div>
"""

# ====================================
# 6. EXEMPLO DE USO EM OUTRAS ROTAS
# ====================================

# Exemplo: Criar rota personalizada que gera PDF automaticamente
@app.route('/relatorio/gerar/<tipo>')
def gerar_relatorio_auto(tipo):
    """
    Gera relatório automaticamente no backend e retorna para download
    """
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    from io import BytesIO

    # Buscar dados
    if tipo == 'vendas':
        dados = get_dados_vendas()  # sua função
    elif tipo == 'estoque':
        dados = get_dados_estoque()  # sua função
    else:
        return jsonify({'error': 'Tipo inválido'}), 400

    # Gerar PDF no backend
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    pdf.drawString(100, 750, f"Relatório de {tipo.title()}")
    # ... adicionar mais conteúdo
    pdf.save()

    buffer.seek(0)
    return send_file(
        buffer,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f'relatorio_{tipo}.pdf'
    )

# ====================================
# 7. EXEMPLO DE USO NO FRONTEND
# ====================================
"""
<script>
// Gerar PDF no frontend (rápido, não usa servidor)
async function gerarRelatorioPDF() {
    const dados = await fetch('/api/dados/vendas').then(r => r.json());

    await fileManager.generatePDF({
        title: 'Relatório de Vendas',
        content: `Total de vendas: ${dados.total}`,
        table: {
            headers: ['Produto', 'Quantidade', 'Valor'],
            rows: dados.itens.map(item => [
                item.produto,
                item.quantidade,
                item.valor
            ])
        }
    }, {
        download: true,
        filename: 'relatorio_vendas.pdf'
    });
}

// Gerar Excel no frontend
async function gerarPlanilhaExcel() {
    const dados = await fetch('/api/dados/estoque').then(r => r.json());

    await fileManager.generateExcel({
        sheets: [{
            name: 'Estoque',
            data: [
                ['Código', 'Produto', 'Quantidade', 'Valor'],
                ...dados.itens.map(item => [
                    item.codigo,
                    item.produto,
                    item.quantidade,
                    item.valor
                ])
            ]
        }]
    }, {
        download: true,
        filename: 'estoque.xlsx'
    });
}
</script>

<!-- Botões para chamar as funções -->
<button onclick="gerarRelatorioPDF()">Gerar PDF (Frontend)</button>
<button onclick="gerarPlanilhaExcel()">Gerar Excel (Frontend)</button>
<a href="/relatorio/gerar/vendas">Gerar PDF (Backend)</a>
"""

# ====================================
# 8. EXEMPLO: HÍBRIDO (FRONTEND + BACKEND)
# ====================================

@app.route('/api/dados/preparar/<tipo>')
def preparar_dados_relatorio(tipo):
    """
    Backend prepara os dados, frontend gera o documento
    Melhor dos dois mundos: segurança + performance
    """
    if tipo == 'vendas':
        # Buscar e processar dados no backend (seguro)
        vendas = db.session.query(Vendas).all()
        dados = {
            'total': sum(v.valor for v in vendas),
            'itens': [
                {
                    'produto': v.produto.nome,
                    'quantidade': v.quantidade,
                    'valor': v.valor
                }
                for v in vendas
            ]
        }

        # Retornar dados estruturados para frontend gerar PDF
        return jsonify({
            'success': True,
            'dados': dados,
            'tipo': 'vendas'
        })

    return jsonify({'success': False}), 400

# ====================================
# 9. FRONTEND CONSOME E GERA
# ====================================
"""
<script>
async function gerarRelatorioHibrido() {
    // 1. Backend processa dados (seguro)
    const response = await fetch('/api/dados/preparar/vendas');
    const { dados } = await response.json();

    // 2. Frontend gera documento (rápido)
    await fileManager.generatePDF({
        title: 'Relatório de Vendas',
        content: `Total: R$ ${dados.total.toFixed(2)}`,
        table: {
            headers: ['Produto', 'Qtd', 'Valor'],
            rows: dados.itens.map(i => [
                i.produto,
                i.quantidade,
                `R$ ${i.valor.toFixed(2)}`
            ])
        }
    }, {
        download: true,
        filename: 'relatorio.pdf'
    });

    // Opcional: Salvar no servidor para histórico
    // upload via fileManager.uploadFile()
}
</script>
"""

# ====================================
# 10. PERSONALIZAÇÃO: MARCA D'ÁGUA EM PDFs
# ====================================
"""
<script>
async function gerarPDFComMarca() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Adicionar marca d'água
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(60);
    doc.text('CONFIDENCIAL', 50, 150, { angle: 45 });

    // Adicionar conteúdo normal
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text('Conteúdo do documento...', 20, 20);

    // Salvar
    doc.save('documento_confidencial.pdf');
}
</script>
"""

# ====================================
# 11. INTEGRAÇÃO COM SISTEMA EXISTENTE
# ====================================

# Se você já tem geração de relatórios, pode manter ambos:

@app.route('/prospeccao/exportar')
def exportar_prospeccao_legado():
    """
    Mantém compatibilidade com sistema antigo
    """
    # Código existente de exportação
    pass

@app.route('/prospeccao/exportar-novo')
def exportar_prospeccao_novo():
    """
    Nova rota que usa o file manager
    """
    empresas = obter_empresas_prospeccao()

    # Preparar dados para frontend
    return jsonify({
        'success': True,
        'empresas': [
            {
                'nome': e.nome,
                'cnpj': e.cnpj,
                'cidade': e.cidade,
                'status': e.status
            }
            for e in empresas
        ]
    })

# Frontend gera o arquivo:
"""
<script>
async function exportarProspeccaoNovo() {
    const { empresas } = await fetch('/prospeccao/exportar-novo')
        .then(r => r.json());

    // Gerar Excel
    await fileManager.generateExcel({
        sheets: [{
            name: 'Prospecção',
            data: [
                ['Nome', 'CNPJ', 'Cidade', 'Status'],
                ...empresas.map(e => [
                    e.nome, e.cnpj, e.cidade, e.status
                ])
            ]
        }]
    }, {
        download: true,
        filename: 'prospeccao.xlsx'
    });
}
</script>
"""

# ====================================
# 12. TESTES E VALIDAÇÃO
# ====================================

# Teste básico de upload
"""
curl -X POST http://localhost:5000/api/upload \
  -F "file=@arquivo.pdf"
"""

# Teste de download
"""
curl http://localhost:5000/api/download/abc123 \
  -o arquivo_baixado.pdf
"""

# Teste de compartilhamento
"""
curl -X POST http://localhost:5000/api/share/create \
  -H "Content-Type: application/json" \
  -d '{"fileId": "abc123"}'
"""

# ====================================
# 13. CHECKLIST DE INTEGRAÇÃO
# ====================================
"""
☐ Adicionar imports no app.py
☐ Registrar blueprint file_manager_bp
☐ Criar pasta 'uploads' na raiz do projeto
☐ Adicionar scripts no base.html
☐ Incluir componente no dashboard
☐ Testar upload drag & drop
☐ Testar visualização inline
☐ Testar compartilhamento
☐ Configurar APIs de nuvem (opcional)
☐ Testar geração de PDF no frontend
☐ Testar geração de Excel no frontend
☐ Ajustar permissões da pasta uploads
☐ Configurar limites de upload no servidor
"""

print("""
╔══════════════════════════════════════════════════════════════╗
║         SISTEMA DE ARQUIVOS - PRONTO PARA USO!               ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ✅ Upload Drag & Drop                                       ║
║  ✅ Visualizador Inline                                      ║
║  ✅ Compartilhamento com Links                               ║
║  ✅ Upload para Nuvem (Google Drive, Dropbox)                ║
║  ✅ Geração de PDF no Frontend                               ║
║  ✅ Geração de Excel no Frontend                             ║
║                                                              ║
║  📖 Veja SISTEMA_ARQUIVOS_DOCUMENTACAO.md                    ║
║     para documentação completa                               ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
""")
