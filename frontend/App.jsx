import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/shared/Toast';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Documentos from './pages/Documentos';
import Clientes from './pages/Clientes';
import Arquivos from './pages/Arquivos';
import Admin from './pages/Admin';

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/documentos" element={<Documentos />} />
          <Route path="/arquivos" element={<Arquivos />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
