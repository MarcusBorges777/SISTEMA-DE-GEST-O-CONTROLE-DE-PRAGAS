# 🚀 Integração Passo a Passo - Guia Completo

## ✅ Checklist Rápido

```
☐ 1. Registrar blueprint no app.py
☐ 2. Adicionar scripts no base.html
☐ 3. Incluir componentes no dashboard
☐ 4. Configurar Google Drive (opcional)
☐ 5. Configurar Dropbox (opcional)
☐ 6. Testar funcionalidades
```

---

## 📋 PASSO 1: Registrar Blueprint no app.py

Abra o arquivo `app.py` e adicione:

```python
# No início do arquivo, junto com outros imports
from blueprints.file_manager import file_manager_bp

# Depois de criar o app (app = Flask(__name__))
# Adicione esta linha:
app.register_blueprint(file_manager_bp)
```

**Localização exata no seu app.py:**
```python
# ... outros imports ...
from blueprints.prospeccao import prospeccao_bp
from blueprints.file_manager import file_manager_bp  # ← ADICIONAR AQUI

app = Flask(__name__)

# ... configurações ...

# Registrar blueprints
app.register_blueprint(prospeccao_bp)
app.register_blueprint(file_manager_bp)  # ← ADICIONAR AQUI
```

---

## 📋 PASSO 2: Adicionar Scripts no base.html

Abra `templates/base.html` e adicione os scripts necessários:

### 2.1 - No `<head>` (se ainda não tiver):
```html
<head>
    <!-- ... outros scripts ... -->

    <!-- Lucide Icons (se não tiver) -->
    <script src="https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js"></script>

    <!-- jsPDF para geração de PDFs -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"></script>

    <!-- SheetJS para geração de Excel -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
</head>
```

### 2.2 - Antes do `</body>`:
```html
<body>
    <!-- ... conteúdo do site ... -->

    <!-- Scripts do sistema de arquivos -->
    <script src="{{ url_for('static', filename='js/file-manager.js') }}"></script>
    <script src="{{ url_for('static', filename='js/cloud-config.js') }}"></script>

    <!-- Inicializar ícones -->
    <script>
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    </script>
</body>
```

---

## 📋 PASSO 3: Incluir Componentes no Dashboard

Abra `templates/dashboard_novo.html` e adicione os componentes onde desejar:

### Opção A: Widget Completo (Upload + Arquivos Recentes)
```html
{% extends "base.html" %}

{% block content %}

<!-- ADICIONE AQUI - Widget completo de gerenciamento de arquivos -->
{% include 'components/file_upload_widget.html' %}

<!-- ADICIONE AQUI - Botões de exportação -->
{% include 'components/export_buttons.html' %}

<!-- Resto do seu dashboard -->
<div class="container">
    <!-- ... seu conteúdo atual ... -->
</div>

{% endblock %}
```

### Opção B: Apenas Botões de Exportação (mais discreto)
```html
<!-- No topo ou onde preferir -->
<div class="mb-6">
    {% include 'components/export_buttons.html' %}
</div>
```

### Opção C: Customizado - Apenas a área de upload
```html
<div class="bg-white rounded-xl shadow-lg p-6">
    <h2 class="text-2xl font-bold mb-4">Upload de Arquivos</h2>

    <div id="dropzone-upload"
         class="border-4 border-dashed border-gray-300 rounded-2xl p-12 text-center">
        <input type="file" id="file-input" multiple class="hidden"
               onchange="fileManager.handleFiles(this.files)">

        <button onclick="document.getElementById('file-input').click()"
                class="px-6 py-3 bg-indigo-600 text-white rounded-lg">
            Selecionar Arquivos
        </button>
    </div>

    <div id="upload-preview-container" class="mt-4"></div>
</div>
```

---

## 📋 PASSO 4: Configurar Google Drive (Opcional)

### 4.1 - Obter Credenciais

Siga o guia detalhado: **`GUIA_GOOGLE_DRIVE.md`**

Resumo:
1. Acesse: https://console.cloud.google.com/
2. Crie um projeto
3. Ative Google Drive API
4. Crie OAuth Client ID
5. Copie Client ID e API Key

### 4.2 - Configurar no Sistema

Abra `static/js/cloud-config.js` e edite:

```javascript
const CLOUD_CONFIG = {
    googleDrive: {
        enabled: true,  // ← Mude para true
        clientId: 'SEU_CLIENT_ID.apps.googleusercontent.com',  // ← Cole aqui
        apiKey: 'SUA_API_KEY',  // ← Cole aqui
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        scope: 'https://www.googleapis.com/auth/drive.file'
    },
    // ...
};
```

**Exemplo real:**
```javascript
googleDrive: {
    enabled: true,
    clientId: '123456789-abc123xyz.apps.googleusercontent.com',
    apiKey: 'AIzaSyAbc123XYZ789',
    // ...
}
```

---

## 📋 PASSO 5: Configurar Dropbox (Opcional)

### 5.1 - Obter App Key

Siga o guia detalhado: **`GUIA_DROPBOX.md`**

Resumo:
1. Acesse: https://www.dropbox.com/developers/apps
2. Crie um app
3. Configure permissões
4. Copie App Key

### 5.2 - Configurar no Sistema

Abra `static/js/cloud-config.js` e edite:

```javascript
const CLOUD_CONFIG = {
    // ...
    dropbox: {
        enabled: true,  // ← Mude para true
        appKey: 'SUA_APP_KEY',  // ← Cole aqui
        redirectUri: window.location.origin + '/dropbox/callback'
    }
};
```

**Exemplo real:**
```javascript
dropbox: {
    enabled: true,
    appKey: 'abc123xyz789',
    redirectUri: window.location.origin + '/dropbox/callback'
}
```

---

## 📋 PASSO 6: Testar Funcionalidades

### 6.1 - Iniciar o servidor
```bash
python app.py
```

### 6.2 - Abrir no navegador
```
http://localhost:5000
```

### 6.3 - Testar Upload Drag & Drop
1. Vá para o dashboard
2. Arraste um arquivo PDF para a área de upload
3. Verifique se aparece o preview
4. Confira se o arquivo foi salvo em `uploads/`

### 6.4 - Testar Geração de PDF
1. Clique no botão "Exportar PDF"
2. Aguarde o download automático
3. Abra o PDF gerado

### 6.5 - Testar Geração de Excel
1. Clique no botão "Exportar Excel"
2. Aguarde o download automático
3. Abra o Excel gerado

### 6.6 - Testar Google Drive (se configurado)
1. Clique no botão "Google Drive"
2. Faça login com sua conta Google
3. Autorize o app
4. Arquivo deve ser salvo no Drive

### 6.7 - Testar Dropbox (se configurado)
1. Clique no botão "Dropbox"
2. Janela do Dropbox abre
3. Escolha onde salvar
4. Confirme

---

## 🎨 PERSONALIZAÇÃO

### Mudar Cores dos Botões

Edite `templates/components/export_buttons.html`:

```html
<!-- De: -->
<div class="bg-gradient-to-r from-indigo-600 to-purple-600">

<!-- Para sua cor: -->
<div class="bg-gradient-to-r from-blue-600 to-cyan-600">
```

### Adicionar Logo no PDF

Edite a função `exportarPDF()` em `export_buttons.html`:

```javascript
await fileManager.generatePDF({
    title: 'Relatório do Sistema',
    logo: '/static/img/logo.png',  // ← Adicione isso
    content: dados.descricao,
    table: dados.table
}, {
    download: true
});
```

### Mudar Endpoint de Dados

No include do componente:

```html
{% include 'components/export_buttons.html' with data_endpoint='/api/meus-dados' %}
```

Ou edite diretamente em `export_buttons.html`:

```javascript
const DEFAULT_DATA_ENDPOINT = '/api/prospeccao/exportar';
```

---

## 🔌 CRIAR ENDPOINT DE DADOS

Para os botões de exportação funcionarem, crie um endpoint que retorne seus dados:

### No `app.py` ou em um blueprint:

```python
@app.route('/api/export/data')
def export_data():
    """Retorna dados para exportação"""

    # Buscar seus dados do banco
    empresas = Empresa.query.all()

    # Formatar para exportação
    dados = {
        'descricao': 'Relatório de Empresas',
        'table': {
            'headers': ['Nome', 'CNPJ', 'Cidade', 'Status'],
            'rows': [
                [e.nome, e.cnpj, e.cidade, e.status]
                for e in empresas
            ]
        },
        'sheets': [{
            'name': 'Empresas',
            'data': [
                ['Nome', 'CNPJ', 'Cidade', 'Status'],
                *[[e.nome, e.cnpj, e.cidade, e.status] for e in empresas]
            ]
        }]
    }

    return jsonify(dados)
```

### Exemplo para Prospecção:

```python
@app.route('/api/prospeccao/dados-export')
def prospeccao_dados_export():
    """Dados de prospecção para exportação"""

    empresas = obter_empresas_prospeccao()  # Sua função

    return jsonify({
        'descricao': f'Relatório de Prospecção - {len(empresas)} empresas',
        'table': {
            'headers': ['Empresa', 'Cidade', 'CNAE', 'Status', 'Contato'],
            'rows': [
                [
                    e['nome'],
                    e['cidade'],
                    e['cnae_descricao'],
                    e['status'],
                    e['ultimo_contato']
                ]
                for e in empresas
            ]
        },
        'sheets': [{
            'name': 'Prospecção',
            'data': [
                ['Empresa', 'CNPJ', 'Cidade', 'CNAE', 'Status'],
                *[[e['nome'], e['cnpj'], e['cidade'], e['cnae_descricao'], e['status']] for e in empresas]
            ]
        }]
    })
```

Depois, use no dashboard:

```html
{% include 'components/export_buttons.html' with data_endpoint='/api/prospeccao/dados-export' %}
```

---

## ✅ VERIFICAÇÃO FINAL

Execute este checklist:

```
☐ Servidor inicia sem erros
☐ Dashboard abre corretamente
☐ Botões de exportação aparecem
☐ Upload drag & drop funciona
☐ Arquivo aparece em uploads/
☐ PDF é gerado e baixado
☐ Excel é gerado e baixado
☐ Google Drive funciona (se configurado)
☐ Dropbox funciona (se configurado)
☐ Console do navegador sem erros
```

### Verificar no Console (F12):

Deve aparecer:
```
FileManager initialized
✅ Google Drive API pronta (se configurado)
✅ Dropbox API pronta (se configurado)
```

---

## 🐛 TROUBLESHOOTING

### Erro: "fileManager is not defined"
- Verifique se adicionou `file-manager.js` no base.html
- Confira se o caminho está correto: `static/js/file-manager.js`

### Erro: "jsPDF is not defined"
- Adicione o script do jsPDF no `<head>`
- Verifique conexão com internet (CDN)

### Botão de nuvem não funciona
- Abra console (F12)
- Verifique se configurou credenciais corretamente
- Veja se `enabled: true` em `cloud-config.js`

### Upload não salva arquivos
- Verifique se pasta `uploads/` existe
- Confira permissões da pasta (Linux/Mac)
- Veja logs do servidor Python

### PDF gerado está vazio
- Verifique se endpoint `/api/export/data` retorna dados
- Teste endpoint direto no navegador
- Veja console para erros JavaScript

---

## 📚 PRÓXIMOS PASSOS

1. **Personalizar templates**
   - Adicione logo da empresa
   - Ajuste cores e estilos
   - Customize layout dos relatórios

2. **Adicionar mais formatos**
   - CSV
   - JSON
   - Word (DOCX)

3. **Melhorar relatórios**
   - Adicionar gráficos (Chart.js)
   - Incluir imagens
   - Adicionar rodapé personalizado

4. **Implementar agendamento**
   - Exportação automática diária
   - Envio por email programado
   - Backup automático

5. **Analytics**
   - Rastrear quais relatórios são mais usados
   - Logs de exportação
   - Estatísticas de uso

---

## 📞 SUPORTE

### Documentação:
- `SISTEMA_ARQUIVOS_DOCUMENTACAO.md` - Documentação completa
- `README_SISTEMA_ARQUIVOS.md` - Guia rápido
- `GUIA_GOOGLE_DRIVE.md` - Google Drive passo a passo
- `GUIA_DROPBOX.md` - Dropbox passo a passo

### Exemplos:
- `EXEMPLOS_PRATICOS.html` - Página de testes
- `INTEGRACAO_EXEMPLO.py` - Exemplos de código

### Debug:
1. Abra console do navegador (F12)
2. Vá na aba "Console"
3. Veja erros em vermelho
4. Copie mensagem de erro para pesquisar

---

✅ **Pronto! Seu sistema está completo e funcional!**

Agora você tem:
- ✅ Upload drag & drop
- ✅ Visualizador inline
- ✅ Compartilhamento
- ✅ Geração de PDF no frontend
- ✅ Geração de Excel no frontend
- ✅ Integração com Google Drive
- ✅ Integração com Dropbox
- ✅ Botões de exportação prontos

🚀 **Bom trabalho!**
