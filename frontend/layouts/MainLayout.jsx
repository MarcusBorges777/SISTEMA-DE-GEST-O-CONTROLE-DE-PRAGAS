import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/shared/Sidebar';
import Topbar from '../components/shared/Topbar';
import CompanyDrawer from '../components/shared/CompanyDrawer';
import { useSidebar } from '../contexts/SidebarContext';
import { useEmpresa } from '../contexts/EmpresaContext';
import { ProdutosProvider } from '../contexts/ProdutosContext';
import { DbProvider } from '../contexts/DbContext';

export default function MainLayout() {
  const { collapsed } = useSidebar();
  const { drawerOpen } = useEmpresa();

  // Calcular margin-left dinamicamente
  const sidebarW = collapsed ? 68 : 256;
  const drawerW = drawerOpen ? 288 : 0;
  const marginLeft = sidebarW + drawerW;

  return (
    // DbProvider + ProdutosProvider carregam após autenticação
    <DbProvider>
    <ProdutosProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 print:bg-white">
        <Sidebar />
        <CompanyDrawer />

        {/* Main Content — margin acompanha sidebar + drawer */}
        <div
          style={{ marginLeft }}
          className="transition-all duration-300 print:ml-0"
        >
          <Topbar />
          <main className="p-6 print:p-0">
            <Outlet />
          </main>
        </div>
      </div>
    </ProdutosProvider>
    </DbProvider>
  );
}
