package com.dedetizadora.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class OrcamentoDTO {
    private String numeroOrcamento;
    private String data;
    private String validade;

    // Dados do Cliente
    private String nomeCliente;
    private String cnpjCpf;
    private String enderecoCliente;
    private String cidadeCliente;
    private String telefone;
    private String email;

    // Itens do Orçamento
    private List<ItemOrcamentoDTO> itens;

    // Valores
    private BigDecimal subtotal;
    private BigDecimal desconto;
    private BigDecimal valorTotal;
    private String valorTotalExtenso;

    // Condições
    private String formaPagamento;
    private String condicoesPagamento;
    private String prazoExecucao;
    private String garantia;

    // Observações
    private String observacoes;

    // Dados da Empresa
    private String nomeEmpresa;
    private String cnpjEmpresa;
    private String enderecoEmpresa;
    private String telefoneEmpresa;
    private String emailEmpresa;
    private String siteEmpresa;

    @Data
    public static class ItemOrcamentoDTO {
        private Integer item;
        private String descricao;
        private String unidade;
        private Integer quantidade;
        private BigDecimal valorUnitario;
        private BigDecimal valorTotal;
    }
}
