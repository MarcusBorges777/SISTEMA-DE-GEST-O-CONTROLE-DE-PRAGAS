import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/shared/Sidebar';
import Topbar from '../components/shared/Topbar';
import { useSidebar } from '../contexts/SidebarContext';

export default function MainLayout() {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 print:bg-white">
      <Sidebar />

      {/* Main Content - margin acompanha o estado da sidebar */}
      <div className={`transition-all duration-300 print:ml-0 ${collapsed ? 'ml-[68px]' : 'ml-64'}`}>
        <Topbar />

        <main className="p-6 print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
