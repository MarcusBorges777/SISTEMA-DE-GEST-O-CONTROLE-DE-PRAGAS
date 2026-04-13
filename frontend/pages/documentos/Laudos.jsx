import React, { useState, useRef, useEffect } from 'react';
import { Mail, Phone, Globe, Shield, Droplets, Bug, ClipboardCheck, Calendar, Info, CheckCircle2, Upload, AlertTriangle, Edit3, ChevronDown, ChevronUp, X, Plus, Minus, Trash2, FileText, Archive, Save, Loader2, Search } from 'lucide-react';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { useProdutos } from '../../contexts/ProdutosContext';
import { salvarDocumento } from '../../utils/salvarDocumento';
import ClienteBusca from '../../components/shared/ClienteBusca';
import { buscarCNPJ } from '../../services/brasilApi';
import { getClientes, saveCliente } from '../../services/clienteCache';

export default function Laudos() {
  const [logo, setLogo] = useState(null);
  const fileInputRef = useRef(null);
  const [showEditor, setShowEditor] = useState(true);
  
  // Controle de quais documentos emitir
  const [showPestControl, setShowPestControl] = useState(true);
  const [showWaterTank, setShowWaterTank] = useState(true);
  const [showGreaseTrap, setShowGreaseTrap] = useState(false);

  // Novos estados para o Alvará Sanitário e Cadastro de Produtos
  const [alvaraImage, setAlvaraImage] = useState(null);
  const alvaraInputRef = useRef(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newProductError, setNewProductError] = useState("");
  const [newProduct, setNewProduct] = useState({
    nome: "", grupo: "", principio: "", registro: "", concentracao: "", diluente: "", equipamento: "", antidoto: "", targets: []
  });

  // Lista de pragas disponíveis para seleção
  const pestOptions = [
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

  // Base de dados de produtos agora em formato de Estado (para permitir salvar novos produtos)
  const [productsDb, setProductsDb] = useState({
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
      targets: ['escorpioes']
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
      targets: ['escorpioes']
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
      targets: ['mosquitos', 'baratas', 'formigas', 'moscas', 'pulgas', 'barbeiros', 'traças']
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
    },
    cyperex: {
      id: 'cyperex',
      nome: "CYPEREX® 250 CE",
      grupo: "Piretróides",
      principio: "Cipermetrina",
      registro: "3.0425.0046.001-0",
      concentracao: "5/1(ml/l) de calda",
      diluente: "Água",
      equipamento: "Pulverizador costal de 20 litros",
      antidoto: "Antídoto/Tratamento: Não há antídoto específico. Tratamento sintomático. Telefone de emergência 24h: 0800 014 11 49.",
      targets: ['baratas', 'formigas', 'moscas', 'mosquitos', 'pulgas', 'escorpioes', 'aranhas', 'carrapatos', 'percevejos', 'tracas']
    }
  });

  const [formData, setFormData] = useState({
    laudoNumero: "0001",
    dataExecucao: "2026-04-07", 
    garantiaMeses: 6,
    selectedPests: ['baratas', 'formigas'],
    observacao: "",
    reservatorios: [
        { quantidade: "01", tipo: "Caixa de Fibra", volume: "1.000 Litros", identificacao: "Água Potável" }
    ],
    caixasGordura: [
        { quantidade: "01", tipo: "Caixa de Alvenaria", volume: "100 Litros", identificacao: "Cozinha Principal" }
    ],
    responsaveis: "PAULO BORGES DE CASTRO e MARIA APARECIDA DE OLIVEIRA BORGES",
    alvara: "Nº 164/2025 (Venc: 03/07/2028)",
    cliente: {
      nome: "COOPRAFAD - Cooperativa dos Produtores da Agricultura Familiar de Divinopolis/MG e Região",
      fantasia: "COOPRAFAD",
      cnpj: "21.378.985/0001-63",
      endereco: "R. Adelino Gomes, Nº 525, Sala 02 - Bairro Interlagos - Divinópolis/MG",
      atividadeEconomica: "47.24-5-00 - Comércio varejista de hortifrutigranjeiros"
    }
  });

  const [productRows, setProductRows] = useState([]);

  // --- PRODUTOS CONTEXT: sincronização global ---
  const { produtos: produtosCtx, addProduto: addProdutoCtx } = useProdutos();

  useEffect(() => {
    if (!produtosCtx || produtosCtx.length === 0) return;
    setProductsDb(prev => {
      const merged = { ...prev };
      produtosCtx.forEach(p => {
        if (!merged[p.id]) merged[p.id] = p;
      });
      return merged;
    });
  }, [produtosCtx]);

  // --- Estado para salvar PDF ---
  const [salvandoPdf, setSalvandoPdf] = useState(false);

  // --- Gestão de clientes (localStorage) ---
  const [isLoadingCnpj, setIsLoadingCnpj] = useState(false);
  const [cnpjError, setCnpjError] = useState('');
  const [clientesSalvos, setClientesSalvos] = useState([]);

  // Carrega clientes salvos do localStorage na montagem
  useEffect(() => {
    setClientesSalvos(getClientes());
  }, []);

  // --- EMPRESA CONTEXT: auto-fill do cliente ---
  const { empresa: empresaCtx } = useEmpresa();
  useEffect(() => {
    if (!empresaCtx) return;
    setFormData(prev => ({
      ...prev,
      cliente: {
        nome: empresaCtx.nome || empresaCtx.fantasia || '',
        fantasia: empresaCtx.fantasia || '',
        cnpj: empresaCtx.cnpj || '',
        endereco: empresaCtx.endereco || '',
        atividadeEconomica: empresaCtx.atividade || '',
      }
    }));
  }, [empresaCtx]);

  // Auto-load logo e alvará do servidor
  useEffect(() => {
    fetch('/api/config/logo-mascote', { credentials: 'same-origin' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.logo) setLogo(data.logo);
        if (data?.alvara) setAlvaraImage(data.alvara);
      })
      .catch(() => {});
  }, []);

  // Lógica Inteligente de Atualização da Tabela de Produtos
  useEffect(() => {
    const generateSmartList = () => {
      const pests = formData.selectedPests || [];
      let tempRows = [];
      const addedMS = new Set(); 

      const addProduct = (productId) => {
        const prod = productsDb[productId];
        if (prod && !addedMS.has(prod.registro)) {
          tempRows.push(productId);
          addedMS.add(prod.registro);
        }
      };

      const hasEscorpiao = pests.includes('escorpioes');
      const hasGeneralInsects = pests.some(p => ['baratas', 'formigas', 'pulgas', 'moscas', 'tracas', 'mosquitos', 'barbeiros', 'aranhas', 'carrapatos', 'percevejos'].includes(p));

      if (hasEscorpiao) {
          addProduct('bifentol');
      }
      
      if (hasGeneralInsects) {
          addProduct('cyperex');
      }

      if (pests.includes('formigas')) {
          addProduct('formim');
      }
      if (pests.includes('ratos')) {
          addProduct('ratol');
      }
      if (pests.includes('cupins')) {
          addProduct('termigama');
      }

      return tempRows;
    };

    setProductRows(generateSmartList());
  }, [formData.selectedPests]);

  // Carrega o número do laudo salvo automaticamente ao iniciar
  useEffect(() => {
    const savedSequence = localStorage.getItem('laudoSequence');
    if (savedSequence) {
      setFormData(prev => ({ ...prev, laudoNumero: String(savedSequence).padStart(4, '0') }));
    }
  }, []);

  const getCompatibleProducts = () => {
    const pests = formData.selectedPests || [];
    if (pests.length === 0) return Object.values(productsDb);

    return Object.values(productsDb).filter(product => {
      if (!product.targets) return false;
      return product.targets.some(target => pests.includes(target));
    });
  };

  const addRow = () => {
    const compatibleProducts = getCompatibleProducts();
    // Filtra produtos que AINDA NÃO estão na tabela
    const availableProducts = compatibleProducts.filter(p => !productRows.includes(p.id));

    if (availableProducts.length > 0) {
      // Adiciona o primeiro produto compatível que estiver sobrando
      setProductRows([...productRows, availableProducts[0].id]);
    } else {
      // Se todos já estão na tabela, abre o modal de criação
      setShowConfirmModal(true);
    }
  };

  const toggleNewProductTarget = (pestId) => {
    setNewProduct(prev => {
        const current = prev.targets;
        if (current.includes(pestId)) {
            return { ...prev, targets: current.filter(p => p !== pestId) };
        } else {
            return { ...prev, targets: [...current, pestId] };
        }
    });
  };

  const handleSaveNewProduct = () => {
    if (!newProduct.nome.trim() || newProduct.targets.length === 0) return;
    
    // Verifica duplicidade de Nº MS
    const registroLimpo = (newProduct.registro || "").trim();
    if (registroLimpo && registroLimpo !== "-" && registroLimpo.toLowerCase() !== "isento") {
        const duplicate = Object.values(productsDb).find(p => p.registro === registroLimpo);
        if (duplicate) {
            setNewProductError(`Já existe um produto cadastrado com este Nº MS (${duplicate.nome}).`);
            return;
        }
    }
    
    const newId = 'prod_' + Date.now();
    
    const productToAdd = {
        id: newId,
        nome: newProduct.nome,
        grupo: newProduct.grupo || "-",
        principio: newProduct.principio || "-",
        registro: registroLimpo || "-",
        concentracao: newProduct.concentracao || "-",
        diluente: newProduct.diluente || "-",
        equipamento: newProduct.equipamento || "-",
        antidoto: newProduct.antidoto || "-",
        targets: newProduct.targets
    };
    
    // Salva na base de dados local e também persiste via API (context global)
    setProductsDb(prev => ({ ...prev, [newId]: productToAdd }));
    setProductRows(prev => [...prev, newId]);
    addProdutoCtx({ ...productToAdd }); // persiste no banco — async, sem bloquear UI
    setShowNewProductModal(false);
    setNewProduct({ nome: "", grupo: "", principio: "", registro: "", concentracao: "", diluente: "", equipamento: "", antidoto: "", targets: [] });
    setNewProductError("");
  };

  const removeRow = (index) => {
    const newRows = [...productRows];
    newRows.splice(index, 1);
    setProductRows(newRows);
  };

  const updateRow = (index, productId) => {
    const newRows = [...productRows];
    newRows[index] = productId;
    setProductRows(newRows);
  };

  const addReservatorio = () => {
    setFormData(prev => ({
        ...prev,
        reservatorios: [...(prev.reservatorios || []), { quantidade: "", tipo: "", volume: "", identificacao: "" }]
    }));
  };

  const updateReservatorio = (index, field, value) => {
    const newRes = [...(formData.reservatorios || [])];
    newRes[index] = { ...newRes[index], [field]: value };
    setFormData(prev => ({ ...prev, reservatorios: newRes }));
  };

  const removeReservatorio = (index) => {
    const newRes = [...(formData.reservatorios || [])];
    newRes.splice(index, 1);
    setFormData(prev => ({ ...prev, reservatorios: newRes }));
  };

  const addCaixaGordura = () => {
    setFormData(prev => ({
        ...prev,
        caixasGordura: [...(prev.caixasGordura || []), { quantidade: "", tipo: "", volume: "", identificacao: "" }]
    }));
  };

  const updateCaixaGordura = (index, field, value) => {
    const newRes = [...(formData.caixasGordura || [])];
    newRes[index] = { ...newRes[index], [field]: value };
    setFormData(prev => ({ ...prev, caixasGordura: newRes }));
  };

  const removeCaixaGordura = (index) => {
    const newRes = [...(formData.caixasGordura || [])];
    newRes.splice(index, 1);
    setFormData(prev => ({ ...prev, caixasGordura: newRes }));
  };

  const empresa = {
    razao: "MARIA APARECIDA DE OLIVEIRA BORGES",
    nome: "Dedetizadora Borges",
    cnpj: "10.409.228/0001-93",
    endereco: "RUA YARA, 701 – B. CENTRO IND CEL JOVELINO RABELO DIVINÓPOLIS/ MG – CEP 35502-289",
    contatos: "(37) 99964-4205",
    email: "dedetizadoraborges@yahoo.com.br",
    site: "dedetizadoraborges.com.br",
    alvara: formData.alvara, // vem do estado editável
    rt: "Maria Aparecida de Oliveira Borges",
    crq: "02404889 | ART 9.353",
    licencaAmbiental: "Protocolo: 59009480/2019"
  };

  const procedimentos = [
    "Feche o registro que manda água para o reservatório que será higienizado ou amarre a boia, para que não continue caindo água na caixa;",
    "Na caixa, deixe mais ou menos uns 10 centímetros d’água, para ser usada na limpeza;",
    "Tampe o cano de distribuição de água para a edificação, use um pano limpo ou uma rolha evitando assim que desça sujeira pelos canos;",
    "Esfregue as paredes da caixa com escova de cerdas plásticas, vassoura de cerda de plástico ou bucha macia para retirar as sujeiras, não use nenhum produto para remoção da sujeira;",
    "Remova a água suja com bomba de sucção;",
    "Enxague a caixa removendo o enxague com bomba de sucção; Fazer este processo até que a água do enxague esteja limpa;",
    "Por último enxague as paredes e o fundo da caixa com solução de água sanitária; Deixe agir por 30 minutos;",
    "Retire o pano ou rolha colocado no cano de distribuição d’água da caixa para a edificação;",
    "Confere se não ficou nada dentro da caixa;",
    "Abra o registro de água ou desamarre a boia;",
    "Libere a água para começar a encher a caixa.",
    "Fazer o teste da boia, para ver se a mesma está funcionando; Limpar a tampa da caixa por dentro e por fora;",
    "Tampar a caixa, verificar se está toda vedada;",
    "Pedir aos usuários para fazerem sangrias nas torneiras quando já houver água suficiente para o uso."
  ];

  const procedimentosGordura = [
    "Abertura cuidadosa da tampa da caixa de gordura;",
    "Remoção mecânica da camada sólida de gordura e resíduos flutuantes;",
    "Acondicionamento adequado dos resíduos retirados em sacos plásticos resistentes para descarte como resíduo sólido;",
    "Limpeza manual e escovação das paredes internas e defletores da caixa;",
    "Limpeza das tubulações de entrada e saída aparentes na caixa;",
    "Aplicação de solução desinfetante nas paredes internas;",
    "Verificação do fluxo de escoamento da água;",
    "Fechamento da tampa e limpeza da área externa ao redor da caixa."
  ];

  const getControlTypes = () => {
    const pests = formData.selectedPests || [];
    const hasRatos = pests.includes('ratos');
    const hasAnyPest = pests.length > 0;
    return {
        quimico: hasAnyPest, 
        naoQuimico: hasRatos 
    };
  };

  const formatDate = (isoDate) => {
    if (!isoDate) return "";
    const parts = isoDate.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const getExpiryDate = (baseDateIso, monthsToAdd) => {
    if (!baseDateIso) return "";
    const parts = baseDateIso.split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    date.setMonth(date.getMonth() + parseInt(monthsToAdd || 0));
    
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'cliente.cnpj') {
      // Máscara automática: 00.000.000/0000-00
      const digits = value.replace(/\D/g, '').slice(0, 14);
      const masked = digits
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
      setCnpjError('');
      setFormData(prev => ({ ...prev, cliente: { ...prev.cliente, cnpj: masked } }));
      return;
    }
    if (name.startsWith('cliente.')) {
        const field = name.split('.')[1];
        setFormData(prev => ({
            ...prev,
            cliente: { ...prev.cliente, [field]: value }
        }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Busca dados da empresa pela Brasil API usando o CNPJ digitado
  const handleBuscarCNPJ = async () => {
    const raw = formData.cliente.cnpj.replace(/\D/g, '');
    if (raw.length !== 14) {
      setCnpjError('Digite um CNPJ completo (14 dígitos).');
      return;
    }
    setCnpjError('');
    setIsLoadingCnpj(true);
    try {
      const dados = await buscarCNPJ(raw);
      setFormData(prev => ({
        ...prev,
        cliente: {
          nome: dados.nome || '',
          fantasia: dados.fantasia || '',
          cnpj: dados.cnpj || formData.cliente.cnpj,
          endereco: dados.endereco || '',
          atividadeEconomica: dados.atividade || '',
        }
      }));
    } catch (err) {
      setCnpjError(err.message || 'CNPJ não encontrado na Receita Federal.');
    } finally {
      setIsLoadingCnpj(false);
    }
  };

  // Salva o cliente atual no localStorage (cache local)
  const handleSalvarCliente = () => {
    const { nome, cnpj } = formData.cliente;
    if (!nome.trim() || !cnpj.trim()) {
      setCnpjError('Preencha ao menos Nome e CNPJ antes de salvar.');
      return;
    }
    saveCliente({
      nome: formData.cliente.nome,
      fantasia: formData.cliente.fantasia,
      cnpj: formData.cliente.cnpj,
      endereco: formData.cliente.endereco,
      atividade: formData.cliente.atividadeEconomica,
    });
    setClientesSalvos(getClientes());
    setCnpjError('');
  };

  const togglePest = (pestId) => {
    setFormData(prev => {
        const current = prev.selectedPests || [];
        if (current.includes(pestId)) {
            return { ...prev, selectedPests: current.filter(p => p !== pestId) };
        } else {
            return { ...prev, selectedPests: [...current, pestId] };
        }
    });
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAlvaraUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAlvaraImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrint = () => {
    if (!showPestControl && !showWaterTank && !showGreaseTrap) {
      alert("Selecione pelo menos um documento para impressão.");
      return;
    }

    // Incrementa automaticamente para o próximo laudo e salva no navegador
    const currentNum = parseInt(formData.laudoNumero, 10);
    if (!isNaN(currentNum)) {
       const nextNum = currentNum + 1;
       localStorage.setItem('laudoSequence', nextNum.toString());
    }

    window.print();
  };

  const handleSalvarPdf = async () => {
    if (!showPestControl && !showWaterTank && !showGreaseTrap) {
      alert("Selecione pelo menos um documento para salvar.");
      return;
    }
    setSalvandoPdf(true);
    try {
      const nomeEmpresa = formData.cliente?.nome || formData.cliente?.fantasia || 'Empresa';
      const result = await salvarDocumento({
        elementId: 'a4-document',
        tipo: 'laudo',
        numeroDoc: formData.laudoNumero || '0001',
        nomeEmpresa,
      });
      if (result.sucesso) {
        alert(`PDF salvo: ${result.nomeArquivo}`);
      } else {
        alert(`Erro ao salvar: ${result.erro}`);
      }
    } finally {
      setSalvandoPdf(false);
    }
  };

  const renderEditorPanel = () => (
    <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-4xl border border-blue-200 mb-8 no-print">
      <div className="flex justify-between items-center mb-6 border-b pb-2">
        <h3 className="font-bold text-lg text-blue-900 flex items-center gap-2">
          <Edit3 size={20} /> Editar Informações do Documento
        </h3>
        <button onClick={() => setShowEditor(!showEditor)} className="text-gray-500 hover:text-blue-700">
          {showEditor ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>
      
      {showEditor && (
        <div className="space-y-6">
            
            {/* SELEÇÃO DE DOCUMENTOS */}
            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                <h4 className="font-bold text-sm text-[#254191] uppercase tracking-wider mb-3 flex items-center gap-2">
                   <FileText size={16}/> Documentos a Emitir
                </h4>
                <div className="flex flex-col md:flex-row gap-3">
                    <button
                        onClick={() => setShowPestControl(!showPestControl)}
                        className={`flex-1 p-3 text-sm font-bold rounded-lg border transition-all flex items-center justify-center gap-2 ${
                            showPestControl
                            ? 'bg-[#254191] text-white border-blue-900 shadow-md'
                            : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        <Bug size={18} className={showPestControl ? 'text-blue-300' : 'text-gray-400'}/>
                        Controle de Pragas
                        {showPestControl && <CheckCircle2 size={16} className="ml-auto" />}
                    </button>
                    <button
                        onClick={() => setShowWaterTank(!showWaterTank)}
                        className={`flex-1 p-3 text-sm font-bold rounded-lg border transition-all flex items-center justify-center gap-2 ${
                            showWaterTank
                            ? 'bg-[#254191] text-white border-blue-900 shadow-md'
                            : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        <Droplets size={18} className={showWaterTank ? 'text-blue-300' : 'text-gray-400'}/>
                        Higienização (Caixa D'água)
                        {showWaterTank && <CheckCircle2 size={16} className="ml-auto" />}
                    </button>
                    <button
                        onClick={() => setShowGreaseTrap(!showGreaseTrap)}
                        className={`flex-1 p-3 text-sm font-bold rounded-lg border transition-all flex items-center justify-center gap-2 ${
                            showGreaseTrap
                            ? 'bg-[#254191] text-white border-blue-900 shadow-md'
                            : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        <Archive size={18} className={showGreaseTrap ? 'text-blue-300' : 'text-gray-400'}/>
                        Caixa de Gordura
                        {showGreaseTrap && <CheckCircle2 size={16} className="ml-auto" />}
                    </button>
                </div>
                {(!showPestControl && !showWaterTank && !showGreaseTrap) && (
                    <p className="text-red-500 text-xs mt-3 font-bold flex items-center gap-1 justify-center bg-red-50 p-2 rounded">
                        <AlertTriangle size={14} /> Atenção: Selecione pelo menos um documento para poder imprimir.
                    </p>
                )}
            </div>

            {/* SELEÇÃO DE PRAGAS (Aparece apenas se Pest Control estiver ativo) */}
            {showPestControl && (
                <div>
                    <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider border-b pb-1 mb-3">Seleção de Pragas e Vetores</h4>
                    <div className="flex flex-wrap gap-2">
                        {pestOptions.map(pest => (
                            <button
                                key={pest.id}
                                onClick={() => togglePest(pest.id)}
                                className={`flex-1 min-w-[100px] p-2 text-xs font-bold rounded border transition-all flex items-center justify-center gap-1 ${
                                    (formData.selectedPests || []).includes(pest.id)
                                    ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                }`}
                            >
                                {(formData.selectedPests || []).includes(pest.id) && <CheckCircle2 size={14} />}
                                {pest.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* DADOS GERAIS DO SERVIÇO E CLIENTE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-4">
                    <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider border-b pb-1">Dados Gerais</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Nº Laudo</label>
                            <div className="flex gap-1">
                                <input type="text" name="laudoNumero" value={formData.laudoNumero} onChange={handleInputChange} className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                <button 
                                    onClick={() => {
                                        const currentNum = parseInt(formData.laudoNumero, 10) || 1;
                                        setFormData(prev => ({ ...prev, laudoNumero: String(Math.max(1, currentNum - 1)).padStart(4, '0') }));
                                    }}
                                    className="p-2 bg-red-50 text-red-600 rounded border border-red-200 hover:bg-red-100 flex items-center justify-center transition-colors shrink-0"
                                    title="Voltar para o número anterior"
                                >
                                    <Minus size={16} />
                                </button>
                                <button 
                                    onClick={() => {
                                        const currentNum = parseInt(formData.laudoNumero, 10) || 0;
                                        setFormData(prev => ({ ...prev, laudoNumero: String(currentNum + 1).padStart(4, '0') }));
                                    }}
                                    className="p-2 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 flex items-center justify-center transition-colors shrink-0"
                                    title="Avançar para o próximo número"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                            <p className="text-[9px] text-gray-400 mt-1 italic">* Salva automaticamente ao imprimir.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Data Execução</label>
                            <input type="date" name="dataExecucao" value={formData.dataExecucao} onChange={handleInputChange} className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        {showPestControl && (
                          <div>
                              <label className="block text-xs font-bold text-gray-700 mb-1">Garantia Pragas (Meses)</label>
                              <div className="flex gap-1">
                                  <input type="number" name="garantiaMeses" value={formData.garantiaMeses} onChange={handleInputChange} className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                  <button 
                                      onClick={() => {
                                          const currentNum = parseInt(formData.garantiaMeses, 10) || 0;
                                          setFormData(prev => ({ ...prev, garantiaMeses: Math.max(0, currentNum - 1) }));
                                      }}
                                      className="p-2 bg-red-50 text-red-600 rounded border border-red-200 hover:bg-red-100 flex items-center justify-center transition-colors shrink-0"
                                      title="Diminuir meses de garantia"
                                  >
                                      <Minus size={16} />
                                  </button>
                                  <button 
                                      onClick={() => {
                                          const currentNum = parseInt(formData.garantiaMeses, 10) || 0;
                                          setFormData(prev => ({ ...prev, garantiaMeses: currentNum + 1 }));
                                      }}
                                      className="p-2 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 flex items-center justify-center transition-colors shrink-0"
                                      title="Aumentar meses de garantia"
                                  >
                                      <Plus size={16} />
                                  </button>
                              </div>
                          </div>
                        )}
                        {showPestControl && (
                          <div>
                              <label className="block text-xs font-bold text-gray-700 mb-1">Próxima Manutenção</label>
                              <input type="text" value={getExpiryDate(formData.dataExecucao, formData.garantiaMeses)} disabled className="w-full p-2 border rounded text-sm bg-gray-100 text-gray-500 cursor-not-allowed" />
                          </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider border-b pb-1">Dados do Cliente</h4>

                    {/* Importar cliente do sistema (backend) */}
                    <ClienteBusca
                      placeholder="Buscar cliente no sistema..."
                      onSelect={(c) => {
                        setCnpjError('');
                        setFormData(prev => ({
                          ...prev,
                          cliente: {
                            nome: c.razao_social || c.nome_fantasia || c.nome || '',
                            fantasia: c.nome_fantasia || c.fantasia || '',
                            cnpj: c.cnpj || '',
                            endereco: c.endereco_completo || c.endereco || [c.rua, c.numero, c.bairro, c.cidade, c.uf].filter(Boolean).join(', '),
                            atividadeEconomica: c.cnae || c.atividade || '',
                          }
                        }));
                      }}
                    />

                    {/* Carregar cliente salvo localmente + botão salvar */}
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-700 mb-1">Carregar Cliente Salvo</label>
                        <select
                          className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                          value=""
                          onChange={(e) => {
                            const c = clientesSalvos.find(x => x.cnpj === e.target.value);
                            if (c) {
                              setCnpjError('');
                              setFormData(prev => ({
                                ...prev,
                                cliente: {
                                  nome: c.nome,
                                  fantasia: c.fantasia,
                                  cnpj: c.cnpj,
                                  endereco: c.endereco,
                                  atividadeEconomica: c.atividade,
                                }
                              }));
                            }
                          }}
                        >
                          <option value="">-- selecione um cliente salvo --</option>
                          {clientesSalvos.map(c => (
                            <option key={c.cnpj} value={c.cnpj}>
                              {c.fantasia || c.nome} — {c.cnpj}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={handleSalvarCliente}
                        className="px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors flex items-center gap-1 shrink-0"
                        title="Salvar cliente atual no navegador"
                      >
                        <Plus size={14}/> Salvar Cliente
                      </button>
                    </div>

                    {/* Campos manuais */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Razão Social / Nome</label>
                        <input type="text" name="cliente.nome" value={formData.cliente.nome} onChange={handleInputChange} className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Nome Fantasia</label>
                        <input type="text" name="cliente.fantasia" value={formData.cliente.fantasia} onChange={handleInputChange} className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">CNPJ</label>
                            <div className="flex gap-1">
                              <input
                                type="text"
                                name="cliente.cnpj"
                                value={formData.cliente.cnpj}
                                onChange={handleInputChange}
                                maxLength={18}
                                placeholder="00.000.000/0000-00"
                                className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                              <button
                                onClick={handleBuscarCNPJ}
                                disabled={isLoadingCnpj}
                                className="px-3 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors shrink-0 disabled:opacity-60 flex items-center gap-1"
                                title="Buscar dados do CNPJ na Receita Federal"
                              >
                                {isLoadingCnpj ? <Loader2 size={14} className="animate-spin"/> : <Search size={14}/>}
                                {isLoadingCnpj ? 'Buscando...' : 'Buscar'}
                              </button>
                            </div>
                            {cnpjError && (
                              <p className="text-red-500 text-[10px] mt-1 font-bold flex items-center gap-1">
                                <AlertTriangle size={12}/> {cnpjError}
                              </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Cód. / Atividade Econômica</label>
                            <input type="text" name="cliente.atividadeEconomica" value={formData.cliente.atividadeEconomica} onChange={handleInputChange} className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Endereço</label>
                        <input type="text" name="cliente.endereco" value={formData.cliente.endereco} onChange={handleInputChange} className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                </div>
            </div>

            {/* RESERVATÓRIOS (Aparece apenas se Water Tank estiver ativo) */}
            {showWaterTank && (
                <div className="border-t pt-4 mt-2">
                    <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider border-b pb-1 mb-3">Reservatórios (Higienização)</h4>
                    
                    {(formData.reservatorios || []).map((res, idx) => (
                        <div key={`res-${idx}`} className="flex gap-2 mb-2 items-end bg-gray-50 p-2 rounded">
                            <div className="w-20">
                                <label className="block text-[10px] font-bold text-gray-500">Qtd</label>
                                <input type="text" value={res.quantidade} onChange={(e) => updateReservatorio(idx, 'quantidade', e.target.value)} className="w-full p-1 border rounded text-xs" placeholder="01" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-gray-500">Tipo</label>
                                <input type="text" value={res.tipo} onChange={(e) => updateReservatorio(idx, 'tipo', e.target.value)} className="w-full p-1 border rounded text-xs" placeholder="Caixa Fibra" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-gray-500">Volume</label>
                                <input type="text" value={res.volume} onChange={(e) => updateReservatorio(idx, 'volume', e.target.value)} className="w-full p-1 border rounded text-xs" placeholder="1000L" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-gray-500">Identificação</label>
                                <input type="text" value={res.identificacao} onChange={(e) => updateReservatorio(idx, 'identificacao', e.target.value)} className="w-full p-1 border rounded text-xs" placeholder="Água Potável" />
                            </div>
                            <button onClick={() => removeReservatorio(idx)} className="p-1.5 text-red-500 hover:bg-red-100 rounded mb-0.5"><Trash2 size={16}/></button>
                        </div>
                    ))}
                    
                    <button onClick={addReservatorio} className="text-xs flex items-center gap-1 text-blue-600 font-bold mt-2 hover:bg-blue-50 px-2 py-1 rounded">
                        <Plus size={14} /> Adicionar Reservatório
                    </button>
                </div>
            )}

            {/* CAIXAS DE GORDURA (Aparece apenas se Grease Trap estiver ativo) */}
            {showGreaseTrap && (
                <div className="border-t pt-4 mt-2">
                    <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider border-b pb-1 mb-3">Caixas de Gordura</h4>
                    
                    {(formData.caixasGordura || []).map((res, idx) => (
                        <div key={`cg-${idx}`} className="flex gap-2 mb-2 items-end bg-gray-50 p-2 rounded">
                            <div className="w-20">
                                <label className="block text-[10px] font-bold text-gray-500">Qtd</label>
                                <input type="text" value={res.quantidade} onChange={(e) => updateCaixaGordura(idx, 'quantidade', e.target.value)} className="w-full p-1 border rounded text-xs" placeholder="01" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-gray-500">Tipo</label>
                                <input type="text" value={res.tipo} onChange={(e) => updateCaixaGordura(idx, 'tipo', e.target.value)} className="w-full p-1 border rounded text-xs" placeholder="Alvenaria" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-gray-500">Volume</label>
                                <input type="text" value={res.volume} onChange={(e) => updateCaixaGordura(idx, 'volume', e.target.value)} className="w-full p-1 border rounded text-xs" placeholder="100L" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-gray-500">Identificação</label>
                                <input type="text" value={res.identificacao} onChange={(e) => updateCaixaGordura(idx, 'identificacao', e.target.value)} className="w-full p-1 border rounded text-xs" placeholder="Cozinha" />
                            </div>
                            <button onClick={() => removeCaixaGordura(idx)} className="p-1.5 text-red-500 hover:bg-red-100 rounded mb-0.5"><Trash2 size={16}/></button>
                        </div>
                    ))}
                    
                    <button onClick={addCaixaGordura} className="text-xs flex items-center gap-1 text-blue-600 font-bold mt-2 hover:bg-blue-50 px-2 py-1 rounded">
                        <Plus size={14} /> Adicionar Caixa de Gordura
                    </button>
                </div>
            )}

            {/* RESPONSÁVEIS & ALVARÁ SANITÁRIO */}
            <div className="mt-4 border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Responsáveis pela Execução</label>
                    <input
                        type="text"
                        name="responsaveis"
                        value={formData.responsaveis}
                        onChange={handleInputChange}
                        list="responsaveis-suggestions"
                        className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Nome dos responsáveis..."
                    />
                    <datalist id="responsaveis-suggestions">
                        <option value="MARIA APARECIDA DE OLIVEIRA BORGES" />
                        <option value="PAULO BORGES DE CASTRO" />
                        <option value="PAULO BORGES DE CASTRO e MARIA APARECIDA DE OLIVEIRA BORGES" />
                    </datalist>
                    <p className="text-[10px] text-gray-400 italic mt-1">* Comece a digitar para ver as sugestões.</p>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Alvará Sanitário (Cabeçalho)</label>
                    <input
                        type="text"
                        name="alvara"
                        value={formData.alvara}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Nº 164/2025 (Venc: 03/07/2028)"
                    />
                    <p className="text-[10px] text-gray-400 italic mt-1">* Editável para futuras atualizações.</p>
                </div>
            </div>

            {/* OBSERVAÇÕES (Aparece apenas se Pest Control estiver ativo) */}
            {showPestControl && (
                <div className="mt-4 border-t pt-4">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Observações Adicionais (Página Controle de Pragas)</label>
                    <textarea 
                        name="observacao" 
                        value={formData.observacao} 
                        onChange={handleInputChange} 
                        rows="2"
                        className="w-full p-2 border rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none min-h-[40px]" 
                        placeholder="Digite aqui alguma observação específica para sair no laudo de pragas... (Deixe em branco para ocultar)"
                    />
                </div>
            )}
        </div>
      )}
    </div>
  );

  const renderHeader = () => (
    <header className="flex justify-between items-start mb-6 border-b-2 border-[#254191] pb-4">
      <div className="flex items-center gap-4">
        <div 
          onClick={() => fileInputRef.current.click()}
          className={`w-60 h-24 flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-all hover:bg-gray-50 group no-print ${logo ? 'border-transparent' : 'border-blue-200 bg-blue-50/30'}`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleLogoUpload} 
            accept="image/*" 
            className="hidden" 
          />
          {logo ? (
            <img 
              src={logo} 
              alt="Logo da Empresa" 
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-center p-2">
              <Upload size={24} className="mx-auto text-blue-400 group-hover:text-blue-600 mb-1" />
              <p className="text-[10px] font-bold text-blue-500 uppercase leading-tight italic text-shadow-sm">Clique para carregar<br/>Sua Logo</p>
            </div>
          )}
        </div>
        
        <div className="hidden print:flex w-60 h-24 items-center justify-start overflow-hidden">
            {logo && <img src={logo} className="max-w-full max-h-full object-contain" alt="Logo Impressa" />}
        </div>
      </div>
      
      <div className="flex-1 text-right space-y-1 pl-4">
        <h1 className="text-sm font-black text-[#254191] uppercase leading-none tracking-tight">{empresa.razao}</h1>
        <div className="text-[9px] text-gray-600 font-medium leading-tight space-y-0.5">
            <p className="font-bold text-gray-700">{empresa.nome} | CNPJ: {empresa.cnpj}</p>
            <p className="italic">{empresa.endereco}</p>
            <div className="flex justify-end gap-3 text-blue-700 font-bold pt-1">
                 <span className="flex items-center gap-1"><Phone size={9} /> {empresa.contatos}</span>
                 <span className="flex items-center gap-1"><Mail size={9} /> {empresa.email}</span>
                 <span className="flex items-center gap-1"><Globe size={9} /> {empresa.site}</span>
            </div>
             <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[8px] text-gray-500 pt-2 mt-1 border-t border-blue-200 justify-items-end">
                <p>Alvará Sanitário: <span className="text-[#254191] font-bold">{empresa.alvara}</span></p>
                <p>Licença Ambiental: <span className="text-[#254191] font-bold">{empresa.licencaAmbiental}</span></p>
                <p>Responsável Técnico: <span className="text-[#254191] font-bold">{empresa.rt}</span></p>
                <p>CRQ / ART: <span className="text-[#254191] font-bold">{empresa.crq}</span></p>
            </div>
        </div>
      </div>
    </header>
  );

  const renderFooterInfo = () => (
    <div className="absolute bottom-6 left-0 right-0 text-center text-[8px] text-zinc-300 font-bold tracking-[0.4em] uppercase italic">
      {empresa.nome} • CNPJ: {empresa.cnpj}
    </div>
  );

  const renderClientSection = (className = "") => (
    <section className={`bg-blue-50/30 p-3 rounded-lg border border-blue-100 w-full shadow-sm ${className}`}>
      <h3 className="flex items-center gap-2 text-[#254191] font-bold uppercase text-[9px] mb-2 border-b border-blue-200 pb-1 italic">
        <Shield size={12} /> Cliente / Contratante
      </h3>
      <div className="text-[10px] space-y-1 text-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="font-black text-[#254191] uppercase text-xs leading-tight mb-1">{formData.cliente.nome}</p>
            <p><span className="font-bold uppercase text-[9px] tracking-tight text-blue-800">NOME FANTASIA:</span> {formData.cliente.fantasia}</p>
            <p><span className="font-bold uppercase text-[9px] tracking-tight text-blue-800">CNPJ:</span> {formData.cliente.cnpj}</p>
          </div>
          <div className="md:border-l md:border-blue-200 md:pl-4 space-y-2">
            <div>
              <p className="font-bold uppercase text-[9px] tracking-tighter text-blue-800">Código / Atividade Econômica Principal:</p>
              <p className="italic font-medium leading-tight">{formData.cliente.atividadeEconomica}</p>
            </div>
            <div className="pt-1 border-t border-blue-200">
              <p><span className="font-bold uppercase text-[9px] tracking-tight text-blue-800">Endereço:</span> {formData.cliente.endereco}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  const renderWarrantySection = (className = "mb-4", customMonths = null) => {
    const activeMonths = customMonths !== null ? customMonths : formData.garantiaMeses;
    const formattedMonths = String(activeMonths).padStart(2, '0');
    
    return (
        <section className={`${className} bg-[#254191] text-white py-3 px-5 rounded-lg flex justify-between items-center shadow-md border-b-4 border-blue-900/50`}>
        <div className="flex items-center gap-3">
            <div className="bg-white/10 p-1.5 rounded-md border border-white/20">
            <Calendar size={22} className="text-white" />
            </div>
            <div>
            <p className="text-[8px] uppercase font-bold text-blue-200 mb-0 tracking-wider opacity-80">Garantia Técnica do Serviço</p>
            <p className="text-lg font-black leading-none uppercase tracking-tight italic">{formattedMonths} Meses</p>
            </div>
        </div>
        <div className="text-right">
            <p className="text-[8px] uppercase font-bold text-blue-200 mb-0 tracking-wider opacity-80">Data da Próxima Manutenção</p>
            <p className="text-lg font-black italic leading-none tracking-tight">{getExpiryDate(formData.dataExecucao, activeMonths)}</p>
        </div>
        </section>
    );
  };

  const renderSignatureSection = () => (
    <div className="grid grid-cols-2 gap-12 mt-auto pb-4 pt-4 border-t border-dashed border-gray-200">
      <div className="text-center space-y-1">
        <p className="text-[8px] font-bold uppercase text-zinc-400 italic">Responsável Contratada</p>
        <p className="text-[10px] font-black uppercase text-[#254191] italic tracking-tight leading-none">Dedetizadora Borges</p>
      </div>
      <div className="text-center space-y-1">
        <p className="text-[8px] font-bold uppercase text-zinc-400 italic">Responsável Contratante</p>
        <p className="text-[10px] font-black uppercase text-zinc-800 tracking-tight leading-none">Assinatura / Carimbo</p>
      </div>
    </div>
  );

  return (
    <div id="a4-document" className="bg-zinc-200 py-10 print:py-0 print:bg-white flex flex-col print:block items-center gap-4 print:gap-0">
      
      {renderEditorPanel()}

      <div className="fixed bottom-6 right-6 z-50 no-print flex flex-col gap-3 items-end">
        <button
          onClick={handleSalvarPdf}
          disabled={salvandoPdf || (!showPestControl && !showWaterTank && !showGreaseTrap)}
          className={`${(!showPestControl && !showWaterTank && !showGreaseTrap) ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'} text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 transition-all transform hover:scale-105 font-bold disabled:opacity-60`}
        >
          {salvandoPdf ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          <span className="tracking-tight uppercase text-xs">Salvar PDF</span>
        </button>
        <button
          onClick={handlePrint}
          disabled={!showPestControl && !showWaterTank && !showGreaseTrap}
          className={`${(!showPestControl && !showWaterTank && !showGreaseTrap) ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#254191] hover:bg-blue-800'} text-white p-4 rounded-full shadow-2xl flex items-center gap-3 transition-all transform hover:scale-105 font-bold`}
        >
          <ClipboardCheck size={24} />
          <span className="pr-2 tracking-tight uppercase text-xs">Imprimir Documentos A4</span>
        </button>
      </div>

      {/* PÁGINA 1: LAUDO TÉCNICO PRAGAS */}
      {showPestControl && (
        <div className="a4-page relative bg-white shadow-2xl p-[15mm] flex flex-col print:shadow-none print:m-0 overflow-hidden">
          {renderHeader()}

          <div className="flex justify-between items-end mb-6">
            <h2 className="text-xl font-black text-[#254191] uppercase leading-none tracking-tight">
              COMPROVANTE DE EXECUÇÃO DE SERVIÇOS <br/>
              <span className="text-blue-500 text-sm font-bold tracking-widest uppercase italic text-shadow-sm">CONTROLE DE VETORES E PRAGAS URBANAS</span>
            </h2>
            <div className="text-right border-l-4 border-[#254191] pl-3">
               <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none tracking-tighter">Nº {formData.laudoNumero}</p>
               <p className="text-sm font-black text-gray-800 italic leading-tight">{formatDate(formData.dataExecucao)}</p>
            </div>
          </div>

          <div className="mb-4">
            {renderClientSection()}
          </div>

          <section className="mb-4">
            <div className="flex justify-between items-end mb-2 border-b-2 border-blue-600 pb-1">
              <div className="flex items-center gap-2 text-[#254191] font-bold uppercase text-[10px]">
                <Bug size={14} /> Detalhamento do Controle de Vetores e Pragas
              </div>
              <div className="flex gap-4 text-[9px] font-bold text-gray-700 pb-0.5">
                 <div className="flex items-center gap-1">
                   <div className={`w-3.5 h-3.5 border border-blue-800 flex items-center justify-center ${getControlTypes().quimico ? 'bg-blue-800' : 'bg-white'}`}>
                      {getControlTypes().quimico && <CheckCircle2 size={10} className="text-white" />}
                   </div>
                   <span className="uppercase">Controle Químico</span>
                 </div>
                 <div className="flex items-center gap-1">
                   <div className={`w-3.5 h-3.5 border border-blue-800 flex items-center justify-center ${getControlTypes().naoQuimico ? 'bg-blue-800' : 'bg-white'}`}>
                      {getControlTypes().naoQuimico && <CheckCircle2 size={10} className="text-white" />}
                   </div>
                   <span className="uppercase">Controle Não Químico</span>
                 </div>
              </div>
            </div>
            
            <div className="grid grid-cols-[repeat(auto-fit,minmax(90px,1fr))] w-full gap-1 mb-3 text-[8px] font-black uppercase text-center">
               {pestOptions.map(p => (
                 (formData.selectedPests || []).includes(p.id) && (
                  <div key={p.id} className="bg-[#254191] text-white py-1 rounded shadow-sm border-b-2 border-blue-900/50 flex items-center justify-center whitespace-nowrap px-1">
                    <span className="mr-1">✓</span> {p.label}
                  </div>
                 )
               ))}
            </div>

            <table className="w-full text-left border-collapse border border-gray-100 text-[9px]">
              <thead className="bg-blue-50 text-[#254191] uppercase font-black text-[8px]">
                <tr>
                  <th className="p-1 border text-center">Grupo Químico</th>
                  <th className="p-1 border">Princípio Ativo</th>
                  <th className="p-1 border text-center">Nº MS</th>
                  <th className="p-1 border text-center">Conc. de Uso</th>
                  <th className="p-1 border text-center">Diluente</th>
                  <th className="p-1 border">Equipamento</th>
                  <th className="p-1 border text-center w-6 no-print"></th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-700 italic font-medium leading-none">
                {productRows.map((prodKey, idx) => {
                  const prod = productsDb[prodKey];
                  const compatibleProducts = getCompatibleProducts();
                  
                  if (!prod) return null;

                  return (
                  <React.Fragment key={`prod-${idx}`}>
                      <tr className="group relative hover:bg-blue-50/50 transition-colors">
                          <td className="p-1 border text-center text-[8px] relative">
                              {prod.grupo}
                              <select 
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer no-print"
                                  value={prodKey}
                                  onChange={(e) => updateRow(idx, e.target.value)}
                                  title="Clique para trocar o produto"
                              >
                                  {compatibleProducts.map(p => (
                                      <option key={p.id} value={p.id}>
                                          {p.nome}
                                      </option>
                                  ))}
                              </select>
                          </td>
                          <td className="p-1 border font-bold uppercase not-italic relative">
                              {prod.principio}
                              <span className="block text-[7px] text-gray-400 font-normal no-print">{prod.nome}</span>
                          </td>
                          <td className="p-1 border text-center font-mono tracking-tighter text-[8px]">{prod.registro}</td>
                          <td className="p-1 border text-center text-[8px] italic">{prod.concentracao}</td>
                          <td className="p-1 border text-center">{prod.diluente}</td>
                          <td className="p-1 border">{prod.equipamento}</td>
                          <td className="p-0 border text-center no-print align-middle">
                              <button 
                                  onClick={() => removeRow(idx)}
                                  className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                                  title="Remover linha"
                              >
                                  <Trash2 size={12} />
                              </button>
                          </td>
                      </tr>
                      <tr>
                          <td colSpan="7" className="p-1 border text-[8px] italic text-zinc-600 bg-gray-50/50">
                              {prod.antidoto}
                          </td>
                      </tr>
                  </React.Fragment>
                )})}
              </tbody>
            </table>
            
            <div className="mt-2 text-center no-print">
              <button 
                  onClick={addRow}
                  className="text-xs flex items-center justify-center gap-1 mx-auto text-blue-600 hover:text-blue-800 font-bold py-1 px-3 rounded border border-blue-200 hover:bg-blue-50 transition-colors"
              >
                  <Plus size={12} /> Adicionar Produto
              </button>
            </div>
          </section>

          {/* SEÇÃO OBSERVAÇÕES (CONDICIONAL) */}
          {formData.observacao && (
            <section className="bg-zinc-50 py-1.5 px-3 rounded-lg border border-zinc-200 mb-2 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1.5 h-full bg-zinc-400 opacity-50"></div>
               <div className="flex items-center gap-2 font-black uppercase mb-0.5 border-b border-zinc-200 pb-0.5 text-zinc-600 text-[9px] tracking-tight italic">
                 <Info size={12} className="shrink-0" /> Observações
               </div>
               <p className="text-[8px] text-zinc-700 leading-[1.1] font-bold italic whitespace-pre-wrap">
                 {formData.observacao}
               </p>
            </section>
          )}

          {/* SEÇÃO RECOMENDAÇÕES (AGORA VEM ANTES DA GARANTIA) */}
          <section className="bg-[#fff5f5] py-2 px-4 rounded-lg border border-[#fee2e2] mb-3 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#a02c2c] opacity-10"></div>
            <div className="flex items-center gap-2 font-black uppercase mb-1 border-b border-red-100 pb-1 text-[#a02c2c] text-[10px] tracking-tight italic">
              <Info size={14} className="shrink-0" /> RECOMENDAÇÕES E SEGURANÇA (ANVISA)
            </div>
            <div className="text-[9px] text-[#6d2020] leading-[1.1] italic font-bold space-y-1">
              <p>• Em anexo alvará sanitário.</p>
              <p className="text-justify leading-[1.1]">
                • Não permaneçam pessoas nos locais no momento da desinsetização. Cuidados com crianças e animais. 
                Recomenda-se aguardar pelo menos 12 horas antes de reocupar o espaço e mantenha o local com uma boa ventilação. 
                Limpeza leve das superfícies.
              </p>
              <div className="pt-1 border-t border-red-100/50 mt-1">
                 <p className="font-black text-[#a02c2c] not-italic text-[9px] uppercase tracking-tighter leading-snug">
                  • Nº de telefone no caso de intoxicação: ANVISA – Disque intoxicação - SERVIÇO DE TOXICOLOGIA DE MG: 
                  <span className="block text-[10px] mt-0.5">0800-722-6001 / (31) 3224-4000 / (31) 3239-9308 / (31) 3239-9223</span>
                </p>
              </div>
            </div>
          </section>

          {/* SEÇÃO GARANTIA PÁGINA 1 */}
          {renderWarrantySection("mb-4")}

          {renderSignatureSection()}
          {renderFooterInfo()}
        </div>
      )}

      {/* PÁGINA 2: CERTIFICADO HIGIENIZAÇÃO DE CAIXA D'ÁGUA */}
      {showWaterTank && (
        <div className={`a4-page relative bg-white shadow-2xl p-[15mm] flex flex-col print:shadow-none print:m-0 overflow-hidden ${showPestControl ? 'print:page-break' : ''}`}>
          {renderHeader()}

          <div className="flex justify-between items-end mb-6">
            <h2 className="text-xl font-black text-[#254191] uppercase leading-none tracking-tight">
              Certificado de Higienização <br/>
              <span className="text-blue-500 text-sm font-bold tracking-widest uppercase italic text-shadow-sm">Reservatórios de Água</span>
            </h2>
            <div className="text-right border-l-4 border-blue-500 pl-3">
               <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none tracking-tighter">Nº {formData.laudoNumero}</p>
               <p className="text-sm font-black text-gray-800 italic leading-tight">{formatDate(formData.dataExecucao)}</p>
            </div>
          </div>

          <div className="mb-4">
            {renderClientSection()}
          </div>

          <section className="mb-4 bg-blue-50/30 p-4 rounded-lg border border-blue-100 shadow-sm">
            <p className="font-bold text-[#254191] uppercase text-[9px] mb-2 flex items-center gap-2 italic border-b border-blue-200 pb-1">
              <Droplets size={12} /> Especificações do Serviço
            </p>
            
            <div className="text-[9px] text-zinc-700 leading-tight"> 
              
              <p className="mb-2 italic">
                <span className="font-bold text-blue-800">ESPECIFICA-SE:</span> A higienização da caixa d’água é o processo de retirada de matéria depositada ou em suspensão no reservatório de água potável.
              </p>

              <div className="mb-2 pl-2 border-l-2 border-blue-300">
                <p className="font-bold text-blue-800 mb-0.5">Lavagem e higienização dos reservatórios de d’água:</p>
                {(formData.reservatorios || []).map((res, index) => (
                  <p key={`list-res-${index}`} className="leading-tight">
                    • {res.quantidade} {res.tipo} de {res.volume} cada ({res.identificacao})
                  </p>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-2 pt-2 border-t border-blue-200">
                <div className="space-y-1 border-r border-blue-200 pr-2">
                  <p className="leading-none"><span className="font-bold text-blue-800">PRODUTO:</span> Qboa (Hipoclorito de Sódio 2.0% a 2.5%)</p>
                  <p className="leading-none"><span className="font-bold text-blue-800">FINALIDADE:</span> Limpeza física e desinfeção bacteriológica.</p>
                </div>
                <div className="space-y-1 pl-2">
                  <p className="leading-none"><span className="font-bold text-blue-800">Dosagem Técnica:</span> Solução técnica concentrada 1/5.</p>
                  <p className="leading-none"><span className="font-bold text-blue-800">CONCENTRAÇÃO:</span> Teor de cloro ativo: 2,0% a 2,5% - Reg.MS 3.1940.0002.003-7</p>
                </div>
              </div>

              <p className="pt-2 border-t border-blue-200 leading-tight">
                <span className="font-bold text-blue-800">Responsáveis pela execução do serviço:</span> {formData.responsaveis}.
              </p>
            </div>
          </section>

          <section className="mb-4 overflow-hidden">
            <div className="flex items-center gap-2 text-[#254191] font-bold uppercase text-[10px] mb-2 border-b border-blue-200 pb-1 italic">
              <ClipboardCheck size={14} /> Protocolo Técnico Operacional Realizado
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-0">
              {procedimentos.map((step, index) => (
                <div key={`proc-${index}`} className="flex items-start gap-1 bg-zinc-50/50 p-[2px] rounded border border-zinc-100 transition-colors hover:bg-zinc-100 mb-0.5">
                  <span className="text-[#254191] font-black text-[9px] min-w-[12px] text-right mr-1 leading-[0.9]">
                    {index + 1}.
                  </span>
                  <p className="text-[8px] leading-[0.95] text-zinc-700 font-bold italic tracking-tight text-justify">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="bg-red-50 border border-red-200 py-3 px-3 rounded-lg mb-4 flex items-center justify-start gap-3 shadow-sm">
              <AlertTriangle size={16} className="text-[#a02c2c] shrink-0" />
              <div className="flex items-center gap-2 flex-wrap leading-none">
                  <span className="font-bold text-[#a02c2c] text-[8px] uppercase tracking-tight whitespace-nowrap">
                      Nº DE TELEFONE NO CASO DE INTOXICAÇÃO: ANVISA – DISQUE INTOXICAÇÃO
                  </span>
                  <span className="text-red-300 font-light hidden md:inline">|</span>
                  <span className="font-black text-[#a02c2c] text-[8px] uppercase tracking-tight">
                      SERVIÇO DE TOXICOLOGIA DE MG: 0800-722-6001 / (31) 3224-4000 / (31) 3239-9308
                  </span>
              </div>
          </div>

          {/* Garantia fixada em 6 meses para caixa d'água */}
          {renderWarrantySection("mb-4", 6)}

          {renderSignatureSection()}
          {renderFooterInfo()}
        </div>
      )}

      {/* PÁGINA 3: CERTIFICADO CAIXA DE GORDURA */}
      {showGreaseTrap && (
        <div className={`a4-page relative bg-white shadow-2xl p-[15mm] flex flex-col print:shadow-none print:m-0 overflow-hidden ${(showPestControl || showWaterTank) ? 'print:page-break' : ''}`}>
          {renderHeader()}

          <div className="flex justify-between items-end mb-6">
            <h2 className="text-xl font-black text-[#254191] uppercase leading-none tracking-tight">
              Certificado de Limpeza <br/>
              <span className="text-blue-500 text-sm font-bold tracking-widest uppercase italic text-shadow-sm">Caixas de Gordura</span>
            </h2>
            <div className="text-right border-l-4 border-blue-500 pl-3">
               <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none tracking-tighter">Nº {formData.laudoNumero}</p>
               <p className="text-sm font-black text-gray-800 italic leading-tight">{formatDate(formData.dataExecucao)}</p>
            </div>
          </div>

          <div className="mb-4">
            {renderClientSection()}
          </div>

          <section className="mb-4 bg-blue-50/30 p-4 rounded-lg border border-blue-100 shadow-sm">
            <p className="font-bold text-[#254191] uppercase text-[9px] mb-2 flex items-center gap-2 italic border-b border-blue-200 pb-1">
              <Archive size={12} /> Especificações do Serviço
            </p>
            
            <div className="text-[9px] text-zinc-700 leading-tight"> 
              
              <p className="mb-2 italic">
                <span className="font-bold text-blue-800">ESPECIFICA-SE:</span> A limpeza de caixa de gordura é o processo de retirada de resíduos sólidos e gordura depositada, garantindo o bom escoamento e evitando entupimentos.
              </p>

              <div className="mb-2 pl-2 border-l-2 border-blue-300">
                <p className="font-bold text-blue-800 mb-0.5">Limpeza e higienização das caixas de gordura:</p>
                {(formData.caixasGordura || []).map((res, index) => (
                  <p key={`list-cg-${index}`} className="leading-tight">
                    • {res.quantidade} {res.tipo} de {res.volume} cada ({res.identificacao})
                  </p>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-2 pt-2 border-t border-blue-200">
                <div className="space-y-1 border-r border-blue-200 pr-2">
                  <p className="leading-none"><span className="font-bold text-blue-800">PRODUTO UTILIZADO:</span> Água sanitária (composição: hipoclorito de sódio e água)</p>
                  <p className="leading-none mt-2"><span className="font-bold text-blue-800">QUANTIDADE UTILIZADA:</span> 1 litro de água sanitária.</p>
                </div>
                <div className="space-y-1 pl-2">
                  <p className="leading-none"><span className="font-bold text-blue-800">CONCENTRAÇÃO:</span> Teor de cloro ativo: 2,0% a 2,5% - Reg.MS 3.1940.0002.003-7</p>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-blue-200 bg-blue-50 p-2 rounded">
                <p className="font-bold text-blue-800 mb-1">ORIENTAÇÕES:</p>
                <p className="italic leading-[1.2] text-justify">
                  As caixas de gorduras devem ser limpas num intervalo menor, ou seja, de no mínimo uma vez por semana. Usar água sanitária para desinfecção. 
                  Mantenha se atento a esse procedimento evitando que as água jogadas pelas pias e tanques entupam as tubulações, causando transbordamento e mau cheiro ao estabelecimento. 
                  Caixas de gordura sujas atraem insetos indesejáveis.
                </p>
              </div>

              <p className="pt-2 mt-2 border-t border-blue-200 leading-tight">
                <span className="font-bold text-blue-800">Responsáveis pela execução do serviço:</span> {formData.responsaveis}.
              </p>
            </div>
          </section>

          <section className="mb-4 overflow-hidden">
            <div className="flex items-center gap-2 text-[#254191] font-bold uppercase text-[10px] mb-2 border-b border-blue-200 pb-1 italic">
              <ClipboardCheck size={14} /> Protocolo Técnico Operacional Realizado
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-0">
              {procedimentosGordura.map((step, index) => (
                <div key={`proc-cg-${index}`} className="flex items-start gap-1 bg-zinc-50/50 p-[2px] rounded border border-zinc-100 transition-colors hover:bg-zinc-100 mb-0.5">
                  <span className="text-[#254191] font-black text-[9px] min-w-[12px] text-right mr-1 leading-[0.9]">
                    {index + 1}.
                  </span>
                  <p className="text-[8px] leading-[0.95] text-zinc-700 font-bold italic tracking-tight text-justify">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {renderWarrantySection("mb-4", 6)}

          {renderSignatureSection()}
          {renderFooterInfo()}
        </div>
      )}

      {/* PÁGINA 4A: PROMPT DE UPLOAD — só na tela, nunca imprime */}
      {!alvaraImage && (
        <div className="a4-page relative bg-white shadow-2xl flex flex-col items-center justify-center overflow-hidden no-print">
          <div
            onClick={() => alvaraInputRef.current.click()}
            className="w-full h-full flex flex-col items-center justify-center border-4 border-dashed border-gray-200 m-[15mm] rounded-2xl cursor-pointer hover:bg-blue-50/50 transition-colors group p-10 text-center"
            style={{ width: 'calc(100% - 30mm)', height: 'calc(100% - 30mm)' }}
          >
            <input
              type="file"
              ref={alvaraInputRef}
              onChange={handleAlvaraUpload}
              accept="image/*"
              className="hidden"
            />
            <div className="bg-white p-6 rounded-full shadow-sm mb-6 group-hover:scale-110 transition-transform">
              <Upload size={64} className="text-blue-300 group-hover:text-blue-600 transition-colors" />
            </div>
            <h2 className="text-3xl font-black text-gray-400 group-hover:text-blue-800 uppercase tracking-tight transition-colors">Anexar Alvará Sanitário</h2>
            <p className="text-gray-400 mt-4 text-base max-w-md">
              Clique para adicionar uma imagem <strong className="text-gray-600">(JPG ou PNG)</strong> do seu Alvará Sanitário escaneado.
            </p>
            <p className="text-red-400 mt-4 text-xs font-bold uppercase tracking-widest">
              * Esta página não será impressa se estiver vazia.
            </p>
          </div>
        </div>
      )}

      {/* PÁGINA 4B: ALVARÁ COM IMAGEM — só existe no DOM quando há imagem, sempre imprime */}
      {alvaraImage && (
        <div className={`a4-page relative bg-white shadow-2xl flex flex-col items-center justify-center print:shadow-none print:m-0 overflow-hidden ${(showPestControl || showWaterTank || showGreaseTrap) ? 'print:page-break' : ''}`}>
          <div className="absolute inset-0 w-full h-full group p-2 print:p-0 bg-white">
            <img
              src={alvaraImage}
              alt="Alvará Sanitário Anexado"
              className="w-full h-full object-contain object-center"
            />
            <button
              onClick={() => setAlvaraImage(null)}
              className="absolute top-6 right-6 z-10 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-all no-print flex items-center gap-2 font-bold text-sm transform hover:scale-105"
              title="Remover Alvará"
            >
              <Trash2 size={16} /> Remover Anexo
            </button>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO NOVO PRODUTO */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 no-print">
           <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-[#254191] mb-2 flex items-center gap-2">
                 <AlertTriangle className="text-yellow-500" /> Limite de Produtos
              </h3>
              <p className="text-gray-600 text-sm mb-6">
                 Todos os produtos compatíveis com as pragas selecionadas já estão na tabela. Deseja cadastrar um novo produto no sistema?
              </p>
              <div className="flex justify-end gap-3">
                 <button onClick={() => setShowConfirmModal(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded transition-colors">Cancelar</button>
                 <button onClick={() => { 
                    setShowConfirmModal(false); 
                    setNewProduct(prev => ({ ...prev, targets: formData.selectedPests || [] }));
                    setNewProductError("");
                    setShowNewProductModal(true); 
                 }} className="px-4 py-2 text-sm font-bold bg-[#254191] text-white hover:bg-blue-800 rounded transition-colors">Cadastrar Novo Produto</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL CADASTRAR NOVO PRODUTO */}
      {showNewProductModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 no-print">
           <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                 <h3 className="text-lg font-bold text-[#254191] flex items-center gap-2"><Plus size={20}/> Cadastrar Novo Produto</h3>
                 <button onClick={() => setShowNewProductModal(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={20}/></button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                 <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nome Comercial do Produto *</label>
                    <input type="text" value={newProduct.nome} onChange={(e) => setNewProduct({...newProduct, nome: e.target.value})} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: K-Othrine WG 250" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Grupo Químico</label>
                    <input type="text" value={newProduct.grupo} onChange={(e) => setNewProduct({...newProduct, grupo: e.target.value})} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Piretróides" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Princípio Ativo</label>
                    <input type="text" value={newProduct.principio} onChange={(e) => setNewProduct({...newProduct, principio: e.target.value})} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Deltametrina" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nº Registro MS</label>
                    <input type="text" value={newProduct.registro} onChange={(e) => setNewProduct({...newProduct, registro: e.target.value})} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: 3.2398.0019" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Concentração de Uso</label>
                    <input type="text" value={newProduct.concentracao} onChange={(e) => setNewProduct({...newProduct, concentracao: e.target.value})} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: 5ml/L de calda" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Diluente</label>
                    <input type="text" value={newProduct.diluente} onChange={(e) => setNewProduct({...newProduct, diluente: e.target.value})} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Água" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Equipamento</label>
                    <input type="text" value={newProduct.equipamento} onChange={(e) => setNewProduct({...newProduct, equipamento: e.target.value})} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Pulverizador costal" />
                 </div>
                 <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Antídoto / Tratamento</label>
                    <textarea value={newProduct.antidoto} onChange={(e) => setNewProduct({...newProduct, antidoto: e.target.value})} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" rows="2" placeholder="Descreva os procedimentos em caso de intoxicação..."></textarea>
                 </div>
                 
                 <div className="col-span-1 md:col-span-2 border-t pt-3 mt-1">
                    <label className="block text-xs font-bold text-gray-700 mb-2">Pragas Combatidas por este Produto *</label>
                    <div className="flex flex-wrap gap-2">
                        {pestOptions.map(pest => (
                            <button
                                key={`np-${pest.id}`}
                                onClick={() => toggleNewProductTarget(pest.id)}
                                className={`px-3 py-1.5 text-xs font-bold rounded border transition-all flex items-center justify-center gap-1 ${
                                    newProduct.targets.includes(pest.id)
                                    ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                }`}
                            >
                                {newProduct.targets.includes(pest.id) && <CheckCircle2 size={12} />}
                                {pest.label}
                            </button>
                        ))}
                    </div>
                    {newProduct.targets.length === 0 && <p className="text-[10px] text-red-500 mt-1">* Selecione pelo menos uma praga para salvar o produto.</p>}
                 </div>

                 {newProductError && (
                    <div className="col-span-1 md:col-span-2 bg-red-50 border border-red-200 text-red-600 p-3 rounded text-xs font-bold flex items-center gap-2">
                       <AlertTriangle size={16} className="shrink-0" /> {newProductError}
                    </div>
                 )}
              </div>
              
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                 <button onClick={() => setShowNewProductModal(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded transition-colors">Cancelar</button>
                 <button 
                    onClick={handleSaveNewProduct}
                    disabled={!newProduct.nome.trim() || newProduct.targets.length === 0}
                    className={`px-4 py-2 text-sm font-bold text-white rounded transition-colors ${(!newProduct.nome.trim() || newProduct.targets.length === 0) ? 'bg-blue-300 cursor-not-allowed' : 'bg-[#254191] hover:bg-blue-800'}`}>
                    Salvar e Adicionar
                 </button>
              </div>
           </div>
        </div>
      )}

      <style>{`
        .a4-page {
          width: 210mm;
          height: 297mm;
          min-height: 297mm;
          position: relative;
        }

        .text-shadow-sm {
          text-shadow: 1px 1px 2px rgba(0,0,0,0.05);
        }

        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          /* Reset absoluto — body, html, root não podem ter altura de viewport */
          html, body, #root, #root > div {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Zera margin-left do wrapper do sidebar (inline style tem precedência — precisa !important) */
          div[style*="margin-left"],
          div[style*="marginLeft"] {
            margin-left: 0 !important;
          }

          /* Remove padding do main */
          main { padding: 0 !important; }

          /* Esconde sidebar e drawer — NÃO esconde header pois o documento usa <header> internamente */
          nav, aside { display: none !important; }

          /* Garante que o header do documento A4 seja exibido na impressão */
          #a4-document header {
            display: flex !important;
          }

          /* Logo: esconde o botão de upload (no-print) e exibe a versão de impressão */
          #a4-document .no-print { display: none !important; }
          #a4-document .print\\:flex { display: flex !important; }

          /* Wrapper do componente Laudos */
          #a4-document {
            height: auto !important;
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            gap: 0 !important;
            display: block !important;
            background: white !important;
          }

          .no-print { display: none !important; }

          .a4-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 15mm !important;
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            page-break-inside: avoid;
            page-break-after: always;
          }

          /* Última página visível NÃO cria folha em branco */
          .a4-page:last-of-type,
          .a4-page:last-child {
            page-break-after: avoid !important;
          }

          .print\\:page-break {
            page-break-before: always !important;
          }
        }
      `}</style>
    </div>
  );
}