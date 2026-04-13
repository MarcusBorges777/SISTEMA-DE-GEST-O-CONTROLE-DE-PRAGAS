import React, { useState, useEffect, useRef } from 'react';
import {
  Shield, Users, Database, Palette, Upload, Trash2, Image as ImageIcon,
  Bug, FileImage, Award, Loader2, Package, FolderOpen, Plus, Edit2,
  X, Check, FlaskConical, ChevronDown, Save, AlertCircle, CheckCircle2, Trash
} from 'lucide-react';
import { api, fetchImagensEmpresa, uploadImagemEmpresa, removerImagemEmpresa } from '../services/api';
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

  useEffect(() => {
    if (activeSection === 'usuarios') loadUsuarios();
    else if (activeSection === 'database') loadTables();
    else if (activeSection === 'identidade') loadImagens();
    else if (activeSection === 'arquivos') loadPastaConfig();
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

  const sections = [
    { id: 'identidade', label: 'Identidade Visual', icon: Palette },
    { id: 'produtos', label: 'Produtos', icon: FlaskConical },
    { id: 'arquivos', label: 'Arquivos', icon: FolderOpen },
    { id: 'usuarios', label: 'Usuarios', icon: Users },
    { id: 'database', label: 'Banco de Dados', icon: Database },
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
