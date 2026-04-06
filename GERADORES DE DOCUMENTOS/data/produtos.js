// Base de dados de produtos quimicos para controle de pragas
export const pestOptions = [
  { id: 'baratas', label: 'Baratas' },
  { id: 'formigas', label: 'Formigas' },
  { id: 'ratos', label: 'Ratos' },
  { id: 'cupins', label: 'Cupins' },
  { id: 'escorpioes', label: 'Escorpiões' },
  { id: 'pulgas', label: 'Pulgas' },
  { id: 'moscas', label: 'Moscas' },
  { id: 'aranhas', label: 'Aranhas' },
  { id: 'mosquitos', label: 'Mosquitos' },
  { id: 'tracas', label: 'Traças' },
  { id: 'carrapatos', label: 'Carrapatos' },
  { id: 'percevejos', label: 'Percevejos' },
  { id: 'barbeiros', label: 'Barbeiros' }
];

export const productsDatabase = {
  ratol: {
    id: 'ratol',
    nome: "Ratol Gs girassol",
    grupo: "Hidroxicumarina",
    principio: "Brodifacoum",
    registro: "3.2398.0019.001-1",
    concentracao: "50 grs por ponto",
    diluente: "_",
    equipamento: "_",
    antidoto: "Antídoto e tratamento: Vitamina K1 e tratamento sintomático. CEATOX: 0800 772 6001",
    targets: ['ratos']
  },
  maki: {
    id: 'maki',
    nome: "Maki Bloco",
    grupo: "Cumarianas",
    principio: "Bromadiolone",
    registro: "3.2233.0073",
    concentracao: "1 Bloco por ponto",
    diluente: "-",
    equipamento: "_",
    antidoto: "Antídoto e tratamento: Vitamina K1 e tratamento sintomático. CEATOX: 0800 772 6001",
    targets: ['ratos']
  },
  triflurat: {
    id: 'triflurat',
    nome: "Triflurat GS",
    grupo: "Cumarínico",
    principio: "Flocoumafen",
    registro: "3.0425.0158.001-1",
    concentracao: "1 Bloco por ponto",
    diluente: "-",
    equipamento: "-",
    antidoto: "Antídoto e tratamento: Vitamina K1 e tratamento sintomático. CEATOX: 0800 772 6001",
    targets: ['ratos']
  },
  termigama: {
    id: 'termigama',
    nome: "Termigama",
    grupo: "Fenil Pirazol",
    principio: "Fipronil",
    registro: "3.0425.0087.001-4",
    concentracao: "5/1(ml/l) de calda",
    diluente: "Água",
    equipamento: "Pulverizador costal de 20 litros",
    antidoto: "Antídoto/Tratamento: Tratamento sintomático e de suporte. CEATOX: 0800 772 6001",
    targets: ['cupins']
  },
  bifentol: {
    id: 'bifentol',
    nome: "Bifentol 200 SC",
    grupo: "Piretróides",
    principio: "Bifentrina",
    registro: "32398.0027.001-5",
    concentracao: "3/1(ml/l) de calda",
    diluente: "Água",
    equipamento: "Pulverizador costal de 20 litros",
    antidoto: "Antidoto / tratamento: Anti-histamínicos e tratamento sintomático. CEATOX: 0800 772 6001",
    targets: ['escorpioes', 'aranhas', 'baratas', 'formigas', 'moscas', 'mosquitos', 'percevejos', 'pulgas', 'carrapatos']
  },
  demand: {
    id: 'demand',
    nome: "DEMAND 2,5CS",
    grupo: "Piretróides",
    principio: "Lambda-cialotrina",
    registro: "3.0119.6626.001-7",
    concentracao: "30/1(ml/l) de calda",
    diluente: "Água",
    equipamento: "Pulverizador costal de 20 litros",
    antidoto: "Antidoto / tratamento: Anti-histamínicos e tratamento sintomático. CEATOX: 0800 772 6001",
    targets: ['escorpioes', 'aranhas', 'carrapatos', 'pulgas', 'baratas', 'formigas', 'tracas', 'moscas', 'mosquitos']
  },
  fendona: {
    id: 'fendona',
    nome: "FENDONA 6 SC",
    grupo: "Piretrinas e Piretróides",
    principio: "Alfa-cipermetrina",
    registro: "3.0404.0031",
    concentracao: "5/1(ml/l) de calda",
    diluente: "Água",
    equipamento: "Pulverizador costal de 20 litros",
    antidoto: "Antídoto/Tratamento: Não há antídoto específico. Tratamento sintomático. Telefone de emergência 24h: 0800 014 11 49.",
    targets: ['mosquitos', 'baratas', 'formigas', 'moscas', 'pulgas', 'barbeiros', 'tracas']
  },
  formim: {
    id: 'formim',
    nome: "FORMFIM GEL",
    grupo: "Fenil Pirazol",
    principio: "Fipronil",
    registro: "3.2398.0033.001-9",
    concentracao: "0,05%",
    diluente: "-",
    equipamento: "Pistola Aplicadora",
    antidoto: "Antídoto/Tratamento: Não há antídoto específico. Tratamento sintomático. CEATOX: 0800 772 6001",
    targets: ['formigas']
  }
};

// Procedimentos de limpeza de caixa d'agua
export const procedimentosHigienizacao = [
  "Feche o registro que manda água para o reservatório que será higienizado ou amarre a boia, para que não continue caindo água na caixa;",
  "Na caixa, deixe mais ou menos uns 10 centímetros d'água, para ser usada na limpeza;",
  "Tampe o cano de distribuição de água para a edificação, use um pano limpo ou uma rolha evitando assim que desça sujeira pelos canos;",
  "Esfregue as paredes da caixa com escova de cerdas plásticas, vassoura de cerda de plástico ou bucha macia para retirar as sujeiras, não use nenhum produto para remoção da sujeira;",
  "Remova a água suja com bomba de sucção;",
  "Enxague a caixa removendo o enxague com bomba de sucção; Fazer este processo até que a água do enxague esteja limpa;",
  "Por último enxague as paredes e o fundo da caixa com solução de água sanitária; Deixe agir por 30 minutos;",
  "Retire o pano ou rolha colocado no cano de distribuição d'água da caixa para a edificação;",
  "Confere se não ficou nada dentro da caixa;",
  "Abra o registro de água ou desamarre a boia;",
  "Libere a água para começar a encher a caixa.",
  "Fazer o teste da boia, para ver se a mesma está funcionando; Limpar a tampa da caixa por dentro e por fora;",
  "Tampar a caixa, verificar se está toda vedada;",
  "Pedir aos usuários para fazerem sangrias nas torneiras quando já houver água suficiente para o uso."
];

// Logica inteligente de selecao de produtos baseada nas pragas
export function generateSmartProductList(selectedPests) {
  const pests = selectedPests;
  let tempRows = [];
  const addedMS = new Set();

  const addProduct = (productId) => {
    const prod = productsDatabase[productId];
    if (prod && !addedMS.has(prod.registro)) {
      tempRows.push(productId);
      addedMS.add(prod.registro);
    }
  };

  const hasEscorpiao = pests.includes('escorpioes') || pests.includes('aranhas') || pests.includes('carrapatos') || pests.includes('percevejos');
  const hasGeneralInsects = pests.some(p => ['baratas', 'formigas', 'pulgas', 'moscas', 'tracas', 'mosquitos', 'barbeiros'].includes(p));

  if (hasEscorpiao) {
    addProduct('bifentol');
  } else if (hasGeneralInsects) {
    addProduct('fendona');
  }

  if (pests.includes('formigas')) addProduct('formim');
  if (pests.includes('ratos')) addProduct('ratol');
  if (pests.includes('cupins')) addProduct('termigama');

  return tempRows;
}

// Produtos compativeis com as pragas selecionadas
export function getCompatibleProducts(selectedPests) {
  if (selectedPests.length === 0) return Object.values(productsDatabase);
  return Object.values(productsDatabase).filter(product => {
    if (!product.targets) return false;
    return product.targets.some(target => selectedPests.includes(target));
  });
}
