#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Blueprint de Prospecção - Módulo Econodata
Sistema de filtros estratégicos para encontrar leads ideais
"""

from flask import Blueprint, jsonify, request
import sqlite3
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import re

prospeccao_bp = Blueprint('prospeccao', __name__, url_prefix='/api/prospeccao')

# Caminho para o banco de dados da Receita Federal
BASE_DIR = Path(__file__).parent.parent
CNPJ_DB_PATH = BASE_DIR / 'cnpj_filtrado.db'

# CNAEs Estratégicos - Obrigados pela ANVISA
CNAES_OURO = {
    'alimentacao': {
        'titulo': '🥗 Alimentação',
        'descricao': 'Restaurantes, Padarias, Lanchonetes, Bares, Supermercados',
        'cnaes': [
            # Serviços de Alimentação
            '5611-2/01',  # Restaurantes e similares
            '5611-2/03',  # Lanchonetes, casas de chá, de sucos
            '5611-2/04',  # Bares e outros estabelecimentos especializados em servir bebidas
            '5611-2/05',  # Bares e outros estabelecimentos especializados em servir bebidas, sem entretenimento
            '5620-1/01',  # Fornecimento de alimentos preparados preponderantemente para empresas
            '5620-1/02',  # Serviços de alimentação para eventos e recepções - bufê
            '5620-1/03',  # Cantinas - serviços de alimentação privativos
            '5620-1/04',  # Fornecimento de alimentos preparados preponderantemente para consumo domiciliar
            '5612-1/00',  # Serviços ambulantes de alimentação
            # Fabricação e Comércio de Alimentos
            '1091-1/01',  # Fabricação de produtos de panificação industrial
            '1091-1/02',  # Fabricação de produtos de padaria e confeitaria com predominância de produção própria
            '4721-1/01',  # Padaria e confeitaria com predominância de produção própria
            '4721-1/02',  # Padaria e confeitaria com predominância de revenda
            '1012-1/01',  # Abate de aves
            '1012-1/02',  # Abate de pequenos animais
            '1013-9/01',  # Fabricação de produtos de carne
            '1031-7/00',  # Fabricação de conservas de frutas
            # Supermercados e Minimercados
            '4711-3/01',  # Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - hipermercados
            '4711-3/02',  # Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - minimercados, mercearias e armazéns
            '4712-1/00',  # Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - supermercados
            '4722-9/01',  # Comércio varejista de carnes - açougues
            '4722-9/02',  # Peixaria
            '4723-7/00',  # Comércio varejista de bebidas
            '4724-5/00',  # Comércio varejista de hortifrutigranjeiros
            '4729-6/01',  # Tabacaria
            '4729-6/02',  # Comércio varejista de mercadorias em lojas de conveniência
            '4729-6/99',  # Comércio varejista de produtos alimentícios em geral ou especializado em produtos alimentícios não especificados anteriormente
            # Atacadistas de Alimentos
            '4632-0/01',  # Comércio atacadista de cereais e leguminosas beneficiados
            '4632-0/02',  # Comércio atacadista de farinhas, amidos e féculas
            '4633-8/01',  # Comércio atacadista de frutas, verduras, raízes, tubérculos, hortaliças e legumes frescos
            '4634-6/01',  # Comércio atacadista de carnes bovinas e suínas e derivados
            '4634-6/02',  # Comércio atacadista de aves abatidas e derivados
            '4634-6/03',  # Comércio atacadista de pescados e frutos do mar
            '4635-4/01',  # Comércio atacadista de água mineral
            '4635-4/02',  # Comércio atacadista de cerveja, chope e refrigerante
            '4637-1/01',  # Comércio atacadista de café torrado, moído e solúvel
            '4637-1/02',  # Comércio atacadista de açúcar
            '4637-1/03',  # Comércio atacadista de óleos e gorduras
            '4637-1/04',  # Comércio atacadista de pães, bolos, biscoitos e similares
            '4637-1/05',  # Comércio atacadista de massas alimentícias
            '4637-1/06',  # Comércio atacadista de sorvetes
            '4637-1/07',  # Comércio atacadista de chocolates, confeitos, balas, bombons e semelhantes
            '4639-7/01',  # Comércio atacadista de produtos alimentícios em geral
        ],
        'ticket_medio': 'R$ 500-1.500/mês',
        'tipo_contrato': 'Mensal',
        'prioridade': 1
    },
    'saude': {
        'titulo': '🏥 Saúde',
        'descricao': 'Hospitais, Clínicas, Consultórios, Farmácias, Laboratórios',
        'cnaes': [
            # Hospitais e Atendimento de Urgência
            '8610-1/01',  # Atividades de atendimento hospitalar, exceto pronto-socorro e unidades para atendimento a urgências
            '8610-1/02',  # Atividades de atendimento em pronto-socorro e unidades hospitalares para atendimento a urgências
            '8621-6/01',  # UTI móvel
            '8621-6/02',  # Serviços móveis de atendimento a urgências, exceto por UTI móvel
            '8622-4/00',  # Serviços de remoção de pacientes, exceto os serviços móveis de atendimento a urgências
            # Clínicas e Consultórios
            '8630-5/01',  # Atividade médica ambulatorial com recursos para realização de procedimentos cirúrgicos
            '8630-5/02',  # Atividade médica ambulatorial com recursos para realização de exames complementares
            '8630-5/03',  # Atividade médica ambulatorial restrita a consultas
            '8630-5/04',  # Atividade odontológica
            '8630-5/05',  # Atividades de psicologia e psicanálise
            '8630-5/06',  # Atividades de fisioterapia
            '8630-5/07',  # Atividades de terapia ocupacional
            '8630-5/08',  # Atividades de fonoaudiologia
            '8630-5/09',  # Atividades de terapia de nutrição enteral e parenteral
            '8630-5/99',  # Atividades de atenção ambulatorial não especificadas anteriormente
            # Laboratórios e Diagnósticos
            '8640-2/01',  # Laboratórios de análises clínicas
            '8640-2/02',  # Laboratórios clínicos
            '8640-2/03',  # Serviços de diálise e nefrologia
            '8640-2/04',  # Serviços de tomografia
            '8640-2/05',  # Serviços de diagnóstico por imagem com uso de radiação ionizante, exceto tomografia
            '8640-2/06',  # Serviços de ressonância magnética
            '8640-2/07',  # Serviços de diagnóstico por imagem sem uso de radiação ionizante, exceto ressonância magnética
            '8640-2/08',  # Serviços de diagnóstico por registro gráfico - ECG, EEG e outros exames análogos
            '8640-2/09',  # Serviços de diagnóstico por métodos ópticos - endoscopia e outros exames análogos
            '8640-2/10',  # Serviços de quimioterapia
            '8640-2/11',  # Serviços de radioterapia
            '8640-2/12',  # Serviços de hemoterapia
            '8640-2/13',  # Serviços de litotripsia
            '8640-2/14',  # Serviços de bancos de células e tecidos humanos
            '8640-2/99',  # Atividades de serviços de complementação diagnóstica e terapêutica não especificadas anteriormente
            # Profissionais de Saúde
            '8650-0/01',  # Atividades de enfermagem
            '8650-0/02',  # Atividades de profissionais da nutrição
            '8650-0/03',  # Atividades de psicologia e psicanálise
            '8650-0/04',  # Atividades de fisioterapia
            '8650-0/05',  # Atividades de terapia ocupacional
            '8650-0/06',  # Atividades de fonoaudiologia
            '8650-0/07',  # Atividades de terapia de nutrição enteral e parenteral
            '8650-0/99',  # Atividades de profissionais da área de saúde não especificadas anteriormente
            '8660-7/00',  # Atividades de apoio à gestão de saúde
            '8690-9/01',  # Atividades de práticas integrativas e complementares em saúde humana
            '8690-9/02',  # Atividades de banco de leite humano
            '8690-9/99',  # Outras atividades de atenção à saúde humana não especificadas anteriormente
            # Farmácias e Comércio de Produtos de Saúde
            '4771-7/01',  # Comércio varejista de produtos farmacêuticos, sem manipulação de fórmulas
            '4771-7/02',  # Comércio varejista de produtos farmacêuticos, com manipulação de fórmulas
            '4771-7/03',  # Comércio varejista de produtos farmacêuticos homeopáticos
            '4771-7/04',  # Comércio varejista de medicamentos veterinários
            '4773-3/00',  # Comércio varejista de artigos médicos e ortopédicos
            '4774-1/00',  # Comércio varejista de artigos de óptica
        ],
        'ticket_medio': 'R$ 800-3.000/mês',
        'tipo_contrato': 'Mensal',
        'prioridade': 1
    },
    'condominios': {
        'titulo': '🏢 Condomínios',
        'descricao': 'Síndicos, Administradoras, Imobiliárias',
        'cnaes': [
            '8112-5/00',  # Condomínios prediais
            '6822-6/00',  # Gestão e administração da propriedade imobiliária
            '6821-8/01',  # Corretagem na compra e venda e avaliação de imóveis
            '6821-8/02',  # Corretagem no aluguel de imóveis
            '6810-2/01',  # Compra e venda de imóveis próprios
            '6810-2/02',  # Aluguel de imóveis próprios
            '6822-6/01',  # Gestão e administração da propriedade imobiliária
            '6822-6/02',  # Intermediação na compra, venda e aluguel de imóveis
            '8130-3/00',  # Atividades paisagísticas
            '4330-4/05',  # Aplicação de revestimentos e de resinas em interiores e exteriores
        ],
        'ticket_medio': 'R$ 1.500-5.000/mês',
        'tipo_contrato': 'Mensal ou Anual',
        'prioridade': 2
    },
    'hoteis': {
        'titulo': '🏨 Hotéis e Hospedagem',
        'descricao': 'Hotéis, Pousadas, Motéis, Albergues, Campings',
        'cnaes': [
            '5510-8/01',  # Hotéis
            '5510-8/02',  # Apart-hotéis
            '5510-8/03',  # Motéis
            '5590-6/01',  # Albergues, exceto assistenciais
            '5590-6/02',  # Campings
            '5590-6/03',  # Pensões (alojamento)
            '5590-6/99',  # Outros alojamentos não especificados anteriormente
        ],
        'ticket_medio': 'R$ 1.000-3.000/mês',
        'tipo_contrato': 'Mensal',
        'prioridade': 2
    },
    'industria': {
        'titulo': '🏭 Indústrias',
        'descricao': 'Fábricas, Indústrias Alimentícias, Armazéns, Depósitos',
        'cnaes': [
            # Frigoríficos e Abate
            '1011-2/01',  # Frigorífico - abate de bovinos
            '1011-2/02',  # Frigorífico - abate de eqüinos
            '1011-2/03',  # Frigorífico - abate de ovinos e caprinos
            '1012-1/01',  # Abate de aves
            '1012-1/02',  # Abate de pequenos animais
            '1012-1/03',  # Frigorífico - abate de suínos
            '1013-9/01',  # Fabricação de produtos de carne
            '1013-9/02',  # Preparação de subprodutos do abate
            # Conservas e Processamento
            '1020-1/01',  # Preservação de peixes, crustáceos e moluscos
            '1020-1/02',  # Fabricação de conservas de peixes, crustáceos e moluscos
            '1031-7/00',  # Fabricação de conservas de frutas
            '1032-5/01',  # Fabricação de conservas de palmito
            '1032-5/99',  # Fabricação de conservas de legumes e outros vegetais, exceto palmito
            '1033-3/01',  # Fabricação de sucos concentrados de frutas, hortaliças e legumes
            '1033-3/02',  # Fabricação de sucos de frutas, hortaliças e legumes, exceto concentrados
            # Óleos e Gorduras
            '1041-4/00',  # Fabricação de óleos vegetais em bruto, exceto óleo de milho
            '1042-2/00',  # Fabricação de óleos vegetais refinados, exceto óleo de milho
            '1043-1/00',  # Fabricação de margarina e outras gorduras vegetais e de óleos não-comestíveis de animais
            # Laticínios
            '1051-1/00',  # Preparação do leite
            '1052-0/00',  # Fabricação de laticínios
            '1053-8/00',  # Fabricação de sorvetes e outros gelados comestíveis
            # Moagem e Beneficiamento
            '1061-9/01',  # Beneficiamento de arroz
            '1061-9/02',  # Fabricação de produtos do arroz
            '1062-7/00',  # Moagem de trigo e fabricação de derivados
            '1063-5/00',  # Fabricação de farinha de mandioca e derivados
            '1064-3/00',  # Fabricação de farinha de milho e derivados, exceto óleos de milho
            '1065-1/01',  # Fabricação de amidos e féculas de vegetais
            '1066-0/00',  # Fabricação de alimentos para animais
            '1069-4/00',  # Moagem e fabricação de produtos de origem vegetal não especificados anteriormente
            # Açúcar e Café
            '1071-6/00',  # Fabricação de açúcar em bruto
            '1072-4/01',  # Fabricação de açúcar de cana refinado
            '1072-4/02',  # Fabricação de açúcar de cereais (dextrose) e de beterraba
            '1081-3/01',  # Beneficiamento de café
            '1081-3/02',  # Torrefação e moagem de café
            '1082-1/00',  # Fabricação de produtos à base de café
            # Panificação e Confeitaria
            '1091-1/01',  # Fabricação de produtos de panificação industrial
            '1091-1/02',  # Fabricação de produtos de padaria e confeitaria com predominância de produção própria
            '1092-9/00',  # Fabricação de biscoitos e bolachas
            '1093-7/01',  # Fabricação de produtos derivados do cacau e de chocolates
            '1093-7/02',  # Fabricação de frutas cristalizadas, balas e semelhantes
            '1094-5/00',  # Fabricação de massas alimentícias
            '1095-3/00',  # Fabricação de especiarias, molhos, temperos e condimentos
            '1096-1/00',  # Fabricação de alimentos e pratos prontos
            '1099-6/01',  # Fabricação de vinagres
            '1099-6/02',  # Fabricação de pós alimentícios
            '1099-6/03',  # Fabricação de fermentos e leveduras
            '1099-6/04',  # Fabricação de gelo comum
            '1099-6/05',  # Fabricação de produtos para infusão (chá, mate, etc.)
            '1099-6/06',  # Fabricação de adoçantes naturais e artificiais
            '1099-6/07',  # Fabricação de alimentos dietéticos e complementos alimentares
            '1099-6/99',  # Fabricação de outros produtos alimentícios não especificados anteriormente
            # Armazéns e Depósitos
            '5211-7/01',  # Armazéns gerais - emissão de warrant
            '5211-7/99',  # Depósitos de mercadorias para terceiros, exceto armazéns gerais e guarda-móveis
            '5212-5/00',  # Carga e descarga
        ],
        'ticket_medio': 'R$ 1.500-8.000/mês',
        'tipo_contrato': 'Mensal',
        'prioridade': 2
    },
    'comercio': {
        'titulo': '🛒 Comércio',
        'descricao': 'Lojas, Supermercados, Atacadistas, Distribuidoras, Shopping Centers',
        'cnaes': [
            # Supermercados e Hipermercados
            '4711-3/01',  # Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - hipermercados
            '4711-3/02',  # Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - minimercados, mercearias e armazéns
            '4712-1/00',  # Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - supermercados
            '4713-0/01',  # Lojas de departamentos ou magazines
            '4713-0/02',  # Lojas de variedades, exceto lojas de departamentos ou magazines
            '4713-0/03',  # Lojas duty free de aeroportos internacionais
            # Lojas Especializadas
            '4741-5/00',  # Comércio varejista de tintas e materiais para pintura
            '4742-3/00',  # Comércio varejista de material elétrico
            '4743-1/00',  # Comércio varejista de vidros
            '4744-0/01',  # Comércio varejista de ferragens e ferramentas
            '4744-0/02',  # Comércio varejista de madeira e artefatos
            '4744-0/03',  # Comércio varejista de materiais hidráulicos
            '4744-0/04',  # Comércio varejista de cal, areia, pedra britada, tijolos e telhas
            '4744-0/05',  # Comércio varejista de materiais de construção não especificados anteriormente
            '4751-2/01',  # Comércio varejista especializado de equipamentos e suprimentos de informática
            '4752-1/00',  # Comércio varejista especializado de equipamentos de telefonia e comunicação
            '4753-9/00',  # Comércio varejista especializado de eletrodomésticos e equipamentos de áudio e vídeo
            '4754-7/01',  # Comércio varejista de móveis
            '4754-7/02',  # Comércio varejista de artigos de colchoaria
            '4754-7/03',  # Comércio varejista de artigos de iluminação
            '4755-5/01',  # Comércio varejista de tecidos
            '4755-5/02',  # Comercio varejista de artigos de armarinho
            '4755-5/03',  # Comercio varejista de artigos de cama, mesa e banho
            '4756-3/00',  # Comércio varejista especializado de instrumentos musicais e acessórios
            '4757-1/00',  # Comércio varejista especializado de peças e acessórios para aparelhos eletroeletrônicos para uso doméstico
            '4759-8/01',  # Comércio varejista de artigos de tapeçaria, cortinas e persianas
            '4759-8/99',  # Comércio varejista de outros artigos de uso doméstico não especificados anteriormente
            '4761-0/01',  # Comércio varejista de livros
            '4761-0/02',  # Comércio varejista de jornais e revistas
            '4761-0/03',  # Comércio varejista de artigos de papelaria
            '4762-8/00',  # Comércio varejista de discos, CDs, DVDs e fitas
            '4763-6/01',  # Comércio varejista de brinquedos e artigos recreativos
            '4763-6/02',  # Comércio varejista de artigos esportivos
            '4763-6/03',  # Comércio varejista de bicicletas e triciclos; peças e acessórios
            '4772-5/00',  # Comércio varejista de cosméticos, produtos de perfumaria e de higiene pessoal
            '4781-4/00',  # Comércio varejista de artigos do vestuário e acessórios
            '4782-2/01',  # Comércio varejista de calçados
            '4782-2/02',  # Comércio varejista de artigos de viagem
            '4783-1/01',  # Comércio varejista de artigos de joalheria
            '4783-1/02',  # Comércio varejista de artigos de relojoaria
            '4784-9/00',  # Comércio varejista de gás liqüefeito de petróleo (GLP)
            '4785-7/01',  # Comércio varejista de antiguidades
            '4785-7/99',  # Comércio varejista de outros artigos usados
            '4789-0/01',  # Comércio varejista de suvenires, bijuterias e artesanatos
            '4789-0/02',  # Comércio varejista de plantas e flores naturais
            '4789-0/03',  # Comércio varejista de objetos de arte
            '4789-0/04',  # Comércio varejista de animais vivos e de artigos e alimentos para animais de estimação
            '4789-0/05',  # Comércio varejista de produtos saneantes domissanitários
            '4789-0/06',  # Comércio varejista de fogos de artifício e artigos pirotécnicos
            '4789-0/07',  # Comércio varejista de equipamentos para escritório
            '4789-0/08',  # Comércio varejista de artigos fotográficos e para filmagem
            '4789-0/09',  # Comércio varejista de armas e munições
            '4789-0/99',  # Comércio varejista de outros produtos não especificados anteriormente
            # Comércio Atacadista
            '4632-0/01',  # Comércio atacadista de cereais e leguminosas beneficiados
            '4632-0/02',  # Comércio atacadista de farinhas, amidos e féculas
            '4633-8/01',  # Comércio atacadista de frutas, verduras, raízes, tubérculos, hortaliças e legumes frescos
            '4634-6/01',  # Comércio atacadista de carnes bovinas e suínas e derivados
            '4634-6/02',  # Comércio atacadista de aves abatidas e derivados
            '4634-6/03',  # Comércio atacadista de pescados e frutos do mar
            '4635-4/01',  # Comércio atacadista de água mineral
            '4635-4/02',  # Comércio atacadista de cerveja, chope e refrigerante
            '4637-1/01',  # Comércio atacadista de café torrado, moído e solúvel
            '4637-1/02',  # Comércio atacadista de açúcar
            '4637-1/03',  # Comércio atacadista de óleos e gorduras
            '4637-1/04',  # Comércio atacadista de pães, bolos, biscoitos e similares
            '4637-1/05',  # Comércio atacadista de massas alimentícias
            '4637-1/06',  # Comércio atacadista de sorvetes
            '4637-1/07',  # Comércio atacadista de chocolates, confeitos, balas, bombons e semelhantes
            '4639-7/01',  # Comércio atacadista de produtos alimentícios em geral
            '4639-7/02',  # Comércio atacadista de produtos alimentícios em geral, com atividade de fracionamento e acondicionamento associada
            # Shopping Centers
            '6810-2/03',  # Loteamento de imóveis próprios
            '4120-4/00',  # Construção de edifícios
        ],
        'ticket_medio': 'R$ 500-2.000/mês',
        'tipo_contrato': 'Mensal',
        'prioridade': 3
    },
    'estetica': {
        'titulo': '💅 Estética e Beleza',
        'descricao': 'Salões, Clínicas de Estética, SPAs, Barbearias',
        'cnaes': [
            '9602-5/01',  # Cabeleireiros, manicure e pedicure
            '9602-5/02',  # Atividades de estética e outros serviços de cuidados com a beleza
            '9602-5/03',  # Atividades de tatuagem e colocação de piercing
            '8690-9/01',  # Atividades de práticas integrativas e complementares em saúde humana
            '4772-5/00',  # Comércio varejista de cosméticos, produtos de perfumaria e de higiene pessoal
            '9603-3/04',  # Serviços de funerárias
            '9603-3/05',  # Serviços de somatoconservação
        ],
        'ticket_medio': 'R$ 400-1.200/mês',
        'tipo_contrato': 'Mensal',
        'prioridade': 3
    },
    'veterinaria': {
        'titulo': '🐾 Veterinária',
        'descricao': 'Clínicas Veterinárias, Pet Shops, Banho e Tosa',
        'cnaes': [
            '7500-1/00',  # Atividades veterinárias
            '9609-2/02',  # Alojamento de animais domésticos
            '9609-2/08',  # Higiene e embelezamento de animais domésticos
            '4789-0/04',  # Comércio varejista de animais vivos e de artigos e alimentos para animais de estimação
            '4771-7/04',  # Comércio varejista de medicamentos veterinários
            '0159-8/02',  # Criação de animais de estimação
            '4623-1/07',  # Comércio atacadista de alimentos para animais
            '1066-0/00',  # Fabricação de alimentos para animais
        ],
        'ticket_medio': 'R$ 600-2.000/mês',
        'tipo_contrato': 'Mensal',
        'prioridade': 2
    },
    'educacao': {
        'titulo': '📚 Educação',
        'descricao': 'Escolas, Creches, Berçários, Universidades, Cursos',
        'cnaes': [
            # Educação Infantil, Fundamental e Médio
            '8511-2/00',  # Educação infantil - creche
            '8512-1/00',  # Educação infantil - pré-escola
            '8513-9/00',  # Ensino fundamental
            '8520-1/00',  # Ensino médio
            # Educação Superior
            '8531-7/00',  # Educação superior - graduação
            '8532-5/00',  # Educação superior - graduação e pós-graduação
            '8533-3/00',  # Educação superior - pós-graduação e extensão
            # Educação Profissional
            '8541-4/00',  # Educação profissional de nível técnico
            '8542-2/00',  # Educação profissional de nível tecnológico
            '8550-3/01',  # Administração de caixas escolares
            '8550-3/02',  # Atividades de apoio à educação, exceto caixas escolares
            # Ensinos Especializados
            '8591-1/00',  # Ensino de esportes
            '8592-9/01',  # Ensino de dança
            '8592-9/02',  # Ensino de artes cênicas, exceto dança
            '8592-9/03',  # Ensino de música
            '8592-9/99',  # Ensino de arte e cultura não especificado anteriormente
            '8593-7/00',  # Ensino de idiomas
            '8599-6/01',  # Formação de condutores
            '8599-6/02',  # Cursos de pilotagem
            '8599-6/03',  # Treinamento em informática
            '8599-6/04',  # Treinamento em desenvolvimento profissional e gerencial
            '8599-6/05',  # Cursos preparatórios para concursos
            '8599-6/99',  # Outras atividades de ensino não especificadas anteriormente
        ],
        'ticket_medio': 'R$ 1.000-4.000/mês',
        'tipo_contrato': 'Mensal ou Anual',
        'prioridade': 2
    },
    'escritorios': {
        'titulo': '💼 Escritórios',
        'descricao': 'Advocacia, Contabilidade, Consultoria, Engenharia, Arquitetura',
        'cnaes': [
            # Advocacia e Serviços Jurídicos
            '6911-7/01',  # Serviços advocatícios
            '6911-7/02',  # Atividades auxiliares da justiça
            '6911-7/03',  # Agente de propriedade industrial
            '6912-5/00',  # Cartórios
            # Contabilidade e Auditoria
            '6920-6/01',  # Atividades de contabilidade
            '6920-6/02',  # Atividades de consultoria e auditoria contábil e tributária
            # Consultoria e Gestão
            '7020-4/00',  # Atividades de consultoria em gestão empresarial, exceto consultoria técnica específica
            # Arquitetura e Engenharia
            '7111-1/00',  # Serviços de arquitetura
            '7112-0/00',  # Serviços de engenharia
            '7119-7/01',  # Serviços de cartografia, topografia e geodésia
            '7119-7/02',  # Atividades de estudos geológicos
            '7119-7/03',  # Serviços de desenho técnico relacionados à arquitetura e engenharia
            '7119-7/04',  # Serviços de perícia técnica relacionados à segurança do trabalho
            '7119-7/99',  # Atividades técnicas relacionadas à engenharia e arquitetura não especificadas anteriormente
            # Corretagem e Intermediação Financeira
            '6612-6/01',  # Corretores e agentes de seguros, de planos de previdência complementar e de saúde
            '6612-6/02',  # Corretores e agentes de títulos e valores mobiliários
            '6612-6/03',  # Corretoras de câmbio
            '6612-6/04',  # Corretoras de contratos de mercadorias
            '6612-6/05',  # Agentes de investimentos em aplicações financeiras
            '6619-3/01',  # Serviços de liquidação e custódia
            '6619-3/02',  # Correspondentes de instituições financeiras
            '6619-3/03',  # Representações de bancos estrangeiros
            '6619-3/04',  # Caixas eletrônicos
            '6619-3/05',  # Operadoras de cartões de débito
            '6619-3/06',  # Operadoras de cartões de crédito
            '6619-3/99',  # Outras atividades auxiliares dos serviços financeiros não especificadas anteriormente
        ],
        'ticket_medio': 'R$ 400-1.500/mês',
        'tipo_contrato': 'Mensal',
        'prioridade': 3
    },
    'academias': {
        'titulo': '💪 Academias e Esportes',
        'descricao': 'Academias, Clubes, Centros Esportivos, Parques Temáticos',
        'cnaes': [
            '9312-3/00',  # Clubes sociais, esportivos e similares
            '9313-1/00',  # Atividades de condicionamento físico
            '9319-1/01',  # Produção e promoção de eventos esportivos
            '9319-1/99',  # Outras atividades esportivas não especificadas anteriormente
            '9321-2/00',  # Parques de diversão e parques temáticos
            '9329-8/01',  # Discotecas, danceterias, salões de dança e similares
            '9329-8/02',  # Exploração de boliches
            '9329-8/03',  # Exploração de jogos de sinuca, bilhar e similares
            '9329-8/04',  # Exploração de jogos eletrônicos recreativos
            '9329-8/99',  # Outras atividades de recreação e lazer não especificadas anteriormente
        ],
        'ticket_medio': 'R$ 600-2.500/mês',
        'tipo_contrato': 'Mensal',
        'prioridade': 3
    }
}


def get_db_connection():
    """Conexão otimizada com o banco de CNPJs"""
    conn = sqlite3.connect(str(CNPJ_DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def limpar_cnpj(cnpj: str) -> str:
    """Remove caracteres não numéricos do CNPJ"""
    return re.sub(r'\D', '', cnpj)


def cnae_para_banco(cnae: str) -> str:
    """Converte CNAE do formato com barra/ponto (56.11-2/01 ou 5611-2/01) para sem formatação (5611201)"""
    return cnae.replace('.', '').replace('-', '').replace('/', '')


def formatar_cnpj(cnpj: str) -> str:
    """Formata CNPJ para XX.XXX.XXX/XXXX-XX"""
    cnpj = limpar_cnpj(cnpj)
    if len(cnpj) == 14:
        return f"{cnpj[:2]}.{cnpj[2:5]}.{cnpj[5:8]}/{cnpj[8:12]}-{cnpj[12:]}"
    return cnpj


def calcular_dias_desde_abertura(data_inicio: str) -> Optional[int]:
    """Calcula quantos dias desde a abertura da empresa"""
    if not data_inicio:
        return None

    try:
        # Data vem no formato YYYYMMDD
        data = datetime.strptime(data_inicio, '%Y%m%d')
        hoje = datetime.now()
        return (hoje - data).days
    except (ValueError, TypeError):
        return None


@prospeccao_bp.route('/segmentos', methods=['GET'])
def listar_segmentos():
    """Lista todos os segmentos estratégicos disponíveis"""

    segmentos = []
    conn = get_db_connection()
    cursor = conn.cursor()

    for segmento_id, config in CNAES_OURO.items():
        # Conta quantas empresas ativas existem nesse segmento
        # Converte CNAEs para o formato do banco (sem barra)
        cnaes_convertidos = [cnae_para_banco(cnae) for cnae in config['cnaes']]
        cnaes_list = ', '.join([f"'{cnae}'" for cnae in cnaes_convertidos])

        query = f"""
        SELECT COUNT(DISTINCT e.cnpj) as total
        FROM estabelecimento e
        WHERE e.cnae_fiscal IN ({cnaes_list})
          AND e.situacao_cadastral = '02'
          AND e.municipio = '4445'
        """

        cursor.execute(query)
        resultado = cursor.fetchone()
        total = resultado['total'] if resultado else 0

        segmentos.append({
            'id': segmento_id,
            'titulo': config['titulo'],
            'descricao': config['descricao'],
            'total_empresas': total,
            'ticket_medio': config['ticket_medio'],
            'tipo_contrato': config['tipo_contrato'],
            'prioridade': config['prioridade']
        })

    conn.close()

    # Ordena por prioridade
    segmentos.sort(key=lambda x: x['prioridade'])

    return jsonify(segmentos)


@prospeccao_bp.route('/empresas/<segmento_id>', methods=['GET'])
def buscar_empresas_segmento(segmento_id: str):
    """Busca empresas de um segmento específico com filtros avançados"""

    if segmento_id not in CNAES_OURO:
        return jsonify({'erro': 'Segmento inválido'}), 400

    # Parâmetros de filtro
    limite = request.args.get('limite', 200, type=int)
    offset = request.args.get('offset', 0, type=int)
    apenas_recentes = request.args.get('recentes', 'false').lower() == 'true'
    bairro = request.args.get('bairro', '').strip()
    termo = request.args.get('termo', '').strip()
    ordenacao = request.args.get('ordenacao', 'data_desc')

    config = CNAES_OURO[segmento_id]
    # Converte CNAEs para o formato do banco (sem barra)
    cnaes_convertidos = [cnae_para_banco(cnae) for cnae in config['cnaes']]
    cnaes_list = ', '.join([f"'{cnae}'" for cnae in cnaes_convertidos])

    conn = get_db_connection()
    cursor = conn.cursor()

    # Condições WHERE
    conditions = [
        f"e.cnae_fiscal IN ({cnaes_list})",
        "e.situacao_cadastral = '02'",
        "e.municipio = '4445'"
    ]

    # Filtro de bairro
    if bairro:
        conditions.append(f"LOWER(e.bairro) LIKE LOWER('%{bairro}%')")

    # Filtro de busca por termo (nome ou endereço)
    if termo:
        conditions.append(f"(LOWER(e.nome_fantasia) LIKE LOWER('%{termo}%') OR LOWER(emp.razao_social) LIKE LOWER('%{termo}%') OR LOWER(e.logradouro) LIKE LOWER('%{termo}%'))")

    # Filtro de empresas recentes (últimos 180 dias)
    if apenas_recentes:
        data_limite = (datetime.now() - timedelta(days=180)).strftime('%Y%m%d')
        conditions.append(f"e.data_inicio_atividades >= '{data_limite}'")

    where_clause = ' AND '.join(conditions)

    # Query para contar total de registros
    query_count = f"""
    SELECT COUNT(*) as total
    FROM estabelecimento e
    LEFT JOIN empresas emp ON e.cnpj_basico = emp.cnpj_basico
    WHERE {where_clause}
    """

    cursor.execute(query_count)
    total_geral = cursor.fetchone()['total']

    # Ordenação
    ordem_sql = {
        'data_desc': 'e.data_inicio_atividades DESC',
        'data_asc': 'e.data_inicio_atividades ASC',
        'nome_asc': 'COALESCE(e.nome_fantasia, emp.razao_social) ASC',
        'nome_desc': 'COALESCE(e.nome_fantasia, emp.razao_social) DESC'
    }.get(ordenacao, 'e.data_inicio_atividades DESC')

    # Query para buscar registros paginados
    query = f"""
    SELECT
        e.cnpj,
        e.nome_fantasia,
        emp.razao_social,
        e.cnae_fiscal,
        c.descricao as cnae_descricao,
        e.logradouro,
        e.numero,
        e.complemento,
        e.bairro,
        e.cep,
        m.descricao as municipio_nome,
        e.uf,
        e.telefone1,
        e.ddd1,
        e.correio_eletronico,
        e.data_inicio_atividades,
        e.situacao_cadastral
    FROM estabelecimento e
    LEFT JOIN empresas emp ON e.cnpj_basico = emp.cnpj_basico
    LEFT JOIN cnae c ON e.cnae_fiscal = c.codigo
    LEFT JOIN municipio m ON e.municipio = m.codigo
    WHERE {where_clause}
    ORDER BY {ordem_sql}
    LIMIT {limite} OFFSET {offset}
    """

    cursor.execute(query)
    resultados = cursor.fetchall()

    empresas = []
    for row in resultados:
        dias_abertura = calcular_dias_desde_abertura(row['data_inicio_atividades'])

        empresas.append({
            'cnpj': formatar_cnpj(row['cnpj'] or ''),
            'nome_fantasia': row['nome_fantasia'] or row['razao_social'] or 'Sem nome',
            'razao_social': row['razao_social'] or '',
            'cnae': row['cnae_fiscal'],
            'cnae_descricao': row['cnae_descricao'] or '',
            'endereco': {
                'logradouro': row['logradouro'] or '',
                'numero': row['numero'] or '',
                'complemento': row['complemento'] or '',
                'bairro': row['bairro'] or '',
                'cep': row['cep'] or '',
                'municipio': row['municipio_nome'] or '',
                'uf': row['uf'] or ''
            },
            'telefone': f"({row['ddd1']}) {row['telefone1']}" if row['ddd1'] and row['telefone1'] else '',
            'email': row['correio_eletronico'] or '',
            'data_abertura': row['data_inicio_atividades'],
            'dias_desde_abertura': dias_abertura,
            'lead_fresco': dias_abertura and dias_abertura <= 180,
            'ticket_medio': config['ticket_medio'],
            'tipo_contrato': config['tipo_contrato']
        })

    conn.close()

    return jsonify({
        'segmento': config['titulo'],
        'total': len(empresas),
        'total_geral': total_geral,
        'offset': offset,
        'limite': limite,
        'empresas': empresas
    })


@prospeccao_bp.route('/leads-frescos', methods=['GET'])
def buscar_leads_frescos():
    """Busca empresas recém-abertas (últimos 90 dias) de TODOS os segmentos"""

    dias = request.args.get('dias', 90, type=int)
    limite = request.args.get('limite', 100, type=int)

    data_limite = (datetime.now() - timedelta(days=dias)).strftime('%Y%m%d')

    # Coleta CNAEs de todos os segmentos
    todos_cnaes = []
    for config in CNAES_OURO.values():
        todos_cnaes.extend(config['cnaes'])

    # Converte CNAEs para o formato do banco (sem barra)
    todos_cnaes_convertidos = [cnae_para_banco(cnae) for cnae in todos_cnaes]
    cnaes_list = ', '.join([f"'{cnae}'" for cnae in todos_cnaes_convertidos])

    conn = get_db_connection()
    cursor = conn.cursor()

    query = f"""
    SELECT
        e.cnpj,
        e.nome_fantasia,
        emp.razao_social,
        e.cnae_fiscal,
        c.descricao as cnae_descricao,
        e.logradouro,
        e.numero,
        e.bairro,
        e.cep,
        m.descricao as municipio_nome,
        e.uf,
        e.telefone1,
        e.ddd1,
        e.correio_eletronico,
        e.data_inicio_atividades
    FROM estabelecimento e
    LEFT JOIN empresas emp ON e.cnpj_basico = emp.cnpj_basico
    LEFT JOIN cnae c ON e.cnae_fiscal = c.codigo
    LEFT JOIN municipio m ON e.municipio = m.codigo
    WHERE e.cnae_fiscal IN ({cnaes_list})
      AND e.situacao_cadastral = '02'
      AND e.municipio = '4445'
      AND e.data_inicio_atividades >= '{data_limite}'
    ORDER BY e.data_inicio_atividades DESC
    LIMIT {limite}
    """

    cursor.execute(query)
    resultados = cursor.fetchall()

    leads = []
    for row in resultados:
        # Identifica a qual segmento pertence
        segmento_nome = 'Outros'
        for seg_id, config in CNAES_OURO.items():
            if row['cnae_fiscal'] in config['cnaes']:
                segmento_nome = config['titulo']
                break

        dias_abertura = calcular_dias_desde_abertura(row['data_inicio_atividades'])

        leads.append({
            'cnpj': formatar_cnpj(row['cnpj'] or ''),
            'nome_fantasia': row['nome_fantasia'] or row['razao_social'] or 'Sem nome',
            'razao_social': row['razao_social'] or '',
            'segmento': segmento_nome,
            'cnae': row['cnae_fiscal'],
            'cnae_descricao': row['cnae_descricao'] or '',
            'endereco': f"{row['logradouro'] or ''}, {row['numero'] or ''} - {row['bairro'] or ''}",
            'telefone': f"({row['ddd1']}) {row['telefone1']}" if row['ddd1'] and row['telefone1'] else '',
            'email': row['correio_eletronico'] or '',
            'dias_desde_abertura': dias_abertura,
            'data_abertura': row['data_inicio_atividades']
        })

    conn.close()

    return jsonify({
        'total': len(leads),
        'periodo_dias': dias,
        'leads': leads
    })


@prospeccao_bp.route('/estatisticas', methods=['GET'])
def estatisticas_prospeccao():
    """Retorna estatísticas gerais de prospecção"""

    conn = get_db_connection()
    cursor = conn.cursor()

    # Total de empresas ativas em Divinópolis
    cursor.execute("""
        SELECT COUNT(*) as total
        FROM estabelecimento
        WHERE situacao_cadastral = '02'
          AND municipio = '4445'
    """)
    total_empresas = cursor.fetchone()['total']

    # Total nos segmentos estratégicos
    todos_cnaes = []
    for config in CNAES_OURO.values():
        todos_cnaes.extend(config['cnaes'])

    # Converte CNAEs para o formato do banco (sem barra)
    todos_cnaes_convertidos = [cnae_para_banco(cnae) for cnae in todos_cnaes]
    cnaes_list = ', '.join([f"'{cnae}'" for cnae in todos_cnaes_convertidos])

    cursor.execute(f"""
        SELECT COUNT(*) as total
        FROM estabelecimento
        WHERE cnae_fiscal IN ({cnaes_list})
          AND situacao_cadastral = '02'
          AND municipio = '4445'
    """)
    total_estrategicos = cursor.fetchone()['total']

    # Leads frescos (últimos 90 dias)
    data_limite = (datetime.now() - timedelta(days=90)).strftime('%Y%m%d')

    cursor.execute(f"""
        SELECT COUNT(*) as total
        FROM estabelecimento
        WHERE cnae_fiscal IN ({cnaes_list})
          AND situacao_cadastral = '02'
          AND municipio = '4445'
          AND data_inicio_atividades >= '{data_limite}'
    """)
    leads_frescos = cursor.fetchone()['total']

    conn.close()

    return jsonify({
        'total_empresas_divinopolis': total_empresas,
        'total_segmentos_estrategicos': total_estrategicos,
        'leads_frescos_90_dias': leads_frescos,
        'percentual_cobertura': round((total_estrategicos / total_empresas * 100), 2) if total_empresas > 0 else 0
    })


def carregar_cnaes_permitidos():
    """Carrega CNAEs do arquivo cnaes_permitidos.txt"""
    cnaes_permitidos = set()
    arquivo_path = BASE_DIR / 'cnaes_permitidos.txt'

    try:
        with open(arquivo_path, 'r', encoding='utf-8') as f:
            for linha in f:
                linha = linha.strip()
                # Ignora linhas vazias e comentários
                if not linha or linha.startswith('#'):
                    continue

                # Extrai o código CNAE (formato: XX.XX-X-XX)
                if ' - ' in linha:
                    cnae = linha.split(' - ')[0].strip()
                    # Converte para formato do banco (sem pontos, traços, barras)
                    cnae_banco = cnae_para_banco(cnae)
                    cnaes_permitidos.add(cnae_banco)
    except Exception as e:
        print(f"Erro ao carregar CNAEs permitidos: {e}")

    return cnaes_permitidos


@prospeccao_bp.route('/todos-cnaes', methods=['GET'])
def listar_todos_cnaes():
    """Lista todos os CNAEs disponíveis em Divinópolis com contagem de empresas"""

    # Carrega CNAEs permitidos do arquivo
    cnaes_permitidos = carregar_cnaes_permitidos()

    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
    SELECT
        e.cnae_fiscal as codigo,
        c.descricao,
        COUNT(*) as total_empresas
    FROM estabelecimento e
    LEFT JOIN cnae c ON e.cnae_fiscal = c.codigo
    WHERE e.situacao_cadastral = '02'
      AND e.municipio = '4445'
    GROUP BY e.cnae_fiscal
    HAVING total_empresas > 0
    ORDER BY total_empresas DESC
    """

    cursor.execute(query)
    resultados = cursor.fetchall()

    cnaes = []
    for row in resultados:
        # Filtra apenas CNAEs permitidos
        if row['codigo'] in cnaes_permitidos:
            cnaes.append({
                'codigo': row['codigo'],
                'descricao': row['descricao'] or 'Sem descrição',
                'total_empresas': row['total_empresas']
            })

    conn.close()

    return jsonify({
        'total_cnaes': len(cnaes),
        'cnaes_permitidos': len(cnaes_permitidos),
        'cnaes': cnaes
    })


@prospeccao_bp.route('/empresas-por-cnae/<cnae>', methods=['GET'])
def listar_empresas_por_cnae(cnae):
    """Lista empresas de um CNAE específico"""

    limite = request.args.get('limite', 50, type=int)
    offset = request.args.get('offset', 0, type=int)
    ordenacao = request.args.get('ordenacao', 'data_desc')  # data_desc, data_asc, nome_asc, nome_desc

    # Converte CNAE para formato do banco
    cnae_banco = cnae_para_banco(cnae)

    # Define ordenação
    ordem_sql = {
        'data_desc': 'e.data_inicio_atividades DESC',
        'data_asc': 'e.data_inicio_atividades ASC',
        'nome_asc': 'COALESCE(e.nome_fantasia, emp.razao_social) ASC',
        'nome_desc': 'COALESCE(e.nome_fantasia, emp.razao_social) DESC'
    }.get(ordenacao, 'e.data_inicio_atividades DESC')

    conn = get_db_connection()
    cursor = conn.cursor()

    query = f"""
    SELECT
        e.cnpj,
        e.nome_fantasia,
        emp.razao_social,
        e.cnae_fiscal,
        c.descricao as cnae_descricao,
        e.tipo_logradouro,
        e.logradouro,
        e.numero,
        e.bairro,
        e.cep,
        m.descricao as municipio_nome,
        e.uf,
        e.telefone1,
        e.ddd1,
        e.correio_eletronico,
        e.data_inicio_atividades
    FROM estabelecimento e
    LEFT JOIN empresas emp ON e.cnpj_basico = emp.cnpj_basico
    LEFT JOIN cnae c ON e.cnae_fiscal = c.codigo
    LEFT JOIN municipio m ON e.municipio = m.codigo
    WHERE e.cnae_fiscal = '{cnae_banco}'
      AND e.situacao_cadastral = '02'
      AND e.municipio = '4445'
    ORDER BY {ordem_sql}
    LIMIT {limite} OFFSET {offset}
    """

    cursor.execute(query)
    resultados = cursor.fetchall()

    empresas = []
    for row in resultados:
        dias_abertura = calcular_dias_desde_abertura(row['data_inicio_atividades'])

        empresas.append({
            'cnpj': formatar_cnpj(row['cnpj'] or ''),
            'nome_fantasia': row['nome_fantasia'] or row['razao_social'] or 'Sem nome',
            'razao_social': row['razao_social'] or '',
            'cnae': row['cnae_fiscal'],
            'cnae_descricao': row['cnae_descricao'] or '',
            'endereco': {
                'tipo_logradouro': row['tipo_logradouro'] or '',
                'logradouro': row['logradouro'] or '',
                'numero': row['numero'] or '',
                'bairro': row['bairro'] or '',
                'cep': row['cep'] or '',
                'municipio': row['municipio_nome'] or '',
                'uf': row['uf'] or ''
            },
            'telefone': f"({row['ddd1']}) {row['telefone1']}" if row['ddd1'] and row['telefone1'] else '',
            'email': row['correio_eletronico'] or '',
            'data_abertura': row['data_inicio_atividades'],
            'dias_desde_abertura': dias_abertura,
            'lead_fresco': dias_abertura and dias_abertura <= 180
        })

    conn.close()

    return jsonify({
        'total': len(empresas),
        'cnae': cnae,
        'empresas': empresas
    })


@prospeccao_bp.route('/busca-global', methods=['GET'])
def busca_global():
    """Busca global por nome, endereço, CNAE com filtros avançados"""

    # Parâmetros de busca
    termo = request.args.get('termo', '').strip()
    cnae = request.args.get('cnae', '').strip()
    bairro = request.args.get('bairro', '').strip()
    rua = request.args.get('rua', '').strip()
    apenas_leads_frescos = request.args.get('apenas_leads_frescos', 'false').lower() == 'true'
    dias_limite = request.args.get('dias_limite', 180, type=int)
    empresas_antigas = request.args.get('empresas_antigas', 'false').lower() == 'true'
    dias_minimo = request.args.get('dias_minimo', 180, type=int)
    ordenacao = request.args.get('ordenacao', 'data_desc')
    limite = request.args.get('limite', 100, type=int)
    offset = request.args.get('offset', 0, type=int)

    print(f"[DEBUG] Busca global - termo: '{termo}', cnae: '{cnae}', bairro: '{bairro}', rua: '{rua}', frescos: {apenas_leads_frescos}, antigas: {empresas_antigas}")

    # Carrega CNAEs permitidos
    cnaes_permitidos = carregar_cnaes_permitidos()

    conn = get_db_connection()
    cursor = conn.cursor()

    # Monta query base
    conditions = [
        "e.situacao_cadastral = '02'",
        "e.municipio = '4445'"
    ]

    # NOTA: Filtro de CNAEs permitidos não é necessário pois todos os CNAEs
    # no banco de Divinópolis já estão nos CNAEs permitidos (verificado: 814/814)

    # Busca por termo (nome fantasia, razão social, endereço)
    if termo:
        termo_clean = termo.replace("'", "''")  # Escape SQL
        conditions.append(f"""(
            LOWER(e.nome_fantasia) LIKE LOWER('%{termo_clean}%') OR
            LOWER(emp.razao_social) LIKE LOWER('%{termo_clean}%') OR
            LOWER(COALESCE(e.tipo_logradouro, '') || ' ' || COALESCE(e.logradouro, '')) LIKE LOWER('%{termo_clean}%') OR
            LOWER(e.bairro) LIKE LOWER('%{termo_clean}%') OR
            e.numero LIKE '%{termo_clean}%'
        )""")

    # Filtro por CNAE específico
    if cnae:
        cnae_banco = cnae_para_banco(cnae)
        conditions.append(f"e.cnae_fiscal = '{cnae_banco}'")

    # Filtro por bairro
    if bairro:
        bairro_clean = bairro.replace("'", "''")
        conditions.append(f"LOWER(e.bairro) LIKE LOWER('%{bairro_clean}%')")

    # Filtro por rua/logradouro (busca tanto no logradouro quanto no nome completo)
    if rua:
        rua_clean = rua.replace("'", "''")
        # Busca no logradouro (sem prefixo) OU na concatenação completa
        conditions.append(f"(LOWER(e.logradouro) LIKE LOWER('%{rua_clean}%') OR LOWER((COALESCE(e.tipo_logradouro, '') || ' ' || COALESCE(e.logradouro, ''))) LIKE LOWER('%{rua_clean}%'))")

    # Filtro de leads frescos (empresas recentes)
    if apenas_leads_frescos:
        data_limite = (datetime.now() - timedelta(days=dias_limite)).strftime('%Y%m%d')
        conditions.append(f"e.data_inicio_atividades >= '{data_limite}'")

    # Filtro de empresas antigas/estabelecidas (mais de X dias)
    if empresas_antigas:
        data_limite = (datetime.now() - timedelta(days=dias_minimo)).strftime('%Y%m%d')
        conditions.append(f"e.data_inicio_atividades < '{data_limite}'")

    # Define ordenação
    ordem_sql = {
        'data_desc': 'e.data_inicio_atividades DESC',
        'data_asc': 'e.data_inicio_atividades ASC',
        'nome_asc': 'COALESCE(e.nome_fantasia, emp.razao_social) ASC',
        'nome_desc': 'COALESCE(e.nome_fantasia, emp.razao_social) DESC'
    }.get(ordenacao, 'e.data_inicio_atividades DESC')

    where_clause = ' AND '.join(conditions)

    print(f"[DEBUG] WHERE clause: {where_clause}")

    # Query para contar total de registros (sem LIMIT/OFFSET)
    query_count = f"""
    SELECT COUNT(*) as total
    FROM estabelecimento e
    LEFT JOIN empresas emp ON e.cnpj_basico = emp.cnpj_basico
    LEFT JOIN cnae c ON e.cnae_fiscal = c.codigo
    LEFT JOIN municipio m ON e.municipio = m.codigo
    WHERE {where_clause}
    """

    cursor.execute(query_count)
    total_geral = cursor.fetchone()['total']

    print(f"[DEBUG] Total geral encontrado: {total_geral}")

    # Query para buscar registros paginados
    query = f"""
    SELECT
        e.cnpj,
        e.nome_fantasia,
        emp.razao_social,
        e.cnae_fiscal,
        c.descricao as cnae_descricao,
        e.tipo_logradouro,
        e.logradouro,
        e.numero,
        e.bairro,
        e.cep,
        m.descricao as municipio_nome,
        e.uf,
        e.telefone1,
        e.ddd1,
        e.correio_eletronico,
        e.data_inicio_atividades
    FROM estabelecimento e
    LEFT JOIN empresas emp ON e.cnpj_basico = emp.cnpj_basico
    LEFT JOIN cnae c ON e.cnae_fiscal = c.codigo
    LEFT JOIN municipio m ON e.municipio = m.codigo
    WHERE {where_clause}
    ORDER BY {ordem_sql}
    LIMIT {limite} OFFSET {offset}
    """

    print(f"[DEBUG] Query gerada:\n{query[:500]}...")

    cursor.execute(query)
    resultados = cursor.fetchall()

    print(f"[DEBUG] Resultados: {len(resultados)} empresas encontradas (página atual)")

    empresas = []
    for row in resultados:
        dias_abertura = calcular_dias_desde_abertura(row['data_inicio_atividades'])

        empresas.append({
            'cnpj': formatar_cnpj(row['cnpj'] or ''),
            'nome_fantasia': row['nome_fantasia'] or row['razao_social'] or 'Sem nome',
            'razao_social': row['razao_social'] or '',
            'cnae': row['cnae_fiscal'],
            'cnae_descricao': row['cnae_descricao'] or '',
            'endereco': {
                'tipo_logradouro': row['tipo_logradouro'] or '',
                'logradouro': row['logradouro'] or '',
                'numero': row['numero'] or '',
                'bairro': row['bairro'] or '',
                'cep': row['cep'] or '',
                'municipio': row['municipio_nome'] or '',
                'uf': row['uf'] or ''
            },
            'telefone': f"({row['ddd1']}) {row['telefone1']}" if row['ddd1'] and row['telefone1'] else '',
            'email': row['correio_eletronico'] or '',
            'data_abertura': row['data_inicio_atividades'],
            'dias_desde_abertura': dias_abertura,
            'lead_fresco': dias_abertura and dias_abertura <= 180
        })

    conn.close()

    return jsonify({
        'total': len(empresas),
        'total_geral': total_geral,
        'offset': offset,
        'limite': limite,
        'filtros': {
            'termo': termo,
            'cnae': cnae,
            'bairro': bairro,
            'apenas_leads_frescos': apenas_leads_frescos,
            'dias_limite': dias_limite,
            'ordenacao': ordenacao
        },
        'empresas': empresas
    })


@prospeccao_bp.route('/autocomplete/cnaes', methods=['GET'])
def autocomplete_cnaes():
    """Autocomplete para CNAEs"""
    termo = request.args.get('termo', '').strip()
    limite = request.args.get('limite', 20, type=int)

    if not termo:
        return jsonify({'sugestoes': []})

    conn = get_db_connection()
    cursor = conn.cursor()

    # Busca por código ou descrição
    query = f"""
    SELECT DISTINCT e.cnae_fiscal as codigo, c.descricao, COUNT(*) as total
    FROM estabelecimento e
    LEFT JOIN cnae c ON e.cnae_fiscal = c.codigo
    WHERE (e.cnae_fiscal LIKE '%{termo}%' OR LOWER(c.descricao) LIKE LOWER('%{termo}%'))
      AND e.situacao_cadastral = '02'
      AND e.municipio = '4445'
    GROUP BY e.cnae_fiscal
    ORDER BY total DESC
    LIMIT {limite}
    """

    cursor.execute(query)
    resultados = cursor.fetchall()

    sugestoes = [{
        'codigo': row['codigo'],
        'descricao': row['descricao'] or 'Sem descrição',
        'total': row['total']
    } for row in resultados]

    conn.close()
    return jsonify({'sugestoes': sugestoes})


@prospeccao_bp.route('/autocomplete/bairros', methods=['GET'])
def autocomplete_bairros():
    """Autocomplete para bairros"""
    termo = request.args.get('termo', '').strip()
    limite = request.args.get('limite', 20, type=int)

    if not termo:
        return jsonify({'sugestoes': []})

    conn = get_db_connection()
    cursor = conn.cursor()

    query = f"""
    SELECT DISTINCT e.bairro, COUNT(*) as total
    FROM estabelecimento e
    WHERE LOWER(e.bairro) LIKE LOWER('%{termo}%')
      AND e.situacao_cadastral = '02'
      AND e.municipio = '4445'
      AND e.bairro IS NOT NULL
      AND e.bairro != ''
    GROUP BY e.bairro
    ORDER BY total DESC
    LIMIT {limite}
    """

    cursor.execute(query)
    resultados = cursor.fetchall()

    sugestoes = [{
        'nome': row['bairro'],
        'total': row['total']
    } for row in resultados]

    conn.close()
    return jsonify({'sugestoes': sugestoes})


@prospeccao_bp.route('/autocomplete/ruas', methods=['GET'])
def autocomplete_ruas():
    """Autocomplete para ruas"""
    termo = request.args.get('termo', '').strip()
    limite = request.args.get('limite', 20, type=int)

    if not termo:
        return jsonify({'sugestoes': []})

    conn = get_db_connection()
    cursor = conn.cursor()

    query = f"""
    SELECT DISTINCT e.logradouro, e.tipo_logradouro, COUNT(*) as total
    FROM estabelecimento e
    WHERE LOWER(e.logradouro) LIKE LOWER('%{termo}%')
      AND e.situacao_cadastral = '02'
      AND e.municipio = '4445'
      AND e.logradouro IS NOT NULL
      AND e.logradouro != ''
    GROUP BY e.logradouro, e.tipo_logradouro
    ORDER BY total DESC
    LIMIT {limite}
    """

    cursor.execute(query)
    resultados = cursor.fetchall()

    sugestoes = [{
        'nome': f"{row['tipo_logradouro'] or ''} {row['logradouro']}".strip(),
        'total': row['total']
    } for row in resultados]

    conn.close()
    return jsonify({'sugestoes': sugestoes})


@prospeccao_bp.route('/todas-empresas', methods=['GET'])
def listar_todas_empresas():
    """Lista TODAS as empresas de Divinópolis com opções de ordenação"""
    print("[DEBUG] Rota /todas-empresas foi chamada!")

    limite = request.args.get('limite', 100, type=int)
    offset = request.args.get('offset', 0, type=int)
    ordenacao = request.args.get('ordenacao', 'data_desc')

    # Define ordenação
    ordem_sql = {
        'data_desc': 'e.data_inicio_atividades DESC',
        'data_asc': 'e.data_inicio_atividades ASC',
        'nome_asc': 'COALESCE(e.nome_fantasia, emp.razao_social) ASC',
        'nome_desc': 'COALESCE(e.nome_fantasia, emp.razao_social) DESC'
    }.get(ordenacao, 'e.data_inicio_atividades DESC')

    conn = get_db_connection()
    cursor = conn.cursor()

    # Primeiro, pega o total
    cursor.execute("""
        SELECT COUNT(*) as total
        FROM estabelecimento e
        WHERE e.situacao_cadastral = '02'
          AND e.municipio = '4445'
    """)
    total_resultado = cursor.fetchone()['total']

    # Depois busca os dados paginados
    query = f"""
    SELECT
        e.cnpj,
        e.nome_fantasia,
        emp.razao_social,
        e.cnae_fiscal,
        c.descricao as cnae_descricao,
        e.tipo_logradouro,
        e.logradouro,
        e.numero,
        e.bairro,
        e.cep,
        m.descricao as municipio_nome,
        e.uf,
        e.telefone1,
        e.ddd1,
        e.correio_eletronico,
        e.data_inicio_atividades
    FROM estabelecimento e
    LEFT JOIN empresas emp ON e.cnpj_basico = emp.cnpj_basico
    LEFT JOIN cnae c ON e.cnae_fiscal = c.codigo
    LEFT JOIN municipio m ON e.municipio = m.codigo
    WHERE e.situacao_cadastral = '02'
      AND e.municipio = '4445'
    ORDER BY {ordem_sql}
    LIMIT {limite} OFFSET {offset}
    """

    cursor.execute(query)
    resultados = cursor.fetchall()

    empresas = []
    for row in resultados:
        dias_abertura = calcular_dias_desde_abertura(row['data_inicio_atividades'])

        empresas.append({
            'cnpj': formatar_cnpj(row['cnpj'] or ''),
            'nome_fantasia': row['nome_fantasia'] or row['razao_social'] or 'Sem nome',
            'razao_social': row['razao_social'] or '',
            'cnae': row['cnae_fiscal'],
            'cnae_descricao': row['cnae_descricao'] or '',
            'endereco': {
                'tipo_logradouro': row['tipo_logradouro'] or '',
                'logradouro': row['logradouro'] or '',
                'numero': row['numero'] or '',
                'bairro': row['bairro'] or '',
                'cep': row['cep'] or '',
                'municipio': row['municipio_nome'] or '',
                'uf': row['uf'] or ''
            },
            'telefone': f"({row['ddd1']}) {row['telefone1']}" if row['ddd1'] and row['telefone1'] else '',
            'email': row['correio_eletronico'] or '',
            'data_abertura': row['data_inicio_atividades'],
            'dias_desde_abertura': dias_abertura,
            'lead_fresco': dias_abertura and dias_abertura <= 180
        })

    conn.close()

    return jsonify({
        'total': len(empresas),
        'total_geral': total_resultado,
        'ordenacao': ordenacao,
        'empresas': empresas
    })


@prospeccao_bp.route('/busca-avancada', methods=['POST'])
def busca_avancada():
    """Busca personalizada com múltiplos filtros"""

    data = request.get_json()

    cnaes = data.get('cnaes', [])
    municipio_codigo = data.get('municipio', '4445')  # Default: Divinópolis
    bairros = data.get('bairros', [])
    apenas_recentes = data.get('apenas_recentes', False)
    dias_recentes = data.get('dias_recentes', 180)
    limite = data.get('limite', 100)

    if not cnaes:
        return jsonify({'erro': 'Forneça ao menos um CNAE'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # Converte CNAEs para o formato do banco (sem barra)
    cnaes_convertidos = [cnae_para_banco(cnae) for cnae in cnaes]
    cnaes_list = ', '.join([f"'{cnae}'" for cnae in cnaes_convertidos])

    query = f"""
    SELECT
        e.cnpj,
        e.nome_fantasia,
        emp.razao_social,
        e.cnae_fiscal,
        c.descricao as cnae_descricao,
        e.logradouro,
        e.numero,
        e.bairro,
        e.cep,
        m.descricao as municipio_nome,
        e.uf,
        e.telefone1,
        e.ddd1,
        e.correio_eletronico,
        e.data_inicio_atividades
    FROM estabelecimento e
    LEFT JOIN empresas emp ON e.cnpj_basico = emp.cnpj_basico
    LEFT JOIN cnae c ON e.cnae_fiscal = c.codigo
    LEFT JOIN municipio m ON e.municipio = m.codigo
    WHERE e.cnae_fiscal IN ({cnaes_list})
      AND e.situacao_cadastral = '02'
      AND e.municipio = '{municipio_codigo}'
    """

    if bairros:
        bairros_list = ', '.join([f"'{b}'" for b in bairros])
        query += f" AND e.bairro IN ({bairros_list})"

    if apenas_recentes:
        data_limite = (datetime.now() - timedelta(days=dias_recentes)).strftime('%Y%m%d')
        query += f" AND e.data_inicio_atividades >= '{data_limite}'"

    query += f" ORDER BY e.data_inicio_atividades DESC LIMIT {limite}"

    cursor.execute(query)
    resultados = cursor.fetchall()

    empresas = []
    for row in resultados:
        dias_abertura = calcular_dias_desde_abertura(row['data_inicio_atividades'])

        empresas.append({
            'cnpj': formatar_cnpj(row['cnpj'] or ''),
            'nome_fantasia': row['nome_fantasia'] or row['razao_social'] or 'Sem nome',
            'razao_social': row['razao_social'] or '',
            'cnae': row['cnae_fiscal'],
            'cnae_descricao': row['cnae_descricao'] or '',
            'endereco': {
                'logradouro': row['logradouro'] or '',
                'numero': row['numero'] or '',
                'bairro': row['bairro'] or '',
                'cep': row['cep'] or '',
                'municipio': row['municipio_nome'] or '',
                'uf': row['uf'] or ''
            },
            'telefone': f"({row['ddd1']}) {row['telefone1']}" if row['ddd1'] and row['telefone1'] else '',
            'email': row['correio_eletronico'] or '',
            'data_abertura': row['data_inicio_atividades'],
            'dias_desde_abertura': dias_abertura,
            'lead_fresco': dias_abertura and dias_abertura <= 180
        })

    conn.close()

    return jsonify({
        'total': len(empresas),
        'empresas': empresas
    })
