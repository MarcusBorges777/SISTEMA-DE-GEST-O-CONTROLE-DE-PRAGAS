import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/shared/Toast';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Documentos = lazy(() => import('./pages/Documentos'));
const Arquivos = lazy(() => import('./pages/Arquivos'));
const Admin = lazy(() => import('./pages/Admin'));
const Prospeccao = lazy(() => import('./pages/Prospeccao'));
const Clientes = lazy(() => import('./pages/Clientes'));
const Contratos = lazy(() => import('./pages/Contratos'));
const Garantias = lazy(() => import('./pages/Garantias'));
const Agenda = lazy(() => import('./pages/Agenda'));
const Login = lazy(() => import('./pages/Login'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center text-sm font-semibold text-slate-400">
      Carregando...
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/documentos" element={<Documentos />} />
            <Route path="/arquivos" element={<Arquivos />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/prospeccao" element={<Prospeccao />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/contratos" element={<Contratos />} />
            <Route path="/garantias" element={<Garantias />} />

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
      </Suspense>
    </ToastProvider>
  );
}
