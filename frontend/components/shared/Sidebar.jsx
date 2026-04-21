import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FileText, FolderOpen, Shield,
  ChevronLeft, ChevronRight, Bug, Target, CalendarDays
} from 'lucide-react';
import { useSidebar } from '../../contexts/SidebarContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/documentos', icon: FileText, label: 'Documentos' },
  { to: '/arquivos', icon: FolderOpen, label: 'Arquivos' },
  { to: '/agenda', icon: CalendarDays, label: 'Agenda' },
  { to: '/prospeccao', icon: Target, label: 'Prospeccao' },
  { to: '/admin', icon: Shield, label: 'Admin' },
];

export default function Sidebar() {
  const { collapsed, toggle } = useSidebar();
  const [logoPath, setLogoPath] = useState(null);

  useEffect(() => {
    fetch('/api/config/logo-mascote', { credentials: 'same-origin' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.logo) setLogoPath(data.logo); })
      .catch(() => {});
  }, []);

  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-30 flex flex-col
        bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700
        transition-all duration-300 print:hidden
        ${collapsed ? 'w-[68px]' : 'w-64'}`}
    >
      {/* Logo */}
      <div className="flex items-center justify-center h-20 px-3 border-b border-slate-200 dark:border-slate-700">
        {logoPath ? (
          <img src={logoPath} alt="Logo" className={`object-contain flex-shrink-0 transition-all duration-300 ${collapsed ? 'w-10 h-10 rounded-lg' : 'w-full h-16 rounded-xl'}`} />
        ) : (
          <div className={`rounded-xl bg-brand-500 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${collapsed ? 'w-10 h-10' : 'w-14 h-14'}`}>
            <Bug size={collapsed ? 20 : 28} className="text-white" />
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${collapsed ? 'justify-center' : ''}
                ${isActive
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'
                }`
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Button */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={toggle}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium
            text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all
            ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Expandir' : 'Recolher'}
        >
          {collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span>Recolher</span></>}
        </button>
      </div>
    </aside>
  );
}
