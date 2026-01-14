package com.dedetizadora.dto;

import lombok.Data;
import java.util.List;

@Data
public class LaudoCompletoDTO {
    // Dados do Cliente
    private String nomeCliente;
    private String cnpjCpf;
    private String enderecoCliente;
    private String bairroCliente;
    private String cidadeCliente;
    private String cepCliente;
    private String telefoneCliente;
    private String emailCliente;

    // Dados do Serviço
    private String numeroOS;
    private String data;
    private String dataExtenso;
    private String horarioInicio;
    private String horarioTermino;
    private String tipoServico;
    private String responsavelTecnico;
    private String numeroRegistro;

    // Descrição do Local
    private String tipoImovel;
    private String area;
    private String pavimentos;
    private String descricaoLocal;

    // Pragas Controladas
    private List<PragaDTO> pragas;

    // Produtos Utilizados
    private List<ProdutoDTO> produtos;

    // Metodologia
    private String metodologiaAplicacao;
    private String equipamentosUtilizados;
    private String concentracao;
    private String volumeCalda;

    // Observações
    private String observacoes;
    private String recomendacoes;
    private String proximaVisita;

    // Garantia
    private String periodoGarantia;
    private String condicoesGarantia;

    // Assinatura
    private String nomeResponsavel;
    private String assinaturaPath;
    private String carimboPath;

    @Data
    public static class PragaDTO {
        private String nome;
        private String nivel; // Baixo, Médio, Alto
        private String localizacao;
    }

    @Data
    public static class ProdutoDTO {
        private String nome;
        private String principioAtivo;
        private String concentracao;
        private String quantidade;
        private String registroAnvisa;
        private String classe;
    }
}
