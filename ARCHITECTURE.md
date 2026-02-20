# Arquitetura do Sistema - Gestao Controle de Pragas

## Visao Geral

Sistema web de gestao de documentos para empresas de controle de pragas.
Gerencia laudos, recibos, orcamentos, clientes, boletos e prospeccao de leads.

**Stack:** Python/Flask + SQLite + Tailwind CSS + Google Gemini AI

## Estrutura de Diretorios

```
├── app.py                    # Aplicacao principal (~6500 linhas)
├── wsgi.py                   # Entry point para producao (Gunicorn)
├── requirements.txt          # Dependencias de producao
├── requirements-dev.txt      # Dependencias de desenvolvimento
├── .env.example              # Template de variaveis de ambiente
│
├── services/                 # Modulos compartilhados
│   ├── __init__.py
│   ├── database.py           # Conexao SQLite, criacao de tabelas, migracoes
│   ├── cache.py              # Sistema de cache em memoria com TTL
│   ├── formatters.py         # Formatacao (CNPJ, datas, valores, municipios)
│   └── auth.py               # Decorators login_required e admin_required
│
├── blueprints/               # Modulos de rotas
│   ├── prospeccao.py         # Prospeccao de leads (REGISTRADO)
│   ├── file_manager.py       # Gestao de arquivos (REGISTRADO)
│   ├── auth.py               # Autenticacao (referencia)
│   ├── clientes.py           # Clientes (referencia)
│   ├── tags.py               # Tags (referencia)
│   ├── boletos.py            # Boletos (referencia)
│   ├── admin.py              # Administracao (referencia)
│   └── ia.py                 # IA/Gemini (referencia)
│
├── templates/                # Templates Jinja2
│   ├── base.html             # Template base (navbar, toasts, JS global)
│   ├── login.html            # Pagina de login
│   ├── dashboard_novo.html   # Dashboard principal
│   ├── prospeccao.html       # Prospeccao de leads
│   ├── gerador_recibo.html   # Gerador visual de recibos
│   ├── gerador_orcamento.html# Gerador visual de orcamentos
│   └── macros/components.html# Componentes reutilizaveis
│
├── static/
│   ├── css/
│   │   ├── dashboard.css     # CSS do dashboard (7KB)
│   │   └── styles.min.css    # Tailwind minificado (51KB)
│   └── js/
│       ├── dashboard.js      # JS do dashboard (139KB)
│       ├── file-manager.js   # Gestao de arquivos (23KB)
│       └── cloud-config.js   # Integracao Google Drive/OneDrive (12KB)
│
├── tests/                    # Suite de testes (125 testes)
│   ├── conftest.py           # Fixtures (app, client, logged_in_client)
│   ├── test_services.py      # 36 testes unitarios (formatters, cache)
│   ├── test_routes.py        # 28 testes de integracao (rotas, APIs)
│   └── test_security.py      # 61 testes de seguranca (auth, admin, sessao)
│
├── modelos/                  # Templates DOCX para geracao de documentos
├── output/                   # Documentos gerados
├── uploads_pdf/              # PDFs uploaded para processamento
└── training_samples/         # Amostras para treinamento ML
```

## Seguranca

### Protecao Global (before_request)

Todas as rotas sao protegidas por padrao via `@app.before_request`:

- **ROTAS_PUBLICAS**: `login`, `logout`, `reset_admin`, `static`
- **ROTAS_ADMIN**: database, config, usuarios, treinar, diretorios
- **Demais rotas**: exigem `usuario_id` na sessao

```
Sem login + pagina   → redirect /login
Sem login + API      → 401 JSON {"erro": "Autenticacao necessaria"}
Sem admin + rota admin → 403 JSON {"erro": "Acesso negado"}
```

### Sessao

- `SESSION_COOKIE_HTTPONLY=True` (protege contra XSS)
- `SESSION_COOKIE_SAMESITE='Lax'` (protege contra CSRF)
- `SECRET_KEY` persistida em `.secret_key` entre reinicializacoes

## Banco de Dados

SQLite com WAL mode + 64MB cache + mmap:

| Tabela | Descricao |
|--------|-----------|
| clientes_web | Clientes cadastrados |
| documentos_gerados | Laudos, recibos, orcamentos gerados |
| tags | Tags para categorizar documentos |
| tags_documentos | Relacao N:N entre tags e documentos |
| boletos | Boletos/faturas com vencimento |
| recibos | Recibos gerados |
| orcamentos | Orcamentos com status |
| usuarios | Usuarios do sistema |
| configuracoes | Configuracoes gerais |

## APIs Principais

### Autenticacao
- `POST /login` — Login com email/senha
- `GET /logout` — Encerra sessao
- `GET /reset-admin` — Reset do admin (protegido)

### Clientes (login obrigatorio)
- `GET/POST /api/clientes` — Listar/criar clientes
- `DELETE /api/clientes/<id>` — Excluir cliente
- `PUT /api/clientes/<id>/garantia` — Atualizar garantia

### Documentos (login obrigatorio)
- `POST /gerar-laudo` — Gerar laudo DOCX
- `POST /gerar-recibo` — Gerar recibo DOCX
- `POST /gerar-orcamento` — Gerar orcamento DOCX
- `GET /api/documentos-gerados` — Listar documentos

### IA/Gemini (login obrigatorio)
- `POST /api/ia-consulta` — Consultar IA
- `GET /api/ia-insights` — Insights automaticos
- `GET /api/ia-analise-completa` — Analise financeira com IA

### Admin (admin obrigatorio)
- `GET/POST /api/usuarios` — CRUD de usuarios
- `GET /api/database/tables` — Listar tabelas
- `GET/POST /api/config/tema` — Configurar tema

## Deploy

### Desenvolvimento
```bash
cp .env.example .env
# Editar .env com sua GEMINI_API_KEY
pip install -r requirements-dev.txt
python app.py
```

### Producao
```bash
pip install -r requirements.txt
gunicorn -w 4 -b 0.0.0.0:5000 wsgi:app
```

### Testes
```bash
pytest tests/ -v              # Todos (125 testes)
pytest tests/test_security.py # Somente seguranca (61 testes)
pytest tests/test_services.py # Somente unitarios (36 testes)
```
