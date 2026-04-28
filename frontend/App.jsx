import { Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/shared/Toast';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Documentos from './pages/Documentos';
import Arquivos from './pages/Arquivos';
import Admin from './pages/Admin';
import Prospeccao from './pages/Prospeccao';
import Clientes from './pages/Clientes';
import Contratos from './pages/Contratos';
import Garantias from './pages/Garantias';
import Agenda from './pages/Agenda';
import Login from './pages/Login';

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        {/* Rota pública */}
        <Route path="/login" element={<Login />} />

        {/* Rotas protegidas com layout principal */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/dashboard"  element={<Dashboard />} />
          <Route path="/documentos" element={<Documentos />} />
          <Route path="/arquivos"   element={<Arquivos />} />
          <Route path="/agenda"     element={<Agenda />} />
          <Route path="/prospeccao" element={<Prospeccao />} />
          <Route path="/clientes"   element={<Clientes />} />
          <Route path="/contratos"  element={<Contratos />} />
          <Route path="/garantias"  element={<Garantias />} />

          {/* Barreira dupla: login + role admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <Admin />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
