# Sistema de Gerenciamento de Arquivos - Documentação Completa

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Diferenças: Frontend vs Backend](#diferenças-frontend-vs-backend)
3. [Funcionalidades Implementadas](#funcionalidades-implementadas)
4. [Instalação e Configuração](#instalação-e-configuração)
5. [Como Usar](#como-usar)
6. [APIs Disponíveis](#apis-disponíveis)
7. [Integração com Nuvem](#integração-com-nuvem)
8. [Personalização](#personalização)

---

## 🎯 Visão Geral

Sistema completo de gerenciamento de arquivos com:
- Upload drag & drop
- Visualizador inline (PDF, imagens, Excel, Word)
- Compartilhamento com links públicos
- Upload para nuvem (Google Drive, Dropbox)
- Geração de PDF/Excel no frontend
- Interface moderna e responsiva

---

## 🔄 Diferenças: Frontend vs Backend

### Geração no Backend (tradicional)
✅ **Vantagens:**
- Mais seguro para dados sensíveis
- Melhor para arquivos muito grandes (> 50MB)
- Funciona em navegadores antigos
- Controle total do servidor

❌ **Desvantagens:**
- Consome recursos do servidor
- Latência de rede (upload + processamento + download)
- Gargalo em múltiplos usuários simultâneos
- Custo de infraestrutura maior

### Geração no Frontend (nova implementação)
✅ **Vantagens:**
- **Zero carga no servidor** (processamento local)
- **Instantâneo** (sem latência de rede)
- **Escalável** infinitamente (cada usuário usa seu computador)
- Preview em tempo real
- Funciona offline após carregar
- Economia de custos

❌ **Desvantagens:**
- Depende do poder do computador do usuário
- Não funciona em navegadores muito antigos
- Dados trafegam pelo navegador

### 💡 Solução Híbrida Implementada
O sistema usa **o melhor dos dois mundos**:
- Frontend para geração rápida e preview
- Backend como fallback para compatibilidade
- Usuário escolhe onde gerar

---

## 🚀 Funcionalidades Implementadas

### 1. Upload Drag & Drop
- Interface intuitiva com área de arrastar
- Suporte para múltiplos arquivos simultâneos
- Preview instantâneo durante upload
- Barra de progresso animada
- Validação de tipo e tamanho

**Tipos suportados:**
- Documentos: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
- Imagens: JPG, PNG, GIF, BMP, SVG
- Texto: TXT, CSV, JSON, XML
- Compactados: ZIP, RAR, 7Z

**Limite:** 100MB por arquivo

### 2. Visualizador Inline
Visualização sem download para:
- **PDF**: Renderização nativa no navegador
- **Imagens**: Visualizador com zoom e controles
- **Excel/Planilhas**: Via Office Online Viewer
- **Textos**: Editor com syntax highlighting
- **Outros**: Opção de download

### 3. Compartilhamento
- **Links públicos** com token único
- **QR Code** gerado automaticamente
- **Validade**: 7 dias (configurável)
- **Contador de visualizações**
- **Copiar para área de transferência** com um clique

### 4. Upload para Nuvem
#### Google Drive
- Upload direto do navegador
- Autenticação OAuth 2.0
- Organização em pastas

#### Dropbox
- Upload via API oficial
- Compartilhamento automático
- Sincronização bidirecional

### 5. Geração de Documentos no Frontend

#### PDF (jsPDF)
```javascript
fileManager.generatePDF({
    title: 'Relatório Mensal',
    content: 'Conteúdo do relatório...',
    table: {
        headers: ['Coluna 1', 'Coluna 2'],
        rows: [['Dado 1', 'Dado 2']]
    }
}, {
    download: true,
    filename: 'relatorio.pdf',
    orientation: 'portrait'
});
```

#### Excel (SheetJS)
```javascript
fileManager.generateExcel({
    sheets: [
        {
            name: 'Vendas',
            data: [
                ['Produto', 'Quantidade', 'Valor'],
                ['Item A', 10, 100.00],
                ['Item B', 5, 50.00]
            ]
        }
    ]
}, {
    download: true,
    filename: 'vendas.xlsx'
});
```

---

## 📦 Instalação e Configuração

### 1. Arquivos Criados
```
projeto/
├── static/
│   └── js/
│       └── file-manager.js          # Motor principal
├── templates/
│   └── components/
│       └── file_upload_widget.html  # Interface UI
└── blueprints/
    └── file_manager.py              # Backend API
```

### 2. Adicionar ao app.py

```python
from blueprints.file_manager import file_manager_bp

# Registrar blueprint
app.register_blueprint(file_manager_bp)
```

### 3. Adicionar ao base.html ou dashboard

```html
<!-- No <head> -->
<script src="https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js"></script>

<!-- Antes do </body> -->
<script src="{{ url_for('static', filename='js/file-manager.js') }}"></script>
```

### 4. Incluir componente no dashboard

```html
{% include 'components/file_upload_widget.html' %}
```

### 5. Criar pasta de uploads

```bash
mkdir uploads
```

---

## 🎮 Como Usar

### Interface do Usuário

#### Upload de Arquivo
1. **Arrastar e Soltar:**
   - Arraste arquivos para a área destacada
   - Preview aparece instantaneamente
   - Aguarde conclusão do upload

2. **Selecionar Manualmente:**
   - Clique em "Selecionar Arquivos"
   - Escolha um ou múltiplos arquivos
   - Confirme a seleção

#### Visualizar Arquivo
1. Clique no ícone de olho (👁️) ao lado do arquivo
2. Modal abre com visualização inline
3. Use os botões do header para:
   - Compartilhar
   - Download
   - Fechar

#### Compartilhar Arquivo
1. Clique no botão "Compartilhar"
2. Link público é gerado automaticamente
3. Copie o link ou use o QR Code
4. Escolha upload para nuvem:
   - Google Drive
   - Dropbox

#### Gerar Documentos
1. **PDF:** Clique em "Gerar PDF"
   - Documento gerado no navegador
   - Download automático

2. **Excel:** Clique em "Gerar Excel"
   - Planilha criada localmente
   - Download imediato

---

## 🔌 APIs Disponíveis

### Upload
```http
POST /api/upload
Content-Type: multipart/form-data

{
  "file": [arquivo]
}
```

**Resposta:**
```json
{
  "success": true,
  "fileId": "abc123",
  "filename": "documento.pdf",
  "size": 1024,
  "url": "https://seu-site.com/api/download/abc123"
}
```

### Listar Arquivos Recentes
```http
GET /api/files/recent?limit=10
```

**Resposta:**
```json
{
  "success": true,
  "files": [
    {
      "id": "abc123",
      "name": "documento.pdf",
      "size": 1024,
      "type": "pdf",
      "date": "Hoje às 14:30"
    }
  ],
  "storage": {
    "used": 5000000,
    "limit": 10737418240,
    "percent": 0.05
  }
}
```

### Download
```http
GET /api/download/{file_id}
```

### Visualizar Inline
```http
GET /api/view/{file_id}
```

### Criar Link de Compartilhamento
```http
POST /api/share/create
Content-Type: application/json

{
  "fileId": "abc123"
}
```

**Resposta:**
```json
{
  "success": true,
  "shareLink": "https://seu-site.com/api/share/xyz789",
  "token": "xyz789",
  "expiresAt": "2024-01-21T10:00:00"
}
```

### Acessar Arquivo Compartilhado
```http
GET /api/share/{token}
```

### Excluir Arquivo
```http
DELETE /api/files/{file_id}
```

### Estatísticas de Armazenamento
```http
GET /api/storage/stats
```

---

## ☁️ Integração com Nuvem

### Google Drive

#### 1. Configurar OAuth 2.0
1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie um novo projeto
3. Ative a API do Google Drive
4. Crie credenciais OAuth 2.0
5. Adicione origem autorizada: `https://seu-dominio.com`

#### 2. Configurar no código
```javascript
// No file-manager.js, substitua:
const GOOGLE_CLIENT_ID = 'SEU_CLIENT_ID_AQUI';

// Adicione o script
<script src="https://apis.google.com/js/api.js"></script>
```

#### 3. Autenticar
```javascript
gapi.load('client:auth2', () => {
    gapi.client.init({
        apiKey: 'SUA_API_KEY',
        clientId: GOOGLE_CLIENT_ID,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        scope: 'https://www.googleapis.com/auth/drive.file'
    });
});
```

### Dropbox

#### 1. Criar App Dropbox
1. Acesse [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Crie novo app
3. Copie a App Key

#### 2. Configurar no código
```html
<script src="https://www.dropbox.com/static/api/2/dropins.js"
        id="dropboxjs"
        data-app-key="SUA_APP_KEY_AQUI"></script>
```

#### 3. Upload
```javascript
Dropbox.save({
    files: [{
        url: fileUrl,
        filename: fileName
    }],
    success: function() {
        console.log('Upload concluído!');
    },
    error: function(error) {
        console.error('Erro:', error);
    }
});
```

---

## 🎨 Personalização

### Cores e Tema
Edite o CSS no `file_upload_widget.html`:

```css
/* Cor primária */
.bg-indigo-600 { background: #SEU_COR; }

/* Gradientes */
.from-indigo-600 { --tw-gradient-from: #SUA_COR; }
```

### Tamanho Máximo de Arquivo
No `file_manager.py`:

```python
MAX_FILE_SIZE = 200 * 1024 * 1024  # 200MB
```

### Tipos de Arquivo Permitidos
```python
ALLOWED_EXTENSIONS = {
    'pdf', 'doc', 'docx',
    'mp4', 'avi',  # Adicionar vídeos
    'mp3', 'wav'   # Adicionar áudios
}
```

### Duração do Link de Compartilhamento
```python
expires_at = datetime.now() + timedelta(days=30)  # 30 dias
```

### Limite de Armazenamento
```python
storage_limit = 50 * 1024 * 1024 * 1024  # 50GB
```

---

## 🔒 Segurança

### Validações Implementadas
1. ✅ Validação de tipo de arquivo
2. ✅ Validação de tamanho
3. ✅ Sanitização de nome de arquivo
4. ✅ Tokens únicos para compartilhamento
5. ✅ Expiração automática de links
6. ✅ IDs aleatórios para arquivos

### Recomendações Adicionais
```python
# 1. Adicionar autenticação
@file_manager_bp.before_request
def require_auth():
    if not session.get('user_id'):
        return jsonify({'error': 'Não autorizado'}), 401

# 2. Rate limiting
from flask_limiter import Limiter
limiter = Limiter(app, key_func=lambda: request.remote_addr)

@file_manager_bp.route('/upload', methods=['POST'])
@limiter.limit("10 per minute")
def upload_file():
    pass

# 3. Scan de vírus (ClamAV)
import clamd
cd = clamd.ClamdUnixSocket()
scan_result = cd.scan(file_path)
```

---

## 📊 Monitoramento

### Logs
```python
import logging

logging.basicConfig(
    filename='file_manager.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Usar nos endpoints
logging.info(f"Upload: {filename} by {user_id}")
logging.warning(f"Failed upload: {filename}")
```

### Métricas
```python
# Adicionar contadores
metrics = {
    'uploads_total': 0,
    'downloads_total': 0,
    'shares_created': 0,
    'storage_used': 0
}

# Endpoint de métricas
@file_manager_bp.route('/metrics')
def get_metrics():
    return jsonify(metrics)
```

---

## 🐛 Troubleshooting

### Upload não funciona
1. Verificar pasta `uploads/` existe
2. Verificar permissões de escrita
3. Verificar tamanho do arquivo
4. Verificar extensão permitida

### Visualizador não abre
1. Verificar URL do arquivo
2. Verificar tipo MIME correto
3. Verificar CORS habilitado
4. Verificar console do navegador

### Link de compartilhamento inválido
1. Verificar token existe
2. Verificar não expirou
3. Verificar arquivo ainda existe

### Upload para nuvem falha
1. Verificar credenciais configuradas
2. Verificar usuário autenticado
3. Verificar permissões da API
4. Verificar limite de quota

---

## 📱 Compatibilidade

### Navegadores Suportados
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Mobile
- iOS Safari 14+
- Chrome Mobile 90+
- Samsung Internet 14+

### Bibliotecas Externas
- **jsPDF** 2.5.1+ (geração de PDF)
- **SheetJS** 0.18.5+ (geração de Excel)
- **Lucide Icons** (ícones)
- **Tailwind CSS** (estilização)

---

## 🚀 Próximos Passos

### Melhorias Sugeridas
1. **Versionamento de Arquivos**
   - Histórico de modificações
   - Restaurar versões anteriores

2. **Pastas e Organização**
   - Criar estrutura de diretórios
   - Tags e categorias

3. **Colaboração**
   - Comentários em arquivos
   - Permissões por usuário

4. **Busca Avançada**
   - Pesquisa por conteúdo (OCR)
   - Filtros múltiplos

5. **Compressão Automática**
   - Otimizar imagens
   - Comprimir PDFs

6. **Backup Automático**
   - Backup para S3/Azure
   - Redundância de dados

7. **Editor Inline**
   - Editar PDFs
   - Editar planilhas

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Consulte esta documentação
2. Verifique o console do navegador (F12)
3. Verifique logs do servidor
4. Teste com arquivo pequeno primeiro

---

## 📄 Licença

Este código é fornecido como está, sem garantias.
Sinta-se livre para modificar e adaptar às suas necessidades.

---

**Desenvolvido com ❤️ para otimizar seu sistema de gestão**
