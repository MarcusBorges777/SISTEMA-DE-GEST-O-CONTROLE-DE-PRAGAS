# ☁️ OneDrive API - Guia Completo de Configuração

## Passo 1: Criar Conta Microsoft (se não tiver)

1. Acesse: https://www.microsoft.com/
2. Crie uma conta Microsoft ou faça login com uma existente
3. OneDrive já vem ativado automaticamente (5GB grátis)

## Passo 2: Registrar Aplicativo no Azure

### 2.1 - Acessar Azure Portal

1. Acesse: https://portal.azure.com/
2. Faça login com sua conta Microsoft
3. No menu lateral, procure por **"Azure Active Directory"** ou **"Microsoft Entra ID"**

### 2.2 - Registrar Novo App

1. No menu lateral do Azure AD, clique em **"App registrations"**
2. Clique em **"+ New registration"** (topo)
3. Preencha:

   **Name:**
   ```
   Sistema de Gestão - OneDrive
   ```

   **Supported account types:**
   - Selecione: **"Accounts in any organizational directory and personal Microsoft accounts"**
   - (Essa opção permite usar com contas pessoais e corporativas)

   **Redirect URI (optional):**
   - Plataforma: **Web**
   - URI: `http://localhost:5000/onedrive/callback`
   - (Em produção, use: `https://seu-dominio.com/onedrive/callback`)

4. Clique em **"Register"**

## Passo 3: Copiar Credenciais

Na página do app registrado, você verá:

### Application (client) ID
- Exemplo: `12345678-1234-1234-1234-123456789abc`
- **⚠️ COPIE E GUARDE ESTE ID!**

### Directory (tenant) ID
- Exemplo: `87654321-4321-4321-4321-987654321cba`
- Também pode ser útil, mas não obrigatório

## Passo 4: Criar Client Secret

1. No menu lateral do app, clique em **"Certificates & secrets"**
2. Vá na aba **"Client secrets"**
3. Clique em **"+ New client secret"**
4. Preencha:
   - **Description:** `Sistema de Gestão Secret`
   - **Expires:** Selecione **24 months** (ou Custom)
5. Clique em **"Add"**

**⚠️ IMPORTANTE:**
- A **Secret Value** aparece APENAS UMA VEZ!
- Exemplo: `abc123XYZ~def456.ghi789-jkl012`
- **COPIE AGORA e guarde em local seguro!**
- Se perder, terá que criar outra secret

## Passo 5: Configurar Permissões (API Permissions)

1. No menu lateral do app, clique em **"API permissions"**
2. Clique em **"+ Add a permission"**
3. Selecione **"Microsoft Graph"**
4. Selecione **"Delegated permissions"**
5. Marque as seguintes permissões:

   ✅ `Files.ReadWrite` - Ler e escrever arquivos do usuário
   ✅ `Files.ReadWrite.All` - Ler e escrever todos os arquivos (opcional, mais poder)
   ✅ `offline_access` - Manter acesso mesmo quando usuário não está online
   ✅ `User.Read` - Ler perfil básico do usuário

6. Clique em **"Add permissions"**

### Consentimento de Administrador (Opcional)

7. Se estiver usando em ambiente corporativo:
   - Clique em **"Grant admin consent for [Organização]"**
   - Isso evita que cada usuário tenha que autorizar

## Passo 6: Configurar URIs de Redirecionamento

1. No menu lateral, clique em **"Authentication"**
2. Em **"Platform configurations"** → **Web**, verifique se existe:
   - `http://localhost:5000/onedrive/callback`
   - `http://127.0.0.1:5000/onedrive/callback`
3. Se não existir, clique em **"Add URI"** e adicione ambos
4. Em **"Implicit grant and hybrid flows"**, marque:
   - ✅ **ID tokens**
   - ✅ **Access tokens**
5. Clique em **"Save"** no topo

## Passo 7: Configurar no Sistema

### Editar cloud-config.js

Abra: `static/js/cloud-config.js`

Procure pela seção do OneDrive e configure:

```javascript
const CLOUD_CONFIG = {
    // ...

    onedrive: {
        enabled: true,  // ← Mude para true
        clientId: 'SEU_CLIENT_ID_AQUI',  // ← Cole o Application (client) ID
        redirectUri: window.location.origin + '/onedrive/callback',
        scopes: ['Files.ReadWrite', 'offline_access', 'User.Read']
    }
};
```

**Exemplo real:**
```javascript
onedrive: {
    enabled: true,
    clientId: '12345678-1234-1234-1234-123456789abc',
    redirectUri: window.location.origin + '/onedrive/callback',
    scopes: ['Files.ReadWrite', 'offline_access', 'User.Read']
}
```

## Passo 8: Configurar Backend (Python)

### Criar arquivo de configuração

Crie ou edite `.env` na raiz do projeto:

```env
# OneDrive Credentials
ONEDRIVE_CLIENT_ID=12345678-1234-1234-1234-123456789abc
ONEDRIVE_CLIENT_SECRET=abc123XYZ~def456.ghi789-jkl012
ONEDRIVE_REDIRECT_URI=http://localhost:5000/onedrive/callback
```

**⚠️ NUNCA COMMITE O ARQUIVO .env NO GIT!**

Adicione ao `.gitignore`:
```
.env
```

## Passo 9: Implementação - Backend (Python)

O arquivo `blueprints/file_manager.py` já tem suporte para OneDrive.

Se precisar customizar, edite:

```python
import os
from flask import session, redirect, request
import requests

# Configurações do OneDrive
ONEDRIVE_CLIENT_ID = os.environ.get('ONEDRIVE_CLIENT_ID')
ONEDRIVE_CLIENT_SECRET = os.environ.get('ONEDRIVE_CLIENT_SECRET')
ONEDRIVE_REDIRECT_URI = os.environ.get('ONEDRIVE_REDIRECT_URI', 'http://localhost:5000/onedrive/callback')

@file_manager_bp.route('/onedrive/login')
def onedrive_login():
    """Iniciar autenticação com OneDrive"""
    auth_url = (
        "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?"
        f"client_id={ONEDRIVE_CLIENT_ID}&"
        f"response_type=code&"
        f"redirect_uri={ONEDRIVE_REDIRECT_URI}&"
        f"scope=Files.ReadWrite offline_access User.Read"
    )
    return redirect(auth_url)

@file_manager_bp.route('/onedrive/callback')
def onedrive_callback():
    """Callback após autenticação"""
    code = request.args.get('code')

    if not code:
        return jsonify({'error': 'Autorização negada'}), 400

    # Trocar código por token
    token_url = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
    token_data = {
        'client_id': ONEDRIVE_CLIENT_ID,
        'client_secret': ONEDRIVE_CLIENT_SECRET,
        'code': code,
        'redirect_uri': ONEDRIVE_REDIRECT_URI,
        'grant_type': 'authorization_code'
    }

    response = requests.post(token_url, data=token_data)
    token_response = response.json()

    # Salvar token na sessão
    session['onedrive_token'] = token_response.get('access_token')
    session['onedrive_refresh_token'] = token_response.get('refresh_token')

    return redirect('/dashboard')

@file_manager_bp.route('/api/onedrive/upload', methods=['POST'])
def upload_to_onedrive():
    """Upload de arquivo para OneDrive"""
    if 'onedrive_token' not in session:
        return jsonify({'error': 'Não autorizado'}), 401

    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'Arquivo não enviado'}), 400

    # Upload para OneDrive
    upload_url = f"https://graph.microsoft.com/v1.0/me/drive/root:/{file.filename}:/content"
    headers = {
        'Authorization': f"Bearer {session['onedrive_token']}",
        'Content-Type': file.content_type
    }

    response = requests.put(upload_url, headers=headers, data=file.read())

    if response.status_code in [200, 201]:
        return jsonify({
            'success': True,
            'message': 'Arquivo salvo no OneDrive!',
            'data': response.json()
        })
    else:
        return jsonify({
            'success': False,
            'message': 'Erro ao fazer upload',
            'error': response.text
        }), response.status_code
```

## Passo 10: Implementação - Frontend (JavaScript)

Já implementado no `cloud-config.js`. Para customizar:

```javascript
async function uploadToOneDrive(file) {
    try {
        // Verificar se está autenticado
        const statusResponse = await fetch('/api/onedrive/status');
        const status = await statusResponse.json();

        if (!status.authenticated) {
            // Redirecionar para login
            window.location.href = '/onedrive/login';
            return;
        }

        // Fazer upload
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/onedrive/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            showToast('✅ Arquivo salvo no OneDrive!', 'success');
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('❌ Erro ao salvar no OneDrive', 'error');
    }
}
```

## Passo 11: Testar Integração

### Teste 1: Autenticação

1. No seu dashboard, clique no botão **"OneDrive"**
2. Será redirecionado para login Microsoft
3. Faça login com sua conta
4. Autorize o aplicativo
5. Será redirecionado de volta ao dashboard

### Teste 2: Upload

1. Gere um PDF ou Excel
2. Clique em "Salvar no OneDrive"
3. Arquivo deve ser salvo na raiz do seu OneDrive
4. Verifique em: https://onedrive.live.com/

### Teste 3: Listar Arquivos

```javascript
async function listarArquivosOneDrive() {
    const response = await fetch('https://graph.microsoft.com/v1.0/me/drive/root/children', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    const data = await response.json();
    console.log('Arquivos:', data.value);
}
```

## Comparação: OneDrive vs Google Drive vs Dropbox

| Recurso | OneDrive | Google Drive | Dropbox |
|---------|----------|--------------|---------|
| **Espaço grátis** | 5 GB | 15 GB | 2 GB |
| **Configuração** | Média | Complexa | Simples |
| **Integração MS** | ✅ Excelente | ❌ Não | ❌ Não |
| **API** | Graph API | Drive API | Dropbox API |
| **Custo mensal** | R$ 23 (100GB) | R$ 9,90 (100GB) | R$ 49 (2TB) |

## Limites da API (Conta Gratuita)

- **Espaço:** 5 GB
- **Upload:** Até 4 MB por requisição simples
  - Para arquivos maiores, use upload resumável
- **Requests:** ~10,000/dia por aplicativo
- **Taxa:** ~2,000 requisições/minuto

## Upload de Arquivos Grandes (>4MB)

Para arquivos maiores que 4MB, use upload session:

```javascript
async function uploadLargeFile(file) {
    // 1. Criar sessão de upload
    const sessionResponse = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/root:/${file.name}:/createUploadSession`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                item: {
                    '@microsoft.graph.conflictBehavior': 'rename'
                }
            })
        }
    );

    const session = await sessionResponse.json();
    const uploadUrl = session.uploadUrl;

    // 2. Upload em chunks de 320KB
    const chunkSize = 327680;
    const totalChunks = Math.ceil(file.size / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Length': chunk.size,
                'Content-Range': `bytes ${start}-${end-1}/${file.size}`
            },
            body: chunk
        });

        // Atualizar progresso
        const progress = ((i + 1) / totalChunks) * 100;
        console.log(`Upload: ${progress.toFixed(0)}%`);
    }

    console.log('Upload concluído!');
}
```

## Troubleshooting

### Erro: "Invalid client"
- Verifique se o **Client ID** está correto
- Certifique-se de copiar o ID completo do Azure Portal

### Erro: "Redirect URI mismatch"
- Verifique se a URI de redirecionamento está exatamente igual no Azure e no código
- Inclua `http://` ou `https://`
- Verifique porta (5000)

### Erro: "Insufficient permissions"
- Vá em **API permissions** no Azure
- Verifique se as permissões estão marcadas
- Clique em "Grant admin consent" se disponível

### Erro: "Token expired"
- Use o **refresh_token** para obter novo access_token
- Implemente renovação automática de token

### Upload falha silenciosamente
- Abra console do navegador (F12)
- Verifique erros na aba Console
- Veja requisições na aba Network
- Verifique se token não expirou

## Segurança em Produção

### 1. Nunca exponha credenciais no frontend!

```python
# ✅ Correto - Backend
ONEDRIVE_CLIENT_SECRET = os.environ.get('ONEDRIVE_CLIENT_SECRET')

# ❌ Errado - Frontend
const SECRET = 'abc123'; // NÃO FAÇA ISSO!
```

### 2. Use HTTPS em produção

```python
ONEDRIVE_REDIRECT_URI = 'https://seu-dominio.com/onedrive/callback'
```

### 3. Armazene tokens de forma segura

```python
# Use sessão criptografada
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
```

### 4. Implemente renovação de token

```python
def refresh_onedrive_token():
    """Renovar token expirado"""
    refresh_token = session.get('onedrive_refresh_token')

    if not refresh_token:
        return False

    token_url = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
    data = {
        'client_id': ONEDRIVE_CLIENT_ID,
        'client_secret': ONEDRIVE_CLIENT_SECRET,
        'refresh_token': refresh_token,
        'grant_type': 'refresh_token'
    }

    response = requests.post(token_url, data=data)
    token_data = response.json()

    session['onedrive_token'] = token_data.get('access_token')
    session['onedrive_refresh_token'] = token_data.get('refresh_token')

    return True
```

## Recursos Avançados

### Criar Pasta

```python
def criar_pasta_onedrive(nome_pasta):
    """Criar pasta no OneDrive"""
    url = "https://graph.microsoft.com/v1.0/me/drive/root/children"
    headers = {
        'Authorization': f"Bearer {session['onedrive_token']}",
        'Content-Type': 'application/json'
    }
    data = {
        'name': nome_pasta,
        'folder': {},
        '@microsoft.graph.conflictBehavior': 'rename'
    }

    response = requests.post(url, headers=headers, json=data)
    return response.json()
```

### Compartilhar Arquivo

```python
def compartilhar_arquivo_onedrive(file_id):
    """Criar link de compartilhamento"""
    url = f"https://graph.microsoft.com/v1.0/me/drive/items/{file_id}/createLink"
    headers = {
        'Authorization': f"Bearer {session['onedrive_token']}",
        'Content-Type': 'application/json'
    }
    data = {
        'type': 'view',  # 'view' ou 'edit'
        'scope': 'anonymous'  # Qualquer pessoa com link
    }

    response = requests.post(url, headers=headers, json=data)
    link_data = response.json()

    return link_data.get('link', {}).get('webUrl')
```

---

✅ **Configuração do OneDrive concluída!**

## Recursos Úteis

- Documentação oficial: https://learn.microsoft.com/en-us/onedrive/developer/
- Graph API Explorer: https://developer.microsoft.com/en-us/graph/graph-explorer
- Azure Portal: https://portal.azure.com/
- OneDrive: https://onedrive.live.com/
