package com.dedetizadora.service;

import com.deepoove.poi.XWPFTemplate;
import com.deepoove.poi.config.Configure;
import com.deepoove.poi.config.ConfigureBuilder;
import com.deepoove.poi.plugin.table.LoopRowTableRenderPolicy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentoGeradoService documentoGeradoService;

    @Value("${app.templates.path}")
    private String templatesPath;

    @Value("${app.output.path}")
    private String outputPath;

    /**
     * Gera um documento Word a partir de um template e dados com registro no sistema
     */
    public File generateDocument(
            String tipoDocumento,
            String templateName,
            Map<String, Object> data,
            String outputFileName,
            boolean registrar) {

        try {
            // Garante que o diretório de saída existe
            Path outputDir = Paths.get(outputPath);
            if (!Files.exists(outputDir)) {
                Files.createDirectories(outputDir);
            }

            // Caminho do template
            String templatePath = templatesPath + File.separator + templateName;
            File templateFile = new File(templatePath);

            if (!templateFile.exists()) {
                throw new RuntimeException("Template não encontrado: " + templatePath);
            }

            // Configuração do POI-TL para tabelas dinâmicas
            ConfigureBuilder builder = Configure.builder();
            builder.bind("produtos", new LoopRowTableRenderPolicy());
            builder.bind("servicos", new LoopRowTableRenderPolicy());
            builder.bind("pragas", new LoopRowTableRenderPolicy());
            builder.bind("itens", new LoopRowTableRenderPolicy());
            Configure config = builder.build();

            // Gera o documento
            XWPFTemplate template = XWPFTemplate.compile(templateFile, config).render(data);

            // Define o nome do arquivo de saída
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String finalOutputFileName = outputFileName != null ? outputFileName :
                templateName.replace(".docx", "_" + timestamp + ".docx");

            File outputFile = new File(outputPath + File.separator + finalOutputFileName);

            // Salva o arquivo
            try (FileOutputStream out = new FileOutputStream(outputFile)) {
                template.write(out);
            }

            template.close();

            // Registra o documento no sistema se solicitado
            if (registrar) {
                String numeroDocumento = (String) data.getOrDefault("numeroOS",
                        data.getOrDefault("numeroRecibo",
                        data.getOrDefault("numeroOrcamento", "S/N")));

                String nomeCliente = (String) data.getOrDefault("nomeCliente", "");
                String cnpjCpf = (String) data.getOrDefault("cnpjCpf", "");

                documentoGeradoService.registrarDocumento(
                        tipoDocumento,
                        numeroDocumento,
                        outputFile,
                        nomeCliente,
                        cnpjCpf
                );

                log.info("Documento {} registrado no sistema", numeroDocumento);
            }

            log.info("Documento gerado com sucesso: {}", outputFile.getAbsolutePath());
            return outputFile;

        } catch (Exception e) {
            log.error("Erro ao gerar documento: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao gerar documento: " + e.getMessage(), e);
        }
    }

    /**
     * Gera Laudo Completo
     */
    public File gerarLaudoCompleto(Map<String, Object> data, boolean comAssinatura, boolean registrar) {
        String template = comAssinatura ? "Laudo Completo.docx" : "Laudo Completo (Sem Assinatura).docx";
        return generateDocument("LAUDO_COMPLETO", template, data, null, registrar);
    }

    /**
     * Gera Laudo de Dedetização
     */
    public File gerarLaudoDedetizacao(Map<String, Object> data, boolean comAssinatura, boolean registrar) {
        String template = comAssinatura ? "Laudo Dedetização.docx" : "Laudo DDT (Sem Assinatura).docx";
        return generateDocument("LAUDO_DEDETIZACAO", template, data, null, registrar);
    }

    /**
     * Gera Laudo de Caixa D'Água
     */
    public File gerarLaudoCaixaAgua(Map<String, Object> data, boolean comAssinatura, boolean registrar) {
        String template = comAssinatura ? "Laudo Caixa D'Água.docx" : "Laudo Caixa (Sem Assinatura).docx";
        return generateDocument("LAUDO_CAIXA_DAGUA", template, data, null, registrar);
    }

    /**
     * Gera Recibo
     */
    public File gerarRecibo(Map<String, Object> data, boolean registrar) {
        return generateDocument("RECIBO", "Recibo.docx", data, null, registrar);
    }

    /**
     * Gera Orçamento
     */
    public File gerarOrcamento(Map<String, Object> data, boolean registrar) {
        return generateDocument("ORCAMENTO", "Orçamento.docx", data, null, registrar);
    }
}
