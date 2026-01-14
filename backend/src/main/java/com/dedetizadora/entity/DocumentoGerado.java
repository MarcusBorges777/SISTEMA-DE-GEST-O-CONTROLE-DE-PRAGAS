package com.dedetizadora.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "documentos_gerados")
public class DocumentoGerado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String tipoDocumento; // LAUDO_COMPLETO, LAUDO_DDT, RECIBO, etc.

    @Column(nullable = false, length = 50)
    private String numeroDocumento; // Ex: 2024/0001

    @Column(nullable = false)
    private String caminhoArquivo; // Caminho completo do arquivo gerado

    @Column(nullable = false, length = 200)
    private String nomeCliente;

    @Column(length = 20)
    private String cnpjCpf;

    @Column(nullable = false)
    private LocalDateTime dataGeracao;

    @Column(length = 100)
    private String geradoPor; // Usuário que gerou (futuro)

    @Column(name = "versao", nullable = false)
    private Integer versao = 1;

    @Column(name = "documento_pai_id")
    private Long documentoPaiId; // Referência ao documento original (se for uma revisão)

    @Column(columnDefinition = "TEXT")
    private String observacoes;

    @Column(length = 50)
    private String status; // ATIVO, CANCELADO, SUBSTITUIDO

    @PrePersist
    protected void onCreate() {
        dataGeracao = LocalDateTime.now();
        if (status == null) {
            status = "ATIVO";
        }
    }
}
