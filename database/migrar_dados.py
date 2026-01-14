#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Migração de Dados: SQLite → PostgreSQL
Migra dados do sistema atual preservando integridade referencial
"""

import sqlite3
import psycopg2
from psycopg2.extras import execute_batch
from datetime import datetime
import sys
import os
from pathlib import Path

# Configurações
SQLITE_DB = 'gestao_documentos.db'
POSTGRES_CONFIG = {
    'dbname': 'erp_gestao_os',
    'user': 'erp_user',
    'password': 'erp_senha_123',
    'host': 'localhost',
    'port': 5432
}

class MigradorDados:
    """Migrador de dados SQLite para PostgreSQL"""

    def __init__(self):
        self.sqlite_conn = None
        self.pg_conn = None
        self.mapeamento_clientes = {}
        self.mapeamento_documentos = {}
        self.estatisticas = {
            'clientes': 0,
            'enderecos': 0,
            'documentos': 0,
            'boletos': 0,
            'recibos': 0,
            'tags': 0,
            'documento_tags': 0,
            'erros': []
        }

    def conectar_bancos(self):
        """Conecta aos bancos de dados SQLite e PostgreSQL"""
        try:
            # SQLite
            if not Path(SQLITE_DB).exists():
                raise FileNotFoundError(f"Banco SQLite não encontrado: {SQLITE_DB}")

            self.sqlite_conn = sqlite3.connect(SQLITE_DB)
            self.sqlite_conn.row_factory = sqlite3.Row
            print(f"✅ Conectado ao SQLite: {SQLITE_DB}")

            # PostgreSQL
            self.pg_conn = psycopg2.connect(**POSTGRES_CONFIG)
            self.pg_conn.autocommit = False
            print(f"✅ Conectado ao PostgreSQL: {POSTGRES_CONFIG['dbname']}")

            return True

        except Exception as e:
            print(f"❌ Erro ao conectar aos bancos: {e}")
            return False

    def validar_tabelas_sqlite(self):
        """Valida se as tabelas necessárias existem no SQLite"""
        cursor = self.sqlite_conn.cursor()

        tabelas_necessarias = ['clientes_web', 'documentos_gerados']
        tabelas_existentes = cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()

        tabelas_existentes = [t[0] for t in tabelas_existentes]

        print("\n📋 Tabelas encontradas no SQLite:")
        for tabela in tabelas_existentes:
            count = cursor.execute(f"SELECT COUNT(*) FROM {tabela}").fetchone()[0]
            print(f"  - {tabela}: {count} registros")

        faltando = set(tabelas_necessarias) - set(tabelas_existentes)
        if faltando:
            print(f"⚠️  Tabelas faltando: {', '.join(faltando)}")
            return False

        return True

    def migrar_clientes(self):
        """Migra clientes do SQLite para PostgreSQL"""
        print("\n🔄 Migrando clientes...")

        sqlite_cur = self.sqlite_conn.cursor()
        pg_cur = self.pg_conn.cursor()

        try:
            # Buscar clientes do SQLite
            clientes = sqlite_cur.execute("""
                SELECT * FROM clientes_web ORDER BY id
            """).fetchall()

            total = len(clientes)
            print(f"  Encontrados {total} clientes para migrar")

            for idx, cliente in enumerate(clientes, 1):
                try:
                    # Determinar tipo de pessoa
                    cnpj = cliente['cnpj'] or ''
                    tipo_pessoa = 'PJ' if len(cnpj.replace('.', '').replace('-', '').replace('/', '')) == 14 else 'PF'

                    # Inserir cliente
                    pg_cur.execute("""
                        INSERT INTO clientes (
                            nome_fantasia, razao_social, cpf_cnpj, cnae,
                            telefone_principal, email, observacoes,
                            data_cadastro, usuario_cadastro, status, tipo_pessoa
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, 'ativo', %s
                        ) RETURNING id
                    """, (
                        cliente['nome_fantasia'],
                        cliente['razao_social'],
                        cnpj or f"TEMP_{cliente['id']}",  # CPF/CNPJ obrigatório
                        cliente['cnae'],
                        cliente['telefone'],
                        cliente['email'],
                        cliente['observacoes'],
                        cliente['data_cadastro'] or datetime.now(),
                        cliente['usuario_cadastro'],
                        tipo_pessoa
                    ))

                    novo_id = pg_cur.fetchone()[0]
                    self.mapeamento_clientes[cliente['id']] = novo_id

                    # Criar endereço se existir
                    if cliente['rua']:
                        pg_cur.execute("""
                            INSERT INTO enderecos (
                                cliente_id, tipo_endereco, logradouro, numero,
                                bairro, cidade, uf, endereco_padrao
                            ) VALUES (
                                %s, 'comercial', %s, %s, %s, %s, %s, TRUE
                            )
                        """, (
                            novo_id,
                            cliente['rua'],
                            cliente['numero'] or 'S/N',
                            cliente['bairro'] or '',
                            cliente['cidade'] or 'Não informado',
                            cliente['uf'] or 'SP'
                        ))
                        self.estatisticas['enderecos'] += 1

                    self.estatisticas['clientes'] += 1

                    if idx % 10 == 0:
                        print(f"  Progresso: {idx}/{total} ({idx*100//total}%)")

                except Exception as e:
                    self.estatisticas['erros'].append(f"Cliente ID {cliente['id']}: {str(e)}")
                    print(f"  ⚠️  Erro ao migrar cliente {cliente['nome_fantasia']}: {e}")

            self.pg_conn.commit()
            print(f"✅ {self.estatisticas['clientes']} clientes migrados")
            print(f"✅ {self.estatisticas['enderecos']} endereços criados")

        except Exception as e:
            self.pg_conn.rollback()
            print(f"❌ Erro ao migrar clientes: {e}")
            raise

    def migrar_documentos(self):
        """Migra documentos gerados"""
        print("\n🔄 Migrando documentos gerados...")

        sqlite_cur = self.sqlite_conn.cursor()
        pg_cur = self.pg_conn.cursor()

        try:
            # Verificar se tabela existe
            tabelas = sqlite_cur.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='documentos_gerados'"
            ).fetchall()

            if not tabelas:
                print("  ⚠️  Tabela documentos_gerados não existe no SQLite")
                return

            # Buscar documentos
            documentos = sqlite_cur.execute("""
                SELECT * FROM documentos_gerados ORDER BY id
            """).fetchall()

            total = len(documentos)
            print(f"  Encontrados {total} documentos para migrar")

            # Mapeamento de tipos de documento
            tipo_map = {
                'LAUDO': 'laudo_tecnico',
                'RECIBO': 'recibo',
                'ORCAMENTO': 'orcamento',
                'BOLETO': 'boleto',
                'CERTIFICADO': 'certificado'
            }

            for idx, doc in enumerate(documentos, 1):
                try:
                    # Mapear cliente_id
                    cliente_id_antigo = doc['cliente_id']
                    cliente_id_novo = self.mapeamento_clientes.get(cliente_id_antigo)

                    if not cliente_id_novo:
                        # Tentar buscar por CNPJ
                        cnpj = doc.get('cliente_cnpj', '')
                        if cnpj:
                            pg_cur.execute(
                                "SELECT id FROM clientes WHERE cpf_cnpj = %s",
                                (cnpj,)
                            )
                            result = pg_cur.fetchone()
                            if result:
                                cliente_id_novo = result[0]

                    if not cliente_id_novo:
                        print(f"  ⚠️  Cliente não encontrado para documento ID {doc['id']}")
                        continue

                    # Mapear tipo de documento
                    tipo_antigo = (doc['tipo_doc'] or 'OUTRO').upper()
                    tipo_novo = tipo_map.get(tipo_antigo, 'outro')

                    # Inserir documento
                    pg_cur.execute("""
                        INSERT INTO documentos_gerados (
                            cliente_id, tipo_documento, nome_arquivo, caminho_arquivo,
                            tamanho_bytes, arquivo_hash, data_geracao, data_conclusao,
                            status_geracao, formato_arquivo,
                            valor_total, cliente_nome, razao_social, cliente_cnpj,
                            status_aprovacao, usuario_gerador
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, 'gerado', 'docx',
                            %s, %s, %s, %s, %s, %s
                        ) RETURNING id
                    """, (
                        cliente_id_novo,
                        tipo_novo,
                        doc['nome_arquivo'],
                        doc['caminho_arquivo'],
                        doc['tamanho_bytes'],
                        doc.get('hash_md5'),
                        doc['data_geracao'] or datetime.now(),
                        doc['data_geracao'] or datetime.now(),
                        float(doc['valor_total']) if doc.get('valor_total') else 0.0,
                        doc.get('cliente_nome'),
                        doc.get('razao_social'),
                        doc.get('cliente_cnpj'),
                        doc.get('status_aprovacao'),
                        doc.get('usuario_gerador')
                    ))

                    novo_id = pg_cur.fetchone()[0]
                    self.mapeamento_documentos[doc['id']] = novo_id

                    self.estatisticas['documentos'] += 1

                    if idx % 50 == 0:
                        print(f"  Progresso: {idx}/{total} ({idx*100//total}%)")

                except Exception as e:
                    self.estatisticas['erros'].append(f"Documento ID {doc['id']}: {str(e)}")
                    print(f"  ⚠️  Erro ao migrar documento ID {doc['id']}: {e}")

            self.pg_conn.commit()
            print(f"✅ {self.estatisticas['documentos']} documentos migrados")

        except Exception as e:
            self.pg_conn.rollback()
            print(f"❌ Erro ao migrar documentos: {e}")
            raise

    def migrar_boletos(self):
        """Migra boletos para títulos a receber"""
        print("\n🔄 Migrando boletos...")

        sqlite_cur = self.sqlite_conn.cursor()
        pg_cur = self.pg_conn.cursor()

        try:
            # Verificar se tabela existe
            tabelas = sqlite_cur.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='boletos'"
            ).fetchall()

            if not tabelas:
                print("  ⚠️  Tabela boletos não existe no SQLite")
                return

            boletos = sqlite_cur.execute("""
                SELECT * FROM boletos ORDER BY id
            """).fetchall()

            total = len(boletos)
            print(f"  Encontrados {total} boletos para migrar")

            for idx, boleto in enumerate(boletos, 1):
                try:
                    cliente_id_novo = self.mapeamento_clientes.get(boleto['cliente_id'])

                    if not cliente_id_novo:
                        print(f"  ⚠️  Cliente não encontrado para boleto ID {boleto['id']}")
                        continue

                    # Mapear status
                    status_map = {
                        'pendente': 'pendente',
                        'pago': 'pago',
                        'vencido': 'vencido',
                        'cancelado': 'cancelado'
                    }
                    status = status_map.get(boleto['status'], 'pendente')

                    valor = float(boleto['valor']) if boleto['valor'] else 0.0
                    valor_pago = float(boleto['valor_pago']) if boleto.get('valor_pago') else 0.0

                    # Inserir título a receber
                    pg_cur.execute("""
                        INSERT INTO titulos_receber (
                            cliente_id, numero_titulo, valor_original, valor_total, valor_saldo,
                            valor_pago, data_emissao, data_vencimento, data_pagamento,
                            status, codigo_barras, numero_documento, descricao,
                            observacoes, arquivo_caminho
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                        )
                    """, (
                        cliente_id_novo,
                        boleto['numero_documento'] or f"BOL-{boleto['id']}",
                        valor,
                        valor,
                        valor - valor_pago,
                        valor_pago,
                        boleto['data_emissao'] or datetime.now().date(),
                        boleto['data_vencimento'],
                        boleto['data_pagamento'],
                        status,
                        boleto['codigo_barras'],
                        boleto['numero_documento'],
                        boleto['descricao'],
                        boleto['observacoes'],
                        boleto['arquivo_caminho']
                    ))

                    self.estatisticas['boletos'] += 1

                except Exception as e:
                    self.estatisticas['erros'].append(f"Boleto ID {boleto['id']}: {str(e)}")
                    print(f"  ⚠️  Erro ao migrar boleto ID {boleto['id']}: {e}")

            self.pg_conn.commit()
            print(f"✅ {self.estatisticas['boletos']} boletos migrados")

        except Exception as e:
            self.pg_conn.rollback()
            print(f"❌ Erro ao migrar boletos: {e}")

    def migrar_recibos(self):
        """Migra recibos"""
        print("\n🔄 Migrando recibos...")

        sqlite_cur = self.sqlite_conn.cursor()
        pg_cur = self.pg_conn.cursor()

        try:
            # Verificar se tabela existe
            tabelas = sqlite_cur.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='recibos'"
            ).fetchall()

            if not tabelas:
                print("  ⚠️  Tabela recibos não existe no SQLite")
                return

            recibos = sqlite_cur.execute("""
                SELECT * FROM recibos ORDER BY id
            """).fetchall()

            total = len(recibos)
            print(f"  Encontrados {total} recibos para migrar")

            for idx, recibo in enumerate(recibos, 1):
                try:
                    cliente_id_novo = None
                    if recibo.get('cliente_id'):
                        cliente_id_novo = self.mapeamento_clientes.get(recibo['cliente_id'])

                    pg_cur.execute("""
                        INSERT INTO recibos (
                            cliente_id, cliente_nome, numero_recibo, descricao,
                            valor_total, data_emissao, forma_pagamento, observacoes,
                            arquivo_caminho
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s
                        )
                    """, (
                        cliente_id_novo,
                        recibo['cliente_nome'],
                        recibo.get('numero_recibo'),
                        recibo.get('descricao'),
                        float(recibo['valor_total']) if recibo.get('valor_total') else 0.0,
                        recibo['data_emissao'] or datetime.now().date(),
                        recibo.get('forma_pagamento'),
                        recibo.get('observacoes'),
                        recibo.get('arquivo_caminho')
                    ))

                    self.estatisticas['recibos'] += 1

                except Exception as e:
                    self.estatisticas['erros'].append(f"Recibo ID {recibo['id']}: {str(e)}")
                    print(f"  ⚠️  Erro ao migrar recibo ID {recibo['id']}: {e}")

            self.pg_conn.commit()
            print(f"✅ {self.estatisticas['recibos']} recibos migrados")

        except Exception as e:
            self.pg_conn.rollback()
            print(f"❌ Erro ao migrar recibos: {e}")

    def migrar_tags(self):
        """Migra tags e documento_tags"""
        print("\n🔄 Migrando tags...")

        sqlite_cur = self.sqlite_conn.cursor()
        pg_cur = self.pg_conn.cursor()

        try:
            # Verificar se tabela existe
            tabelas = sqlite_cur.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='documento_tags'"
            ).fetchall()

            if not tabelas:
                print("  ⚠️  Tabela documento_tags não existe no SQLite")
                return

            # Migrar documento_tags
            doc_tags = sqlite_cur.execute("""
                SELECT * FROM documento_tags
            """).fetchall()

            total = len(doc_tags)
            print(f"  Encontrados {total} documento_tags para migrar")

            for idx, dt in enumerate(doc_tags, 1):
                try:
                    # Mapear arquivo_id se for documento
                    arquivo_id_novo = dt['arquivo_id']
                    if dt['arquivo_tipo'] == 'documento':
                        arquivo_id_novo = self.mapeamento_documentos.get(dt['arquivo_id'], dt['arquivo_id'])

                    pg_cur.execute("""
                        INSERT INTO documento_tags (
                            arquivo_id, arquivo_tipo, tag_id, confianca, manual, data_atribuicao
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s
                        )
                    """, (
                        arquivo_id_novo,
                        dt['arquivo_tipo'],
                        dt['tag_id'],
                        float(dt['confianca']) if dt.get('confianca') else 1.0,
                        dt.get('manual', True),
                        dt.get('data_atribuicao', datetime.now())
                    ))

                    self.estatisticas['documento_tags'] += 1

                except Exception as e:
                    self.estatisticas['erros'].append(f"DocTag ID {dt['id']}: {str(e)}")

            self.pg_conn.commit()
            print(f"✅ {self.estatisticas['documento_tags']} documento_tags migrados")

        except Exception as e:
            self.pg_conn.rollback()
            print(f"❌ Erro ao migrar tags: {e}")

    def exibir_relatorio(self):
        """Exibe relatório final da migração"""
        print("\n" + "="*60)
        print("📊 RELATÓRIO DE MIGRAÇÃO")
        print("="*60)
        print(f"✅ Clientes migrados:      {self.estatisticas['clientes']}")
        print(f"✅ Endereços criados:      {self.estatisticas['enderecos']}")
        print(f"✅ Documentos migrados:    {self.estatisticas['documentos']}")
        print(f"✅ Boletos migrados:       {self.estatisticas['boletos']}")
        print(f"✅ Recibos migrados:       {self.estatisticas['recibos']}")
        print(f"✅ Tags migradas:          {self.estatisticas['documento_tags']}")

        if self.estatisticas['erros']:
            print(f"\n⚠️  Total de erros: {len(self.estatisticas['erros'])}")
            print("\nPrimeiros 10 erros:")
            for erro in self.estatisticas['erros'][:10]:
                print(f"  - {erro}")
        else:
            print("\n✅ Migração concluída SEM ERROS!")

        print("="*60)

    def executar_migracao_completa(self):
        """Executa migração completa"""
        print("🚀 INICIANDO MIGRAÇÃO DE DADOS")
        print("="*60)

        try:
            # Conectar
            if not self.conectar_bancos():
                return False

            # Validar
            if not self.validar_tabelas_sqlite():
                return False

            # Migrar dados
            self.migrar_clientes()
            self.migrar_documentos()
            self.migrar_boletos()
            self.migrar_recibos()
            self.migrar_tags()

            # Relatório
            self.exibir_relatorio()

            return True

        except Exception as e:
            print(f"\n❌ ERRO CRÍTICO: {e}")
            import traceback
            traceback.print_exc()
            return False

        finally:
            if self.sqlite_conn:
                self.sqlite_conn.close()
            if self.pg_conn:
                self.pg_conn.close()


def main():
    """Função principal"""
    print("""
╔══════════════════════════════════════════════════════════════╗
║  MIGRADOR DE DADOS: SQLite → PostgreSQL                      ║
║  Sistema ERP de Gestão de Ordens de Serviço                  ║
╚══════════════════════════════════════════════════════════════╝
    """)

    # Verificar arquivo SQLite
    if not Path(SQLITE_DB).exists():
        print(f"❌ Arquivo SQLite não encontrado: {SQLITE_DB}")
        print(f"   Certifique-se de que o arquivo está no diretório atual")
        return 1

    # Confirmar migração
    print(f"📂 Banco SQLite encontrado: {SQLITE_DB}")
    print(f"🎯 Destino: PostgreSQL ({POSTGRES_CONFIG['host']}:{POSTGRES_CONFIG['port']}/{POSTGRES_CONFIG['dbname']})")
    print("\n⚠️  ATENÇÃO: Esta operação irá inserir dados no PostgreSQL")

    resposta = input("\nDeseja continuar? (s/N): ").strip().lower()
    if resposta != 's':
        print("❌ Migração cancelada pelo usuário")
        return 0

    # Executar migração
    migrador = MigradorDados()
    sucesso = migrador.executar_migracao_completa()

    return 0 if sucesso else 1


if __name__ == '__main__':
    sys.exit(main())
