import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, FolderOpen, Shield,
  ChevronLeft, ChevronRight, Bug, Users, CalendarDays, Bell,
  LogOut,
} from 'lucide-react';
import { useSidebar } from '../../contexts/SidebarContext';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/documentos', icon: FileText,        label: 'Documentos' },
  { to: '/arquivos',   icon: FolderOpen,      label: 'Arquivos'   },
  { to: '/agenda',     icon: CalendarDays,    label: 'Agenda'     },
  { to: '/clientes',   icon: Users,           label: 'Clientes'   },
  { to: '/garantias',  icon: Bell,            label: 'Garantias'  },
  // Admin só para admin
  { to: '/admin',      icon: Shield,          label: 'Admin', roles: ['admin'] },
];

const ROLE_LABELS = {
  admin:       'Administrador',
  atendimento: 'Atendimento',
  tecnico:     'Técnico',
};

export default function Sidebar() {
  const { collapsed, toggle } = useSidebar();
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const [logoPath, setLogoPath] = useState(null);

  useEffect(() => {
    fetch('/api/config/logo-mascote', { credentials: 'same-origin' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.logo) setLogoPath(data.logo); })
      .catch(() => {});
  }, []);

  // Filtra itens conforme role do usuário
  const visibleItems = navItems.filter(it => !it.roles || hasRole(...it.roles));

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const iniciais = (user?.nome || '?').split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();

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
        {visibleItems.map(item => {
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

      {/* User Card + Logout */}
      {user && (
        <div className="px-3 pb-2 border-t border-slate-200 dark:border-slate-700 pt-3">
          {!collapsed ? (
            <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3 mb-2">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shrink-0 shadow-sm">
                  <span className="text-white font-bold text-xs">{iniciais}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{user.nome}</p>
                  <p className="text-[10px] text-slate-400 truncate">{ROLE_LABELS[user.role] || user.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-bold transition"
              >
                <LogOut size={12} /> Sair
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              title="Sair"
              className="w-full flex justify-center py-2.5 rounded-xl text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition mb-2"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      )}

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
