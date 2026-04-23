import React, { useRef, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/shared/Sidebar';
import Topbar from '../components/shared/Topbar';
import CompanyDrawer from '../components/shared/CompanyDrawer';
import { useSidebar } from '../contexts/SidebarContext';
import { useEmpresa } from '../contexts/EmpresaContext';
import { ProdutosProvider } from '../contexts/ProdutosContext';

export default function MainLayout() {
  const { collapsed } = useSidebar();
  const { drawerOpen } = useEmpresa();
  const location = useLocation();
  const contentRef = useRef(null);

  // Calcular margin-left dinamicamente
  const sidebarW = collapsed ? 68 : 256;
  const drawerW  = drawerOpen ? 288 : 0;
  const marginLeft = sidebarW + drawerW;

  // Anima o fade sem remontar as páginas (evita re-fetch e flashes de loading)
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const CLS = 'animate-[fadeIn_0.18s_ease-out_both]';
    el.classList.remove(CLS);
    void el.offsetWidth; // força reflow para reiniciar a animação
    el.classList.add(CLS);
  }, [location.pathname]);

  return (
    // ProdutosProvider aqui garante que só carrega após autenticação
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
            {/*
              Fade via ref + classList — anima sem desmontar as páginas,
              evitando re-fetch de dados (ex: GarantiaAlerts) a cada navegação.
            */}
            <div ref={contentRef} className="animate-[fadeIn_0.18s_ease-out_both]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </ProdutosProvider>
  );
}
