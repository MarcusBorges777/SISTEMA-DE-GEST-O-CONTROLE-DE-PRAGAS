-- Tabela para rastreamento de documentos gerados
CREATE TABLE IF NOT EXISTS documentos_gerados (
    id BIGSERIAL PRIMARY KEY,
    tipo_documento VARCHAR(100) NOT NULL,
    numero_documento VARCHAR(50) NOT NULL,
    caminho_arquivo TEXT NOT NULL,
    nome_cliente VARCHAR(200) NOT NULL,
    cnpj_cpf VARCHAR(20),
    data_geracao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    gerado_por VARCHAR(100),
    versao INTEGER NOT NULL DEFAULT 1,
    documento_pai_id BIGINT,
    observacoes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'ATIVO',

    CONSTRAINT fk_documento_pai FOREIGN KEY (documento_pai_id)
        REFERENCES documentos_gerados(id) ON DELETE SET NULL
);

-- Índices para melhorar performance de consultas
CREATE INDEX idx_documentos_tipo ON documentos_gerados(tipo_documento);
CREATE INDEX idx_documentos_numero ON documentos_gerados(numero_documento);
CREATE INDEX idx_documentos_cnpj_cpf ON documentos_gerados(cnpj_cpf);
CREATE INDEX idx_documentos_cliente ON documentos_gerados(nome_cliente);
CREATE INDEX idx_documentos_data ON documentos_gerados(data_geracao);
CREATE INDEX idx_documentos_status ON documentos_gerados(status);
CREATE INDEX idx_documentos_pai ON documentos_gerados(documento_pai_id);

-- Comentários nas colunas
COMMENT ON TABLE documentos_gerados IS 'Registro de todos os documentos gerados pelo sistema';
COMMENT ON COLUMN documentos_gerados.tipo_documento IS 'Tipo: LAUDO_COMPLETO, LAUDO_DEDETIZACAO, LAUDO_CAIXA_DAGUA, RECIBO, ORCAMENTO';
COMMENT ON COLUMN documentos_gerados.numero_documento IS 'Número único do documento (OS, Recibo, Orçamento)';
COMMENT ON COLUMN documentos_gerados.versao IS 'Versão do documento (incrementa a cada revisão)';
COMMENT ON COLUMN documentos_gerados.documento_pai_id IS 'ID do documento original (null se for a primeira versão)';
COMMENT ON COLUMN documentos_gerados.status IS 'Status: ATIVO, CANCELADO, SUBSTITUIDO';
