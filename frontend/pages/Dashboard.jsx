import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText } from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import QuickActions from '../components/dashboard/QuickActions';
import GarantiaAlerts from '../components/dashboard/GarantiaAlerts';
import RecentActivity from '../components/dashboard/RecentActivity';
import DocumentPreview from '../components/dashboard/DocumentPreview';
import { getClientes } from '../services/clienteCache';
import { getAgendamentos } from '../services/agendaService';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    // Contagens via db.json
    async function carregarStats() {
      try {
        const [clientes, agendamentos] = await Promise.all([
          getClientes(),
          getAgendamentos(),
        ]);
        const hojeStr = new Date().toISOString().slice(0, 7); // YYYY-MM
        const docsMes = agendamentos.filter(e =>
          e.tipo !== 'servico' && (e.data || '').startsWith(hojeStr)
        ).length;
        setStats({
          total_clientes: clientes.length,
          docs_mes:       docsMes,
        });
      } catch {
        setStats({ total_clientes: 0, docs_mes: 0 });
      } finally {
        setLoading(false);
      }
    }
    carregarStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Bem-vindo ao centro de comando</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total de Clientes"
          value={stats?.total_clientes ?? 0}
          subtitle="Cadastrados no sistema"
          icon={Users}
          color="blue"
          loading={loading}
          onClick={() => navigate('/clientes')}
        />
        <StatCard
          title="Documentos Gerados"
          value={stats?.docs_mes ?? 0}
          subtitle="Este mes"
          icon={FileText}
          color="green"
          loading={loading}
          onClick={() => navigate('/arquivos')}
        />
        <GarantiaAlerts compact />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Quick Actions */}
        <div className="space-y-6">
          <QuickActions />
        </div>

        {/* Right Column: Recent Activity (spans 2 cols) */}
        <div className="lg:col-span-2">
          <RecentActivity onPreview={(filename) => setPreviewFile(filename)} />
        </div>
      </div>

      {/* Document Preview Modal */}
      <DocumentPreview
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        filename={previewFile}
      />
    </div>
  );
}
