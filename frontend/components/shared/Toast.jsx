import React, { useState, useCallback, createContext, useContext } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X, Trash2 } from 'lucide-react';

const ToastContext = createContext();

const icons = {
  success: CheckCircle2,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
};

const styles = {
  success: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
  error:   'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
  warning: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
  info:    'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
};

const iconColors = {
  success: 'text-emerald-500',
  error:   'text-red-500',
  warning: 'text-amber-500',
  info:    'text-blue-500',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, clearAllToasts }}>
      {children}

      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2 print:hidden">

        {/* Botão "Limpar todas" — aparece apenas com 2+ notificações */}
        {toasts.length >= 2 && (
          <button
            onClick={clearAllToasts}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
              bg-slate-800/80 dark:bg-slate-200/20 text-white backdrop-blur-sm
              hover:bg-slate-900 dark:hover:bg-slate-200/30 transition shadow-lg"
          >
            <Trash2 size={11} />
            Limpar todas ({toasts.length})
          </button>
        )}

        {toasts.map((toast, idx) => {
          const Icon = icons[toast.type] || Info;
          return (
            <div
              key={toast.id}
              style={{ animationDelay: `${idx * 30}ms` }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-sm w-full
                animate-[slideIn_0.3s_ease-out] ${styles[toast.type] || styles.info}`}
            >
              <Icon size={18} className={`flex-shrink-0 ${iconColors[toast.type]}`} />
              <span className="text-sm font-medium flex-1">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
