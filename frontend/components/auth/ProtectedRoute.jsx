import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, Bug } from 'lucide-react';

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Bootstrap em curso — evita flash de redirect ao recarregar a página
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Bug size={28} className="text-white" />
          </div>
          <Loader2 size={20} className="text-brand-500 animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Verificando sessão…</p>
        </div>
      </div>
    );
  }

  // Barreira 1 — autenticação
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Barreira 2 — autorização (role)
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}
