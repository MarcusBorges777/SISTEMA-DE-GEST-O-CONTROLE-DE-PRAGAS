import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/shared/Sidebar';
import Topbar from '../components/shared/Topbar';

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 print:bg-white">
      <Sidebar />

      {/* Main Content - offset by sidebar width */}
      <div className="ml-[68px] lg:ml-64 transition-all duration-300 print:ml-0">
        <Topbar />

        <main className="p-6 print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
