package com.dedetizadora.service;

import com.dedetizadora.dto.LaudoCompletoDTO;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.io.File;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class DocumentServiceTest {

    @Autowired
    private DocumentService documentService;

    @Autowired
    private FormatadorService formatadorService;

    @Test
    void testGerarLaudoCompletoComDadosCompletos() {
        // Arrange
        Map<String, Object> data = criarDadosLaudoCompleto();

        // Act
        File resultado = documentService.gerarLaudoCompleto(data, false, false);

        // Assert
        assertNotNull(resultado);
        assertTrue(resultado.exists());
        assertTrue(resultado.length() > 0);

        System.out.println("Documento gerado: " + resultado.getAbsolutePath());
    }

    @Test
    void testGerarLaudoDedetizacao() {
        // Arrange
        Map<String, Object> data = criarDadosLaudoDedetizacao();

        // Act
        File resultado = documentService.gerarLaudoDedetizacao(data, false, false);

        // Assert
        assertNotNull(resultado);
        assertTrue(resultado.exists());

        System.out.println("Laudo de dedetização gerado: " + resultado.getAbsolutePath());
    }

    @Test
    void testGerarRecibo() {
        // Arrange
        Map<String, Object> data = criarDadosRecibo();

        // Act
        File resultado = documentService.gerarRecibo(data, false);

        // Assert
        assertNotNull(resultado);
        assertTrue(resultado.exists());

        System.out.println("Recibo gerado: " + resultado.getAbsolutePath());
    }

    @Test
    void testGerarOrcamento() {
        // Arrange
        Map<String, Object> data = criarDadosOrcamento();

        // Act
        File resultado = documentService.gerarOrcamento(data, false);

        // Assert
        assertNotNull(resultado);
        assertTrue(resultado.exists());

        System.out.println("Orçamento gerado: " + resultado.getAbsolutePath());
    }

    @Test
    void testFormatadorValorPorExtenso() {
        String extenso = formatadorService.valorPorExtenso(new BigDecimal("1234.56"));
        System.out.println("Valor por extenso: " + extenso);
        assertTrue(extenso.contains("mil"));
    }

    // Métodos auxiliares para criar dados de teste

    private Map<String, Object> criarDadosLaudoCompleto() {
        Map<String, Object> data = new HashMap<>();

        // Dados do Cliente
        data.put("nomeCliente", "Empresa Teste Ltda");
        data.put("cnpjCpf", formatadorService.formatarCNPJ("12345678000190"));
        data.put("enderecoCliente", "Rua das Flores, 123");
        data.put("bairroCliente", "Centro");
        data.put("cidadeCliente", "São Paulo - SP");
        data.put("cepCliente", formatadorService.formatarCEP("01234567"));
        data.put("telefoneCliente", formatadorService.formatarTelefone("11987654321"));
        data.put("emailCliente", "contato@teste.com");

        // Dados do Serviço
        data.put("numeroOS", "2024/0001");
        data.put("data", "12/01/2024");
        data.put("dataExtenso", "doze de janeiro de dois mil e vinte e quatro");
        data.put("horarioInicio", "08:00");
        data.put("horarioTermino", "12:00");
        data.put("tipoServico", "Dedetização Completa");
        data.put("responsavelTecnico", "João Silva");
        data.put("numeroRegistro", "CREA-SP 123456");

        // Descrição do Local
        data.put("tipoImovel", "Comercial");
        data.put("area", "500m²");
        data.put("pavimentos", "2");
        data.put("descricaoLocal", "Galpão industrial com área de escritórios");

        // Pragas
        data.put("pragas", Arrays.asList(
            Map.of("nome", "Baratas", "nivel", "Médio", "localizacao", "Cozinha e banheiros"),
            Map.of("nome", "Formigas", "nivel", "Baixo", "localizacao", "Área externa"),
            Map.of("nome", "Ratos", "nivel", "Baixo", "localizacao", "Depósito")
        ));

        // Produtos
        data.put("produtos", Arrays.asList(
            Map.of(
                "nome", "K-Othrine SC 250",
                "principioAtivo", "Deltametrina",
                "concentracao", "2,5%",
                "quantidade", "500ml",
                "registroAnvisa", "123456789",
                "classe", "II"
            ),
            Map.of(
                "nome", "Maxforce Gel",
                "principioAtivo", "Fipronil",
                "concentracao", "0,03%",
                "quantidade", "30g",
                "registroAnvisa", "987654321",
                "classe", "III"
            )
        ));

        // Metodologia
        data.put("metodologiaAplicacao", "Aplicação por pulverização em pontos estratégicos e aplicação de gel em frestas");
        data.put("equipamentosUtilizados", "Pulverizador costal de 20L, aplicador de gel");
        data.put("concentracao", "1:50 (produto:água)");
        data.put("volumeCalda", "10 litros");

        // Observações
        data.put("observacoes", "Área mantida livre de pessoas e animais durante todo o procedimento. Aplicação realizada em condições climáticas favoráveis.");
        data.put("recomendacoes", "Manter ambientes ventilados por no mínimo 2 horas após aplicação. Evitar limpeza com água nas áreas tratadas por 7 dias.");
        data.put("proximaVisita", "12/04/2024");

        // Garantia
        data.put("periodoGarantia", "90 dias");
        data.put("condicoesGarantia", "Garantia válida mediante cumprimento das recomendações técnicas e condições do contrato");

        // Assinatura
        data.put("nomeResponsavel", "João Silva");

        return data;
    }

    private Map<String, Object> criarDadosLaudoDedetizacao() {
        // Similar ao laudo completo, mas focado em dedetização
        return criarDadosLaudoCompleto();
    }

    private Map<String, Object> criarDadosRecibo() {
        Map<String, Object> data = new HashMap<>();

        data.put("numeroRecibo", "2024/0001");
        data.put("data", "12/01/2024");
        data.put("dataExtenso", "doze de janeiro de dois mil e vinte e quatro");

        data.put("nomeCliente", "Empresa Teste Ltda");
        data.put("cnpjCpf", formatadorService.formatarCNPJ("12345678000190"));
        data.put("enderecoCliente", "Rua das Flores, 123");
        data.put("cidadeCliente", "São Paulo - SP");

        BigDecimal valorTotal = new BigDecimal("1500.00");
        data.put("valorTotal", formatadorService.formatarMoeda(valorTotal));
        data.put("valorPorExtenso", formatadorService.valorPorExtenso(valorTotal));
        data.put("formaPagamento", "PIX");
        data.put("referente", "Serviço de dedetização conforme OS 2024/0001");

        data.put("servicos", Arrays.asList(
            Map.of(
                "descricao", "Dedetização de baratas e formigas",
                "quantidade", 1,
                "valorUnitario", new BigDecimal("1200.00"),
                "valorTotal", new BigDecimal("1200.00")
            ),
            Map.of(
                "descricao", "Desratização",
                "quantidade", 1,
                "valorUnitario", new BigDecimal("300.00"),
                "valorTotal", new BigDecimal("300.00")
            )
        ));

        data.put("nomeEmpresa", "Dedetizadora Teste Ltda");
        data.put("cnpjEmpresa", formatadorService.formatarCNPJ("98765432000111"));
        data.put("enderecoEmpresa", "Av. Principal, 456 - São Paulo - SP");

        return data;
    }

    private Map<String, Object> criarDadosOrcamento() {
        Map<String, Object> data = new HashMap<>();

        data.put("numeroOrcamento", "2024/0001");
        data.put("data", "12/01/2024");
        data.put("validade", "30 dias");

        data.put("nomeCliente", "Empresa Teste Ltda");
        data.put("cnpjCpf", formatadorService.formatarCNPJ("12345678000190"));
        data.put("enderecoCliente", "Rua das Flores, 123");
        data.put("cidadeCliente", "São Paulo - SP");
        data.put("telefone", formatadorService.formatarTelefone("11987654321"));
        data.put("email", "contato@teste.com");

        data.put("itens", Arrays.asList(
            Map.of(
                "item", 1,
                "descricao", "Dedetização de baratas e formigas (até 200m²)",
                "unidade", "Serviço",
                "quantidade", 1,
                "valorUnitario", new BigDecimal("800.00"),
                "valorTotal", new BigDecimal("800.00")
            ),
            Map.of(
                "item", 2,
                "descricao", "Desratização (até 200m²)",
                "unidade", "Serviço",
                "quantidade", 1,
                "valorUnitario", new BigDecimal("400.00"),
                "valorTotal", new BigDecimal("400.00")
            ),
            Map.of(
                "item", 3,
                "descricao", "Limpeza de caixa d'água (até 1000L)",
                "unidade", "Serviço",
                "quantidade", 2,
                "valorUnitario", new BigDecimal("250.00"),
                "valorTotal", new BigDecimal("500.00")
            )
        ));

        BigDecimal subtotal = new BigDecimal("1700.00");
        BigDecimal desconto = new BigDecimal("200.00");
        BigDecimal valorTotal = subtotal.subtract(desconto);

        data.put("subtotal", formatadorService.formatarMoeda(subtotal));
        data.put("desconto", formatadorService.formatarMoeda(desconto));
        data.put("valorTotal", formatadorService.formatarMoeda(valorTotal));
        data.put("valorTotalExtenso", formatadorService.valorPorExtenso(valorTotal));

        data.put("formaPagamento", "PIX, Cartão ou Boleto");
        data.put("condicoesPagamento", "50% na contratação, 50% após execução");
        data.put("prazoExecucao", "5 dias úteis após aprovação");
        data.put("garantia", "90 dias");

        data.put("observacoes", "Orçamento sujeito a alteração após vistoria técnica. Valores válidos para a data especificada.");

        data.put("nomeEmpresa", "Dedetizadora Teste Ltda");
        data.put("cnpjEmpresa", formatadorService.formatarCNPJ("98765432000111"));
        data.put("enderecoEmpresa", "Av. Principal, 456");
        data.put("telefoneEmpresa", formatadorService.formatarTelefone("1133334444"));
        data.put("emailEmpresa", "contato@dedetizadora.com");
        data.put("siteEmpresa", "www.dedetizadora.com");

        return data;
    }
}
