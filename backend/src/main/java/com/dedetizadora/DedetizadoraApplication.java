package com.dedetizadora;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DedetizadoraApplication {
    public static void main(String[] args) {
        SpringApplication.run(DedetizadoraApplication.class, args);
        System.out.println("========================================");
        System.out.println("Sistema de Documentos iniciado!");
        System.out.println("API: http://localhost:8080/api");
        System.out.println("H2 Console: http://localhost:8080/api/h2-console");
        System.out.println("========================================");
    }
}
