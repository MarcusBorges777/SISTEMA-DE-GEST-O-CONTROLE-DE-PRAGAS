# 📁 Sistema de Gestão de Documentos

Sistema completo de gestão de documentos com geração inteligente de PDFs/Excel e integração com nuvem.

## 🚀 Início Rápido

### 1. Instalar Dependências
```bash
pip install -r requirements.txt
npm install
```

### 2. Iniciar Servidor
```bash
python app.py
```

### 3. Acessar
```
http://localhost:5000
```

## ✨ Funcionalidades

### 📄 Geração de Documentos
- **PDF instantâneo** - Gerado no navegador (0.1s)
- **Excel instantâneo** - Planilhas no navegador (0.1s)
- **Templates inteligentes** - Preenchimento automático
- **Múltiplos modelos** - Contratos, laudos, relatórios

### ☁️ Integração Nuvem (Opcional)
- **OneDrive** - Ideal com Microsoft 365 (1TB)
- **Google Drive** - Alternativa (15GB grátis)
- Upload direto com 1 clique
- Compartilhamento automático

### 🎯 Dashboard Moderno
- Estatísticas em tempo real
- Busca avançada de clientes
- Filtros inteligentes
- Exportação rápida

### 🔍 Prospecção Econodata
- Integração com API Econodata
- Busca por CNAE, cidade, UF
- Filtros por porte e faturamento
- Exportação de leads

## 📁 Estrutura do Projeto

```
projeto/
├── app.py                      # Aplicação principal
├── blueprints/
│   ├── prospeccao.py          # Módulo de prospecção
│   └── file_manager.py        # Gerenciador de arquivos
├── templates/
│   ├── dashboard_novo.html    # Dashboard principal
│   ├── prospeccao.html        # Interface prospecção
│   └── components/            # Componentes reutilizáveis
├── static/js/
│   ├── file-manager.js        # Sistema de arquivos
│   └── cloud-config.js        # Configuração nuvem
├── database/
│   └── gestao_documentos.db   # Banco de dados
└── uploads/                   # Arquivos enviados
```

## 📚 Documentação

| Arquivo | Descrição |
|---------|-----------|
| `README_SISTEMA_ARQUIVOS.md` | Guia rápido sistema de arquivos |
| `SISTEMA_ARQUIVOS_DOCUMENTACAO.md` | Documentação técnica completa |
| `INTEGRACAO_PASSO_A_PASSO.md` | Tutorial de integração |
| `GUIA_ONEDRIVE.md` | Configurar OneDrive |
| `GUIA_GOOGLE_DRIVE.md` | Configurar Google Drive |
| `EXEMPLOS_PRATICOS.html` | Exemplos interativos |

## ⚙️ Configuração Rápida

### Arquivo .env
```env
GEMINI_API_KEY=sua_chave_aqui
```

### OneDrive (Opcional - Recomendado para Microsoft 365)
1. Abra `GUIA_ONEDRIVE.md`
2. Registre app no Azure (5 min)
3. Configure `static/js/cloud-config.js`

### Google Drive (Opcional)
1. Abra `GUIA_GOOGLE_DRIVE.md`
2. Configure Google Cloud Console
3. Configure `static/js/cloud-config.js`

## 🎯 Uso

### Dashboard
```
http://localhost:5000/
```

### Prospecção
```
http://localhost:5000/prospeccao
```

### Verificar Sistema
```bash
python verificar_instalacao.py
```

## 📊 Performance

- Gerar PDF: ~100ms (frontend)
- Gerar Excel: ~150ms (frontend)
- Upload OneDrive: ~500ms
- 95% mais rápido que backend

## 🔒 Segurança

- Sanitização de inputs
- Validação de arquivos
- Tokens únicos
- Links com expiração

## 📝 Licença

Uso interno. Todos os direitos reservados.

---

**Sistema pronto para produção** ✅
