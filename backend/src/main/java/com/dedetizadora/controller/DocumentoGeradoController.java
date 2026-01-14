package com.dedetizadora.controller;

import com.dedetizadora.entity.DocumentoGerado;
import com.dedetizadora.service.DocumentoGeradoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Controller para gerenciamento de documentos gerados
 */
@Slf4j
@RestController
@RequestMapping("/documentos-gerados")
@RequiredArgsConstructor
public class DocumentoGeradoController {

    private final DocumentoGeradoService service;

    /**
     * Busca documento por ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<DocumentoGerado> buscarPorId(@PathVariable Long id) {
        Optional<DocumentoGerado> documento = service.buscarUltimaVersao(id);
        return documento.map(ResponseEntity::ok)
                       .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Busca documento por número
     */
    @GetMapping("/numero/{numero}")
    public ResponseEntity<DocumentoGerado> buscarPorNumero(@PathVariable String numero) {
        Optional<DocumentoGerado> documento = service.buscarPorNumero(numero);
        return documento.map(ResponseEntity::ok)
                       .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Busca documentos por cliente (CNPJ/CPF)
     */
    @GetMapping("/cliente/{cnpjCpf}")
    public ResponseEntity<List<DocumentoGerado>> buscarPorCliente(@PathVariable String cnpjCpf) {
        List<DocumentoGerado> documentos = service.buscarPorCliente(cnpjCpf);
        return ResponseEntity.ok(documentos);
    }

    /**
     * Busca documentos por nome do cliente
     */
    @GetMapping("/cliente/nome/{nome}")
    public ResponseEntity<List<DocumentoGerado>> buscarPorNomeCliente(@PathVariable String nome) {
        List<DocumentoGerado> documentos = service.buscarPorNomeCliente(nome);
        return ResponseEntity.ok(documentos);
    }

    /**
     * Busca documentos por tipo
     */
    @GetMapping("/tipo/{tipo}")
    public ResponseEntity<List<DocumentoGerado>> buscarPorTipo(@PathVariable String tipo) {
        List<DocumentoGerado> documentos = service.buscarPorTipo(tipo);
        return ResponseEntity.ok(documentos);
    }

    /**
     * Busca documentos por período
     */
    @GetMapping("/periodo")
    public ResponseEntity<List<DocumentoGerado>> buscarPorPeriodo(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fim) {

        List<DocumentoGerado> documentos = service.buscarPorPeriodo(inicio, fim);
        return ResponseEntity.ok(documentos);
    }

    /**
     * Lista documentos ativos
     */
    @GetMapping("/ativos")
    public ResponseEntity<List<DocumentoGerado>> listarAtivos() {
        List<DocumentoGerado> documentos = service.listarDocumentosAtivos();
        return ResponseEntity.ok(documentos);
    }

    /**
     * Busca versões de um documento
     */
    @GetMapping("/{id}/versoes")
    public ResponseEntity<List<DocumentoGerado>> buscarVersoes(@PathVariable Long id) {
        List<DocumentoGerado> versoes = service.buscarVersoes(id);
        return ResponseEntity.ok(versoes);
    }

    /**
     * Cancela um documento
     */
    @PutMapping("/{id}/cancelar")
    public ResponseEntity<Void> cancelarDocumento(
            @PathVariable Long id,
            @RequestParam String motivo) {

        try {
            service.cancelarDocumento(id, motivo);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Erro ao cancelar documento", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Download do arquivo do documento
     */
    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadDocumento(@PathVariable Long id) {
        Optional<DocumentoGerado> documentoOpt = service.buscarUltimaVersao(id);

        if (documentoOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        DocumentoGerado documento = documentoOpt.get();
        File file = new File(documento.getCaminhoArquivo());

        if (!file.exists()) {
            log.error("Arquivo não encontrado: {}", documento.getCaminhoArquivo());
            return ResponseEntity.notFound().build();
        }

        Resource resource = new FileSystemResource(file);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                       "attachment; filename=\"" + file.getName() + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .contentLength(file.length())
                .body(resource);
    }

    /**
     * Estatísticas de documentos por tipo
     */
    @GetMapping("/estatisticas/{tipo}")
    public ResponseEntity<Long> contarPorTipo(@PathVariable String tipo) {
        Long quantidade = service.contarDocumentosPorTipo(tipo);
        return ResponseEntity.ok(quantidade);
    }
}
