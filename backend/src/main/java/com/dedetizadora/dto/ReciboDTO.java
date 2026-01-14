package com.dedetizadora.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class ReciboDTO {
    private String numeroRecibo;
    private String data;
    private String dataExtenso;

    // Dados do Cliente
    private String nomeCliente;
    private String cnpjCpf;
    private String enderecoCliente;
    private String cidadeCliente;

    // Dados do Pagamento
    private BigDecimal valorTotal;
    private String valorPorExtenso;
    private String formaPagamento;
    private String referente;

    // Serviços
    private List<ServicoDTO> servicos;

    // Dados da Empresa
    private String nomeEmpresa;
    private String cnpjEmpresa;
    private String enderecoEmpresa;

    @Data
    public static class ServicoDTO {
        private String descricao;
        private Integer quantidade;
        private BigDecimal valorUnitario;
        private BigDecimal valorTotal;
    }
}
