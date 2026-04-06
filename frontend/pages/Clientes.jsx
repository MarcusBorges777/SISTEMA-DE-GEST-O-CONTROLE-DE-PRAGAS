import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Search, Trash2, Edit3, Phone, MapPin, Building2, X, RefreshCw } from 'lucide-react';
import { fetchClientes, createCliente, deleteCliente } from '../services/api';
import { useToast } from '../components/shared/Toast';

export default function Clientes() {
  const { addToast } = useToast();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filtros, setFiltros] = useState({ nome: '', cidade: '', cnpj: '' });
  const [formData, setFormData] = useState({
    nome_fantasia: '', razao_social: '', cnpj: '', cnae: '',
    rua: '', numero: '', bairro: '', cidade: '', uf: 'MG', telefone: '',
  });

  const loadClientes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchClientes(filtros);
      setClientes(Array.isArray(data) ? data : data.clientes || []);
    } catch (e) {
      addToast('Erro ao carregar clientes', 'error');
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => { loadClientes(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadClientes();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createCliente(formData);
      addToast('Cliente cadastrado com sucesso!', 'success');
      setShowForm(false);
      setFormData({ nome_fantasia: '', razao_social: '', cnpj: '', cnae: '', rua: '', numero: '', bairro: '', cidade: '', uf: 'MG', telefone: '' });
      loadClientes();
    } catch (e) {
      addToast('Erro ao cadastrar cliente', 'error');
    }
  };

  const handleDelete = async (id, nome) => {
    if (!confirm(`Remover cliente "${nome}"?`)) return;
    try {
      await deleteCliente(id);
      addToast('Cliente removido', 'success');
      loadClientes();
    } catch (e) {
      addToast('Erro ao remover cliente', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Clientes</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie sua base de clientes</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition shadow-md">
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? 'Cancelar' : 'Novo Cliente'}
        </button>
      </div>

      {/* Form Novo Cliente */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Cadastrar Novo Cliente</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'nome_fantasia', label: 'Nome Fantasia *', required: true },
              { name: 'razao_social', label: 'Razao Social' },
              { name: 'cnpj', label: 'CNPJ' },
              { name: 'cnae', label: 'CNAE' },
              { name: 'rua', label: 'Rua' },
              { name: 'numero', label: 'Numero' },
              { name: 'bairro', label: 'Bairro' },
              { name: 'cidade', label: 'Cidade' },
              { name: 'uf', label: 'UF' },
              { name: 'telefone', label: 'Telefone' },
            ].map(field => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{field.label}</label>
                <input
                  type="text"
                  value={formData[field.name]}
                  onChange={e => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                  required={field.required}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600
                    bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200
                    focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                />
              </div>
            ))}
            <div className="md:col-span-2 lg:col-span-3 flex justify-end">
              <button type="submit"
                className="px-6 py-2.5 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition">
                Cadastrar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input type="text" placeholder="Buscar por nome..."
            value={filtros.nome} onChange={e => setFiltros(p => ({ ...p, nome: e.target.value }))}
            className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600
              bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400" />
          <input type="text" placeholder="Cidade..."
            value={filtros.cidade} onChange={e => setFiltros(p => ({ ...p, cidade: e.target.value }))}
            className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600
              bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400" />
          <input type="text" placeholder="CNPJ..."
            value={filtros.cnpj} onChange={e => setFiltros(p => ({ ...p, cnpj: e.target.value }))}
            className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600
              bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400" />
          <button type="submit"
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-xl
              bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300
              hover:bg-slate-200 dark:hover:bg-slate-600 font-medium transition">
            <Search size={16} /> Buscar
          </button>
        </form>
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                {['Cliente', 'CNPJ', 'Cidade', 'Telefone', 'Acoes'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                [1,2,3].map(i => (
                  <tr key={i}>
                    {[1,2,3,4,5].map(j => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : clientes.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">Nenhum cliente encontrado</td></tr>
              ) : (
                clientes.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{c.nome_fantasia || c.razao_social}</p>
                      {c.razao_social && c.nome_fantasia && (
                        <p className="text-xs text-slate-400">{c.razao_social}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400">{c.cnpj || '-'}</td>
                    <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400">{c.cidade || '-'}</td>
                    <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400">{c.telefone || '-'}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => handleDelete(c.id, c.nome_fantasia)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center
                          text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
