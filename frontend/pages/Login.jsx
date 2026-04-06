import React, { useState } from 'react';
import { Bug, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');

    if (!email.trim() || !senha.trim()) {
      setErro('Preencha email e senha');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ email: email.trim(), senha: senha.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.sucesso) {
        setSucesso(`Bem-vindo, ${data.usuario?.nome || 'usuario'}!`);
        // Redirecionar para o dashboard apos breve delay
        setTimeout(() => {
          window.location.href = data.redirect || '/';
        }, 500);
      } else {
        setErro(data.erro || 'Email ou senha incorretos');
      }
    } catch (err) {
      setErro('Erro de conexao. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAdmin = async () => {
    try {
      const res = await fetch('/reset-admin');
      if (res.ok) {
        setSucesso('Admin resetado! Email: admin@sistema.com | Senha: admin123');
        setErro('');
      }
    } catch {
      setErro('Erro ao resetar admin');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-brand-900 to-slate-900 px-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500/20 backdrop-blur-sm border border-brand-400/30 mb-4">
            <Bug size={32} className="text-brand-300" />
          </div>
          <h1 className="text-2xl font-bold text-white">Dedetizadora Borges</h1>
          <p className="text-slate-400 mt-1 text-sm">Sistema de Gestao de Documentos</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-6 text-center">Entrar no Sistema</h2>

          {/* Error message */}
          {erro && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
              <AlertCircle size={16} className="flex-shrink-0" />
              {erro}
            </div>
          )}

          {/* Success message */}
          {sucesso && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-sm">
              <Loader2 size={16} className="animate-spin flex-shrink-0" />
              {sucesso}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-xl
                    bg-white/10 border border-white/20 text-white placeholder-slate-400
                    focus:border-brand-400 focus:ring-1 focus:ring-brand-400 focus:bg-white/15
                    transition outline-none"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-12 py-3 text-sm rounded-xl
                    bg-white/10 border border-white/20 text-white placeholder-slate-400
                    focus:border-brand-400 focus:ring-1 focus:ring-brand-400 focus:bg-white/15
                    transition outline-none"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm transition
                bg-brand-500 hover:bg-brand-600 text-white
                disabled:opacity-60 disabled:cursor-not-allowed
                shadow-lg shadow-brand-500/25">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Entrando...
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        {/* Reset admin link */}
        <div className="text-center mt-6">
          <button onClick={handleResetAdmin}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition">
            <RefreshCw size={12} /> Resetar admin padrao
          </button>
        </div>
      </div>
    </div>
  );
}
