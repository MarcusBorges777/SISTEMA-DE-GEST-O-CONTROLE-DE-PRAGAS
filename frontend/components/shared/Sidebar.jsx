import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, FolderOpen, Shield,
  ChevronLeft, ChevronRight, Bug, Target
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/documentos', icon: FileText, label: 'Documentos' },
  { to: '/arquivos', icon: FolderOpen, label: 'Arquivos' },
  { to: '/prospeccao', icon: Target, label: 'Prospeccao' },
  { to: '/admin', icon: Shield, label: 'Admin' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-30 flex flex-col
        bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700
        transition-all duration-300 print:hidden
        ${collapsed ? 'w-[68px]' : 'w-64'}`}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b border-slate-200 dark:border-slate-700 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
          <Bug size={20} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">Dedetizadora</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Borges</p>
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
          onClick={() => setCollapsed(!collapsed)}
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
