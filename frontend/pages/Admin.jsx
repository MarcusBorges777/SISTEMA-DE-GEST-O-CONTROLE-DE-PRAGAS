import React, { useState, useEffect, useRef } from 'react';
import { Shield, Users, Database, Palette, Upload, Trash2, Image as ImageIcon, Bug, FileImage, Award, Loader2 } from 'lucide-react';
import { api, fetchImagensEmpresa, uploadImagemEmpresa, removerImagemEmpresa } from '../services/api';
import { useToast } from '../components/shared/Toast';

export default function Admin() {
  const { addToast } = useToast();
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

  useEffect(() => {
    if (activeSection === 'usuarios') loadUsuarios();
    else if (activeSection === 'database') loadTables();
    else if (activeSection === 'identidade') loadImagens();
  }, [activeSection]);

  const loadUsuarios = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/usuarios');
      setUsuarios(Array.isArray(data) ? data : data.usuarios || []);
    } catch (e) {
      addToast('Erro ao carregar usuarios', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadTables = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/database/tables');
      setTables(Array.isArray(data) ? data : data.tables || []);
    } catch (e) {
      addToast('Erro ao carregar tabelas', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadImagens = async () => {
    setImagensLoading(true);
    try {
      const data = await fetchImagensEmpresa();
      setImagens({
        logo: data.logo || '',
        mascote: data.mascote || '',
        alvara: data.alvara || '',
      });
    } catch (e) {
      // Silencioso — imagens podem não existir
    } finally {
      setImagensLoading(false);
    }
  };

  const handleUpload = async (tipo, file) => {
    if (!file) return;
    setUploadingTipo(tipo);
    try {
      const data = await uploadImagemEmpresa(tipo, file);
      addToast(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)} atualizado com sucesso!`, 'success');
      // Atualizar com cache bust
      setImagens(prev => ({ ...prev, [tipo]: (data.caminho || data.path || prev[tipo]) + `?t=${Date.now()}` }));
    } catch (e) {
      addToast(`Erro ao enviar ${tipo}`, 'error');
    } finally {
      setUploadingTipo(null);
    }
  };

  const handleRemover = async (tipo) => {
    if (!confirm(`Remover ${tipo}?`)) return;
    try {
      await removerImagemEmpresa(tipo);
      setImagens(prev => ({ ...prev, [tipo]: '' }));
      addToast(`${tipo} removido`, 'success');
    } catch (e) {
      addToast(`Erro ao remover ${tipo}`, 'error');
    }
  };

  const sections = [
    { id: 'identidade', label: 'Identidade Visual', icon: Palette },
    { id: 'usuarios', label: 'Usuarios', icon: Users },
    { id: 'database', label: 'Banco de Dados', icon: Database },
  ];

  const imagemCards = [
    {
      tipo: 'logo',
      label: 'Logo da Empresa',
      desc: 'Exibido na sidebar, documentos e site',
      icon: Bug,
      ref: logoRef,
      color: 'blue',
    },
    {
      tipo: 'mascote',
      label: 'Mascote',
      desc: 'Imagem do mascote da empresa',
      icon: ImageIcon,
      ref: mascoteRef,
      color: 'purple',
    },
    {
      tipo: 'alvara',
      label: 'Alvara Sanitario',
      desc: 'Anexado nos laudos e documentos',
      icon: Award,
      ref: alvaraRef,
      color: 'emerald',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Administracao</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Gerenciar identidade visual, usuarios e sistema</p>
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

      {/* Content */}

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
                {/* Preview */}
                <div className={`relative aspect-[4/3] bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center overflow-hidden`}>
                  {imagensLoading ? (
                    <div className="w-16 h-16 bg-slate-200 dark:bg-slate-600 rounded-xl animate-pulse" />
                  ) : src ? (
                    <img src={src} alt={card.label}
                      className="w-full h-full object-contain p-4" />
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

                {/* Info + Actions */}
                <div className="p-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">{card.label}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 mb-3">{card.desc}</p>

                  <div className="flex gap-2">
                    <input type="file" ref={card.ref} accept="image/*" className="hidden"
                      onChange={e => {
                        if (e.target.files[0]) handleUpload(card.tipo, e.target.files[0]);
                        e.target.value = '';
                      }} />
                    <button onClick={() => card.ref.current?.click()} disabled={isUploading}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition
                        bg-${card.color}-50 dark:bg-${card.color}-900/20 text-${card.color}-600 dark:text-${card.color}-400
                        hover:bg-${card.color}-100 dark:hover:bg-${card.color}-900/30
                        disabled:opacity-50`}>
                      <Upload size={14} /> {src ? 'Trocar' : 'Enviar'}
                    </button>
                    {src && (
                      <button onClick={() => handleRemover(card.tipo)} disabled={isUploading}
                        className="flex items-center justify-center px-3 py-2 text-xs rounded-lg
                          text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
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
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{typeof t === 'string' ? t : t.name || t.table_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
