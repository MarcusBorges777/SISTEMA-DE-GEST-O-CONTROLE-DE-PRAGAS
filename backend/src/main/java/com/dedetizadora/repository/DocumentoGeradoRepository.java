package com.dedetizadora.repository;

import com.dedetizadora.entity.DocumentoGerado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentoGeradoRepository extends JpaRepository<DocumentoGerado, Long> {

    /**
     * Busca documentos por tipo
     */
    List<DocumentoGerado> findByTipoDocumento(String tipoDocumento);

    /**
     * Busca documentos por número
     */
    Optional<DocumentoGerado> findByNumeroDocumento(String numeroDocumento);

    /**
     * Busca documentos por cliente (CNPJ/CPF)
     */
    List<DocumentoGerado> findByCnpjCpf(String cnpjCpf);

    /**
     * Busca documentos por cliente (nome)
     */
    List<DocumentoGerado> findByNomeClienteContainingIgnoreCase(String nomeCliente);

    /**
     * Busca documentos gerados em um período
     */
    List<DocumentoGerado> findByDataGeracaoBetween(LocalDateTime inicio, LocalDateTime fim);

    /**
     * Busca versões de um documento
     */
    List<DocumentoGerado> findByDocumentoPaiIdOrId(Long documentoPaiId, Long id);

    /**
     * Busca última versão de um documento
     */
    @Query("SELECT d FROM DocumentoGerado d WHERE (d.documentoPaiId = :documentoId OR d.id = :documentoId) AND d.status = 'ATIVO' ORDER BY d.versao DESC")
    Optional<DocumentoGerado> findUltimaVersao(Long documentoId);

    /**
     * Conta documentos por tipo
     */
    Long countByTipoDocumento(String tipoDocumento);

    /**
     * Busca documentos ativos
     */
    List<DocumentoGerado> findByStatus(String status);
}
