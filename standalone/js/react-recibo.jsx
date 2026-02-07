/**
 * Gerador de Recibos - React Component
 * Modelo profissional A4 para impressão/PDF
 * Integrado com API de clientes do sistema
 */

const { useState, useRef, useEffect } = React;

// Ícones SVG inline (substituindo lucide-react)
const Icons = {
  Trash2: ({ size = 16, className = '' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
  ),
  Plus: ({ size = 16, className = '' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
  ),
  Printer: ({ size = 16, className = '' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
  ),
  ImageIcon: ({ size = 16, className = '' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
  ),
  Globe: ({ size = 16, className = '' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
  ),
  Mail: ({ size = 16, className = '' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
  ),
  Phone: ({ size = 16, className = '' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
  ),
  User: ({ size = 16, className = '' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  ),
  MapPin: ({ size = 16, className = '' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
  ),
  Briefcase: ({ size = 16, className = '' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
  ),
  Hash: ({ size = 16, className = '' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>
  ),
  Search: ({ size = 16, className = '' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
  ),
  Save: ({ size = 16, className = '' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
  ),
  WhatsApp: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  ),
};

const ReceiptApp = () => {
  // --- DADOS DO RECIBO ---
  const [receiptNumber, setReceiptNumber] = useState('00001');
  const [date, setDate] = useState(new Date().toLocaleDateString('pt-BR'));

  // --- DADOS DO PAGADOR (CLIENTE) ---
  const [clientData, setClientData] = useState({
    nome: '',
    fantasia: '',
    cnpj: '',
    endereco: '',
    atividade: '',
    telefone: '',
    email: '',
    clienteId: null
  });

  // --- BUSCA DE CLIENTES ---
  const [clientSearch, setClientSearch] = useState('');
  const [clientResults, setClientResults] = useState([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const searchTimeout = useRef(null);

  // --- STATUS DO BANCO DE DADOS ---
  const [dbStatus, setDbStatus] = useState('checking'); // 'checking', 'connected', 'offline'
  const [totalClientes, setTotalClientes] = useState(0);
  const [lastRecibos, setLastRecibos] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Verificar conexão com banco e carregar imagens ao iniciar
  useEffect(() => {
    checkDbConnection();
    loadLastReceiptNumber();
    loadRecentRecibos();
    loadSavedImages();
  }, []);

  // Carregar logo e mascote salvos no servidor
  const loadSavedImages = async () => {
    try {
      const [logoRes, mascotRes] = await Promise.all([
        fetch('/api/empresa/logo'),
        fetch('/api/empresa/mascote')
      ]);
      if (logoRes.ok) {
        const data = await logoRes.json();
        if (data.url) setLogo(data.url);
      }
      if (mascotRes.ok) {
        const data = await mascotRes.json();
        if (data.url) setMascot(data.url);
      }
    } catch { /* ignorar se offline */ }
  };

  // Salvar imagem no servidor ao fazer upload
  const uploadImageToServer = async (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`/api/empresa/${type}`, { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        return data.url;
      }
    } catch { /* ignorar */ }
    return null;
  };

  const checkDbConnection = async () => {
    try {
      const res = await fetch('/api/clientes?busca=_test_connection_&per_page=1');
      if (res.ok) {
        setDbStatus('connected');
        // Buscar total de clientes
        const res2 = await fetch('/api/clientes?page=1&per_page=1');
        if (res2.ok) {
          const data = await res2.json();
          if (data.pagination) setTotalClientes(data.pagination.total);
        }
      } else {
        setDbStatus('offline');
      }
    } catch {
      setDbStatus('offline');
    }
  };

  const loadLastReceiptNumber = async () => {
    try {
      const res = await fetch('/api/documentos-gerados?tipo=RECIBO&limit=1');
      if (res.ok) {
        const data = await res.json();
        const docs = Array.isArray(data) ? data : (data.documentos || []);
        if (docs.length > 0) {
          // Extrair número e incrementar
          const lastNum = parseInt(docs.length) || 0;
          setReceiptNumber(String(lastNum + 1).padStart(5, '0'));
        }
      }
    } catch { /* ignorar se não conseguir */ }
  };

  const loadRecentRecibos = async () => {
    try {
      const res = await fetch('/api/documentos-gerados?tipo=RECIBO&limit=10');
      if (res.ok) {
        const data = await res.json();
        setLastRecibos(Array.isArray(data) ? data.slice(0, 10) : (data.documentos || []).slice(0, 10));
      }
    } catch { /* ignorar */ }
  };

  // --- DADOS DA EMPRESA (RECEBEDOR) ---
  const empresa = {
    razao: "MARIA APARECIDA DE OLIVEIRA BORGES",
    nome: "Dedetizadora Borges",
    cnpj: "10.409.228/0001-93",
    endereco: "RUA YARA, 701 \u2013 B. CENTRO IND CEL JOVELINO RABELO DIVIN\u00d3POLIS/ MG \u2013 CEP 35502-289",
    whatsapp: "(37) 99964-4205",
    fixo: "(37) 3214-7599",
    email: "dedetizadoraborges@yahoo.com.br",
    site: "dedetizadoraborges.com.br",
    alvara: "N\u00ba 164/2025 (Venc: 03/07/2028)",
    licenca: "Dispensa Protocolo: 59009480/2019",
    rt: "Maria Aparecida de Oliveira Borges",
    crq: "02404889 | ART 9.353"
  };

  // --- ESTADOS DAS IMAGENS ---
  const [logo, setLogo] = useState(null);
  const [mascot, setMascot] = useState(null);

  // --- CONFIGURAÇÕES FIXAS DAS IMAGENS ---
  const mascotConfig = { height: 360, x: -15, y: 225, opacity: 0.15 };

  // --- ITENS E TEXTOS ---
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro, Pix, Cart\u00e3o de credito (cont\u00e9m juros)');
  const [terms, setTerms] = useState('Declaramos para os devidos fins que recebemos a import\u00e2ncia acima discriminada, dando plena, rasa e geral quita\u00e7\u00e3o.');

  const [items, setItems] = useState([
    { id: 1, service: 'Dedetiza\u00e7\u00e3o', description: 'Servi\u00e7o realizado conforme contratado', quantity: 1, value: 0 },
  ]);

  // --- STATUS DE SALVAMENTO ---
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const fileInputLogo = useRef(null);
  const fileInputMascot = useRef(null);

  // Cálculo do total
  const total = items.reduce((acc, item) => {
    const qty = item.quantity === '' ? 0 : parseFloat(item.quantity);
    const val = parseFloat(item.value) || 0;
    return acc + (val * (isNaN(qty) ? 0 : qty));
  }, 0);

  // --- BUSCA DE CLIENTES NA API ---
  const searchClients = async (query) => {
    if (query.length < 2) {
      setClientResults([]);
      setShowClientDropdown(false);
      return;
    }
    try {
      // Busca no banco local (nome, razão social, CNPJ)
      const res = await fetch(`/api/clientes?busca=${encodeURIComponent(query)}`);
      const data = await res.json();
      const clients = Array.isArray(data) ? data : (data.data || data.clientes || []);
      setClientResults(clients.slice(0, 10));
      setShowClientDropdown(clients.length > 0);
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
      setDbStatus('offline');
    }
  };

  // Busca por CNPJ na Receita Federal
  const searchByCNPJ = async (cnpj) => {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) return;
    try {
      setSaveMessage('Consultando CNPJ na Receita Federal...');
      const res = await fetch(`/api/cnpj/autocomplete?q=${cleanCnpj}`);
      if (res.ok) {
        const data = await res.json();
        const results = data.resultados || data.results || data;
        if (Array.isArray(results) && results.length > 0) {
          const emp = results[0];
          setClientData(prev => ({
            ...prev,
            nome: emp.razao_social || emp.nome || prev.nome,
            fantasia: emp.nome_fantasia || emp.fantasia || prev.fantasia,
            cnpj: cnpj,
            endereco: emp.endereco_completo || emp.endereco || prev.endereco,
            atividade: emp.cnae_descricao || emp.cnae || prev.atividade
          }));
          setSaveMessage('Dados do CNPJ carregados!');
        } else {
          setSaveMessage('CNPJ não encontrado na base local.');
        }
      }
    } catch {
      setSaveMessage('Erro ao consultar CNPJ.');
    }
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleClientSearch = (value) => {
    setClientSearch(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchClients(value), 300);
  };

  const selectClient = (client) => {
    const endereco = [client.rua, client.numero, client.bairro, client.cidade, client.uf]
      .filter(Boolean).join(', ');
    setClientData({
      nome: client.razao_social || client.nome_fantasia || '',
      fantasia: client.nome_fantasia || '',
      cnpj: client.cnpj || '',
      endereco: client.endereco_completo || endereco || '',
      atividade: client.cnae || '',
      telefone: client.telefone || '',
      email: client.email || '',
      clienteId: client.id || null
    });
    setClientSearch('');
    setShowClientDropdown(false);
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleClientChange = (field, value) => {
    setClientData(prev => ({ ...prev, [field]: value }));
  };

  const addItem = () => {
    const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
    setItems([...items, { id: newId, service: '', description: '', quantity: 1, value: 0 }]);
  };

  const removeItem = (id) => setItems(items.filter(item => item.id !== id));

  const handleImageUpload = (e, setter, type) => {
    const file = e.target.files[0];
    if (file) {
      // Mostrar preview imediato
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result);
      reader.readAsDataURL(file);
      // Salvar no servidor para persistir
      if (type) uploadImageToServer(file, type);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // --- SALVAR NO BACKEND ---
  const saveToBackend = async () => {
    setSaving(true);
    setSaveMessage('');
    try {
      const payload = {
        nome: clientData.nome,
        razao_social: clientData.nome,
        cnpj: clientData.cnpj,
        endereco: clientData.endereco,
        data: date,
        numero_meses: '6',
        servico: items[0]?.service || '',
        quant: items[0]?.quantity || 0,
        valor: items[0]?.value || 0,
        servico1: items[1]?.service || '',
        quant1: items[1]?.quantity || 0,
        valor1: items[1]?.value || 0,
        servico2: items[2]?.service || '',
        quant2: items[2]?.quantity || 0,
        valor2: items[2]?.value || 0,
        servico3: items[3]?.service || '',
        quant3: items[3]?.quantity || 0,
        valor3: items[3]?.value || 0,
      };
      const res = await fetch('/gerar-recibo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `RECIBO_${clientData.nome || 'Cliente'}.docx`;
        a.click();
        URL.revokeObjectURL(url);
        setSaveMessage('Recibo gerado e salvo com sucesso!');
      } else {
        const err = await res.json();
        setSaveMessage(`Erro: ${err.error || 'Falha ao gerar'}`);
      }
    } catch (err) {
      setSaveMessage(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(''), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex flex-col items-center font-sans text-slate-900">

      {/* BARRA DE FERRAMENTAS */}
      <div className="mb-4 flex flex-wrap justify-between items-center gap-4 print:hidden w-full max-w-[210mm] bg-white p-5 rounded-2xl shadow-lg border border-slate-200">
        {/* Status do Banco + Busca */}
        <div className="w-full flex items-center gap-3 mb-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
            dbStatus === 'connected' ? 'bg-green-100 text-green-700' :
            dbStatus === 'offline' ? 'bg-red-100 text-red-600' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              dbStatus === 'connected' ? 'bg-green-500' :
              dbStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
            }`}></div>
            {dbStatus === 'connected' ? `BD Conectado (${totalClientes} clientes)` :
             dbStatus === 'offline' ? 'BD Offline' : 'Verificando...'}
          </div>
          {lastRecibos.length > 0 && (
            <button onClick={() => setShowHistory(!showHistory)} className="text-xs font-bold text-blue-600 hover:text-blue-800 underline">
              {showHistory ? 'Fechar Histórico' : `Últimos Recibos (${lastRecibos.length})`}
            </button>
          )}
        </div>

        {/* Histórico de Recibos */}
        {showHistory && lastRecibos.length > 0 && (
          <div className="w-full bg-slate-50 rounded-xl p-3 border border-slate-200 mb-2 max-h-40 overflow-auto">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Recibos Recentes</h4>
            {lastRecibos.map((doc, i) => (
              <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0 text-xs">
                <span className="font-bold text-slate-700">{doc.cliente_nome || doc.nome_arquivo}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">{doc.data_geracao ? new Date(doc.data_geracao).toLocaleDateString('pt-BR') : ''}</span>
                  {doc.valor_total && <span className="font-bold text-green-600">{formatCurrency(doc.valor_total)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Busca de Clientes */}
        <div className="relative flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
            <Icons.Search size={16} className="text-slate-400" />
            <input
              type="text"
              value={clientSearch}
              onChange={(e) => handleClientSearch(e.target.value)}
              placeholder={dbStatus === 'connected' ? `Buscar entre ${totalClientes} clientes (nome, CNPJ, razão social)...` : 'Buscar cliente...'}
              className="bg-transparent border-none outline-none text-sm w-full focus:ring-0"
            />
          </div>
          {showClientDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] max-h-72 overflow-auto">
              {clientResults.map((c, i) => (
                <button
                  key={i}
                  onClick={() => selectClient(c)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-0"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm text-slate-800">{c.nome_fantasia || c.razao_social}</p>
                      {c.razao_social && c.nome_fantasia && c.razao_social !== c.nome_fantasia && (
                        <p className="text-[10px] text-slate-400 italic">{c.razao_social}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{c.cnpj || 'S/CNPJ'}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {c.endereco_completo || [c.rua, c.bairro, c.cidade, c.uf].filter(Boolean).join(', ') || 'Sem endereço'}
                    {c.telefone ? ` | ${c.telefone}` : ''}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          <button onClick={() => fileInputLogo.current.click()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-all font-bold text-sm shadow-sm">
            <Icons.ImageIcon size={18} /> Logo
          </button>
          <button onClick={() => fileInputMascot.current.click()} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-all font-bold text-sm shadow-sm">
            <Icons.ImageIcon size={18} /> Mascote
          </button>
        </div>
        <div className="flex gap-3 ml-auto">
          <button onClick={addItem} className="flex items-center gap-2 bg-emerald-500 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-all font-bold text-sm shadow-sm">
            <Icons.Plus size={18} /> Add Item
          </button>
          <button onClick={saveToBackend} disabled={saving || dbStatus === 'offline'} className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl hover:bg-green-700 transition-all font-bold text-sm shadow-sm disabled:opacity-50">
            <Icons.Save size={18} /> {saving ? 'Salvando...' : 'Salvar DOCX'}
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-900 text-white px-8 py-2.5 rounded-xl hover:bg-black transition-all font-bold text-sm shadow-xl ring-2 ring-slate-900 ring-offset-2">
            <Icons.Printer size={18} /> Imprimir / PDF
          </button>
        </div>

        <input type="file" ref={fileInputLogo} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setLogo, 'logo')} />
        <input type="file" ref={fileInputMascot} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setMascot, 'mascote')} />

        {saveMessage && (
          <div className={`w-full text-center text-sm font-bold py-2 rounded-lg ${saveMessage.includes('Erro') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {saveMessage}
          </div>
        )}
      </div>

      {/* DOCUMENTO A4 */}
      <div id="a4-document" className="bg-white w-[210mm] min-h-[297mm] shadow-[0_0_60px_rgba(0,0,0,0.1)] relative overflow-hidden flex flex-col p-[15mm] text-slate-800">

        {/* CABEÇALHO */}
        <header className="flex justify-between items-start mb-8 relative z-50 h-28">
          <div className="flex items-center h-full">
            <div
              onClick={() => fileInputLogo.current.click()}
              className={`w-64 h-28 flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all group ${!logo ? 'border-2 border-dashed border-blue-200 bg-blue-50/30 print:hidden' : ''}`}
            >
              {logo ? (
                <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="text-center p-2 print:hidden">
                  <Icons.ImageIcon size={24} className="mx-auto text-blue-400 mb-1" />
                  <p className="text-[10px] font-bold text-blue-500 uppercase">Sua Logo</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 text-right pl-4 flex flex-col justify-center h-full gap-1.5">
             <div className="flex items-center justify-end gap-2 text-slate-600">
                <span className="text-xs font-bold tracking-tight">{empresa.whatsapp}</span>
                <div className="w-5 h-5 flex items-center justify-center bg-[#254191] rounded-full text-white shadow-sm">
                    <Icons.WhatsApp size={12} />
                </div>
             </div>
             <div className="flex items-center justify-end gap-2 text-slate-600">
                <span className="text-xs font-bold tracking-tight">{empresa.fixo}</span>
                <div className="w-5 h-5 flex items-center justify-center bg-[#254191] rounded-full text-white shadow-sm">
                    <Icons.Phone size={12} />
                </div>
             </div>
             <div className="flex items-center justify-end gap-2 text-slate-600">
                <span className="text-xs font-bold tracking-tight">{empresa.site}</span>
                <div className="w-5 h-5 flex items-center justify-center bg-[#254191] rounded-full text-white shadow-sm">
                    <Icons.Globe size={12} />
                </div>
             </div>
             <div className="flex items-center justify-end gap-2 text-slate-600">
                <span className="text-xs font-bold tracking-tight">{empresa.email}</span>
                <div className="w-5 h-5 flex items-center justify-center bg-[#254191] rounded-full text-white shadow-sm">
                    <Icons.Mail size={12} />
                </div>
             </div>
          </div>
        </header>

        <div className="w-full h-0.5 bg-[#1e3a8a] mb-6 relative z-10"></div>

        {/* TÍTULO DO RECIBO */}
        <div className="flex justify-between items-end mb-6 relative z-10">
          <div>
            <h2 className="text-3xl font-black text-[#1e3a8a] uppercase leading-none tracking-tight">
              RECIBO
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase mt-1 tracking-widest pl-1">COMPROVANTE DE PRESTAÇÃO DE SERVIÇOS</p>
          </div>

          <div className="text-right border-l-4 border-[#254191] pl-3">
             <div className="flex items-center gap-1 justify-end text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                Nº <input
                  type="text"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  className="bg-transparent border-none text-right w-12 p-0 focus:ring-0 text-gray-500 font-bold"
                />
             </div>
             <div className="flex items-center gap-1 justify-end">
                <span className="text-[10px] font-bold text-[#254191]">DATA:</span>
                <input
                   type="text"
                   value={date}
                   onChange={(e) => setDate(e.target.value)}
                   className="text-sm font-black text-gray-800 leading-tight text-right bg-transparent border-none p-0 w-24 focus:ring-0"
                />
             </div>
          </div>
        </div>

        {/* DADOS DO PAGADOR */}
        <section className="bg-blue-50/20 p-4 rounded-xl border border-blue-100 w-full shadow-sm mb-6 relative z-10">
          <h3 className="flex items-center gap-2 text-[#1e3a8a] font-bold uppercase text-[10px] mb-2 border-b border-blue-200 pb-1">
            <Icons.User size={14} /> Cliente / Contratante
          </h3>
          <div className="text-[10px] space-y-1 text-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              <div className="space-y-2">
                <div className="flex flex-col border-b border-blue-200 pb-1">
                    <label className="font-bold uppercase text-[8px] tracking-tight text-[#1e3a8a]">Razão Social / Nome:</label>
                    <input
                    type="text"
                    value={clientData.nome}
                    onChange={(e) => handleClientChange('nome', e.target.value)}
                    className="font-black text-[#1e3a8a] uppercase text-sm leading-tight w-full bg-transparent border-none p-0 focus:ring-0 placeholder-blue-300"
                    placeholder="NOME DO CLIENTE"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="border-b border-blue-200 pb-1">
                        <label className="font-bold uppercase text-[8px] tracking-tight text-[#1e3a8a] block">Nome Fantasia:</label>
                        <input type="text" value={clientData.fantasia} onChange={(e) => handleClientChange('fantasia', e.target.value)} className="w-full bg-transparent border-none p-0 text-[10px] focus:ring-0 text-gray-600 italic" placeholder="..." />
                    </div>
                    <div className="border-b border-blue-200 pb-1">
                        <label className="font-bold uppercase text-[8px] tracking-tight text-[#1e3a8a] block">CNPJ / CPF:</label>
                        <div className="flex items-center gap-1">
                          <input type="text" value={clientData.cnpj} onChange={(e) => handleClientChange('cnpj', e.target.value)} onBlur={(e) => { if (e.target.value.replace(/\D/g,'').length === 14) searchByCNPJ(e.target.value); }} className="w-full bg-transparent border-none p-0 text-[10px] focus:ring-0 text-gray-600" placeholder="Digite e saia do campo para buscar" />
                          {clientData.cnpj && clientData.cnpj.replace(/\D/g,'').length === 14 && (
                            <button onClick={() => searchByCNPJ(clientData.cnpj)} className="text-blue-500 hover:text-blue-700 print:hidden" title="Buscar CNPJ"><Icons.Search size={10}/></button>
                          )}
                        </div>
                    </div>
                </div>
              </div>

              <div className="space-y-2 md:border-l md:border-blue-200 md:pl-4">
                <div className="border-b border-blue-200 pb-1">
                    <label className="font-bold uppercase text-[8px] tracking-tighter text-[#1e3a8a] flex items-center gap-1"><Icons.MapPin size={10}/> Endereço:</label>
                    <input type="text" value={clientData.endereco} onChange={(e) => handleClientChange('endereco', e.target.value)} className="italic font-medium leading-tight w-full bg-transparent border-none p-0 text-[10px] focus:ring-0 text-gray-600" placeholder="Endereço completo..." />
                </div>
                 <div className="border-b border-blue-200 pb-1">
                    <label className="font-bold uppercase text-[8px] tracking-tighter text-[#1e3a8a] flex items-center gap-1"><Icons.Briefcase size={10}/> Atividade Econômica:</label>
                    <input type="text" value={clientData.atividade} onChange={(e) => handleClientChange('atividade', e.target.value)} className="italic font-medium leading-tight w-full bg-transparent border-none p-0 text-[10px] focus:ring-0 text-gray-600" placeholder="..." />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LISTA DE SERVIÇOS */}
        <section className="mb-6 relative z-10 flex-grow">
            <table className="w-full text-left border-collapse border border-blue-200 text-[10px] shadow-sm rounded-lg overflow-hidden">
                <thead className="bg-[#1e3a8a] text-white uppercase font-black text-[9px]">
                    <tr>
                        <th className="p-2 border-r border-blue-700 w-[30%]">Serviço Realizado</th>
                        <th className="p-2 border-r border-blue-700 w-[40%]">Detalhes / Procedimento</th>
                        <th className="p-2 border-r border-blue-700 text-center w-[10%]">Qtd</th>
                        <th className="p-2 text-right w-[20%]">Valor</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-blue-100 text-gray-700 bg-white">
                    {items.map((item) => (
                        <tr key={item.id} className="group hover:bg-blue-50 transition-colors">
                            <td className="p-2 border-r border-blue-100 align-middle">
                                <input
                                    type="text"
                                    value={item.service}
                                    onChange={(e) => updateItem(item.id, 'service', e.target.value)}
                                    className="w-full bg-transparent border-none p-0 font-bold text-[#1e3a8a] focus:ring-0 placeholder-blue-300 uppercase"
                                    placeholder="NOME DO SERVIÇO"
                                />
                            </td>
                            <td className="p-2 border-r border-blue-100 align-middle">
                                <textarea
                                    value={item.description}
                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                    rows="1"
                                    className="w-full bg-transparent border-none p-0 text-gray-600 resize-none focus:ring-0 placeholder-gray-400 italic leading-tight"
                                    placeholder="Descrição técnica..."
                                />
                            </td>
                            <td className="p-2 border-r border-blue-100 align-middle text-center">
                                <input
                                    type="number" min="1"
                                    value={item.quantity}
                                    onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                                    className="w-full text-center bg-transparent border-none p-0 font-bold text-gray-600 focus:ring-0"
                                />
                            </td>
                            <td className="p-2 align-middle text-right font-bold text-gray-800 relative bg-blue-50/30">
                                <div className="flex justify-end items-center gap-1">
                                    <span className="text-[8px] text-gray-400">R$</span>
                                    <input
                                        type="number" step="0.01"
                                        value={item.value}
                                        onChange={(e) => updateItem(item.id, 'value', e.target.value)}
                                        className="w-20 text-right bg-transparent border-none p-0 focus:ring-0"
                                    />
                                </div>
                                <button onClick={() => removeItem(item.id)} className="absolute left-1 top-1/2 -translate-y-1/2 text-red-300 opacity-0 group-hover:opacity-100 print:hidden transition-all hover:text-red-500"><Icons.Trash2 size={12} /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>

        {/* TOTAIS E RODAPÉ */}
        <div className="mt-auto relative z-10">
            <section className="bg-[#1e3a8a] text-white py-3 px-5 rounded-lg flex justify-between items-center shadow-md mb-8">
                <div className="flex items-center gap-2 opacity-90">
                    <div className="bg-white/10 p-1.5 rounded border border-white/20"><Icons.Hash size={16} /></div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Valor Total</span>
                </div>
                <div className="text-3xl font-black italic tracking-tight">
                    {formatCurrency(total)}
                </div>
            </section>

            <div className="grid grid-cols-2 gap-8 mb-8 text-[10px]">
                <div>
                    <h4 className="font-bold text-[#1e3a8a] uppercase border-b border-blue-200 pb-1 mb-2 text-[9px]">Forma de Pagamento</h4>
                    <textarea
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full border-none p-0 text-gray-600 bg-transparent resize-none h-10 focus:ring-0 leading-snug font-medium"
                    />
                </div>
                <div>
                    <h4 className="font-bold text-[#1e3a8a] uppercase border-b border-blue-200 pb-1 mb-2 text-[9px]">Validade e Condições</h4>
                    <textarea
                        value={terms}
                        onChange={(e) => setTerms(e.target.value)}
                        className="w-full border-none p-0 text-gray-600 bg-transparent resize-none h-14 focus:ring-0 leading-tight italic"
                    />
                </div>
            </div>

            <div className="text-center mb-10">
                <h3 className="text-[#1e3a8a] font-black uppercase text-sm">{empresa.razao}</h3>
                <p className="text-[#1e3a8a] font-bold text-[10px]">Dedetizadora Borges | CNPJ: {empresa.cnpj}</p>
                <p className="text-gray-500 italic text-[9px] mt-1">{empresa.endereco}</p>
                <p className="text-[#1e3a8a] font-bold text-[9px]">{empresa.email}</p>

                <div className="mt-4 bg-blue-50/50 border border-blue-100 rounded-xl p-3 inline-block">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-left">
                        <p className="text-[9px] text-gray-600">Alvará Sanitário: <span className="font-bold text-[#1e3a8a]">{empresa.alvara}</span></p>
                        <p className="text-[9px] text-gray-600">Licença Ambiental: <span className="font-bold text-[#1e3a8a]">{empresa.licenca}</span></p>
                        <p className="text-[9px] text-gray-600">Responsável Técnico: <span className="font-bold text-[#1e3a8a]">{empresa.rt}</span></p>
                        <p className="text-[9px] text-gray-600">CRQ / ART: <span className="font-bold text-[#1e3a8a]">{empresa.crq}</span></p>
                     </div>
                </div>
            </div>
        </div>

        {/* RODAPÉ */}
        <div className="absolute bottom-6 left-0 w-full text-center">
             <p className="text-[9px] text-gray-300 font-bold italic uppercase tracking-widest">
                DEDETIZADORA BORGES &bull; CNPJ: 10.409.228/0001-93
             </p>
        </div>

        {/* MASCOTE */}
        {mascot && (
          <div
            className="absolute z-0 pointer-events-none grayscale opacity-10"
            style={{
              left: `${mascotConfig.x}mm`,
              top: `${mascotConfig.y}mm`,
              height: `${mascotConfig.height}px`,
              opacity: mascotConfig.opacity,
            }}
          >
            <img src={mascot} alt="Mascote" style={{ height: `${mascotConfig.height}px` }} className="w-auto object-contain" />
          </div>
        )}
      </div>
    </div>
  );
};

// Renderizar na página
const rootElement = document.getElementById('react-root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<ReceiptApp />);
}
