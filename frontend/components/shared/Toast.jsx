import React, { useState, useCallback, createContext, useContext } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext();

const icons = {
  success: CheckCircle2,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
};

const styles = {
  success: 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-200',
  error:   'bg-red-50   dark:bg-red-900/40   border-red-200   dark:border-red-700/60   text-red-800   dark:text-red-200',
  warning: 'bg-amber-50 dark:bg-amber-900/40 border-amber-200 dark:border-amber-700/60 text-amber-800 dark:text-amber-200',
  info:    'bg-blue-50  dark:bg-blue-900/40  border-blue-200  dark:border-blue-700/60  text-blue-800  dark:text-blue-200',
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
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {/* Container de toasts — aria-live para screen readers */}
      <div
        role="region"
        aria-live="polite"
        aria-atomic="false"
        aria-label="Notificações do sistema"
        className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 print:hidden pointer-events-none"
      >
        {toasts.map(toast => {
          const Icon = icons[toast.type] || Info;
          return (
            <div
              key={toast.id}
              role="alert"
              aria-live="assertive"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-sm
                pointer-events-auto
                animate-[slideIn_0.3s_cubic-bezier(0.16,1,0.3,1)_both]
                ${styles[toast.type] || styles.info}`}
            >
              <Icon size={18} className={`flex-shrink-0 ${iconColors[toast.type]}`} aria-hidden="true" />
              <span className="text-sm font-medium flex-1">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                aria-label="Fechar notificação"
                className="flex-shrink-0 opacity-50 hover:opacity-100 active:scale-90
                  transition-all duration-150 rounded
                  focus-visible:outline-2 focus-visible:outline-current"
              >
                <X size={14} aria-hidden="true" />
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
