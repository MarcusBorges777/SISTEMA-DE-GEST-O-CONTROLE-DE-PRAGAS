import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Bug, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login, isAuthenticated, loading: bootLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail]               = useState('');
  const [senha, setSenha]               = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [erro, setErro]                 = useState('');
  const [logoPath, setLogoPath]         = useState(null);

  // Logo da empresa
  useEffect(() => {
    fetch('/api/config/logo-mascote', { credentials: 'same-origin' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.logo) setLogoPath(data.logo); })
      .catch(() => {});
  }, []);

  // Já autenticado → redireciona pro destino original ou home
  if (!bootLoading && isAuthenticated) {
    const from = location.state?.from || '/';
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    if (!email.trim() || !senha) {
      setErro('Preencha email e senha');
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), senha);
      const from = location.state?.from || '/';
      navigate(from, { replace: true });
    } catch (err) {
      setErro(err.message || 'Credenciais inválidas');
      setSenha('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 flex items-center justify-center p-4">
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo + Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-brand-600 items-center justify-center shadow-xl shadow-brand-500/30 mb-5">
            {logoPath ? (
              <img src={logoPath} alt="Logo Borges" className="w-16 h-16 object-contain rounded-2xl" />
            ) : (
              <Bug size={36} className="text-white" />
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Dedetizadora Borges
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            Sistema de Gestão · Acesso Restrito
          </p>
        </div>

        {/* Card do form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl shadow-slate-900/10 dark:shadow-black/30 border border-slate-200 dark:border-slate-700 p-7 space-y-5"
        >
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
              E-mail
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={submitting}
                autoComplete="username"
                autoFocus
                placeholder="seu@email.com"
                className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white dark:focus:bg-slate-700 transition-all disabled:opacity-60"
              />
            </div>
          </div>

          {/* Senha */}
          <div>
            <label htmlFor="senha" className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
              Senha
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="senha"
                type={showPassword ? 'text' : 'password'}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                disabled={submitting}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full pl-10 pr-11 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white dark:focus:bg-slate-700 transition-all disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Erro */}
          {erro && (
            <div role="alert" className="flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl px-3.5 py-3">
              <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-700 dark:text-red-300">{erro}</p>
            </div>
          )}

          {/* Botão */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white text-sm font-bold shadow-lg shadow-brand-500/30 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Entrando…
              </>
            ) : (
              <>
                Entrar no sistema
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Rodapé */}
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
          © {new Date().getFullYear()} Dedetizadora Borges · Acesso restrito
        </p>
      </div>
    </div>
  );
}
