"""
Mapeamento de CNAEs para Categorias Generalizadas
Baseado nas categorias da prospecção
"""

# Categorias generalizadas com seus códigos
CATEGORIAS_CNAE = {
    # #0 - Todas as Empresas (Controle de Pragas/Imunização)
    'todas': {
        'codigo': '#0',
        'cnaes': [
            '8122200',  # Imunização e controle de pragas urbanas
            '8121400',  # Limpeza em prédios e domicílios
            '8129000',  # Atividades de limpeza não especificadas
        ]
    },

    # #1 - Alimentação
    'alimentacao': {
        'codigo': '#1',
        'cnaes': [
            '5611201', '5611202', '5611203', '5611204', '5611205',  # Restaurantes
            '5620101', '5620102', '5620103', '5620104',  # Serviços de catering
            '1011201', '1011202', '1012101', '1012102',  # Frigoríficos
            '4721101', '4721102', '4721103',  # Padarias
            '4729699',  # Comércio varejista de produtos alimentícios
        ]
    },

    # #2 - Saúde
    'saude': {
        'codigo': '#2',
        'cnaes': [
            '8610101', '8610102',  # Hospitais
            '8630501', '8630502', '8630503', '8630504', '8630505', '8630506',  # Clínicas
            '8711501', '8711502', '8711503', '8711504', '8711505',  # Asilos
            '8720401', '8720402', '8720499',  # Clínicas psiquiátricas
            '4771701', '4771702', '4771703',  # Farmácias
        ]
    },

    # #3 - Condomínios
    'condominios': {
        'codigo': '#3',
        'cnaes': [
            '8112500',  # Condomínios prediais
            '6810201', '6810202', '6810203',  # Aluguel de imóveis
            '8111700',  # Serviços combinados para apoio a edifícios
        ]
    },

    # #4 - Hotéis e Hospedagem
    'hoteis': {
        'codigo': '#4',
        'cnaes': [
            '5510801', '5510802', '5510803',  # Hotéis
            '5590601', '5590602', '5590603', '5590699',  # Albergues e hostels
            '5520101', '5520102',  # Camping
        ]
    },

    # #5 - Indústrias
    'industrias': {
        'codigo': '#5',
        'cnaes': [
            '1011201', '1011202', '1012101', '1012102',  # Frigoríficos
            '1031700',  # Fabricação de conservas de frutas
            '1033301', '1033302',  # Fabricação de sucos
            '1095300',  # Torrefação e moagem de café
            '2399101', '2399199',  # Fabricação de outros produtos minerais
        ]
    },

    # #6 - Educação
    'educacao': {
        'codigo': '#6',
        'cnaes': [
            '8511200',  # Educação infantil
            '8512100',  # Ensino fundamental
            '8513900',  # Ensino médio
            '8520100', '8520200',  # Ensino superior
            '8531700', '8532500', '8533300',  # Educação profissional
        ]
    },

    # #7 - Comércio
    'comercio': {
        'codigo': '#7',
        'cnaes': [
            '4711301', '4711302',  # Supermercados
            '4712100',  # Minimercados e mercearias
            '4729699',  # Comércio varejista de produtos alimentícios
            '4744001', '4744002', '4744003', '4744004', '4744005', '4744099',  # Farmácias
            '4789001', '4789099',  # Comércio varejista de outros produtos
        ]
    },

    # #8 - Estética e Beleza
    'estetica': {
        'codigo': '#8',
        'cnaes': [
            '9602501', '9602502',  # Salões de beleza
            '9603301', '9603302', '9603303', '9603304', '9603399',  # Atividades funerárias
            '8640201', '8640202', '8640203', '8640204', '8640205', '8640206', '8640207', '8640208', '8640209', '8640210', '8640211', '8640212', '8640213', '8640214', '8640215', '8640216', '8640217', '8640218', '8640219',  # Serviços de estética
        ]
    },

    # #9 - Escritórios
    'escritorios': {
        'codigo': '#9',
        'cnaes': [
            '6911701', '6911702', '6911703',  # Serviços advocatícios
            '6920601', '6920602',  # Atividades de contabilidade
            '7020400',  # Atividades de consultoria em gestão
            '8211300',  # Serviços combinados de escritório
        ]
    },

    # #10 - Veterinária
    'veterinaria': {
        'codigo': '#10',
        'cnaes': [
            '7500100',  # Atividades veterinárias
            '0162801', '0162802', '0162899',  # Serviços de inseminação artificial
        ]
    },

    # #11 - Academias e Esportes
    'academias': {
        'codigo': '#11',
        'cnaes': [
            '9313100',  # Atividades de condicionamento físico
            '9312300',  # Clubes sociais, esportivos
            '9319101', '9319199',  # Outras atividades esportivas
        ]
    },
}


def obter_categoria_por_cnae(cnae_codigo):
    """
    Retorna o código da categoria (#1, #2, etc.) baseado no CNAE

    Args:
        cnae_codigo: Código CNAE (com ou sem formatação)

    Returns:
        Código da categoria (ex: '#1') ou None se não encontrar
    """
    if not cnae_codigo:
        return None

    # Limpar CNAE (remover pontos e traços)
    cnae_limpo = str(cnae_codigo).replace('.', '').replace('-', '').strip()

    # Buscar em cada categoria
    for categoria, dados in CATEGORIAS_CNAE.items():
        if cnae_limpo in dados['cnaes']:
            return dados['codigo']

    # Se não encontrar, retorna None
    return None


def obter_nome_categoria_por_cnae(cnae_codigo):
    """
    Retorna o nome da categoria baseado no CNAE

    Args:
        cnae_codigo: Código CNAE (com ou sem formatação)

    Returns:
        Nome da categoria (ex: 'alimentacao') ou None
    """
    if not cnae_codigo:
        return None

    # Limpar CNAE
    cnae_limpo = str(cnae_codigo).replace('.', '').replace('-', '').strip()

    # Buscar em cada categoria
    for categoria, dados in CATEGORIAS_CNAE.items():
        if cnae_limpo in dados['cnaes']:
            return categoria

    return None


# Teste
if __name__ == '__main__':
    # Testes
    print("=== TESTES DE CATEGORIZAÇÃO ===")

    testes = [
        ('8122200', 'Imunização - deveria retornar None (não mapeado ainda)'),
        ('5611201', 'Restaurante - deveria retornar #1'),
        ('8610101', 'Hospital - deveria retornar #2'),
        ('8112500', 'Condomínio - deveria retornar #3'),
    ]

    for cnae, descricao in testes:
        categoria = obter_categoria_por_cnae(cnae)
        print(f"\nCNAE: {cnae}")
        print(f"Descrição: {descricao}")
        print(f"Categoria: {categoria}")
