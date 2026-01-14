# 🔵 Google Drive API - Guia Completo de Configuração

## Passo 1: Criar Projeto no Google Cloud Console

1. Acesse: https://console.cloud.google.com/
2. Clique em **"Select a project"** (topo da página)
3. Clique em **"NEW PROJECT"**
4. Preencha:
   - **Project name:** Sistema de Gestão
   - **Location:** No organization
5. Clique em **"CREATE"**

## Passo 2: Ativar Google Drive API

1. No menu lateral, vá em: **APIs & Services** → **Library**
2. Pesquise: **Google Drive API**
3. Clique no resultado **Google Drive API**
4. Clique em **"ENABLE"** (azul)

## Passo 3: Criar Credenciais OAuth 2.0

1. No menu lateral: **APIs & Services** → **Credentials**
2. Clique em **"+ CREATE CREDENTIALS"** (topo)
3. Selecione: **OAuth client ID**

### Configure a Tela de Consentimento (se aparecer):
1. Clique em **"CONFIGURE CONSENT SCREEN"**
2. Escolha: **External** → **CREATE**
3. Preencha:
   - **App name:** Sistema de Gestão
   - **User support email:** seu-email@gmail.com
   - **Developer contact:** seu-email@gmail.com
4. Clique em **"SAVE AND CONTINUE"** (3 vezes)
5. Clique em **"BACK TO DASHBOARD"**

### Criar OAuth Client ID:
1. Volte em: **Credentials** → **+ CREATE CREDENTIALS** → **OAuth client ID**
2. **Application type:** Web application
3. **Name:** Sistema de Gestão Web
4. **Authorized JavaScript origins:**
   - Adicione: `http://localhost:5000`
   - Adicione: `http://127.0.0.1:5000`
   - (Em produção, adicione seu domínio: `https://seu-dominio.com`)
5. **Authorized redirect URIs:**
   - Adicione: `http://localhost:5000`
   - Adicione: `http://127.0.0.1:5000`
6. Clique em **"CREATE"**

## Passo 4: Copiar Credenciais

Uma janela aparecerá com:
- **Client ID:** algo como `123456789-abcdefg.apps.googleusercontent.com`
- **Client secret:** algo como `GOCSPX-abcdefghijklmnop`

⚠️ **IMPORTANTE:** Copie e guarde essas informações!

## Passo 5: Configurar no Sistema

Abra o arquivo: `static/js/file-manager.js`

Procure por (linha ~389):
```javascript
// Configurar com suas credenciais
const GOOGLE_CLIENT_ID = 'SEU_CLIENT_ID_AQUI';
const GOOGLE_API_KEY = 'SUA_API_KEY_AQUI';
```

Substitua por:
```javascript
const GOOGLE_CLIENT_ID = '123456789-abcdefg.apps.googleusercontent.com'; // Cole aqui
const GOOGLE_API_KEY = 'SUA_API_KEY'; // Opcional
```

## Passo 6: Obter API Key (Opcional, mas recomendado)

1. Volte em: **APIs & Services** → **Credentials**
2. Clique em **"+ CREATE CREDENTIALS"** → **API key**
3. Copie a API Key gerada
4. Clique em **"RESTRICT KEY"** (recomendado)
5. Em **API restrictions**, selecione: **Restrict key**
6. Marque apenas: **Google Drive API**
7. Clique em **"SAVE"**

## Passo 7: Testar Integração

1. Abra seu dashboard
2. Clique em "Compartilhar" em um arquivo
3. Clique no botão **"Google Drive"**
4. Uma janela de login do Google deve aparecer
5. Faça login e autorize o app
6. Pronto! ✅

## Troubleshooting

### Erro: "Origin mismatch"
- Verifique se adicionou `http://localhost:5000` nas **Authorized JavaScript origins**

### Erro: "Access denied"
- Configure a tela de consentimento corretamente
- Adicione seu email como usuário de teste

### Erro: "API not enabled"
- Certifique-se de ativar a Google Drive API no projeto

## Segurança em Produção

Quando colocar em produção:

1. Adicione seu domínio real nas origens:
   ```
   https://seu-dominio.com
   ```

2. Configure variáveis de ambiente:
   ```python
   # app.py
   import os
   GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
   ```

3. Nunca exponha credenciais no código público!

---

✅ **Configuração do Google Drive concluída!**
