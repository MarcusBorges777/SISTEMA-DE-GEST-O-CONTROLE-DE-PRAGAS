package com.dedetizadora.service;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Serviço para formatação de valores para uso nos templates
 */
@Service
public class FormatadorService {

    private static final Locale LOCALE_BR = new Locale("pt", "BR");
    private static final NumberFormat CURRENCY_FORMAT = NumberFormat.getCurrencyInstance(LOCALE_BR);
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATE_EXTENSO_FORMAT = DateTimeFormatter.ofPattern("dd 'de' MMMM 'de' yyyy", LOCALE_BR);

    /**
     * Formata valor monetário para R$ 1.234,56
     */
    public String formatarMoeda(BigDecimal valor) {
        if (valor == null) {
            return "R$ 0,00";
        }
        return CURRENCY_FORMAT.format(valor);
    }

    /**
     * Converte valor por extenso
     * Ex: 1234.56 -> "um mil, duzentos e trinta e quatro reais e cinquenta e seis centavos"
     */
    public String valorPorExtenso(BigDecimal valor) {
        if (valor == null) {
            return "zero reais";
        }

        long parteInteira = valor.longValue();
        int centavos = valor.remainder(BigDecimal.ONE).multiply(new BigDecimal(100)).intValue();

        StringBuilder extenso = new StringBuilder();

        if (parteInteira == 0) {
            extenso.append("zero reais");
        } else {
            extenso.append(numeroPorExtenso(parteInteira));
            extenso.append(parteInteira == 1 ? " real" : " reais");
        }

        if (centavos > 0) {
            extenso.append(" e ");
            extenso.append(numeroPorExtenso(centavos));
            extenso.append(centavos == 1 ? " centavo" : " centavos");
        }

        return extenso.toString();
    }

    /**
     * Converte número para extenso (até 999.999)
     */
    private String numeroPorExtenso(long numero) {
        if (numero == 0) return "zero";

        String[] unidades = {"", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"};
        String[] dez_a_dezenove = {"dez", "onze", "doze", "treze", "quatorze", "quinze",
                                    "dezesseis", "dezessete", "dezoito", "dezenove"};
        String[] dezenas = {"", "", "vinte", "trinta", "quarenta", "cinquenta",
                            "sessenta", "setenta", "oitenta", "noventa"};
        String[] centenas = {"", "cento", "duzentos", "trezentos", "quatrocentos",
                             "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"};

        if (numero < 10) {
            return unidades[(int) numero];
        } else if (numero < 20) {
            return dez_a_dezenove[(int) numero - 10];
        } else if (numero < 100) {
            int d = (int) numero / 10;
            int u = (int) numero % 10;
            return dezenas[d] + (u > 0 ? " e " + unidades[u] : "");
        } else if (numero == 100) {
            return "cem";
        } else if (numero < 1000) {
            int c = (int) numero / 100;
            int resto = (int) numero % 100;
            return centenas[c] + (resto > 0 ? " e " + numeroPorExtenso(resto) : "");
        } else if (numero < 1000000) {
            int milhar = (int) numero / 1000;
            int resto = (int) numero % 1000;

            String milhares;
            if (milhar == 1) {
                milhares = "mil";
            } else {
                milhares = numeroPorExtenso(milhar) + " mil";
            }

            if (resto > 0) {
                if (resto < 100) {
                    return milhares + " e " + numeroPorExtenso(resto);
                } else {
                    return milhares + " " + numeroPorExtenso(resto);
                }
            }
            return milhares;
        }

        return String.valueOf(numero); // Fallback para números muito grandes
    }

    /**
     * Formata data para dd/MM/yyyy
     */
    public String formatarData(LocalDate data) {
        if (data == null) {
            return "";
        }
        return data.format(DATE_FORMAT);
    }

    /**
     * Formata data por extenso
     * Ex: 12 de janeiro de 2024
     */
    public String formatarDataExtenso(LocalDate data) {
        if (data == null) {
            return "";
        }
        return data.format(DATE_EXTENSO_FORMAT);
    }

    /**
     * Formata CNPJ: 12.345.678/0001-90
     */
    public String formatarCNPJ(String cnpj) {
        if (cnpj == null || cnpj.isEmpty()) {
            return "";
        }

        // Remove caracteres não numéricos
        String numeros = cnpj.replaceAll("[^0-9]", "");

        if (numeros.length() == 14) {
            return String.format("%s.%s.%s/%s-%s",
                    numeros.substring(0, 2),
                    numeros.substring(2, 5),
                    numeros.substring(5, 8),
                    numeros.substring(8, 12),
                    numeros.substring(12, 14));
        }

        return cnpj; // Retorna original se não tiver 14 dígitos
    }

    /**
     * Formata CPF: 123.456.789-10
     */
    public String formatarCPF(String cpf) {
        if (cpf == null || cpf.isEmpty()) {
            return "";
        }

        // Remove caracteres não numéricos
        String numeros = cpf.replaceAll("[^0-9]", "");

        if (numeros.length() == 11) {
            return String.format("%s.%s.%s-%s",
                    numeros.substring(0, 3),
                    numeros.substring(3, 6),
                    numeros.substring(6, 9),
                    numeros.substring(9, 11));
        }

        return cpf; // Retorna original se não tiver 11 dígitos
    }

    /**
     * Formata telefone: (11) 98765-4321
     */
    public String formatarTelefone(String telefone) {
        if (telefone == null || telefone.isEmpty()) {
            return "";
        }

        // Remove caracteres não numéricos
        String numeros = telefone.replaceAll("[^0-9]", "");

        // Celular (11 dígitos)
        if (numeros.length() == 11) {
            return String.format("(%s) %s-%s",
                    numeros.substring(0, 2),
                    numeros.substring(2, 7),
                    numeros.substring(7, 11));
        }
        // Fixo (10 dígitos)
        else if (numeros.length() == 10) {
            return String.format("(%s) %s-%s",
                    numeros.substring(0, 2),
                    numeros.substring(2, 6),
                    numeros.substring(6, 10));
        }

        return telefone; // Retorna original se não tiver formato padrão
    }

    /**
     * Formata CEP: 01234-567
     */
    public String formatarCEP(String cep) {
        if (cep == null || cep.isEmpty()) {
            return "";
        }

        // Remove caracteres não numéricos
        String numeros = cep.replaceAll("[^0-9]", "");

        if (numeros.length() == 8) {
            return String.format("%s-%s",
                    numeros.substring(0, 5),
                    numeros.substring(5, 8));
        }

        return cep; // Retorna original se não tiver 8 dígitos
    }

    /**
     * Formata número de OS com padding
     * Ex: 1 -> 2024/0001
     */
    public String formatarNumeroOS(int numero, int ano) {
        return String.format("%04d/%04d", ano, numero);
    }

    /**
     * Capitaliza primeira letra de cada palavra
     * Ex: "joão da silva" -> "João Da Silva"
     */
    public String capitalizarNome(String nome) {
        if (nome == null || nome.isEmpty()) {
            return "";
        }

        String[] palavras = nome.toLowerCase().split(" ");
        StringBuilder resultado = new StringBuilder();

        for (String palavra : palavras) {
            if (!palavra.isEmpty()) {
                resultado.append(Character.toUpperCase(palavra.charAt(0)))
                         .append(palavra.substring(1))
                         .append(" ");
            }
        }

        return resultado.toString().trim();
    }
}
