CREATE TABLE recibos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER,
    cliente_nome TEXT NOT NULL,
    numero_recibo TEXT,
    descricao TEXT,
    valor_total REAL NOT NULL,
    data_emissao DATE NOT NULL,
    forma_pagamento TEXT,
    observacoes TEXT,
    arquivo_caminho TEXT,
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes_web(id) ON DELETE SET NULL
);

CREATE TABLE sqlite_sequence(name,seq);

