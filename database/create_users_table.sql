-- Tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL,
    ativo BOOLEAN DEFAULT 1,
    aprovado BOOLEAN DEFAULT 0,
    is_admin BOOLEAN DEFAULT 0,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_ultimo_acesso TIMESTAMP,
    data_aprovacao TIMESTAMP,
    aprovado_por INTEGER,
    reset_token TEXT,
    reset_token_expira TIMESTAMP,
    tentativas_login INTEGER DEFAULT 0,
    bloqueado_ate TIMESTAMP,
    FOREIGN KEY (aprovado_por) REFERENCES usuarios(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_reset_token ON usuarios(reset_token);

-- Tabela de logs de autenticação (segurança)
CREATE TABLE IF NOT EXISTS logs_autenticacao (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER,
    tipo TEXT NOT NULL, -- 'login', 'logout', 'falha_login', 'registro', 'reset_senha'
    ip_address TEXT,
    user_agent TEXT,
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sucesso BOOLEAN DEFAULT 1,
    mensagem TEXT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_logs_usuario ON logs_autenticacao(usuario_id);
CREATE INDEX IF NOT EXISTS idx_logs_data ON logs_autenticacao(data_hora);
