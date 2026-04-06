import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/shared/Toast';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Documentos from './pages/Documentos';
import Clientes from './pages/Clientes';
import Arquivos from './pages/Arquivos';
import Admin from './pages/Admin';
import Prospeccao from './pages/Prospeccao';
import Login from './pages/Login';

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        {/* Login fora do MainLayout (sem sidebar) */}
        <Route path="/login" element={<Login />} />

        {/* Rotas protegidas com layout principal */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/documentos" element={<Documentos />} />
          <Route path="/arquivos" element={<Arquivos />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/prospeccao" element={<Prospeccao />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
