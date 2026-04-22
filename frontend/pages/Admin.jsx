import React, { useState, useEffect, useRef } from 'react';
import {
  Shield, Users, Users2, Database, Palette, Upload, Trash2, Image as ImageIcon,
  Bug, FileImage, Award, Loader2, Package, FolderOpen, Plus, Edit2,
  X, Check, FlaskConical, ChevronDown, Save, AlertCircle, CheckCircle2, Trash,
  SlidersHorizontal, Hash, UserPlus, UserCheck
} from 'lucide-react';
import { api, fetchImagensEmpresa, uploadImagemEmpresa, removerImagemEmpresa } from '../services/api';
import { getTecnicos, salvarTecnicos, getEquipes, salvarEquipes } from '../services/agendaService';
import { useToast } from '../components/shared/Toast';
import { useProdutos } from '../contexts/ProdutosContext';

const PEST_OPTIONS = [
  { id: 'baratas', label: 'Baratas' }, { id: 'formigas', label: 'Formigas' },
  { id: 'ratos', label: 'Ratos' }, { id: 'cupins', label: 'Cupins' },
  { id: 'escorpioes', label: 'Escorpiões' }, { id: 'pulgas', label: 'Pulgas' },
  { id: 'moscas', label: 'Moscas' }, { id: 'aranhas', label: 'Aranhas' },
  { id: 'mosquitos', label: 'Mosquitos' }, { id: 'tracas', label: 'Traças' },
];

const EMPTY_PRODUTO = {
  id: '', nome: '', grupo: '', principio: '', registro: '',
  concentracao: '', diluente: '', equipamento: '', antidoto: '', targets: []
};

export default function Admin() {
  const { addToast } = useToast();
  const { produtos, addProduto, updateProduto, removeProduto } = useProdutos();
  const [activeSection, setActiveSection] = useState('identidade');
  const [usuarios, setUsuarios] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);

  // Identidade Visual
  const [imagens, setImagens] = useState({ logo: '', mascote: '', alvara: '' });
  const [imagensLoading, setImagensLoading] = useState(true);
  const [uploadingTipo, setUploadingTipo] = useState(null);
  const logoRef = useRef(null);
  const mascoteRef = useRef(null);
  const alvaraRef = useRef(null);

  // Produtos
  const [showProdutoModal, setShowProdutoModal] = useState(false);
  const [editingProduto, setEditingProduto] = useState(null); // null = novo, object = editar
  const [produtoForm, setProdutoForm] = useState(EMPTY_PRODUTO);
  const [produtoSaving, setProdutoSaving] = useState(false);
  const [produtoError, setProdutoError] = useState('');

  // Arquivos / OneDrive
  const [pastaPrincipal, setPastaPrincipal] = useState('');
  const [pastaInput, setPastaInput] = useState('');
  const [pastaExiste, setPastaExiste] = useState(null);
  const [pastaSaving, setPastaSaving] = useState(false);
  const [lixeiraLimpando, setLixeiraLimpando] = useState(false);

  // Técnicos & Equipes
  const [tecnicos, setTecnicos]         = useState([]);
  const [equipes,  setEquipes]          = useState([]);
  const [novoTecnico, setNovoTecnico]   = useState('');
  const [editTecIdx,  setEditTecIdx]    = useState(null);
  const [editTecVal,  setEditTecVal]    = useState('');
  const [modalEquipe, setModalEquipe]   = useState(false);
  const [equipeForm, setEquipeForm]     = useState({ id: null, nome: '', membros: [] });

  useEffect(() => {
    if (activeSection === 'usuarios') loadUsuarios();
    else if (activeSection === 'database') loadTables();
    else if (activeSection === 'identidade') loadImagens();
    else if (activeSection === 'arquivos') loadPastaConfig();
    else if (activeSection === 'equipes') {
      setTecnicos(getTecnicos());
      setEquipes(getEquipes());
    }
  }, [activeSection]);

  const loadUsuarios = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/usuarios');
      setUsuarios(Array.isArray(data) ? data : data.usuarios || []);
    } catch (e) { addToast('Erro ao carregar usuarios', 'error'); }
    finally { setLoading(false); }
  };

  const loadTables = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/database/tables');
      setTables(Array.isArray(data) ? data : data.tables || []);
    } catch (e) { addToast('Erro ao carregar tabelas', 'error'); }
    finally { setLoading(false); }
  };

  const loadImagens = async () => {
    setImagensLoading(true);
    try {
      const data = await fetchImagensEmpresa();
      setImagens({ logo: data.logo || '', mascote: data.mascote || '', alvara: data.alvara || '' });
    } catch (e) {}
    finally { setImagensLoading(false); }
  };

  const loadPastaConfig = async () => {
    try {
      const data = await api.get('/api/config/pasta-principal');
      setPastaPrincipal(data.pasta || '');
      setPastaInput(data.pasta || '');
      setPastaExiste(data.existe ?? null);
    } catch (e) {}
  };

  const handleUpload = async (tipo, file) => {
    if (!file) return;
    setUploadingTipo(tipo);
    try {
      const data = await uploadImagemEmpresa(tipo, file);
      addToast(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)} atualizado!`, 'success');
      setImagens(prev => ({ ...prev, [tipo]: (data.caminho || data.path || prev[tipo]) + `?t=${Date.now()}` }));
    } catch (e) { addToast(`Erro ao enviar ${tipo}`, 'error'); }
    finally { setUploadingTipo(null); }
  };

  const handleRemover = async (tipo) => {
    if (!confirm(`Remover ${tipo}?`)) return;
    try {
      await removerImagemEmpresa(tipo);
      setImagens(prev => ({ ...prev, [tipo]: '' }));
      addToast(`${tipo} removido`, 'success');
    } catch (e) { addToast(`Erro ao remover ${tipo}`, 'error'); }
  };

  // --- Produtos ---
  const abrirModalNovo = () => {
    setEditingProduto(null);
    setProdutoForm(EMPTY_PRODUTO);
    setProdutoError('');
    setShowProdutoModal(true);
  };

  const abrirModalEditar = (p) => {
    setEditingProduto(p);
    setProdutoForm({ ...p });
    setProdutoError('');
    setShowProdutoModal(true);
  };

  const salvarProduto = async () => {
    if (!produtoForm.nome.trim()) { setProdutoError('Nome é obrigatório'); return; }
    setProdutoSaving(true);
    setProdutoError('');
    try {
      if (editingProduto) {
        await updateProduto(editingProduto.id, produtoForm);
        addToast('Produto atualizado!', 'success');
      } else {
        await addProduto(produtoForm);
        addToast('Produto adicionado!', 'success');
      }
      setShowProdutoModal(false);
    } catch (e) {
      setProdutoError('Erro ao salvar produto');
    } finally {
      setProdutoSaving(false);
    }
  };

  const excluirProduto = async (id) => {
    if (!confirm('Excluir este produto?')) return;
    await removeProduto(id);
    addToast('Produto removido', 'success');
  };

  const toggleTarget = (pestId) => {
    setProdutoForm(prev => ({
      ...prev,
      targets: prev.targets.includes(pestId)
        ? prev.targets.filter(t => t !== pestId)
        : [...prev.targets, pestId]
    }));
  };

  // --- Arquivos ---
  const salvarPasta = async () => {
    setPastaSaving(true);
    try {
      const data = await api.post('/api/config/pasta-principal', { pasta: pastaInput });
      setPastaPrincipal(data.pasta || pastaInput);
      setPastaExiste(true);
      addToast('Pasta configurada com sucesso!', 'success');
    } catch (e) {
      addToast('Erro ao salvar pasta', 'error');
    } finally {
      setPastaSaving(false);
    }
  };

  const limparLixeira = async () => {
    if (!confirm('Remover da Lixeira todos os arquivos com mais de 90 dias?')) return;
    setLixeiraLimpando(true);
    try {
      const data = await api.post('/api/admin/limpar-lixeira', {});
      addToast(`Lixeira limpa: ${data.removidos || 0} arquivo(s) removido(s)`, 'success');
    } catch (e) {
      addToast('Erro ao limpar lixeira', 'error');
    } finally {
      setLixeiraLimpando(false);
    }
  };

  const [configNumeracao, setConfigNumeracao] = useState({ laudos: '', recibos: '', orcamentos: '' });
  const [defaultGarantia, setDefaultGarantia] = useState('3');

  useEffect(() => {
    setConfigNumeracao({
      laudos:     localStorage.getItem('laudoSequence')               || '1',
      recibos:    localStorage.getItem('receiptNumber')               || '1',
      orcamentos: localStorage.getItem('lastQuoteNumber_orcamento')   || '1',
    });
    setDefaultGarantia(localStorage.getItem('defaultGarantiaMeses') || '3');
  }, []);

  const handleSalvarNumeracao = () => {
    const l = parseInt(configNumeracao.laudos, 10);
    const r = parseInt(configNumeracao.recibos, 10);
    const o = parseInt(configNumeracao.orcamentos, 10);
    const g = parseInt(defaultGarantia, 10);
    if (isNaN(l) || isNaN(r) || isNaN(o) || l < 1 || r < 1 || o < 1) {
      addToast('Digite valores numéricos válidos (mínimo 1)', 'error');
      return;
    }
    if (isNaN(g) || g < 0) {
      addToast('Garantia padrão inválida (mínimo 0)', 'error');
      return;
    }
    localStorage.setItem('laudoSequence',             String(l));
    localStorage.setItem('receiptNumber',             String(r));
    localStorage.setItem('lastQuoteNumber_orcamento', String(o));
    localStorage.setItem('defaultGarantiaMeses',      String(g));
    addToast('Configurações salvas com sucesso!', 'success');
  };

  // ── Handlers Técnicos ──────────────────────────────────────────────────────
  const addTecnico = () => {
    const nome = novoTecnico.trim();
    if (!nome) return;
    if (tecnicos.includes(nome)) { addToast('Técnico já existe', 'error'); return; }
    const nova = [...tecnicos, nome];
    salvarTecnicos(nova);
    setTecnicos(nova);
    setNovoTecnico('');
    addToast('Técnico adicionado', 'success');
  };

  const confirmarEditTecnico = () => {
    const nome = editTecVal.trim();
    if (!nome || editTecIdx === null) return;
    const nova = tecnicos.map((t, i) => i === editTecIdx ? nome : t);
    salvarTecnicos(nova);
    setTecnicos(nova);
    setEditTecIdx(null);
    setEditTecVal('');
    addToast('Técnico atualizado', 'success');
  };

  const removerTecnico = (idx) => {
    const nome = tecnicos[idx];
    if (!confirm(`Remover "${nome}"?`)) return;
    const nova = tecnicos.filter((_, i) => i !== idx);
    salvarTecnicos(nova);
    setTecnicos(nova);
    addToast('Técnico removido', 'success');
  };

  // ── Handlers Equipes ──────────────────────────────────────────────────────
  const abrirNovaEquipe = () => {
    setEquipeForm({ id: null, nome: '', membros: [] });
    setModalEquipe(true);
  };

  const abrirEditarEquipe = (eq) => {
    setEquipeForm({ ...eq });
    setModalEquipe(true);
  };

  const salvarEquipe = () => {
    const nome = equipeForm.nome.trim();
    if (!nome) { addToast('Nome da equipe é obrigatório', 'error'); return; }
    let novas;
    if (equipeForm.id) {
      novas = equipes.map(e => e.id === equipeForm.id ? { ...equipeForm, nome } : e);
    } else {
      novas = [...equipes, { ...equipeForm, id: Date.now(), nome }];
    }
    salvarEquipes(novas);
    setEquipes(novas);
    setModalEquipe(false);
    addToast(equipeForm.id ? 'Equipe atualizada' : 'Equipe criada', 'success');
  };

  const removerEquipe = (id) => {
    const eq = equipes.find(e => e.id === id);
    if (!confirm(`Remover equipe "${eq?.nome}"?`)) return;
    const novas = equipes.filter(e => e.id !== id);
    salvarEquipes(novas);
    setEquipes(novas);
    addToast('Equipe removida', 'success');
  };

  const toggleMembroEquipe = (nome) => {
    setEquipeForm(prev => ({
      ...prev,
      membros: prev.membros.includes(nome)
        ? prev.membros.filter(m => m !== nome)
        : [...prev.membros, nome],
    }));
  };

  const sections = [
    { id: 'identidade',    label: 'Identidade Visual',    icon: Palette },
    { id: 'produtos',      label: 'Produtos',             icon: FlaskConical },
    { id: 'arquivos',      label: 'Arquivos',             icon: FolderOpen },
    { id: 'usuarios',      label: 'Usuarios',             icon: Users },
    { id: 'database',      label: 'Banco de Dados',       icon: Database },
    { id: 'configuracoes', label: 'Configurações',        icon: SlidersHorizontal },
    { id: 'equipes',       label: 'Equipes & Técnicos',   icon: Users2 },
  ];

  const imagemCards = [
    { tipo: 'logo', label: 'Logo da Empresa', desc: 'Exibido na sidebar, documentos e site', icon: Bug, ref: logoRef, color: 'blue' },
    { tipo: 'mascote', label: 'Mascote', desc: 'Imagem do mascote da empresa', icon: ImageIcon, ref: mascoteRef, color: 'purple' },
    { tipo: 'alvara', label: 'Alvara Sanitario', desc: 'Anexado nos laudos e documentos', icon: Award, ref: alvaraRef, color: 'emerald' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Administracao</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Gerenciar identidade visual, produtos, arquivos e sistema</p>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 flex-wrap">
        {sections.map(s => {
          const Icon = s.icon;
          return (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition
                ${activeSection === s.id
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}>
              <Icon size={16} /> {s.label}
            </button>
          );
        })}
      </div>

      {/* === IDENTIDADE VISUAL === */}
      {activeSection === 'identidade' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {imagemCards.map(card => {
            const Icon = card.icon;
            const src = imagens[card.tipo];
            const isUploading = uploadingTipo === card.tipo;
            return (
              <div key={card.tipo}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className={`relative aspect-[4/3] bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center overflow-hidden`}>
                  {imagensLoading ? (
                    <div className="w-16 h-16 bg-slate-200 dark:bg-slate-600 rounded-xl animate-pulse" />
                  ) : src ? (
                    <img src={src} alt={card.label} className="w-full h-full object-contain p-4" />
                  ) : (
                    <div className="text-center">
                      <Icon size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="text-xs text-slate-400">Nenhuma imagem</p>
                    </div>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 flex items-center justify-center">
                      <Loader2 size={32} className="animate-spin text-brand-500" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">{card.label}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 mb-3">{card.desc}</p>
                  <div className="flex gap-2">
                    <input type="file" ref={card.ref} accept="image/*" className="hidden"
                      onChange={e => { if (e.target.files[0]) handleUpload(card.tipo, e.target.files[0]); e.target.value = ''; }} />
                    <button onClick={() => card.ref.current?.click()} disabled={isUploading}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition
                        bg-${card.color}-50 dark:bg-${card.color}-900/20 text-${card.color}-600 dark:text-${card.color}-400
                        hover:bg-${card.color}-100 dark:hover:bg-${card.color}-900/30 disabled:opacity-50`}>
                      <Upload size={14} /> {src ? 'Trocar' : 'Enviar'}
                    </button>
                    {src && (
                      <button onClick={() => handleRemover(card.tipo)} disabled={isUploading}
                        className="flex items-center justify-center px-3 py-2 text-xs rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* === PRODUTOS === */}
      {activeSection === 'produtos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Banco de Produtos Químicos</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{produtos.length} produto(s) cadastrado(s) — sincronizados com Laudos</p>
            </div>
            <button onClick={abrirModalNovo}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition shadow-sm">
              <Plus size={16} /> Novo Produto
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            {produtos.length === 0 ? (
              <div className="p-12 text-center">
                <FlaskConical size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm text-slate-500">Nenhum produto cadastrado</p>
                <p className="text-xs text-slate-400 mt-1">Produtos adicionados em Laudos aparecem aqui automaticamente</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                      {['Nome', 'Grupo', 'Princípio Ativo', 'Registro', 'Alvos', 'Ações'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {produtos.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{p.nome}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{p.grupo}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{p.principio}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.registro}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(p.targets || []).slice(0, 3).map(t => (
                              <span key={t} className="px-1.5 py-0.5 text-[10px] rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{t}</span>
                            ))}
                            {(p.targets || []).length > 3 && (
                              <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 dark:bg-slate-700 text-slate-500">+{p.targets.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => abrirModalEditar(p)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => excluirProduto(p.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === ARQUIVOS / ONEDRIVE === */}
      {activeSection === 'arquivos' && (
        <div className="space-y-6">
          {/* Configuração de pasta */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-base font-bold text-slate-800 dark:text-white mb-1">Pasta Principal de Arquivos</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Configure o caminho da pasta onde os documentos gerados serão salvos (ex: pasta sincronizada com OneDrive).
              Subpastas <code className="text-xs bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">Laudos/</code>,{' '}
              <code className="text-xs bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">Recibos/</code>,{' '}
              <code className="text-xs bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">Orcamentos/</code> e{' '}
              <code className="text-xs bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">Lixeira/</code> serão criadas automaticamente.
            </p>

            {pastaPrincipal && (
              <div className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-sm ${
                pastaExiste
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
              }`}>
                {pastaExiste ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span className="font-mono text-xs truncate flex-1">{pastaPrincipal}</span>
                <span className="font-medium">{pastaExiste ? 'Encontrada' : 'Não encontrada'}</span>
              </div>
            )}

            <div className="flex gap-3">
              <input
                type="text"
                value={pastaInput}
                onChange={e => setPastaInput(e.target.value)}
                placeholder="Ex: C:\Users\você\OneDrive\Documentos Dedetizadora"
                className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-600
                  bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400"
              />
              <button onClick={salvarPasta} disabled={pastaSaving || !pastaInput.trim()}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium
                  hover:bg-brand-600 transition disabled:opacity-50">
                {pastaSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Salvar
              </button>
            </div>
          </div>

          {/* Lixeira */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-base font-bold text-slate-800 dark:text-white mb-1">Lixeira</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Documentos substituídos são movidos automaticamente para a pasta <code className="text-xs bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">Lixeira/</code>.
              Arquivos com mais de <strong>90 dias</strong> são elegíveis para remoção permanente.
            </p>
            <button onClick={limparLixeira} disabled={lixeiraLimpando}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition
                bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30
                disabled:opacity-50">
              {lixeiraLimpando ? <Loader2 size={16} className="animate-spin" /> : <Trash size={16} />}
              Limpar Lixeira (arquivos com +90 dias)
            </button>
          </div>
        </div>
      )}

      {/* === USUARIOS === */}
      {activeSection === 'usuarios' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  {['Nome', 'Email', 'Perfil', 'Status', 'Ultimo Login'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {loading ? (
                  [1,2].map(i => (
                    <tr key={i}>{[1,2,3,4,5].map(j => (
                      <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4" /></td>
                    ))}</tr>
                  ))
                ) : usuarios.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-5 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">{u.nome}</td>
                    <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium
                        ${u.perfil === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                        {u.perfil}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium
                        ${u.ativo ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400">{u.ultimo_login || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === BANCO DE DADOS === */}
      {activeSection === 'database' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">Tabelas do Banco</h3>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tables.map((t, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                  <Database size={16} className="text-brand-500" />
                  <div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{typeof t === 'string' ? t : t.nome || t.name}</span>
                    {t.registros !== undefined && <p className="text-xs text-slate-400">{t.registros} registro(s)</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === CONFIGURAÇÕES DO SISTEMA === */}
      {activeSection === 'configuracoes' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Numeração de Documentos</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Define o próximo número a ser usado ao gerar um documento. Ao salvar, a alteração vale imediatamente na próxima abertura do editor.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { key: 'laudos',     label: 'Próximo Laudo',     color: 'blue' },
              { key: 'recibos',    label: 'Próximo Recibo',    color: 'emerald' },
              { key: 'orcamentos', label: 'Próximo Orçamento', color: 'amber' },
            ].map(({ key, label, color }) => (
              <div key={key} className={`bg-${color}-50 dark:bg-${color}-900/20 border border-${color}-200 dark:border-${color}-700/50 rounded-xl p-4`}>
                <label className={`flex items-center gap-1.5 text-xs font-bold text-${color}-700 dark:text-${color}-300 uppercase tracking-wide mb-3`}>
                  <Hash size={12} /> {label}
                </label>
                <input
                  type="number"
                  min="1"
                  value={configNumeracao[key]}
                  onChange={e => setConfigNumeracao(prev => ({ ...prev, [key]: e.target.value }))}
                  className={`w-full px-3 py-2.5 text-center text-lg font-black text-${color}-700 dark:text-${color}-300 bg-white dark:bg-slate-800 border border-${color}-200 dark:border-${color}-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-${color}-400`}
                />
                <p className="text-[10px] text-slate-400 mt-2 text-center">
                  Será formatado como {String(parseInt(configNumeracao[key]) || 1).padStart(4, '0')}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Padrões do Laudo</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
              Valores aplicados automaticamente ao abrir um novo Laudo.
            </p>
            <div className="max-w-xs">
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700/50 rounded-xl p-4">
                <label className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide mb-3">
                  <Hash size={12} /> Garantia Padrão (meses)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={defaultGarantia}
                  onChange={e => setDefaultGarantia(e.target.value)}
                  className="w-full px-3 py-2.5 text-center text-lg font-black text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <p className="text-[10px] text-slate-400 mt-2 text-center">
                  {parseInt(defaultGarantia) === 0 ? 'Sem garantia' : `${parseInt(defaultGarantia) || 3} ${parseInt(defaultGarantia) === 1 ? 'mês' : 'meses'} de garantia`}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSalvarNumeracao}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl transition shadow-md shadow-brand-500/25">
            <Save size={16} /> Salvar Configurações
          </button>
        </div>
      )}

      {/* === EQUIPES & TÉCNICOS === */}
      {activeSection === 'equipes' && (
        <div className="space-y-8">

          {/* ── Técnicos ──────────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <UserCheck size={18} className="text-brand-500" />
                <h2 className="text-sm font-bold text-slate-800 dark:text-white">Técnicos</h2>
                <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                  {tecnicos.length}
                </span>
              </div>
            </div>

            {/* Adicionar novo técnico */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={novoTecnico}
                  onChange={e => setNovoTecnico(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTecnico()}
                  placeholder="Nome do novo técnico..."
                  className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
                <button
                  onClick={addTecnico}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-xl transition"
                >
                  <Plus size={15} /> Adicionar
                </button>
              </div>
            </div>

            {/* Lista de técnicos */}
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {tecnicos.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-400 text-center">Nenhum técnico cadastrado.</p>
              ) : tecnicos.map((t, idx) => (
                <div key={idx} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0">
                    <Users2 size={15} className="text-brand-500" />
                  </div>

                  {editTecIdx === idx ? (
                    <>
                      <input
                        autoFocus
                        value={editTecVal}
                        onChange={e => setEditTecVal(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') confirmarEditTecnico(); if (e.key === 'Escape') setEditTecIdx(null); }}
                        className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-brand-300 dark:border-brand-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <button onClick={confirmarEditTecnico} className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100 transition">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditTecIdx(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition">
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium text-slate-800 dark:text-white">{t}</span>
                      <button
                        onClick={() => { setEditTecIdx(idx); setEditTecVal(t); }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition"
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => removerTecnico(idx)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition"
                        title="Remover"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Equipes ──────────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-purple-500" />
                <h2 className="text-sm font-bold text-slate-800 dark:text-white">Equipes</h2>
                <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                  {equipes.length}
                </span>
              </div>
              <button
                onClick={abrirNovaEquipe}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-bold rounded-xl transition"
              >
                <Plus size={15} /> Nova Equipe
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {equipes.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <Users size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-slate-400">Nenhuma equipe criada ainda.</p>
                  <p className="text-xs text-slate-400 mt-1">Crie equipes para agrupar técnicos em serviços conjuntos.</p>
                </div>
              ) : equipes.map(eq => (
                <div key={eq.id} className="px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-bold text-sm text-slate-800 dark:text-white">{eq.nome}</p>
                      {eq.membros?.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {eq.membros.map(m => (
                            <span key={m} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                              {m}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 mt-1">Sem membros definidos</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => abrirEditarEquipe(eq)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition"
                        title="Editar equipe"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => removerEquipe(eq.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition"
                        title="Remover equipe"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === MODAL EQUIPE === */}
      {modalEquipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                {equipeForm.id ? 'Editar Equipe' : 'Nova Equipe'}
              </h3>
              <button
                onClick={() => setModalEquipe(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Nome da equipe */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Nome da Equipe
                </label>
                <input
                  autoFocus
                  type="text"
                  value={equipeForm.nome}
                  onChange={e => setEquipeForm(prev => ({ ...prev, nome: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && salvarEquipe()}
                  placeholder="Ex: Equipe Desinsetização"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              {/* Membros */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Membros ({equipeForm.membros.length} selecionados)
                </label>
                {tecnicos.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Cadastre técnicos primeiro para adicioná-los à equipe.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {tecnicos.map(t => (
                      <label
                        key={t}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                      >
                        <input
                          type="checkbox"
                          checked={equipeForm.membros.includes(t)}
                          onChange={() => toggleMembroEquipe(t)}
                          className="w-4 h-4 rounded accent-brand-500"
                        />
                        <span className="text-sm text-slate-800 dark:text-white">{t}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setModalEquipe(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={salvarEquipe}
                className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold transition shadow-md shadow-brand-500/25"
              >
                {equipeForm.id ? 'Salvar Alterações' : 'Criar Equipe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL PRODUTO === */}
      {showProdutoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                {editingProduto ? 'Editar Produto' : 'Novo Produto'}
              </h3>
              <button onClick={() => setShowProdutoModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {produtoError && (
                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{produtoError}</p>
              )}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { field: 'nome', label: 'Nome *', full: true },
                  { field: 'grupo', label: 'Grupo Químico' },
                  { field: 'principio', label: 'Princípio Ativo' },
                  { field: 'registro', label: 'Nº Registro' },
                  { field: 'concentracao', label: 'Concentração' },
                  { field: 'diluente', label: 'Diluente' },
                  { field: 'equipamento', label: 'Equipamento' },
                ].map(({ field, label, full }) => (
                  <div key={field} className={full ? 'col-span-2' : ''}>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
                    <input
                      type="text"
                      value={produtoForm[field] || ''}
                      onChange={e => setProdutoForm(prev => ({ ...prev, [field]: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600
                        bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Antídoto / Informações</label>
                  <textarea
                    rows={2}
                    value={produtoForm.antidoto || ''}
                    onChange={e => setProdutoForm(prev => ({ ...prev, antidoto: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600
                      bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 resize-none"
                  />
                </div>
              </div>

              {/* Alvos */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Pragas-alvo</label>
                <div className="flex flex-wrap gap-2">
                  {PEST_OPTIONS.map(pest => (
                    <button key={pest.id} type="button" onClick={() => toggleTarget(pest.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                        produtoForm.targets.includes(pest.id)
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-blue-400'
                      }`}>
                      {pest.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setShowProdutoModal(false)}
                className="px-4 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600
                  text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                Cancelar
              </button>
              <button onClick={salvarProduto} disabled={produtoSaving}
                className="flex items-center gap-2 px-5 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium
                  hover:bg-brand-600 transition disabled:opacity-50">
                {produtoSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {editingProduto ? 'Atualizar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
