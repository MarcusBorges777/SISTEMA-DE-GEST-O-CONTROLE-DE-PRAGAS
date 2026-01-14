package com.dedetizadora.controller;

import com.dedetizadora.dto.LaudoCompletoDTO;
import com.dedetizadora.dto.OrcamentoDTO;
import com.dedetizadora.dto.ReciboDTO;
import com.dedetizadora.service.DocumentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/documentos")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    /**
     * Gera Laudo Completo
     */
    @PostMapping("/laudo-completo")
    public ResponseEntity<Resource> gerarLaudoCompleto(
            @RequestBody LaudoCompletoDTO dto,
            @RequestParam(defaultValue = "true") boolean comAssinatura,
            @RequestParam(defaultValue = "true") boolean registrar) {

        try {
            Map<String, Object> data = convertLaudoCompletoToMap(dto);
            File file = documentService.gerarLaudoCompleto(data, comAssinatura, registrar);
            return buildFileResponse(file, "Laudo_Completo.docx");
        } catch (Exception e) {
            log.error("Erro ao gerar laudo completo", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Gera Laudo de Dedetização
     */
    @PostMapping("/laudo-dedetizacao")
    public ResponseEntity<Resource> gerarLaudoDedetizacao(
            @RequestBody LaudoCompletoDTO dto,
            @RequestParam(defaultValue = "true") boolean comAssinatura,
            @RequestParam(defaultValue = "true") boolean registrar) {

        try {
            Map<String, Object> data = convertLaudoCompletoToMap(dto);
            File file = documentService.gerarLaudoDedetizacao(data, comAssinatura, registrar);
            return buildFileResponse(file, "Laudo_Dedetizacao.docx");
        } catch (Exception e) {
            log.error("Erro ao gerar laudo de dedetização", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Gera Laudo de Caixa D'Água
     */
    @PostMapping("/laudo-caixa-agua")
    public ResponseEntity<Resource> gerarLaudoCaixaAgua(
            @RequestBody LaudoCompletoDTO dto,
            @RequestParam(defaultValue = "true") boolean comAssinatura,
            @RequestParam(defaultValue = "true") boolean registrar) {

        try {
            Map<String, Object> data = convertLaudoCompletoToMap(dto);
            File file = documentService.gerarLaudoCaixaAgua(data, comAssinatura, registrar);
            return buildFileResponse(file, "Laudo_Caixa_Agua.docx");
        } catch (Exception e) {
            log.error("Erro ao gerar laudo de caixa d'água", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Gera Recibo
     */
    @PostMapping("/recibo")
    public ResponseEntity<Resource> gerarRecibo(
            @RequestBody ReciboDTO dto,
            @RequestParam(defaultValue = "true") boolean registrar) {
        try {
            Map<String, Object> data = convertReciboToMap(dto);
            File file = documentService.gerarRecibo(data, registrar);
            return buildFileResponse(file, "Recibo.docx");
        } catch (Exception e) {
            log.error("Erro ao gerar recibo", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Gera Orçamento
     */
    @PostMapping("/orcamento")
    public ResponseEntity<Resource> gerarOrcamento(
            @RequestBody OrcamentoDTO dto,
            @RequestParam(defaultValue = "true") boolean registrar) {
        try {
            Map<String, Object> data = convertOrcamentoToMap(dto);
            File file = documentService.gerarOrcamento(data, registrar);
            return buildFileResponse(file, "Orcamento.docx");
        } catch (Exception e) {
            log.error("Erro ao gerar orçamento", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // Métodos auxiliares para converter DTOs em Maps

    private Map<String, Object> convertLaudoCompletoToMap(LaudoCompletoDTO dto) {
        Map<String, Object> data = new HashMap<>();

        // Dados do Cliente
        data.put("nomeCliente", dto.getNomeCliente());
        data.put("cnpjCpf", dto.getCnpjCpf());
        data.put("enderecoCliente", dto.getEnderecoCliente());
        data.put("bairroCliente", dto.getBairroCliente());
        data.put("cidadeCliente", dto.getCidadeCliente());
        data.put("cepCliente", dto.getCepCliente());
        data.put("telefoneCliente", dto.getTelefoneCliente());
        data.put("emailCliente", dto.getEmailCliente());

        // Dados do Serviço
        data.put("numeroOS", dto.getNumeroOS());
        data.put("data", dto.getData());
        data.put("dataExtenso", dto.getDataExtenso());
        data.put("horarioInicio", dto.getHorarioInicio());
        data.put("horarioTermino", dto.getHorarioTermino());
        data.put("tipoServico", dto.getTipoServico());
        data.put("responsavelTecnico", dto.getResponsavelTecnico());
        data.put("numeroRegistro", dto.getNumeroRegistro());

        // Descrição do Local
        data.put("tipoImovel", dto.getTipoImovel());
        data.put("area", dto.getArea());
        data.put("pavimentos", dto.getPavimentos());
        data.put("descricaoLocal", dto.getDescricaoLocal());

        // Listas
        data.put("pragas", dto.getPragas());
        data.put("produtos", dto.getProdutos());

        // Metodologia
        data.put("metodologiaAplicacao", dto.getMetodologiaAplicacao());
        data.put("equipamentosUtilizados", dto.getEquipamentosUtilizados());
        data.put("concentracao", dto.getConcentracao());
        data.put("volumeCalda", dto.getVolumeCalda());

        // Observações
        data.put("observacoes", dto.getObservacoes());
        data.put("recomendacoes", dto.getRecomendacoes());
        data.put("proximaVisita", dto.getProximaVisita());

        // Garantia
        data.put("periodoGarantia", dto.getPeriodoGarantia());
        data.put("condicoesGarantia", dto.getCondicoesGarantia());

        // Assinatura
        data.put("nomeResponsavel", dto.getNomeResponsavel());
        data.put("assinaturaPath", dto.getAssinaturaPath());
        data.put("carimboPath", dto.getCarimboPath());

        return data;
    }

    private Map<String, Object> convertReciboToMap(ReciboDTO dto) {
        Map<String, Object> data = new HashMap<>();

        data.put("numeroRecibo", dto.getNumeroRecibo());
        data.put("data", dto.getData());
        data.put("dataExtenso", dto.getDataExtenso());

        data.put("nomeCliente", dto.getNomeCliente());
        data.put("cnpjCpf", dto.getCnpjCpf());
        data.put("enderecoCliente", dto.getEnderecoCliente());
        data.put("cidadeCliente", dto.getCidadeCliente());

        data.put("valorTotal", dto.getValorTotal());
        data.put("valorPorExtenso", dto.getValorPorExtenso());
        data.put("formaPagamento", dto.getFormaPagamento());
        data.put("referente", dto.getReferente());

        data.put("servicos", dto.getServicos());

        data.put("nomeEmpresa", dto.getNomeEmpresa());
        data.put("cnpjEmpresa", dto.getCnpjEmpresa());
        data.put("enderecoEmpresa", dto.getEnderecoEmpresa());

        return data;
    }

    private Map<String, Object> convertOrcamentoToMap(OrcamentoDTO dto) {
        Map<String, Object> data = new HashMap<>();

        data.put("numeroOrcamento", dto.getNumeroOrcamento());
        data.put("data", dto.getData());
        data.put("validade", dto.getValidade());

        data.put("nomeCliente", dto.getNomeCliente());
        data.put("cnpjCpf", dto.getCnpjCpf());
        data.put("enderecoCliente", dto.getEnderecoCliente());
        data.put("cidadeCliente", dto.getCidadeCliente());
        data.put("telefone", dto.getTelefone());
        data.put("email", dto.getEmail());

        data.put("itens", dto.getItens());

        data.put("subtotal", dto.getSubtotal());
        data.put("desconto", dto.getDesconto());
        data.put("valorTotal", dto.getValorTotal());
        data.put("valorTotalExtenso", dto.getValorTotalExtenso());

        data.put("formaPagamento", dto.getFormaPagamento());
        data.put("condicoesPagamento", dto.getCondicoesPagamento());
        data.put("prazoExecucao", dto.getPrazoExecucao());
        data.put("garantia", dto.getGarantia());

        data.put("observacoes", dto.getObservacoes());

        data.put("nomeEmpresa", dto.getNomeEmpresa());
        data.put("cnpjEmpresa", dto.getCnpjEmpresa());
        data.put("enderecoEmpresa", dto.getEnderecoEmpresa());
        data.put("telefoneEmpresa", dto.getTelefoneEmpresa());
        data.put("emailEmpresa", dto.getEmailEmpresa());
        data.put("siteEmpresa", dto.getSiteEmpresa());

        return data;
    }

    private ResponseEntity<Resource> buildFileResponse(File file, String fileName) {
        Resource resource = new FileSystemResource(file);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .contentLength(file.length())
                .body(resource);
    }
}
