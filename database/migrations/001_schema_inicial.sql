-- ============================================================================
-- MIGRAÇÃO 001: Schema Inicial do ERP de Gestão de Ordens de Serviço
-- Compatível com sistema atual (DocxTemplate, Tags ML, Gemini AI)
-- ============================================================================

-- Configurações do banco
SET client_encoding = 'UTF8';
SET timezone = 'America/Sao_Paulo';

-- ============================================================================
-- 1. MÓDULO DE CLIENTES
-- ============================================================================

-- Clientes (migrado de clientes_web)
CREATE TABLE IF NOT EXISTS clientes (
    id BIGSERIAL PRIMARY KEY,
    tipo_pessoa VARCHAR(2) NOT NULL CHECK (tipo_pessoa IN ('PF', 'PJ')),
    nome_fantasia VARCHAR(255) NOT NULL,
    razao_social VARCHAR(255),
    cpf_cnpj VARCHAR(18) NOT NULL,
    cnae VARCHAR(10),
    inscricao_estadual VARCHAR(20),
    inscricao_municipal VARCHAR(20),
    telefone_principal VARCHAR(20),
    telefone_secundario VARCHAR(20),
    email VARCHAR(255),
    site VARCHAR(255),
    observacoes TEXT,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_cadastro VARCHAR(100),
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'bloqueado')),

    -- Índices
    CONSTRAINT cpf_cnpj_unique UNIQUE (cpf_cnpj)
);

CREATE INDEX idx_clientes_nome ON clientes(nome_fantasia);
CREATE INDEX idx_clientes_status ON clientes(status);
CREATE INDEX idx_clientes_cpf_cnpj ON clientes(cpf_cnpj);
CREATE INDEX idx_clientes_data_cadastro ON clientes(data_cadastro);

-- Endereços (novo - separado dos clientes)
CREATE TABLE IF NOT EXISTS enderecos (
    id BIGSERIAL PRIMARY KEY,
    cliente_id BIGINT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    tipo_endereco VARCHAR(20) NOT NULL CHECK (tipo_endereco IN ('comercial', 'residencial', 'entrega', 'cobranca', 'servico')),
    cep VARCHAR(9),
    logradouro VARCHAR(255) NOT NULL,
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100) NOT NULL,
    uf CHAR(2) NOT NULL,
    pais VARCHAR(50) DEFAULT 'Brasil',
    referencia TEXT,
    endereco_padrao BOOLEAN DEFAULT FALSE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_enderecos_cliente ON enderecos(cliente_id);
CREATE INDEX idx_enderecos_tipo ON enderecos(tipo_endereco);
CREATE INDEX idx_enderecos_cidade_uf ON enderecos(cidade, uf);

-- Contatos
CREATE TABLE IF NOT EXISTS contatos (
    id BIGSERIAL PRIMARY KEY,
    cliente_id BIGINT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    cargo VARCHAR(100),
    departamento VARCHAR(100),
    email VARCHAR(255),
    telefone VARCHAR(20),
    celular VARCHAR(20),
    whatsapp VARCHAR(20),
    contato_principal BOOLEAN DEFAULT FALSE,
    recebe_notificacao_os BOOLEAN DEFAULT TRUE,
    recebe_notificacao_financeiro BOOLEAN DEFAULT FALSE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contatos_cliente ON contatos(cliente_id);
CREATE INDEX idx_contatos_email ON contatos(email);

-- Histórico de Relacionamento
CREATE TABLE IF NOT EXISTS historico_cliente (
    id BIGSERIAL PRIMARY KEY,
    cliente_id BIGINT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    tipo_evento VARCHAR(20) NOT NULL CHECK (tipo_evento IN ('ligacao', 'email', 'visita', 'os', 'reclamacao', 'elogio', 'outro')),
    descricao TEXT NOT NULL,
    usuario_responsavel VARCHAR(100),
    data_evento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_historico_cliente_data ON historico_cliente(cliente_id, data_evento);

-- ============================================================================
-- 2. MÓDULO DE SERVIÇOS E PRODUTOS
-- ============================================================================

-- Catálogo de Serviços
CREATE TABLE IF NOT EXISTS servicos (
    id BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('controle_pragas', 'limpeza', 'manutencao', 'instalacao', 'consultoria', 'outro')),
    subcategoria VARCHAR(100),
    descricao TEXT,
    unidade_medida VARCHAR(20) DEFAULT 'servico' CHECK (unidade_medida IN ('m2', 'unidade', 'hora', 'servico', 'kg', 'litro')),
    preco_base DECIMAL(10, 2) NOT NULL,
    custo_estimado DECIMAL(10, 2),
    tempo_estimado_minutos INT,
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
    requer_agendamento BOOLEAN DEFAULT TRUE,
    permite_desconto BOOLEAN DEFAULT TRUE,
    desconto_maximo_percentual DECIMAL(5, 2) DEFAULT 10.00,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_servicos_codigo ON servicos(codigo);
CREATE INDEX idx_servicos_categoria ON servicos(categoria);
CREATE INDEX idx_servicos_status ON servicos(status);

-- Produtos
CREATE TABLE IF NOT EXISTS produtos (
    id BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    tipo_produto VARCHAR(30) NOT NULL CHECK (tipo_produto IN ('produto_final', 'insumo', 'epi', 'equipamento')),
    categoria VARCHAR(100),
    fabricante VARCHAR(100),
    unidade_medida VARCHAR(20) NOT NULL CHECK (unidade_medida IN ('kg', 'litro', 'unidade', 'caixa', 'pacote')),
    quantidade_estoque DECIMAL(10, 3) DEFAULT 0,
    estoque_minimo DECIMAL(10, 3),
    preco_custo DECIMAL(10, 2),
    preco_venda DECIMAL(10, 2),
    ncm VARCHAR(10),
    registro_anvisa VARCHAR(50),
    data_validade DATE,
    lote VARCHAR(50),
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
    ficha_tecnica TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_produtos_codigo ON produtos(codigo);
CREATE INDEX idx_produtos_tipo ON produtos(tipo_produto);
CREATE INDEX idx_produtos_estoque ON produtos(quantidade_estoque);

-- Pragas (específico para controle de pragas)
CREATE TABLE IF NOT EXISTS pragas (
    id BIGSERIAL PRIMARY KEY,
    nome_cientifico VARCHAR(255),
    nome_popular VARCHAR(255) NOT NULL,
    categoria VARCHAR(20) NOT NULL CHECK (categoria IN ('inseto', 'roedor', 'ave', 'outro')),
    nivel_risco VARCHAR(20) DEFAULT 'medio' CHECK (nivel_risco IN ('baixo', 'medio', 'alto', 'critico')),
    descricao TEXT,
    tratamento_recomendado TEXT,
    produtos_recomendados JSONB,
    foto_url VARCHAR(500)
);

CREATE INDEX idx_pragas_categoria ON pragas(categoria);
CREATE INDEX idx_pragas_nome_popular ON pragas(nome_popular);

-- Templates de Serviço
CREATE TABLE IF NOT EXISTS templates_servico (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(100),
    preco_total DECIMAL(10, 2),
    periodicidade VARCHAR(20) DEFAULT 'unico' CHECK (periodicidade IN ('unico', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual')),
    quantidade_visitas INT DEFAULT 1,
    tempo_total_estimado_minutos INT,
    observacoes_tecnicas TEXT,
    instrucoes_cliente TEXT,
    termos_garantia TEXT,
    periodo_garantia_dias INT DEFAULT 90,
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_templates_categoria ON templates_servico(categoria);
CREATE INDEX idx_templates_status ON templates_servico(status);

-- ============================================================================
-- 3. MÓDULO DE ORDENS DE SERVIÇO
-- ============================================================================

-- Ordens de Serviço (CORE DO SISTEMA)
CREATE TABLE IF NOT EXISTS ordens_servico (
    id BIGSERIAL PRIMARY KEY,
    numero_os VARCHAR(50) UNIQUE NOT NULL,
    cliente_id BIGINT NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    endereco_id BIGINT NOT NULL REFERENCES enderecos(id) ON DELETE RESTRICT,
    contato_id BIGINT REFERENCES contatos(id) ON DELETE SET NULL,
    template_id BIGINT REFERENCES templates_servico(id) ON DELETE SET NULL,

    -- Datas e Agendamento
    data_abertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_agendamento TIMESTAMP,
    data_inicio_execucao TIMESTAMP,
    data_conclusao TIMESTAMP,
    data_cancelamento TIMESTAMP,

    -- Status e Controle
    status VARCHAR(30) NOT NULL DEFAULT 'rascunho' CHECK (status IN (
        'rascunho', 'aguardando_aprovacao', 'aprovada', 'agendada',
        'em_execucao', 'aguardando_pagamento', 'concluida', 'cancelada'
    )),
    prioridade VARCHAR(20) DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),

    -- Valores
    valor_servicos DECIMAL(10, 2) DEFAULT 0,
    valor_produtos DECIMAL(10, 2) DEFAULT 0,
    valor_deslocamento DECIMAL(10, 2) DEFAULT 0,
    valor_desconto DECIMAL(10, 2) DEFAULT 0,
    valor_total DECIMAL(10, 2) NOT NULL,

    -- Garantia
    possui_garantia BOOLEAN DEFAULT TRUE,
    data_inicio_garantia DATE,
    data_fim_garantia DATE,

    -- Equipe (JSON para múltiplos técnicos)
    tecnico_responsavel VARCHAR(100),
    equipe_ids JSONB,

    -- Observações
    descricao_servico TEXT,
    observacoes_internas TEXT,
    observacoes_cliente TEXT,

    -- Documentos Gerados (controle de estado)
    certificado_gerado BOOLEAN DEFAULT FALSE,
    certificado_path VARCHAR(500),
    certificado_enviado BOOLEAN DEFAULT FALSE,
    instrucoes_geradas BOOLEAN DEFAULT FALSE,
    instrucoes_path VARCHAR(500),
    instrucoes_enviadas BOOLEAN DEFAULT FALSE,

    -- Metadados
    origem VARCHAR(20) DEFAULT 'web' CHECK (origem IN ('web', 'app', 'api', 'whatsapp', 'telefone')),
    usuario_criacao VARCHAR(100),
    usuario_atualizacao VARCHAR(100),
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_os_numero ON ordens_servico(numero_os);
CREATE INDEX idx_os_cliente ON ordens_servico(cliente_id);
CREATE INDEX idx_os_status ON ordens_servico(status);
CREATE INDEX idx_os_data_agendamento ON ordens_servico(data_agendamento);
CREATE INDEX idx_os_data_abertura ON ordens_servico(data_abertura);
CREATE INDEX idx_os_status_agendamento ON ordens_servico(status, data_agendamento);

-- Itens da OS (Serviços)
CREATE TABLE IF NOT EXISTS os_servicos (
    id BIGSERIAL PRIMARY KEY,
    os_id BIGINT NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
    servico_id BIGINT NOT NULL REFERENCES servicos(id) ON DELETE RESTRICT,
    quantidade DECIMAL(10, 2) NOT NULL,
    preco_unitario DECIMAL(10, 2) NOT NULL,
    desconto_percentual DECIMAL(5, 2) DEFAULT 0,
    preco_total DECIMAL(10, 2) NOT NULL,
    observacoes TEXT
);

CREATE INDEX idx_os_servicos_os ON os_servicos(os_id);

-- Produtos utilizados na OS
CREATE TABLE IF NOT EXISTS os_produtos (
    id BIGSERIAL PRIMARY KEY,
    os_id BIGINT NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
    produto_id BIGINT NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
    quantidade DECIMAL(10, 3) NOT NULL,
    preco_unitario DECIMAL(10, 2),
    preco_total DECIMAL(10, 2),
    lote VARCHAR(50)
);

CREATE INDEX idx_os_produtos_os ON os_produtos(os_id);

-- Pragas Identificadas na OS
CREATE TABLE IF NOT EXISTS os_pragas (
    id BIGSERIAL PRIMARY KEY,
    os_id BIGINT NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
    praga_id BIGINT NOT NULL REFERENCES pragas(id) ON DELETE RESTRICT,
    nivel_infestacao VARCHAR(20) NOT NULL CHECK (nivel_infestacao IN ('ausente', 'baixo', 'medio', 'alto', 'critico')),
    locais_encontrados TEXT,
    observacoes TEXT
);

CREATE INDEX idx_os_pragas_os ON os_pragas(os_id);

-- Histórico de Status da OS
CREATE TABLE IF NOT EXISTS os_historico_status (
    id BIGSERIAL PRIMARY KEY,
    os_id BIGINT NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
    status_anterior VARCHAR(50),
    status_novo VARCHAR(50) NOT NULL,
    usuario VARCHAR(100),
    observacao TEXT,
    data_mudanca TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_os_historico_os_data ON os_historico_status(os_id, data_mudanca);

-- ============================================================================
-- 4. MÓDULO DE DOCUMENTOS (compatível com DocxTemplate)
-- ============================================================================

-- Documentos Gerados (migrado de documentos_gerados)
CREATE TABLE IF NOT EXISTS documentos_gerados (
    id BIGSERIAL PRIMARY KEY,
    os_id BIGINT REFERENCES ordens_servico(id) ON DELETE SET NULL,
    cliente_id BIGINT NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,

    tipo_documento VARCHAR(50) NOT NULL CHECK (tipo_documento IN (
        'laudo_tecnico', 'certificado', 'instrucoes_previas', 'orcamento',
        'recibo', 'boleto', 'contrato', 'relatorio', 'outro'
    )),

    -- Status de Geração
    status_geracao VARCHAR(20) NOT NULL DEFAULT 'aguardando' CHECK (status_geracao IN ('aguardando', 'processando', 'gerado', 'erro', 'cancelado')),

    -- Arquivos (suporta DOCX e PDF)
    nome_arquivo VARCHAR(255) NOT NULL,
    caminho_arquivo VARCHAR(500),
    arquivo_hash VARCHAR(64),
    tamanho_bytes BIGINT,
    formato_arquivo VARCHAR(10) DEFAULT 'docx' CHECK (formato_arquivo IN ('docx', 'pdf')),

    -- Metadados
    template_utilizado VARCHAR(100),
    dados_entrada JSONB,
    erro_mensagem TEXT,
    tentativas_geracao INT DEFAULT 0,

    -- Assinatura Digital
    assinado BOOLEAN DEFAULT FALSE,
    data_assinatura TIMESTAMP,
    assinante_nome VARCHAR(255),
    assinatura_hash VARCHAR(64),
    certificado_digital_path VARCHAR(500),

    -- Envio
    enviado BOOLEAN DEFAULT FALSE,
    data_envio TIMESTAMP,
    destinatarios JSONB,
    canal_envio VARCHAR(20),

    -- Rastreamento
    visualizado BOOLEAN DEFAULT FALSE,
    data_primeira_visualizacao TIMESTAMP,
    quantidade_visualizacoes INT DEFAULT 0,

    -- Campos do sistema antigo (compatibilidade)
    valor_total DECIMAL(10, 2),
    cliente_nome VARCHAR(255),
    razao_social VARCHAR(255),
    cliente_cnpj VARCHAR(18),
    status_aprovacao VARCHAR(20),

    usuario_solicitante VARCHAR(100),
    usuario_gerador VARCHAR(100),
    data_solicitacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_geracao TIMESTAMP,
    data_conclusao TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documentos_os ON documentos_gerados(os_id);
CREATE INDEX idx_documentos_cliente ON documentos_gerados(cliente_id);
CREATE INDEX idx_documentos_tipo ON documentos_gerados(tipo_documento);
CREATE INDEX idx_documentos_status ON documentos_gerados(status_geracao);
CREATE INDEX idx_documentos_data_solicitacao ON documentos_gerados(data_solicitacao);

-- Fila de Geração de Documentos
CREATE TABLE IF NOT EXISTS fila_documentos (
    id BIGSERIAL PRIMARY KEY,
    documento_id BIGINT NOT NULL REFERENCES documentos_gerados(id) ON DELETE CASCADE,
    prioridade VARCHAR(20) DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'concluido', 'erro')),
    tentativas INT DEFAULT 0,
    max_tentativas INT DEFAULT 3,
    erro_mensagem TEXT,
    worker_id VARCHAR(100),
    data_adicao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_inicio_processamento TIMESTAMP,
    data_conclusao TIMESTAMP
);

CREATE INDEX idx_fila_status_prioridade ON fila_documentos(status, prioridade);
CREATE INDEX idx_fila_data_adicao ON fila_documentos(data_adicao);

-- ============================================================================
-- 5. MÓDULO DE TAGS E ML (migrado do sistema atual)
-- ============================================================================

-- Tags
CREATE TABLE IF NOT EXISTS tags (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    cor VARCHAR(7) DEFAULT '#3B82F6',
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documento Tags
CREATE TABLE IF NOT EXISTS documento_tags (
    id BIGSERIAL PRIMARY KEY,
    arquivo_id BIGINT,
    arquivo_tipo VARCHAR(50) NOT NULL,
    tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    confianca DECIMAL(3, 2) DEFAULT 1.0,
    manual BOOLEAN DEFAULT TRUE,
    data_atribuicao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documento_tags_arquivo ON documento_tags(arquivo_id, arquivo_tipo);
CREATE INDEX idx_documento_tags_tag ON documento_tags(tag_id);

-- Tag Training Data
CREATE TABLE IF NOT EXISTS tag_training_data (
    id BIGSERIAL PRIMARY KEY,
    arquivo_nome VARCHAR(255),
    arquivo_conteudo TEXT,
    tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    features TEXT,
    data_treinamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_training_data_tag ON tag_training_data(tag_id);

-- ============================================================================
-- 6. MÓDULO FINANCEIRO
-- ============================================================================

-- Formas de Pagamento
CREATE TABLE IF NOT EXISTS formas_pagamento (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'boleto', 'transferencia')),
    ativo BOOLEAN DEFAULT TRUE,
    taxa_percentual DECIMAL(5, 2) DEFAULT 0,
    prazo_compensacao_dias INT DEFAULT 0
);

-- Títulos a Receber (migrado de boletos)
CREATE TABLE IF NOT EXISTS titulos_receber (
    id BIGSERIAL PRIMARY KEY,
    os_id BIGINT REFERENCES ordens_servico(id) ON DELETE RESTRICT,
    cliente_id BIGINT NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    numero_titulo VARCHAR(50) UNIQUE NOT NULL,

    -- Valores
    valor_original DECIMAL(10, 2) NOT NULL,
    valor_desconto DECIMAL(10, 2) DEFAULT 0,
    valor_juros DECIMAL(10, 2) DEFAULT 0,
    valor_multa DECIMAL(10, 2) DEFAULT 0,
    valor_total DECIMAL(10, 2) NOT NULL,
    valor_pago DECIMAL(10, 2) DEFAULT 0,
    valor_saldo DECIMAL(10, 2) NOT NULL,

    -- Datas
    data_emissao DATE NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago_parcial', 'pago', 'vencido', 'cancelado')),

    -- Integração Gateway de Pagamento
    gateway_provider VARCHAR(50),
    gateway_transaction_id VARCHAR(255),
    gateway_payment_link VARCHAR(500),
    gateway_status VARCHAR(50),
    webhook_payload JSONB,
    data_confirmacao_gateway TIMESTAMP,

    -- Boleto
    codigo_barras VARCHAR(100),
    linha_digitavel VARCHAR(100),
    nosso_numero VARCHAR(50),
    numero_documento VARCHAR(50),

    forma_pagamento_id BIGINT REFERENCES formas_pagamento(id) ON DELETE SET NULL,
    descricao TEXT,
    observacoes TEXT,
    arquivo_caminho VARCHAR(500),

    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_titulos_os ON titulos_receber(os_id);
CREATE INDEX idx_titulos_cliente ON titulos_receber(cliente_id);
CREATE INDEX idx_titulos_status ON titulos_receber(status);
CREATE INDEX idx_titulos_vencimento ON titulos_receber(data_vencimento);
CREATE INDEX idx_titulos_gateway_transaction ON titulos_receber(gateway_transaction_id);

-- Recibos (migrado de recibos)
CREATE TABLE IF NOT EXISTS recibos (
    id BIGSERIAL PRIMARY KEY,
    cliente_id BIGINT REFERENCES clientes(id) ON DELETE SET NULL,
    titulo_id BIGINT REFERENCES titulos_receber(id) ON DELETE SET NULL,
    cliente_nome VARCHAR(255) NOT NULL,
    numero_recibo VARCHAR(50),
    descricao TEXT,
    valor_total DECIMAL(10, 2) NOT NULL,
    data_emissao DATE NOT NULL,
    forma_pagamento VARCHAR(50),
    observacoes TEXT,
    arquivo_caminho VARCHAR(500),
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recibos_cliente ON recibos(cliente_id);
CREATE INDEX idx_recibos_titulo ON recibos(titulo_id);
CREATE INDEX idx_recibos_emissao ON recibos(data_emissao);

-- ============================================================================
-- 7. DADOS INICIAIS
-- ============================================================================

-- Inserir tags padrão
INSERT INTO tags (nome, descricao, cor) VALUES
    ('Laudo', 'Laudos técnicos e de serviços', '#10B981'),
    ('Recibo', 'Recibos de pagamento', '#3B82F6'),
    ('Orçamento', 'Orçamentos e propostas', '#F59E0B'),
    ('Boleto', 'Boletos bancários', '#F97316'),
    ('Contrato', 'Contratos e termos', '#8B5CF6'),
    ('Relatório', 'Relatórios diversos', '#6366F1'),
    ('Outros', 'Documentos diversos', '#6B7280')
ON CONFLICT (nome) DO NOTHING;

-- Inserir formas de pagamento padrão
INSERT INTO formas_pagamento (nome, tipo, ativo, taxa_percentual, prazo_compensacao_dias) VALUES
    ('Dinheiro', 'dinheiro', true, 0, 0),
    ('PIX', 'pix', true, 0, 0),
    ('Cartão de Crédito', 'cartao_credito', true, 3.5, 30),
    ('Cartão de Débito', 'cartao_debito', true, 2.0, 1),
    ('Boleto Bancário', 'boleto', true, 2.5, 3),
    ('Transferência', 'transferencia', true, 0, 1)
ON CONFLICT DO NOTHING;

-- Inserir pragas comuns
INSERT INTO pragas (nome_popular, nome_cientifico, categoria, nivel_risco, descricao) VALUES
    ('Barata', 'Blattodea', 'inseto', 'alto', 'Inseto urbano vetor de doenças'),
    ('Rato', 'Rattus norvegicus', 'roedor', 'critico', 'Roedor urbano transmissor de leptospirose'),
    ('Camundongo', 'Mus musculus', 'roedor', 'alto', 'Pequeno roedor doméstico'),
    ('Cupim', 'Isoptera', 'inseto', 'alto', 'Inseto destruidor de madeira'),
    ('Formiga', 'Formicidae', 'inseto', 'medio', 'Inseto social'),
    ('Mosca', 'Diptera', 'inseto', 'alto', 'Inseto vetor de doenças'),
    ('Pulga', 'Siphonaptera', 'inseto', 'medio', 'Parasita de animais'),
    ('Escorpião', 'Scorpiones', 'outro', 'critico', 'Aracnídeo peçonhento')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CONCLUSÃO
-- ============================================================================

-- Comentário final
COMMENT ON DATABASE erp_gestao_os IS 'ERP de Gestão de Ordens de Serviço - Migrado de SQLite com compatibilidade DocxTemplate';
