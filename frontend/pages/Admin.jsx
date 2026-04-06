import React, { useState, useEffect } from 'react';
import { Shield, Users, Database, Palette, Plus, Trash2, Edit3, Save } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/shared/Toast';

export default function Admin() {
  const { addToast } = useToast();
  const [activeSection, setActiveSection] = useState('usuarios');
  const [usuarios, setUsuarios] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeSection === 'usuarios') {
      loadUsuarios();
    } else if (activeSection === 'database') {
      loadTables();
    }
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

  const sections = [
    { id: 'usuarios', label: 'Usuarios', icon: Users },
    { id: 'database', label: 'Banco de Dados', icon: Database },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Administracao</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Gerenciar usuarios e configuracoes do sistema</p>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2">
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {activeSection === 'usuarios' && (
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
        )}

        {activeSection === 'database' && (
          <div className="p-6">
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
    </div>
  );
}
