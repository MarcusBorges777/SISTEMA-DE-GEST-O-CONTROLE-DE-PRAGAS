package com.dedetizadora.service;

import com.dedetizadora.entity.DocumentoGerado;
import com.dedetizadora.repository.DocumentoGeradoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentoGeradoService {

    private final DocumentoGeradoRepository repository;

    /**
     * Registra um documento gerado
     */
    @Transactional
    public DocumentoGerado registrarDocumento(
            String tipoDocumento,
            String numeroDocumento,
            File arquivo,
            String nomeCliente,
            String cnpjCpf) {

        DocumentoGerado documento = new DocumentoGerado();
        documento.setTipoDocumento(tipoDocumento);
        documento.setNumeroDocumento(numeroDocumento);
        documento.setCaminhoArquivo(arquivo.getAbsolutePath());
        documento.setNomeCliente(nomeCliente);
        documento.setCnpjCpf(cnpjCpf);
        documento.setVersao(1);
        documento.setStatus("ATIVO");

        return repository.save(documento);
    }

    /**
     * Cria uma nova versão de um documento existente
     */
    @Transactional
    public DocumentoGerado criarNovaVersao(
            Long documentoOriginalId,
            File novoArquivo,
            String observacoes) {

        Optional<DocumentoGerado> originalOpt = repository.findById(documentoOriginalId);

        if (originalOpt.isEmpty()) {
            throw new RuntimeException("Documento original não encontrado");
        }

        DocumentoGerado original = originalOpt.get();

        // Marca o documento original como substituído
        original.setStatus("SUBSTITUIDO");
        repository.save(original);

        // Cria nova versão
        DocumentoGerado novaVersao = new DocumentoGerado();
        novaVersao.setTipoDocumento(original.getTipoDocumento());
        novaVersao.setNumeroDocumento(original.getNumeroDocumento());
        novaVersao.setCaminhoArquivo(novoArquivo.getAbsolutePath());
        novaVersao.setNomeCliente(original.getNomeCliente());
        novaVersao.setCnpjCpf(original.getCnpjCpf());
        novaVersao.setDocumentoPaiId(original.getDocumentoPaiId() != null ?
                                      original.getDocumentoPaiId() : original.getId());
        novaVersao.setVersao(original.getVersao() + 1);
        novaVersao.setObservacoes(observacoes);
        novaVersao.setStatus("ATIVO");

        return repository.save(novaVersao);
    }

    /**
     * Cancela um documento
     */
    @Transactional
    public void cancelarDocumento(Long documentoId, String motivo) {
        Optional<DocumentoGerado> documentoOpt = repository.findById(documentoId);

        if (documentoOpt.isEmpty()) {
            throw new RuntimeException("Documento não encontrado");
        }

        DocumentoGerado documento = documentoOpt.get();
        documento.setStatus("CANCELADO");
        documento.setObservacoes(motivo);
        repository.save(documento);

        log.info("Documento {} cancelado. Motivo: {}", documentoId, motivo);
    }

    /**
     * Busca todas as versões de um documento
     */
    public List<DocumentoGerado> buscarVersoes(Long documentoId) {
        return repository.findByDocumentoPaiIdOrId(documentoId, documentoId);
    }

    /**
     * Busca última versão ativa de um documento
     */
    public Optional<DocumentoGerado> buscarUltimaVersao(Long documentoId) {
        return repository.findUltimaVersao(documentoId);
    }

    /**
     * Busca documentos por cliente
     */
    public List<DocumentoGerado> buscarPorCliente(String cnpjCpf) {
        return repository.findByCnpjCpf(cnpjCpf);
    }

    /**
     * Busca documentos por nome do cliente
     */
    public List<DocumentoGerado> buscarPorNomeCliente(String nomeCliente) {
        return repository.findByNomeClienteContainingIgnoreCase(nomeCliente);
    }

    /**
     * Busca documentos por tipo
     */
    public List<DocumentoGerado> buscarPorTipo(String tipoDocumento) {
        return repository.findByTipoDocumento(tipoDocumento);
    }

    /**
     * Busca documentos gerados em um período
     */
    public List<DocumentoGerado> buscarPorPeriodo(LocalDateTime inicio, LocalDateTime fim) {
        return repository.findByDataGeracaoBetween(inicio, fim);
    }

    /**
     * Busca documento por número
     */
    public Optional<DocumentoGerado> buscarPorNumero(String numeroDocumento) {
        return repository.findByNumeroDocumento(numeroDocumento);
    }

    /**
     * Lista todos os documentos ativos
     */
    public List<DocumentoGerado> listarDocumentosAtivos() {
        return repository.findByStatus("ATIVO");
    }

    /**
     * Estatísticas de documentos por tipo
     */
    public Long contarDocumentosPorTipo(String tipoDocumento) {
        return repository.countByTipoDocumento(tipoDocumento);
    }
}
