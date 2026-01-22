# 🔐 Guia do Sistema de Autenticação

## ✨ Visão Geral

Sistema completo de autenticação de usuários com segurança profissional, interface moderna e funcionalidades avançadas.

---

## 🚀 Início Rápido

### 1. **Instalar Dependências**

```bash
pip install -r requirements.txt
```

### 2. **Iniciar o Sistema**

```bash
python app.py
```

### 3. **Acessar**

Abra o navegador em: **http://localhost:5000**

Você será automaticamente redirecionado para a tela de login.

---

## 👤 Credenciais do Administrador Padrão

Na primeira execução, um usuário administrador é criado automaticamente:

- **Email:** `admin@sistema.com`
- **Senha:** `Admin@123`

⚠️ **IMPORTANTE:** Altere a senha após o primeiro login!

---

## 📄 Funcionalidades

### 🔑 **Login**
- Acesso seguro com email e senha
- Opção "Lembrar-me" para sessões persistentes
- Bloqueio automático após 5 tentativas incorretas
- Redirecionamento inteligente após login

**Rota:** `/login`

### ✍️ **Cadastro de Novos Usuários**
- Interface intuitiva de registro
- Validação em tempo real de:
  - Formato de email
  - Força da senha
  - Confirmação de senha
- Indicador visual de força da senha

**Rota:** `/registrar`

### 🔓 **Recuperação de Senha**
- Geração de token seguro com validade de 24 horas
- Em produção, o token seria enviado por email
- Em desenvolvimento, o token é exibido na tela

**Rotas:**
- `/recuperar-senha` - Solicitar recuperação
- `/resetar-senha/<token>` - Redefinir senha

### 🚪 **Logout**
- Encerramento seguro da sessão
- Limpeza de cookies e dados de sessão

**Rota:** `/logout`

---

## 🔒 Requisitos de Senha

Para garantir segurança, as senhas devem conter:

- ✅ Mínimo de 8 caracteres
- ✅ Pelo menos uma letra maiúscula (A-Z)
- ✅ Pelo menos uma letra minúscula (a-z)
- ✅ Pelo menos um número (0-9)

💡 **Exemplos de senhas válidas:**
- `MinhaSenha123`
- `Sistema@2024`
- `Seguro1234`

---

## 🛡️ Recursos de Segurança

### **Proteção Contra Brute Force**
- Máximo de 5 tentativas de login
- Bloqueio automático por 15 minutos após exceder o limite
- Contador de tentativas restantes

### **Hashing Seguro de Senhas**
- Algoritmo: **PBKDF2-SHA256**
- Senhas nunca são armazenadas em texto puro
- Impossível recuperar senha original

### **Tokens de Recuperação**
- Gerados com `URLSafeTimedSerializer`
- Expiração automática em 24 horas
- Uso único (invalidados após reset)

### **Proteção de Sessões**
- Cookies HttpOnly (proteção contra XSS)
- SameSite=Lax (proteção contra CSRF)
- Secure em produção (apenas HTTPS)

### **Auditoria**
- Todos os eventos de autenticação são registrados
- Logs incluem: tipo, IP, user-agent, timestamp
- Histórico completo de acessos

---

## 📊 Banco de Dados

### Tabela: `usuarios`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | ID único do usuário |
| nome | TEXT | Nome completo |
| email | TEXT | Email (único) |
| senha_hash | TEXT | Hash da senha |
| ativo | BOOLEAN | Status do usuário |
| data_criacao | TIMESTAMP | Data de cadastro |
| data_ultimo_acesso | TIMESTAMP | Último login |
| reset_token | TEXT | Token de recuperação |
| reset_token_expira | TIMESTAMP | Expiração do token |
| tentativas_login | INTEGER | Contador de tentativas |
| bloqueado_ate | TIMESTAMP | Data de desbloqueio |

### Tabela: `logs_autenticacao`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | ID do log |
| usuario_id | INTEGER | ID do usuário |
| tipo | TEXT | Tipo de evento |
| ip_address | TEXT | Endereço IP |
| user_agent | TEXT | Navegador/SO |
| data_hora | TIMESTAMP | Momento do evento |
| sucesso | BOOLEAN | Se foi bem-sucedido |
| mensagem | TEXT | Detalhes |

---

## 🔧 Configuração Avançada

### **Variáveis de Ambiente**

```bash
# .env ou variáveis de ambiente

# Chave secreta (obrigatório em produção)
FLASK_SECRET_KEY=sua_chave_super_secreta_aqui

# API Gemini (opcional)
GEMINI_API_KEY=sua_api_key_aqui

# Ambiente
FLASK_ENV=production  # ou development
```

### **Configuração de Email (Futuro)**

Para enviar emails de recuperação de senha:

```python
# Adicionar ao app.py
app.config.update(
    MAIL_SERVER='smtp.gmail.com',
    MAIL_PORT=587,
    MAIL_USE_TLS=True,
    MAIL_USERNAME='seu@email.com',
    MAIL_PASSWORD='sua_senha_app'
)
```

---

## 🎨 Interface

### **Design Moderno**
- Gradientes roxo/índigo
- Efeito glass morphism
- Animações suaves
- Ícones Lucide
- Totalmente responsiva

### **Feedback Visual**
- ✅ Indicador de força de senha
- ✅ Validação em tempo real
- ✅ Mensagens flash coloridas
- ✅ Estados de hover/focus
- ✅ Toggles de visibilidade de senha

---

## 🔗 Rotas da API

### Protegidas (Requerem Login)

Adicione o decorator `@login_required` em qualquer rota:

```python
from flask_login import login_required

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')
```

### Públicas

Rotas sem autenticação:
- `/login`
- `/registrar`
- `/recuperar-senha`
- `/resetar-senha/<token>`

---

## 💻 Uso Programático

### **Criar Usuário**

```python
from auth import registrar_usuario

sucesso, mensagem = registrar_usuario(
    db_path='gestao_documentos.db',
    nome='João Silva',
    email='joao@email.com',
    senha='Senha123'
)
```

### **Fazer Login**

```python
from auth import fazer_login

sucesso, usuario, mensagem = fazer_login(
    db_path='gestao_documentos.db',
    email='joao@email.com',
    senha='Senha123'
)

if sucesso:
    login_user(usuario)
```

### **Recuperar Senha**

```python
from auth import solicitar_reset_senha, resetar_senha

# Solicitar token
sucesso, mensagem = solicitar_reset_senha(
    db_path='gestao_documentos.db',
    app=app,
    email='joao@email.com'
)

# Resetar com token
sucesso, mensagem = resetar_senha(
    db_path='gestao_documentos.db',
    app=app,
    token='token_gerado',
    nova_senha='NovaSenha123'
)
```

### **Acessar Usuário Atual**

```python
from flask_login import current_user

@app.route('/perfil')
@login_required
def perfil():
    print(f"Usuário: {current_user.nome}")
    print(f"Email: {current_user.email}")
    return render_template('perfil.html')
```

---

## 🐛 Resolução de Problemas

### Não Consigo Fazer Login

1. **Verifique as credenciais**
   - Email: `admin@sistema.com`
   - Senha: `Admin@123`

2. **Conta bloqueada?**
   - Aguarde 15 minutos após 5 tentativas
   - Ou resete manualmente no banco:
   ```sql
   UPDATE usuarios
   SET tentativas_login = 0, bloqueado_ate = NULL
   WHERE email = 'admin@sistema.com';
   ```

### Token de Recuperação Expirado

- Tokens expiram em 24 horas
- Solicite um novo token na página de recuperação

### Erro "SECRET_KEY Gerada Automaticamente"

- Em produção, defina a variável de ambiente:
  ```bash
  export FLASK_SECRET_KEY=$(python -c 'import secrets; print(secrets.token_hex(32))')
  ```

---

## 📱 Acesso Mobile

O sistema é totalmente responsivo e funciona perfeitamente em:
- 📱 Smartphones
- 📱 Tablets
- 💻 Desktops

---

## 🔐 Boas Práticas

1. **Altere a senha do admin** após o primeiro acesso
2. **Use senhas fortes** com 12+ caracteres
3. **Não compartilhe credenciais**
4. **Configure HTTPS** em produção
5. **Defina SECRET_KEY** única em produção
6. **Ative logs de auditoria** para monitoramento
7. **Faça backup** regular do banco de dados

---

## 🎯 Próximos Passos

- [ ] Configurar envio de emails real
- [ ] Adicionar autenticação em duas etapas (2FA)
- [ ] Implementar OAuth (Google, GitHub)
- [ ] Criar página de perfil de usuário
- [ ] Adicionar gerenciamento de permissões
- [ ] Implementar rate limiting global

---

## 📞 Suporte

Documentação completa do sistema:
- `README.md` - Visão geral
- `GUIA_AUTENTICACAO.md` - Este guia
- `auth.py` - Código fonte (bem documentado)

---

**Sistema pronto para produção!** 🚀✨

Desenvolvido com ❤️ usando Flask + Flask-Login
